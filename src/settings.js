// Settings form, generated from SECTIONS. Each module card has an on/off switch; options hide while it is off.

const SECTIONS = [
  {
    title: "General", icon: "⚙️",
    rows: [
      { path: "general.startWithWindows", type: "toggle", label: "Start with Windows" },
      { path: "general.hideFullscreen", type: "toggle", label: "Hide during full-screen apps", hint: "Games, videos and presentations" },
      {
        path: "general.autoHide", type: "select", label: "Tuck the notch away",
        hint: "So it doesn't cover browser tabs. Hover the very top of the screen to bring it back.",
        options: [["browsers", "When a browser is at the top"], ["maximized", "When any window is at the top"], ["always", "Always"], ["off", "Never"]],
      },
      { path: "general.tuckRevealDelay", type: "number", label: "Hover time to bring it back", hint: "How long to hold the mouse at the top center while it's tucked away", unit: "ms", min: 0, max: 5000, step: 100 },
      { path: "general.autoHideApps", type: "text", label: "Apps that count as browsers", hint: "Program names separated by commas, like chrome.exe" },
      { path: "general.expandOnHover", type: "toggle", label: "Open when the mouse hovers", hint: "Off: click the notch to open it" },
      { path: "general.expandDelay", type: "number", label: "Hover delay before opening", unit: "ms", min: 0, max: 2000, step: 50 },
      { path: "general.collapseDelay", type: "number", label: "Delay before closing", unit: "ms", min: 0, max: 5000, step: 50 },
      { path: "general.minimal", type: "toggle", label: "Minimal notch", hint: "Smaller pill when closed" },
      { path: "general.quiet", type: "toggle", label: "Quiet mode", hint: "Hides volume, track and other info popups. Reminders still show." },
    ],
  },
  {
    title: "Updates", icon: "⬇️",
    rows: [
      { type: "updates", label: "Enzi" },
      { path: "general.autoUpdate", type: "toggle", label: "Check for updates automatically", hint: "Asks before installing anything" },
    ],
  },
  {
    title: "Appearance", icon: "🎨",
    rows: [
      { type: "palette", label: "Color palette" },
      { path: "appearance.accent", type: "color", label: "Accent color", hint: "Buttons, progress bars, timer", custom: true },
      { path: "appearance.glowColor", type: "color", label: "Glow color", hint: "The light along the bottom of the notch", custom: true },
      { path: "appearance.background", type: "color", label: "Notch background", custom: true },
      { path: "appearance.glow", type: "toggle", label: "Glow" },
      { path: "appearance.glowStrength", type: "range", label: "Glow strength", min: 10, max: 100, unit: "%" },
      { path: "appearance.cornerRadius", type: "range", label: "Corner roundness", hint: "Bottom corners of the notch", min: 6, max: 32, unit: "px" },
    ],
  },
  {
    title: "Mascot", icon: "👀", module: "mascot", hint: "The little face that lives in your notch",
    rows: [
      { path: "mascot.color", type: "color", label: "Eye color" },
      { path: "mascot.idle", type: "toggle", label: "Idle animations", hint: "Looks around, blinks, bounces and winks" },
      { path: "mascot.liveliness", type: "select", label: "How lively", options: [["calm", "Calm"], ["normal", "Normal"], ["playful", "Playful"]] },
      { path: "mascot.wave", type: "toggle", label: "Wave hello and goodbye", hint: "When Enzi starts and when the notch closes" },
      { path: "mascot.sleep", type: "toggle", label: "Fall asleep when you're away" },
      { path: "mascot.sleepAfterMin", type: "number", label: "Fall asleep after", unit: "min", min: 1, max: 60 },
    ],
  },
  {
    title: "Clock", icon: "🕒",
    rows: [
      { path: "clock.format", type: "select", label: "Time format", options: [["12", "12-hour (3:45 PM)"], ["24", "24-hour (15:45)"]] },
      { path: "clock.seconds", type: "toggle", label: "Show seconds" },
      { path: "clock.showDate", type: "toggle", label: "Show the date when open" },
    ],
  },
  {
    title: "Music", icon: "🎵", module: "modules.media", hint: "Now playing from Spotify, browsers and other media apps",
    rows: [
      { path: "modules.media.showArt", type: "toggle", label: "Show album art" },
      { path: "modules.media.showVisualizer", type: "toggle", label: "Show the animated bars" },
      { path: "modules.media.trackPopup", type: "toggle", label: "Pop up when the song changes" },
      { path: "modules.media.showAppIcon", type: "toggle", label: "Show which app is playing", hint: "Click it to switch between players" },
      { path: "modules.media.volumeSlider", type: "toggle", label: "Show a volume slider" },
    ],
  },
  {
    title: "Lyrics", icon: "🎤", module: "modules.lyrics", hint: "Synced lyrics from LRCLIB",
    rows: [
      { path: "modules.lyrics.showInPill", type: "toggle", label: "Show the current line in the closed notch" },
      { path: "modules.lyrics.offsetMs", type: "number", label: "Timing offset", hint: "Positive shows lines earlier", unit: "ms", min: -5000, max: 5000, step: 100 },
    ],
  },
  {
    title: "Focus timer", icon: "⏱️", module: "modules.timer", hint: "Pomodoro-style focus and break timer",
    rows: [
      { path: "modules.timer.focusMin", type: "number", label: "Focus length", unit: "min", min: 1, max: 180 },
      { path: "modules.timer.shortBreakMin", type: "number", label: "Short break", unit: "min", min: 1, max: 60 },
      { path: "modules.timer.longBreakMin", type: "number", label: "Long break", unit: "min", min: 1, max: 90 },
      { path: "modules.timer.longEvery", type: "number", label: "Long break after", unit: "sessions", min: 1, max: 12 },
      { path: "modules.timer.autoStartBreaks", type: "toggle", label: "Start breaks automatically" },
      { path: "modules.timer.sound", type: "toggle", label: "Play a chime when time is up" },
    ],
  },
  { title: "To-do list", icon: "✅", module: "modules.todo", hint: "Quick tasks, with a button to focus on one", rows: [] },
  {
    title: "File shelf", icon: "📁", module: "modules.shelf", hint: "Drag files onto the notch to keep them handy",
    rows: [
      { path: "modules.shelf.converter", type: "toggle", label: "Image converter", hint: "Drag an image in and drop it on \"Convert\"" },
      { path: "modules.shelf.convertFormat", type: "select", label: "Convert to", options: [["webp", "WebP"], ["png", "PNG"], ["jpg", "JPG"]] },
      { path: "modules.shelf.convertQuality", type: "range", label: "Quality", hint: "For JPG and WebP; 100 makes WebP lossless", min: 40, max: 100, unit: "" },
    ],
  },
  {
    title: "Clipboard history", icon: "📋", module: "modules.clipboard", hint: "Everything you copy, one click away. Stays on this PC.",
    rows: [
      { path: "modules.clipboard.images", type: "toggle", label: "Keep copied images too" },
      { path: "modules.clipboard.maxItems", type: "number", label: "Remember up to", unit: "items", min: 5, max: 200, step: 5 },
    ],
  },
  { title: "Quick actions", icon: "⚡", module: "modules.actions", hint: "Screenshot, microphone, color picker, quiet mode and lock", rows: [] },
  {
    title: "Weather", icon: "🌤️", module: "modules.weather", hint: "From Open-Meteo, no account needed",
    rows: [
      { path: "modules.weather.city", type: "text", label: "City", hint: "For example: Manila, London or New York" },
      { path: "modules.weather.unit", type: "select", label: "Units", options: [["c", "Celsius (°C)"], ["f", "Fahrenheit (°F)"]] },
      { path: "modules.weather.showInPill", type: "toggle", label: "Show in the closed notch" },
    ],
  },
  {
    title: "Calendar", icon: "📅", module: "modules.calendar", hint: "Your next meeting, from a private calendar link",
    rows: [
      {
        path: "modules.calendar.icsUrl", type: "text", wide: true, label: "Calendar link (.ics)",
        hint: "Google Calendar: Settings → your calendar → \"Secret address in iCal format\". Outlook: Settings → Calendar → Shared calendars → Publish → ICS.",
      },
      { path: "modules.calendar.remindMin", type: "number", label: "Remind me before", unit: "min", min: 1, max: 60 },
      { path: "modules.calendar.popupAtStart", type: "toggle", label: "Pop up when a meeting starts" },
    ],
  },
  {
    title: "Water reminder", icon: "💧", module: "modules.water", hint: "Reminds you to drink during the day",
    rows: [
      { path: "modules.water.goalMl", type: "select", label: "Daily goal", options: [[1500, "1.5 L"], [2000, "2.0 L"], [2500, "2.5 L"], [3000, "3.0 L"]], number: true },
      { path: "modules.water.bottleMl", type: "number", label: "Bottle size", unit: "ml", min: 100, max: 2000, step: 50 },
      { path: "modules.water.intervalMin", type: "number", label: "Remind every", unit: "min", min: 10, max: 240, step: 5 },
      { path: "modules.water.startHour", type: "number", label: "From", unit: ":00", min: 0, max: 23 },
      { path: "modules.water.endHour", type: "number", label: "Until", unit: ":00", min: 1, max: 24 },
    ],
  },
  {
    title: "Popups", icon: "💬",
    rows: [
      { path: "popups.volume", type: "toggle", label: "Volume" },
      { path: "popups.caps", type: "toggle", label: "Caps Lock" },
      { path: "popups.language", type: "toggle", label: "Keyboard language" },
      { path: "popups.power", type: "toggle", label: "Charger plugged in / unplugged" },
      { path: "popups.network", type: "toggle", label: "Internet connection changes" },
      { path: "popups.bluetooth", type: "toggle", label: "Bluetooth devices connecting", hint: "With battery level when the device reports it" },
      { path: "popups.durationMs", type: "number", label: "How long popups stay", unit: "ms", min: 500, max: 10000, step: 100 },
    ],
  },
];

let S;
let saveTimer;

function status(text) {
  const el = document.getElementById("status");
  el.textContent = text;
  clearTimeout(status.t);
  status.t = setTimeout(() => (el.textContent = ""), 1800);
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await api.invoke("save_settings", { settings: S });
      status("Saved");
    } catch (e) {
      status("Couldn't save: " + e);
    }
  }, 150);
}

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n[k] = v;
    else n.setAttribute(k, v);
  }
  for (const c of children) if (c != null) n.append(c);
  return n;
}

function labelFor(text, hint) {
  return el("label", {}, text, hint ? el("small", {}, hint) : null);
}

function toggle(path, onChange) {
  const input = el("input", { type: "checkbox", role: "switch" });
  input.checked = !!getPath(S, path);
  input.onchange = () => { setPath(S, path, input.checked); onChange && onChange(input.checked); save(); };
  return el("span", { class: "switch" }, input, el("span"));
}

function matchingPalette() {
  const a = S.appearance;
  return Object.keys(PALETTES).find((k) => ["accent", "glowColor", "background"].every((c) => PALETTES[k][c].toLowerCase() === a[c].toLowerCase()));
}

function paletteControl() {
  const wrap = el("div", { class: "palettes" });
  const current = S.appearance.palette;
  const options = [...Object.entries(PALETTES), ["custom", { name: "Custom", ...S.appearance }]];
  for (const [key, p] of options) {
    const b = el("button", { class: "swatch" + (key === current ? " selected" : ""), title: p.name, "aria-label": p.name, "aria-pressed": key === current });
    b.style.setProperty("--sw-bg", p.background);
    b.style.setProperty("--sw-accent", p.accent);
    b.style.setProperty("--sw-glow", p.glowColor);
    b.append(el("span", { class: "sw-dot" }), el("span", { class: "sw-name" }, p.name));
    b.onclick = () => {
      if (key !== "custom") Object.assign(S.appearance, { accent: p.accent, glowColor: p.glowColor, background: p.background });
      S.appearance.palette = key;
      applyAppearance(S.appearance);
      render();
      save();
    };
    wrap.append(b);
  }
  return wrap;
}

function updatesControl() {
  const status = el("span", { class: "upd-status" });
  const btn = el("button", { class: "btn", type: "button" }, "Check for updates");
  api.invoke("app_version").then((v) => (status.textContent = v ? `Version ${v}` : "")).catch(() => {});
  const install = async () => {
    btn.disabled = true;
    status.textContent = "Installing… Enzi will restart";
    try {
      await api.invoke("install_update");
    } catch (e) {
      status.textContent = String(e);
      btn.disabled = false;
    }
  };
  btn.onclick = async () => {
    btn.disabled = true;
    status.textContent = "Checking…";
    try {
      const u = await api.invoke("check_update");
      if (u) {
        status.textContent = `Version ${u.version} is available`;
        btn.textContent = "Install update";
        btn.onclick = install;
      } else status.textContent = "You're up to date";
    } catch (e) {
      status.textContent = "Couldn't check right now";
    }
    btn.disabled = false;
  };
  return el("span", { class: "upd" }, status, btn);
}

function control(row) {
  if (row.type === "palette") return paletteControl();
  if (row.type === "updates") return updatesControl();
  const value = getPath(S, row.path);
  if (row.type === "toggle") return toggle(row.path);
  if (row.type === "color") {
    const input = el("input", { type: "color", value });
    input.oninput = () => {
      setPath(S, row.path, input.value);
      if (row.custom) {
        S.appearance.palette = matchingPalette() || "custom";
        document.querySelectorAll(".swatch").forEach((b) => b.classList.toggle("selected", b.title === (PALETTES[S.appearance.palette] || { name: "Custom" }).name));
        const custom = [...document.querySelectorAll(".swatch")].pop();
        custom.style.setProperty("--sw-" + { accent: "accent", glowColor: "glow", background: "bg" }[row.path.split(".")[1]], input.value);
      }
      applyAppearance(S.appearance);
      save();
    };
    return input;
  }
  if (row.type === "range") {
    const out = el("span", { class: "range-val" }, value + row.unit);
    const input = el("input", { type: "range", min: row.min, max: row.max, value, "aria-label": row.label });
    const fill = () => input.style.setProperty("--fill", ((input.value - row.min) / (row.max - row.min)) * 100 + "%");
    fill();
    input.oninput = () => {
      setPath(S, row.path, Number(input.value));
      out.textContent = input.value + row.unit;
      fill();
      applyAppearance(S.appearance);
      save();
    };
    return el("span", { class: "range" }, input, out);
  }
  if (row.type === "select") {
    const select = el("select");
    for (const [v, text] of row.options) {
      const o = el("option", { value: v }, text);
      if (String(v) === String(value)) o.selected = true;
      select.append(o);
    }
    select.onchange = () => { setPath(S, row.path, row.number ? Number(select.value) : select.value); save(); };
    return select;
  }
  if (row.type === "text") {
    const input = el("input", { type: "text", class: "text-input", value, spellcheck: "false", "aria-label": row.label });
    input.onchange = () => { setPath(S, row.path, input.value.trim()); save(); };
    return input;
  }
  const step = row.step || 1;
  const input = el("input", { type: "number", min: row.min, max: row.max, step, value, "aria-label": row.label });
  const commit = (v) => {
    if (!Number.isFinite(v)) v = getPath(DEFAULTS, row.path);
    v = Math.min(row.max, Math.max(row.min, Math.round(v / step) * step));
    input.value = v;
    setPath(S, row.path, v);
    save();
  };
  input.onchange = () => commit(Number(input.value));
  const minus = el("button", { type: "button", "aria-label": "Decrease", onclick: () => commit(Number(input.value) - step) }, "−");
  const plus = el("button", { type: "button", "aria-label": "Increase", onclick: () => commit(Number(input.value) + step) }, "+");
  return el("span", { class: "stepper" }, el("span", { class: "stepper-box" }, minus, input, plus), row.unit ? el("span", { class: "unit" }, row.unit) : null);
}

function render() {
  const form = document.getElementById("form");
  form.innerHTML = "";
  for (const sec of SECTIONS) {
    const card = el("section", { class: "card" });
    const head = el("div", { class: "card-head" }, el("span", { class: "ico" }, sec.icon), el("h2", {}, sec.title, sec.hint ? el("small", {}, sec.hint) : null));
    if (sec.module) {
      const path = sec.module + ".enabled";
      card.classList.toggle("off", !getPath(S, path));
      head.append(toggle(path, (on) => card.classList.toggle("off", !on)));
    }
    card.append(head);
    if (sec.rows.length) {
      const rows = el("div", { class: "rows" });
      for (const row of sec.rows) {
        const cls = row.type === "palette" || row.wide ? "row stack" : "row";
        rows.append(el("div", { class: cls }, labelFor(row.label, row.hint), control(row)));
      }
      card.append(rows);
    }
    form.append(card);
  }
}

(async () => {
  S = await loadSettings();
  applyAppearance(S.appearance);
  render();
  document.getElementById("reset").onclick = () => {
    if (!confirm("Reset all settings to their defaults?")) return;
    S = structuredClone(DEFAULTS);
    applyAppearance(S.appearance);
    render();
    save();
  };
  document.getElementById("open-data").onclick = () => api.invoke("open_data_dir");
  document.getElementById("quit").onclick = () => api.invoke("quit");
})();
