/* ==========================================================================
   About page — scroll-driven farmer film built from image frames.
   Frames: /farmerframes/ezgif-frame-001.jpg, -002.jpg, … (the number of
   frames is found automatically; or set data-count="240" on #abFilm).
   Scroll down = the film plays forward; scroll up = it plays back.
   At the end the wheat ear rushes toward you and the page fades into
   the Company Profile.
   ========================================================================== */
(function () {
  var sec = document.getElementById("abFilm"); if (!sec) return;
  var cv = sec.querySelector(".abf-canvas"), ctx = cv.getContext("2d");
  var stage = sec.querySelector(".abf-stage"), veil = sec.querySelector(".abf-veil"), pin = sec.querySelector(".abf-pin");
  var copy = sec.querySelector(".abf-copy"), mid = sec.querySelector(".abf-mid"), cue = sec.querySelector(".abf-cue");
  var base = sec.dataset.frames || "/farmerframes/ezgif-frame-", ext = sec.dataset.ext || ".jpg", pad = +(sec.dataset.pad || 3);
  var mobile = matchMedia("(max-width: 760px)").matches;
  var step = mobile ? 2 : 1;                 // phones load every 2nd frame (half the data, still smooth)
  var N = +(sec.dataset.count || 0), imgs = [], shown = -1, cur = 0, need = true, lastIdx = -1;
  var END = +(sec.dataset.end || 222);         // film stops on this frame: the whole wheat ear, mid-air
  var url = function (i) { return base + String(i + 1).padStart(pad, "0") + ext; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var sm = function (a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

  function exists(i) { return fetch(url(i - 1), { method: "HEAD" }).then(function (r) { return r.ok; }).catch(function () { return false; }); }
  function countFrames() {
    if (N) return Promise.resolve(N);
    var hi = 64;
    function grow() { return exists(hi).then(function (ok) { if (ok && hi < 4096) { hi *= 2; return grow(); } return search(hi / 2, hi); }); }
    function search(lo, h) {            // lo exists (or 0), h does not
      if (h - lo <= 1) return Promise.resolve(lo);
      var m = (lo + h) >> 1;
      return exists(m).then(function (ok) { return ok ? search(m, h) : search(lo, m); });
    }
    return exists(1).then(function (ok) { return ok ? grow() : 0; });
  }

  function size() {
    var d = Math.min(window.devicePixelRatio || 1, 1.6);
    cv.width = Math.round(cv.clientWidth * d); cv.height = Math.round(cv.clientHeight * d); shown = -1; need = true;
  }
  function nearest(i) {                        // closest frame that has finished loading
    for (var k = 0; k < N; k++) {
      var a = imgs[i - k], b = imgs[i + k];
      if (a && a.done) return a; if (b && b.done) return b;
    }
    return null;
  }
  function draw(i) {
    var im = nearest(i); if (!im) return;
    if (im === shown) return; shown = im;
    var cw = cv.width, ch = cv.height, iw = im.naturalWidth, ih = im.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  function load(order) {
    order.forEach(function (i) {
      if (imgs[i]) return;
      var im = new Image(); im.decoding = "async";
      im.onload = function () { im.done = true; need = true; };
      im.src = url(i); imgs[i] = im;
    });
  }

  var mx = 0, my = 0;
  addEventListener("pointermove", function (e) { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  function frame() {
    requestAnimationFrame(frame);
    var r = sec.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;            // off screen: do nothing
    var p = clamp(-r.top / (r.height - innerHeight), 0, 1);
    /* data-rise on #abFilm: the next section slides up over the film (like the Products page)
       instead of the film fading to white. The film finishes playing just before that starts. */
    var rise = sec.hasAttribute("data-rise"), riseAt = rise ? (r.height - 2 * innerHeight) / (r.height - innerHeight) : 1;
    var vp = sm(0, rise ? riseAt : .86, p);                      // film plays over the first part of the scroll
    if (N) {
      var last = Math.min(N, END) - 1, tgt = vp * last;
      cur += (tgt - cur) * .22; if (Math.abs(tgt - cur) < .02) cur = tgt;
      var idx = Math.round(cur / step) * step;
      if (need || idx !== lastIdx) { need = false; lastIdx = idx; shown = -1; draw(idx); }
    }
    /* 3D feel: slow push-in while it plays, the wheat rushes toward you at the end, and a gentle lean to the mouse */
    var push = 1 + vp * .1;
    var lean = 1 - sm(.78, .85, p);                              // stop leaning before the wheat lifts out
    stage.style.transform = "perspective(1200px) rotateX(" + (my * -2.2 * lean) + "deg) rotateY(" + (mx * 3 * lean) + "deg) scale(" + push.toFixed(4) + ")";
    if (rise) {
      var lv = clamp((2 * innerHeight - r.bottom) / innerHeight, 0, 1);   // 0 → 1 while the next section covers the film
      pin.style.transform = lv > 0.001 ? "perspective(1400px) translate3d(0," + (-lv * 3).toFixed(2) + "%,0) rotateX(" + (-lv * 6).toFixed(2) + "deg) scale(" + (1 - lv * 0.1).toFixed(3) + ")" : "";
      pin.style.filter = lv > 0.001 ? "brightness(" + (1 - lv * 0.55).toFixed(2) + ")" : "";
      veil.style.opacity = 0;
    } else veil.style.opacity = sm(.87, .96, p).toFixed(3);    // the field melts to white, the wheat ear stays
    copy.style.opacity = (1 - sm(.02, .14, p)).toFixed(3);
    copy.style.transform = "translate3d(0," + (-sm(.02, .14, p) * 60) + "px,0)";
    var mo = sm(.36, .44, p) * (1 - sm(.6, .68, p));
    mid.style.opacity = mo.toFixed(3); mid.style.transform = "translate3d(0," + ((1 - mo) * 30) + "px,0)";
    cue.style.opacity = (1 - sm(0, .04, p)).toFixed(3);
  }

  size(); addEventListener("resize", size);
  countFrames().then(function (n) {
    N = n; if (!N) { sec.classList.add("no-frames"); return; }
    sec.classList.add("ready");
    var all = [];
    for (var s = 16; s >= step; s /= 2) {                        // coarse first, then fill in → it plays right away
      for (var i = 0; i < Math.min(N, END); i += s) if (all.indexOf(i) < 0 && i % step === 0) all.push(i);
      if (s === 1) break;
    }
    if (all.indexOf(Math.min(N, END) - 1) < 0) all.push(Math.min(N, END) - 1);
    var k = 0; (function batch() { load(all.slice(k, k + 24)); k += 24; if (k < all.length) setTimeout(batch, 60); })();
  });
  requestAnimationFrame(frame);

  /* ---------- the SAME wheat ear from the film lifts out and flies, rotating in 3D, into the Company Profile card.
     /images/wheat-from-film.png is cut out of frame 222 of the film, so it sits exactly on top of the ear in the video.
     EAR = where that cut-out sits inside the 1280×720 frame (left, top, width, height as fractions).
     Photo shown in the card when it lands: data-land-img on #abFilm (default /products/img/cereals.jpg). ---------- */
  (function () {
    var card = document.querySelector("#profile .ab-photo-face"); if (!card) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var EAR = (sec.dataset.ear || "0.2844,0.0708,0.6031,0.6986").split(",").map(Number), FW = 1280, FH = 720;
    var flySrc = sec.dataset.flyImg || "/images/wheat-from-film.png", landSrc = sec.dataset.landImg || "/products/img/cereals.jpg";
    var fly = document.createElement("img"); fly.className = "abf-fly"; fly.alt = ""; fly.setAttribute("aria-hidden", "true");
    var land = document.createElement("img"); land.className = "abf-land"; land.alt = "Wheat";
    var ok = true;
    fly.onerror = function () { ok = false; fly.remove(); land.style.opacity = 1; };
    land.onerror = function () { land.onerror = null; land.src = flySrc; land.classList.add("cut"); };
    if (landSrc === flySrc) land.classList.add("cut");
    fly.src = flySrc; land.src = landSrc;
    document.body.appendChild(fly); card.appendChild(land);
    var lerp = function (a, b, k) { return a + (b - a) * k; };
    var ease = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    function earRect() {                       // where the ear is on screen right now (same maths as the canvas cover-fit)
      var b = stage.getBoundingClientRect(), s = Math.max(b.width / FW, b.height / FH);
      var fw = FW * s, fh = FH * s, fx = b.left + (b.width - fw) / 2, fy = b.top + (b.height - fh) / 2;
      return { left: fx + EAR[0] * fw, top: fy + EAR[1] * fh, width: EAR[2] * fw, height: EAR[3] * fh };
    }
    function tick() {
      requestAnimationFrame(tick);
      if (!ok || !N) return;
      var y = window.scrollY || window.pageYOffset, r = sec.getBoundingClientRect(), tb = card.getBoundingClientRect();
      var span = r.height - innerHeight, p = -r.top / span;
      var s0 = y + r.top + span * .9;                                 // lift-off once the field has melted away
      var s1 = y + tb.top - innerHeight * (innerWidth < 760 ? .22 : .3);
      var q = s1 > s0 ? (y - s0) / (s1 - s0) : 1;
      land.style.opacity = q >= 1 ? 1 : q <= .78 ? 0 : (q - .78) / .22;
      var appear = sm(.858, .87, p);                                  // swaps in on the last film frame — no visible jump
      if (appear <= 0 || q >= 1) { fly.style.opacity = 0; return; }
      var a = earRect(), k = ease(clamp(q, 0, 1));
      var w = lerp(a.width, tb.width, k), h = lerp(a.height, tb.height, k);
      var x = lerp(a.left, tb.left, k), yy = lerp(a.top, tb.top, k) - Math.sin(Math.PI * k) * innerHeight * .08;
      fly.style.width = w + "px"; fly.style.height = h + "px";
      fly.style.transform = "translate3d(" + x + "px," + yy + "px,0) perspective(900px) rotateZ(" + (-360 * k) + "deg) rotateY(" + (Math.sin(Math.PI * k) * 40) + "deg)";
      fly.style.filter = "drop-shadow(0 " + (30 * k) + "px " + (30 * k) + "px rgba(0,0,0," + (.3 * k).toFixed(3) + "))";
      fly.style.opacity = (appear * (q > .8 ? 1 - (q - .8) / .2 : 1)).toFixed(3);
    }
    requestAnimationFrame(tick);
  })();
})();