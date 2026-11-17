/* ==========================================================================
   Shader Button — a dark pill with a lime-green light that sweeps around it,
   with a fine film-grain texture. On hover the light settles into a soft
   olive glow. Applied to every element with  data-shader  (the navbar
   "Request a Quote" button gets it automatically).
   Falls back to a CSS gradient if WebGL is not available.
   ========================================================================== */
(function () {
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FRAG = [
    "precision mediump float;",
    "uniform vec2 uRes; uniform float uT; uniform float uHover;",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / uRes; vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);",
    "  float a = uT * 0.55;",
    "  vec2 dir = vec2(cos(a), sin(a));",
    "  float band = dot(p, dir) / (0.5 * uRes.x / uRes.y);",          // -1..1 across the pill
    "  float n = noise(p * 2.2 + uT * 0.25) * 0.2 + noise(p * 5.0 - uT * 0.4) * 0.07;",
    "  float glow = smoothstep(0.0, 1.05, band + n - 0.1);",
    "  vec3 dark = vec3(0.02, 0.07, 0.02);",
    "  vec3 lime = vec3(0.72, 1.0, 0.27);",
    "  vec3 olive = vec3(0.30, 0.42, 0.13);",
    "  vec3 col = mix(dark, lime, glow);",
    "  vec3 hov = mix(dark, olive, smoothstep(-0.9, 0.6, uv.x * 2.0 - 1.0 + n * 0.6) * 0.95 + 0.05);",
    "  col = mix(col, hov, uHover);",
    "  float grain = (hash(gl_FragCoord.xy + fract(uT) * 91.0) - 0.5) * 0.12;",  // film grain
    "  gl_FragColor = vec4(col + grain, 1.0);",
    "}"
  ].join("\n");
  var VERT = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";

  function make(btn) {
    if (btn.__shader) return; btn.__shader = 1;
    btn.classList.add("shader-btn");
    var cv = document.createElement("canvas"); cv.className = "shader-btn-bg"; cv.setAttribute("aria-hidden", "true");
    btn.insertBefore(cv, btn.firstChild);
    var gl = cv.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (!gl) { btn.classList.add("no-gl"); return; }
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { btn.classList.add("no-gl"); return; }
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(pr, "uRes"), uT = gl.getUniformLocation(pr, "uT"), uH = gl.getUniformLocation(pr, "uHover");
    var hover = 0, want = 0, t = Math.random() * 10, last = performance.now(), visible = true;
    btn.addEventListener("pointerenter", function () { want = 1; });
    btn.addEventListener("pointerleave", function () { want = 0; });
    btn.addEventListener("focus", function () { want = 1; });
    btn.addEventListener("blur", function () { want = 0; });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(btn);
    function size() {
      var d = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(btn.offsetWidth * d), h = Math.round(btn.offsetHeight * d);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!visible || document.hidden) return;
      size();
      if (!reduced) t += dt * (1 - hover * 0.7);
      hover += (want - hover) * Math.min(1, dt * 8);
      gl.uniform2f(uRes, cv.width, cv.height); gl.uniform1f(uT, t); gl.uniform1f(uH, hover);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    })(last);
  }
  function init() {
    document.querySelectorAll(".nav .btn.quote, [data-shader]").forEach(make);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();