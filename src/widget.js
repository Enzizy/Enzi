// Floating to-do widget. Shares todo.json with the notch; changes sync both ways through "data-changed".
(async () => {
  const $ = (id) => document.getElementById(id);
  const LABEL = "todo-widget";
  const svg = (d, fill) =>
    `<svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="${fill ? "none" : "currentColor"}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    x: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
    focus: svg('<path d="M7 4.5v15l13-7.5z"/>', true),
  };

  let S = await loadSettings();
  const blank = () => ({ items: [], stats: { date: todayKey(), done: 0 } });
  let todo = Object.assign(blank(), (await api.invoke("load_data", { name: "todo" })) || {});
  const save = () => api.invoke("save_data", { name: "todo", value: todo });
  const doneToday = () => (todo.stats.date === todayKey() ? todo.stats.done : 0);

  function applyLook() {
    applyAppearance(S.appearance);
    // Keep the window's own background in step, so nothing flashes while it resizes.
    if (api.real) {
      const n = parseInt(S.appearance.background.slice(1), 16);
      api.currentWindow().setBackgroundColor?.([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]).catch(() => {});
    }
  }

  function render() {
    const list = $("list");
    list.innerHTML = "";
    const open = todo.items.filter((i) => !i.done);
    const items = [...open, ...todo.items.filter((i) => i.done)];
    if (!items.length) list.innerHTML = '<li class="empty">No tasks yet.</li>';
    for (const item of items) {
      const li = document.createElement("li");
      li.className = item.done ? "done" : "";
      li.innerHTML = `<button class="check" title="Done"></button><span class="txt"></span>
        <button class="act" data-act="focus" title="Focus on this">${ICON.focus}</button>
        <button class="act" data-act="del" title="Delete">${ICON.x}</button>`;
      li.querySelector(".txt").textContent = item.text;
      li.querySelector(".check").onclick = () => toggle(item);
      li.querySelector('[data-act="del"]').onclick = () => { todo.items = todo.items.filter((i) => i !== item); save(); render(); };
      const focus = li.querySelector('[data-act="focus"]');
      focus.hidden = item.done || !S.modules.timer.enabled;
      focus.onclick = () => api.emit && api.emit("focus-task", item.text);
      li.querySelector(".txt").ondblclick = () => edit(li, item);
      list.appendChild(li);
    }
    $("count").textContent = open.length ? String(open.length) : "";
    $("stats").textContent = `${open.length} open · ${doneToday()} done today`;
  }

  function toggle(item) {
    if (todo.stats.date !== todayKey()) todo.stats = { date: todayKey(), done: 0 };
    item.done = !item.done;
    if (item.done) { item.doneAt = Date.now(); todo.stats.done++; }
    else if (item.doneAt && todayKey(new Date(item.doneAt)) === todayKey()) todo.stats.done = Math.max(0, todo.stats.done - 1);
    save();
    render();
  }

  function edit(li, item) {
    const input = document.createElement("input");
    input.className = "edit";
    input.value = item.text;
    li.querySelector(".txt").replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      if (keep && input.value.trim()) item.text = input.value.trim();
      save();
      render();
    };
    input.onkeydown = (e) => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); };
    input.onblur = () => finish(true);
  }

  $("form").onsubmit = (e) => {
    e.preventDefault();
    const text = $("input").value.trim();
    if (!text) return;
    todo.items.push({ id: Date.now(), text, done: false });
    $("input").value = "";
    save();
    render();
  };
  $("clear").onclick = () => { todo.items = todo.items.filter((i) => !i.done); save(); render(); };
  $("close").innerHTML = ICON.x;
  $("close").onclick = () => api.invoke("close_todo_widget");

  api.listen("data-changed", ({ name, value, from }) => {
    if (name !== "todo" || from === LABEL || !value) return;
    if (document.activeElement && document.activeElement.classList.contains("edit")) return; // don't clobber an edit
    todo = Object.assign(blank(), value);
    render();
  });
  api.listen("settings-changed", (v) => {
    S = mergeDeep(DEFAULTS, v);
    applyLook();
    render();
  });

  // ---- Window behaviour (only inside the app) ----
  if (api.real) {
    const win = api.currentWindow();

    // Drag the header to move the widget.
    $("drag").addEventListener("mousedown", (e) => {
      if (e.button === 0 && !e.target.closest("button")) win.startDragging();
    });

    // Resize from any edge, corner or the bottom-left grip. It starts the moment the mouse goes down,
    // and Windows takes over the drag, so it's as smooth as resizing a normal window.
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

    // Remember where the widget is and how big, for next time.
    let saveTimer;
    const remember = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        const [pos, size] = await Promise.all([win.outerPosition(), win.innerSize()]);
        api.invoke("save_data", { name: "todo_widget", value: { open: true, x: pos.x, y: pos.y, w: size.width, h: size.height } });
      }, 500);
    };
    win.onMoved(remember);
    win.onResized(() => {
      remember();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => grip.classList.remove("active"), 400);
    });
  } else {
    document.body.classList.add("preview");
  }

  applyLook();
  render();
})();
