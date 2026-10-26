//! Explorer-style previews for shelf items, from the Windows shell thumbnail cache.
//! Images, videos, PDFs and documents get real thumbnails; other files get their icon.

use std::ffi::c_void;
use std::sync::mpsc;

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use serde_json::{json, Value};
use windows::core::HSTRING;
use windows::Win32::Foundation::SIZE;
use windows::Win32::Graphics::Gdi::{
    DeleteObject, GetDC, GetDIBits, GetObjectW, ReleaseDC, BITMAP, BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS, HBITMAP,
    HGDIOBJ,
};
use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, IBindCtx, COINIT_APARTMENTTHREADED};
use windows::Win32::UI::Shell::{
    IShellItemImageFactory, SHCreateItemFromParsingName, SIIGBF, SIIGBF_BIGGERSIZEOK, SIIGBF_ICONONLY,
    SIIGBF_THUMBNAILONLY,
};

/// Converts a 32-bit shell bitmap to PNG bytes (straight RGBA).
unsafe fn bitmap_to_png(hbm: HBITMAP) -> Option<Vec<u8>> {
    let mut bm = BITMAP::default();
    let got = GetObjectW(HGDIOBJ(hbm.0), std::mem::size_of::<BITMAP>() as i32, Some(&mut bm as *mut _ as *mut c_void));
    if got == 0 || bm.bmWidth <= 0 || bm.bmHeight == 0 {
        return None;
    }
    let (w, h) = (bm.bmWidth, bm.bmHeight.abs());
    let mut info = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: w,
            biHeight: -h, // top-down rows
            biPlanes: 1,
            biBitCount: 32,
            ..Default::default()
        },
        ..Default::default()
    };
    let mut px = vec![0u8; (w * h * 4) as usize];
    let hdc = GetDC(None);
    let lines = GetDIBits(hdc, hbm, 0, h as u32, Some(px.as_mut_ptr() as *mut c_void), &mut info, DIB_RGB_COLORS);
    ReleaseDC(None, hdc);
    if lines == 0 {
        return None;
    }
    // Photo thumbnails often come back with alpha all zero; treat those as opaque.
    let no_alpha = px.chunks_exact(4).all(|p| p[3] == 0);
    for p in px.chunks_exact_mut(4) {
        p.swap(0, 2); // BGRA -> RGBA
        if no_alpha {
            p[3] = 255;
        } else if p[3] > 0 && p[3] < 255 {
            // Shell bitmaps are premultiplied.
            let a = p[3] as u32;
            for c in &mut p[..3] {
                *c = ((*c as u32 * 255 + a / 2) / a).min(255) as u8;
            }
        }
    }
    let mut out = Vec::new();
    {
        let mut enc = png::Encoder::new(&mut out, w as u32, h as u32);
        enc.set_color(png::ColorType::Rgba);
        enc.set_depth(png::BitDepth::Eight);
        let mut writer = enc.write_header().ok()?;
        writer.write_image_data(&px).ok()?;
    }
    Some(out)
}

/// (data URL, "thumb" for a real preview or "icon" for a file-type icon)
fn thumbnail(path: &str, size: i32) -> Option<(String, &'static str)> {
    unsafe {
        let factory: IShellItemImageFactory = SHCreateItemFromParsingName(&HSTRING::from(path), None::<&IBindCtx>).ok()?;
        let sz = SIZE { cx: size, cy: size };
        let (hbm, kind) = match factory.GetImage(sz, SIIGBF(SIIGBF_THUMBNAILONLY.0 | SIIGBF_BIGGERSIZEOK.0)) {
            Ok(h) => (h, "thumb"),
            Err(_) => (factory.GetImage(sz, SIIGBF_ICONONLY).ok()?, "icon"),
        };
        let png = bitmap_to_png(hbm);
        let _ = DeleteObject(HGDIOBJ(hbm.0));
        Some((format!("data:image/png;base64,{}", B64.encode(png?)), kind))
    }
}

/// Runs on its own single-threaded COM apartment, as shell thumbnail providers expect.
pub fn thumbnails(paths: Vec<String>, size: i32) -> Vec<Value> {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
        let out: Vec<Value> = paths
            .iter()
            .map(|p| match thumbnail(p, size) {
                Some((src, kind)) => json!({ "path": p, "src": src, "kind": kind }),
                None => json!({ "path": p, "src": null }),
            })
            .collect();
        unsafe { CoUninitialize() };
        let _ = tx.send(out);
    });
    rx.recv().unwrap_or_default()
}
