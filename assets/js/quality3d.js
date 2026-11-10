/* ==========================================================================
   Samriddhi — Quality & Compliance page 3D (loaded only by quality.html)
   1. Hero: a stream of 3D grains flowing through a glowing scanner ring —
      dull raw grains go in, bright checked grains come out.
   2. Handover: a three-sided glass prism that turns with the scroll.
   3. Registrations: coins that flip into view as you scroll (tap to flip).
   ========================================================================== */
import * as THREE from "/assets/js/vendor/three.module.min.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 760px)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const scrollTop = () => (window.lenis ? window.lenis.scroll : scrollY);
const onScroll = (fn) => { if (window.lenis) window.lenis.on("scroll", fn); else addEventListener("scroll", fn, { passive: true }); fn(); };

/* ---------------- 1. grain scanner ---------------- */
function scanner() {
  const canvas = document.getElementById("qScan"), hero = document.getElementById("qHero");
  if (!canvas) return;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight("#eaf5e0", "#10261a", 1));
  const key = new THREE.DirectionalLight("#fff4dc", 2.6); key.position.set(-3, 5, 6); scene.add(key);
  const glowLight = new THREE.PointLight("#9be36a", 6, 6, 1.6); scene.add(glowLight);

  const group = new THREE.Group(); scene.add(group);
  const RING_X = 0.4;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.045, 24, 120), new THREE.MeshStandardMaterial({ color: "#c9f0a0", emissive: "#7bb342", emissiveIntensity: 2.2, roughness: 0.3 }));
  ring.rotation.y = Math.PI / 2; ring.position.x = RING_X; group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.012, 12, 120), new THREE.MeshBasicMaterial({ color: "#a9d57a", transparent: true, opacity: 0.5 }));
  ring2.rotation.y = Math.PI / 2; ring2.position.x = RING_X; group.add(ring2);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.03, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform float uT; varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.; float scan = smoothstep(.04, 0., abs(fract(vUv.y + uT * .35) - .5) - .0); float a = (1. - d) * .12 + scan * .35 * (1. - d * .6); gl_FragColor = vec4(.6, .95, .45, a); }"
  }));
  disc.rotation.y = Math.PI / 2; disc.position.x = RING_X; group.add(disc);
  glowLight.position.set(RING_X, 0, 0.6);

  const N = mobile ? 380 : 900;
  const geo = new THREE.SphereGeometry(1, 12, 8); geo.scale(0.07, 0.045, 0.05);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.45 }), N);
  group.add(mesh);
  const items = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.72;
    items.push({ t: Math.random(), y: Math.sin(a) * r, z: Math.cos(a) * r, sp: 0.045 + Math.random() * 0.03, rx: Math.random() * 6, ry: Math.random() * 6, vr: (Math.random() - 0.5) * 3 });
  }
  const raw = new THREE.Color("#7d7059"), good = new THREE.Color("#e9c871"), flash = new THREE.Color("#b6f27c"), C = new THREE.Color();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
  const st = { mx: 0, my: 0, sx: 0, sy: 0, t: 0, speed: 1 };
  addEventListener("pointermove", (e) => { st.mx = e.clientX / innerWidth - 0.5; st.my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const wide = w / h > 1.1; group.position.set(wide ? 3.7 : 0, wide ? -0.3 : -1.7, 0); group.scale.setScalar(wide ? 0.78 : 0.7);
  }
  resize(); addEventListener("resize", resize);
  let vis = true; new IntersectionObserver((e) => { vis = e[0].isIntersecting; }).observe(hero);
  const clock = new THREE.Clock();
  (function frame() {
    requestAnimationFrame(frame);
    if (!vis || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05) * (reduced ? 0.25 : 1); st.t += dt;
    st.sx += (st.mx - st.sx) * 0.05; st.sy += (st.my - st.sy) * 0.05;
    const sp = sm(0, 1, scrollTop() / hero.offsetHeight);
    cam.position.set(st.sx * 1.2, 0.6 - st.sy * 0.8, 7.5 - sp * 2);
    cam.lookAt(group.position.x * 0.55, group.position.y * 0.5, 0);
    group.rotation.y = -0.55 + st.sx * 0.25; group.rotation.x = 0.08;
    ring.rotation.x = st.t * 0.2; disc.material.uniforms.uT.value = st.t;
    for (let i = 0; i < N; i++) {
      const it = items[i];
      it.t = (it.t + it.sp * dt * (1 + sp * 2)) % 1;
      const x = -1.5 + it.t * 5.9;
      const squeeze = 1 - 0.25 * Math.exp(-Math.pow((x - RING_X) / 0.8, 2));
      P.set(x, it.y * squeeze + Math.sin(st.t + it.t * 8) * 0.03, it.z * squeeze);
      it.rx += it.vr * dt; E.set(it.rx, it.ry + it.rx * 0.5, 0); Q.setFromEuler(E);
      const fade = sm(0, 0.08, it.t) * (1 - sm(0.92, 1, it.t));
      S.setScalar(0.001 + fade);
      M.compose(P, Q, S); mesh.setMatrixAt(i, M);
      const d = x - RING_X;
      if (Math.abs(d) < 0.25) C.copy(flash); else if (d < 0) C.copy(raw); else C.copy(good);
      mesh.setColorAt(i, C);
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    R.render(scene, cam);
  })();
}

/* ---------------- 2. three-sided prism ---------------- */
function tri() {
  const sec = document.getElementById("handover"), el = document.getElementById("tri");
  if (!sec || !el) return;
  const labels = sec.querySelectorAll("[data-l]"), dots = sec.querySelectorAll(".q-dots i");
  onScroll(() => {
    const r = sec.getBoundingClientRect(), total = r.height - innerHeight;
    const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    const step = sm(0.15, 0.42, p) + sm(0.55, 0.82, p);       // 0 → 1 → 2 with a pause on each face
    el.style.transform = `translateZ(calc(var(--d) * -1)) rotateX(${(step * 120).toFixed(2)}deg)`;
    const k = Math.round(step);
    labels.forEach((l, i) => l.classList.toggle("on", i === k));
    dots.forEach((d, i) => d.classList.toggle("on", i === k));
  });
}

/* ---------------- 3. registration coins ---------------- */
function coins() {
  const wrap = document.getElementById("coins");
  if (!wrap) return;
  const list = Array.from(wrap.children);
  list.forEach((c) => c.addEventListener("click", () => c.classList.toggle("flip")));
  onScroll(() => {
    const r = wrap.getBoundingClientRect();
    const p = clamp((innerHeight - r.top) / (innerHeight * 0.75), 0, 1);
    list.forEach((c, i) => {
      const q = sm(i * 0.12, 0.55 + i * 0.12, p);
      if (!c.classList.contains("flip")) c.style.transform = `rotateY(${((1 - q) * 180).toFixed(1)}deg) translateY(${((1 - q) * 40).toFixed(1)}px)`;
    });
  });
}

const ok = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
if (ok) { try { scanner(); } catch (e) { console.warn(e); } }
tri();
coins();