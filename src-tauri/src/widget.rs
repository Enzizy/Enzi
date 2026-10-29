//! Floating widgets (the to-do list and the music player): small always-on-top windows that remember
//! where they were. Each one's open state and geometry (physical pixels) live in its own data file.

use serde_json::{json, Value};
use tauri::window::Color;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
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

/// A floating window that stays on top and remembers where it was.
pub struct Widget {
    pub label: &'static str,
    page: &'static str,
    title: &'static str,
    /// Data file holding its open state and geometry.
    store: &'static str,
    size: (f64, f64),
    min: (f64, f64),
}

pub const TODO: Widget = Widget {
    label: "todo-widget",
    page: "widget.html",
    title: "Enzi To-do",
    store: "todo_widget",
    size: (280.0, 340.0),
    min: (200.0, 150.0),
};

pub const MUSIC: Widget = Widget {
    label: "music-widget",
    page: "music.html",
    title: "Enzi Music",
    store: "music_widget",
    size: (380.0, 140.0),
    min: (220.0, 72.0),
};

fn saved(app: &AppHandle, w: &Widget) -> Value {
    let v = store::load(app, w.store);
    if v.is_object() { v } else { json!({}) }
}

fn remember(app: &AppHandle, w: &Widget, key: &str, value: Value) {
    let mut v = saved(app, w);
    v[key] = value;
    let _ = store::save(app, w.store, &v);
}

/// Saved geometry, if it still lands on a connected monitor.
fn saved_geometry(app: &AppHandle, w: &Widget) -> Option<(i32, i32, u32, u32)> {
    let v = saved(app, w);
    let get = |k: &str| v.get(k).and_then(Value::as_i64);
    let (x, y, width, height) = (get("x")? as i32, get("y")? as i32, get("w")? as u32, get("h")? as u32);
    let on_screen = app.available_monitors().ok()?.iter().any(|m| {
        let (p, s) = (m.position(), m.size());
        x + 40 > p.x && x < p.x + s.width as i32 - 40 && y >= p.y - 10 && y < p.y + s.height as i32 - 40
    });
    on_screen.then_some((x, y, width.max(w.min.0 as u32), height.max(w.min.1 as u32)))
}

pub fn show(app: &AppHandle, w: &Widget) {
    remember(app, w, "open", json!(true));
    if let Some(win) = app.get_webview_window(w.label) {
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }
    let builder = WebviewWindowBuilder::new(app, w.label, WebviewUrl::App(w.page.into()))
        .title(w.title)
        .inner_size(w.size.0, w.size.1)
        .min_inner_size(w.min.0, w.min.1)
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
    match saved_geometry(app, w) {
        Some((x, y, width, height)) => {
            let _ = win.set_size(PhysicalSize::new(width, height));
            let _ = win.set_position(PhysicalPosition::new(x, y));
        }
        None => {
            // Right side of the primary screen, below where the notch sits; the music player goes lower
            // so the two widgets don't land on top of each other.
            if let (Ok(Some(mon)), Ok(size)) = (win.primary_monitor(), win.outer_size()) {
                let margin = (24.0 * mon.scale_factor()) as i32;
                let x = mon.position().x + mon.size().width as i32 - size.width as i32 - margin;
                let down = if w.label == MUSIC.label { margin * 20 } else { margin * 4 };
                let _ = win.set_position(PhysicalPosition::new(x, mon.position().y + down));
            }
        }
    }
    let _ = win.show();
}

pub fn close(app: &AppHandle, w: &Widget) {
    remember(app, w, "open", json!(false));
    if let Some(win) = app.get_webview_window(w.label) {
        let _ = win.close();
    }
}

/// Opens the music player, with or without lyrics. If it's already open, it switches mode in place.
pub fn show_music(app: &AppHandle, lyrics: bool) {
    remember(app, &MUSIC, "lyrics", json!(lyrics));
    let _ = app.emit_to(MUSIC.label, "music-lyrics", lyrics);
    show(app, &MUSIC);
}

/// Reopens the widgets that were open when Enzi last ran.
pub fn restore(app: &AppHandle) {
    for w in [&TODO, &MUSIC] {
        if saved(app, w).get("open").and_then(Value::as_bool) == Some(true) {
            show(app, w);
        }
    }
}
