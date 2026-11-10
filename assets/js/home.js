/* ==========================================================================
   Samriddhi — homepage 3D
   1. Hero: a live, wind-swept wheat field at golden hour (Three.js, instanced)
      — the camera rises out of the wheat as you scroll.
   2. Markets: an interactive dotted globe with trade routes from India.
   3. Commodities: a CSS-3D filmstrip (no iframe, no extra library).
   Everything pauses when off-screen or when the tab is hidden.
   ========================================================================== */
import * as THREE from "/assets/js/vendor/three.module.min.js";
import { LAND } from "/assets/js/land.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 760px)").matches || navigator.hardwareConcurrency <= 4;
const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
const progress = (p) => window.samriddhiProgress && window.samriddhiProgress(p);
const ready = () => window.samriddhiReady && window.samriddhiReady();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}

/* small round glow texture for particles and dots */
function dotTexture(soft) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(soft ? 0.25 : 0.55, soft ? "rgba(255,255,255,.55)" : "rgba(255,255,255,1)");
  grd.addColorStop(soft ? 1 : 0.7, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* merge simple geometries (with a per-part colour) into one buffer */
function merge(parts) {
  let n = 0; const flat = parts.map(({ geo, color }) => { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); n += g.attributes.position.count; return { g, color }; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const { g, color } of flat) {
    const p = g.attributes.position.array, nn = g.attributes.normal.array;
    pos.set(p, o * 3); nor.set(nn, o * 3);
    for (let i = 0; i < g.attributes.position.count; i++) { col[(o + i) * 3] = color.r; col[(o + i) * 3 + 1] = color.g; col[(o + i) * 3 + 2] = color.b; }
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}

/* one wheat stalk, 1 unit tall: stem + leaf + ear of grains + awns */
function makeStalk() {
  const parts = [];
  const stemC = new THREE.Color("#b89a4e"), leafC = new THREE.Color("#9c8a45"), grainC = new THREE.Color("#e2b45c"), awnC = new THREE.Color("#f1d48e");
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (const rot of [0, Math.PI / 2]) {
    const stem = new THREE.PlaneGeometry(0.018, 0.86, 1, 4);
    const a = stem.attributes.position;
    for (let i = 0; i < a.count; i++) { const y = a.getY(i) + 0.43; a.setY(i, y); a.setX(i, a.getX(i) * (1.1 - y * 0.6)); }
    stem.rotateY(rot); parts.push({ geo: stem, color: stemC });
  }
  const leaf = new THREE.PlaneGeometry(0.03, 0.42, 1, 4);
  const la = leaf.attributes.position;
  for (let i = 0; i < la.count; i++) {
    const t = (la.getY(i) + 0.21) / 0.42;
    la.setX(i, la.getX(i) * (1 - t) + t * t * 0.16);
    la.setY(i, 0.18 + t * 0.36 - t * t * 0.1);
  }
  parts.push({ geo: leaf, color: leafC });
  const levels = 8;
  for (let i = 0; i < levels; i++) {
    for (const side of [-1, 1]) {
      const y = 0.8 + i * 0.034 + (side > 0 ? 0.017 : 0);
      const taper = 1 - i / levels * 0.45;
      const g = new THREE.OctahedronGeometry(1, 0);
      q.setFromEuler(new THREE.Euler(0, (i % 2) * Math.PI / 2, side * 0.42));
      s.set(0.02 * taper, 0.04 * taper, 0.016 * taper);
      p.set(side * 0.014 * taper, y, 0);
      m.compose(p, q, s); g.applyMatrix4(m);
      g.rotateY((i % 2) * Math.PI / 2);
      parts.push({ geo: g, color: grainC });
      const awn = new THREE.BufferGeometry();
      const bx = side * 0.022 * taper, len = 0.13 + (i / levels) * 0.05;
      const verts = new Float32Array([bx - 0.002, y + 0.02, 0, bx + 0.002, y + 0.02, 0, bx + side * len * 0.35, y + 0.02 + len, 0]);
      awn.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      awn.rotateY((i % 2) * Math.PI / 2);
      parts.push({ geo: awn, color: awnC });
    }
  }
  return merge(parts);
}

/* ----------------------------------------------------------------------------
   1. HERO WHEAT FIELD
   ---------------------------------------------------------------------------- */
function initField() {
  const canvas = document.getElementById("fieldgl");
  if (!canvas) return null;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const horizon = new THREE.Color("#f0c27a");
  scene.fog = new THREE.Fog(horizon, 10, 62);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 1500);

  /* sky dome with sun */
  const sunDir = new THREE.Vector3(0.3, 0.1, -1).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: sunDir }, uTop: { value: new THREE.Color("#6f9cb6") }, uMid: { value: new THREE.Color("#f3c680") }, uLow: { value: new THREE.Color("#f0c27a") } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }",
    fragmentShader: `uniform vec3 uSun, uTop, uMid, uLow; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 c = mix(uLow, uMid, smoothstep(0.0, 0.22, h));
        c = mix(c, uTop, smoothstep(0.18, 0.95, h));
        float d = max(dot(normalize(vDir), uSun), 0.);
        float above = smoothstep(0.0, 0.05, h);
        c += vec3(1.0, 0.78, 0.5) * pow(d, 24.) * 0.45 * above;
        c += vec3(1.0, 0.97, 0.9) * smoothstep(0.9993, 0.9997, d) * 1.5;
        vec3 k = step(vec3(.92), c); c = mix(c, .92 + .08 * (1. - exp(-(c - .92) / .08)), k);
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`
  }));
  sky.renderOrder = -1; sky.frustumCulled = false;
  scene.add(sky);

  scene.add(new THREE.HemisphereLight("#ffe7b8", "#6b4c1e", 1.5));
  const sun = new THREE.DirectionalLight("#ffd28a", 2.6);
  sun.position.copy(sunDir).multiplyScalar(50);
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#ffeccc", 0.7);
  fill.position.set(2, 4, 8);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: "#a77d3a", roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* instanced wheat with GPU wind */
  const uniforms = { uTime: { value: 0 }, uWind: { value: reduced ? 0.25 : 1 } };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, side: THREE.DoubleSide, emissive: new THREE.Color("#5a3a0c"), emissiveIntensity: 0.6 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uWind = uniforms.uWind;
    sh.vertexShader = "uniform float uTime; uniform float uWind;\n" + sh.vertexShader.replace("#include <begin_vertex>", `
      vec3 transformed = vec3(position);
      vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      float h = clamp(position.y, 0.0, 1.3); float k = h * h;
      float wave = sin(uTime * 0.8 + ip.x * 0.16 + ip.y * 0.22) * 0.55
                 + sin(uTime * 1.9 + ip.x * 0.7 - ip.y * 0.5) * 0.18
                 + sin(uTime * 0.31 + ip.y * 0.06) * 0.45;
      transformed.x += (wave * 0.16 + 0.05) * k * uWind;
      transformed.z += sin(uTime * 1.25 + ip.y * 0.35 + ip.x * 0.2) * 0.05 * k * uWind;
      transformed.y -= abs(wave) * 0.03 * k * uWind;
    `);
  };
  const N = mobile ? 3200 : 9000;
  const stalks = new THREE.InstancedMesh(makeStalk(), mat, N);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler(), C = new THREE.Color();
  const tints = ["#fff3d6", "#ffe7b5", "#f5d79c", "#ffeccb", "#e9c98a"];
  let placed = 0, guard = 0;
  while (placed < N && guard++ < N * 4) {
    const z = 6.5 - 70 * Math.pow(Math.random(), 1.55);
    const w = 6 + (6.5 - z) * 1.25;
    const x = (Math.random() - 0.5) * w;
    if (z > 2.2 && Math.abs(x) < 0.25 + (z - 2.2) * 0.45) continue;            // keep the lens clear
    const sc = 0.85 + Math.random() * 0.4;
    E.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.12);
    Q.setFromEuler(E); S.set(sc, sc * (0.9 + Math.random() * 0.25), sc); P.set(x, 0, z);
    M.compose(P, Q, S); stalks.setMatrixAt(placed, M);
    C.set(tints[(Math.random() * tints.length) | 0]); stalks.setColorAt(placed, C);
    placed++;
  }
  stalks.count = placed;
  stalks.frustumCulled = false;
  scene.add(stalks);

  /* drifting chaff / pollen catching the light */
  const PN = mobile ? 260 : 700;
  const pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3), ps = new Float32Array(PN);
  for (let i = 0; i < PN; i++) { pp[i * 3] = (Math.random() - 0.5) * 24; pp[i * 3 + 1] = Math.random() * 7; pp[i * 3 + 2] = 6 - Math.random() * 34; ps[i] = Math.random(); }
  pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  pg.setAttribute("seed", new THREE.BufferAttribute(ps, 1));
  const pollen = new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: uniforms.uTime, uMap: { value: dotTexture(true) }, uPx: { value: DPR } },
    vertexShader: `uniform float uTime; uniform float uPx; attribute float seed; varying float vA;
      void main(){ vec3 p = position;
        p.x += sin(uTime * .2 + seed * 40.) * 1.2 + uTime * .35 * (0.5 + seed);
        p.x = mod(p.x + 12., 24.) - 12.;
        p.y += sin(uTime * .5 + seed * 20.) * .25 + mod(uTime * .05 * seed, 1.) ;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = (2. + seed * 5.) * uPx * (6. / -mv.z);
        vA = .35 + .65 * sin(uTime * (0.6 + seed) + seed * 30.) * .5 + .3;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: "uniform sampler2D uMap; varying float vA; void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(1., .86, .58, t.a * vA * .8); }"
  }));
  scene.add(pollen);

  /* camera path driven by scroll progress */
  const state = { p: 0, sp: 0, mx: 0, my: 0, smx: 0, smy: 0 };
  const look = new THREE.Vector3();
  function placeCamera() {
    const p = state.sp;
    const a = smooth(0, 1, p);
    camera.position.set(state.smx * 0.45, lerp(1.08, 6.4, a * a * 0.6 + a * 0.4) + state.smy * 0.12, lerp(5.2, 0.5, a));
    look.set(state.smx * 0.9 + lerp(0, -0.6, a), lerp(1.12, 0.2, a), lerp(-10, -24, a));
    camera.lookAt(look);
  }
  addEventListener("pointermove", (e) => { state.mx = e.clientX / innerWidth * 2 - 1; state.my = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 62 : 48;
    camera.updateProjectionMatrix();
  }
  resize(); addEventListener("resize", resize);

  /* adaptive quality: if the device struggles, lower the load quietly */
  let frames = 0, acc = 0, tuned = false;
  function tune(dt) {
    if (tuned) return;
    frames++; if (frames > 20) acc += dt;
    if (frames === 110) {
      tuned = true;
      const avg = acc / 90;
      if (avg > 26) { renderer.setPixelRatio(1); stalks.count = Math.floor(placed * 0.55); resize(); }
      else if (avg > 19) { renderer.setPixelRatio(Math.min(DPR, 1.25)); resize(); }
    }
  }

  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
  const clock = new THREE.Clock();
  let first = true;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    state.sp += (state.p - state.sp) * (reduced ? 1 : Math.min(1, dt * 4));
    state.smx += (state.mx - state.smx) * Math.min(1, dt * 2.2);
    state.smy += (state.my - state.smy) * Math.min(1, dt * 2.2);
    placeCamera();
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
    tune(dt * 1000);
    if (first) { first = false; canvas.style.opacity = 1; progress(0.9); setTimeout(ready, 120); }
  }
  canvas.style.opacity = 0; canvas.style.transition = "opacity 1.2s ease";
  progress(0.4);
  frame();
  return { setProgress: (p) => { state.p = p; } };
}

/* hero copy panels + progress bar follow the same scroll */
function initHeroScroll(field) {
  const hero = document.querySelector(".hero");
  const panels = Array.from(document.querySelectorAll(".hero-panel"));
  const prog = document.getElementById("heroProg"), step = document.getElementById("heroStep"), cue = document.getElementById("cue");
  const ranges = [[-1, -1, 0.22, 0.3], [0.3, 0.38, 0.6, 0.67], [0.67, 0.75, 2, 2]];
  let last = -1;
  function upd() {
    const r = hero.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = clamp(-r.top / total, 0, 1);
    if (Math.abs(p - last) < 0.0005) return; last = p;
    field && field.setProgress(p);
    panels.forEach((el, i) => {
      const [a, b, c, d] = ranges[i];
      const o = Math.min(a < 0 ? 1 : smooth(a, b, p), c > 1 ? 1 : 1 - smooth(c, d, p));
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.01 ? "hidden" : "visible";
      el.style.transform = `translate3d(0, ${((1 - o) * (p > (b + c) / 2 ? -40 : 40)).toFixed(1)}px, 0)`;
      if (o > 0.5 && i > 0) el.querySelectorAll(".split").forEach((s) => s.classList.add("in"));
    });
    if (prog) prog.style.width = (p * 100).toFixed(1) + "%";
    if (step) step.textContent = "0" + (p < 0.31 ? 1 : p < 0.66 ? 2 : 3) + " / 03";
    if (cue) cue.style.opacity = String(1 - smooth(0, 0.08, p));
  }
  if (window.lenis) window.lenis.on("scroll", upd); else addEventListener("scroll", upd, { passive: true });
  addEventListener("resize", () => { last = -1; upd(); });
  upd();
}

/* ----------------------------------------------------------------------------
   2. MARKETS GLOBE
   ---------------------------------------------------------------------------- */
function initGlobe() {
  const canvas = document.getElementById("globe");
  if (!canvas) return;
  const wrap = canvas.parentElement, tag = wrap.querySelector(".globe-tag");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 4.4);

  const ll = (lat, lon, r = 1) => {
    const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  };
  const tilt = new THREE.Group(), spin = new THREE.Group();
  scene.add(tilt); tilt.add(spin);

  /* ---- real Earth (NASA Blue Marble textures in /images/globe/) ---- */
  const loader = new THREE.TextureLoader(), aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (url, srgb) => { const t = loader.load(url); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const big = !mobile && Math.max(innerWidth, innerHeight) * DPR > 1400;
  const earthMat = new THREE.MeshPhongMaterial({
    color: "#ffffff", map: tex(big ? "/images/globe/earth-4k.jpg" : "/images/globe/earth-2k.jpg", true),
    bumpMap: tex("/images/globe/earth-bump.jpg"), bumpScale: 4,
    specularMap: tex("/images/globe/earth-water.jpg"), specular: new THREE.Color("#5f86b3"), shininess: 22
  });
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 72), earthMat));
  /* drifting clouds */
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 72), new THREE.MeshPhongMaterial({
    color: "#ffffff", alphaMap: tex("/images/globe/clouds.jpg"), transparent: true, opacity: 0.85, depthWrite: false
  }));
  spin.add(clouds);
  /* lights: a soft "sun" from the upper left, gentle fill so the night side stays readable */
  scene.add(new THREE.AmbientLight("#9fb4d6", 0.9));
  const sun = new THREE.DirectionalLight("#fff6e8", 2.6); sun.position.set(-3, 2.2, 3.2); scene.add(sun);
  /* atmosphere: blue rim on the edge + soft outer halo */
  const rimMat = (inner) => new THREE.ShaderMaterial({
    side: inner ? THREE.FrontSide : THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: inner
      ? "varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - max(dot(vN, vV), 0.), 2.6); gl_FragColor = vec4(0.42, 0.68, 1.0, f * .85); }"
      : "varying vec3 vN; varying vec3 vV; void main(){ float f = pow(max(dot(vN, vV), 0.) * 1.05, 5.0); gl_FragColor = vec4(0.38, 0.62, 1.0, clamp(f, 0., 1.) * .55); }"
  });
  tilt.add(new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 48), rimMat(true)));
  tilt.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 48), rimMat(false)));

  /* routes from Navi Mumbai — illustrative */
  const HUB = [19.07, 73.0];
  const routes = [[28.6, 77.2], [22.7, 75.9], [22.6, 88.4], [17.4, 78.5], [22.3, 70.8], [21.1, 79.1], [30.7, 76.8],
    [25.2, 55.3], [21.5, 39.2], [1.3, 103.8], [23.8, 90.4], [6.9, 79.9], [-6.2, 106.8], [51.9, 4.5], [-4.0, 39.7], [10.8, 106.7], [24.7, 46.7]];
  const arcMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: "attribute float off; varying vec2 vUv; varying float vOff; void main(){ vUv = uv; vOff = off; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vOff;
      void main(){ float d = fract(uTime * .28 + vOff);
        float head = smoothstep(.22, 0., d - vUv.x) * step(vUv.x, d);
        float a = .16 + head * .95;
        gl_FragColor = vec4(mix(vec3(.95,.8,.45), vec3(1.,.97,.85), head), a); }`
  });
  const hub = ll(HUB[0], HUB[1], 1);
  const pulses = [];
  routes.forEach(([la, lo], i) => {
    const b = ll(la, lo, 1);
    const dist = hub.angleTo(b);
    const pts = [];
    for (let k = 0; k <= 48; k++) {
      const t = k / 48;
      const v = new THREE.Vector3().copy(hub).lerp(b, t).normalize();
      v.multiplyScalar(1 + Math.sin(Math.PI * t) * (0.04 + dist * 0.28));
      pts.push(v);
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.0042, 5, false);
    const off = new Float32Array(tube.attributes.position.count).fill(i * 0.137 % 1);
    tube.setAttribute("off", new THREE.BufferAttribute(off, 1));
    spin.add(new THREE.Mesh(tube, arcMat));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.02, 24), new THREE.MeshBasicMaterial({ color: "#f0c460", transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(b).multiplyScalar(1.003); ring.lookAt(b.clone().multiplyScalar(2));
    ring.userData.seed = i * 0.37; spin.add(ring); pulses.push(ring);
  });
  const hubDot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshBasicMaterial({ color: "#fff1c9" }));
  hubDot.position.copy(hub); spin.add(hubDot);

  /* face India */
  const baseY = -Math.atan2(hub.x, hub.z);
  tilt.rotation.x = Math.atan2(hub.y, Math.hypot(hub.x, hub.z)) * 0.85;
  const st = { rx: 0, ry: 0, vy: 0, vx: 0, drag: false, lx: 0, ly: 0, t: 0, zoom: 1, tz: 1, idle: 0 };
  const touches = new Map(); let pinch0 = 0, zoom0 = 1;
  wrap.addEventListener("pointerdown", (e) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { const [p, q] = [...touches.values()]; pinch0 = Math.hypot(p.x - q.x, p.y - q.y); zoom0 = st.tz; }
    st.drag = true; st.lx = e.clientX; st.ly = e.clientY; st.idle = 0; wrap.setPointerCapture(e.pointerId); wrap.classList.add("grab");
  });
  wrap.addEventListener("pointermove", (e) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { const [p, q] = [...touches.values()]; st.tz = clamp(zoom0 * Math.hypot(p.x - q.x, p.y - q.y) / (pinch0 || 1), 0.85, 1.35); return; }
    if (!st.drag) return;
    const dx = e.clientX - st.lx, dy = e.clientY - st.ly; st.lx = e.clientX; st.ly = e.clientY;
    const k = 0.0055 / st.zoom;
    st.ry += dx * k; st.vy = dx * k; st.rx = clamp(st.rx + dy * k, -1.2, 1.2); st.vx = dy * k;
  });
  const end = (e) => { touches.delete(e.pointerId); if (!touches.size) { st.drag = false; wrap.classList.remove("grab"); } };
  wrap.addEventListener("pointerup", end); wrap.addEventListener("pointercancel", end);
  /* zoom: pinch on phones, pinch on trackpads / Ctrl + scroll on mice (normal scrolling still scrolls the page) */
  wrap.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); st.tz = clamp(st.tz * Math.exp(-e.deltaY * 0.004), 0.85, 1.35); }, { passive: false });
  wrap.addEventListener("dblclick", () => { st.ry = st.ry % (Math.PI * 2); st.vy = 0; st.vx = 0; st.back = true; st.tz = 1; });
  const hint = document.createElement("span"); hint.className = "globe-hint mono";
  hint.textContent = matchMedia("(pointer: coarse)").matches ? "Drag to spin · pinch to zoom" : "Drag to spin · Ctrl + scroll to zoom · double-click to reset";
  wrap.appendChild(hint);

  function resize() { const s = wrap.clientWidth; renderer.setSize(s, s, false); camera.aspect = 1; camera.updateProjectionMatrix(); }
  resize(); addEventListener("resize", resize);
  let visible = false;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { rootMargin: "100px" }).observe(wrap);
  const clock = new THREE.Clock(), tmp = new THREE.Vector3();
  (function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    st.t += dt; arcMat.uniforms.uTime.value = st.t;
    if (!st.drag) {
      st.vy *= 0.95; st.vx *= 0.9; st.ry += st.vy; st.rx = clamp(st.rx + st.vx, -1.2, 1.2); st.idle += dt;
      if (st.back) { st.ry += (0 - st.ry) * Math.min(1, dt * 3); st.rx += (0 - st.rx) * Math.min(1, dt * 3); if (Math.abs(st.ry) < 0.002) st.back = false; }
      else if (st.idle > 2.5 && !reduced) st.ry += dt * 0.05;          // slow spin when nobody is holding it
      if (st.idle > 6) st.rx += (0 - st.rx) * dt * 0.4;                 // drifts back upright
    }
    st.zoom += (st.tz - st.zoom) * Math.min(1, dt * 6);
    camera.position.z = 4.4 / st.zoom;
    clouds.rotation.y += dt * 0.012;
    spin.rotation.y = baseY + st.ry;
    spin.rotation.x = st.rx;
    pulses.forEach((r) => { const k = (st.t * 0.6 + r.userData.seed) % 1; r.scale.setScalar(1 + k * 2.4); r.material.opacity = 1 - k; });
    renderer.render(scene, camera);
    if (tag) {
      hubDot.getWorldPosition(tmp);
      const facing = tmp.z > 0.2;
      tmp.project(camera);
      tag.style.left = ((tmp.x + 1) / 2 * 100).toFixed(2) + "%";
      tag.style.top = ((1 - tmp.y) / 2 * 100).toFixed(2) + "%";
      tag.style.opacity = facing ? 1 : 0;
    }
  })();
}

/* ----------------------------------------------------------------------------
   3. COMMODITY FILMSTRIP (CSS 3D)
   ---------------------------------------------------------------------------- */
function initStrip() {
  const strip = document.getElementById("strip"), deck = document.getElementById("deck");
  if (!strip || !deck) return;
  const cards = Array.from(deck.querySelectorAll(".card"));
  const count = cards.length, nameEl = document.getElementById("stripName");
  const st = { phase: 0, target: 0, drag: false, sx: 0, sTarget: 0, moved: 0, last: performance.now(), visible: false };
  const wrapD = (d) => { while (d > count / 2) d -= count; while (d < -count / 2) d += count; return d; };
  const nearest = () => ((Math.round(st.phase) % count) + count) % count;
  const go = (n) => { st.target = Math.round(st.target) + n; st.last = performance.now(); };

  document.getElementById("prev")?.addEventListener("click", () => go(-1));
  document.getElementById("next")?.addEventListener("click", () => go(1));
  strip.tabIndex = 0;
  strip.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { go(1); e.preventDefault(); } if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); } });
  strip.addEventListener("pointerdown", (e) => { st.drag = true; st.sx = e.clientX; st.sTarget = st.target; st.moved = 0; strip.classList.add("drag"); });
  addEventListener("pointermove", (e) => {
    if (!st.drag) return;
    const dx = e.clientX - st.sx; st.moved = Math.max(st.moved, Math.abs(dx));
    st.target = st.sTarget - dx / spacing(); st.last = performance.now();
  });
  addEventListener("pointerup", () => { if (!st.drag) return; st.drag = false; strip.classList.remove("drag"); st.target = Math.round(st.target); });
  strip.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) { e.preventDefault(); st.target += e.deltaX / 260; clearTimeout(st.wt); st.wt = setTimeout(() => { st.target = Math.round(st.target); }, 140); st.last = performance.now(); }
  }, { passive: false });
  cards.forEach((card, i) => {
    card.addEventListener("click", (e) => {
      if (st.moved > 6) { e.preventDefault(); e.stopPropagation(); return; }
      if (i !== nearest()) { e.preventDefault(); e.stopPropagation(); st.target = Math.round(st.target) + wrapD(i - nearest()); st.last = performance.now(); }
    }, true);
    card.addEventListener("focus", () => { st.target = Math.round(st.target) + wrapD(i - nearest()); });
  });
  new IntersectionObserver((e) => { st.visible = e[0].isIntersecting; }).observe(strip);
  const spacing = () => clamp(innerWidth * 0.17, 140, 270);

  let prevT = performance.now(), lastName = -1;
  (function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(48, t - prevT); prevT = t;
    if (!st.visible) return;
    if (!st.drag && !reduced && t - st.last > 4800) { st.target = Math.round(st.target) + 1; st.last = t; }
    st.phase += (st.target - st.phase) * (reduced ? 1 : 1 - Math.pow(0.002, dt / 1000));
    const sp = spacing(), compact = innerWidth < 650;
    cards.forEach((card, i) => {
      const d = wrapD(i - st.phase), dist = Math.abs(d);
      const focus = Math.exp(-dist * dist * 1.3), side = Math.max(0, 1 - dist / 4);
      const x = d * sp * (compact ? 0.62 : 1), z = focus * 160 - dist * 150;
      const ry = -Math.sign(d) * (dist > 0.15 ? 16 + Math.min(dist, 3) * 6 : dist * 100);
      const s = 0.62 + side * 0.12 + focus * 0.36;
      card.style.setProperty("--focus", focus.toFixed(3));
      card.style.zIndex = String(1000 - Math.round(dist * 100));
      card.style.opacity = String(Math.max(0, side * 0.85 + focus * 0.15).toFixed(3));
      card.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px, ${(dist * 10).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateZ(${(d * 0.8).toFixed(2)}deg) scale(${s.toFixed(4)})`;
      card.tabIndex = dist < 0.5 ? 0 : -1;
      card.setAttribute("aria-current", dist < 0.5 ? "true" : "false");
    });
    const n = nearest();
    if (n !== lastName && nameEl) { lastName = n; nameEl.textContent = cards[n].dataset.name + " — " + cards[n].dataset.no + " / 0" + count; }
  })(prevT);
}

/* stat counters */
function initCounters() {
  const els = document.querySelectorAll("[data-count]");
  const io = new IntersectionObserver((en) => en.forEach((e) => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, t0 = performance.now();
    (function f(t) { const k = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
  }), { threshold: 0.6 });
  els.forEach((e) => io.observe(e));
}

/* ---------------------------------------------------------------------------- */
progress(0.15);
let field = null;
if (webglOK()) {
  try { field = initField(); } catch (e) { console.warn("3D field unavailable", e); ready(); }
  try { initGlobe(); } catch (e) { console.warn("Globe unavailable", e); }
} else ready();
initHeroScroll(field);
initStrip();
initCounters();