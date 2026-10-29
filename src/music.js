// Floating music player. Gets the same now-playing events as the notch, and lays itself out to fit
// whatever size the window is: a strip, a row with art on the left, or a card with art on top.
(async () => {
  const $ = (id) => document.getElementById(id);
  const svg = (d, fill) =>
    `<svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="${fill ? "none" : "currentColor"}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    play: svg('<path d="M7 4.5v15l13-7.5z"/>', true),
    pause: svg('<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>', true),
    next: svg('<path d="M5 4.5v15l10-7.5zM17 4h2.5v16H17z"/>', true),
    prev: svg('<path d="M19 4.5v15L9 12zM4.5 4H7v16H4.5z"/>', true),
    lyrics: svg('<path d="M4 6h16M4 12h10M4 18h13"/>'),
    x: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
  };

  let S = await loadSettings();
  let state = Object.assign({ lyrics: false }, (await api.invoke("load_data", { name: "music_widget" })) || {});
  let media = null, posBase = 0, posAt = 0;
  let lyr = { key: null, status: "idle", lines: [] }, curLine = -2;
  const cache = new Map();

  const wantLyrics = () => state.lyrics && S.modules.lyrics.enabled;
  function livePos() {
    if (!media) return 0;
    const p = posBase + (media.playing ? (performance.now() - posAt) / 1000 : 0);
    return media.duration ? Math.min(p, media.duration) : p;
  }

  function applyLook() {
    applyAppearance(S.appearance);
    if (api.real) {
      const n = parseInt(S.appearance.background.slice(1), 16);
      api.currentWindow().setBackgroundColor?.([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]).catch(() => {});
    }
  }

  // ---- Layout: decided from the window's size every time it changes.
  function layout() {
    const card = $("card");
    const w = card.clientWidth, h = card.clientHeight;
    const hasLines = lyr.status === "synced" || lyr.status === "plain";
    const ly = wantLyrics() && (hasLines || lyr.status === "instrumental");
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    let L, Y = "none", art, s;
    if (h < 118) {
      L = "strip";
      if (ly) Y = "line";
      art = h - 20;
      s = clamp(h / 84, 0.85, 1.05);
    } else if (w >= h * 1.3) {
      L = "row";
      if (ly) Y = !hasLines ? "line" : w >= 540 ? "side" : h >= 230 ? "below" : "line";
      s = clamp(Math.min(h / 140, w / 380), 0.9, 1.3);
      art = Y === "below" ? clamp(w * 0.28, 64, 120 * s) : clamp(Math.min(h - 28, w * 0.36), 56, 300);
    } else {
      L = "stack";
      s = clamp(w / 300, 0.9, 1.3);
      if (ly) Y = hasLines && h >= 360 ? "below" : "line";
      const rest = 150 * s + (Y === "below" ? Math.max(90, h * 0.3) : Y === "line" ? 22 : 0);
      art = clamp(Math.min(w - 28, h - rest), 48, 420);
    }
    document.body.className = [api.real ? "" : "preview", media ? "" : "idle", "L-" + L, "Y-" + Y].join(" ").trim();
    card.style.setProperty("--art", Math.round(art) + "px");
    card.style.setProperty("--s", s.toFixed(3));
    $("ly-btn").hidden = !S.modules.lyrics.enabled;
    $("ly-btn").classList.toggle("on", state.lyrics);
    $("ly-btn").title = state.lyrics ? "Hide lyrics" : "Show lyrics";
    curLine = -2; // re-center the lyrics for the new size
    renderProgress();
  }

  // ---- Now playing
  function render() {
    if (media) {
      $("title").textContent = media.title;
      $("artist").textContent = [media.artist, media.album].filter(Boolean).join(" · ");
      $("b-play").innerHTML = media.playing ? ICON.pause : ICON.play;
    }
    layout();
  }

  function setArt(src) {
    $("art").classList.toggle("none", !src);
    if (src && $("art").src !== src) $("art").src = src;
    else if (!src) $("art").removeAttribute("src");
  }

  function renderProgress() {
    if (!media) return;
    const p = livePos();
    $("cur").textContent = formatDuration(p);
    $("dur").textContent = formatDuration(media.duration);
    $("fill").style.width = media.duration ? (p / media.duration) * 100 + "%" : "0";
    renderLyrics();
  }

  // ---- Lyrics
  async function loadLyrics() {
    if (!media || !wantLyrics()) return;
    const k = trackKey(media);
    if (lyr.key === k && lyr.status !== "idle") return;
    if (cache.has(k)) { setLyrics(cache.get(k)); return; }
    lyr = { key: k, status: "loading", lines: [] };
    try {
      const found = { key: k, ...(await fetchLyrics(media)) };
      cache.set(k, found);
      if (media && trackKey(media) === k) setLyrics(found);
    } catch {
      if (lyr.key === k) setLyrics({ key: k, status: "none", lines: [] });
    }
  }

  function setLyrics(l) {
    lyr = l;
    const inner = $("ly-inner");
    inner.innerHTML = "";
    for (const line of lyr.lines) {
      const d = document.createElement("div");
      d.textContent = line.text;
      inner.appendChild(d);
    }
    layout();
  }

  function renderLyrics() {
    const Y = [...document.body.classList].find((c) => c.startsWith("Y-"));
    if (!Y || Y === "Y-none") return;
    if (lyr.status === "instrumental") { $("line").textContent = "♪ Instrumental"; return; }
    const i = lyricIndexAt(lyr, livePos(), media.duration, S.modules.lyrics.offsetMs);
    $("line").textContent = i >= 0 ? lyr.lines[i].text : "♪";
    if (i === curLine) return;
    curLine = i;
    const rows = $("ly-inner").children;
    [...rows].forEach((r, n) => {
      r.classList.toggle("cur", n === i);
      r.classList.toggle("near", Math.abs(n - i) === 1);
    });
    // Keep the current line in the middle (or the first line at the top before the singing starts).
    const box = $("lyrics"), row = rows[Math.max(0, i)];
    if (!row) return;
    const offset = i < 0 ? 0 : row.offsetTop - (box.clientHeight - row.offsetHeight) / 2;
    $("ly-inner").style.transform = `translateY(${-Math.max(0, offset)}px)`;
  }

  // ---- Events
  api.listen("media", (m) => {
    const prevKey = trackKey(media), wasPlaying = media && media.playing;
    const est = livePos();
    media = m && m.title ? m : null;
    if (media && (!media.playing || wasPlaying !== media.playing || Math.abs(est - media.position) > 1.5 || trackKey(media) !== prevKey)) {
      posBase = media.position;
      posAt = performance.now();
    }
    if (trackKey(media) !== prevKey) {
      setLyrics({ key: null, status: "idle", lines: [] });
      loadLyrics();
    }
    render();
  });
  api.listen("media-art", (a) => setArt(a || null));
  api.listen("music-lyrics", (on) => {
    state.lyrics = !!on;
    loadLyrics();
    layout();
  });
  api.listen("settings-changed", (v) => {
    S = mergeDeep(DEFAULTS, v);
    applyLook();
    loadLyrics();
    layout();
  });

  $("b-prev").innerHTML = ICON.prev;
  $("b-next").innerHTML = ICON.next;
  $("b-play").innerHTML = ICON.play;
  $("ly-btn").innerHTML = ICON.lyrics;
  $("close").innerHTML = ICON.x;
  document.querySelectorAll("[data-media]").forEach((b) => {
    b.onclick = () => {
      api.invoke("media_control", { action: b.dataset.media });
      if (b.dataset.media === "toggle" && media) {
        posBase = livePos();
        posAt = performance.now();
        media.playing = !media.playing;
        render();
      }
    };
  });
  $("bar").onclick = (e) => {
    if (!media || !media.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const target = ((e.clientX - r.left) / r.width) * media.duration;
    api.invoke("media_control", { action: "seek", value: target });
    posBase = target;
    posAt = performance.now();
    renderProgress();
  };
  $("ly-btn").onclick = () => {
    state.lyrics = !state.lyrics;
    persist();
    loadLyrics();
    layout();
  };
  $("close").onclick = () => api.invoke("close_music_widget");

  // Remember size, place and the lyrics choice for next time.
  let saveTimer;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (api.real) {
        const win = api.currentWindow();
        const [pos, size] = await Promise.all([win.outerPosition(), win.innerSize()]);
        Object.assign(state, { x: pos.x, y: pos.y, w: size.width, h: size.height });
      }
      api.invoke("save_data", { name: "music_widget", value: { ...state, open: true } });
    }, 500);
  }

  window.addEventListener("resize", layout);
  setInterval(() => media && media.playing && renderProgress(), 250);

  // ---- Window behaviour (only inside the app)
  if (api.real) {
    const win = api.currentWindow();
    // Drag anywhere that isn't a button or the progress bar to move it.
    $("card").addEventListener("mousedown", (e) => {
      if (e.button === 0 && !e.target.closest("button, .bar, [data-dir]")) win.startDragging();
    });
    const grip = $("grip");
    let idleTimer;
    document.querySelectorAll("[data-dir]").forEach((el) => {
      el.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        if (el === grip) grip.classList.add("active");
        win.startResizeDragging(el.dataset.dir);
      });
    });
    window.addEventListener("mouseup", () => grip.classList.remove("active"));
    win.onMoved(persist);
    win.onResized(() => {
      persist();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => grip.classList.remove("active"), 400);
    });
    const now = await api.invoke("media_extras").catch(() => null);
    if (now && now.art) setArt(now.art);
  } else {
    // Browser preview: a demo track so the layouts can be checked.
    let pos = 8;
    setInterval(() => api.emit("media", { title: "Neon Harbor", artist: "Lumen Coast", album: "Night Swim", playing: true, position: (pos += 0.5), duration: 214, source: "Spotify.exe" }), 500);
  }

  applyLook();
  layout();
})();
