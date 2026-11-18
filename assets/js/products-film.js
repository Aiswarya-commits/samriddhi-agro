/* ==========================================================================
   Products page — scroll-driven product films.
   • Each video plays frame by frame with your scroll (scroll up = it rewinds).
   • Details (name, varieties, packing, buttons) appear as the video plays.
   • The next product rises from below over the current one; the current one
     tilts back and dims, like a card being covered in 3D.
   Only the film on screen is decoded; videos load one section ahead.
   ========================================================================== */
(function () {
  var secs = [].slice.call(document.querySelectorAll(".pf-sec")); if (!secs.length) return;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var FPS = 24;
  var S = secs.map(function (sec) {
    var s = { sec: sec, card: sec.querySelector(".pf-card"), v: sec.querySelector(".pf-video"), bar: sec.querySelector(".pf-bar"),
             ins: [].slice.call(sec.querySelectorAll(".pf-in")), loaded: false };
    /* FRAME MODE (data-frames on the section): the film is drawn from still images, like the Markets page,
       instead of a video — sharper and perfectly smooth. e.g. data-frames="/marketsframes/markets-frame-" data-end="190" */
    if (sec.dataset.frames) {
      var cv = document.createElement("canvas"); cv.className = "pf-video pf-frames";
      cv.style.backgroundImage = "url(" + sec.dataset.frames + "001" + (sec.dataset.ext || ".jpg") + ")";
      cv.style.backgroundSize = "cover"; cv.style.backgroundPosition = "center";
      s.v.parentNode.replaceChild(cv, s.v); s.v = cv;
      s.fr = { base: sec.dataset.frames, ext: sec.dataset.ext || ".jpg", n: +(sec.dataset.end || 0), imgs: [], ctx: cv.getContext("2d"), shown: -1 };
    }
    return s;
  });
  function frameUrl(f, i) { return f.base + String(i + 1).padStart(3, "0") + f.ext; }
  function loadFrames(s) {
    var f = s.fr, mobile = matchMedia("(max-width: 760px)").matches, step = mobile ? 2 : 1, order = [0], i, k;
    for (k = 16; k >= step; k /= 2) { for (i = 0; i < f.n; i += k) if (order.indexOf(i) < 0 && i % step === 0) order.push(i); if (k === 1) break; }
    if (order.indexOf(f.n - 1) < 0) order.push(f.n - 1);
    var at = 0; (function batch() {
      order.slice(at, at + 32).forEach(function (j) {
        var im = new Image(); im.decoding = "async";
        im.onload = function () { var ok = function () { im.done = true; f.shown = -1; }; if (im.decode) im.decode().then(ok, ok); else ok(); };
        im.src = frameUrl(f, j); f.imgs[j] = im;
      });
      at += 32; if (at < order.length) setTimeout(batch, 30);
    })();
  }
  function drawFrame(s, n) {
    var f = s.fr, cv = s.v, d = Math.min(window.devicePixelRatio || 1, 1.6);
    var w = Math.round(cv.clientWidth * d), h = Math.round(cv.clientHeight * d);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; f.shown = -1; }
    var im = null; for (var k = 0; k < f.n && !im; k++) { var a = f.imgs[n - k], b = f.imgs[n + k]; im = (a && a.done && a) || (b && b.done && b) || null; }
    if (!im || im === f.shown) return; f.shown = im;
    var sc = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * sc, ih = im.naturalHeight * sc;
    f.ctx.drawImage(im, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }

  /* Smooth on the live site: the video starts streaming at once, and in the background the whole file
     is downloaded; when it arrives the player switches to that in-memory copy (same frame), so
     scrubbing never waits for the network again. */
  function memoryCopy(v, url) {
    if (!window.fetch || !window.URL || !URL.createObjectURL) return;
    fetch(url).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
      if (!b) return;
      var t = v.currentTime || 0, u = URL.createObjectURL(b);
      v.addEventListener("loadedmetadata", function once() { v.removeEventListener("loadedmetadata", once); try { v.currentTime = t; } catch (e) {} });
      v.src = u; v.load();
    }).catch(function () {});
  }

  function load(s) {
    if (s.loaded) return; s.loaded = true;
    if (s.fr) { loadFrames(s); return; }
    s.v.src = s.v.dataset.src; s.v.preload = "auto";
    s.v.play().then(function () { s.v.pause(); }).catch(function () {});   // wakes the decoder on iOS
    memoryCopy(s.v, s.v.dataset.src);
  }
  load(S[0]);

  /* jump to a product: the index buttons on this page, and links from other pages (/products.html#pf-cotton) */
  function topOf(id) { var t = document.getElementById(id); return t ? t.getBoundingClientRect().top + (window.scrollY || pageYOffset) : null; }
  function go(id, instant) {
    var y = topOf(id); if (y === null) return;
    var i = secs.findIndex(function (s) { return s.id === id; });
    if (i >= 0) { load(S[i]); if (S[i - 1]) load(S[i - 1]); }
    if (window.lenis) window.lenis.scrollTo(y, instant ? { immediate: true, force: true } : { duration: 1.6 });
    else scrollTo({ top: y, behavior: instant ? "auto" : "smooth" });
  }
  [].forEach.call(document.querySelectorAll("[data-go]"), function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); go(a.dataset.go); history.replaceState(null, "", "#" + a.dataset.go); });
  });
  var hash = location.hash.slice(1);
  if (/^pf-/.test(hash) && document.getElementById(hash)) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    go(hash, true);
    [120, 500, 1200].forEach(function (ms) { setTimeout(function () { go(hash, true); }, ms); });   // again after fonts/loader settle
  }

  function set(s, key, el, prop, val) {
    if (s[key] === val) return; s[key] = val;
    if (prop.charAt(0) === "-") el.style.setProperty(prop, val); else el.style[prop] = val;
  }
  function tick() {
    requestAnimationFrame(tick);
    var H = innerHeight;
    for (var i = 0; i < S.length; i++) {
      var s = S[i], r = s.sec.getBoundingClientRect();
      if (r.bottom < -H || r.top > H * 1.6) continue;             // far away: nothing to do
      if (r.top < H * 1.6) load(s);
      if (S[i + 1] && r.top < H) load(S[i + 1]);                  // get the next film ready
      var play = r.height - 2 * H;                                // scroll used for playing (the last screen is the hand-over)
      var p = clamp(-r.top / play, 0, 1);                         // 0 → 1 while this film is on screen alone
      var enter = i ? clamp((H - r.top) / H, 0, 1) : 1;           // rising up from below
      var leave = S[i + 1] ? clamp((2 * H - r.bottom) / H, 0, 1) : 0;   // being covered by the next one

      /* 3D: rises flat from a slight tilt; when covered it sinks back, shrinks and dims */
      var rx = (1 - enter) * 12 - leave * 6, sc = (0.94 + 0.06 * enter) * (1 - leave * 0.1), ty = leave * -3;
      /* styles are only written when they really change (rounded), so nothing moves once you stop scrolling */
      set(s, "ct", s.card, "transform", "translate3d(0," + ty.toFixed(2) + "%,0) rotateX(" + rx.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")");
      set(s, "cf", s.card, "filter", leave > 0.002 ? "brightness(" + (1 - leave * 0.55).toFixed(2) + ")" : "");
      set(s, "vt", s.v, "transform", "translateZ(0) scale(" + (1.12 - 0.12 * enter + p * 0.06).toFixed(3) + ")");      // slow push-in while playing
      if (s.bar) set(s, "bp", s.bar, "--p", p.toFixed(3));

      /* details appear in order */
      for (var k = 0; k < s.ins.length; k++) s.ins[k].classList.toggle("on", enter > 0.85 && p >= +s.ins[k].dataset.at);

      /* video follows the scroll, whole frames only (no shiver when you stop) */
      /* whole frames only, aimed at the MIDDLE of each frame (never on the edge between two frames),
         and only when the frame number changes — so a still scroll means a perfectly still picture */
      if (s.fr) { if (s.fr.n) drawFrame(s, Math.round(p * (s.fr.n - 1))); continue; }
      var v = s.v, d = v.duration;
      if (d && isFinite(d) && v.readyState >= 1) {
        var frames = Math.max(1, Math.floor(d * FPS) - 1);
        var n = Math.round(p * frames);
        if (n !== s.idx && Math.abs(n - (s.want == null ? -9 : s.want)) >= 1 && !v.seeking) {
          s.want = n; v.currentTime = (n + 0.5) / FPS;
        }
        s.idx = s.want;
      }
    }
  }
  requestAnimationFrame(tick);
})();