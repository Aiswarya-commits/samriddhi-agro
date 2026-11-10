/* ==========================================================================
   Samriddhi — product page 3D plant story (Tabasco-style)
   A procedurally built 3D plant (no model files) that ripens as you scroll:
     boll   → cotton bolls split open and the white lint bursts out
     chilli → chillies ripen from green to red
     ear    → wheat ears turn from green to gold and nod   (cereals)
     flour  → wheat ears + flour dust                       (flour & processed)
     pod    → chickpea pods dry and open to show the chana  (pulses)
     soy    → soybean pods dry and open to show the seeds   (oilseeds)
   The plant slides to centre, ripens, the camera swoops in for a close-up,
   then the page blurs into the product's colour for the typographic chapters.
   Only touches #story. Plant type comes from <section data-plant="...">.
   ========================================================================== */
import * as THREE from "/assets/js/vendor/three.module.min.js";

const section = document.getElementById("story");
const canvas = document.getElementById("psCanvas");
if (section && canvas) init();

function init() {
  const TYPE = section.dataset.plant || "boll";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 760px)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sm = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { console.warn("WebGL unavailable", e); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
  scene.add(new THREE.HemisphereLight("#dfe8d6", "#1b1a14", 0.55));
  const key = new THREE.DirectionalLight("#fff3e0", 3.2); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight("#cfe2ff", 2.4); rim.position.set(4, 2, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight("#ffe7c4", 0.6); fill.position.set(2, -3, 5); scene.add(fill);

  /* ---------------- materials ---------------- */
  const M = {
    stem: new THREE.MeshStandardMaterial({ color: "#5f7d3a", roughness: 0.55 }),
    leaf: new THREE.MeshStandardMaterial({ color: "#2f5a28", roughness: 0.5, side: THREE.DoubleSide }),
    leafDry: new THREE.Color("#7a6a3a"),
  };

  /* ---------------- geometry helpers ---------------- */
  function leafGeo(len, wid, fold = 0.35, curl = 0.15) {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.quadraticCurveTo(wid, len * 0.35, 0, len); s.quadraticCurveTo(-wid, len * 0.35, 0, 0);
    const g = new THREE.ShapeGeometry(s, 14);
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), y = a.getY(i);
      a.setZ(i, -Math.abs(x) * fold + Math.pow(y / len, 2) * curl * len);
    }
    g.computeVertexNormals();
    return g;
  }
  function lumpy(r, det = 28, amt = 0.16) {
    const g = new THREE.SphereGeometry(r, det, Math.round(det * 0.7));
    const a = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i).normalize();
      const k = 1 + amt * Math.sin(v.x * 6.1) * Math.sin(v.y * 5.3 + 1.1) * Math.sin(v.z * 5.7 + 2.3) + amt * 0.5 * Math.sin(v.x * 13 + v.y * 11);
      v.multiplyScalar(r * k); a.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }
  function tube(points, r) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, r, 8), M.stem); }
  function addLeaf(parent, at, dir, len = 0.8, wid = 0.32) {
    const m = new THREE.Mesh(leafGeo(len, wid), M.leaf);
    m.position.copy(at);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    m.rotateY(Math.random() * Math.PI);
    parent.add(m);
    return m;
  }

  /* ---------------- fruit builders: each returns { obj, update(r) } ---------------- */
  function makeChilli() {
    const g = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const rr = 0.13 * Math.pow(Math.sin(Math.min(1, t * 1.05) * Math.PI * 0.5), 0.8) * (t > 0.9 ? 1 - (t - 0.9) * 4 : 1);
      pts.push(new THREE.Vector2(Math.max(0.001, rr), t * 1.05));
    }
    const geo = new THREE.LatheGeometry(pts, 28);
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) { const y = a.getY(i), t = 1 - y / 1.05; a.setX(i, a.getX(i) + 0.14 * t * t); }
    geo.computeVertexNormals();
    geo.rotateZ(Math.PI); geo.translate(0, 1.05, 0);          // tip up, base at y=0
    const mat = new THREE.MeshPhysicalMaterial({ color: "#3f7a2a", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15 });
    const body = new THREE.Mesh(geo, mat); g.add(body);
    const calyx = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.08, 14), M.stem); calyx.position.y = 0.02; g.add(calyx);
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(leafGeo(0.14, 0.07, 0.1, 0.4), M.leaf); s.position.y = 0.04; s.rotation.set(Math.PI * 0.62, (k / 5) * Math.PI * 2, 0, "YXZ"); g.add(s); }
    const G = new THREE.Color("#3f7a2a"), Y = new THREE.Color("#c27a17"), R = new THREE.Color("#b3150f");
    return { obj: g, update(r) {
      mat.color.copy(r < 0.5 ? G.clone().lerp(Y, r * 2) : Y.clone().lerp(R, (r - 0.5) * 2));
      const s = 0.75 + 0.25 * sm(0, 0.5, r); body.scale.set(s, s, s);
    } };
  }

  function makeBoll() {
    const g = new THREE.Group();
    const closedMat = new THREE.MeshStandardMaterial({ color: "#6f8f3a", roughness: 0.55 });
    const closed = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 20), closedMat);
    closed.scale.set(1, 1.3, 1); closed.position.y = 0.27; g.add(closed);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 12), closedMat); tip.position.y = 0.57; g.add(tip);
    const shellMat = new THREE.MeshStandardMaterial({ color: "#6b4a2a", roughness: 0.85, side: THREE.DoubleSide });
    const shells = [];
    for (let k = 0; k < 4; k++) {
      const geo = new THREE.SphereGeometry(0.205, 16, 14, Math.PI - Math.PI / 4.4, Math.PI / 2.2, 0, Math.PI * 0.92);
      geo.scale(1, 1.3, 1); geo.translate(0, 0.27, 0);
      const pivot = new THREE.Group(); pivot.rotation.y = (k * Math.PI) / 2;
      const m = new THREE.Mesh(geo, shellMat); pivot.add(m); g.add(pivot); shells.push(m);
    }
    const lintMat = new THREE.MeshPhysicalMaterial({ color: "#f7f4ee", roughness: 1, sheen: 1, sheenColor: new THREE.Color("#ffffff"), sheenRoughness: 0.6, emissive: new THREE.Color("#3a3833"), emissiveIntensity: 0.35 });
    const lint = [];
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(lumpy(0.17, 40, 0.22), lintMat);
      const ang = (k * Math.PI) / 2 + Math.PI / 4;
      m.userData.dir = new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang));
      g.add(m); lint.push(m);
    }
    const bractMat = M.leaf.clone();
    for (let k = 0; k < 3; k++) {
      const b = new THREE.Mesh(leafGeo(0.32, 0.2, 0.15, 0.3), bractMat);
      b.position.y = 0.04; b.rotation.set(Math.PI * 0.18, (k / 3) * Math.PI * 2, 0, "YXZ"); g.add(b);
    }
    const G = new THREE.Color("#6f8f3a"), B = new THREE.Color("#7a5a32"), leafG = new THREE.Color("#2f5a28");
    return { obj: g, update(r) {
      const dry = sm(0.15, 0.45, r);
      closedMat.color.copy(G.clone().lerp(B, dry));
      bractMat.color.copy(leafG.clone().lerp(M.leafDry, dry));
      const open = sm(0.38, 0.75, r);
      closed.visible = tip.visible = open < 0.02;
      shells.forEach((s) => { s.visible = open >= 0.02; s.rotation.z = -open * 1.25; });
      const fl = sm(0.42, 1, r);
      lint.forEach((m) => {
        const s = 0.05 + fl * 0.82;
        m.visible = fl > 0.01; m.scale.set(s, s * 1.08, s);
        m.position.set(m.userData.dir.x * 0.1 * fl, 0.3 + 0.1 * fl, m.userData.dir.z * 0.1 * fl);
      });
      const grow = 0.7 + 0.3 * sm(0, 0.3, r); g.scale.setScalar(grow);
    } };
  }

  function makePod(seeds, elong, seedColor, dryColor, seedR, size = 1) {
    const g = new THREE.Group();
    const podMat = new THREE.MeshStandardMaterial({ color: "#6d9a3a", roughness: 0.6, side: THREE.DoubleSide });
    const halves = [];
    const W = 0.13;
    for (const side of [0, 1]) {
      const geo = new THREE.SphereGeometry(W, 22, 16, side * Math.PI, Math.PI);
      geo.scale(1, elong, 0.62);
      const pivot = new THREE.Group(); pivot.position.x = -W;
      const m = new THREE.Mesh(geo, podMat); m.position.x = W; pivot.add(m);
      g.add(pivot); halves.push(pivot);
    }
    const seedMat = new THREE.MeshStandardMaterial({ color: seedColor, roughness: 0.5 });
    const seedMeshes = [];
    for (let i = 0; i < seeds; i++) {
      const s = new THREE.Mesh(lumpy(seedR, 16, 0.06), seedMat);
      s.position.y = seeds === 1 ? 0 : lerp(-W * elong * 0.55, W * elong * 0.55, i / (seeds - 1));
      g.add(s); seedMeshes.push(s);
    }
    const G = new THREE.Color("#6d9a3a"), D = new THREE.Color(dryColor);
    return { obj: g, update(r) {
      podMat.color.copy(G.clone().lerp(D, sm(0.1, 0.55, r)));
      const open = sm(0.5, 0.95, r);
      halves[0].rotation.y = open * 1.1; halves[1].rotation.y = -open * 1.1;
      seedMeshes.forEach((s) => { s.position.z = open * 0.06; });
      g.scale.setScalar(size * (0.75 + 0.25 * sm(0, 0.35, r)));
    } };
  }

  function makeEar() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: "#7f9a45", roughness: 0.55 });
    const awnMat = new THREE.MeshStandardMaterial({ color: "#9bb060", roughness: 0.6 });
    const levels = 11;
    for (let i = 0; i < levels; i++) {
      for (const side of [-1, 1]) {
        const taper = 1 - (i / levels) * 0.45, y = i * 0.07 + (side > 0 ? 0.035 : 0);
        const gr = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat);
        gr.scale.set(0.045 * taper, 0.075 * taper, 0.04 * taper);
        gr.position.set(side * 0.032 * taper, y, 0); gr.rotation.z = -side * 0.45;
        const pv = new THREE.Group(); pv.rotation.y = (i % 2) * Math.PI / 2; pv.add(gr); g.add(pv);
        const awn = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0012, 0.42, 4), awnMat);
        awn.position.set(side * (0.05 * taper + 0.07), y + 0.22, 0); awn.rotation.z = -side * 0.3;
        pv.add(awn);
      }
    }
    const G = new THREE.Color("#7f9a45"), Au = new THREE.Color("#d9a441"), AG = new THREE.Color("#9bb060"), AA = new THREE.Color("#f0d58c");
    return { obj: g, update(r) {
      mat.color.copy(G.clone().lerp(Au, sm(0.05, 0.85, r)));
      awnMat.color.copy(AG.clone().lerp(AA, sm(0.05, 0.85, r)));
      g.rotation.z = -sm(0.3, 1, r) * 0.35;
    } };
  }

  /* ---------------- plants ---------------- */
  const root = new THREE.Group(); scene.add(root);
  const fruits = [];
  let focus = new THREE.Object3D();
  let dust = null;

  function branchPlant(make, opts) {
    const stem = [new THREE.Vector3(-3.4, -1.7, 0.3), new THREE.Vector3(-1.8, -1.0, 0.15), new THREE.Vector3(-0.4, -0.45, 0), new THREE.Vector3(0.9, 0.05, -0.15), new THREE.Vector3(2.1, 0.55, -0.3)];
    const curve = new THREE.CatmullRomCurve3(stem);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.045, 10), M.stem));
    const nodes = opts.nodes;
    nodes.forEach((t, i) => {
      const P = curve.getPoint(t);
      const off = opts.offsets[i % opts.offsets.length];
      const F = P.clone().add(off);
      root.add(tube([P, P.clone().lerp(F, 0.5).add(new THREE.Vector3(0, opts.up ? 0.06 : -0.04, 0.02)), F], 0.022));
      const f = make();
      f.obj.position.copy(F);
      if (opts.hang) f.obj.rotation.z = Math.PI + (Math.random() - 0.5) * 0.5;
      else f.obj.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI, (Math.random() - 0.5) * 0.35);
      root.add(f.obj); fruits.push(f);
      addLeaf(root, P, new THREE.Vector3(-0.6, 0.7, 0.5), opts.leafLen, opts.leafLen * 0.42);
      addLeaf(root, P, new THREE.Vector3(0.5, 0.5, -0.6), opts.leafLen * 0.85, opts.leafLen * 0.38);
      if (TYPE === "boll") {  // palmate cotton leaves: extra lobes
        addLeaf(root, P, new THREE.Vector3(0.1, 0.9, 0.3), opts.leafLen * 0.9, opts.leafLen * 0.36);
      }
    });
    focus = fruits[Math.min(fruits.length - 1, Math.floor(fruits.length / 2))].obj;
  }

  function earPlant() {
    const bases = [[-0.5, 0.2], [0.05, -0.15], [0.5, 0.1], [-0.15, 0.35], [0.3, 0.3]];
    bases.slice(0, mobile ? 4 : 5).forEach(([x, z], i) => {
      const top = new THREE.Vector3(x * 1.4 + (i - 2) * 0.12, 0.35 + (i % 3) * 0.28, z);
      const pts = [new THREE.Vector3(x * 0.3, -2.6, z), new THREE.Vector3(x * 0.8, -1.2, z), new THREE.Vector3(top.x * 0.92, top.y - 0.9, z), top];
      root.add(tube(pts, 0.022));
      addLeaf(root, pts[1].clone(), new THREE.Vector3(x > 0 ? 0.6 : -0.6, 1, 0.2), 1.3, 0.12);
      addLeaf(root, pts[2].clone().lerp(pts[1], 0.4), new THREE.Vector3(x > 0 ? -0.5 : 0.5, 1, -0.2), 1.1, 0.1);
      const f = makeEar(); f.obj.position.copy(top); f.obj.rotation.y = i * 1.3; root.add(f.obj); fruits.push(f);
    });
    focus = fruits[1].obj;
    if (TYPE === "flour") {
      const N = 900, pos = new Float32Array(N * 3), seed = new Float32Array(N);
      for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 3.2; pos[i * 3 + 1] = Math.random() * 2.6 - 0.4; pos[i * 3 + 2] = (Math.random() - 0.5) * 1.6; seed[i] = Math.random(); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
      dust = new THREE.Points(g, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uT: { value: 0 }, uA: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
        vertexShader: "uniform float uT; uniform float uPx; attribute float seed; varying float vS; void main(){ vec3 p = position; p.y += mod(uT * (0.08 + seed * 0.12) + seed * 3., 3.) - 1.; p.x += sin(uT * .4 + seed * 30.) * .15; vec4 mv = modelViewMatrix * vec4(p,1.); gl_PointSize = (1.5 + seed * 3.5) * uPx * (5. / -mv.z); vS = seed; gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform float uA; varying float vS; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d) * uA * (.35 + vS * .5); gl_FragColor = vec4(1., .97, .9, a); }"
      }));
      root.add(dust);
    }
  }

  /* ---------- VIDEO MODE: a real video turned into a 3D relief, scrubbed by scroll ----------
     The black background is keyed out, bright parts (the cotton) are pushed forward in depth,
     and scrolling plays the video frame by frame (bud → open boll).
     To use a video on another product, add it to VIDEOS below (key = data-plant value). */
  let videoUpdate = null;
  function videoPlant(url, fallback) {
    const v = document.createElement("video");
    v.src = url; v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = "auto";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
    let failed = false;
    v.addEventListener("error", () => { if (failed) return; failed = true; root.clear(); videoUpdate = null; fallback(); }, { once: true });
    const tex = new THREE.VideoTexture(v);
    tex.colorSpace = THREE.NoColorSpace; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    v.addEventListener("seeked", () => { tex.needsUpdate = true; });
    v.addEventListener("loadeddata", () => { tex.needsUpdate = true; });
    v.play().then(() => v.pause()).catch(() => {});      // wakes the decoder on iOS so the first frame shows

    const WW = mobile ? 4.8 : 5.4, HH = WW * 9 / 16;
    const uni = { map: { value: tex }, uDepth: { value: mobile ? 0.45 : 0.6 }, uFade: { value: 0 }, uT: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `
        uniform sampler2D map; uniform float uDepth; uniform float uT; varying vec2 vUv; varying float vL;
        void main(){
          vUv = uv;
          vec2 o = vec2(0.014, 0.024);                                   // soft (blurred) brightness → smooth relief, no streaks
          vec3 c = texture2D(map, uv).rgb * 0.36 + (texture2D(map, uv + vec2(o.x, 0.0)).rgb + texture2D(map, uv - vec2(o.x, 0.0)).rgb + texture2D(map, uv + vec2(0.0, o.y)).rgb + texture2D(map, uv - vec2(0.0, o.y)).rgb) * 0.16;
          float l = max(c.r, max(c.g, c.b));
          float edge = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x) * smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.82, uv.y);
          vec3 p = position;
          p.z += smoothstep(0.08, 0.95, l) * uDepth * edge;                 // bright cotton comes forward
          p.z -= pow(uv.x - 0.5, 2.0) * 1.1 + pow(uv.y - 0.5, 2.0) * 0.5;  // gentle curve, like a lens
          p.z += sin(uT * 0.8 + uv.x * 3.0) * 0.03 * edge;                  // breathing
          vL = l;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform float uFade; varying vec2 vUv; varying float vL;
        void main(){
          vec3 c = texture2D(map, vUv).rgb;
          float l = max(c.r, max(c.g, c.b));
          float key = smoothstep(0.045, 0.16, l);                           // black background → transparent
          float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.86, vUv.x) * smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          gl_FragColor = vec4(c * 1.04, key * edge * uFade);
        }`
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(WW, HH, mobile ? 128 : 220, mobile ? 72 : 124), mat);
    root.add(plane);
    /* soft light behind the boll */
    const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(220,240,200,.35)"); r.addColorStop(1, "rgba(220,240,200,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(WW * 0.9, WW * 0.9), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.6 }));
    glow.position.set(0.15, 0.25, -0.7); root.add(glow);
    focus = new THREE.Object3D(); focus.position.set(0.15, 0.35, 0.3); root.add(focus);

    const FPS = 24; let fade = 0;
    videoUpdate = (vp, t) => {
      uni.uT.value = t;
      if (v.readyState >= 2) fade = Math.min(1, fade + 0.04);
      uni.uFade.value = fade;
      const d = v.duration; if (!d || !isFinite(d)) return;
      const target = Math.round(vp * (d - 0.06) * FPS) / FPS;   // whole frames only — no jitter when you stop scrolling
      if (!v.seeking && Math.abs(v.currentTime - target) > 0.5 / FPS) v.currentTime = target;
    };
  }
  const VIDEOS = { boll: "/videos/cottonprod.mp4" };
  const VIDEO = section.dataset.video || VIDEOS[TYPE] || "";

  /* ---------- PHOTO MODE: a real cut-out photo split into layers (tools/split-photo.py) ---------- */
  async function photoPlant(url) {
    const man = await (await fetch(url)).json();
    const base = url.slice(0, url.lastIndexOf("/") + 1);
    const WW = mobile ? 3.6 : 4.6, k = WW / man.w, HH = man.h * k;
    const loader = new THREE.TextureLoader(), maxAniso = renderer.capabilities.getMaxAnisotropy();
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(WW * 1.6, HH * 1.8), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0.55,
      map: (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,214,140,.45)"); r.addColorStop(1, "rgba(255,214,140,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })() }));
    glow.position.z = -0.6; root.add(glow);
    const uT = { value: 0 };
    const ordered = man.layers.slice().sort((a, b) => a.z - b.z);
    ordered.forEach((L, i) => {
      const tex = loader.load(base + L.src); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
      const seg = L.kind === "sway" ? 24 : 1;
      const geo = new THREE.PlaneGeometry(L.w * k, L.h * k, seg, seg);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      mat.color.setScalar(0.5);
      if (L.kind === "sway") {
        mat.onBeforeCompile = (sh) => {
          sh.uniforms.uT = uT;
          sh.vertexShader = "uniform float uT;\n" + sh.vertexShader.replace("#include <begin_vertex>",
            "vec3 transformed = position; float fx = 1.0 - uv.x; float fy = 1.0 - uv.y; float w = fx * fy;" +
            "transformed.x += sin(uT * 1.1 + uv.y * 3.0) * 0.06 * w; transformed.y += sin(uT * 0.8 + uv.x * 2.5) * 0.035 * w; transformed.z += sin(uT * 0.9 + uv.x * 4.0) * 0.12 * w;");
        };
      }
      const m = new THREE.Mesh(geo, mat);
      m.renderOrder = i;
      const home = new THREE.Vector3((L.x + L.w / 2) * k - WW / 2, -((L.y + L.h / 2) * k - HH / 2), L.z);
      const isPiece = L.kind === "piece";
      const from = isPiece
        ? new THREE.Vector3(home.x + (Math.random() - 0.5) * 5, home.y + 0.6 + Math.random() * 2.2, home.z + 0.8 + Math.random() * 2.2)
        : L.src.startsWith("bowl") ? new THREE.Vector3(home.x + 0.4, home.y + 1.6, home.z - 0.8)
        : L.kind === "sway" ? new THREE.Vector3(home.x + 0.6, home.y - 0.9, home.z - 0.9)
        : new THREE.Vector3(home.x + 1.4, home.y + 0.4, home.z - 0.5);
      const spin = new THREE.Euler(isPiece ? Math.random() * 6 : 0.3, isPiece ? Math.random() * 6 : (L.kind === "sway" ? -0.9 : 0.6), isPiece ? Math.random() * 6 : (L.kind === "sway" ? 0.5 : -0.35));
      m.position.copy(from); root.add(m);
      const seed = Math.random() * 6;
      fruits.push({ obj: m, update(r) {
        const e = 0.6 + 0.4 * (1 - Math.pow(1 - sm(0, 0.85, r), 3));   // already floating together on the first screen, locks in as you scroll
        m.position.lerpVectors(from, home, e);
        if (isPiece && e > 0.98) { m.position.y += Math.sin(clockT() * 1.4 + seed) * 0.015; }
        m.rotation.set(spin.x * (1 - e), spin.y * (1 - e), spin.z * (1 - e));
        mat.opacity = Math.min(1, clockT() / 1.2);
        mat.color.setScalar(0.72 + 0.28 * sm(0.1, 1, r));
      } });
      if (L.src.startsWith("bowl")) focus = m;
    });
    root.userData.uT = uT;
  }
  let _t = 0; const clockT = () => _t;

  const leafLen = 0.75;
  const PHOTO = section.dataset.photo;
  const bollPlant = () => branchPlant(makeBoll, { nodes: [0.46, 0.6, 0.74, 0.88, 0.99], offsets: [new THREE.Vector3(-0.05, 0.36, 0.1), new THREE.Vector3(0.12, 0.42, -0.08), new THREE.Vector3(0, 0.3, 0.14)], up: true, leafLen: 0.85 });
  if (VIDEO) videoPlant(VIDEO, bollPlant);
  else if (PHOTO) photoPlant(PHOTO).catch((e) => console.warn("photo layers unavailable", e));
  else if (TYPE === "chilli") branchPlant(makeChilli, { nodes: [0.48, 0.6, 0.72, 0.85, 0.97], offsets: [new THREE.Vector3(-0.1, 0.32, 0.1), new THREE.Vector3(0.12, 0.38, -0.05), new THREE.Vector3(0, 0.3, 0.12)], up: true, leafLen });
  else if (TYPE === "pod") branchPlant(() => makePod(2, 1.35, "#d9b77a", "#c9a96a", 0.075, 1.6), { nodes: [0.42, 0.52, 0.62, 0.72, 0.82, 0.92], offsets: [new THREE.Vector3(0.05, -0.32, 0.12), new THREE.Vector3(-0.08, -0.36, -0.06)], hang: true, leafLen: 0.5 });
  else if (TYPE === "soy") branchPlant(() => makePod(3, 2.5, "#e3c56a", "#8a6a3a", 0.07, 1.25), { nodes: [0.42, 0.53, 0.64, 0.75, 0.86, 0.96], offsets: [new THREE.Vector3(0.05, -0.42, 0.14), new THREE.Vector3(-0.1, -0.46, -0.08)], hang: true, leafLen: 0.7 });
  else if (TYPE === "ear" || TYPE === "flour") earPlant();
  else branchPlant(makeBoll, { nodes: [0.46, 0.6, 0.74, 0.88, 0.99], offsets: [new THREE.Vector3(-0.05, 0.36, 0.1), new THREE.Vector3(0.12, 0.42, -0.08), new THREE.Vector3(0, 0.3, 0.14)], up: true, leafLen: 0.85 });

  /* ---------------- scroll choreography ---------------- */
  const ch = [1, 2, 3, 4].map((i) => document.getElementById("psC" + i));
  const bg = document.getElementById("psBg"), prog = document.getElementById("psProg"), cut = document.getElementById("psCut");
  const camFrom = new THREE.Vector3(0, 0, 7.4), look = new THREE.Vector3(), fw = new THREE.Vector3(), tmp = new THREE.Vector3();
  const st = { p: 0, sp: 0, mx: 0, my: 0, smx: 0, smy: 0, t: 0 };
  addEventListener("pointermove", (e) => { st.mx = e.clientX / innerWidth - 0.5; st.my = e.clientY / innerHeight - 0.5; }, { passive: true });

  function progress() {
    const r = section.getBoundingClientRect(), total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }
  function chapter(el, o, blurPx, y) {
    const v = o.toFixed(3);
    if (el.__v === v) return; el.__v = v;
    el.style.opacity = v; el.style.visibility = o < 0.005 ? "hidden" : "visible";
    el.style.filter = blurPx > 0.05 ? `blur(${blurPx.toFixed(1)}px)` : "none";
    el.style.transform = `translate3d(0,${(y || 0).toFixed(1)}px,0)`;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 52 : 34; camera.updateProjectionMatrix();
  }
  resize(); addEventListener("resize", resize);

  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(section);
  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05); st.t += dt; _t = st.t; if (videoUpdate) videoUpdate(sm(0.03, 0.5, st.sp), st.t); if (root.userData.uT) root.userData.uT.value = st.t;
    st.p = progress();
    st.sp += (st.p - st.sp) * (reduced ? 1 : Math.min(1, dt * 5));
    st.smx += (st.mx - st.smx) * Math.min(1, dt * 2); st.smy += (st.my - st.smy) * Math.min(1, dt * 2);
    const p = st.sp;
    const FLAT = !!(PHOTO || VIDEO);

    /* ripening */
    const R = sm(0.1, 0.4, p);
    fruits.forEach((f, i) => f.update(clamp(R * 1.45 - (i / fruits.length) * 0.45, 0, 1)));
    if (dust) { dust.material.uniforms.uT.value = st.t; dust.material.uniforms.uA.value = sm(0.32, 0.45, p); }

    /* plant moves from the right to centre, then the camera swoops in */
    const move = sm(0.14, 0.33, p), swoop = sm(0.4, 0.58, p);
    const baseX = mobile ? 0.2 : (VIDEO ? 1.45 : FLAT ? 1.75 : 1.0), baseY = mobile ? (VIDEO ? -1.05 : -1.45) : -0.45, s = mobile ? 0.78 : 0.92;
    root.position.set(lerp(baseX, 0, move), lerp(baseY, mobile ? -0.3 : 0, move), 0);
    root.scale.setScalar(s);
    root.rotation.y = (FLAT ? lerp(-0.3, 0.12, sm(0, 0.4, p)) + swoop * 0.25 + st.smx * 0.3 : lerp(-0.55, 0.25, sm(0, 0.4, p)) + swoop * 1.3 + st.smx * 0.25) + (reduced ? 0 : Math.sin(st.t * 0.35) * 0.04);
    root.rotation.z = (reduced ? 0 : Math.sin(st.t * 0.5) * 0.02) + st.smy * 0.05;
    root.rotation.x = FLAT ? swoop * 0.12 - st.smy * 0.12 : swoop * 0.35;
    root.updateMatrixWorld(true);
    focus.getWorldPosition(fw); if (!FLAT) fw.y += 0.3 * s;
    look.set(0, 0, 0).lerp(fw, swoop);
    camera.position.copy(camFrom).lerp(tmp.copy(fw).add(FLAT ? new THREE.Vector3(0.35, -0.25, 2.4) : new THREE.Vector3(0.75, -0.45, 1.5)), swoop);
    camera.lookAt(look);

    /* blur the 3D away into the product colour */
    const away = sm(0.55, 0.62, p);
    canvas.style.opacity = (1 - away).toFixed(3);
    canvas.style.filter = away > 0.01 ? `blur(${(away * 16).toFixed(1)}px)` : "none";
    bg.style.setProperty("--bg2o", away.toFixed(3));

    /* chapters */
    const c1 = 1 - sm(0.08, 0.15, p);
    chapter(ch[0], c1, (1 - c1) * 12, -30 * (1 - c1));
    const c2 = sm(0.26, 0.32, p) * (1 - sm(0.4, 0.45, p));
    chapter(ch[1], c2, (1 - c2) * 14, 0);
    const c3 = sm(0.62, 0.67, p) * (1 - sm(0.76, 0.8, p));
    chapter(ch[2], c3, (1 - c3) * 14, 0);
    const c4 = sm(0.8, 0.86, p);
    chapter(ch[3], c4, (1 - c4) * 12, 40 * (1 - c4));
    if (cut && c4 > 0.01) {
      const q = sm(0.8, 1, p);
      const img = cut.firstElementChild;
      if (img) img.style.transform = `rotateY(${(-28 + 40 * q + st.smx * 12).toFixed(2)}deg) rotateZ(${(-8 + 10 * q).toFixed(2)}deg) translateY(${(60 - 80 * q).toFixed(1)}px)`;
    }
    if (prog) prog.style.width = (st.p * 100).toFixed(2) + "%";

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
