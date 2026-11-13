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
    return { sec: sec, card: sec.querySelector(".pf-card"), v: sec.querySelector(".pf-video"), bar: sec.querySelector(".pf-bar"),
             ins: [].slice.call(sec.querySelectorAll(".pf-in")), loaded: false };
  });
  function load(s) {
    if (s.loaded) return; s.loaded = true;
    s.v.src = s.v.dataset.src; s.v.preload = "auto";
    s.v.play().then(function () { s.v.pause(); }).catch(function () {});   // wakes the decoder on iOS
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