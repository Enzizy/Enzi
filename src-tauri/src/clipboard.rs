//! Clipboard history: notices new copies (text and images) and hands them to the notch.
//! Skips anything apps mark as private, which password managers do for copied passwords.

use std::borrow::Cow;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};
use windows::core::PCWSTR;
use windows::Win32::Foundation::HGLOBAL;
use windows::Win32::System::DataExchange::{
    CloseClipboard, GetClipboardData, GetClipboardSequenceNumber, IsClipboardFormatAvailable, OpenClipboard,
    RegisterClipboardFormatW,
};
use windows::Win32::System::Memory::{GlobalLock, GlobalUnlock};

use crate::AppState;

/// Set when Enzi itself writes to the clipboard, so that copy isn't recorded again.
static SELF_COPY: AtomicBool = AtomicBool::new(false);
const MAX_TEXT: usize = 20_000;

fn format_id(name: &str) -> u32 {
    let wide: Vec<u16> = name.encode_utf16().chain(Some(0)).collect();
    unsafe { RegisterClipboardFormatW(PCWSTR(wide.as_ptr())) }
}

/// True if the current clipboard content asked not to be recorded.
fn is_private() -> bool {
    unsafe {
        if IsClipboardFormatAvailable(format_id("ExcludeClipboardContentFromMonitorProcessing")).is_ok()
            || IsClipboardFormatAvailable(format_id("Clipboard Viewer Ignore")).is_ok()
        {
            return true;
        }
        let history = format_id("CanIncludeInClipboardHistory");
        if IsClipboardFormatAvailable(history).is_err() || OpenClipboard(None).is_err() {
            return false;
        }
        let mut private = false;
        if let Ok(handle) = GetClipboardData(history) {
            let h = HGLOBAL(handle.0);
            let ptr = GlobalLock(h) as *const u32;
            if !ptr.is_null() {
                private = *ptr == 0;
                let _ = GlobalUnlock(h);
            }
        }
        let _ = CloseClipboard();
        private
    }
}

pub fn clips_dir(app: &AppHandle) -> PathBuf {
    crate::store::data_dir(app).join("clips")
}

fn save_png(path: &Path, w: u32, h: u32, rgba: &[u8]) -> Option<()> {
    let file = fs::File::create(path).ok()?;
    let mut enc = png::Encoder::new(std::io::BufWriter::new(file), w, h);
    enc.set_color(png::ColorType::Rgba);
    enc.set_depth(png::BitDepth::Eight);
    enc.write_header().ok()?.write_image_data(rgba).ok()
}

/// Cheap fingerprint so the same image copied twice in a row isn't stored twice.
fn fingerprint(w: usize, h: usize, bytes: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325 ^ ((w as u64) << 32 | h as u64);
    for b in bytes.iter().step_by((bytes.len() / 4096).max(1)) {
        hash = (hash ^ *b as u64).wrapping_mul(0x100_0000_01b3);
    }
    hash
}

pub fn start(app: AppHandle) {
    thread::spawn(move || {
        let mut last_seq = unsafe { GetClipboardSequenceNumber() };
        let mut last_image = 0u64;
        loop {
            thread::sleep(Duration::from_millis(500));
            let seq = unsafe { GetClipboardSequenceNumber() };
            if seq == last_seq {
                continue;
            }
            last_seq = seq;
            if SELF_COPY.swap(false, Ordering::Relaxed) {
                continue;
            }
            let state = app.state::<AppState>();
            if !state.clipboard_enabled.load(Ordering::Relaxed) || is_private() {
                continue;
            }
            // Give the copying app a moment to finish writing everything.
            thread::sleep(Duration::from_millis(80));
            let Ok(mut cb) = arboard::Clipboard::new() else { continue };
            if let Ok(text) = cb.get_text() {
                if !text.trim().is_empty() {
                    let text: String = text.chars().take(MAX_TEXT).collect();
                    let _ = app.emit_to("notch", "clip", json!({ "kind": "text", "text": text }));
                    continue;
                }
            }
            if !state.clipboard_images.load(Ordering::Relaxed) {
                continue;
            }
            if let Ok(img) = cb.get_image() {
                let print = fingerprint(img.width, img.height, &img.bytes);
                if print == last_image {
                    continue;
                }
                last_image = print;
                let dir = clips_dir(&app);
                let _ = fs::create_dir_all(&dir);
                let path = dir.join(format!("clip-{seq}-{print:x}.png"));
                if save_png(&path, img.width as u32, img.height as u32, &img.bytes).is_some() {
                    let _ = app.emit_to(
                        "notch",
                        "clip",
                        json!({ "kind": "image", "path": path.to_string_lossy(), "w": img.width, "h": img.height }),
                    );
                }
            }
        }
    });
}

pub fn copy_text(text: &str) -> Result<(), String> {
    SELF_COPY.store(true, Ordering::Relaxed);
    arboard::Clipboard::new().and_then(|mut c| c.set_text(text.to_string())).map_err(|e| e.to_string())
}

pub fn copy_image(path: &str) -> Result<(), String> {
    let img = image::open(path).map_err(|e| e.to_string())?.to_rgba8();
    let (w, h) = img.dimensions();
    SELF_COPY.store(true, Ordering::Relaxed);
    arboard::Clipboard::new()
        .and_then(|mut c| {
            c.set_image(arboard::ImageData { width: w as usize, height: h as usize, bytes: Cow::Owned(img.into_raw()) })
        })
        .map_err(|e| e.to_string())
}

/// Deletes a saved clipboard image, only if it's inside Enzi's clips folder.
pub fn delete_file(app: &AppHandle, path: &str) {
    if let (Ok(dir), Ok(file)) = (clips_dir(app).canonicalize(), Path::new(path).canonicalize()) {
        if file.parent() == Some(dir.as_path()) {
            let _ = fs::remove_file(file);
        }
    }
}
