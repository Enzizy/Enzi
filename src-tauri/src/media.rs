//! Now-playing info from Windows' system media controls (Spotify, browsers, etc.).
//! When several apps are playing, the notch can switch between them.

use std::collections::HashMap;
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use windows::core::{Interface, HSTRING};
use windows::ApplicationModel::AppInfo;
use windows::Foundation::Size;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session,
    GlobalSystemMediaTransportControlsSessionManager as SessionManager,
    GlobalSystemMediaTransportControlsSessionMediaProperties as MediaProperties,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
};
use windows::Storage::Streams::{DataReader, IRandomAccessStreamReference};
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};

const TICKS_PER_SEC: f64 = 10_000_000.0;
/// Offset between the Windows epoch (1601) and the Unix epoch, in 100 ns ticks.
const EPOCH_DIFF: i64 = 116_444_736_000_000_000;

/// The player the user picked in the notch; None follows whatever Windows considers current.
static PREFERRED: Mutex<Option<String>> = Mutex::new(None);

fn now_ticks() -> i64 {
    let since = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    since.as_nanos() as i64 / 100 + EPOCH_DIFF
}

fn manager() -> windows::core::Result<SessionManager> {
    SessionManager::RequestAsync()?.get()
}

fn all_sessions(manager: &SessionManager) -> Vec<Session> {
    let Ok(list) = manager.GetSessions() else { return Vec::new() };
    (0..list.Size().unwrap_or(0)).filter_map(|i| list.GetAt(i).ok()).collect()
}

fn source_id(s: &Session) -> String {
    s.SourceAppUserModelId().map(|h| h.to_string()).unwrap_or_default()
}

/// The preferred player if it's still around, otherwise Windows' current one.
fn chosen(manager: &SessionManager) -> Option<Session> {
    if let Some(want) = PREFERRED.lock().unwrap().clone() {
        if let Some(s) = all_sessions(manager).into_iter().find(|s| source_id(s) == want) {
            return Some(s);
        }
    }
    manager.GetCurrentSession().ok()
}

fn stream_to_data_url(reference: &IRandomAccessStreamReference, max: u32) -> Option<String> {
    let stream = reference.OpenReadAsync().ok()?.get().ok()?;
    let size = stream.Size().ok()? as u32;
    if size == 0 || size > max {
        return None;
    }
    let reader = DataReader::CreateDataReader(&stream).ok()?;
    reader.LoadAsync(size).ok()?.get().ok()?;
    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).ok()?;
    let mime = stream.ContentType().map(|m| m.to_string()).unwrap_or_default();
    let mime = if mime.starts_with("image/") { mime } else { "image/png".into() };
    Some(format!("data:{mime};base64,{}", B64.encode(bytes)))
}

fn thumbnail(props: &MediaProperties) -> Option<String> {
    stream_to_data_url(&props.Thumbnail().ok()?, 8_000_000)
}

/// Friendly names for common players whose IDs are cryptic.
fn known_name(aumid: &str) -> Option<&'static str> {
    let id = aumid.to_lowercase();
    [
        ("spotify", "Spotify"),
        ("msedge", "Edge"),
        ("chrome", "Chrome"),
        ("firefox", "Firefox"),
        ("308046b0af4a39cb", "Firefox"),
        ("brave", "Brave"),
        ("opera", "Opera"),
        ("vivaldi", "Vivaldi"),
        ("vlc", "VLC"),
        ("zunemusic", "Media Player"),
        ("applemusic", "Apple Music"),
        ("itunes", "iTunes"),
        ("tidal", "TIDAL"),
        ("deezer", "Deezer"),
        ("youtube", "YouTube Music"),
        ("discord", "Discord"),
    ]
    .iter()
    .find(|(k, _)| id.contains(k))
    .map(|(_, v)| *v)
}

/// Full path of a running process whose exe name matches the player ID (e.g. "Spotify.exe").
fn running_exe(aumid: &str) -> Option<String> {
    let want = aumid.to_lowercase();
    let want = if want.ends_with(".exe") { want } else { format!("{want}.exe") };
    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0).ok()?;
        let mut entry = PROCESSENTRY32W { dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32, ..Default::default() };
        let mut found = None;
        let mut ok = Process32FirstW(snap, &mut entry).is_ok();
        while ok {
            let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
            if String::from_utf16_lossy(&entry.szExeFile[..len]).to_lowercase() == want {
                found = Some(entry.th32ProcessID);
                break;
            }
            ok = Process32NextW(snap, &mut entry).is_ok();
        }
        let _ = CloseHandle(snap);
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, found?).ok()?;
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, windows::core::PWSTR(buf.as_mut_ptr()), &mut len).is_ok();
        let _ = CloseHandle(handle);
        ok.then(|| String::from_utf16_lossy(&buf[..len as usize]))
    }
}

/// (display name, icon data URL) for a player.
fn app_info(aumid: &str) -> (String, Option<String>) {
    if let Ok(info) = AppInfo::GetFromAppUserModelId(&HSTRING::from(aumid)) {
        if let Ok(display) = info.DisplayInfo() {
            let name = display.DisplayName().map(|n| n.to_string()).unwrap_or_default();
            let icon = display
                .GetLogo(Size { Width: 64.0, Height: 64.0 })
                .ok()
                .and_then(|r| r.cast::<IRandomAccessStreamReference>().ok())
                .and_then(|r| stream_to_data_url(&r, 2_000_000));
            if !name.is_empty() {
                return (known_name(aumid).map(String::from).unwrap_or(name), icon);
            }
        }
    }
    let icon = running_exe(aumid)
        .and_then(|exe| crate::thumbs::thumbnails(vec![exe], 64).into_iter().next())
        .and_then(|v| v.get("src").and_then(Value::as_str).map(String::from));
    let fallback = aumid.split('!').next().unwrap_or(aumid).trim_end_matches(".exe").to_string();
    (known_name(aumid).map(String::from).unwrap_or(fallback), icon)
}

struct Snapshot {
    key: String,
    source: String,
    info: Value,
    props: MediaProperties,
}

fn snapshot(manager: &SessionManager, names: &HashMap<String, (String, Option<String>)>) -> windows::core::Result<Option<Snapshot>> {
    let Some(session) = chosen(manager) else { return Ok(None) };
    let props = session.TryGetMediaPropertiesAsync()?.get()?;
    let title = props.Title()?.to_string();
    if title.is_empty() {
        return Ok(None);
    }
    let artist = props.Artist()?.to_string();
    let album = props.AlbumTitle()?.to_string();
    let playing = session.GetPlaybackInfo()?.PlaybackStatus()? == PlaybackStatus::Playing;
    let timeline = session.GetTimelineProperties()?;
    let duration = (timeline.EndTime()?.Duration - timeline.StartTime()?.Duration) as f64 / TICKS_PER_SEC;
    let mut position = timeline.Position()?.Duration as f64 / TICKS_PER_SEC;
    let updated = timeline.LastUpdatedTime()?.UniversalTime;
    if playing && updated > 0 {
        position += (now_ticks() - updated) as f64 / TICKS_PER_SEC;
    }
    if duration > 0.0 {
        position = position.clamp(0.0, duration);
    }
    let source = source_id(&session);
    let sessions: Vec<Value> = all_sessions(manager)
        .iter()
        .map(|s| {
            let id = source_id(s);
            let name = names.get(&id).map(|n| n.0.clone()).unwrap_or_else(|| id.clone());
            json!({ "id": id, "name": name })
        })
        .collect();
    let key = format!("{title}\u{1}{artist}\u{1}{album}");
    let info = json!({
        "title": title,
        "artist": artist,
        "album": album,
        "playing": playing,
        "position": position,
        "duration": duration.max(0.0),
        "source": source,
        "sessions": sessions,
    });
    Ok(Some(Snapshot { key, source, info, props }))
}

/// Windows that show what's playing: the notch and the floating music player.
const VIEWERS: [&str; 2] = ["notch", "music-widget"];

/// The latest album art and player, so a music player opened mid-song can show them straight away
/// (they're only sent when they change).
static LAST_EXTRAS: Mutex<(Value, Value)> = Mutex::new((Value::Null, Value::Null));

fn send(app: &AppHandle, event: &str, payload: &Value) {
    for label in VIEWERS {
        let _ = app.emit_to(label, event, payload);
    }
}

pub fn extras() -> Value {
    let last = LAST_EXTRAS.lock().unwrap();
    json!({ "art": last.0, "app": last.1 })
}

pub fn start(app: AppHandle) {
    thread::spawn(move || {
        let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        let mut mgr: Option<SessionManager> = None;
        let mut last_key = String::new();
        let mut last_source = String::new();
        let mut names: HashMap<String, (String, Option<String>)> = HashMap::new();
        loop {
            if mgr.is_none() {
                mgr = manager().ok();
            }
            if let Some(m) = &mgr {
                for s in all_sessions(m) {
                    let id = source_id(&s);
                    if !id.is_empty() && !names.contains_key(&id) {
                        names.insert(id.clone(), app_info(&id));
                    }
                }
            }
            let snap = match mgr.as_ref().map(|m| snapshot(m, &names)) {
                Some(Ok(s)) => s,
                Some(Err(_)) => {
                    mgr = None;
                    None
                }
                None => None,
            };
            match snap {
                Some(s) => {
                    if s.key != last_key {
                        last_key = s.key.clone();
                        let art = json!(thumbnail(&s.props));
                        send(&app, "media-art", &art);
                        LAST_EXTRAS.lock().unwrap().0 = art;
                    }
                    if s.source != last_source {
                        last_source = s.source.clone();
                        let (name, icon) = names.get(&s.source).cloned().unwrap_or_default();
                        let player = json!({ "id": s.source, "name": name, "icon": icon });
                        send(&app, "media-app", &player);
                        LAST_EXTRAS.lock().unwrap().1 = player;
                    }
                    send(&app, "media", &s.info);
                }
                None => {
                    if !last_key.is_empty() {
                        last_key.clear();
                        last_source.clear();
                        send(&app, "media-art", &Value::Null);
                        *LAST_EXTRAS.lock().unwrap() = (Value::Null, Value::Null);
                    }
                    send(&app, "media", &Value::Null);
                }
            }
            thread::sleep(Duration::from_millis(500));
        }
    });
}

/// Follow a specific player from now on (None = whatever Windows says is current).
pub fn select(id: Option<String>) {
    *PREFERRED.lock().unwrap() = id.filter(|s| !s.is_empty());
}

pub fn control(action: &str, value: Option<f64>) -> Result<bool, String> {
    let run = || -> windows::core::Result<bool> {
        let m = manager()?;
        let Some(session) = chosen(&m) else { return Ok(false) };
        match action {
            "toggle" => session.TryTogglePlayPauseAsync()?.get(),
            "next" => session.TrySkipNextAsync()?.get(),
            "previous" => session.TrySkipPreviousAsync()?.get(),
            "seek" => {
                let ticks = (value.unwrap_or(0.0).max(0.0) * TICKS_PER_SEC) as i64;
                session.TryChangePlaybackPositionAsync(ticks)?.get()
            }
            _ => Ok(false),
        }
    };
    run().map_err(|e| e.message().to_string())
}
