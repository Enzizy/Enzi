//! Image conversion for the shelf: PNG, JPG and WebP (lossy or lossless), plus BMP.

use std::fs::{self, File};
use std::io::BufWriter;
use std::path::{Path, PathBuf};

use image::codecs::jpeg::JpegEncoder;
use image::{DynamicImage, ImageFormat, RgbImage};

pub const IMAGE_EXTS: [&str; 10] = ["png", "jpg", "jpeg", "jfif", "webp", "gif", "bmp", "tif", "tiff", "ico"];

pub fn is_image(name: &str) -> bool {
    Path::new(name)
        .extension()
        .map(|e| IMAGE_EXTS.contains(&e.to_string_lossy().to_lowercase().as_str()))
        .unwrap_or(false)
}

fn unique(path: PathBuf) -> PathBuf {
    if !path.exists() {
        return path;
    }
    let dir = path.parent().map(Path::to_path_buf).unwrap_or_default();
    let stem = path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    let ext = path.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
    (2..)
        .map(|n| dir.join(format!("{stem} ({n}).{ext}")))
        .find(|p| !p.exists())
        .unwrap()
}

/// JPG has no transparency, so transparent areas become white instead of black.
fn flatten_on_white(img: &DynamicImage) -> RgbImage {
    let rgba = img.to_rgba8();
    let mut out = RgbImage::new(rgba.width(), rgba.height());
    for (o, p) in out.pixels_mut().zip(rgba.pixels()) {
        let a = p[3] as u32;
        for c in 0..3 {
            o[c] = ((p[c] as u32 * a + 255 * (255 - a)) / 255) as u8;
        }
    }
    out
}

fn write(img: &DynamicImage, out: &Path, ext: &str, quality: u8) -> Result<(), String> {
    match ext {
        "png" => img.save_with_format(out, ImageFormat::Png).map_err(|e| e.to_string()),
        "bmp" => img.to_rgb8().save_with_format(out, ImageFormat::Bmp).map_err(|e| e.to_string()),
        "jpg" => {
            let file = File::create(out).map_err(|e| e.to_string())?;
            JpegEncoder::new_with_quality(BufWriter::new(file), quality.clamp(1, 100))
                .encode_image(&flatten_on_white(img))
                .map_err(|e| e.to_string())
        }
        "webp" => {
            let rgba = img.to_rgba8();
            let encoder = webp::Encoder::from_rgba(&rgba, rgba.width(), rgba.height());
            let bytes = if quality >= 100 { encoder.encode_lossless() } else { encoder.encode(quality as f32) };
            fs::write(out, &*bytes).map_err(|e| e.to_string())
        }
        _ => Err(format!("Unsupported format: {ext}")),
    }
}

/// Converts one image. Saves next to the original, or into `fallback_dir` if that folder isn't writable.
/// Returns the new file's path.
pub fn convert(path: &str, format: &str, quality: u8, fallback_dir: &Path) -> Result<String, String> {
    let ext = match format.to_lowercase().as_str() {
        "png" => "png",
        "jpg" | "jpeg" => "jpg",
        "webp" => "webp",
        "bmp" => "bmp",
        other => return Err(format!("Unsupported format: {other}")),
    };
    let src = Path::new(path);
    let img = image::open(src).map_err(|e| format!("Couldn't read that image ({e})"))?;
    let stem = src.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "image".into());
    let name = format!("{stem}.{ext}");

    let beside = src.parent().map(|d| unique(d.join(&name)));
    if let Some(out) = beside {
        if write(&img, &out, ext, quality).is_ok() {
            return Ok(out.to_string_lossy().to_string());
        }
        let _ = fs::remove_file(&out);
    }
    fs::create_dir_all(fallback_dir).map_err(|e| e.to_string())?;
    let out = unique(fallback_dir.join(&name));
    write(&img, &out, ext, quality)?;
    Ok(out.to_string_lossy().to_string())
}
