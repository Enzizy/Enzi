//! Hover detection, fullscreen hiding, network and power watchers, autostart, shell helpers.

use std::os::windows::process::CommandExt;
use std::process::Command;
use std::sync::atomic::Ordering;
use std::thread;
use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};
use windows::core::{w, PWSTR};
use windows::Networking::Connectivity::{NetworkConnectivityLevel, NetworkInformation};
use windows::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, POINT, RECT};
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromPoint, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST, MONITOR_DEFAULTTOPRIMARY,
};
use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
use windows::Win32::System::Threading::{
    CreateMutexW, OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetClassNameW, GetCursorPos, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId,
};
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

use crate::AppState;

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const RUN_VALUE: &str = "Enzi";

pub fn claim_single_instance() -> bool {
    unsafe {
        match CreateMutexW(None, true, w!("Local\\Enzi.SingleInstance")) {
            // The handle is intentionally leaked so the mutex lives as long as the process.
            Ok(_) => GetLastError() != ERROR_ALREADY_EXISTS,
            Err(_) => true,
        }
    }
}

pub fn set_autostart(enabled: bool) {
    let Ok((key, _)) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(RUN_KEY) else { return };
    if enabled {
        if let Ok(exe) = std::env::current_exe() {
            let _ = key.set_value(RUN_VALUE, &format!("\"{}\"", exe.display()));
        }
    } else {
        let _ = key.delete_value(RUN_VALUE);
    }
}

pub fn open_path(path: &str) -> Result<(), String> {
    Command::new("explorer").arg(path).spawn().map(|_| ()).map_err(|e| e.to_string())
}

pub fn reveal_path(path: &str) -> Result<(), String> {
    Command::new("explorer")
        .raw_arg(format!("/select,\"{path}\""))
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn cursor_inside(app: &AppHandle, win: &tauri::WebviewWindow) -> bool {
    let mut pt = POINT::default();
    if unsafe { GetCursorPos(&mut pt) }.is_err() {
        return false;
    }
    let (Ok(pos), Ok(scale)) = (win.outer_position(), win.scale_factor()) else { return false };
    let r = *app.state::<AppState>().hit.lock().unwrap();
    let x = (pt.x - pos.x) as f64 / scale;
    let y = (pt.y - pos.y) as f64 / scale;
    x >= r.x && x <= r.x + r.w && y >= r.y - 2.0 && y <= r.y + r.h
}

/// The foreground window, as seen from the primary monitor.
enum Foreground {
    /// Enzi itself has focus (the user is using the notch).
    Own,
    /// The desktop, the taskbar, nothing, or a window on another monitor.
    Elsewhere,
    /// An app window on the primary monitor: (process id, window rect, monitor rect).
    App(u32, RECT, RECT),
}

fn foreground() -> Foreground {
    unsafe {
        let fg = GetForegroundWindow();
        if fg.0.is_null() {
            return Foreground::Elsewhere;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(fg, Some(&mut pid));
        if pid == std::process::id() {
            return Foreground::Own;
        }
        let mut class = [0u16; 64];
        let n = GetClassNameW(fg, &mut class).max(0) as usize;
        let class = String::from_utf16_lossy(&class[..n]);
        if matches!(class.as_str(), "Progman" | "WorkerW" | "Shell_TrayWnd") {
            return Foreground::Elsewhere;
        }
        let primary = MonitorFromPoint(POINT { x: 0, y: 0 }, MONITOR_DEFAULTTOPRIMARY);
        if MonitorFromWindow(fg, MONITOR_DEFAULTTONEAREST) != primary {
            return Foreground::Elsewhere;
        }
        let mut info = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
        let mut r = RECT::default();
        if !GetMonitorInfoW(primary, &mut info).as_bool() || GetWindowRect(fg, &mut r).is_err() {
            return Foreground::Elsewhere;
        }
        Foreground::App(pid, r, info.rcMonitor)
    }
}

/// True when another process has a window covering the whole primary monitor.
fn is_fullscreen(fg: &Foreground) -> bool {
    match fg {
        Foreground::App(_, r, m) => r.left <= m.left && r.top <= m.top && r.right >= m.right && r.bottom >= m.bottom,
        _ => false,
    }
}

/// Lowercase executable name of a process, e.g. "chrome.exe".
fn process_name(pid: u32) -> String {
    unsafe {
        let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else { return String::new() };
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut len).is_ok();
        let _ = CloseHandle(handle);
        if !ok {
            return String::new();
        }
        let path = String::from_utf16_lossy(&buf[..len as usize]);
        path.rsplit('\\').next().unwrap_or_default().to_lowercase()
    }
}

/// Whether the notch should tuck itself away. None keeps the current state (Enzi has focus).
fn should_auto_hide(app: &AppHandle, fg: &Foreground, names: &mut (u32, String)) -> Option<bool> {
    let state = app.state::<AppState>();
    let cfg = state.auto_hide.lock().unwrap();
    match cfg.mode.as_str() {
        "off" => return Some(false),
        "always" => return Some(true),
        _ => {}
    }
    let (pid, r, m) = match fg {
        Foreground::Own => return None,
        Foreground::Elsewhere => return Some(false),
        Foreground::App(pid, r, m) => (*pid, r, m),
    };
    // Only windows that reach the top edge under the notch can be covered by it.
    let center = (m.left + m.right) / 2;
    let at_top = r.top <= m.top + 12 && r.bottom > m.top + 60 && r.left < center && r.right > center;
    if !at_top {
        return Some(false);
    }
    if cfg.mode == "maximized" {
        return Some(true);
    }
    if names.0 != pid {
        *names = (pid, process_name(pid));
    }
    Some(cfg.apps.iter().any(|a| *a == names.1))
}

fn network_state() -> &'static str {
    let Ok(profile) = NetworkInformation::GetInternetConnectionProfile() else { return "disconnected" };
    match profile.GetNetworkConnectivityLevel() {
        Ok(level) if level == NetworkConnectivityLevel::InternetAccess => "connected",
        Ok(level) if level == NetworkConnectivityLevel::None => "disconnected",
        Ok(_) => "limited",
        Err(_) => "disconnected",
    }
}

/// (on AC power, battery percent) or None when there is no battery.
fn power_state() -> Option<(bool, u8)> {
    let mut s = SYSTEM_POWER_STATUS::default();
    unsafe { GetSystemPowerStatus(&mut s) }.ok()?;
    if s.BatteryFlag == 128 || s.BatteryLifePercent == 255 {
        return None;
    }
    Some((s.ACLineStatus == 1, s.BatteryLifePercent))
}

pub fn start(app: AppHandle) {
    thread::spawn(move || {
        let win = loop {
            if let Some(w) = app.get_webview_window("notch") {
                break w;
            }
            thread::sleep(Duration::from_millis(100));
        };
        let mut inside_prev = false;
        let mut ignoring = true;
        let mut fs_hidden = false;
        let mut net_prev = network_state();
        let mut power_prev = power_state();
        let mut tick: u64 = 0;
        let mut names = (0u32, String::new());
        loop {
            let state = app.state::<AppState>();
            let user_hidden = state.user_hidden.load(Ordering::Relaxed);

            let inside = !user_hidden && !fs_hidden && cursor_inside(&app, &win);
            if ignoring == inside {
                ignoring = !inside;
                let _ = win.set_ignore_cursor_events(ignoring);
            }
            if inside != inside_prev {
                inside_prev = inside;
                let _ = app.emit_to("notch", "hover", inside);
            }

            if tick % 8 == 0 {
                let fg = foreground();
                if let Some(hide) = should_auto_hide(&app, &fg, &mut names) {
                    if state.auto_hidden.swap(hide, Ordering::Relaxed) != hide {
                        let _ = app.emit_to("notch", "auto-hide", hide);
                    }
                }
                let fs = state.hide_fullscreen.load(Ordering::Relaxed) && is_fullscreen(&fg);
                if fs != fs_hidden {
                    fs_hidden = fs;
                    if fs {
                        let _ = win.hide();
                    } else if !user_hidden {
                        let _ = win.show();
                    }
                }
            }

            if tick % 60 == 30 {
                crate::position_notch(&win);
                let net = network_state();
                if net != net_prev {
                    net_prev = net;
                    let _ = app.emit_to("notch", "indicator", json!({ "kind": "network", "state": net }));
                }
                let power = power_state();
                if let (Some((ac, pct)), Some((ac_prev, _))) = (power, power_prev) {
                    if ac != ac_prev {
                        let _ = app.emit_to("notch", "indicator", json!({ "kind": "power", "charging": ac, "percent": pct }));
                    }
                }
                power_prev = power;
            }

            tick = tick.wrapping_add(1);
            thread::sleep(Duration::from_millis(33));
        }
    });
}
