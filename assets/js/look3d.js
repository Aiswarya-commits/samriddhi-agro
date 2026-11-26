/* ==========================================================================
   look3d.js — "look-around" 3D for a scroll film hero (.ab-film[data-look]).
   The film turns and shifts with where you look from, and the title floats
   in front of it at its own depth:
     • laptops / desktops : follows the mouse
     • laptops with a camera: optional "Use camera for 3D" button — follows your head
       (face tracking runs on the visitor's own computer; nothing is recorded or sent)
     • phones / tablets   : follows the device tilt (iPhone asks once: "Tap for 3D view")
     • otherwise          : a slow, gentle drift so it never looks flat
   Only runs on pages whose film has data-look. Touches nothing that
   about-film.js moves (it transforms the canvas and the text pieces inside
   the copy, which the film script leaves alone).
   ========================================================================== */
(function () {
  var sec = document.querySelector(".ab-film[data-look]");
  if (!sec) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var stage = sec.querySelector(".abf-stage"), canvas = sec.querySelector(".abf-canvas");
  if (!stage || !canvas) return;
  var layers = [   // [element, how far it floats (px), tilt (deg)] — bigger = closer to you
    [sec.querySelector(".abf-copy .crumbs"), 10, 0],
    [sec.querySelector(".abf-copy h1"), 26, 5],
    [sec.querySelector(".abf-copy .ab-tag"), 16, 0],
    [sec.querySelector(".abf-mid p"), 20, 3],
    [sec.querySelector(".abf-mid .mono"), 12, 0]
  ].filter(function (l) { return l[0]; });

  /* depth styles: the stage gets perspective so the canvas can turn in 3D;
     the canvas is a little larger than the screen so its edges never show */
  var css = document.createElement("style");
  css.textContent =
    ".ab-film[data-look] .abf-stage{perspective:1100px;perspective-origin:50% 50%}" +
    "@media (hover:none){.ab-film[data-look] .abf-stage{perspective:700px}}" +   /* deeper 3D on phones */
    ".ab-film[data-look] .abf-canvas{transform:scale(1.14);transform-origin:50% 50%;will-change:transform;backface-visibility:hidden}" +
    ".ab-film[data-look] .abf-copy h1,.ab-film[data-look] .abf-mid p{will-change:transform;transform-origin:20% 50%}" +
    ".look3d-tap{position:absolute;left:50%;bottom:104px;white-space:nowrap;transition:opacity .4s;z-index:5;transform:translateX(-50%);display:none;align-items:center;gap:8px;" +
    "padding:10px 16px;border:1px solid rgba(255,255,255,.35);border-radius:999px;background:rgba(10,30,18,.45);color:#fff;" +
    "font:500 12px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;cursor:pointer;" +
    "-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}" +
    ".look3d-tap.show{display:inline-flex}" +
    ".look3d-tap svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}";
  document.head.appendChild(css);

  var tx = 0, ty = 0;      // where we want to look from (-1 … 1)
  var x = 0, y = 0;        // where we are now (eased)
  var amp = 0;             // 0 = mouse / tilt strength, 1 = camera strength
  var ah = 0;              // 1 while the camera is steering (eased)
  var PH = !matchMedia("(hover: hover) and (pointer: fine)").matches;   // phone / tablet: extra-strong camera mode
  var tz = 0, z = 0;       // camera only: how close you are (-1 far … 1 near)
  var source = "drift";    // "mouse" | "head" | "tilt" | "drift"
  var lastInput = 0;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------- laptops: the mouse ---------- */
  var finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer) {
    addEventListener("mousemove", function (e) {
      if (source === "head") return;   // the camera is steering
      source = "mouse"; lastInput = performance.now();
      tx = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      ty = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
    }, { passive: true });
    document.addEventListener("mouseleave", function () { if (source !== "head") { tx = 0; ty = 0; } });
  }

  /* ---------- laptops and phones: optional head tracking with the camera ---------- */
  var VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  var MODEL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
  var cam = null;   // { btn, dock, video, stream, detector, on, wanted }
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext) {
    css.textContent +=
      ".look3d-cam-dock{position:absolute;left:24px;bottom:24px;z-index:5;display:none;align-items:center;gap:10px;padding:6px 6px 6px 8px;" +
      "border-radius:999px;background:rgba(10,30,18,.5);color:#fff;font:500 11px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;" +
      "-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.25)}" +
      ".look3d-cam-dock.show{display:inline-flex}" +
      ".look3d-cam-dock video{position:absolute;left:0;top:0;width:2px;height:2px;opacity:.01;pointer-events:none}" +   /* kept running for tracking, never shown */
      ".look3d-cam-dock svg{width:16px;height:16px;margin-left:8px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
      ".look3d-cam-dock button{all:unset;cursor:pointer;padding:6px 8px;border-radius:999px;background:rgba(255,255,255,.15)}" +
      ".look3d-cam-dock button:hover{background:rgba(255,255,255,.3)}" +
      "@media (hover:none),(max-width:760px){.look3d-cam-dock{left:50%;bottom:104px;transform:translateX(-50%);white-space:nowrap}.look3d-cam-dock .lbl{display:none}}";
    cam = { on: false, wanted: false };
    cam.btn = document.createElement("button");
    cam.btn.type = "button"; cam.btn.className = "look3d-tap show";
    cam.btn.title = "Move your head to look around. The camera image stays on your device — nothing is recorded or sent.";
    cam.btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 10l5-3v10l-5-3z"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg><span>Use camera for 3D</span>';
    cam.dock = document.createElement("div"); cam.dock.className = "look3d-cam-dock";
    cam.video = document.createElement("video"); cam.video.muted = true; cam.video.playsInline = true; cam.video.setAttribute("playsinline", "");
    var label = document.createElement("span"); label.className = "lbl"; label.textContent = "Move your head";
    var stopBtn = document.createElement("button"); stopBtn.type = "button"; stopBtn.textContent = "Stop camera";
    var camIcon = document.createElement("span"); camIcon.setAttribute("aria-hidden", "true");
    camIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 10l5-3v10l-5-3z"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg>';
    cam.dock.appendChild(cam.video); cam.dock.appendChild(camIcon); cam.dock.appendChild(label); cam.dock.appendChild(stopBtn);
    var pinEl = sec.querySelector(".abf-pin") || sec;
    pinEl.appendChild(cam.btn); pinEl.appendChild(cam.dock);
    window.__look3dTap = cam.btn;
    var say = function (s) { cam.btn.querySelector("span").textContent = s; };

    var loadDetector = function () {
      if (cam.detectorP) return cam.detectorP;
      cam.detectorP = import(VISION + "/vision_bundle.mjs").then(function (V) {
        return V.FilesetResolver.forVisionTasks(VISION + "/wasm").then(function (files) {
          var opts = function (d) { return { baseOptions: { modelAssetPath: MODEL, delegate: d }, runningMode: "VIDEO", minDetectionConfidence: 0.5 }; };
          return V.FaceDetector.createFromOptions(files, opts("GPU")).catch(function () { return V.FaceDetector.createFromOptions(files, opts("CPU")); });
        });
      });
      cam.detectorP.catch(function () { cam.detectorP = null; });
      return cam.detectorP;
    };

    var startCam = function () {
      cam.wanted = true; say("Starting camera…");
      return Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } }, audio: false }),
        loadDetector()
      ]).then(function (r) {
        if (!cam.wanted) { r[0].getTracks().forEach(function (t) { t.stop(); }); return; }
        cam.stream = r[0]; cam.detector = r[1];
        cam.video.srcObject = cam.stream; cam.resetDistance(); return cam.video.play().then(function () {
          cam.on = true; source = "head"; lastInput = performance.now();
          cam.btn.classList.remove("show"); cam.dock.classList.add("show");
        });
      }).catch(function (err) {
        cam.wanted = false; stopCam(true);
        var fb = finePointer ? "using mouse" : "using tilt";
        say(err && err.name === "NotAllowedError" ? "Camera blocked — " + fb : "Camera unavailable — " + fb);
        setTimeout(function () { say("Use camera for 3D"); }, 3500);
      });
    };
    var stopCam = function (keepWanted) {
      if (!keepWanted) cam.wanted = false;
      cam.on = false;
      if (cam.stream) cam.stream.getTracks().forEach(function (t) { t.stop(); });
      cam.stream = null; cam.video.srcObject = null;
      cam.dock.classList.remove("show"); cam.btn.classList.add("show"); say("Use camera for 3D");
      if (source === "head") { source = finePointer ? "mouse" : "drift"; tx = 0; ty = 0; }
      tz = 0;
    };
    cam.btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (askMotion) askMotion();   // iPhone: the same tap also allows the tilt, used if the camera is refused
      if (!cam.on) startCam();
    });
    stopBtn.addEventListener("click", function (e) { e.stopPropagation(); stopCam(false); });
    cam.stopForAway = function () { if (cam.on) { stopCam(true); } };            // camera light goes off when you scroll past the film
    cam.resume = function () { if (cam.wanted && !cam.on && !cam.stream) startCam(); };

    var lastT = -1, fx = 0.5, fy = 0.45, baseW = 0.2, baseN = 0, fwS = 0.2;
    cam.resetDistance = function () { baseN = 0; };
    cam.track = function (now) {
      if (!cam.on || !cam.detector || cam.video.readyState < 2 || cam.video.currentTime === lastT) return;
      lastT = cam.video.currentTime;
      var res; try { res = cam.detector.detectForVideo(cam.video, now); } catch (e) { return; }
      var d = res && res.detections && res.detections[0]; if (!d || !d.boundingBox) return;
      var bb = d.boundingBox, vw = cam.video.videoWidth || 320, vh = cam.video.videoHeight || 240;
      var cx = (bb.originX + bb.width / 2) / vw, cy = (bb.originY + bb.height / 2) / vh;
      fx += (cx - fx) * 0.5; fy += (cy - fy) * 0.5;                     // steadies small jitters
      // distance: a bigger face = you came closer. The first second sets your normal distance.
      var fw = bb.width / vw;
      if (baseN < 15) { baseW = baseN ? (baseW * baseN + fw) / (baseN + 1) : fw; baseN++; }
      else baseW += (fw - baseW) * 0.0015;                               // slowly settles if you sit differently
      fwS += (fw - fwS) * 0.35;
      tz = clamp((fwS / baseW - 1) * (PH ? 5 : 3.2), -1, 1);                        // -1 = leaned back, +1 = leaned in
      source = "head"; lastInput = now;
      // like a window: move your head right and the scene beyond slides the same way
      tx = clamp((fx - 0.5) * (PH ? 7 : 5), -1, 1);       // small head moves reach the full turn
      ty = clamp((0.45 - fy) * (PH ? 7 : 5), -1, 1);
    };
  }

  /* ---------- phones & tablets: the tilt ---------- */
  var base = null;
  function onTilt(e) {
    if (e.beta == null || e.gamma == null) return;
    var land = Math.abs((screen.orientation && screen.orientation.angle) || window.orientation || 0) === 90;
    var a = land ? e.beta : e.gamma, b = land ? e.gamma : e.beta;   // left-right, front-back
    if (land && ((screen.orientation && screen.orientation.angle) || window.orientation) < 0) { a = -a; b = -b; }
    if (!base) base = { a: a, b: b };
    base.a += (a - base.a) * 0.004; base.b += (b - base.b) * 0.004;   // slowly re-centres on how you hold the phone
    if (source === "head") return;   // the camera is steering
    source = "tilt"; lastInput = performance.now();
    tx = clamp((a - base.a) / 12, -1, 1);   // a small tilt reaches the full turn
    ty = clamp((b - base.b) / 12, -1, 1);
  }
  function listenTilt() { addEventListener("deviceorientation", onTilt, { passive: true }); }

  var DOE = window.DeviceOrientationEvent, askMotion = null;
  if (!finePointer && DOE) {
    if (typeof DOE.requestPermission === "function") {
      // iPhone / iPad: Apple needs one tap before the page can read the tilt
      var once = false, listenOnce = function () { if (!once) { once = true; listenTilt(); } };
      var tap = null;
      askMotion = function () {
        DOE.requestPermission().then(function (r) {
          if (r === "granted") { listenOnce(); try { sessionStorage.setItem("look3d", "1"); } catch (e) {} }
          if (tap) tap.classList.remove("show");
        }).catch(function () { if (tap) tap.classList.remove("show"); });
      };
      if (!cam) {   // no camera available: show the tilt button on its own
        tap = document.createElement("button");
        tap.type = "button"; tap.className = "look3d-tap";
        tap.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M3 9c-1 2-1 4 0 6M21 9c1 2 1 4 0 6"/></svg>Tap for 3D view';
        (sec.querySelector(".abf-pin") || sec).appendChild(tap);
        tap.addEventListener("click", function (e) { e.stopPropagation(); askMotion(); });
        window.__look3dTap = tap;
      }
      var granted = false; try { granted = sessionStorage.getItem("look3d") === "1"; } catch (e) {}
      if (granted) document.addEventListener("touchend", function first() { document.removeEventListener("touchend", first); askMotion(); }, { passive: true });
      else {
        // some phones already allow the tilt without asking: listen first, show the button only if nothing arrives
        listenOnce();
        if (tap) setTimeout(function () { if (source !== "tilt") tap.classList.add("show"); }, 900);
      }
    } else {
      listenTilt();   // Android and most other phones: works straight away
    }
  }

  /* ---------- draw ---------- */
  var visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (cam) { if (visible) cam.resume(); else cam.stopForAway(); }
  }).observe(sec);

  (function tick(now) {
    requestAnimationFrame(tick);
    if (!visible) return;
    if (cam) cam.track(now);
    if (window.__look3dTap) {   // the 3D button fades away once you start scrolling the film
      var r = sec.getBoundingClientRect(); window.__look3dTap.style.opacity = r.top < -innerHeight * 0.25 ? 0 : 1;
      window.__look3dTap.style.pointerEvents = r.top < -innerHeight * 0.25 ? "none" : "";
    }
    // no input for a while → slow drift so it still feels alive
    if (source === "drift" || now - lastInput > 4000) {
      var t = now / 1000;
      var dx = Math.sin(t * 0.35) * 0.45, dy = Math.sin(t * 0.27 + 1.3) * 0.3;
      if (source === "drift") { tx = dx; ty = dy; }
      else { tx += (dx - tx) * 0.01; ty += (dy - ty) * 0.01; }
    }
    var k = source === "tilt" || source === "head" ? 0.12 : 0.07;
    x += (tx - x) * k; y += (ty - y) * k;
    amp += ((source === "head" ? 1 : source === "tilt" ? 0.75 : 0) - amp) * 0.05;   // camera and tilt turn much further (eases in and out)
    if (source !== "head") tz = 0;
    z += (tz - z) * 0.08;
    ah += ((source === "head" ? 1 : 0) - ah) * 0.05;
    var P = PH ? ah : 0;                                     // phones with the camera on: much stronger
    var A = (1 + 1.7 * amp) * (z < 0 ? 1 + z * 0.3 : 1);   // leaning back also calms the turn so the edges stay covered
    var AS = A * (1 + 0.45 * P), AR = A * (1 + 1.1 * P);     // slide / turn strength
    // how far the film slides, in pixels, measured on the larger side of the screen (so narrow phones move as much as laptops)
    var W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight, D = Math.max(W, H * 1.25);
    var mx = 0.024 * AS * D, my = 0.018 * AS * D;
    // just enough zoom that the slid / turned film always covers the screen
    var cover = Math.max(1 + 2 * mx / W, 1 + 2 * my / H) + 0.035 * AR + 0.03 * P * AR;
    var neutral = Math.max(1.14 + 0.3 * amp, cover) + 0.35 * P;   // phones keep room to zoom out
    var S = neutral + (z > 0 ? z * (0.55 + 0.5 * P) : z * (0.12 + 0.25 * P));  // lean in → zoom in, lean back → zoom out
    if (S < cover) S = cover;
    var TS = 1 + z * 0.12;                                    // the words come towards you a little too

    // the film: turns towards where you look from and slides the other way (window parallax)
    canvas.style.transform =
      "translate3d(" + (-x * mx).toFixed(2) + "px," + (-y * my).toFixed(2) + "px,0) " +
      "rotateY(" + (x * 5 * AR).toFixed(3) + "deg) rotateX(" + (-y * 3.6 * AR).toFixed(3) + "deg) scale(" + S.toFixed(4) + ")";

    // the words: float in front, moving with you (less on narrow phones so they stay on screen)
    var TA = A * Math.min(1, W / 900);
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      L[0].style.transform = "perspective(900px) translate3d(" + (x * L[1] * TA).toFixed(2) + "px," + (y * L[1] * 0.7 * TA).toFixed(2) + "px,0)" + (TS !== 1 ? " scale(" + (1 + (TS - 1) * L[1] / 26).toFixed(4) + ")" : "") +
        (L[2] ? " rotateY(" + (x * L[2] * TA).toFixed(2) + "deg) rotateX(" + (-y * L[2] * 0.7 * TA).toFixed(2) + "deg)" : "");
    }
  })(performance.now());
})();