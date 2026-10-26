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
    chevLeft: svg('<path d="M15 18l-6-6 6-6"/>'),
    chevRight: svg('<path d="M9 18l6-6-6-6"/>'),
  };

  // Load everything up front so the rest of setup runs synchronously, before any event can arrive.
  let S = await loadSettings();
  const [timerData, todoData, shelfData, waterData] = await Promise.all(["timer", "todo", "shelf", "water"].map(load));
  let mode = "collapsed";
  let hovering = false, pinned = false, dragging = false, popupWide = false;
  let activeTab = null, expandTimer, collapseTimer, popupTimer;
  // autoHidden: Rust says a browser is at the top. revealed: the user hovered the top edge to bring it back.
  let autoHidden = false, revealed = false, tuckTimer;
  const tucked = () => autoHidden && mode === "collapsed" && !revealed;

  // ---------- Layout ----------
  const TABS = [["media", "Music"], ["timer", "Focus timer"], ["todo", "To-do"], ["shelf", "File shelf"], ["water", "Water reminder"]];
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
    api.invoke("set_hit_rect", { x: (window.innerWidth - w) / 2 - 4, y: 0, w: w + 8, h: tuck ? 3 : h + 6 });
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
      const typing = document.activeElement && document.activeElement.tagName === "INPUT";
      if (mode === "expanded" && !hovering && !pinned && !dragging && !typing) collapse();
    }, S.general.collapseDelay);
  }

  function onHover(inside) {
    hovering = inside;
    if (inside) {
      mascotWake();
      clearTimeout(collapseTimer);
      clearTimeout(tuckTimer);
      if (autoHidden && !revealed) {
        revealed = true;
        applySize();
      }
      if (mode !== "expanded" && S.general.expandOnHover) {
        clearTimeout(expandTimer);
        // Skip if a drag already opened the shelf, so this doesn't switch it to another tab.
        expandTimer = setTimeout(() => hovering && mode !== "expanded" && expand(dragging ? "shelf" : undefined), S.general.expandDelay);
      }
    } else {
      clearTimeout(expandTimer);
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
  api.listen("auto-hide", (hide) => {
    autoHidden = hide;
    if (!hide) revealed = false;
    applySize();
  });
  api.invoke("get_auto_hidden").then((hide) => {
    autoHidden = !!hide;
    applySize();
  });
  window.addEventListener("blur", () => { if (!hovering && !pinned && mode === "expanded") collapse(); });
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
    if (k === "todo") setTimeout(() => mode === "expanded" && $("todo-input").focus({ preventScroll: true }), 50);
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
  function showPopup({ icon, img, title, sub = "", value = "", bar = null, actions = [], ms }) {
    if (mode === "expanded" && !actions.length) return;
    $("pop-icon").innerHTML = img ? `<img src="${img}" alt="">` : ICON[icon] || "";
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
    }
  });

  // ---------- Clock & pill ----------
  function renderClock() {
    const now = new Date();
    $("hdr-time").textContent = formatTime(now, S.clock);
    $("hdr-date").textContent = S.clock.showDate ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";
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
    }
    $("pill-text").textContent = text;
    const eq = $("pill-eq");
    eq.hidden = !(playing && S.modules.media.showVisualizer);
    eq.classList.toggle("paused", !(media && media.playing));
    const timerOn = S.modules.timer.enabled && T.running;
    $("pill-timer").hidden = !timerOn;
    if (timerOn) $("pill-timer").textContent = formatDuration(timerLeft());
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
    const msg = { idle: "", loading: "Loading lyrics…", none: "Lyrics not available", instrumental: "♪ Instrumental", error: "Couldn't load lyrics" }[lyr.status];
    if (msg !== undefined) {
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
    $("media-box").classList.toggle("no-lyrics", !S.modules.lyrics.enabled);
    if (artUrl && $("art").src !== artUrl) $("art").src = artUrl;
    $("b-play").innerHTML = media.playing ? ICON.pause : ICON.play;
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
      focusBtn.onclick = () => {
        T.task = item.text;
        if (!T.running) { T.mode = "focus"; T.remaining = modeSec("focus"); timerStart(); }
        saveTimer();
        showTab("timer");
        renderTimer();
      };
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
        <div class="acts"><button data-act="reveal" title="Show in folder">${ICON.folder}</button>
        <button data-act="remove" title="Remove from shelf">${ICON.x}</button></div>`;
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
  api.listen("shelf-drag", (kind) => {
    if (!S.modules.shelf.enabled) return;
    if (kind === "enter") {
      dragging = true;
      document.body.classList.add("dragging");
      revealed = true;
      expand("shelf");
    } else {
      dragging = false;
      document.body.classList.remove("dragging");
      if (!hovering) scheduleCollapse();
    }
  });
  api.listen("shelf-drop", ({ items }) => {
    dragging = false;
    document.body.classList.remove("dragging");
    for (const item of items || []) if (!shelf.includes(item)) shelf.push(item);
    saveShelf();
    expand("shelf");
    refreshShelf();
    if (!hovering) scheduleCollapse();
  });

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
    if (S.modules.lyrics.enabled) loadLyrics();
    if (mode === "expanded" && !enabledTabs().length) collapse();
    applySize();
  }

  let prevTimerCfg = JSON.stringify(S.modules.timer);
  api.listen("settings-changed", (v) => {
    S = mergeDeep(DEFAULTS, v);
    const cfg = JSON.stringify(S.modules.timer);
    if (cfg !== prevTimerCfg && !T.running) T.remaining = modeSec(T.mode);
    prevTimerCfg = cfg;
    applySettings();
  });

  // ---------- Main loop ----------
  setInterval(() => {
    renderClock();
    if (T.running && timerLeft() <= 0) timerFinish(true);
    renderPill();
    if (mode === "expanded" && activeTab === "media") renderProgress();
    if (mode === "expanded" && activeTab === "timer") renderTimer();
  }, 250);
  setInterval(checkWater, 30000);

  // ---------- Browser preview (no Tauri) ----------
  if (!api.real) {
    document.body.classList.add("preview");
    island.addEventListener("mouseenter", () => onHover(true));
    island.addEventListener("mouseleave", () => onHover(false));
    let pos = 12;
    setInterval(() => api.emit("media", { title: "Preview Song", artist: "Preview Artist", album: "Demo", playing: true, position: (pos += 0.5), duration: 214, source: "Spotify.exe" }), 500);
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
