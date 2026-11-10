/* ==========================================================================
   Samriddhi — product page 3D
   Floating 3D commodity particles (grains, pulses, cotton fluff, spice dust)
   in the commodity's own colours, plus a 3D tilt card that follows the pointer.
   Colours and particle type come from <body data-palette data-particles>.
   ========================================================================== */
import * as THREE from "/assets/js/vendor/three.module.min.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 760px)").matches;
const body = document.body;
const palette = (body.dataset.palette || "#D9A441").split(",").map((c) => new THREE.Color(c.trim()));
const kind = body.dataset.particles || "grain";

function initParticles() {
  const canvas = document.getElementById("pfx");
  if (!canvas) return;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#0c1511", 12, 30);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  scene.add(new THREE.HemisphereLight("#fff4dc", "#2a2010", 1.4));
  const key = new THREE.DirectionalLight("#ffe2b0", 2.4); key.position.set(-4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight("#ffffff", 1.2); rim.position.set(6, -2, -4); scene.add(rim);

  let geo, count, size;
  if (kind === "round") { geo = new THREE.SphereGeometry(1, 18, 12); geo.scale(1, 0.86, 0.95); count = 160; size = [0.14, 0.24]; }
  else if (kind === "fluff") {
    geo = new THREE.SphereGeometry(1, 28, 20);
    const a = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i);
      const lump = 1 + 0.16 * Math.sin(v.x * 5.1) * Math.sin(v.y * 4.3 + 1.1) * Math.sin(v.z * 4.7 + 2.3) + 0.08 * Math.sin(v.x * 11 + v.y * 9);
      v.multiplyScalar(lump); a.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals(); count = 70; size = [0.32, 0.62];
  }
  else if (kind === "dust") { geo = new THREE.IcosahedronGeometry(1, 1); count = 260; size = [0.05, 0.13]; }
  else { geo = new THREE.SphereGeometry(1, 14, 10); geo.scale(0.55, 1.15, 0.5); const a = geo.attributes.position; for (let i = 0; i < a.count; i++) { if (a.getZ(i) > 0) a.setZ(i, a.getZ(i) * 0.6); } geo.computeVertexNormals(); count = 180; size = [0.13, 0.22]; }
  if (mobile) count = Math.round(count * 0.55);

  const mat = new THREE.MeshStandardMaterial({ emissive: kind === "fluff" ? new THREE.Color("#3a352c") : new THREE.Color("#000"), roughness: kind === "fluff" ? 1 : 0.45, metalness: 0, flatShading: kind === "dust", transparent: true, opacity: 0.92 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      x: (Math.random() - 0.5) * 30, y: (Math.random() - 0.5) * 18, z: -2 - Math.random() * 14,
      s: size[0] + Math.random() * (size[1] - size[0]),
      rx: Math.random() * 6, ry: Math.random() * 6, vr: (Math.random() - 0.5) * 0.6,
      vy: 0.12 + Math.random() * 0.25, ph: Math.random() * 6.28
    });
    mesh.setColorAt(i, palette[i % palette.length]);
  }
  scene.add(mesh);

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
  const st = { mx: 0, my: 0, sx: 0, sy: 0, scroll: 0 };
  addEventListener("pointermove", (e) => { st.mx = e.clientX / innerWidth - 0.5; st.my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); addEventListener("resize", resize);
  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
  const clock = new THREE.Clock(); let t = 0;
  (function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05) * (reduced ? 0.2 : 1); t += dt;
    st.sx += (st.mx - st.sx) * 0.05; st.sy += (st.my - st.sy) * 0.05;
    st.scroll = window.lenis ? window.lenis.scroll : scrollY;
    camera.position.x = st.sx * 2.2; camera.position.y = -st.sy * 1.4 - st.scroll * 0.004;
    camera.lookAt(0, -st.scroll * 0.004, 0);
    items.forEach((it, i) => {
      it.y += it.vy * dt * (kind === "fluff" ? 0.6 : 1) * (kind === "dust" ? 1.3 : -1);
      if (it.y < -9) it.y = 9; if (it.y > 9) it.y = -9;
      it.rx += it.vr * dt; it.ry += it.vr * dt * 0.7;
      P.set(it.x + Math.sin(t * 0.4 + it.ph) * 0.6, it.y, it.z);
      E.set(it.rx, it.ry, 0); Q.setFromEuler(E); S.setScalar(it.s);
      M.compose(P, Q, S); mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  })();
}

function initCard() {
  const card = document.getElementById("card3d");
  if (!card || reduced || !matchMedia("(hover: hover)").matches) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener("pointermove", (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  (function loop() {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    card.style.transform = `rotateY(${(cx * 22).toFixed(2)}deg) rotateX(${(-cy * 16).toFixed(2)}deg)`;
    card.style.setProperty("--gx", (50 + cx * 90).toFixed(1) + "%");
    card.style.setProperty("--gy", (40 + cy * 90).toFixed(1) + "%");
    requestAnimationFrame(loop);
  })();
}

try { initParticles(); } catch (e) { console.warn("3D particles unavailable", e); }
initCard();
