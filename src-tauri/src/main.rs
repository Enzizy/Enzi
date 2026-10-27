#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod actions;
mod audio;
mod bluetooth;
mod clipboard;
mod convert;
mod dragdrop;
mod hooks;
mod lyrics;
mod media;
mod store;
mod system;
mod thumbs;
mod widget;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use serde_json::Value;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

/// Interactive area of the notch, in CSS pixels relative to the notch window.
/// A passive rect only reports hovering; clicks pass through to whatever is underneath.
#[derive(Clone, Copy)]
pub struct HitRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub passive: bool,
}

/// When the notch tucks itself away above the screen edge: "browsers" (listed apps),
/// "maximized" (any window reaching the top), "always" or "off".
pub struct AutoHide {
    pub mode: String,
    pub apps: Vec<String>,
}

const DEFAULT_AUTO_HIDE_APPS: &str = "chrome.exe, msedge.exe, firefox.exe, brave.exe, opera.exe, vivaldi.exe, \
    arc.exe, zen.exe, floorp.exe, librewolf.exe, waterfox.exe, chromium.exe, thorium.exe, browser.exe";

pub struct AppState {
    pub hit: Mutex<HitRect>,
    pub hide_fullscreen: AtomicBool,
    pub user_hidden: AtomicBool,
    pub auto_hide: Mutex<AutoHide>,
    pub auto_hidden: AtomicBool,
    pub shelf_enabled: AtomicBool,
    pub clipboard_enabled: AtomicBool,
    pub clipboard_images: AtomicBool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            hit: Mutex::new(HitRect { x: 210.0, y: 0.0, w: 220.0, h: 38.0, passive: false }),
            hide_fullscreen: AtomicBool::new(true),
            user_hidden: AtomicBool::new(false),
            auto_hide: Mutex::new(AutoHide { mode: "browsers".into(), apps: parse_apps(DEFAULT_AUTO_HIDE_APPS) }),
            auto_hidden: AtomicBool::new(false),
            shelf_enabled: AtomicBool::new(true),
            clipboard_enabled: AtomicBool::new(true),
            clipboard_images: AtomicBool::new(true),
        }
    }
}

fn setting<'a>(settings: &'a Value, section: &str, key: &str) -> Option<&'a Value> {
    settings.get(section).and_then(|s| s.get(key))
}

fn setting_bool(settings: &Value, section: &str, key: &str, default: bool) -> bool {
    setting(settings, section, key).and_then(Value::as_bool).unwrap_or(default)
}

/// "Chrome, msedge.exe; firefox" -> ["chrome.exe", "msedge.exe", "firefox.exe"]
fn parse_apps(list: &str) -> Vec<String> {
    list.split(|c: char| c == ',' || c == ';' || c.is_whitespace())
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
        .map(|s| if s.ends_with(".exe") { s } else { format!("{s}.exe") })
        .collect()
}

fn apply_settings(state: &AppState, settings: &Value) {
    state
        .hide_fullscreen
        .store(setting_bool(settings, "general", "hideFullscreen", true), Ordering::Relaxed);
    system::set_autostart(setting_bool(settings, "general", "startWithWindows", false));
    let mode = setting(settings, "general", "autoHide").and_then(Value::as_str).unwrap_or("browsers");
    let apps = setting(settings, "general", "autoHideApps").and_then(Value::as_str).unwrap_or(DEFAULT_AUTO_HIDE_APPS);
    *state.auto_hide.lock().unwrap() = AutoHide { mode: mode.to_string(), apps: parse_apps(apps) };
    let shelf = settings.pointer("/modules/shelf/enabled").and_then(Value::as_bool).unwrap_or(true);
    state.shelf_enabled.store(shelf, Ordering::Relaxed);
    let flag = |p: &str, d: bool| settings.pointer(p).and_then(Value::as_bool).unwrap_or(d);
    state.clipboard_enabled.store(flag("/modules/clipboard/enabled", true), Ordering::Relaxed);
    state.clipboard_images.store(flag("/modules/clipboard/images", true), Ordering::Relaxed);
}

#[tauri::command]
fn media_select(id: Option<String>) {
    media::select(id);
}

/// Speaker (mic = false) or microphone volume: { level 0..1, muted }.
#[tauri::command]
async fn get_volume(mic: bool) -> Option<Value> {
    tauri::async_runtime::spawn_blocking(move || audio::get(mic))
        .await
        .ok()
        .flatten()
        .map(|(level, muted)| serde_json::json!({ "level": level, "muted": muted }))
}

#[tauri::command]
async fn set_volume(mic: bool, level: Option<f32>, muted: Option<bool>) {
    let _ = tauri::async_runtime::spawn_blocking(move || {
        if let Some(l) = level {
            audio::set_level(mic, l);
        }
        if let Some(m) = muted {
            audio::set_mute(mic, m);
        }
    })
    .await;
}

#[tauri::command]
fn quick_action(name: String) -> Result<(), String> {
    match name.as_str() {
        "screenshot" => actions::screenshot(),
        "lock" => actions::lock(),
        "notification-settings" => actions::open_uri("ms-settings:notifications"),
        _ => Err(format!("Unknown action: {name}")),
    }
}

#[tauri::command]
async fn open_color_picker(app: AppHandle) {
    actions::open_picker(&app);
}

#[tauri::command]
fn picker_pixel() -> Option<String> {
    actions::pixel_at_cursor()
}

/// Picks the color under the mouse, copies its hex code and tells the notch.
#[tauri::command]
async fn picker_pick(app: AppHandle) -> Option<String> {
    let hex = actions::pixel_at_cursor();
    actions::close_picker(&app);
    if let Some(h) = &hex {
        let _ = clipboard::copy_text(h);
        let _ = app.emit_to("notch", "indicator", serde_json::json!({ "kind": "color", "hex": h }));
    }
    hex
}

#[tauri::command]
async fn picker_cancel(app: AppHandle) {
    actions::close_picker(&app);
}

/// Downloads a calendar (.ics) link; webcal:// links are fetched over https.
#[tauri::command]
async fn fetch_text(url: String) -> Result<String, String> {
    let url = url.trim().replacen("webcal://", "https://", 1);
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("The link should start with https://".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        ureq::get(&url)
            .timeout(std::time::Duration::from_secs(15))
            .set("User-Agent", "Enzi/1.0")
            .call()
            .map_err(|e| e.to_string())?
            .into_string()
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn clip_copy_text(text: String) -> Result<(), String> {
    clipboard::copy_text(&text)
}

#[tauri::command]
async fn clip_copy_image(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || clipboard::copy_image(&path)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn clip_delete_file(app: AppHandle, path: String) {
    clipboard::delete_file(&app, &path);
}

#[tauri::command]
async fn shelf_thumbnails(paths: Vec<String>) -> Vec<Value> {
    tauri::async_runtime::spawn_blocking(move || thumbs::thumbnails(paths, 192)).await.unwrap_or_default()
}

#[tauri::command]
async fn convert_image(app: AppHandle, path: String, format: String, quality: u8) -> Result<String, String> {
    let fallback = dragdrop::shelf_dir(&app);
    tauri::async_runtime::spawn_blocking(move || convert::convert(&path, &format, quality, &fallback))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn forget_shelf_item(app: AppHandle, path: String) {
    dragdrop::forget(&app, &path);
}

#[tauri::command]
fn get_auto_hidden(state: State<AppState>) -> bool {
    state.auto_hidden.load(Ordering::Relaxed)
}

pub fn position_notch(win: &WebviewWindow) {
    if let (Ok(Some(mon)), Ok(size)) = (win.primary_monitor(), win.outer_size()) {
        let x = mon.position().x + (mon.size().width as i32 - size.width as i32) / 2;
        let y = mon.position().y;
        if win.outer_position().map(|p| p.x != x || p.y != y).unwrap_or(true) {
            let _ = win.set_position(PhysicalPosition::new(x, y));
        }
    }
}

fn toggle_notch(app: &AppHandle) {
    let state = app.state::<AppState>();
    if let Some(win) = app.get_webview_window("notch") {
        let hidden = !state.user_hidden.load(Ordering::Relaxed);
        state.user_hidden.store(hidden, Ordering::Relaxed);
        let _ = if hidden { win.hide() } else { win.show() };
    }
}

fn show_settings(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("settings.html".into()))
        .title("Enzi Settings")
        .inner_size(620.0, 760.0)
        .min_inner_size(480.0, 480.0)
        .center()
        .build();
}

#[tauri::command]
fn set_hit_rect(state: State<AppState>, x: f64, y: f64, w: f64, h: f64, passive: Option<bool>) {
    *state.hit.lock().unwrap() = HitRect { x, y, w, h, passive: passive.unwrap_or(false) };
}

#[tauri::command]
fn get_settings(app: AppHandle) -> Value {
    store::load(&app, "settings")
}

#[tauri::command]
fn save_settings(app: AppHandle, state: State<AppState>, settings: Value) -> Result<(), String> {
    store::save(&app, "settings", &settings)?;
    apply_settings(&state, &settings);
    app.emit("settings-changed", &settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_data(app: AppHandle, name: String) -> Value {
    store::load(&app, &name)
}

/// Saves data and tells every window, so the notch and the to-do widget stay in sync.
#[tauri::command]
fn save_data(app: AppHandle, window: tauri::Window, name: String, value: Value) -> Result<(), String> {
    store::save(&app, &name, &value)?;
    let _ = app.emit("data-changed", serde_json::json!({ "name": name, "value": value, "from": window.label() }));
    Ok(())
}

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Asks GitHub (releases/latest/download/latest.json) whether a newer signed version exists.
#[tauri::command]
async fn check_update(app: AppHandle) -> Result<Option<Value>, String> {
    use tauri_plugin_updater::UpdaterExt;
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    Ok(update.map(|u| serde_json::json!({ "version": u.version, "current": u.current_version, "notes": u.body })))
}

/// Downloads and runs the new installer; Windows closes Enzi while it installs, then it restarts.
#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    let Some(update) = update else { return Err("Enzi is already up to date".into()) };
    update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    app.restart();
}

#[tauri::command]
async fn open_todo_widget(app: AppHandle) {
    widget::show(&app);
}

#[tauri::command]
async fn close_todo_widget(app: AppHandle) {
    widget::close(&app);
}

#[tauri::command]
fn file_info(paths: Vec<String>) -> Vec<Value> {
    store::file_info(&paths)
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    system::open_path(&path)
}

#[tauri::command]
fn reveal_path(path: String) -> Result<(), String> {
    system::reveal_path(&path)
}

#[tauri::command]
fn open_data_dir(app: AppHandle) -> Result<(), String> {
    let dir = store::data_dir(&app);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    system::open_path(&dir.to_string_lossy())
}

#[tauri::command]
async fn open_settings(app: AppHandle) {
    show_settings(&app);
}

#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
async fn media_control(action: String, value: Option<f64>) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || media::control(&action, value))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn fetch_lyrics(title: String, artist: String, album: String, duration: f64) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || lyrics::fetch(&title, &artist, &album, duration))
        .await
        .map_err(|e| e.to_string())?
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Show / hide notch", true, None::<&str>)?;
    let todo = MenuItem::with_id(app, "todo-widget", "Floating to-do list", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Enzi", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings, &toggle, &todo, &quit])?;
    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("Enzi")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "settings" => show_settings(app),
            "toggle" => toggle_notch(app),
            "todo-widget" => widget::show(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                show_settings(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

fn main() {
    if !system::claim_single_instance() {
        return;
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            set_hit_rect,
            get_auto_hidden,
            forget_shelf_item,
            shelf_thumbnails,
            convert_image,
            clip_copy_text,
            clip_copy_image,
            clip_delete_file,
            media_select,
            get_volume,
            set_volume,
            quick_action,
            open_color_picker,
            picker_pixel,
            picker_pick,
            picker_cancel,
            fetch_text,
            get_settings,
            save_settings,
            load_data,
            save_data,
            open_todo_widget,
            close_todo_widget,
            app_version,
            check_update,
            install_update,
            file_info,
            open_path,
            reveal_path,
            open_data_dir,
            open_settings,
            quit,
            media_control,
            fetch_lyrics,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            apply_settings(&app.state::<AppState>(), &store::load(&handle, "settings"));
            if let Some(win) = app.get_webview_window("notch") {
                position_notch(&win);
                let _ = win.set_ignore_cursor_events(true);
                win.show()?;
            }
            build_tray(app)?;
            dragdrop::install(&handle);
            widget::restore(&handle);
            hooks::start(handle.clone());
            media::start(handle.clone());
            clipboard::start(handle.clone());
            bluetooth::start(handle.clone());
            system::start(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Enzi");
}
