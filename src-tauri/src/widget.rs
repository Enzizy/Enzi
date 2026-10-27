//! The floating to-do widget: a small always-on-top window that remembers where it was.
//! Its open state and geometry (physical pixels) live in todo_widget.json.

use serde_json::{json, Value};
use tauri::window::Color;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Dwm::{
    DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_COLOR_NONE, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
};

use crate::store;

/// The notch background from settings, so the window never flashes another color while resizing.
fn background(app: &AppHandle) -> Color {
    let hex = store::load(app, "settings")
        .pointer("/appearance/background")
        .and_then(Value::as_str)
        .map(|s| s.trim_start_matches('#').to_string())
        .unwrap_or_default();
    match u32::from_str_radix(&hex, 16) {
        Ok(n) if hex.len() == 6 => Color((n >> 16) as u8, (n >> 8) as u8, n as u8, 255),
        _ => Color(0, 0, 0, 255),
    }
}

/// Lets Windows draw the rounded corners and soft shadow, with no outline.
fn native_frame(win: &WebviewWindow) {
    let Ok(handle) = win.hwnd() else { return };
    let hwnd = HWND(handle.0 as _);
    unsafe {
        let round = DWMWCP_ROUND;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &round as *const _ as *const _,
            std::mem::size_of_val(&round) as u32,
        );
        let no_border = DWMWA_COLOR_NONE;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_BORDER_COLOR,
            &no_border as *const _ as *const _,
            std::mem::size_of_val(&no_border) as u32,
        );
    }
}

const LABEL: &str = "todo-widget";

fn saved(app: &AppHandle) -> Value {
    store::load(app, "todo_widget")
}

fn remember_open(app: &AppHandle, open: bool) {
    let mut v = saved(app);
    if !v.is_object() {
        v = json!({});
    }
    v["open"] = json!(open);
    let _ = store::save(app, "todo_widget", &v);
}

/// Saved geometry, if it still lands on a connected monitor.
fn saved_geometry(app: &AppHandle) -> Option<(i32, i32, u32, u32)> {
    let v = saved(app);
    let get = |k: &str| v.get(k).and_then(Value::as_i64);
    let (x, y, w, h) = (get("x")? as i32, get("y")? as i32, get("w")? as u32, get("h")? as u32);
    let on_screen = app.available_monitors().ok()?.iter().any(|m| {
        let (p, s) = (m.position(), m.size());
        x + 40 > p.x && x < p.x + s.width as i32 - 40 && y >= p.y - 10 && y < p.y + s.height as i32 - 40
    });
    on_screen.then_some((x, y, w.max(200), h.max(150)))
}

pub fn show(app: &AppHandle) {
    remember_open(app, true);
    if let Some(win) = app.get_webview_window(LABEL) {
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }
    let builder = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("widget.html".into()))
        .title("Enzi To-do")
        .inner_size(280.0, 340.0)
        .min_inner_size(200.0, 150.0)
        // A solid window (not transparent) moves and resizes smoothly; Windows rounds it and adds the shadow.
        .decorations(false)
        .transparent(false)
        .shadow(true)
        .background_color(background(app))
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(true)
        .visible(false);
    let Ok(win) = builder.build() else { return };
    native_frame(&win);
    match saved_geometry(app) {
        Some((x, y, w, h)) => {
            let _ = win.set_size(PhysicalSize::new(w, h));
            let _ = win.set_position(PhysicalPosition::new(x, y));
        }
        None => {
            // Top-right of the primary screen, below where the notch sits.
            if let (Ok(Some(mon)), Ok(size)) = (win.primary_monitor(), win.outer_size()) {
                let margin = (24.0 * mon.scale_factor()) as i32;
                let x = mon.position().x + mon.size().width as i32 - size.width as i32 - margin;
                let _ = win.set_position(PhysicalPosition::new(x, mon.position().y + margin * 4));
            }
        }
    }
    let _ = win.show();
}

pub fn close(app: &AppHandle) {
    remember_open(app, false);
    if let Some(win) = app.get_webview_window(LABEL) {
        let _ = win.close();
    }
}

/// Reopens the widget at startup if it was open when Enzi last ran.
pub fn restore(app: &AppHandle) {
    if saved(app).get("open").and_then(Value::as_bool) == Some(true) {
        show(app);
    }
}
