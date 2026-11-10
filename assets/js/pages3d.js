/* ==========================================================================
   Samriddhi — inner pages 3D (What We Do, Supply Chain, Markets,
   Market Intelligence, For Buyers, For Suppliers, Insights, Trade Stories,
   Request a Quote). Each hero picks its scene with <canvas data-scene="...">:
     network  – a living trade network: farms → hubs → buyers with moving pulses
     route    – a 3D supply route with sacks travelling along it
     globe    – dotted globe with trade arcs from India
     bars     – a field of 3D market bars rising and falling like prices
     sacks    – grain sacks dropping in and stacking into a pyramid
     sprouts  – a field of seedlings growing in waves
     pages    – floating report pages drifting in 3D
     grains   – a slow vortex of grains
   Also: timeline fill (.pg-steps) and forms that send to WhatsApp / email.
   ========================================================================== */
import * as THREE from "/assets/js/vendor/three.module.min.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 760px)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const rnd = (a, b) => a + Math.random() * (b - a);
const scrollTop = () => (window.lenis ? window.lenis.scroll : scrollY);
const onScroll = (fn) => { if (window.lenis) window.lenis.on("scroll", fn); else addEventListener("scroll", fn, { passive: true }); addEventListener("resize", fn); fn(); };
const GREEN = new THREE.Color("#7bb342"), LIGHT = new THREE.Color("#a9d57a"), GOLD = new THREE.Color("#e3b34e"), CREAM = new THREE.Color("#f4f1e6");

/* ---------- shared stage: renderer, camera, lights, mouse, resize, pause ---------- */
function stage(canvas, hero, opt = {}) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(opt.fov || 36, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight("#eef8e4", "#0d2216", 1.1));
  const key = new THREE.DirectionalLight("#fff3da", 2.4); key.position.set(-4, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight("#bfe39a", 1.4); rim.position.set(5, 2, -4); scene.add(rim);
  const group = new THREE.Group(); scene.add(group);
  const st = { mx: 0, my: 0, sx: 0, sy: 0, t: 0, p: 0 };
  addEventListener("pointermove", (e) => { st.mx = e.clientX / innerWidth - 0.5; st.my = e.clientY / innerHeight - 0.5; }, { passive: true });
  const place = opt.place || [3.1, -0.1, 0, 2];        // x on wide screens, y on wide, x on narrow, y-drop on narrow
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const wide = w / h > 1.1;
    group.position.set(wide ? place[0] : place[2], wide ? place[1] : -place[3], 0);
    group.scale.setScalar(wide ? (opt.scale || 1) : (opt.scale || 1) * 0.72);
  }
  resize(); addEventListener("resize", resize);
  let vis = true; new IntersectionObserver((e) => { vis = e[0].isIntersecting; }).observe(hero);
  const clock = new THREE.Clock(), cams = opt.cam || [0, 0.6, 8];
  return {
    R, scene, cam, group, st,
    run(fn) {
      (function frame() {
        requestAnimationFrame(frame);
        if (!vis || document.hidden) { clock.getDelta(); return; }
        const dt = Math.min(clock.getDelta(), 0.05) * (reduced ? 0.3 : 1); st.t += dt;
        st.sx += (st.mx - st.sx) * 0.05; st.sy += (st.my - st.sy) * 0.05;
        st.p = sm(0, 1, scrollTop() / hero.offsetHeight);
        cam.position.set(cams[0] + st.sx * 1.1, cams[1] - st.sy * 0.7, cams[2] - st.p * 1.6);
        cam.lookAt(group.position.x * 0.55, group.position.y * 0.5, 0);
        fn(dt, st);
        R.render(scene, cam);
      })();
    }
  };
}
function glowTex() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
function lumpy(r, det = 18, amt = 0.12) {
  const g = new THREE.SphereGeometry(r, det, Math.round(det * 0.7)), a = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).normalize(); const k = 1 + amt * Math.sin(v.x * 5.1) * Math.sin(v.y * 4.3 + 1) * Math.sin(v.z * 4.7 + 2); v.multiplyScalar(r * k); a.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}

/* ---------- scenes ---------- */
const SCENES = {
  network(s) {
    const { group } = s, nodes = [], mat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
    const layers = [{ n: mobile ? 14 : 22, x: -2.2, r: 1.6, c: GOLD, size: 0.07 }, { n: 6, x: 0, r: 1.1, c: GREEN, size: 0.14 }, { n: mobile ? 7 : 10, x: 2.2, r: 1.5, c: LIGHT, size: 0.1 }];
    layers.forEach((L, li) => { for (let i = 0; i < L.n; i++) {
      const a = (i / L.n) * Math.PI * 2 + rnd(-0.2, 0.2), r = L.r * Math.sqrt(rnd(0.15, 1));
      const p = new THREE.Vector3(L.x + rnd(-0.25, 0.25), Math.sin(a) * r, Math.cos(a) * r);
      const m = new THREE.Mesh(new THREE.SphereGeometry(L.size, 18, 12), mat.clone()); m.material.color.copy(L.c); m.material.emissive = L.c.clone().multiplyScalar(0.35);
      m.position.copy(p); group.add(m); nodes.push({ p, li });
    } });
    const links = [], lineMat = new THREE.LineBasicMaterial({ color: "#a9d57a", transparent: true, opacity: 0.28 });
    const near = (p, li) => nodes.filter((o) => o.li === li).sort((a, b) => a.p.distanceTo(p) - b.p.distanceTo(p));
    nodes.forEach((o) => { if (o.li < 2) near(o.p, o.li + 1).slice(0, o.li === 0 ? 1 : 3).forEach((t) => links.push([o.p, t.p])); });
    const curves = links.map(([a, b]) => { const mid = a.clone().lerp(b, 0.5); mid.z += 0.25; return new THREE.QuadraticBezierCurve3(a, mid, b); });
    curves.forEach((c) => group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(20)), lineMat)));
    const pulses = [], pm = new THREE.SpriteMaterial({ map: glowTex(), color: "#d8f5b0", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < (mobile ? 25 : 50); i++) { const sp = new THREE.Sprite(pm); sp.scale.setScalar(0.16); group.add(sp); pulses.push({ sp, c: curves[i % curves.length], t: Math.random(), v: rnd(0.25, 0.5) }); }
    s.run((dt, st) => {
      group.rotation.y = -0.45 + Math.sin(st.t * 0.2) * 0.25 + st.sx * 0.4 + st.p * 0.6; group.rotation.x = st.sy * 0.3;
      pulses.forEach((q) => { q.t = (q.t + q.v * dt) % 1; q.sp.position.copy(q.c.getPoint(q.t)); });
    });
  },

  route(s) {
    const { group } = s;
    const pts = [[-3.2, -1.2, -1.5], [-1.8, 0.4, -0.4], [-0.4, -0.6, 0.6], [1, 0.5, 0.2], [2.4, -0.3, 1], [3.4, 0.9, 0.4]].map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.05, 10), new THREE.MeshStandardMaterial({ color: "#7bb342", emissive: "#3d7a1f", emissiveIntensity: 0.6, roughness: 0.4 })));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.14, 10), new THREE.MeshBasicMaterial({ color: "#a9d57a", transparent: true, opacity: 0.08 })));
    [0, 0.33, 0.66, 1].forEach((t) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 12, 48), new THREE.MeshStandardMaterial({ color: "#f4f1e6", emissive: "#a9d57a", emissiveIntensity: 0.8 }));
      ring.position.copy(curve.getPoint(t)); ring.lookAt(curve.getPoint(Math.min(1, t + 0.01)).add(new THREE.Vector3(0, 0, 0.0001))); group.add(ring);
    });
    const sackG = lumpy(0.13, 16, 0.08); sackG.scale(1, 0.75, 0.85);
    const sacks = [], sm2 = new THREE.MeshStandardMaterial({ color: "#d8c08a", roughness: 0.85 });
    for (let i = 0; i < (mobile ? 10 : 16); i++) { const m = new THREE.Mesh(sackG, sm2); group.add(m); sacks.push({ m, t: i / (mobile ? 10 : 16) }); }
    s.run((dt, st) => {
      group.rotation.y = -0.3 + st.sx * 0.5 + st.p * 0.4; group.rotation.x = 0.15 + st.sy * 0.3;
      sacks.forEach((q) => { q.t = (q.t + dt * 0.06 * (1 + st.p * 2)) % 1; q.m.position.copy(curve.getPoint(q.t)); q.m.position.y += 0.16; q.m.rotation.y = q.t * 12; });
    });
  },

  async globe(s) {
    const { group } = s; const { LAND } = await import("/assets/js/land.js");
    const ll = (la, lo, r = 1.6) => { const ph = (90 - la) * Math.PI / 180, th = (lo + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); };
    const spin = new THREE.Group(); group.add(spin);
    spin.add(new THREE.Mesh(new THREE.SphereGeometry(1.58, 48, 32), new THREE.MeshBasicMaterial({ color: "#123824" })));
    const pos = [], col = [], cA = new THREE.Color("#cfe6bf"), cI = new THREE.Color("#ffd166");
    for (let i = 0; i < LAND.length; i += 2) { const la = LAND[i] / 10, lo = LAND[i + 1] / 10, v = ll(la, lo, 1.605); pos.push(v.x, v.y, v.z); const ind = la > 7 && la < 36 && lo > 68 && lo < 97.5; const c = ind ? cI : cA; col.push(c.r, c.g, c.b); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    spin.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, map: glowTex(), transparent: true, depthWrite: false })));
    const hub = ll(19.07, 73), dests = [[28.6, 77.2], [22.6, 88.4], [25.2, 55.3], [1.3, 103.8], [23.8, 90.4], [6.9, 79.9], [51.9, 4.5], [-4, 39.7], [24.7, 46.7]];
    const arcMat = new THREE.MeshBasicMaterial({ color: "#a9d57a", transparent: true, opacity: 0.75 }), movers = [];
    dests.forEach(([la, lo]) => { const b = ll(la, lo), m = hub.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(1.6 + hub.distanceTo(b) * 0.35);
      const c = new THREE.QuadraticBezierCurve3(hub, m, b); spin.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.008, 5), arcMat));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#fff2c0", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(0.14); spin.add(sp); movers.push({ sp, c, t: Math.random() }); });
    spin.rotation.y = -Math.atan2(hub.x, hub.z); group.rotation.x = 0.3;
    s.run((dt, st) => { spin.rotation.y += dt * 0.06; group.rotation.z = st.sx * 0.15; movers.forEach((q) => { q.t = (q.t + dt * 0.35) % 1; q.sp.position.copy(q.c.getPoint(q.t)); }); });
  },

  bars(s) {
    const { group } = s, n = mobile ? 8 : 11, N = n * n;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 1, 0.22).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.05 }), N);
    group.add(mesh); group.rotation.set(0.5, -0.7, 0);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(n * 0.3 + 0.4, n * 0.3 + 0.4), new THREE.MeshBasicMaterial({ color: "#1b4a2c", transparent: true, opacity: 0.6 })); base.rotation.x = -Math.PI / 2; group.add(base);
    const M = new THREE.Matrix4(), C = new THREE.Color(), lowC = new THREE.Color("#2f6e3f");
    s.run((dt, st) => {
      group.rotation.y = -0.7 + st.sx * 0.4 + st.p * 0.5;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const k = i * n + j, x = (i - n / 2 + 0.5) * 0.3, z = (j - n / 2 + 0.5) * 0.3;
        const h = 0.15 + 0.9 * (0.5 + 0.5 * Math.sin(st.t * 0.9 + i * 0.55) * Math.cos(st.t * 0.7 + j * 0.45)) * (1 + st.p * 0.6);
        M.makeScale(1, h, 1).setPosition(x, 0, z); mesh.setMatrixAt(k, M);
        C.copy(lowC).lerp(h > 0.8 ? GOLD : GREEN, clamp(h / 1.1, 0, 1)); mesh.setColorAt(k, C);
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    });
  },

  sacks(s) {
    const { group } = s, sackG = lumpy(0.3, 20, 0.07); sackG.scale(1.3, 0.62, 0.9);
    const colors = ["#d9c28c", "#cdb37a", "#e2cf9d", "#c7a96a"].map((c) => new THREE.Color(c)), list = [];
    let k = 0; for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) for (let j = 0; j < 2; j++) {
      const m = new THREE.Mesh(sackG, new THREE.MeshStandardMaterial({ color: colors[k % 4], roughness: 0.9 }));
      const home = new THREE.Vector3((i - (3 - row) / 2) * 0.82, -1 + row * 0.38, (j - 0.5) * 0.62);
      m.rotation.y = rnd(-0.08, 0.08); group.add(m); list.push({ m, home, d: k * 0.12 }); k++;
    }
    group.rotation.set(0.15, -0.5, 0);
    s.run((dt, st) => {
      group.rotation.y = -0.5 + st.sx * 0.5 + st.p * 0.6;
      list.forEach((q) => { const t = reduced ? 1 : sm(q.d, q.d + 0.8, st.t); const drop = (1 - t) * 4; const bounce = t < 1 ? Math.abs(Math.sin(t * Math.PI * 2)) * 0.1 * (1 - t) : 0; q.m.position.set(q.home.x, q.home.y + drop + bounce, q.home.z); q.m.visible = st.t > q.d; });
    });
  },

  sprouts(s) {
    const { group } = s, n = mobile ? 10 : 14, N = n * n;
    const soil = new THREE.Mesh(new THREE.BoxGeometry(n * 0.32, 0.2, n * 0.32), new THREE.MeshStandardMaterial({ color: "#5c4227", roughness: 1 })); soil.position.y = -0.1; group.add(soil);
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.018, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: "#6aa84f" }), N);
    const leafG = new THREE.SphereGeometry(1, 10, 6); leafG.scale(0.1, 0.02, 0.045);
    const leftL = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: "#7bb342" }), N), rightL = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: "#8cc152" }), N);
    group.add(stems, leftL, rightL); group.rotation.set(0.55, -0.6, 0);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
    s.run((dt, st) => {
      group.rotation.y = -0.6 + st.sx * 0.4 + st.p * 0.5;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const k = i * n + j, x = (i - n / 2 + 0.5) * 0.3, z = (j - n / 2 + 0.5) * 0.3, d = Math.hypot(x, z);
        const grow = (reduced ? 1 : sm(d * 0.6, d * 0.6 + 1.6, st.t)) * (0.55 + 0.25 * Math.sin(st.t * 1.4 - d * 2.2) + st.p * 0.4);
        const h = Math.max(0.001, grow * 0.55);
        E.set(Math.sin(st.t * 1.2 + x * 3) * 0.12, 0, Math.cos(st.t + z * 3) * 0.12); Q.setFromEuler(E);
        P.set(x, 0, z); S.set(1, h, 1); M.compose(P, Q, S); stems.setMatrixAt(k, M);
        const ls = Math.max(0.001, sm(0.3, 0.9, grow));
        P.set(x + 0.06 * ls, h * 0.85, z); E.set(0, 0, 0.5); Q.setFromEuler(E); S.setScalar(ls); M.compose(P, Q, S); leftL.setMatrixAt(k, M);
        P.set(x - 0.06 * ls, h * 0.7, z); E.set(0, Math.PI, 0.5); Q.setFromEuler(E); M.compose(P, Q, S); rightL.setMatrixAt(k, M);
      }
      stems.instanceMatrix.needsUpdate = leftL.instanceMatrix.needsUpdate = rightL.instanceMatrix.needsUpdate = true;
    });
  },

  pages(s) {
    const { group } = s;
    const c = document.createElement("canvas"); c.width = 256; c.height = 340; const g = c.getContext("2d");
    g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 256, 340); g.fillStyle = "#4e8f2a"; g.fillRect(24, 26, 120, 14);
    g.fillStyle = "#c9d6c0"; for (let y = 64; y < 300; y += 18) g.fillRect(24, y, 160 + Math.random() * 50, 7);
    g.fillStyle = "#e3b34e"; g.fillRect(24, 250, 70, 50); g.fillStyle = "#7bb342"; g.fillRect(104, 230, 40, 70); g.fillRect(154, 210, 40, 90);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }), list = [];
    for (let i = 0; i < (mobile ? 9 : 14); i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1, 1, 1), mat); m.position.set(rnd(-1.8, 1.8), rnd(-1.8, 1.8), rnd(-1.5, 1.2)); group.add(m); list.push({ m, r: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-0.4, 0.4)), v: rnd(0.08, 0.2), ph: rnd(0, 6) }); }
    s.run((dt, st) => {
      group.rotation.y = st.sx * 0.5 + st.p * 0.5;
      list.forEach((q) => { q.m.position.y += q.v * dt; if (q.m.position.y > 2.2) q.m.position.y = -2.2; q.m.rotation.set(q.r.x * Math.sin(st.t * 0.3 + q.ph), q.r.y * Math.sin(st.t * 0.25 + q.ph) + 0.4, q.r.z); });
    });
  },

  grains(s) {
    const { group } = s, N = mobile ? 400 : 900;
    const geo = new THREE.SphereGeometry(1, 10, 7); geo.scale(0.06, 0.035, 0.04);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), N); group.add(mesh);
    const items = [], pal = ["#e3b34e", "#d9c28c", "#7bb342", "#c8572e", "#f4f1e6"].map((c) => new THREE.Color(c));
    for (let i = 0; i < N; i++) { items.push({ a: rnd(0, 6.28), r: rnd(0.4, 2.1), y: rnd(-1.4, 1.4), v: rnd(0.2, 0.5), s: rnd(0.7, 1.3) }); mesh.setColorAt(i, pal[i % 5]); }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
    group.rotation.x = 0.35;
    s.run((dt, st) => {
      group.rotation.z = st.sx * 0.3;
      items.forEach((it, i) => { it.a += dt * it.v / it.r * (1 + st.p * 1.5); const r = it.r * (1 - st.p * 0.3); P.set(Math.cos(it.a) * r, it.y * (0.6 + r * 0.25), Math.sin(it.a) * r); E.set(it.a * 2, it.a, 0); Q.setFromEuler(E); S.setScalar(it.s); M.compose(P, Q, S); mesh.setMatrixAt(i, M); });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
};

function hero3d() {
  const canvas = document.querySelector("canvas.pg-canvas[data-scene]");
  if (!canvas) return;
  const hero = canvas.closest("section");
  const name = canvas.dataset.scene;
  const presets = {
    network: { place: [3.5, 0, 0, 2.2], scale: 0.78 }, route: { place: [3.6, 0, 0, 2.2], scale: 0.62 },
    globe: { place: [3.4, -0.1, 0, 2.2], scale: 0.95 }, bars: { cam: [0, 1.4, 8], place: [3.6, -0.3, 0, 2.2], scale: 0.85 },
    sacks: { cam: [0, 0.8, 8], place: [3.3, 0, 0, 2.2] }, sprouts: { cam: [0, 1.2, 7.6], place: [3.4, -0.2, 0, 2.2], scale: 0.85 },
    pages: { place: [3.4, 0, 0, 2.2], scale: 0.85 }, grains: { place: [3.6, 0, 0, 2.4], scale: 0.72 }
  };
  try { const s = stage(canvas, hero, presets[name] || {}); (SCENES[name] || SCENES.grains)(s); } catch (e) { console.warn("3D scene unavailable", e); }
}

/* ---------- timeline fill ---------- */
function steps() {
  document.querySelectorAll(".pg-steps").forEach((wrap) => {
    const items = Array.from(wrap.querySelectorAll(".pg-step"));
    onScroll(() => {
      const r = wrap.getBoundingClientRect();
      const p = clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
      wrap.style.setProperty("--p", p.toFixed(3));
      items.forEach((it) => { const ir = it.getBoundingClientRect(); it.classList.toggle("on", ir.top < innerHeight * 0.62); });
    });
  });
}

/* ---------- forms → WhatsApp / email ---------- */
function forms() {
  const SITE = window.SAMRIDDHI || { whatsapp: "917875371535", email: "info@samriddhi-agro.in" };
  document.querySelectorAll("form[data-send]").forEach((form) => {
    const title = form.dataset.send;
    const compose = () => {
      const lines = ["Hello Samriddhi — " + title, ""];
      form.querySelectorAll("input, select, textarea").forEach((el) => {
        const v = (el.value || "").trim(); if (!v) return;
        const lab = el.closest("label"), sp = lab && lab.querySelector("span"); const name = sp ? sp.textContent.replace(/\*\s*$/, "").trim() : el.name;
        lines.push(name + ": " + v);
      });
      return lines.join("\n");
    };
    form.addEventListener("submit", (e) => { e.preventDefault(); if (!form.reportValidity()) return; window.open("https://wa.me/" + SITE.whatsapp + "?text=" + encodeURIComponent(compose()), "_blank", "noopener"); });
    const mail = form.querySelector("[data-mail]");
    if (mail) mail.addEventListener("click", () => { if (!form.reportValidity()) return; location.href = "mailto:" + SITE.email + "?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(compose()); });
  });
}

const ok = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
if (ok) hero3d();
steps();
forms();