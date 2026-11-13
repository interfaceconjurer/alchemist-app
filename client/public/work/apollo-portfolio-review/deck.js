/* Deck runtime: scaling, navigation, hash routing, GIF slots, presenter view. No dependencies. */
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  // The public build (tools/build.py -> public/) sets data-public on <html>: no notes ship, so P and Shift+R are off.
  const isPublic = document.documentElement.hasAttribute("data-public");
  // ?pdf: the PDF renderer screenshots each slide at rest; hide the cover's interactive bits.
  const isPdf = params.has("pdf");
  if (isPdf) document.documentElement.setAttribute("data-pdf", "");
  const isPresenter = !isPublic && params.has("presenter");
  const slides = Array.from(document.querySelectorAll("#stage > .slide"));
  // An optional resting cover is slide 0: it is not counted or given a folio, but shows "00 / NN".
  const hasCover = slides.length > 0 && slides[0].classList.contains("cover");
  const first = hasCover ? 0 : 1;
  const numbered = slides.filter((s) => !s.classList.contains("cover"));
  const total = numbered.length;
  const slideAt = (n) => slides[n - first];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motion.matches;
  let printing = false, initialized = false;
  let current = first;
  const played = new Set(); // slides whose entrance motion has already run
  let peer = null; // the other window (presenter <-> audience)
  // Chrome serializes a local file sender as an opaque origin, despite location.origin being "file://".
  const messageOrigin = location.protocol === "file:" ? "null" : location.origin;
  const peerTargetOrigin = messageOrigin === "null" ? "*" : messageOrigin;

  // Section boundaries for the folio lattice: after the open, after each project.
  const sectionBreaks = new Set([4, 9, 14, 15]);
  numbered.forEach((s, i) => {
    s.dataset.n = String(i + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
    const folio = document.createElement("div");
    folio.className = "folio";
    folio.setAttribute("aria-hidden", "true");
    for (let k = 1; k <= total; k++) {
      const dot = document.createElement("i");
      if (k === i + 1) dot.className = "on";
      else if (k < i + 1) dot.className = "past";
      folio.appendChild(dot);
      if (sectionBreaks.has(k) && k < total) { const gap = document.createElement("i"); gap.className = "sec"; folio.appendChild(gap); }
    }
    s.appendChild(folio);
    if (!s.classList.contains("no-num")) {
      const num = document.createElement("button");
      num.type = "button"; num.className = "num"; num.tabIndex = -1;
      num.setAttribute("aria-haspopup", "listbox");
      num.setAttribute("aria-label", "Jump to slide");
      num.textContent = s.dataset.n;
      s.appendChild(num);
    }
  });
  // The resting cover gets a page number too ("00 / 16"), so reviewers can Cmd-click it to jump. No folio.
  if (hasCover) {
    const cover = slides[0];
    cover.dataset.n = "00 / " + String(total).padStart(2, "0");
    const num = document.createElement("button");
    num.type = "button"; num.className = "num"; num.tabIndex = -1;
    num.setAttribute("aria-haspopup", "listbox");
    num.setAttribute("aria-label", "Jump to slide");
    num.textContent = cover.dataset.n;
    cover.appendChild(num);
  }

  /* ── Slide 1 typed opening: while it plays, the label is split into per-character spans so CSS can
     type it. Done here (not in the markup) so the static HTML and copy keep the plain text. The spans
     only exist during the entrance: they are removed when the big label has been cut (or the slide is left),
     so the resting state, print, reduced motion and the presenter clones are the untouched plain text.
     While split, the label keeps its full text as its accessible name and the characters are hidden. */
  const typedLabel = document.querySelector("#stage > .s1 .label");
  let typedText = null;
  function splitLabel() {
    if (!typedLabel || typedText) return;
    typedText = typedLabel.lastChild;
    const typed = document.createElement("span");
    typed.className = "typed";
    typed.setAttribute("aria-hidden", "true");
    // The big label trails off into a typed "...", present only while split. The dots type at the same
    // 40ms-per-character cadence as the letters, with no pause before the first.
    const chars = Array.from(typedText.textContent).concat([".", ".", "."]);
    chars.forEach((c, i) => {
      const ch = document.createElement("span");
      ch.className = "ch";
      ch.style.setProperty("--i", i);
      ch.textContent = c;
      typed.appendChild(ch);
    });
    typedLabel.setAttribute("role", "group");
    typedLabel.setAttribute("aria-label", typedText.textContent);
    typedLabel.replaceChild(typed, typedText);
  }
  function joinLabel() {
    if (!typedText) return;
    typedLabel.replaceChild(typedText, typedLabel.lastChild);
    typedLabel.removeAttribute("role");
    typedLabel.removeAttribute("aria-label");
    typedText = null;
  }
  if (typedLabel) typedLabel.addEventListener("animationend", (e) => { if (e.target === typedLabel && e.animationName === "s1-label-out") joinLabel(); });

  /* ── Scale the 1920×1080 stage to fit the viewport ───── */
  const stage = document.getElementById("stage");
  // Measure the visible viewport (iOS reports the old size inside resize during rotation, so refit again once settled).
  function fit() {
    const vv = window.visualViewport;
    const w = document.documentElement.clientWidth || innerWidth;
    const h = vv ? Math.min(vv.height, innerHeight) : innerHeight;
    const s = Math.min(w / 1920, h / 1080);
    stage.style.setProperty("--scale", s);
    document.documentElement.classList.toggle("portrait", h > w);
    if (isPresenter) layoutPresenter();
  }
  let fitTimers = [];
  function refit() {
    fit();
    fitTimers.forEach(clearTimeout);
    fitTimers = [120, 350, 700].map((ms) => setTimeout(fit, ms));
  }
  addEventListener("resize", refit);
  addEventListener("orientationchange", refit);
  window.visualViewport?.addEventListener("resize", refit);

  /* ── GIF slots: swap in assets/gifs/*.gif when present ─ */
  function wireGifs(root) {
    root.querySelectorAll(".slot[data-src]").forEach((fig) => {
      const cap = fig.querySelector(".d");
      const badge = fig.querySelector(".badge");
      const alt = cap ? cap.textContent.trim()
        : badge ? Array.from(badge.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent).join("").trim() : "";
      const show = (src, isGif) => {
        let img = fig.querySelector(":scope > img");
        if (!img) { img = new Image(); img.alt = alt; fig.appendChild(img); }
        if (img.getAttribute("src") !== src) img.src = src;
        img.dataset.gif = isGif ? "1" : "";
        fig.classList.add("loaded");
      };
      // A slot with data-fallback ships its still in the markup, so nothing flashes on load. The GIF replaces it
      // only if the file exists; a missing GIF never touches the still.
      // The fallback is the GIF's own first frame, so the swap is invisible. data-still (optional) is the frame that
      // tells the story when nothing moves: the PDF, print, presenter view and reduced motion show it instead.
      const isGif = /\.gif$/i.test(fig.dataset.src);
      const stillOnly = () => isGif && (reduced || isPresenter || isPdf || printing) && fig.dataset.fallback;
      if (fig.dataset.fallback) show(stillOnly() && fig.dataset.still ? fig.dataset.still : fig.dataset.fallback, false);
      if (stillOnly()) return;
      const probe = new Image();
      probe.onload = () => { if (!stillOnly()) show(fig.dataset.src, isGif); };
      probe.src = fig.dataset.src;
    });
  }


  /* ── Navigation ──────────────────────────────────────── */
  const clamp = (n) => Math.max(first, Math.min(total, n));
  /* Stage slide n's entrance. Motion runs once, on first entry: a revisit (Q&A) shows the resting state, which is
     the final state, at once. The cover is a resting loop, not an entrance, so it plays on every visit.
     force (the R key) bypasses the once-only rule and restarts the entrance, even mid-animation. */
  function playSlide(n, { force = false } = {}) {
    // Each slide stages its one deliberate moment on entry (see styles.css → Motion).
    slides.forEach((s) => s.classList.remove("play"));
    joinLabel();
    const cur = slideAt(n);
    if (!reduced && !isPresenter && !isPdf && !printing && (force || cur.classList.contains("cover") || !played.has(n))) {
      played.add(n);
      if (cur === typedLabel?.parentElement) splitLabel();
      void cur.offsetWidth;
      cur.classList.add("play");
    }
    // Entering a slide restarts its loaded GIFs from frame 0 (statics are untouched).
    if (!reduced && !isPresenter && !isPdf && !printing) cur.querySelectorAll(".slot.loaded > img[data-gif='1']").forEach((img) => {
      img.src = img.parentElement.dataset.src + "?r=" + Date.now();
    });
    runStreams();
  }
  function show(n, { fromPeer = false } = {}) {
    if (!Number.isInteger(n)) return;
    resetNumberInput();
    n = clamp(n);
    const target = "#/" + n;
    if (location.hash !== target) history.replaceState(null, "", target);
    if (initialized && n === current) return;
    initialized = true;
    current = n;
    if (jumpOpen) closeJump();
    slides.forEach((s, i) => s.classList.toggle("is-active", i === n - first));
    playSlide(n);
    if (isPresenter) renderPresenter();
    paintRehearse();
    if (!fromPeer && peer && !peer.closed) peer.postMessage({ deck: 1, n }, peerTargetOrigin);
  }
  const go = (n) => show(n);
  const step = (d) => go(current + d);

  function fromHash() {
    const m = location.hash.match(/^#\/(\d+)$/);
    return m ? clamp(parseInt(m[1], 10)) : first;
  }
  addEventListener("hashchange", () => show(fromHash()));

  // Cross-window sync (works on file://, unlike BroadcastChannel)
  addEventListener("message", (e) => {
    if (isPublic || !peer || e.source !== peer || e.origin !== messageOrigin) return;
    if (!e.data || e.data.deck !== 1) return;
    if (e.data.ready === true) {
      // The audience owns initial state: it may have advanced while the popup was loading.
      if (!isPresenter) peer.postMessage({ deck: 1, n: current }, peerTargetOrigin);
      return;
    }
    if (Number.isInteger(e.data.n) && e.data.n >= first && e.data.n <= total) {
      show(e.data.n, { fromPeer: true });
    }
  });
  if (isPresenter && window.opener) peer = window.opener;

  /* ── Jump list: Cmd- or Option/Alt-click the slide number or folio ─
     A plain click does nothing. The list is one element in the stage (so it scales with it),
     fed from each slide's aria-label. While open it owns the keyboard. */
  let jumpOpen = false;
  let jumpHi = 0; // index into slides of the highlighted row
  let jumpBuf = "";
  let jumpBufTimer = 0;
  const jump = document.createElement("div");
  jump.id = "jump";
  jump.tabIndex = -1;
  jump.setAttribute("role", "listbox");
  jump.setAttribute("aria-label", "Jump to slide");
  const jumpRows = slides.map((s, i) => {
    const row = document.createElement("div");
    row.className = "row";
    row.id = "jump-opt-" + (i + first);
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", "false");
    row.dataset.n = String(i + first);
    const rn = document.createElement("span");
    rn.className = "rn";
    rn.textContent = String(i + first).padStart(2, "0");
    const rt = document.createElement("span");
    rt.className = "rt";
    rt.textContent = s.getAttribute("aria-label") || "";
    row.append(rn, rt);
    jump.appendChild(row);
    return row;
  });
  if (!isPresenter) document.getElementById("stage").appendChild(jump);

  function jumpHighlight(i) {
    jumpHi = (i + slides.length) % slides.length;
    jumpRows.forEach((row, k) => {
      row.classList.toggle("hi", k === jumpHi);
      row.setAttribute("aria-selected", k === jumpHi ? "true" : "false");
    });
    jump.setAttribute("aria-activedescendant", jumpRows[jumpHi].id);
    jumpRows[jumpHi].scrollIntoView({ block: "nearest" });
  }
  function openJump() {
    if (isPresenter || jumpOpen || !slideAt(current).querySelector(".num")) return;
    resetNumberInput();
    jumpRows.forEach((row, k) => row.classList.toggle("cur", k === current - first));
    jumpOpen = true;
    jump.classList.add("open");
    jumpHighlight(current - first);
    jump.focus({ preventScroll: true });
  }
  function closeJump() {
    if (!jumpOpen) return;
    jumpOpen = false;
    jump.classList.remove("open");
    jump.removeAttribute("aria-activedescendant");
    jumpBuf = "";
    restoreJumpFocus();
  }
  function restoreJumpFocus() {
    const num = slideAt(current).querySelector(".num");
    if (num) num.focus({ preventScroll: true }); else if (document.activeElement) document.activeElement.blur();
  }
  function jumpTo(n) {
    jumpOpen = false;
    jump.classList.remove("open");
    jump.removeAttribute("aria-activedescendant");
    jumpBuf = "";
    go(n);
    restoreJumpFocus();
  }

  /* ── Touch: swipe left/right, or tap the right two-thirds (next) / left third (back). Links, buttons and the
     page number keep their own behavior. Only on touch input, so mouse clicks on desktop do nothing new. */
  const isTouch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  if (isTouch) document.documentElement.classList.add("touch");
  if (!isPresenter) {
    let t0 = null;
    const interactive = (el) => el.closest && el.closest("a, button, input, select, textarea, #jump, .num, .folio, [role='button']");
    addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) { t0 = null; return; }
      const t = e.touches[0];
      t0 = { x: t.clientX, y: t.clientY, at: Date.now(), target: e.target };
    }, { passive: true });
    addEventListener("touchend", (e) => {
      if (!t0 || jumpOpen) { t0 = null; return; }
      const t = e.changedTouches[0];
      const dx = t.clientX - t0.x, dy = t.clientY - t0.y, dt = Date.now() - t0.at;
      const start = t0; t0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < 900) { step(dx < 0 ? 1 : -1); return; }
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 500 && !interactive(start.target)) {
        e.preventDefault(); // no synthetic click / double-tap zoom
        step(t.clientX < innerWidth / 3 ? -1 : 1);
      }
    }, { passive: false });
  }

  addEventListener("click", (e) => {
    if (isPresenter) return;
    if (jumpOpen) {
      const row = e.target.closest && e.target.closest("#jump .row");
      if (row) jumpTo(parseInt(row.dataset.n, 10));
      else if (!jump.contains(e.target)) closeJump();
      return;
    }
    const onNum = e.target.closest && e.target.closest(".slide.is-active .num, .slide.is-active .folio");
    // On touch there are no modifier keys: a plain tap on the page number opens the jump list.
    if (onNum && (e.altKey || e.metaKey || e.ctrlKey || isTouch)) openJump();
  }, true);
  addEventListener("keydown", (e) => {
    if (!jumpOpen) return;
    e.stopImmediatePropagation();
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case "ArrowDown": case "ArrowRight": e.preventDefault(); jumpHighlight(jumpHi + 1); return;
      case "ArrowUp": case "ArrowLeft": e.preventDefault(); jumpHighlight(jumpHi - 1); return;
      case "Home": e.preventDefault(); jumpHighlight(0); return;
      case "End": e.preventDefault(); jumpHighlight(slides.length - 1); return;
      case "Enter": e.preventDefault(); jumpTo(jumpHi + first); return;
      case "Escape": e.preventDefault(); closeJump(); return;
      case "Tab": e.preventDefault(); return;
    }
    if (/^[0-9]$/.test(e.key)) { // type-ahead: "1" then "2" lands on 12
      const find = (v) => slides.findIndex((_, i) => i + first === parseInt(v, 10));
      clearTimeout(jumpBufTimer);
      jumpBufTimer = setTimeout(() => { jumpBuf = ""; }, 650);
      jumpBuf += e.key;
      let k = find(jumpBuf);
      if (k < 0) { jumpBuf = e.key; k = find(jumpBuf); }
      if (k >= 0) jumpHighlight(k);
    }
  }, true);

  let numBuf = "";
  let numTimer = 0;
  function resetNumberInput() {
    clearTimeout(numTimer);
    numTimer = 0;
    numBuf = "";
  }
  addEventListener("keydown", (e) => {
    if (jumpOpen || e.defaultPrevented || e.isComposing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest("input, textarea, select, [contenteditable]:not([contenteditable=false])")) return;
    if ((e.key === "Enter" || e.key === " ") && target?.closest("a, button") && !target.closest(".num")) return;
    if (!/^[0-9]$/.test(e.key)) resetNumberInput();
    switch (e.key) {
      case "ArrowRight": case "ArrowDown": case "PageDown": case " ": case "Enter":
        e.preventDefault(); step(1); return;
      case "ArrowLeft": case "ArrowUp": case "PageUp": case "Backspace":
        e.preventDefault(); step(-1); return;
      case "Home": e.preventDefault(); go(first); return;
      case "End": e.preventDefault(); go(total); return;
      case "f": case "F":
        const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
        request?.catch(() => {}); // A denied fullscreen request leaves navigation usable.
        return;
      case "p": case "P":
        if (!isPresenter && !isPublic) openPresenter();
        return;
      case "r": case "R":
        // Shift+R toggles the Rehearse overlay; plain R replays the current slide's entrance (main window only).
        if (e.shiftKey) { if (!isPublic) toggleRehearse(); }
        else if (!isPresenter && !reduced) playSlide(current, { force: true });
        return;
      case "s": case "S":
        if (isPresenter || rehearseOpen) toggleBeatsOnly();
        return;
      case "Escape":
        toggleRehearse(false);
        return;
    }
    if (/^[0-9]$/.test(e.key)) {
      numBuf += e.key;
      clearTimeout(numTimer);
      // 0 jumps to the cover; 1–9 jump immediately unless a two-digit slide (10–16) is still possible.
      const v = parseInt(numBuf, 10);
      const canExtend = numBuf.length === 1 && v >= 1 && v * 10 <= total;
      if (!canExtend) { go(v); numBuf = ""; }
      else numTimer = setTimeout(() => { go(parseInt(numBuf, 10)); numBuf = ""; }, 650);
    }
  });

  function openPresenter() {
    const url = location.pathname + "?presenter#/" + current;
    peer = window.open(url, "deck-presenter", "width=1360,height=860");
  }

  /* ── Notes rendering, shared by the presenter window and the rehearse overlay ──
     Beats, script and hand-off sit up front; the Reference block (sources, Q&A) is collapsed behind a toggle.
     "S" switches script ⇄ beats-only; both choices persist in localStorage. */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* private mode: state just doesn't persist */ } },
  };
  let beatsOnly = store.get("deck.notesView") === "beats";
  let refOpen = store.get("deck.notesRef") === "open";
  const noteViews = []; // every element currently showing notes (.nt)
  function applyNotesState() {
    noteViews.forEach((el) => {
      el.classList.toggle("beats-only", beatsOnly);
      el.classList.toggle("ref-open", refOpen);
      el.querySelectorAll(".reftoggle").forEach((b) => {
        b.textContent = refOpen ? "Reference ▾" : "Reference ▸";
        b.setAttribute("aria-expanded", String(refOpen));
      });
    });
  }
  function toggleBeatsOnly() { beatsOnly = !beatsOnly; store.set("deck.notesView", beatsOnly ? "beats" : "script"); applyNotesState(); }
  function toggleRef() { refOpen = !refOpen; store.set("deck.notesRef", refOpen ? "open" : "closed"); applyNotesState(); }
  addEventListener("storage", (e) => {
    if (e.key === "deck.notesView") beatsOnly = e.newValue === "beats";
    else if (e.key === "deck.notesRef") refOpen = e.newValue === "open";
    else return;
    applyNotesState();
  });
  function fillNotes(el, slide) {
    const notes = slide.querySelector(".notes");
    el.innerHTML = notes ? notes.innerHTML : "";
    const rule = el.querySelector("hr.ref");
    if (rule) {
      const body = document.createElement("div");
      body.className = "refbody";
      while (rule.nextSibling) body.appendChild(rule.nextSibling);
      if (body.textContent.trim()) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "reftoggle";
        btn.tabIndex = -1; // never takes focus, so Space/Enter keep driving the deck
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", toggleRef);
        rule.replaceWith(btn);
        btn.after(body);
      } else rule.remove();
    }
    if (!noteViews.includes(el)) noteViews.push(el);
    applyNotesState();
    el.scrollTop = 0;
  }
  const parseBudget = (str) => {
    const m = /^(\d+):(\d\d)$/.exec(str || "");
    return m ? +m[1] * 60 + +m[2] : 0;
  };
  const clock = (sec) => String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(Math.floor(sec % 60)).padStart(2, "0");
  const budgetOf = (slide) => { const tt = slide.querySelector(".tt"); return tt ? tt.dataset.budget || "" : ""; };

  /* ── Rehearse overlay (main window, Shift+R): the same notes over the right ~40% of the deck ── */
  let rehearse = null, rehearseNotes = null, rehearseOpen = false;
  function paintRehearse() {
    if (!rehearseOpen) return;
    const s = slideAt(current);
    const budget = budgetOf(s);
    rehearse.querySelector(".rh-count").textContent = current === 0 ? "Cover" : `Slide ${current} / ${total}`;
    rehearse.querySelector(".rh-budget").textContent = budget ? "budget " + budget : "";
    fillNotes(rehearseNotes, s);
  }
  function toggleRehearse(force) {
    if (isPresenter) return;
    const want = typeof force === "boolean" ? force : !rehearseOpen;
    if (want === rehearseOpen) return;
    if (!rehearse) {
      rehearse = document.createElement("div");
      rehearse.id = "rehearse";
      rehearse.setAttribute("aria-hidden", "true");
      rehearse.innerHTML = `<div class="rh-hd"><span class="rh-count"></span><span class="rh-budget"></span><span class="rh-legend"><kbd>S</kbd> script/beats · <kbd>Shift</kbd>+<kbd>R</kbd> close</span></div><div class="nt"></div>`;
      rehearseNotes = rehearse.querySelector(".nt");
      document.body.appendChild(rehearse);
    }
    rehearseOpen = want;
    rehearse.classList.toggle("open", want);
    if (want) paintRehearse();
    else { const i = noteViews.indexOf(rehearseNotes); if (i >= 0) noteViews.splice(i, 1); }
  }

  /* ── Presenter view: notes first, slide thumbnails, timer, per-slide budget ── */
  let pv, curFrame, nextFrame, notesBox, timerEl, slideTimeEl;
  let t0 = 0, elapsed = 0, running = false, tick = 0;
  let slideStartMs = 0, slideBudgetSec = 0; // total-timer reading when this slide was entered

  function buildPresenter() {
    document.body.classList.add("presenter");
    pv = document.getElementById("pv");
    pv.innerHTML = `
      <div class="hd">
        <div class="meta"><span id="pv-count"></span><span id="pv-sec"></span></div>
        <div class="meta"><span class="slidetime" id="pv-slidetime"></span></div>
        <div class="meta"><button id="pv-toggle">Start</button><button id="pv-reset">Reset</button><span class="timer" id="pv-timer">00:00</span></div>
      </div>
      <div class="notescol"><div class="notesbox nt" id="pv-notes"></div></div>
      <div class="side">
        <div class="thumb"><div class="k">Current</div><div class="frame" id="pv-cur"><div class="inner"></div></div></div>
        <div class="thumb"><div class="k">Next</div><div class="frame nextf" id="pv-next"><div class="inner"></div></div></div>
        <div class="legend"><kbd>←</kbd><kbd>→</kbd> slide · <kbd>S</kbd> script/beats · <kbd>Shift</kbd>+<kbd>R</kbd> rehearse (main window)</div>
      </div>`;
    curFrame = pv.querySelector("#pv-cur");
    nextFrame = pv.querySelector("#pv-next");
    notesBox = pv.querySelector("#pv-notes");
    timerEl = pv.querySelector("#pv-timer");
    slideTimeEl = pv.querySelector("#pv-slidetime");
    pv.querySelector("#pv-toggle").onclick = (e) => {
      running ? pause() : resume();
      e.target.textContent = running ? "Pause" : (elapsed ? "Resume" : "Start");
    };
    pv.querySelector("#pv-reset").onclick = () => {
      if (running) pause();
      elapsed = 0; slideStartMs = 0; paintTimer();
      pv.querySelector("#pv-toggle").textContent = "Start";
    };
    // The clock waits for an explicit Start; it never runs on its own.
  }
  function resume() { running = true; t0 = performance.now() - elapsed; tick = setInterval(paintTimer, 500); }
  function pause() { running = false; elapsed = performance.now() - t0; clearInterval(tick); }
  function totalMs() { return running ? performance.now() - t0 : elapsed; }
  function paintTimer() {
    const ms = totalMs();
    timerEl.textContent = clock(ms / 1000);
    const onSlide = Math.max(0, ms - slideStartMs) / 1000;
    slideTimeEl.classList.toggle("over", slideBudgetSec > 0 && onSlide > slideBudgetSec);
    slideTimeEl.textContent = slideBudgetSec ? `this slide ${clock(onSlide)} / budget ${clock(slideBudgetSec)}` : `this slide ${clock(onSlide)}`;
  }
  function layoutPresenter() {
    if (!curFrame) return;
    [curFrame, nextFrame].forEach((f) => {
      const inner = f.querySelector(".inner");
      inner.style.transform = `scale(${f.clientWidth / 1920})`;
    });
  }
  function renderPresenter() {
    if (!pv) return;
    const put = (frame, n) => {
      const inner = frame.querySelector(".inner");
      inner.innerHTML = "";
      if (n < first || n > total) { frame.style.opacity = 0.25; return; }
      frame.style.opacity = 1;
      const clone = slideAt(n).cloneNode(true);
      clone.querySelectorAll("canvas").forEach((canvas) => canvas.classList.remove("live", "on"));
      clone.classList.add("is-active");
      clone.classList.remove("play");
      inner.appendChild(clone);
      wireGifs(inner);
    };
    put(curFrame, current);
    put(nextFrame, current + 1);
    const s = slideAt(current);
    pv.querySelector("#pv-count").textContent = current === 0 ? "Cover" : `Slide ${current} / ${total}`;
    pv.querySelector("#pv-sec").textContent = s.dataset.sec || "";
    fillNotes(notesBox, s);
    slideBudgetSec = parseBudget(budgetOf(s));
    slideStartMs = totalMs();
    paintTimer();
    layoutPresenter();
  }

  /* ── Streams: one deck clock drives slide 3's particles ─
     The build bakes each dot at its resting frame (t = data-rest), so PDF,
     reduced motion and the presenter clone are correct with no JS. On entry
     the clock resets to that same frame and the flow eases up to speed. */
  const streams = [...document.querySelectorAll("#stage svg.stream")].map((svg) => {
    const dur = +svg.dataset.dur, rest = +svg.dataset.rest;
    const lanes = [...svg.querySelectorAll("defs path")].map((p) => {
      const L = p.getTotalLength(), N = 720, lut = new Float32Array(2 * (N + 1));
      for (let i = 0; i <= N; i++) { const q = p.getPointAtLength((L * i) / N); lut[2 * i] = q.x; lut[2 * i + 1] = q.y; }
      return { lut, N };
    });
    const dots = [...svg.querySelectorAll(".parts circle")].map((c) => ({ c, k: +c.dataset.k, p: +c.dataset.p }));
    return { svg, slide: svg.closest(".slide"), dur, rest, lanes, dots, raf: 0 };
  });
  function renderAt(st, t) {
    for (const { c, k, p } of st.dots) {
      const { lut, N } = st.lanes[k];
      const u = (((t / st.dur + p) % 1) + 1) % 1 * N, i = Math.min(N - 1, u | 0), f = u - i;
      c.setAttribute("cx", (lut[2 * i] + f * (lut[2 * i + 2] - lut[2 * i])).toFixed(1));
      c.setAttribute("cy", (lut[2 * i + 1] + f * (lut[2 * i + 3] - lut[2 * i + 1])).toFixed(1));
    }
  }
  const RAMP = 1400; // ms for the flow to ease from still to full speed
  function runStreams() {
    for (const st of streams) {
      cancelAnimationFrame(st.raf); st.raf = 0;
      renderAt(st, st.rest);
      if (reduced || isPresenter || isPdf || printing || document.hidden || !st.slide.classList.contains("is-active")) continue;
      const t0 = performance.now();
      const tick = (now) => {
        const e = now - t0, r = Math.min(1, e / RAMP);
        // speed follows smoothstep 0→1; position is its integral, so there is no jolt
        const adv = (e < RAMP ? RAMP * (r * r * r - (r * r * r * r) / 2) : RAMP / 2 + (e - RAMP)) / 1000;
        renderAt(st, st.rest + adv);
        st.raf = requestAnimationFrame(tick);
      };
      st.raf = requestAnimationFrame(tick);
    }
  }
  /* One resting-frame path for print and reduced motion. CSS motion already
     lives only under (prefers-reduced-motion: no-preference) and print sets
     animation:none, so the JS clock is the only thing left to stop. */
  function freezeFinal() {
    streams.forEach((st) => { cancelAnimationFrame(st.raf); st.raf = 0; renderAt(st, st.rest); });
  }
  function settleSlide() {
    slides.forEach((s) => s.classList.remove("play"));
    joinLabel();
    freezeFinal();
  }
  addEventListener("beforeprint", () => { printing = true; settleSlide(); wireGifs(document); });
  addEventListener("afterprint", () => { printing = false; runStreams(); wireGifs(document); });
  document.addEventListener("visibilitychange", runStreams);
  motion.addEventListener("change", () => {
    reduced = motion.matches;
    if (reduced) settleSlide(); else runStreams();
    wireGifs(document);
  });
  if (reduced) freezeFinal();

  /* ── Boot ────────────────────────────────────────────── */
  wireGifs(document);
  fit();
  if (isPresenter) buildPresenter();
  show(fromHash(), { fromPeer: isPresenter });
  if (isPresenter && peer && !peer.closed) peer.postMessage({ deck: 1, ready: true }, peerTargetOrigin);
})();
