//! JSON files in the app data folder (%APPDATA%\com.enzi.notch).

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

pub fn data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("enzi"))
}

fn file_for(app: &AppHandle, name: &str) -> Option<PathBuf> {
    let valid = !name.is_empty() && name.chars().all(|c| c.is_ascii_lowercase() || c == '_');
    valid.then(|| data_dir(app).join(format!("{name}.json")))
}

pub fn load(app: &AppHandle, name: &str) -> Value {
    file_for(app, name)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(Value::Null)
}

pub fn save(app: &AppHandle, name: &str, value: &Value) -> Result<(), String> {
    let path = file_for(app, name).ok_or("invalid data name")?;
    fs::create_dir_all(data_dir(app)).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    let text = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    fs::write(&tmp, text).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

pub fn file_info(paths: &[String]) -> Vec<Value> {
    paths
        .iter()
        .map(|p| {
            let path = Path::new(p);
            let meta = fs::metadata(path).ok();
            json!({
                "path": p,
                "name": path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| p.clone()),
                "ext": path.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default(),
                "exists": meta.is_some(),
                "isDir": meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                "size": meta.as_ref().map(|m| m.len()).unwrap_or(0),
            })
        })
        .collect()
}
