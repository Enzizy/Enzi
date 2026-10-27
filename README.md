# Enzi

A customizable notch for the top of your Windows screen. Hover over it to open it.

**Features** (each one can be turned on/off and configured in Settings)

- **Clock**: 12-hour by default (switch to 24-hour, add seconds, show the date)
- **Music**: now playing from Spotify, browsers or any app that uses Windows media controls; album art, progress bar, seek, play/pause/next/previous
- **Lyrics**: synced lyrics from [LRCLIB](https://lrclib.net), with an adjustable timing offset; can show the current line in the closed notch
- **Focus timer**: Pomodoro-style focus, short and long breaks, chime, daily session count
- **To-do list**: add, edit (double-click), complete, and "focus on this task" (starts the timer)
- **Floating to-do widget**: "Pop out ↗" in the To-do tab (or the tray menu) opens a small always-on-top list. Drag its header to move it; press and hold the bottom-left corner, then drag, to resize. It stays in sync with the notch and reopens where you left it.
- **File shelf**: drag anything onto the notch and it opens straight to the shelf. Files and folders from Explorer stay where they are; images and files dragged out of a browser are saved into the shelf folder; links are kept as links; dragged text becomes a `.txt` file. Click to open, or show it in its folder. Removing a saved copy deletes it.
- **Water reminder**: **off by default**, turn it on in Settings if you want it
- **Popups**: volume, Caps Lock, keyboard language, charger plugged/unplugged, internet connection
- **Tuck away**: when a browser (or any window you choose) reaches the top of the screen, the notch slides up so it doesn't cover your tabs. Hover the very top edge to bring it back. Popups still show.
- **Mascot**: idle animations (looking around, blinking, winking, bouncing), waves hello and goodbye, falls asleep when you're away
- **Appearance**: color palettes, or your own accent, glow and background colors
- **General**: start with Windows, hide during full-screen apps, hover or click to open, minimal notch

Open Settings from the gear in the notch, or by clicking the Enzi tray icon.

## Run and build

Needs Rust and Node.js. WebView2 is already part of Windows 11.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

`npm run build` creates `Enzi.exe` and an installer under `src-tauri/target/release/`.

## Releasing

GitHub builds the installer and publishes it on the [Releases page](https://github.com/Enzizy/Enzi/releases/latest) whenever a version tag is pushed (see `.github/workflows/release.yml`).

1. Set the new version in `src-tauri/tauri.conf.json` (and `package.json` / `src-tauri/Cargo.toml` to match), then commit and push.
2. Tag that version and push the tag:

```bash
git tag v1.0.1
```

```bash
git push origin v1.0.1
```

The release appears after about 10 minutes; progress shows in the repo's **Actions** tab. If the tag doesn't match the version in `tauri.conf.json`, the build stops and says so.

## Where things are saved

Settings, tasks, the timer, the shelf and water progress are JSON files in `%APPDATA%\com.enzi.notch`. Settings has an **Open data folder** button.

## Project layout

- `src/`: the interface. `index.html`, `notch.css` and `notch.js` are the notch; `settings.*` is the Settings window; `shared.js` has the default settings.
- `src-tauri/src/`: the Windows side.
  - `hooks.rs`: keyboard hook. It only reacts to the volume keys, Caps Lock and language shortcuts, and passes every key straight through.
  - `media.rs`: now-playing info and media controls.
  - `lyrics.rs`: LRCLIB lookups.
  - `system.rs`: hover detection, full-screen hiding, network/battery watchers, autostart.
  - `store.rs`: saving data.

To add a setting, add it to `DEFAULTS` in `src/shared.js` and add a row in `SECTIONS` in `src/settings.js`.
