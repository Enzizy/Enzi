//! Native drop target for the notch. Accepts files from Explorer (kept in place),
//! files and images dragged out of browsers (Windows "virtual files", saved into the
//! shelf folder), links, and plain text (saved as a .txt file).

use std::cell::Cell;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};
use windows::core::{implement, PCWSTR};
use windows::Win32::Foundation::{BOOL, HGLOBAL, HWND, LPARAM, POINTL};
use windows::Win32::System::Com::{IDataObject, DVASPECT_CONTENT, FORMATETC, STGMEDIUM, TYMED_HGLOBAL, TYMED_ISTREAM};
use windows::Win32::System::DataExchange::RegisterClipboardFormatW;
use windows::Win32::System::Memory::{GlobalLock, GlobalSize, GlobalUnlock};
use windows::Win32::System::Ole::{
    IDropTarget, IDropTarget_Impl, OleInitialize, RegisterDragDrop, ReleaseStgMedium, RevokeDragDrop, DROPEFFECT,
    DROPEFFECT_COPY, DROPEFFECT_NONE,
};
use windows::Win32::System::SystemServices::MODIFIERKEYS_FLAGS;
use windows::Win32::UI::WindowsAndMessaging::EnumChildWindows;

use crate::AppState;

const CF_UNICODETEXT: u16 = 13;
const CF_HDROP: u16 = 15;
/// Largest virtual file (e.g. an image dragged from a browser) that will be saved.
const MAX_VIRTUAL_FILE: u64 = 512 * 1024 * 1024;

fn registered_format(name: &str) -> u16 {
    let wide: Vec<u16> = name.encode_utf16().chain(Some(0)).collect();
    unsafe { RegisterClipboardFormatW(PCWSTR(wide.as_ptr())) as u16 }
}

fn format(cf: u16, index: i32, tymed: u32) -> FORMATETC {
    FORMATETC {
        cfFormat: cf,
        ptd: std::ptr::null_mut(),
        dwAspect: DVASPECT_CONTENT.0 as u32,
        lindex: index,
        tymed,
    }
}

fn has_format(data: &IDataObject, cf: u16) -> bool {
    unsafe { data.QueryGetData(&format(cf, -1, TYMED_HGLOBAL.0 as u32)).is_ok() }
}

fn hglobal_bytes(h: HGLOBAL) -> Vec<u8> {
    unsafe {
        let size = GlobalSize(h);
        let ptr = GlobalLock(h) as *const u8;
        if ptr.is_null() {
            return Vec::new();
        }
        let bytes = std::slice::from_raw_parts(ptr, size).to_vec();
        let _ = GlobalUnlock(h);
        bytes
    }
}

/// Reads one clipboard format as bytes (HGLOBAL or IStream storage).
fn read_format(data: &IDataObject, cf: u16, index: i32) -> Option<Vec<u8>> {
    unsafe {
        let fmt = format(cf, index, (TYMED_HGLOBAL.0 | TYMED_ISTREAM.0) as u32);
        let mut medium: STGMEDIUM = data.GetData(&fmt).ok()?;
        let bytes = if medium.tymed == TYMED_HGLOBAL.0 as u32 {
            Some(hglobal_bytes(medium.u.hGlobal))
        } else if medium.tymed == TYMED_ISTREAM.0 as u32 {
            (*medium.u.pstm).as_ref().map(|stream| {
                let mut out = Vec::new();
                let mut buf = vec![0u8; 64 * 1024];
                loop {
                    let mut read = 0u32;
                    let hr = stream.Read(buf.as_mut_ptr() as *mut _, buf.len() as u32, Some(&mut read));
                    if hr.is_err() || read == 0 || out.len() as u64 > MAX_VIRTUAL_FILE {
                        break;
                    }
                    out.extend_from_slice(&buf[..read as usize]);
                }
                out
            })
        } else {
            None
        };
        ReleaseStgMedium(&mut medium);
        bytes
    }
}

fn utf16_until_nul(bytes: &[u8]) -> String {
    let units: Vec<u16> = bytes.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).take_while(|&u| u != 0).collect();
    String::from_utf16_lossy(&units)
}

/// Paths from a CF_HDROP (DROPFILES header followed by a double-NUL-terminated list).
fn hdrop_paths(data: &IDataObject) -> Vec<String> {
    let Some(bytes) = read_format(data, CF_HDROP, -1) else { return Vec::new() };
    if bytes.len() < 20 {
        return Vec::new();
    }
    let offset = u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) as usize;
    let wide = u32::from_le_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]) != 0;
    if !wide || offset >= bytes.len() {
        return Vec::new();
    }
    let units: Vec<u16> = bytes[offset..].chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
    units
        .split(|&u| u == 0)
        .take_while(|s| !s.is_empty())
        .map(String::from_utf16_lossy)
        .collect()
}

pub fn shelf_dir(app: &AppHandle) -> PathBuf {
    crate::store::data_dir(app).join("shelf")
}

fn safe_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| if c.is_control() || "<>:\"/\\|?*".contains(c) { '_' } else { c })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.');
    if trimmed.is_empty() { "Dropped item".into() } else { trimmed.chars().take(120).collect() }
}

/// Writes bytes into the shelf folder under a name that doesn't clash with existing files.
fn save_copy(app: &AppHandle, name: &str, bytes: &[u8]) -> Option<String> {
    let dir = shelf_dir(app);
    fs::create_dir_all(&dir).ok()?;
    let name = safe_name(name);
    let (stem, ext) = match name.rsplit_once('.') {
        Some((s, e)) if !s.is_empty() => (s.to_string(), format!(".{e}")),
        _ => (name.clone(), String::new()),
    };
    let mut path = dir.join(&name);
    let mut n = 2;
    while path.exists() {
        path = dir.join(format!("{stem} ({n}){ext}"));
        n += 1;
    }
    fs::write(&path, bytes).ok()?;
    Some(path.to_string_lossy().to_string())
}

/// Files dragged from browsers and some apps arrive as FileGroupDescriptorW + FileContents.
fn virtual_files(app: &AppHandle, data: &IDataObject) -> Vec<String> {
    let Some(desc) = read_format(data, registered_format("FileGroupDescriptorW"), -1) else { return Vec::new() };
    if desc.len() < 4 {
        return Vec::new();
    }
    let count = u32::from_le_bytes([desc[0], desc[1], desc[2], desc[3]]) as usize;
    // FILEDESCRIPTORW is 592 bytes; the file name starts 72 bytes in.
    const ITEM: usize = 592;
    const NAME: usize = 72;
    let contents = registered_format("FileContents");
    let mut saved = Vec::new();
    for i in 0..count.min(64) {
        let start = 4 + i * ITEM;
        if desc.len() < start + ITEM {
            break;
        }
        let name = utf16_until_nul(&desc[start + NAME..start + ITEM]);
        if let Some(bytes) = read_format(data, contents, i as i32) {
            if let Some(path) = save_copy(app, &name, &bytes) {
                saved.push(path);
            }
        }
    }
    saved
}

fn is_link(text: &str) -> bool {
    (text.starts_with("http://") || text.starts_with("https://")) && !text.contains(char::is_whitespace)
}

/// Everything usable in a drop, most specific first.
fn extract(app: &AppHandle, data: &IDataObject) -> Vec<String> {
    let paths = hdrop_paths(data);
    if !paths.is_empty() {
        return paths;
    }
    let files = virtual_files(app, data);
    if !files.is_empty() {
        return files;
    }
    if let Some(bytes) = read_format(data, registered_format("UniformResourceLocatorW"), -1) {
        let url = utf16_until_nul(&bytes).trim().to_string();
        if is_link(&url) {
            return vec![url];
        }
    }
    if let Some(bytes) = read_format(data, CF_UNICODETEXT, -1) {
        let text = utf16_until_nul(&bytes);
        let text = text.trim();
        if is_link(text) {
            return vec![text.to_string()];
        }
        if !text.is_empty() {
            let title: String = text.lines().next().unwrap_or("Text").chars().take(40).collect();
            return save_copy(app, &format!("{}.txt", title.trim()), text.as_bytes()).into_iter().collect();
        }
    }
    Vec::new()
}

fn supported(data: &IDataObject) -> bool {
    has_format(data, CF_HDROP)
        || has_format(data, registered_format("FileGroupDescriptorW"))
        || has_format(data, registered_format("UniformResourceLocatorW"))
        || has_format(data, CF_UNICODETEXT)
}

#[implement(IDropTarget)]
struct DropTarget {
    app: AppHandle,
    accepting: Cell<bool>,
}

impl DropTarget_Impl {
    fn effect(&self, out: *mut DROPEFFECT) {
        if !out.is_null() {
            unsafe { *out = if self.accepting.get() { DROPEFFECT_COPY } else { DROPEFFECT_NONE } };
        }
    }
}

impl IDropTarget_Impl for DropTarget_Impl {
    fn DragEnter(
        &self,
        data: Option<&IDataObject>,
        _keys: MODIFIERKEYS_FLAGS,
        _pt: &POINTL,
        effect: *mut DROPEFFECT,
    ) -> windows::core::Result<()> {
        let enabled = self.app.state::<AppState>().shelf_enabled.load(Ordering::Relaxed);
        self.accepting.set(enabled && data.is_some_and(supported));
        self.effect(effect);
        if self.accepting.get() {
            let _ = self.app.emit_to("notch", "shelf-drag", "enter");
        }
        Ok(())
    }

    fn DragOver(&self, _keys: MODIFIERKEYS_FLAGS, _pt: &POINTL, effect: *mut DROPEFFECT) -> windows::core::Result<()> {
        self.effect(effect);
        Ok(())
    }

    fn DragLeave(&self) -> windows::core::Result<()> {
        if self.accepting.replace(false) {
            let _ = self.app.emit_to("notch", "shelf-drag", "leave");
        }
        Ok(())
    }

    fn Drop(
        &self,
        data: Option<&IDataObject>,
        _keys: MODIFIERKEYS_FLAGS,
        _pt: &POINTL,
        effect: *mut DROPEFFECT,
    ) -> windows::core::Result<()> {
        self.effect(effect);
        if !self.accepting.replace(false) {
            return Ok(());
        }
        let items = data.map(|d| extract(&self.app, d)).unwrap_or_default();
        let _ = self.app.emit_to("notch", "shelf-drop", json!({ "items": items }));
        Ok(())
    }
}

unsafe fn register(app: &AppHandle, hwnd: HWND) {
    let target: IDropTarget = DropTarget { app: app.clone(), accepting: Cell::new(false) }.into();
    let _ = RevokeDragDrop(hwnd);
    let _ = RegisterDragDrop(hwnd, &target);
}

unsafe extern "system" fn register_child(hwnd: HWND, lparam: LPARAM) -> BOOL {
    register(&*(lparam.0 as *const AppHandle), hwnd);
    true.into()
}

/// Registers the drop target on the notch window and the WebView's child windows.
/// Must run on the main (UI) thread.
fn install_now(app: &AppHandle) {
    let Some(win) = app.get_webview_window("notch") else { return };
    let Ok(handle) = win.hwnd() else { return };
    let hwnd = HWND(handle.0 as _);
    unsafe {
        let _ = OleInitialize(None);
        register(app, hwnd);
        let _ = EnumChildWindows(hwnd, Some(register_child), LPARAM(app as *const AppHandle as isize));
    }
}

/// Installs now, and again shortly after in case WebView2 creates its child windows late.
pub fn install(app: &AppHandle) {
    install_now(app);
    let app = app.clone();
    std::thread::spawn(move || {
        for delay in [1500, 5000] {
            std::thread::sleep(Duration::from_millis(delay));
            let inner = app.clone();
            let _ = app.run_on_main_thread(move || install_now(&inner));
        }
    });
}

/// Deletes a shelf item only if it is a copy Enzi saved in its own shelf folder.
pub fn forget(app: &AppHandle, path: &str) {
    let dir = shelf_dir(app);
    let p = Path::new(path);
    if let (Ok(dir), Ok(file)) = (dir.canonicalize(), p.canonicalize()) {
        if file.parent() == Some(dir.as_path()) && file.is_file() {
            let _ = fs::remove_file(file);
        }
    }
}
