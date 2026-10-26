//! Low-level keyboard hook used only to detect volume keys, Caps Lock and
//! keyboard-language shortcuts. No other key is recorded, stored or sent anywhere;
//! every key is passed straight on to Windows.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::OnceLock;
use std::thread;
use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Emitter};
use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::Globalization::{GetLocaleInfoEx, LCIDToLocaleName, LOCALE_SLOCALIZEDDISPLAYNAME};
use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{eConsole, eRender, IMMDeviceEnumerator, MMDeviceEnumerator};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, GetKeyState, GetKeyboardLayout, VIRTUAL_KEY, VK_CAPITAL, VK_CONTROL, VK_LCONTROL, VK_LMENU,
    VK_LSHIFT, VK_LWIN, VK_MENU, VK_RCONTROL, VK_RMENU, VK_RSHIFT, VK_RWIN, VK_SHIFT, VK_SPACE, VK_VOLUME_DOWN,
    VK_VOLUME_MUTE, VK_VOLUME_UP,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetForegroundWindow, GetMessageW, GetWindowThreadProcessId, SetWindowsHookExW,
    TranslateMessage, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL, WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

enum KeyEvent {
    Volume,
    Caps(bool),
    Language,
}

static SENDER: OnceLock<Sender<KeyEvent>> = OnceLock::new();
static CAPS_HELD: AtomicBool = AtomicBool::new(false);

fn is(vk: u32, keys: &[VIRTUAL_KEY]) -> bool {
    keys.iter().any(|k| k.0 as u32 == vk)
}

fn held(key: VIRTUAL_KEY) -> bool {
    let state = unsafe { GetAsyncKeyState(key.0 as i32) };
    state < 0
}

unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        if let Some(tx) = SENDER.get() {
            let vk = (*(lparam.0 as *const KBDLLHOOKSTRUCT)).vkCode;
            let msg = wparam.0 as u32;
            let down = msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN;
            let up = msg == WM_KEYUP || msg == WM_SYSKEYUP;
            if is(vk, &[VK_VOLUME_MUTE, VK_VOLUME_DOWN, VK_VOLUME_UP]) {
                if down {
                    let _ = tx.send(KeyEvent::Volume);
                }
            } else if vk == VK_CAPITAL.0 as u32 {
                if down && !CAPS_HELD.swap(true, Ordering::Relaxed) {
                    // The toggle flips after this key-down, so the new state is the opposite.
                    let on = GetKeyState(VK_CAPITAL.0 as i32) & 1 == 0;
                    let _ = tx.send(KeyEvent::Caps(on));
                } else if up {
                    CAPS_HELD.store(false, Ordering::Relaxed);
                }
            } else if down {
                let shift = is(vk, &[VK_SHIFT, VK_LSHIFT, VK_RSHIFT]);
                let alt = is(vk, &[VK_MENU, VK_LMENU, VK_RMENU]);
                let ctrl = is(vk, &[VK_CONTROL, VK_LCONTROL, VK_RCONTROL]);
                let win_space = vk == VK_SPACE.0 as u32 && (held(VK_LWIN) || held(VK_RWIN));
                let shift_combo = shift && (held(VK_MENU) || held(VK_CONTROL));
                let mod_combo = (alt || ctrl) && held(VK_SHIFT);
                if win_space || shift_combo || mod_combo {
                    let _ = tx.send(KeyEvent::Language);
                }
            }
        }
    }
    CallNextHookEx(None, code, wparam, lparam)
}

fn read_volume() -> Option<(f32, bool)> {
    unsafe {
        let enumerator: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
        let device = enumerator.GetDefaultAudioEndpoint(eRender, eConsole).ok()?;
        let volume: IAudioEndpointVolume = device.Activate(CLSCTX_ALL, None).ok()?;
        let level = volume.GetMasterVolumeLevelScalar().ok()?;
        let muted = volume.GetMute().ok()?.as_bool();
        Some((level, muted))
    }
}

/// Locale code and display name of the foreground window's keyboard layout.
fn current_language() -> (String, String) {
    unsafe {
        let thread = GetWindowThreadProcessId(GetForegroundWindow(), None);
        let lang_id = (GetKeyboardLayout(thread).0 as usize & 0xffff) as u32;
        let mut code = [0u16; 85];
        let n = LCIDToLocaleName(lang_id, Some(&mut code), 0).max(1) as usize - 1;
        let code_str = String::from_utf16_lossy(&code[..n]);
        let mut name = [0u16; 128];
        let m = GetLocaleInfoEx(windows::core::PCWSTR(code.as_ptr()), LOCALE_SLOCALIZEDDISPLAYNAME, Some(&mut name))
            .max(1) as usize
            - 1;
        let name_str = String::from_utf16_lossy(&name[..m]);
        (code_str, name_str)
    }
}

pub fn start(app: AppHandle) {
    let (tx, rx) = channel();
    let _ = SENDER.set(tx);

    thread::spawn(|| unsafe {
        let module = GetModuleHandleW(None).unwrap_or_default();
        if SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), HINSTANCE(module.0), 0).is_err() {
            return;
        }
        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    });

    thread::spawn(move || {
        let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        for event in rx {
            let payload = match event {
                KeyEvent::Volume => {
                    // Let Windows apply the key first.
                    thread::sleep(Duration::from_millis(60));
                    let Some((level, muted)) = read_volume() else { continue };
                    json!({ "kind": "volume", "level": level, "muted": muted })
                }
                KeyEvent::Caps(on) => json!({ "kind": "caps", "on": on }),
                KeyEvent::Language => {
                    thread::sleep(Duration::from_millis(250));
                    let (code, name) = current_language();
                    json!({ "kind": "language", "code": code, "name": name })
                }
            };
            let _ = app.emit_to("notch", "indicator", payload);
        }
    });
}
