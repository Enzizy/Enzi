//! Lyrics lookup from LRCLIB (https://lrclib.net), a free, open lyrics database.

use std::time::Duration;

use serde_json::Value;

const USER_AGENT: &str = "Enzi/1.0 (Windows notch app)";

fn has_lyrics(v: &Value) -> bool {
    ["syncedLyrics", "plainLyrics"]
        .iter()
        .any(|k| v.get(k).and_then(Value::as_str).is_some_and(|s| !s.trim().is_empty()))
}

pub fn fetch(title: &str, artist: &str, album: &str, duration: f64) -> Result<Value, String> {
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(8))
        .user_agent(USER_AGENT)
        .build();

    // Exact match first (needs a duration within 2 s of LRCLIB's).
    if duration > 0.0 {
        let mut req = agent
            .get("https://lrclib.net/api/get")
            .query("track_name", title)
            .query("artist_name", artist)
            .query("duration", &format!("{}", duration.round() as i64));
        if !album.is_empty() {
            req = req.query("album_name", album);
        }
        match req.call() {
            Ok(resp) => {
                if let Ok(v) = resp.into_json::<Value>() {
                    if has_lyrics(&v) {
                        return Ok(v);
                    }
                }
            }
            Err(ureq::Error::Status(_, _)) => {}
            Err(e) => return Err(e.to_string()),
        }
    }

    let mut req = agent.get("https://lrclib.net/api/search").query("track_name", title);
    if !artist.is_empty() {
        req = req.query("artist_name", artist);
    }
    let results: Vec<Value> = req
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    let synced = results
        .iter()
        .find(|v| v.get("syncedLyrics").and_then(Value::as_str).is_some_and(|s| !s.is_empty()));
    Ok(synced.or_else(|| results.iter().find(|v| has_lyrics(v))).cloned().unwrap_or(Value::Null))
}
