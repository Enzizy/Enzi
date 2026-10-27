(async () => {
  const $ = (id) => document.getElementById(id);
  const island = $("island");
  const load = (name) => api.invoke("load_data", { name });
  const save = (name, value) => api.invoke("save_data", { name, value });

  const svg = (d, fill = false) =>
    `<svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="${fill ? "none" : "currentColor"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    media: svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>'),
    todo: svg('<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>'),
    shelf: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    water: svg('<path d="M12 2.7l5.7 5.6a8 8 0 1 1-11.4 0z"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    pin: svg('<path d="M12 17v5M9 10.8V4h6v6.8l3 3.2v2H6v-2z"/>'),
    play: svg('<path d="M7 4.5v15l13-7.5z"/>', true),
    pause: svg('<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>', true),
    next: svg('<path d="M5 4.5v15l10-7.5zM17 4h2.5v16H17z"/>', true),
    prev: svg('<path d="M19 4.5v15L9 12zM4.5 4H7v16H4.5z"/>', true),
    volume: svg('<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
    mute: svg('<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/>'),
    caps: svg('<path d="M12 3l8 9h-4v4H8v-4H4z"/><path d="M8 20h8"/>'),
    keyboard: svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 15h10"/>'),
    plug: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    battery: svg('<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/>'),
    wifi: svg('<path d="M5 12.6a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 20 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>'),
    wifiOff: svg('<path d="M2 2l20 20M8.5 16a5 5 0 0 1 7 0M5 12.6a10 10 0 0 1 5.2-2.7M16.8 10.4a10 10 0 0 1 2.2 2.2M2 8.8a15 15 0 0 1 4.2-2.8M10.7 5.1A15 15 0 0 1 22 8.8"/>'),
    focus: svg('<path d="M7 4.5v15l13-7.5z"/>', true),
    trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    x: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
    link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    tray: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/><path d="M12 2v7M9 6.5l3 3 3-3"/>'),
    download: svg('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
    clipboard: svg('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'),
    actions: svg('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
    camera: svg('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/>'),
    mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>'),
    micOff: svg('<path d="M2 2l20 20M9 9v1a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7"/><path d="M19 10a7 7 0 0 1-1.1 3.8M5 10a7 7 0 0 0 11.5 5.4M12 17v4M8 21h8"/>'),
    picker: svg('<path d="M14.5 6.5l3 3M4 20l1-4 9.5-9.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M15 4l2-2 5 5-2 2"/>'),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    convert: svg('<path d="M4 7h13l-3-3M20 17H7l3 3"/>'),
    bluetooth: svg('<path d="M7 7l10 10-5 5V2l5 5L7 17"/>'),
    calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
    chevLeft: svg('<path d="M15 18l-6-6 6-6"/>'),
    chevRight: svg('<path d="M9 18l6-6-6-6"/>'),
  };

  // Load everything up front so the rest of setup runs synchronously, before any event can arrive.
  let S = await loadSettings();
  const [timerData, todoData, shelfData, waterData, clipData] = await Promise.all(["timer", "todo", "shelf", "water", "clipboard"].map(load));
  let mode = "collapsed";
  let hovering = false, pinned = false, dragging = false, popupWide = false;
  let activeTab = null, expandTimer, collapseTimer, popupTimer;
  // autoHidden: Rust says a browser is at the top. revealed: the user hovered the top edge to bring it back.
  let autoHidden = false, revealed = false, tuckTimer, revealTimer;
  const tucked = () => autoHidden && mode === "collapsed" && !revealed;

  // ---------- Layout ----------
  const TABS = [
    ["media", "Music"], ["timer", "Focus timer"], ["todo", "To-do"], ["shelf", "File shelf"],
    ["clipboard", "Clipboard history"], ["actions", "Quick actions"], ["water", "Water reminder"],
  ];
  const enabledTabs = () => TABS.filter(([k]) => S.modules[k].enabled).map(([k]) => k);
  const hasMedia = () => S.modules.media.enabled && media && media.title;

  // [width, height, bottom corner radius]; the radius comes from Appearance → Corner roundness.
  function sizeFor(m) {
    const corner = S.appearance.cornerRadius;
    const fit = (w, h) => [w, h, Math.min(corner, h / 2)];
    if (m === "expanded") return enabledTabs().length ? fit(580, 250) : fit(320, 64);
    if (m === "popup") return popupWide ? fit(400, 64) : fit(340, 50);
    const busy = hasMedia() || (S.modules.timer.enabled && T.running);
    if (S.general.minimal) return fit(busy ? 190 : 130, 28);
    return fit(busy ? 280 : 210, 36);
  }

  function applySize() {
    const [w, h, r] = sizeFor(mode);
    island.style.setProperty("--w", w + "px");
    island.style.setProperty("--h", h + "px");
    island.style.setProperty("--r", r + "px");
    const tuck = tucked();
    island.classList.toggle("tucked", tuck);
    // While tucked, only a thin strip along the very top edge reacts to the mouse.
    api.invoke("set_hit_rect", { x: (window.innerWidth - w) / 2 - 4, y: 0, w: w + 8, h: tuck ? 3 : h + 6, passive: tuck });
  }

  function setMode(m) {
    mode = m;
    island.className = m;
    if (m !== "expanded" && document.activeElement !== document.body) document.activeElement.blur();
    applySize();
  }

  function expand(tab) {
    clearTimeout(popupTimer);
    const tabs = enabledTabs();
    if (!tab || !tabs.includes(tab)) {
      if (hasMedia() && media.playing) tab = "media";
      else if (T.running && tabs.includes("timer")) tab = "timer";
      else tab = tabs.includes(activeTab) ? activeTab : tabs[0];
    }
    showTab(tab);
    setMode("expanded");
  }

  function collapse() {
    clearTimeout(expandTimer);
    const wasExpanded = mode === "expanded";
    if (!hovering) revealed = false;
    setMode("collapsed");
    if (wasExpanded) setTimeout(() => mode === "collapsed" && greet(), 450);
  }

  function scheduleCollapse() {
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      // Only counts as typing while Windows has actually given the notch keyboard focus.
      const typing = document.hasFocus() && document.activeElement && document.activeElement.tagName === "INPUT";
      if (mode === "expanded" && !hovering && !pinned && !dragging && !typing) collapse();
    }, S.general.collapseDelay);
  }

  function scheduleExpand() {
    if (mode === "expanded" || !S.general.expandOnHover) return;
    clearTimeout(expandTimer);
    // Skip if a drag already opened the shelf, so this doesn't switch it to another tab.
    expandTimer = setTimeout(() => hovering && mode !== "expanded" && expand(dragging ? "shelf" : undefined), S.general.expandDelay);
  }

  function reveal() {
    clearTimeout(revealTimer);
    island.classList.remove("peeking");
    revealed = true;
    applySize();
  }

  function onHover(inside) {
    hovering = inside;
    if (inside) {
      mascotWake();
      clearTimeout(collapseTimer);
      clearTimeout(tuckTimer);
      if (tucked()) {
        // Tucked over a browser: wait a moment so reaching for a tab doesn't open it.
        // The notch slowly peeks down meanwhile to show it's coming.
        const wait = S.general.tuckRevealDelay;
        clearTimeout(revealTimer);
        island.style.setProperty("--peek-ms", wait + "ms");
        island.classList.add("peeking");
        revealTimer = setTimeout(() => {
          if (!hovering || !tucked()) return;
          reveal();
          scheduleExpand();
        }, wait);
        return;
      }
      scheduleExpand();
    } else {
      clearTimeout(expandTimer);
      clearTimeout(revealTimer);
      island.classList.remove("peeking");
      if (mode === "expanded") scheduleCollapse();
      if (revealed && mode !== "expanded") {
        clearTimeout(tuckTimer);
        tuckTimer = setTimeout(() => {
          if (!hovering && mode !== "expanded") {
            revealed = false;
            applySize();
          }
        }, S.general.collapseDelay);
      }
    }
  }

  api.listen("hover", onHover);
  // Something is being dragged onto the tucked edge: skip the wait so the drop can land.
  api.listen("edge-drag", () => {
    if (!tucked()) return;
    reveal();
    scheduleExpand();
  });
  api.listen("auto-hide", (hide) => {
    autoHidden = hide;
    if (!hide) revealed = false;
    applySize();
  });
  api.invoke("get_auto_hidden").then((hide) => {
    autoHidden = !!hide;
    applySize();
  });
  // Clicking another app takes focus away: close (unless pinned or the mouse is still on the notch).
  window.addEventListener("blur", () => {
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    if (!hovering && !pinned && mode === "expanded") collapse();
  });
  $("pill").addEventListener("click", () => expand());
  $("popup").addEventListener("click", (e) => { if (!e.target.closest("button")) expand(); });

  function renderTabs() {
    const nav = $("tabs");
    nav.innerHTML = "";
    for (const k of enabledTabs()) {
      const b = document.createElement("button");
      b.dataset.tab = k;
      b.title = TABS.find((t) => t[0] === k)[1];
      b.innerHTML = ICON[k];
      b.onclick = () => showTab(k);
      nav.appendChild(b);
    }
    if (!enabledTabs().includes(activeTab)) activeTab = enabledTabs()[0] || null;
    showTab(activeTab);
  }

  function showTab(k) {
    activeTab = k;
    document.querySelectorAll("section").forEach((s) => s.classList.toggle("active", s.dataset.tab === k));
    document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === k));
    if (k === "shelf") refreshShelf();
    if (k === "clipboard") renderClips();
    if (k === "actions") renderActions();
    if (k === "media") refreshVolume();
  }

  $("gear-btn").innerHTML = ICON.gear;
  $("pin-btn").innerHTML = ICON.pin;
  $("gear-btn").onclick = () => api.invoke("open_settings");
  $("pin-btn").onclick = () => {
    pinned = !pinned;
    $("pin-btn").classList.toggle("on", pinned);
    if (!pinned && !hovering) scheduleCollapse();
  };

  // ---------- Popups ----------
  function showPopup({ icon, img, html, title, sub = "", value = "", bar = null, actions = [], ms, important = false }) {
    if (mode === "expanded" && !actions.length) return;
    // Quiet mode keeps informational popups away; ones that ask you something still show.
    if (S.general.quiet && !actions.length && !important) return;
    if (html) $("pop-icon").innerHTML = html;
    else if (img) {
      const im = document.createElement("img");
      im.src = img;
      im.alt = "";
      $("pop-icon").replaceChildren(im);
    } else $("pop-icon").innerHTML = ICON[icon] || "";
    $("pop-title").textContent = title;
    $("pop-sub").textContent = sub;
    $("pop-value").textContent = value;
    $("pop-bar").hidden = bar === null;
    if (bar !== null) $("pop-fill").style.width = Math.round(Math.max(0, Math.min(1, bar)) * 100) + "%";
    const acts = $("pop-actions");
    acts.innerHTML = "";
    for (const a of actions) {
      const b = document.createElement("button");
      b.textContent = a.label;
      if (a.primary) b.className = "primary";
      b.onclick = (e) => { e.stopPropagation(); a.run(); collapse(); };
      acts.appendChild(b);
    }
    popupWide = actions.length > 0;
    if (mode === "expanded") collapse();
    setMode("popup");
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => { if (mode === "popup" && !hovering) setMode("collapsed"); }, ms || S.popups.durationMs);
  }

  api.listen("indicator", (e) => {
    const P = S.popups;
    if (e.kind === "volume" && P.volume) {
      const pct = Math.round(e.level * 100);
      showPopup({ icon: e.muted || pct === 0 ? "mute" : "volume", title: e.muted ? "Muted" : "Volume", bar: e.muted ? 0 : e.level, value: e.muted ? "" : pct + "%" });
    } else if (e.kind === "caps" && P.caps) {
      showPopup({ icon: "caps", title: "Caps Lock", value: e.on ? "On" : "Off" });
    } else if (e.kind === "language" && P.language) {
      showPopup({ icon: "keyboard", title: e.name || e.code || "Keyboard", sub: "Input language", value: (e.code || "").split("-")[0].toUpperCase() });
    } else if (e.kind === "power" && P.power) {
      showPopup({ icon: e.charging ? "plug" : "battery", title: e.charging ? "Charging" : "On battery", bar: e.percent / 100, value: e.percent + "%" });
    } else if (e.kind === "network" && P.network) {
      const title = { connected: "Connected", limited: "No internet access", disconnected: "Disconnected" }[e.state] || e.state;
      showPopup({ icon: e.state === "connected" ? "wifi" : "wifiOff", title, sub: "Network" });
    } else if (e.kind === "bluetooth" && P.bluetooth) {
      const hasBattery = e.connected && typeof e.battery === "number";
      showPopup({
        icon: "bluetooth",
        title: e.name,
        sub: e.connected ? "Connected" : "Disconnected",
        value: hasBattery ? e.battery + "%" : "",
        bar: hasBattery ? e.battery / 100 : null,
        ms: 2600,
      });
    } else if (e.kind === "color") {
      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = e.hex;
      showPopup({ html: sw.outerHTML, title: e.hex, sub: "Copied to clipboard", important: true, ms: 2600 });
    }
    if (e.kind === "volume" && mode === "expanded" && activeTab === "media") refreshVolume();
  });

  // ---------- Clock & pill ----------
  function renderClock() {
    const now = new Date();
    $("hdr-time").textContent = formatTime(now, S.clock);
    $("hdr-date").textContent = S.clock.showDate ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";
    renderInfo();
  }

  function renderPill() {
    const playing = hasMedia();
    const showArt = playing && S.modules.media.showArt && artUrl;
    $("pill-art").hidden = !showArt;
    if (showArt && $("pill-art").src !== artUrl) $("pill-art").src = artUrl;
    $("mascot").hidden = !!showArt || !S.mascot.enabled;
    let text = formatTime(new Date(), S.clock);
    if (playing) {
      const line = S.modules.lyrics.enabled && S.modules.lyrics.showInPill ? currentLyric() : "";
      text = line || media.title;
    } else {
      text = meetingCountdown() || text;
    }
    $("pill-text").textContent = text;
    const eq = $("pill-eq");
    eq.hidden = !(playing && S.modules.media.showVisualizer);
    eq.classList.toggle("paused", !(media && media.playing));
    const timerOn = S.modules.timer.enabled && T.running;
    $("pill-timer").hidden = !timerOn;
    if (timerOn) $("pill-timer").textContent = formatDuration(timerLeft());
    const w = S.modules.weather;
    const showWeather = w.enabled && w.showInPill && weather && !weather.error && !playing && !timerOn && !S.general.minimal;
    $("pill-weather").hidden = !showWeather;
    if (showWeather) $("pill-weather").textContent = `${weatherIcon(weather.code, weather.isDay)} ${weather.temp}°`;
  }

  // ---------- Media & lyrics ----------
  let media = null, artUrl = null, posBase = 0, posAt = 0;
  let lyr = { key: null, status: "idle", lines: [] };
  const lyricsCache = new Map();
  const trackKey = (m) => (m ? `${m.title}\u0001${m.artist}\u0001${m.album}` : null);

  function livePos() {
    if (!media) return 0;
    const p = posBase + (media.playing ? (performance.now() - posAt) / 1000 : 0);
    return media.duration ? Math.min(p, media.duration) : p;
  }

  api.listen("media", (m) => {
    const prevKey = trackKey(media), wasPlaying = media && media.playing;
    const est = livePos();
    media = m && m.title ? m : null;
    if (media && (!media.playing || wasPlaying !== media.playing || Math.abs(est - media.position) > 1.5 || trackKey(media) !== prevKey)) {
      posBase = media.position;
      posAt = performance.now();
    }
    if (trackKey(media) !== prevKey) onTrackChange();
    renderMedia();
    if (mode === "collapsed") applySize();
  });
  api.listen("media-art", (a) => { artUrl = a || null; renderMedia(); renderPill(); });

  function onTrackChange() {
    lyr = { key: null, status: "idle", lines: [] };
    if (!media) return;
    loadLyrics();
    if (S.modules.media.enabled && S.modules.media.trackPopup && media.playing && mode === "collapsed") {
      setTimeout(() => media && showPopup({ img: S.modules.media.showArt ? artUrl : null, icon: "media", title: media.title, sub: media.artist, ms: 2600 }), 700);
    }
  }

  function cleanTrack(m) {
    let title = m.title, artist = m.artist || "";
    title = title.replace(/\s*[([][^)\]]*(official|video|audio|lyric|visuali[sz]er|\bmv\b|\bhd\b|4k|remaster)[^)\]]*[)\]]/gi, "").trim();
    artist = artist.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
    const dash = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (dash && (!artist || !/spotify/i.test(m.source || ""))) { artist = dash[1]; title = dash[2]; }
    return { title, artist };
  }

  function parseLrc(text) {
    const out = [];
    for (const line of text.split(/\r?\n/)) {
      const tags = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      if (!tags.length) continue;
      const words = line.replace(/\[[^\]]*\]/g, "").trim();
      for (const t of tags) out.push({ t: +t[1] * 60 + +t[2], text: words || "♪" });
    }
    return out.sort((a, b) => a.t - b.t);
  }

  async function loadLyrics() {
    if (!media || !S.modules.lyrics.enabled) return;
    const k = trackKey(media);
    if (lyr.key === k && lyr.status !== "idle") return;
    if (lyricsCache.has(k)) { lyr = lyricsCache.get(k); return; }
    lyr = { key: k, status: "loading", lines: [] };
    const { title, artist } = cleanTrack(media);
    try {
      const res = await api.invoke("fetch_lyrics", { title, artist, album: media.album || "", duration: media.duration || 0 });
      if (lyr.key !== k) return;
      if (res && res.instrumental) lyr = { key: k, status: "instrumental", lines: [] };
      else if (res && res.syncedLyrics) lyr = { key: k, status: "synced", lines: parseLrc(res.syncedLyrics) };
      else if (res && res.plainLyrics) lyr = { key: k, status: "plain", lines: res.plainLyrics.split(/\r?\n/).filter((l) => l.trim()).map((text) => ({ t: 0, text })) };
      else lyr = { key: k, status: "none", lines: [] };
      lyricsCache.set(k, lyr);
    } catch {
      if (lyr.key === k) lyr = { key: k, status: "error", lines: [] };
    }
  }

  function lyricIndex() {
    const lines = lyr.lines;
    if (!lines.length) return -1;
    if (lyr.status === "plain") return media.duration ? Math.min(lines.length - 1, Math.floor((livePos() / media.duration) * lines.length)) : 0;
    const p = livePos() + S.modules.lyrics.offsetMs / 1000;
    let i = -1;
    while (i + 1 < lines.length && lines[i + 1].t <= p) i++;
    return i;
  }

  function currentLyric() {
    const i = lyricIndex();
    return i >= 0 && lyr.status === "synced" ? lyr.lines[i].text : "";
  }

  function renderLyrics() {
    // Only take up room when there's something to show; otherwise the track info gets the full width.
    const shown = ["synced", "plain", "instrumental"].includes(lyr.status);
    $("media-box").classList.toggle("no-lyrics", !S.modules.lyrics.enabled || !shown);
    const msg = { instrumental: "♪ Instrumental" }[lyr.status];
    if (!shown || msg !== undefined) {
      $("ly-prev").textContent = "";
      $("ly-cur").textContent = msg;
      $("ly-next").textContent = "";
      return;
    }
    const i = lyricIndex(), L = lyr.lines;
    $("ly-prev").textContent = i > 0 ? L[i - 1].text : "";
    $("ly-cur").textContent = i >= 0 ? L[i].text : "♪";
    $("ly-next").textContent = L[i + 1] ? L[i + 1].text : "";
  }

  function renderMedia() {
    $("media-empty").hidden = !!media;
    $("media-box").hidden = !media;
    if (!media) return;
    $("m-title").textContent = media.title;
    $("m-artist").textContent = [media.artist, media.album].filter(Boolean).join(" · ");
    $("media-box").classList.toggle("no-art", !(S.modules.media.showArt && artUrl));
    if (!S.modules.lyrics.enabled) $("media-box").classList.add("no-lyrics");
    if (artUrl && $("art").src !== artUrl) $("art").src = artUrl;
    $("b-play").innerHTML = media.playing ? ICON.pause : ICON.play;
    renderSource();
    renderProgress();
  }

  function renderProgress() {
    if (!media) return;
    const p = livePos();
    $("m-cur").textContent = formatDuration(p);
    $("m-dur").textContent = formatDuration(media.duration);
    $("m-fill").style.width = media.duration ? (p / media.duration) * 100 + "%" : "0";
    if (S.modules.lyrics.enabled) renderLyrics();
  }

  $("b-prev").innerHTML = ICON.prev;
  $("b-next").innerHTML = ICON.next;
  document.querySelectorAll("[data-media]").forEach((b) => {
    b.onclick = () => {
      api.invoke("media_control", { action: b.dataset.media });
      if (b.dataset.media === "toggle" && media) {
        posBase = livePos();
        posAt = performance.now();
        media.playing = !media.playing;
        renderMedia();
      }
    };
  });
  $("m-bar").onclick = (e) => {
    if (!media || !media.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const target = ((e.clientX - r.left) / r.width) * media.duration;
    api.invoke("media_control", { action: "seek", value: target });
    posBase = target;
    posAt = performance.now();
    renderProgress();
  };

  // Which app is playing, and switching between players when several are open.
  let mediaApp = null;
  api.listen("media-app", (a) => { mediaApp = a; renderSource(); });

  function renderSource() {
    const show = S.modules.media.showAppIcon && mediaApp && mediaApp.name;
    $("m-source").hidden = !show;
    if (!show) return;
    const icon = $("m-app-icon");
    icon.hidden = !mediaApp.icon;
    if (mediaApp.icon && icon.src !== mediaApp.icon) icon.src = mediaApp.icon;
    $("m-source").classList.toggle("has-icon", !!mediaApp.icon);
    $("m-app-name").textContent = mediaApp.name;
    $("m-chev").hidden = !(media && media.sessions && media.sessions.length > 1);
  }

  $("m-source").onclick = (e) => {
    e.stopPropagation();
    const menu = $("m-switch");
    if (!media || !media.sessions || media.sessions.length < 2) return;
    if (!menu.hidden) { menu.hidden = true; return; }
    menu.innerHTML = "";
    for (const s of media.sessions) {
      const b = document.createElement("button");
      b.textContent = s.name;
      b.classList.toggle("active", s.id === media.source);
      b.onclick = () => { api.invoke("media_select", { id: s.id }); menu.hidden = true; };
      menu.appendChild(b);
    }
    const auto = document.createElement("button");
    auto.textContent = "Follow Windows (automatic)";
    auto.onclick = () => { api.invoke("media_select", { id: null }); menu.hidden = true; };
    menu.appendChild(auto);
    menu.hidden = false;
  };
  document.addEventListener("click", () => ($("m-switch").hidden = true));

  // System volume slider in the music tab.
  let volMuted = false, volTimer;
  async function refreshVolume() {
    $("vol-box").hidden = !S.modules.media.volumeSlider;
    if (!S.modules.media.volumeSlider) return;
    const v = await api.invoke("get_volume", { mic: false }).catch(() => null);
    if (!v) return;
    volMuted = v.muted;
    $("vol").value = Math.round(v.level * 100);
    volFill();
    $("vol-btn").innerHTML = v.muted || v.level === 0 ? ICON.mute : ICON.volume;
  }
  function volFill() { $("vol").style.setProperty("--fill", $("vol").value + "%"); }
  $("vol").oninput = () => {
    clearTimeout(volTimer);
    volFill();
    const level = $("vol").value / 100;
    $("vol-btn").innerHTML = level === 0 ? ICON.mute : ICON.volume;
    volTimer = setTimeout(() => api.invoke("set_volume", { mic: false, level }), 40);
  };
  $("vol-btn").onclick = async () => {
    volMuted = !volMuted;
    await api.invoke("set_volume", { mic: false, muted: volMuted });
    refreshVolume();
  };

  // ---------- Focus timer ----------
  const modeSec = (m) => {
    const c = S.modules.timer;
    return 60 * (m === "focus" ? c.focusMin : m === "short" ? c.shortBreakMin : c.longBreakMin);
  };
  let T = Object.assign({ mode: "focus", running: false, endsAt: 0, remaining: modeSec("focus"), task: "", sessions: 0, cycle: 0, date: todayKey() }, timerData || {});
  if (T.date !== todayKey()) Object.assign(T, { sessions: 0, cycle: 0, date: todayKey() });
  const saveTimer = () => save("timer", T);
  const timerLeft = () => (T.running ? Math.max(0, (T.endsAt - Date.now()) / 1000) : T.remaining);

  function timerStart() { if (T.running) return; T.running = true; T.endsAt = Date.now() + T.remaining * 1000; saveTimer(); renderTimer(); applySize(); }
  function timerPause() { T.remaining = timerLeft(); T.running = false; saveTimer(); renderTimer(); applySize(); }
  function timerReset() { T.running = false; T.remaining = modeSec(T.mode); saveTimer(); renderTimer(); applySize(); }
  function timerMode(m) { T.mode = m; timerReset(); }

  function beep() {
    if (!S.modules.timer.sound) return;
    try {
      const ctx = new AudioContext();
      [0, 0.25, 0.5].forEach((t, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = i === 2 ? 1046 : 784;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.22);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.25);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch {}
  }

  function timerFinish(natural) {
    let next = "focus";
    if (T.mode === "focus") {
      if (natural) { T.sessions++; T.cycle++; }
      next = T.cycle > 0 && T.cycle % S.modules.timer.longEvery === 0 && natural ? "long" : "short";
    }
    if (natural) {
      beep();
      const doneFocus = T.mode === "focus";
      showPopup({
        icon: "timer",
        title: doneFocus ? "Focus session done" : "Break's over",
        sub: doneFocus ? (next === "long" ? "Take a long break" : "Take a short break") : "Ready to focus again?",
        actions: [{ label: doneFocus ? "Start break" : "Start focus", primary: true, run: timerStart }, { label: "Later", run: () => {} }],
        ms: 15000,
      });
    }
    T.mode = next;
    T.remaining = modeSec(next);
    T.running = false;
    if (natural && next !== "focus" && S.modules.timer.autoStartBreaks) timerStart();
    saveTimer();
    renderTimer();
    applySize();
  }

  function renderTimer() {
    const left = timerLeft(), full = modeSec(T.mode);
    $("t-time").textContent = formatDuration(left);
    $("t-mode").textContent = { focus: "Focus", short: "Short break", long: "Long break" }[T.mode];
    $("t-ring").style.strokeDashoffset = String(326.7 * (1 - left / full));
    $("t-start").textContent = T.running ? "Pause" : left < full ? "Resume" : "Start";
    $("t-task").textContent = T.task ? "Focusing on: " + T.task : "";
    document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === T.mode));
    $("t-stats").textContent = `${T.sessions} focus session${T.sessions === 1 ? "" : "s"} today`;
  }

  $("t-start").onclick = () => (T.running ? timerPause() : timerStart());
  $("t-reset").onclick = timerReset;
  $("t-skip").onclick = () => timerFinish(false);
  document.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => timerMode(b.dataset.mode)));

  // ---------- To-do ----------
  let todo = Object.assign({ items: [], stats: { date: todayKey(), done: 0 } }, todoData || {});
  const saveTodo = () => save("todo", todo);
  const doneToday = () => (todo.stats.date === todayKey() ? todo.stats.done : 0);

  function renderTodo() {
    const list = $("todo-list");
    list.innerHTML = "";
    const items = [...todo.items.filter((i) => !i.done), ...todo.items.filter((i) => i.done)];
    if (!items.length) list.innerHTML = '<li class="empty">No tasks yet.</li>';
    for (const item of items) {
      const li = document.createElement("li");
      li.className = item.done ? "done" : "";
      li.innerHTML = `<button class="check" title="Done"></button><span class="txt"></span>
        <button class="icon-btn" data-act="focus" title="Focus on this">${ICON.focus}</button>
        <button class="icon-btn" data-act="del" title="Delete">${ICON.x}</button>`;
      li.querySelector(".txt").textContent = item.text;
      li.querySelector(".check").onclick = () => toggleTodo(item);
      li.querySelector('[data-act="del"]').onclick = () => { todo.items = todo.items.filter((i) => i !== item); saveTodo(); renderTodo(); };
      const focusBtn = li.querySelector('[data-act="focus"]');
      focusBtn.hidden = item.done || !S.modules.timer.enabled;
      focusBtn.onclick = () => focusOnTask(item.text);
      li.querySelector(".txt").ondblclick = () => editTodo(li, item);
      list.appendChild(li);
    }
    const open = todo.items.filter((i) => !i.done).length;
    $("todo-stats").textContent = `${open} open · ${doneToday()} done today`;
  }

  function toggleTodo(item) {
    if (todo.stats.date !== todayKey()) todo.stats = { date: todayKey(), done: 0 };
    item.done = !item.done;
    if (item.done) { item.doneAt = Date.now(); todo.stats.done++; }
    else if (item.doneAt && todayKey(new Date(item.doneAt)) === todayKey()) todo.stats.done = Math.max(0, todo.stats.done - 1);
    saveTodo();
    renderTodo();
  }

  function editTodo(li, item) {
    const input = document.createElement("input");
    input.className = "todo-edit";
    input.value = item.text;
    li.querySelector(".txt").replaceWith(input);
    input.focus();
    input.select();
    const finish = (keep) => {
      if (keep && input.value.trim()) item.text = input.value.trim();
      saveTodo();
      renderTodo();
    };
    input.onkeydown = (e) => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); };
    input.onblur = () => finish(true);
  }

  $("todo-form").onsubmit = (e) => {
    e.preventDefault();
    const text = $("todo-input").value.trim();
    if (!text) return;
    todo.items.push({ id: Date.now(), text, done: false });
    $("todo-input").value = "";
    saveTodo();
    renderTodo();
  };
  $("todo-clear").onclick = () => { todo.items = todo.items.filter((i) => !i.done); saveTodo(); renderTodo(); };
  $("todo-popout").onclick = () => api.invoke("open_todo_widget");

  function focusOnTask(text) {
    if (!S.modules.timer.enabled) return;
    T.task = text;
    if (!T.running) { T.mode = "focus"; T.remaining = modeSec("focus"); timerStart(); }
    saveTimer();
    renderTimer();
    expand("timer");
  }

  // The floating widget edits the same list; pick up its changes and its focus requests.
  api.listen("data-changed", ({ name, value, from }) => {
    if (name !== "todo" || from === "notch" || !value) return;
    todo = Object.assign({ items: [], stats: { date: todayKey(), done: 0 } }, value);
    renderTodo();
  });
  api.listen("focus-task", (text) => focusOnTask(text));

  // ---------- File shelf ----------
  let shelf = Array.isArray(shelfData) ? shelfData : [];
  const thumbCache = new Map();
  const saveShelf = () => save("shelf", shelf);

  const isLink = (p) => /^https?:\/\//i.test(p);
  function linkInfo(url) {
    let name = url;
    try {
      const u = new URL(url);
      name = u.hostname.replace(/^www\./, "") + (u.pathname.length > 1 ? decodeURIComponent(u.pathname) : "");
    } catch {}
    return { path: url, name, ext: "link", exists: true, isDir: false, link: true };
  }
  function forgetShelfItem(p) {
    if (!isLink(p)) api.invoke("forget_shelf_item", { path: p });
  }

  async function refreshShelf() {
    const files = shelf.filter((p) => !isLink(p));
    const fileInfos = files.length ? await api.invoke("file_info", { paths: files }) : [];
    const byPath = new Map(fileInfos.map((f) => [f.path, f]));
    // Newest first, like a stack of things you just put down.
    const infos = shelf.map((p) => (isLink(p) ? linkInfo(p) : byPath.get(p))).filter(Boolean).reverse();

    // Fetch previews for anything new; failures are cached as null so they aren't retried.
    const need = infos.filter((f) => !f.link && f.exists && !thumbCache.has(f.path)).map((f) => f.path);
    if (need.length) {
      const res = (await api.invoke("shelf_thumbnails", { paths: need }).catch(() => [])) || [];
      for (const p of need) thumbCache.set(p, null);
      for (const r of res) if (r.src) thumbCache.set(r.path, r);
    }

    const grid = $("shelf-grid");
    const scroll = grid.scrollLeft;
    grid.innerHTML = "";
    $("shelf-empty").hidden = infos.length > 0;
    for (const f of infos) {
      const el = document.createElement("div");
      el.className = "tile" + (f.exists ? "" : " missing");
      el.title = f.exists ? f.path : f.path + " (not found)";
      el.innerHTML = `<div class="thumb"></div><div class="tname"></div><div class="tsize"></div>
        <div class="acts"><button data-act="convert" title="Convert image">${ICON.convert}</button>
        <button data-act="reveal" title="Show in folder">${ICON.folder}</button>
        <button data-act="remove" title="Remove from shelf">${ICON.x}</button></div>`;
      const convertBtn = el.querySelector('[data-act="convert"]');
      convertBtn.hidden = !(S.modules.shelf.converter && f.exists && isImage(f.path));
      convertBtn.onclick = () => openConverter([f.path], false);
      const thumb = el.querySelector(".thumb");
      const t = thumbCache.get(f.path);
      if (f.link) thumb.innerHTML = ICON.link;
      else if (t) {
        const img = document.createElement("img");
        img.src = t.src;
        img.alt = "";
        img.draggable = false;
        img.className = t.kind === "thumb" ? "cover" : "icon";
        thumb.appendChild(img);
      } else {
        const badge = document.createElement("div");
        badge.className = "ext";
        badge.textContent = f.isDir ? "DIR" : (f.ext || "FILE").slice(0, 4);
        thumb.appendChild(badge);
      }
      el.querySelector(".tname").textContent = f.name;
      el.querySelector(".tsize").textContent = f.link ? "Link" : !f.exists ? "Not found" : f.isDir ? "Folder" : formatSize(f.size);
      el.onclick = (e) => { if (!e.target.closest("button") && f.exists) api.invoke("open_path", { path: f.path }); };
      const reveal = el.querySelector('[data-act="reveal"]');
      reveal.hidden = !!f.link || !f.exists;
      reveal.onclick = () => api.invoke("reveal_path", { path: f.path });
      el.querySelector('[data-act="remove"]').onclick = () => {
        shelf = shelf.filter((p) => p !== f.path);
        thumbCache.delete(f.path);
        forgetShelfItem(f.path);
        saveShelf();
        refreshShelf();
      };
      grid.appendChild(el);
    }
    grid.scrollLeft = scroll;
    const total = infos.reduce((n, f) => n + (f.link || f.isDir ? 0 : f.size || 0), 0);
    $("shelf-stats").textContent = shelf.length
      ? `${shelf.length} item${shelf.length === 1 ? "" : "s"}${total ? " · " + formatSize(total) : ""}`
      : "";
    $("shelf-clear").hidden = !shelf.length;
    updateShelfNav();
  }

  function formatSize(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${i ? bytes.toFixed(bytes < 10 ? 1 : 0) : bytes} ${units[i]}`;
  }

  function updateShelfNav() {
    const g = $("shelf-grid");
    const overflow = g.scrollWidth > g.clientWidth + 2;
    $("shelf-prev").hidden = !overflow || g.scrollLeft <= 2;
    $("shelf-next").hidden = !overflow || g.scrollLeft + g.clientWidth >= g.scrollWidth - 2;
  }

  $("shelf-prev").innerHTML = ICON.chevLeft;
  $("shelf-next").innerHTML = ICON.chevRight;
  $("shelf-prev").onclick = () => { $("shelf-grid").scrollLeft -= 318; };
  $("shelf-next").onclick = () => { $("shelf-grid").scrollLeft += 318; };
  $("shelf-grid").addEventListener("scroll", updateShelfNav);
  $("shelf-grid").addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.currentTarget.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
  document.querySelectorAll(".drop-icon").forEach((d) => (d.innerHTML = ICON.tray));

  $("shelf-clear").onclick = () => { shelf.forEach(forgetShelfItem); shelf = []; saveShelf(); refreshShelf(); };

  // Dragging anything onto the notch opens the shelf; dropping adds it (handled natively in dragdrop.rs).
  // Images get a split drop area: "Add to shelf" on the left, "Convert image" on the right.
  let dragImage = false;
  const IMAGE_EXT = /\.(png|jpe?g|jfif|webp|gif|bmp|tiff?|ico)$/i;
  const isImage = (p) => IMAGE_EXT.test(p);
  const zoneAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el && el.closest(".zone");
  };
  function endDrag() {
    dragging = false;
    document.body.classList.remove("dragging", "drag-image");
    document.querySelectorAll(".zone").forEach((z) => z.classList.remove("hot"));
  }

  api.listen("shelf-drag", (p) => {
    if (!S.modules.shelf.enabled) return;
    if (p.kind === "enter") {
      dragging = true;
      dragImage = !!p.image && S.modules.shelf.converter;
      document.body.classList.add("dragging");
      document.body.classList.toggle("drag-image", dragImage);
      $("zone-add-text").textContent = dragImage ? "Add to shelf" : "Release to add";
      $("converter").hidden = true;
      revealed = true;
      expand("shelf");
    } else if (p.kind === "over") {
      const zone = dragImage ? zoneAt(p.x, p.y) : null;
      document.querySelectorAll(".zone").forEach((z) => z.classList.toggle("hot", z === zone));
    } else {
      endDrag();
      if (!hovering) scheduleCollapse();
    }
  });
  api.listen("shelf-drop", ({ items, x, y }) => {
    const toConverter = dragImage && zoneAt(x, y) === $("zone-convert");
    endDrag();
    expand("shelf");
    if (toConverter && items && items.length) {
      openConverter(items, true);
    } else {
      for (const item of items || []) if (!shelf.includes(item)) shelf.push(item);
      saveShelf();
      refreshShelf();
    }
    if (!hovering) scheduleCollapse();
  });

  // ---------- Image converter ----------
  let convPaths = [], convDropped = false, convFormat = "webp";
  const fileName = (p) => p.split(/[\\/]/).pop();

  function openConverter(paths, dropped) {
    convPaths = paths.filter(isImage);
    convDropped = dropped;
    if (!convPaths.length) return;
    convFormat = S.modules.shelf.convertFormat;
    $("conv-q").value = S.modules.shelf.convertQuality;
    $("conv-title").textContent = convPaths.length === 1 ? "Convert image" : `Convert ${convPaths.length} images`;
    $("conv-sub").textContent = convPaths.length === 1 ? fileName(convPaths[0]) : convPaths.map(fileName).join(", ");
    $("conv-status").textContent = "";
    renderConverter();
    $("converter").hidden = false;
    pinned = true; // keep the notch open while choosing
  }

  function closeConverter() {
    $("converter").hidden = true;
    pinned = $("pin-btn").classList.contains("on");
    if (!hovering) scheduleCollapse();
  }

  function renderConverter() {
    document.querySelectorAll("#conv-formats button").forEach((b) => b.classList.toggle("active", b.dataset.fmt === convFormat));
    $("conv-quality").style.visibility = convFormat === "png" ? "hidden" : "visible";
    const q = Number($("conv-q").value);
    $("conv-qv").textContent = q >= 100 && convFormat === "webp" ? "Lossless" : q;
  }

  document.querySelectorAll("#conv-formats button").forEach((b) => (b.onclick = () => { convFormat = b.dataset.fmt; renderConverter(); }));
  $("conv-q").oninput = renderConverter;
  $("conv-cancel").onclick = () => {
    if (convDropped) convPaths.forEach(forgetShelfItem); // browser images were only saved for converting
    closeConverter();
  };
  $("conv-go").onclick = async () => {
    const quality = Number($("conv-q").value);
    $("conv-go").disabled = true;
    $("conv-status").textContent = "Converting…";
    const made = [], failed = [];
    for (const path of convPaths) {
      try {
        made.push(await api.invoke("convert_image", { path, format: convFormat, quality }));
      } catch (e) {
        failed.push(String(e));
      }
    }
    $("conv-go").disabled = false;
    for (const p of made) if (!shelf.includes(p)) shelf.push(p);
    if (convDropped) convPaths.forEach(forgetShelfItem);
    saveShelf();
    refreshShelf();
    if (failed.length) {
      $("conv-status").textContent = failed[0];
      return;
    }
    $("conv-status").textContent = made.length === 1 ? `Saved ${fileName(made[0])}` : `Saved ${made.length} images`;
    setTimeout(closeConverter, 1100);
  };
  document.querySelectorAll(".convert-icon").forEach((d) => (d.innerHTML = ICON.convert));

  // ---------- Clipboard history ----------
  let clips = Array.isArray(clipData && clipData.items) ? clipData.items : [];
  const saveClips = () => save("clipboard", { items: clips });

  function dropClip(c) {
    if (c.kind === "image" && c.path) api.invoke("clip_delete_file", { path: c.path });
  }

  api.listen("clip", (c) => {
    if (!S.modules.clipboard.enabled) return;
    if (c.kind === "text") {
      const old = clips.find((x) => x.kind === "text" && x.text === c.text);
      if (old) clips = clips.filter((x) => x !== old);
    }
    clips.unshift({ id: Date.now() + Math.random(), kind: c.kind, text: c.text, path: c.path, w: c.w, h: c.h, at: Date.now() });
    while (clips.length > S.modules.clipboard.maxItems) dropClip(clips.pop());
    saveClips();
    if (mode === "expanded" && activeTab === "clipboard") renderClips();
  });

  function timeAgo(t) {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  }

  async function renderClips() {
    const q = $("clip-search").value.trim().toLowerCase();
    const list = $("clip-list");
    const shown = clips.filter((c) => !q || (c.kind === "text" && c.text.toLowerCase().includes(q)));
    // Image previews come from the same thumbnail cache as the shelf.
    const need = shown.filter((c) => c.kind === "image" && !thumbCache.has(c.path)).map((c) => c.path);
    if (need.length) {
      const res = (await api.invoke("shelf_thumbnails", { paths: need }).catch(() => [])) || [];
      for (const p of need) thumbCache.set(p, null);
      for (const r of res) if (r.src) thumbCache.set(r.path, r);
    }
    list.innerHTML = "";
    if (!shown.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = clips.length ? "Nothing matches your search." : "Copy something and it shows up here.";
      list.appendChild(li);
    }
    for (const c of shown) {
      const li = document.createElement("li");
      li.title = "Click to copy";
      if (c.kind === "image") {
        const img = document.createElement("img");
        img.className = "clip-img";
        img.alt = "";
        const t = thumbCache.get(c.path);
        if (t) img.src = t.src;
        const label = document.createElement("span");
        label.className = "clip-text";
        label.textContent = `Image · ${c.w}×${c.h}`;
        li.append(img, label);
      } else {
        const text = document.createElement("span");
        text.className = "clip-text";
        text.textContent = c.text;
        li.appendChild(text);
      }
      const meta = document.createElement("span");
      meta.className = "clip-meta";
      meta.textContent = timeAgo(c.at);
      const del = document.createElement("button");
      del.className = "icon-btn";
      del.title = "Remove";
      del.innerHTML = ICON.x;
      del.onclick = (e) => {
        e.stopPropagation();
        clips = clips.filter((x) => x !== c);
        dropClip(c);
        saveClips();
        renderClips();
      };
      li.append(meta, del);
      li.onclick = async () => {
        try {
          await api.invoke(c.kind === "image" ? "clip_copy_image" : "clip_copy_text", c.kind === "image" ? { path: c.path } : { text: c.text });
          clips = [c, ...clips.filter((x) => x !== c)];
          c.at = Date.now();
          saveClips();
          li.classList.add("copied");
          meta.textContent = "Copied";
          setTimeout(renderClips, 700);
        } catch {}
      };
      list.appendChild(li);
    }
    $("clip-stats").textContent = clips.length ? `${clips.length} item${clips.length === 1 ? "" : "s"} · stays on this PC` : "";
    $("clip-clear").hidden = !clips.length;
  }

  $("clip-search").oninput = renderClips;
  $("clip-clear").onclick = () => { clips.forEach(dropClip); clips = []; saveClips(); renderClips(); };

  // ---------- Quick actions ----------
  let micMuted = false;
  const ACTIONS = [
    { id: "screenshot", label: "Screenshot", icon: "camera", run: () => { collapse(); setTimeout(() => api.invoke("quick_action", { name: "screenshot" }), 350); } },
    { id: "mic", label: "Microphone", icon: () => (micMuted ? "micOff" : "mic"), state: () => (micMuted ? "Muted" : "On"), on: () => micMuted, run: toggleMic },
    { id: "picker", label: "Color picker", icon: "picker", run: () => { collapse(); setTimeout(() => api.invoke("open_color_picker"), 300); } },
    {
      id: "quiet", label: "Quiet mode", icon: "moon", state: () => (S.general.quiet ? "On" : "Off"), on: () => S.general.quiet,
      run: toggleQuiet, extra: { icon: "settings", title: "Windows notification settings", run: () => api.invoke("quick_action", { name: "notification-settings" }) },
    },
    { id: "lock", label: "Lock PC", icon: "lock", run: () => api.invoke("quick_action", { name: "lock" }) },
  ];

  async function toggleMic() {
    micMuted = !micMuted;
    await api.invoke("set_volume", { mic: true, muted: micMuted }).catch(() => {});
    renderActions();
    showPopup({ icon: micMuted ? "micOff" : "mic", title: micMuted ? "Microphone muted" : "Microphone on", important: true });
  }

  function toggleQuiet() {
    S.general.quiet = !S.general.quiet;
    api.invoke("save_settings", { settings: S });
    renderActions();
  }

  async function renderActions() {
    const mic = await api.invoke("get_volume", { mic: true }).catch(() => null);
    if (mic) micMuted = mic.muted;
    const grid = $("actions-grid");
    grid.innerHTML = "";
    for (const a of ACTIONS) {
      const b = document.createElement("button");
      b.className = "action" + (a.on && a.on() ? " on" : "");
      const icon = typeof a.icon === "function" ? a.icon() : a.icon;
      b.innerHTML = `<span class="a-icon">${ICON[icon]}</span><span class="a-label"></span>${a.state ? '<span class="a-state"></span>' : ""}`;
      b.querySelector(".a-label").textContent = a.label;
      if (a.state) b.querySelector(".a-state").textContent = a.state();
      b.onclick = (e) => { if (!e.target.closest(".a-extra")) a.run(); };
      if (a.extra) {
        const x = document.createElement("span");
        x.className = "a-extra";
        x.title = a.extra.title;
        x.innerHTML = ICON[a.extra.icon];
        x.onclick = (e) => { e.stopPropagation(); a.extra.run(); };
        b.appendChild(x);
      }
      grid.appendChild(b);
    }
  }

  // ---------- Weather (Open-Meteo, no account needed) ----------
  let weather = null;
  const geoCache = new Map();

  function weatherIcon(code, isDay = 1) {
    if (code === 0) return isDay ? "☀️" : "🌙";
    if (code <= 2) return isDay ? "🌤️" : "☁️";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 57) return "🌦️";
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "❄️";
    if (code >= 95) return "⛈️";
    return "🌡️";
  }

  async function loadWeather() {
    const c = S.modules.weather;
    const city = c.city.trim();
    if (!c.enabled || !city) { weather = null; renderInfo(); return; }
    try {
      let geo = geoCache.get(city.toLowerCase());
      if (!geo) {
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`).then((r) => r.json());
        geo = g.results && g.results[0];
        if (!geo) { weather = { error: `Couldn't find "${city}"` }; renderInfo(); return; }
        geoCache.set(city.toLowerCase(), geo);
      }
      const unit = c.unit === "f" ? "&temperature_unit=fahrenheit" : "";
      const f = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}` +
          `&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4${unit}`
      ).then((r) => r.json());
      weather = {
        temp: Math.round(f.current.temperature_2m),
        code: f.current.weather_code,
        isDay: f.current.is_day,
        place: geo.name,
        daily: f.daily.time.map((d, i) => ({ d, max: Math.round(f.daily.temperature_2m_max[i]), min: Math.round(f.daily.temperature_2m_min[i]), code: f.daily.weather_code[i] })),
      };
    } catch {
      // Offline or the service is down: keep showing the last reading.
    }
    renderInfo();
  }

  // ---------- Calendar: next meeting from a private .ics link ----------
  let events = [], calError = "";
  const notified = new Set();

  function unfoldIcs(text) {
    return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  }

  // Wall-clock time in an IANA zone -> Date. Unknown zones (e.g. Windows names) are treated as local time.
  function zonedDate(y, mo, d, h, mi, s, tz) {
    if (!tz) return new Date(y, mo - 1, d, h, mi, s);
    try {
      const guess = Date.UTC(y, mo - 1, d, h, mi, s);
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
          .formatToParts(new Date(guess))
          .map((p) => [p.type, p.value])
      );
      const asZone = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
      return new Date(guess - (asZone - guess));
    } catch {
      return new Date(y, mo - 1, d, h, mi, s);
    }
  }

  // "DTSTART;TZID=Europe/Paris:20261027T103000" -> { date, allDay }
  function icsDate(params, value) {
    const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
    if (!m) return null;
    const [, y, mo, d, h, mi, s, z] = m;
    if (!h) return { date: new Date(+y, +mo - 1, +d), allDay: true };
    if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)), allDay: false };
    const tz = (params.match(/TZID=([^;:]+)/) || [])[1];
    return { date: zonedDate(+y, +mo, +d, +h, +mi, +s, tz), allDay: false };
  }

  function parseIcs(text) {
    const out = [];
    let ev = null;
    for (const line of unfoldIcs(text)) {
      if (line === "BEGIN:VEVENT") { ev = { exdates: [] }; continue; }
      if (line === "END:VEVENT") { if (ev && ev.start) out.push(ev); ev = null; continue; }
      if (!ev) continue;
      const i = line.indexOf(":");
      if (i < 0) continue;
      const head = line.slice(0, i), value = line.slice(i + 1);
      const [name, ...rest] = head.split(";");
      const params = rest.join(";");
      if (name === "DTSTART") Object.assign(ev, (({ date, allDay }) => ({ start: date, allDay }))(icsDate(params, value) || {}));
      else if (name === "DTEND") ev.end = (icsDate(params, value) || {}).date;
      else if (name === "SUMMARY") ev.title = value.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, " ");
      else if (name === "RRULE") ev.rrule = Object.fromEntries(value.split(";").map((p) => p.split("=")));
      else if (name === "EXDATE") value.split(",").forEach((v) => { const d = icsDate(params, v); if (d) ev.exdates.push(d.date.getTime()); });
      else if (name === "RECURRENCE-ID") ev.recurrenceId = (icsDate(params, value) || {}).date;
      else if (name === "UID") ev.uid = value;
      else if (name === "STATUS") ev.cancelled = value === "CANCELLED";
      else if (name === "LOCATION" || name === "DESCRIPTION" || name === "URL") {
        const link = value.match(/https?:\/\/[^\s\\",<>]+/);
        if (link && !ev.link) ev.link = link[0];
      }
    }
    return out;
  }

  const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  // Expands an event (and simple DAILY/WEEKLY/MONTHLY repeats) into occurrences in [from, to].
  function occurrences(ev, from, to) {
    const dur = (ev.end ? ev.end - ev.start : 30 * 60000) || 30 * 60000;
    const r = ev.rrule;
    const list = [];
    const push = (start) => {
      if (ev.exdates.some((x) => Math.abs(x - start.getTime()) < 60000)) return;
      const end = new Date(start.getTime() + dur);
      if (end >= from && start <= to) list.push({ start, end, title: ev.title || "Event", link: ev.link, uid: ev.uid });
    };
    if (!r) { push(ev.start); return list; }
    const interval = Math.max(1, parseInt(r.INTERVAL || "1", 10));
    const until = r.UNTIL ? (icsDate("", r.UNTIL) || {}).date : null;
    const count = r.COUNT ? parseInt(r.COUNT, 10) : Infinity;
    const byDay = r.BYDAY ? r.BYDAY.split(",").map((d) => DAYS.indexOf(d.slice(-2))) : null;
    let n = 0;
    for (let step = 0; step < 5000 && n < count; step++) {
      const base = new Date(ev.start);
      if (r.FREQ === "DAILY") base.setDate(base.getDate() + step * interval);
      else if (r.FREQ === "WEEKLY") base.setDate(base.getDate() + step * 7 * interval);
      else if (r.FREQ === "MONTHLY") base.setMonth(base.getMonth() + step * interval);
      else if (r.FREQ === "YEARLY") base.setFullYear(base.getFullYear() + step * interval);
      else break;
      if (base > to || (until && base > until)) break;
      if (r.FREQ === "WEEKLY" && byDay) {
        const weekStart = new Date(base);
        weekStart.setDate(base.getDate() - base.getDay());
        for (let wd = 0; wd < 7 && n < count; wd++) {
          if (!byDay.includes(wd)) continue;
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + wd);
          if (day < ev.start || (until && day > until) || day > to) continue;
          n++;
          push(day);
        }
      } else {
        n++;
        push(base);
      }
    }
    return list;
  }

  async function loadCalendar() {
    const c = S.modules.calendar;
    if (!c.enabled || !c.icsUrl.trim()) { events = []; calError = ""; renderInfo(); return; }
    try {
      const all = parseIcs(await api.invoke("fetch_text", { url: c.icsUrl }));
      const from = new Date(Date.now() - 12 * 3600000), to = new Date(Date.now() + 2 * 86400000);
      // Moved/edited single occurrences replace their slot in the repeating series.
      const moved = new Set(all.filter((e) => e.recurrenceId).map((e) => `${e.uid}@${e.recurrenceId.getTime()}`));
      events = all
        .filter((e) => !e.allDay && !e.cancelled)
        .flatMap((e) => occurrences(e, from, to).filter((o) => e.recurrenceId || !moved.has(`${e.uid}@${o.start.getTime()}`)))
        .sort((a, b) => a.start - b.start);
      calError = "";
    } catch (e) {
      calError = "Couldn't load your calendar";
    }
    renderInfo();
  }

  function nextEvent() {
    const now = Date.now();
    return events.find((e) => e.end > now) || null;
  }

  function meetingCountdown() {
    const c = S.modules.calendar;
    const e = c.enabled && nextEvent();
    if (!e) return "";
    const mins = Math.ceil((e.start - Date.now()) / 60000);
    if (mins > c.remindMin) return "";
    return mins <= 0 ? `${e.title} · now` : `${e.title} in ${mins} min`;
  }

  function checkMeetings() {
    const c = S.modules.calendar;
    if (!c.enabled) return;
    const now = Date.now();
    for (const e of events) {
      const key = `${e.uid}@${e.start.getTime()}`;
      const mins = (e.start - now) / 60000;
      const join = e.link ? [{ label: "Join", primary: true, run: () => api.invoke("open_path", { path: e.link }) }] : [];
      if (mins <= c.remindMin && mins > c.remindMin - 1 && !notified.has(key + "soon")) {
        notified.add(key + "soon");
        showPopup({ icon: "calendar", title: e.title, sub: `Starts in ${Math.round(mins)} min · ${formatTime(e.start, { ...S.clock, seconds: false })}`, actions: join, important: true, ms: 8000 });
      }
      if (c.popupAtStart && mins <= 0 && mins > -1 && !notified.has(key + "start")) {
        notified.add(key + "start");
        showPopup({ icon: "calendar", title: `${e.title} is starting`, sub: formatTime(e.start, { ...S.clock, seconds: false }), actions: join, important: true, ms: 10000 });
      }
    }
  }

  // The small line under the date: weather, then the next meeting.
  function renderInfo() {
    const el = $("hdr-info");
    if (!el) return;
    const parts = [];
    if (S.modules.weather.enabled && weather) {
      if (weather.error) parts.push(weather.error);
      else parts.push(`${weatherIcon(weather.code, weather.isDay)} ${weather.temp}° ${weather.place}`);
    }
    if (S.modules.calendar.enabled) {
      const e = nextEvent();
      if (calError) parts.push(calError);
      else if (e) {
        const today = new Date().toDateString() === e.start.toDateString();
        const when = e.start <= Date.now() ? "now" : (today ? "" : "tomorrow ") + formatTime(e.start, { ...S.clock, seconds: false });
        parts.push(`<span class="${countdownSoon(e) ? "soon" : ""}">📅 ${escapeHtml(e.title)} · ${when}</span>`);
      }
    }
    el.innerHTML = parts.map((p) => (p.startsWith("<span") ? p : escapeHtml(p))).join(" · ");
    el.title = weather && weather.daily
      ? weather.daily.map((d) => `${new Date(d.d + "T12:00").toLocaleDateString("en-US", { weekday: "short" })} ${weatherIcon(d.code)} ${d.max}° / ${d.min}°`).join("\n")
      : "";
  }

  const countdownSoon = (e) => (e.start - Date.now()) / 60000 <= S.modules.calendar.remindMin;
  const escapeHtml = (s) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

  // ---------- Water reminder (off by default) ----------
  let W = Object.assign({ date: todayKey(), ml: 0, lastAt: Date.now(), snoozeUntil: 0 }, waterData || {});
  const saveWater = () => save("water", W);

  function waterDay() { if (W.date !== todayKey()) { Object.assign(W, { date: todayKey(), ml: 0, lastAt: Date.now() }); saveWater(); } }
  function drink(ml) { waterDay(); W.ml += ml; W.lastAt = Date.now(); W.snoozeUntil = 0; saveWater(); renderWater(); }

  function renderWater() {
    const c = S.modules.water;
    const liters = (n) => (n / 1000).toFixed(n % 1000 ? 2 : 1).replace(/0$/, "") + " L";
    $("w-fill").style.height = Math.min(100, (W.ml / c.goalMl) * 100) + "%";
    $("w-amount").textContent = `${liters(W.ml)} / ${liters(c.goalMl)}`;
    const left = Math.max(0, c.goalMl - W.ml);
    $("w-sub").textContent = left ? `${Math.ceil(left / c.bottleMl)} more bottle${Math.ceil(left / c.bottleMl) === 1 ? "" : "s"} to reach your goal` : "Goal reached today!";
    $("w-bottle").textContent = `+ Bottle (${c.bottleMl} ml)`;
    const nextAt = Math.max(W.lastAt + c.intervalMin * 60000, W.snoozeUntil);
    $("w-next").textContent = `Next reminder around ${formatTime(new Date(nextAt), { ...S.clock, seconds: false })} (between ${c.startHour}:00 and ${c.endHour}:00)`;
  }

  function checkWater() {
    const c = S.modules.water;
    if (!c.enabled) return;
    waterDay();
    const now = Date.now(), hour = new Date().getHours();
    if (hour < c.startHour || hour >= c.endHour || W.ml >= c.goalMl || now < W.snoozeUntil) return;
    if (now - W.lastAt < c.intervalMin * 60000) return;
    W.lastAt = now;
    saveWater();
    showPopup({
      icon: "water",
      title: "Time to drink water",
      sub: `${(W.ml / 1000).toFixed(1)} of ${(c.goalMl / 1000).toFixed(1)} L today`,
      actions: [{ label: "Drank", primary: true, run: () => drink(c.bottleMl) }, { label: "Snooze 10 min", run: () => { W.snoozeUntil = Date.now() + 600000; saveWater(); } }],
      ms: 20000,
    });
  }

  $("w-bottle").onclick = () => drink(S.modules.water.bottleMl);
  $("w-glass").onclick = () => drink(250);
  $("w-reset").onclick = () => { W.ml = 0; saveWater(); renderWater(); };

  // ---------- Mascot idle animations ----------
  const mascotEl = $("mascot"), handEl = mascotEl.querySelector(".hand");
  let lastActive = Date.now(), mascotBusy = false, faceTimer;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const mascotVisible = () => S.mascot.enabled && mode === "collapsed" && !mascotEl.hidden && !tucked();

  function face(f, ms) {
    clearTimeout(faceTimer);
    mascotEl.dataset.face = f;
    if (ms) faceTimer = setTimeout(() => (mascotEl.dataset.face = "normal"), ms);
  }
  function look(x, y = 0) {
    mascotEl.style.setProperty("--look-x", x + "px");
    mascotEl.style.setProperty("--look-y", y + "px");
  }
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  function wave() { replay(handEl, "waving"); }
  function greet() {
    if (!S.mascot.wave || !mascotVisible() || mascotEl.dataset.face === "sleep") return;
    face("happy", 1700);
    wave();
  }
  function mascotWake() {
    lastActive = Date.now();
    if (mascotEl.dataset.face === "sleep") face("surprised", 800);
  }

  // [weight, animation]
  const MASCOT_ACTIONS = [
    [3, async () => { look(-3); await wait(900); look(3); await wait(900); look(0); }],
    [2, async () => { look(Math.random() < 0.5 ? -3 : 3, -1); await wait(1300); look(0); }],
    [2, async () => { replay(mascotEl, "blink"); await wait(280); replay(mascotEl, "blink"); }],
    [1.5, async () => { face("happy", 1800); if (S.mascot.wave) wave(); }],
    [1.2, async () => { replay(mascotEl, "bounce"); }],
    [1, async () => { face("wink", 650); }],
    [0.8, async () => { replay(mascotEl, "wiggle"); }],
    [0.6, async () => { face("surprised", 900); look(0, -1); await wait(900); look(0); }],
  ];
  const LIVELINESS = { calm: 9000, normal: 5000, playful: 2400 };

  function pickAction() {
    let r = Math.random() * MASCOT_ACTIONS.reduce((n, [w]) => n + w, 0);
    for (const [w, run] of MASCOT_ACTIONS) if ((r -= w) <= 0) return run;
    return MASCOT_ACTIONS[0][1];
  }

  async function mascotTick() {
    const c = S.mascot;
    setTimeout(mascotTick, (LIVELINESS[c.liveliness] || 5000) * (0.6 + Math.random() * 0.8));
    if (!c.enabled || !c.idle || mascotBusy || mascotEl.dataset.face === "sleep") return;
    if (c.sleep && Date.now() - lastActive > c.sleepAfterMin * 60000) {
      look(0);
      face("sleep");
      return;
    }
    if (!mascotVisible()) return;
    mascotBusy = true;
    try { await pickAction()(); } finally { mascotBusy = false; }
  }

  // ---------- Settings ----------
  function applySettings() {
    applyAppearance(S.appearance);
    document.documentElement.style.setProperty("--mascot", S.mascot.color);
    document.body.classList.toggle("minimal", S.general.minimal);
    renderTabs();
    if (!T.running && T.remaining > modeSec(T.mode)) T.remaining = modeSec(T.mode);
    renderClock();
    renderPill();
    renderMedia();
    renderTimer();
    renderTodo();
    renderWater();
    renderSource();
    if (S.modules.lyrics.enabled) loadLyrics();
    if (mode === "expanded" && !enabledTabs().length) collapse();
    applySize();
  }

  let prevTimerCfg = JSON.stringify(S.modules.timer);
  let prevWeatherCfg = JSON.stringify(S.modules.weather), prevCalendarCfg = JSON.stringify(S.modules.calendar);
  api.listen("settings-changed", (v) => {
    S = mergeDeep(DEFAULTS, v);
    const cfg = JSON.stringify(S.modules.timer);
    if (cfg !== prevTimerCfg && !T.running) T.remaining = modeSec(T.mode);
    prevTimerCfg = cfg;
    const w = JSON.stringify(S.modules.weather), c = JSON.stringify(S.modules.calendar);
    if (w !== prevWeatherCfg) { prevWeatherCfg = w; loadWeather(); }
    if (c !== prevCalendarCfg) { prevCalendarCfg = c; loadCalendar(); }
    applySettings();
    if (mode === "expanded" && activeTab === "actions") renderActions();
  });

  // ---------- Updates ----------
  let offeredVersion = null;
  async function checkForUpdate() {
    if (!api.real || !S.general.autoUpdate) return;
    try {
      const u = await api.invoke("check_update");
      if (!u || u.version === offeredVersion) return;
      offeredVersion = u.version;
      showPopup({
        icon: "download",
        title: `Enzi ${u.version} is available`,
        sub: "Install it now? Enzi restarts when it's done.",
        actions: [
          { label: "Install", primary: true, run: () => api.invoke("install_update").catch((e) => showPopup({ icon: "download", title: "Update failed", sub: String(e) })) },
          { label: "Later", run: () => {} },
        ],
        ms: 20000,
      });
    } catch {}
  }
  setTimeout(checkForUpdate, 20000);
  setInterval(checkForUpdate, 6 * 3600 * 1000);

  // ---------- Main loop ----------
  setInterval(() => {
    renderClock();
    if (T.running && timerLeft() <= 0) timerFinish(true);
    renderPill();
    if (mode === "expanded" && activeTab === "media") renderProgress();
    if (mode === "expanded" && activeTab === "timer") renderTimer();
  }, 250);
  setInterval(checkWater, 30000);
  setInterval(checkMeetings, 15000);
  setInterval(loadWeather, 20 * 60000);
  setInterval(loadCalendar, 10 * 60000);
  loadWeather();
  loadCalendar();

  // ---------- Browser preview (no Tauri) ----------
  if (!api.real) {
    document.body.classList.add("preview");
    island.addEventListener("mouseenter", () => onHover(true));
    island.addEventListener("mouseleave", () => onHover(false));
    let pos = 12;
    const sessions = [{ id: "Spotify.exe", name: "Spotify" }, { id: "Chrome", name: "Chrome" }];
    setInterval(() => api.emit("media", { title: "Preview Song", artist: "Preview Artist", album: "Demo", playing: true, position: (pos += 0.5), duration: 214, source: "Spotify.exe", sessions }), 500);
    setTimeout(() => api.emit("media-app", { id: "Spotify.exe", name: "Spotify", icon: null }), 600);
    setTimeout(() => {
      api.emit("clip", { kind: "text", text: "https://github.com/Enzizy/Enzi/releases/latest" });
      api.emit("clip", { kind: "text", text: "Meeting notes: ship the converter, then clipboard history, then weather and the calendar." });
    }, 800);
    window.addEventListener("keydown", (e) => {
      if (document.activeElement.tagName === "INPUT") return;
      if (e.key === "t") return api.emit("auto-hide", !autoHidden);
      if (e.key === "h") return onHover(!hovering);
      const fake = { v: { kind: "volume", level: 0.62, muted: false }, c: { kind: "caps", on: true }, l: { kind: "language", code: "en-US", name: "English (United States)" }, p: { kind: "power", charging: true, percent: 81 }, n: { kind: "network", state: "limited" } }[e.key];
      if (fake) api.emit("indicator", fake);
    });
  }

  applySettings();
  setMode("collapsed");
  setTimeout(greet, 900);
  setTimeout(mascotTick, 3000);
})();
