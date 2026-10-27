//! Quick actions: screenshot, microphone mute, screen color picker, lock, notification settings.

use std::process::Command;

use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};
use windows::Win32::Foundation::POINT;
use windows::Win32::Graphics::Gdi::{
    GetDC, GetMonitorInfoW, GetPixel, MonitorFromPoint, ReleaseDC, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::System::Shutdown::LockWorkStation;
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

pub fn open_uri(uri: &str) -> Result<(), String> {
    Command::new("explorer").arg(uri).spawn().map(|_| ()).map_err(|e| e.to_string())
}

pub fn screenshot() -> Result<(), String> {
    open_uri("ms-screenclip:")
}

pub fn lock() -> Result<(), String> {
    unsafe { LockWorkStation() }.map_err(|e| e.to_string())
}

/// Color of the screen pixel under the mouse, as "#RRGGBB".
pub fn pixel_at_cursor() -> Option<String> {
    unsafe {
        let mut pt = POINT::default();
        GetCursorPos(&mut pt).ok()?;
        let hdc = GetDC(None);
        let c = GetPixel(hdc, pt.x, pt.y).0;
        ReleaseDC(None, hdc);
        if c == u32::MAX {
            return None; // CLR_INVALID
        }
        Some(format!("#{:02X}{:02X}{:02X}", c & 0xff, (c >> 8) & 0xff, (c >> 16) & 0xff))
    }
}

/// Opens a clear full-screen layer over the monitor under the mouse; clicking picks a color.
pub fn open_picker(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("picker") {
        let _ = win.set_focus();
        return;
    }
    let (pos, size) = unsafe {
        let mut pt = POINT::default();
        let _ = GetCursorPos(&mut pt);
        let mon = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
        let mut info = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
        let _ = GetMonitorInfoW(mon, &mut info);
        let r = info.rcMonitor;
        (PhysicalPosition::new(r.left, r.top), PhysicalSize::new((r.right - r.left) as u32, (r.bottom - r.top) as u32))
    };
    let Ok(win) = WebviewWindowBuilder::new(app, "picker", WebviewUrl::App("picker.html".into()))
        .title("Enzi color picker")
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .visible(false)
        .build()
    else {
        return;
    };
    let _ = win.set_position(pos);
    let _ = win.set_size(size);
    let _ = win.show();
    let _ = win.set_focus();
}

pub fn close_picker(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("picker") {
        let _ = win.close();
    }
}
