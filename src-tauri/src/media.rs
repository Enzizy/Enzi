//! Now-playing info from Windows' system media controls (Spotify, browsers, etc.).

use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session,
    GlobalSystemMediaTransportControlsSessionManager as SessionManager,
    GlobalSystemMediaTransportControlsSessionMediaProperties as MediaProperties,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
};
use windows::Storage::Streams::DataReader;
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

const TICKS_PER_SEC: f64 = 10_000_000.0;
/// Offset between the Windows epoch (1601) and the Unix epoch, in 100 ns ticks.
const EPOCH_DIFF: i64 = 116_444_736_000_000_000;

fn now_ticks() -> i64 {
    let since = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    since.as_nanos() as i64 / 100 + EPOCH_DIFF
}

fn current_session() -> windows::core::Result<Session> {
    SessionManager::RequestAsync()?.get()?.GetCurrentSession()
}

fn thumbnail(props: &MediaProperties) -> Option<String> {
    let stream = props.Thumbnail().ok()?.OpenReadAsync().ok()?.get().ok()?;
    let size = stream.Size().ok()? as u32;
    if size == 0 || size > 8_000_000 {
        return None;
    }
    let reader = DataReader::CreateDataReader(&stream).ok()?;
    reader.LoadAsync(size).ok()?.get().ok()?;
    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).ok()?;
    let mime = stream.ContentType().map(|m| m.to_string()).unwrap_or_default();
    let mime = if mime.starts_with("image/") { mime } else { "image/jpeg".into() };
    Some(format!("data:{mime};base64,{}", B64.encode(bytes)))
}

struct Snapshot {
    key: String,
    info: Value,
    props: MediaProperties,
}

fn snapshot(manager: &SessionManager) -> windows::core::Result<Option<Snapshot>> {
    let Ok(session) = manager.GetCurrentSession() else { return Ok(None) };
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
    let source = session.SourceAppUserModelId().map(|s| s.to_string()).unwrap_or_default();
    let key = format!("{title}\u{1}{artist}\u{1}{album}");
    let info = json!({
        "title": title,
        "artist": artist,
        "album": album,
        "playing": playing,
        "position": position,
        "duration": duration.max(0.0),
        "source": source,
    });
    Ok(Some(Snapshot { key, info, props }))
}

pub fn start(app: AppHandle) {
    thread::spawn(move || {
        let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        let mut manager: Option<SessionManager> = None;
        let mut last_key = String::new();
        loop {
            if manager.is_none() {
                manager = SessionManager::RequestAsync().and_then(|op| op.get()).ok();
            }
            let snap = match manager.as_ref().map(snapshot) {
                Some(Ok(s)) => s,
                Some(Err(_)) => {
                    manager = None;
                    None
                }
                None => None,
            };
            match snap {
                Some(s) => {
                    if s.key != last_key {
                        last_key = s.key.clone();
                        let art = thumbnail(&s.props);
                        let _ = app.emit_to("notch", "media-art", art);
                    }
                    let _ = app.emit_to("notch", "media", s.info);
                }
                None => {
                    if !last_key.is_empty() {
                        last_key.clear();
                        let _ = app.emit_to("notch", "media-art", Value::Null);
                    }
                    let _ = app.emit_to("notch", "media", Value::Null);
                }
            }
            thread::sleep(Duration::from_millis(500));
        }
    });
}

pub fn control(action: &str, value: Option<f64>) -> Result<bool, String> {
    let run = || -> windows::core::Result<bool> {
        let session = current_session()?;
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
