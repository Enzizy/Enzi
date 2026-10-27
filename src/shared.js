// Shared by the notch and the settings window: defaults, settings merge, backend bridge.

const DEFAULTS = {
  general: {
    startWithWindows: false,
    hideFullscreen: true,
    autoHide: "browsers",
    autoHideApps: "chrome.exe, msedge.exe, firefox.exe, brave.exe, opera.exe, vivaldi.exe, arc.exe, zen.exe, floorp.exe, librewolf.exe, waterfox.exe, chromium.exe, thorium.exe, browser.exe",
    expandOnHover: true,
    expandDelay: 150,
    collapseDelay: 450,
    minimal: false,
  },
  appearance: {
    palette: "midnight",
    accent: "#7c9cff",
    glowColor: "#3b4fd8",
    background: "#000000",
    glow: true,
    glowStrength: 55,
    cornerRadius: 20,
  },
  mascot: {
    enabled: true,
    color: "#ffffff",
    idle: true,
    liveliness: "normal",
    wave: true,
    sleep: true,
    sleepAfterMin: 3,
  },
  clock: { format: "12", seconds: false, showDate: true },
  modules: {
    media: { enabled: true, showArt: true, showVisualizer: true, trackPopup: true },
    lyrics: { enabled: true, offsetMs: 0, showInPill: false },
    timer: { enabled: true, focusMin: 25, shortBreakMin: 5, longBreakMin: 15, longEvery: 4, autoStartBreaks: false, sound: true },
    todo: { enabled: true },
    shelf: { enabled: true },
    water: { enabled: false, goalMl: 2000, bottleMl: 500, intervalMin: 60, startHour: 8, endHour: 22 },
  },
  popups: { volume: true, caps: true, language: true, power: true, network: true, durationMs: 1800 },
};

const PALETTES = {
  midnight: { name: "Midnight", accent: "#7c9cff", glowColor: "#3b4fd8", background: "#000000" },
  ocean: { name: "Ocean", accent: "#4cc9ff", glowColor: "#1e6bff", background: "#02060f" },
  sakura: { name: "Sakura", accent: "#ff8fc7", glowColor: "#d6337f", background: "#0c0408" },
  mint: { name: "Mint", accent: "#5ff0b5", glowColor: "#0f9d6e", background: "#020a07" },
  sunset: { name: "Sunset", accent: "#ffb057", glowColor: "#ff4f6d", background: "#0c0503" },
  lavender: { name: "Lavender", accent: "#b79cff", glowColor: "#7a4dff", background: "#07050e" },
  lemon: { name: "Lemon", accent: "#ffe066", glowColor: "#f59f00", background: "#0a0802" },
  mono: { name: "Mono", accent: "#f2f2f2", glowColor: "#5c5c66", background: "#000000" },
};

// Sets the color CSS variables used by both windows.
// Dark or white, whichever reads better on top of the given color.
function contrastOn(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#14141a" : "#ffffff";
}

function applyAppearance(a, root = document.documentElement) {
  root.style.setProperty("--accent", a.accent);
  root.style.setProperty("--on-accent", contrastOn(a.accent));
  root.style.setProperty("--glow-color", a.glowColor);
  root.style.setProperty("--notch-bg", a.background);
  root.style.setProperty("--glow", a.glow ? a.glowStrength + "%" : "0%");
}

function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }

function mergeDeep(base, over) {
  const out = structuredClone(base);
  if (!isObj(over)) return out;
  for (const [k, v] of Object.entries(over)) {
    if (!(k in base)) continue;
    out[k] = isObj(base[k]) ? mergeDeep(base[k], v) : (typeof v === typeof base[k] ? v : base[k]);
  }
  return out;
}

function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

const pad = (n) => String(n).padStart(2, "0");

function formatTime(date, clock) {
  let h = date.getHours();
  const m = pad(date.getMinutes());
  const s = clock.seconds ? ":" + pad(date.getSeconds()) : "";
  if (clock.format === "24") return `${pad(h)}:${m}${s}`;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m}${s} ${ampm}`;
}

function formatDuration(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function todayKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

// ---- Backend bridge. Inside Tauri this calls Rust; in a plain browser it uses a mock for previewing.
const api = (() => {
  const T = window.__TAURI__;
  if (T) {
    return {
      real: true,
      invoke: (cmd, args) => T.core.invoke(cmd, args),
      listen: (evt, cb) => T.event.listen(evt, (e) => cb(e.payload)),
      emit: (evt, payload) => T.event.emit(evt, payload),
      currentWindow: () => T.window.getCurrentWindow(),
    };
  }
  const handlers = {};
  const store = (k, v) => {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem("enzi." + k) || "null");
      localStorage.setItem("enzi." + k, JSON.stringify(v));
    } catch { return null; }
  };
  const emit = (evt, payload) => (handlers[evt] || []).forEach((cb) => cb(payload));
  const mock = {
    real: false,
    emit,
    async invoke(cmd, args = {}) {
      switch (cmd) {
        case "get_settings": return store("settings");
        case "save_settings": store("settings", args.settings); emit("settings-changed", args.settings); return;
        case "load_data": return store(args.name);
        case "save_data": store(args.name, args.value); return;
        case "file_info": return args.paths.map((p) => ({ path: p, name: p.split(/[\\/]/).pop(), ext: (p.split(".").pop() || "").toLowerCase(), exists: true, isDir: false, size: 1234 }));
        case "fetch_lyrics": return { syncedLyrics: "[00:00.00] Preview lyrics line one\n[00:05.00] The notch keeps the beat\n[00:10.00] Line three is here\n[00:15.00] And a fourth one\n[00:20.00] Looping around" };
        case "media_control": return true;
        case "shelf_thumbnails": {
          const photo = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#ff9a8b"/><stop offset="1" stop-color="#6a5cff"/></linearGradient></defs><rect width="160" height="120" fill="url(#g)"/><circle cx="118" cy="34" r="16" fill="#ffe38a"/><path d="M0 120 L55 60 L95 100 L120 80 L160 120Z" fill="#2b2250"/></svg>');
          return args.paths.map((p) => ({ path: p, src: /\.(png|jpe?g|webp|gif)$/i.test(p) ? photo : null, kind: "thumb" }));
        }
        default: return null;
      }
    },
    async listen(evt, cb) { (handlers[evt] ||= []).push(cb); return () => {}; },
  };
  window.enziMock = mock;
  return mock;
})();

async function loadSettings() {
  return mergeDeep(DEFAULTS, await api.invoke("get_settings"));
}
