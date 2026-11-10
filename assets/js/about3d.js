/* ==========================================================================
   Samriddhi — About page 3D (loaded only by about.html)
   1. Hero: a sphere of 3D grains that turns with the mouse and bursts apart
      as you scroll.
   2. Mission → Vision: a glass prism that rotates with the scroll.
   3. Core values: a 3D ring of cards (drag, swipe or scroll to turn).
   4. Offices: a 3D dot map of India with glowing pins for each office.
   Every scene pauses when off-screen.
   ========================================================================== */
import * as THREE from "/assets/js/vendor/three.module.min.js";
import { LAND } from "/assets/js/land.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 760px)").matches;
const DPR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const scrollY0 = () => (window.lenis ? window.lenis.scroll : scrollY);
const onScroll = (fn) => { if (window.lenis) window.lenis.on("scroll", fn); else addEventListener("scroll", fn, { passive: true }); fn(); };
function watch(el) { const s = { v: false }; new IntersectionObserver((e) => { s.v = e[0].isIntersecting; }, { rootMargin: "100px" }).observe(el); return s; }
function renderer(canvas, alpha = true) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha });
  r.setPixelRatio(DPR); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; return r;
}

/* ---------------- 1. hero grain sphere ---------------- */
function grains() {
  const canvas = document.getElementById("abGrains"), hero = document.getElementById("abHero");
  if (!canvas) return;
  const R = renderer(canvas), scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  cam.position.set(0, 0, 8.5);
  scene.add(new THREE.HemisphereLight("#e8f0ff", "#14202c", 0.9));
  const k = new THREE.DirectionalLight("#fff1d6", 3); k.position.set(-4, 5, 6); scene.add(k);
  const rim = new THREE.DirectionalLight("#9cc3ff", 2); rim.position.set(5, -2, -5); scene.add(rim);

  const N = mobile ? 900 : 2200;
  const geo = new THREE.SphereGeometry(1, 10, 8); geo.scale(0.055, 0.1, 0.048);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }), N);
  const palette = ["#d9a441", "#e8c36a", "#f0d58c", "#b9852b", "#7bb34a", "#e6d3a8", "#c8572e", "#f4eee3"].map((c) => new THREE.Color(c));
  const home = [], burst = [], rot = [];
  const ga = Math.PI * (3 - Math.sqrt(5)), RAD = 2.35;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
    const p = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(RAD * (0.96 + Math.random() * 0.08));
    home.push(p);
    burst.push(p.clone().normalize().multiplyScalar(4 + Math.random() * 6).add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, Math.random() * 3)));
    rot.push(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    mesh.setColorAt(i, palette[i % palette.length]);
  }
  const group = new THREE.Group(); group.add(mesh); scene.add(group);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), E = new THREE.Euler();
  const st = { mx: 0, my: 0, sx: 0, sy: 0, b: 0, t: 0 };
  addEventListener("pointermove", (e) => { st.mx = e.clientX / innerWidth - 0.5; st.my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); group.position.x = w / h > 1.1 ? 2.9 : 0; group.position.y = w / h > 1.1 ? 0 : -2.6; }
  resize(); addEventListener("resize", resize);
  const vis = watch(hero), clock = new THREE.Clock();
  (function frame() {
    requestAnimationFrame(frame);
    if (!vis.v || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05); st.t += dt;
    const target = sm(0, 1, scrollY0() / (hero.offsetHeight * 0.9));
    st.b += (target - st.b) * Math.min(1, dt * 4);
    st.sx += (st.mx - st.sx) * Math.min(1, dt * 2); st.sy += (st.my - st.sy) * Math.min(1, dt * 2);
    group.rotation.y = st.t * (reduced ? 0 : 0.12) + st.sx * 0.8;
    group.rotation.x = st.sy * 0.5;
    const b = st.b * st.b;
    for (let i = 0; i < N; i++) {
      P.copy(home[i]).lerp(burst[i], b);
      const w = reduced ? 0 : Math.sin(st.t * 1.2 + i) * 0.04;
      P.multiplyScalar(1 + w * (1 - b));
      E.set(rot[i].x + st.t * 0.3 * (i % 2 ? 1 : -1), rot[i].y + b * 3, rot[i].z); Q.setFromEuler(E);
      M.compose(P, Q, S); mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
    R.render(scene, cam);
  })();
}

/* ---------------- 2. mission / vision prism ---------------- */
function prism() {
  const sec = document.getElementById("mission"), el = document.getElementById("prism");
  if (!sec || !el) return;
  const l0 = document.getElementById("mvL0"), l1 = document.getElementById("mvL1");
  onScroll(() => {
    const r = sec.getBoundingClientRect(), total = r.height - innerHeight;
    const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    const a = sm(0.25, 0.75, p) * 90;
    el.style.transform = `translateZ(calc(var(--d) * -1)) rotateX(${a.toFixed(2)}deg) rotateY(${(Math.sin(p * Math.PI) * -8).toFixed(2)}deg)`;
    l0.classList.toggle("on", a < 45); l1.classList.toggle("on", a >= 45);
  });
}

/* ---------------- 3. values ring ---------------- */
function ring() {
  const stage = document.getElementById("ringStage"), el = document.getElementById("ring");
  if (!stage || !el) return;
  const cards = Array.from(el.children), n = cards.length;
  const radius = () => (innerWidth < 600 ? 250 : 380);
  const place = () => cards.forEach((c, i) => { c.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${radius()}px)`; });
  place(); addEventListener("resize", place);
  const st = { a: 0, target: 0, drag: false, x: 0, base: 0, scrollBase: null };
  stage.addEventListener("pointerdown", (e) => { st.drag = true; st.x = e.clientX; st.base = st.target; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener("pointermove", (e) => { if (st.drag) st.target = st.base + (e.clientX - st.x) * 0.35; });
  const end = () => { if (!st.drag) return; st.drag = false; st.target = Math.round(st.target / (360 / n)) * (360 / n); };
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
  let scrollOff = 0;
  onScroll(() => { const r = stage.getBoundingClientRect(); scrollOff = (innerHeight / 2 - (r.top + r.height / 2)) * 0.12; });
  const vis = watch(stage);
  (function frame() {
    requestAnimationFrame(frame);
    if (!vis.v) return;
    const goal = st.target - scrollOff + (reduced || st.drag ? 0 : 0);
    st.a += (goal - st.a) * 0.08;
    el.style.transform = `translateZ(${-radius()}px) rotateX(-6deg) rotateY(${st.a.toFixed(2)}deg)`;
    const step = 360 / n;
    const front = ((Math.round(-st.a / step) % n) + n) % n;
    cards.forEach((c, i) => { c.classList.toggle("front", i === front); const ang = ((st.a + i * step) % 360) * Math.PI / 180; const f = (Math.cos(ang) + 1) / 2; c.style.opacity = (0.18 + 0.82 * f * f).toFixed(3); c.style.zIndex = String(Math.round(f * 100)); });
  })();
}

/* ---------------- 4. offices map ---------------- */
function map() {
  const canvas = document.getElementById("abMap");
  if (!canvas) return;
  const wrap = canvas.parentElement, tags = Array.from(wrap.querySelectorAll(".map-tag"));
  const R = renderer(canvas), scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const C = { lat: 22, lon: 80 }, K = 0.1;
  const xy = (lat, lon) => new THREE.Vector3((lon - C.lon) * K, 0, -(lat - C.lat) * K);
  const pos = [], col = [];
  const gold = new THREE.Color("#f0c460"), dim = new THREE.Color("#3d5a4a");
  for (let i = 0; i < LAND.length; i += 2) {
    const lat = LAND[i] / 10, lon = LAND[i + 1] / 10;
    if (lat < 4 || lat > 38 || lon < 62 || lon > 100) continue;
    const india = lat > 7 && lat < 36 && lon > 68 && lon < 97.5 && !(lon < 75 && lat > 30 && lon < 74) && !(lon > 88.5 && lat < 26.5 && lat > 20.5 && lon < 92.7) && !(lat > 28 && lon > 80.5 && lon < 88.2 && lat < 30.5);
    const v = xy(lat, lon); pos.push(v.x, 0, v.z);
    const c = india ? gold : dim; col.push(c.r, c.g, c.b);
  }
  // fill in: the land data is sparse at this zoom, so add jittered copies
  const P2 = [], C2 = [];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 6; k++) { P2.push(pos[i] + (Math.random() - 0.5) * 0.11, 0, pos[i + 2] + (Math.random() - 0.5) * 0.11); C2.push(col[i], col[i + 1], col[i + 2]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P2, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C2, 3));
  const board = new THREE.Group(); scene.add(board);
  board.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.03, vertexColors: true, transparent: true, opacity: 0.9 })));
  const offices = [[19.03, 73.07], [19.08, 72.99], [23.18, 75.78]];
  const pins = offices.map(([la, lo], i) => {
    const p = xy(la, lo); if (i === 1) p.x -= 0.09;   // Vashi & Kharghar sit very close — nudge so both show
    const grp = new THREE.Group(); grp.position.copy(p);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), new THREE.MeshBasicMaterial({ color: "#7bb34a", transparent: true, opacity: 0.85 }));
    beam.position.y = 0.5; grp.add(beam);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffffff" })); head.position.y = 1; grp.add(head);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 32), new THREE.MeshBasicMaterial({ color: "#7bb34a", transparent: true, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; grp.add(ring);
    board.add(grp);
    return { grp, beam, head, ring, h: 1 - i * 0.15 };
  });
  const st = { ry: 0, target: 0, drag: false, x: 0, base: 0, rise: 0, t: 0, active: -1 };
  wrap.addEventListener("pointerdown", (e) => { st.drag = true; st.x = e.clientX; st.base = st.target; wrap.setPointerCapture(e.pointerId); });
  wrap.addEventListener("pointermove", (e) => { if (st.drag) st.target = clamp(st.base + (e.clientX - st.x) * 0.006, -0.9, 0.9); });
  wrap.addEventListener("pointerup", () => { st.drag = false; });
  document.querySelectorAll(".office[data-pin]").forEach((o) => {
    o.addEventListener("mouseenter", () => { st.active = +o.dataset.pin; });
    o.addEventListener("mouseleave", () => { st.active = -1; });
  });
  function resize() { const s = wrap.clientWidth; R.setSize(s, s, false); cam.aspect = 1; cam.updateProjectionMatrix(); }
  resize(); addEventListener("resize", resize);
  const vis = watch(wrap), clock = new THREE.Clock(), tmp = new THREE.Vector3();
  (function frame() {
    requestAnimationFrame(frame);
    if (!vis.v || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05); st.t += dt;
    st.rise = Math.min(1, st.rise + dt * 0.6);
    st.ry += (st.target + (reduced ? 0 : Math.sin(st.t * 0.25) * 0.15) - st.ry) * 0.06;
    board.rotation.y = st.ry;
    cam.position.set(0, 4.4, 3.6); cam.lookAt(0, 0, 0.15);
    pins.forEach((p, i) => {
      const e = sm(i * 0.15, i * 0.15 + 0.6, st.rise) * p.h * (st.active === i ? 1.35 : 1);
      p.beam.scale.y = Math.max(0.001, e); p.beam.position.y = e / 2; p.head.position.y = e;
      const k = (st.t * 0.7 + i * 0.3) % 1; p.ring.scale.setScalar(1 + k * 3); p.ring.material.opacity = 1 - k;
      p.head.material.color.set(st.active === i ? "#7bb34a" : "#ffffff");
      p.head.getWorldPosition(tmp); tmp.project(cam);
      const t = tags[i]; if (t) { t.style.left = ((tmp.x + 1) / 2 * 100).toFixed(2) + "%"; t.style.top = ((1 - tmp.y) / 2 * 100).toFixed(2) + "%"; t.style.opacity = e > 0.3 ? 1 : 0; t.classList.toggle("on", st.active === i); }
    });
    document.querySelectorAll(".office[data-pin]").forEach((o) => o.classList.toggle("on", +o.dataset.pin === st.active));
    R.render(scene, cam);
  })();
}

const ok = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
if (ok) { try { grains(); } catch (e) { console.warn(e); } try { map(); } catch (e) { console.warn(e); } }
prism();
ring();
