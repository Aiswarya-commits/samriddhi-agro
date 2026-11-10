/* ==========================================================================
   Samriddhi — home hero "film"
   1. hero-wheat video plays ONLY with the scroll (+ 3D camera push-in)
   2. Company Introduction over the grain
   3. smoke transition → plant scene, text lights up word by word, hotspots
   4. smoke transition → rocks scene with the six commodities
   Self-contained: touches only #top (the hero section).
   ========================================================================== */
(function () {
  "use strict";
  /* ---- SETTINGS (share of the hero's scroll, 0 → 1) ---- */
  var INTRO_PLAY = 1.2;       // seconds the wheat video plays by itself on load
  var FPS = 24;               // frame rate of hero-wheat.mp4
  var VIDEO_END = 0.25;       // wheat video finished at this point
  var MAX_ZOOM = 1.35;        // camera push-in on the wheat video
  var T = {
    introIn: [0.23, 0.28], introOut: [0.34, 0.38],
    plantIn: [0.37, 0.42], storyIn: [0.44, 0.48], storyWords: [0.46, 0.6], storyOut: [0.62, 0.66],
    rocksIn: [0.64, 0.69], rangeIn: [0.69, 0.73], rangeSteps: [0.73, 0.97]
  };
  var SMOKE_PEAKS = [0.395, 0.665];  // the smoke transition is strongest at these points
  /* --------------------------------------------------------- */

  var hero = document.getElementById("top");
  var vid = document.getElementById("filmVideo");
  if (!hero || !vid) return;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("filmStage"), shade = $("filmShade"), copy = $("filmCopy"), tags = $("filmTags"), intro = $("filmIntro");
  var plant = $("scenePlant"), rocks = $("sceneRocks"), mist = $("filmMist"), smoke = $("filmSmoke");
  var story = $("filmStory"), range = $("filmRange");
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = matchMedia("(max-width: 760px)").matches || (navigator.connection && navigator.connection.saveData);

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function sm(r, t) { var x = clamp((t - r[0]) / (r[1] - r[0]), 0, 1); return x * x * (3 - 2 * x); }
  function show(el, o, extra) {
    if (!el) return;
    var v = o.toFixed(3);
    if (el.__o !== v) { el.__o = v; el.style.opacity = v; el.style.visibility = o < 0.005 ? "hidden" : "visible"; }
    if (extra !== undefined && el.__t !== extra) { el.__t = extra; el.style.transform = extra; }
  }

  /* ---------- 1. wheat video ---------- */
  var dur = 0, shownFrame = -1, wantFrame = 0, introDone = false, readyCalled = false, visible = true;
  function ready() { if (!readyCalled) { readyCalled = true; window.samriddhiReady && window.samriddhiReady(); } }
  vid.muted = true; vid.playsInline = true;
  vid.src = (small && vid.dataset.srcMobile) || vid.dataset.src;
  vid.addEventListener("loadedmetadata", function () { dur = vid.duration || 0; });
  vid.addEventListener("loadeddata", ready);
  vid.addEventListener("error", ready);
  setTimeout(ready, 2500);
  vid.load();
  var pr = vid.play();
  function stopIntro() { if (introDone) return; introDone = true; if (!vid.paused) vid.pause(); shownFrame = Math.round(vid.currentTime * FPS); smoothF = shownFrame; }
  if (pr && pr.then) pr.then(function () {
    if (reduced || progress() > 0.005) return stopIntro();
    (function watch() { if (introDone) return; if (vid.currentTime >= INTRO_PLAY || progress() > 0.005) stopIntro(); else requestAnimationFrame(watch); })();
  }).catch(stopIntro); else stopIntro();

  /* seek by whole frames only, and only when the wanted frame changes → no idle shaking */
  var smoothF = 0;
  function driveVideo(v) {
    if (!introDone || !dur) return;
    var last = Math.floor((dur - 0.06) * FPS), first = Math.round(INTRO_PLAY * FPS);
    wantFrame = Math.round(first + v * (last - first));
    smoothF += (wantFrame - smoothF) * (reduced ? 1 : 0.2);
    if (Math.abs(wantFrame - smoothF) < 0.5) smoothF = wantFrame;
    var f = Math.round(smoothF);
    if (f !== shownFrame && !vid.seeking) { shownFrame = f; vid.currentTime = (f + 0.5) / FPS; }
  }

  /* ---------- scene videos: load after the hero is up, play only while seen ---------- */
  var loops = [];
  [plant, rocks, smoke].forEach(function (box) {
    var v = box && box.querySelector("video");
    if (!v) return;
    if (small && v.dataset.posterMobile) v.poster = v.dataset.posterMobile;
    loops.push({ box: box, v: v, loaded: false });
  });
  function loadLoops() {
    loops.forEach(function (l) {
      if (l.loaded) return; l.loaded = true;
      l.v.preload = "auto"; l.v.src = (small && l.v.dataset.srcMobile) || l.v.dataset.src; l.v.load();
    });
  }
  setTimeout(loadLoops, 3500);
  function playIf(l, on) {
    if (on) { if (!l.loaded) loadLoops(); if (l.v.paused) { var q = l.v.play(); if (q && q.catch) q.catch(function () {}); } }
    else if (!l.v.paused) l.v.pause();
  }

  /* ---------- story text lights up word by word ---------- */
  var words = [];
  var st = story && story.querySelector(".story-text");
  if (st) {
    st.innerHTML = st.textContent.trim().split(/\s+/).map(function (w) { return '<span class="wd">' + w + "</span>"; }).join(" ");
    words = Array.prototype.slice.call(st.querySelectorAll(".wd"));
  }

  /* ---------- commodity list + card ---------- */
  var items = range ? Array.prototype.slice.call(range.querySelectorAll(".range-list a")) : [];
  var rImg = $("rangeImg"), rMedia = $("rangeMedia"), rFb = $("rangeFb"), current = -1, hoverIdx = -1;
  function setItem(i) {
    if (i === current || !items[i]) return;
    current = i;
    items.forEach(function (a, k) { a.classList.toggle("on", k === i); });
    var slug = items[i].dataset.slug, name = items[i].dataset.name;
    rMedia.classList.add("swap");
    setTimeout(function () {
      rMedia.classList.remove("missing");
      rImg.alt = name; rFb.textContent = name;
      rImg.onload = function () { rMedia.classList.remove("swap"); };
      rImg.onerror = function () { rMedia.classList.add("missing"); rMedia.classList.remove("swap"); };
      rImg.src = "/products/img/" + slug + ".jpg";
    }, 220);
  }
  items.forEach(function (a, k) {
    a.addEventListener("mouseenter", function () { hoverIdx = k; setItem(k); });
    a.addEventListener("mouseleave", function () { hoverIdx = -1; });
  });
  if (items.length) setItem(0);

  function progress() {
    var r = hero.getBoundingClientRect(), total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);

  var lastP = -1;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) { loops.forEach(function (l) { playIf(l, false); }); return; }
    var p = progress();
    var v = clamp(p / VIDEO_END, 0, 1);
    driveVideo(v);
    if (Math.abs(p - lastP) < 0.00002) return;   // nothing moved → touch nothing
    lastP = p;

    /* wheat: camera push-in, headline out */
    if (!reduced) {
      var e = Math.pow(v, 1.3);
      var tf = "perspective(1400px) rotateX(" + (6 * Math.sin(v * Math.PI)).toFixed(2) + "deg) scale(" + (1 + (MAX_ZOOM - 1) * e).toFixed(4) + ")";
      if (stage.__t !== tf) { stage.__t = tf; stage.style.transform = tf; }
    }
    var out = sm([0.008, 0.06], p);
    show(copy, 1 - out, "translate3d(0," + (-70 * out).toFixed(1) + "px,0)");
    show(tags, 1 - sm([0, 0.03], p));
    shade.style.opacity = (1 - 0.55 * sm([0.12, 0.2], p)).toFixed(3);

    /* Company Introduction */
    var inn = sm(T.introIn, p) * (1 - sm(T.introOut, p));
    show(intro, inn, "translate(-50%, " + (-46 + (1 - sm(T.introIn, p)) * 6 - sm(T.introOut, p) * 8).toFixed(2) + "%)");

    /* scenes */
    var pl = sm(T.plantIn, p) * (1 - sm(T.rocksIn, p));
    var rk = sm(T.rocksIn, p);
    show(stage, 1 - sm(T.plantIn, p));
    show(plant, pl);
    show(rocks, rk);
    var pv = plant.querySelector("video"), rv = rocks.querySelector("video");
    if (!reduced) {
      var a = sm([T.plantIn[0], T.storyOut[1]], p), b = sm([T.rocksIn[0], 1], p);
      pv.style.transform = "scale(" + (1.12 - 0.1 * a).toFixed(4) + ")";
      rv.style.transform = "scale(" + (1.1 - 0.08 * b).toFixed(4) + ")";
    }
    mist.style.opacity = sm(T.plantIn, p).toFixed(3);

    /* smoke transitions */
    var sk = 0;
    SMOKE_PEAKS.forEach(function (c) { sk = Math.max(sk, 1 - clamp(Math.abs(p - c) / 0.045, 0, 1)); });
    show(smoke, sk * 0.95);

    /* plant story */
    var so = sm(T.storyIn, p) * (1 - sm(T.storyOut, p));
    show(story, so);
    var wp = sm(T.storyWords, p) * words.length;
    words.forEach(function (w, i) { var on = i < wp; if (w.__on !== on) { w.__on = on; w.classList.toggle("on", on); } });
    story.classList.toggle("hs-on", p > T.storyWords[0] + 0.04 && so > 0.5);

    /* rocks: commodity range */
    show(range, sm(T.rangeIn, p));
    if (hoverIdx < 0 && items.length && p >= T.rangeIn[0]) {
      setItem(clamp(Math.floor(sm(T.rangeSteps, p) * items.length), 0, items.length - 1));
    }

    playIf(loops[0], pl > 0.01);
    playIf(loops[1], rk > 0.01);
    playIf(loops[2], sk > 0.01);
  }
  requestAnimationFrame(frame);
})();
