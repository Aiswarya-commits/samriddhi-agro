/* ==========================================================================
   Samriddhi — Sustainability page 3D (loaded only by sustainability.html)
   1. Hero: a small living planet — wheat sprouts all over it on load and
      ripens from green to gold as you scroll, with a sun circling it.
   2. Four commitments: stacked cards that fan out in 3D as you scroll.
   3. Farm-to-buyer journey: a path that draws itself, lighting each stop.
   ========================================================================== */
import * as THREE from "/assets/js/vendor/three.module.min.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 760px)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const scrollTop = () => (window.lenis ? window.lenis.scroll : scrollY);
const onScroll = (fn) => { if (window.lenis) window.lenis.on("scroll", fn); else addEventListener("scroll", fn, { passive: true }); addEventListener("resize", fn); fn(); };

/* ---------------- 1. sprouting planet ---------------- */
function planet() {
  const canvas = document.getElementById("sPlanet"), hero = document.getElementById("sHero");
  if (!canvas) return;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  cam.position.set(0, 0.4, 8.2);
  scene.add(new THREE.HemisphereLight("#e9f6dc", "#0d2216", 0.7));
  const sunLight = new THREE.PointLight("#ffe2a0", 40, 20, 1.6); scene.add(sunLight);
  const fill = new THREE.DirectionalLight("#cfe7ff", 0.8); fill.position.set(-4, 2, 5); scene.add(fill);

  const world = new THREE.Group(); scene.add(world);
  const RAD = 1.55;
  /* soil + grass ground with gentle hills */
  const g = new THREE.IcosahedronGeometry(RAD, 24);
  const pos = g.attributes.position, col = [], v = new THREE.Vector3();
  const soil = new THREE.Color("#6b5332"), grass = new THREE.Color("#4f9a36"), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n = Math.sin(v.x * 7.1) * Math.sin(v.y * 6.3 + 1) * Math.sin(v.z * 5.7 + 2);
    v.multiplyScalar(RAD * (1 + n * 0.035)); pos.setXYZ(i, v.x, v.y, v.z);
    c.copy(soil).lerp(grass, clamp(0.92 + n * 0.9, 0, 1)); col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  world.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })));
  /* atmosphere */
  world.add(new THREE.Mesh(new THREE.SphereGeometry(RAD * 1.18, 48, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.4); gl_FragColor = vec4(.62, .9, .45, f * .55); }"
  })));

  /* wheat stalks: stems + ears, instanced */
  const N = mobile ? 900 : 2400;
  const stemG = new THREE.CylinderGeometry(0.009, 0.014, 1, 5); stemG.translate(0, 0.5, 0);
  const earG = new THREE.SphereGeometry(1, 8, 6); earG.scale(0.05, 0.13, 0.05); earG.translate(0, 1.04, 0);
  const stems = new THREE.InstancedMesh(stemG, new THREE.MeshStandardMaterial({ roughness: 0.7 }), N);
  const ears = new THREE.InstancedMesh(earG, new THREE.MeshStandardMaterial({ roughness: 0.55 }), N);
  world.add(stems, ears);
  const base = [], up = new THREE.Vector3(0, 1, 0), ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
    const nrm = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
    nrm.x += (Math.random() - 0.5) * 0.06; nrm.z += (Math.random() - 0.5) * 0.06; nrm.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, nrm);
    q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.35, Math.random() * 6, (Math.random() - 0.5) * 0.35)));
    base.push({ p: nrm.clone().multiplyScalar(RAD * 0.99), q, h: 0.11 + Math.random() * 0.09, d: Math.random() * 1.6, ph: Math.random() * 6 });
  }
  /* sun */
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshBasicMaterial({ color: "#fff1c4" }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    map: (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const x = cv.getContext("2d"), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,230,160,1)"); gr.addColorStop(0.25, "rgba(255,210,120,.45)"); gr.addColorStop(1, "rgba(255,200,100,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })() }));
  halo.scale.setScalar(1.2); sun.add(halo); scene.add(sun);

  const green = new THREE.Color("#5f9e35"), gold = new THREE.Color("#e3b34e"), stemGreen = new THREE.Color("#4f8a2c"), straw = new THREE.Color("#c9a35a"), C = new THREE.Color();
  const M = new THREE.Matrix4(), S = new THREE.Vector3(), Q = new THREE.Quaternion(), sway = new THREE.Quaternion(), E = new THREE.Euler();
  const st = { mx: 0, my: 0, sx: 0, sy: 0, t: 0 };
  addEventListener("pointermove", (e) => { st.mx = e.clientX / innerWidth - 0.5; st.my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); const wide = w / h > 1.1; world.position.set(wide ? 2.9 : 0, wide ? -0.2 : -1.9, 0); world.scale.setScalar(wide ? 0.88 : 0.72); }
  resize(); addEventListener("resize", resize);
  let vis = true; new IntersectionObserver((e) => { vis = e[0].isIntersecting; }).observe(hero);
  const clock = new THREE.Clock();
  (function frame() {
    requestAnimationFrame(frame);
    if (!vis || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05); st.t += dt;
    st.sx += (st.mx - st.sx) * 0.05; st.sy += (st.my - st.sy) * 0.05;
    const sp = sm(0, 0.8, scrollTop() / hero.offsetHeight);
    world.rotation.y += dt * (reduced ? 0.02 : 0.08); world.rotation.x = 0.25 + st.sy * 0.3; world.rotation.z = st.sx * 0.2;
    const a = st.t * 0.35;
    sun.position.set(world.position.x + Math.cos(a) * 2.5, world.position.y + 1.3 + Math.sin(a * 0.7) * 0.3, Math.sin(a) * 2.5);
    sunLight.position.copy(sun.position);
    const ripe = sp;
    C.copy(green).lerp(gold, ripe); ears.material.color.copy(C);
    C.copy(stemGreen).lerp(straw, ripe * 0.85); stems.material.color.copy(C);
    for (let i = 0; i < N; i++) {
      const b = base[i];
      const grow = reduced ? 1 : sm(b.d, b.d + 1.4, st.t);
      E.set(Math.sin(st.t * 1.3 + b.ph) * 0.08, 0, Math.cos(st.t * 1.1 + b.ph) * 0.08); sway.setFromEuler(E);
      Q.copy(b.q).multiply(sway);
      S.set(1, Math.max(0.001, grow * b.h * (1 + ripe * 0.25)), 1);
      M.compose(b.p, Q, S); stems.setMatrixAt(i, M);
      const es = Math.max(0.001, sm(0.5, 1, grow));
      S.set(es, Math.max(0.001, grow * b.h * (1 + ripe * 0.25)), es);
      M.compose(b.p, Q, S); ears.setMatrixAt(i, M);
    }
    stems.instanceMatrix.needsUpdate = true; ears.instanceMatrix.needsUpdate = true;
    cam.position.set(st.sx * 0.8, 0.4 - st.sy * 0.5, 8.2 - sp * 1.5); cam.lookAt(world.position.x * 0.5, world.position.y * 0.4, 0);
    R.render(scene, cam);
  })();
}

/* ---------------- 2. fanning commitment cards ---------------- */
function fan() {
  const sec = document.getElementById("commitments"), el = document.getElementById("fan");
  if (!sec || !el) return;
  const cards = Array.from(el.children), n = cards.length, mid = (n - 1) / 2;
  onScroll(() => {
    const r = sec.getBoundingClientRect(), total = r.height - innerHeight;
    const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    const q = sm(0.12, 0.7, p);
    const narrow = innerWidth < 760;
    cards.forEach((c, i) => {
      const k = i - mid;
      if (narrow) {   // phones: cards deal into a 2 × 2 grid
        const col = i % 2 ? 1 : -1, row = i < 2 ? -1 : 1;
        c.style.transform = `translate3d(${(col * 53 * q).toFixed(1)}%, ${(row * 53 * q).toFixed(1)}%, 0) rotateZ(${(k * 5 * (1 - q)).toFixed(2)}deg) scale(0.62)`;
      } else {
        const spacing = Math.min(320, innerWidth * 0.22);
        c.style.transform = `translate3d(${(k * spacing * q).toFixed(1)}px, ${(Math.abs(k) * 26 * q + k * 6 * (1 - q)).toFixed(1)}px, ${(-Math.abs(k) * 70 * q - i * 8 * (1 - q)).toFixed(1)}px) rotateY(${(-k * 16 * q).toFixed(2)}deg) rotateZ(${(k * 7 * (1 - q) + k * 2.5 * q).toFixed(2)}deg)`;
      }
      c.style.zIndex = String(10 + (narrow ? i : Math.round(10 - Math.abs(k) * 2)));
    });
  });
}

/* ---------------- 3. journey path ---------------- */
function journey() {
  const wrap = document.getElementById("journeyMap"), line = document.getElementById("jpLine"), dot = document.getElementById("jpDot");
  if (!wrap || !line) return;
  const L = line.getTotalLength(), stops = Array.from(wrap.querySelectorAll(".stop"));
  line.style.strokeDasharray = L; line.style.strokeDashoffset = L;
  onScroll(() => {
    const r = wrap.getBoundingClientRect();
    const p = sm(0, 1, (innerHeight * 0.85 - r.top) / (innerHeight * 0.7));
    line.style.strokeDashoffset = (L * (1 - p)).toFixed(1);
    const pt = line.getPointAtLength(L * p); dot.setAttribute("cx", pt.x.toFixed(1)); dot.setAttribute("cy", pt.y.toFixed(1));
    stops.forEach((s) => s.classList.toggle("on", p >= parseFloat(s.dataset.at) - 0.02));
  });
}

const ok = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
if (ok) { try { planet(); } catch (e) { console.warn(e); } }
fan();
journey();