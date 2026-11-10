/* ==========================================================================
   Samriddhi — shared behaviour for every page
   Smooth scroll (Lenis) · reveals · nav · cursor · 3D tilt · page transitions
   · lazy videos · inquiry form. No build step needed.
   ========================================================================== */
(function () {
  "use strict";
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var SITE = window.SAMRIDDHI || { whatsapp: "917875371535", email: "info@samriddhi-agro.in" };

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
    window.lenis = lenis;
  }
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  } else if (lenis) {
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
  }

  /* in-page anchor links glide instead of jumping */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    var url = new URL(a.href, location.href);
    var samePage = url.pathname === location.pathname || (url.pathname === "/" && location.pathname === "/index.html");
    if (url.hash && samePage && url.origin === location.origin) {
      var el = document.querySelector(url.hash);
      if (el) {
        e.preventDefault();
        closeMenu();
        if (lenis) lenis.scrollTo(el, { offset: -10, duration: 1.6 }); else el.scrollIntoView({ behavior: "smooth" });
        history.replaceState(null, "", url.hash);
      }
      return;
    }
    /* page transition for internal page links */
    if (url.origin === location.origin && !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey && href.indexOf("mailto:") !== 0 && href.indexOf("tel:") !== 0) {
      var c = document.getElementById("curtain");
      if (!c || reduced) return;
      e.preventDefault();
      c.classList.add("in");
      setTimeout(function () { location.href = a.href; }, 560);
    }
  });
  /* restore the page if the browser brings it back from cache */
  addEventListener("pageshow", function (e) { if (e.persisted) { var c = document.getElementById("curtain"); if (c) c.classList.remove("in"); } });

  /* ---------- loader ---------- */
  var loader = document.getElementById("loader");
  var bar = loader && loader.querySelector(".bar i");
  var loadDone = false;
  window.samriddhiProgress = function (p) { if (bar) bar.style.width = Math.round(p * 100) + "%"; };
  window.samriddhiReady = function () {
    if (loadDone) return; loadDone = true;
    if (bar) bar.style.width = "100%";
    setTimeout(function () { if (loader) loader.classList.add("done"); document.documentElement.classList.add("ready"); kickHero(); }, 250);
  };
  /* never block the page for long, even if 3D is slow or unsupported */
  setTimeout(function () { window.samriddhiReady(); }, document.body.classList.contains("home") ? 2600 : 700);
  addEventListener("load", function () { if (!document.body.classList.contains("home")) window.samriddhiReady(); });

  /* ---------- split headings into words for the rise-in effect ---------- */
  function split(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w";
            var s = document.createElement("span"); s.textContent = part; s.style.setProperty("--i", i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
  }
  document.querySelectorAll(".split").forEach(split);

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  function kickHero() {
    document.querySelectorAll("[data-reveal], .split").forEach(function (el) {
      if (el.closest(".hero-panel:not([data-panel='0'])")) return;
      io.observe(el);
    });
  }

  /* ---------- nav: hide on scroll down, light theme over cream sections ---------- */
  var nav = document.getElementById("nav");
  var lastY = 0;
  var darkSecs = [];
  function collectDark() { darkSecs = Array.prototype.slice.call(document.querySelectorAll(".hero, .sec.dark, .p-hero, .cta, .foot")); }
  collectDark();
  function onScroll() {
    var y = lenis ? lenis.scroll : scrollY;
    if (nav) {
      nav.classList.toggle("hide", y > lastY && y > 300 && !nav.classList.contains("open"));
      var probe = 40, dark = false;
      for (var i = 0; i < darkSecs.length; i++) {
        var r = darkSecs[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) { dark = true; break; }
      }
      nav.classList.toggle("light", !dark);
    }
    lastY = y;
  }
  if (lenis) lenis.on("scroll", onScroll); else addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.getElementById("burger");
  function closeMenu() { if (nav) { nav.classList.remove("open"); if (burger) burger.setAttribute("aria-expanded", "false"); if (lenis) lenis.start(); } }
  if (burger) burger.addEventListener("click", function () {
    var open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });

  /* ---------- cursor ---------- */
  var cur = document.getElementById("cursor");
  if (cur && finePointer && !reduced) {
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() { cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; cur.style.transform = "translate3d(" + cx + "px," + cy + "px,0)"; requestAnimationFrame(loop); })();
    document.addEventListener("pointerover", function (e) {
      cur.classList.toggle("big", !!(e.target.closest && e.target.closest("a, button, .card, .flip, summary, .globe-wrap")));
    });
  } else if (cur) cur.remove();

  /* ---------- 3D tilt on hover ---------- */
  if (finePointer && !reduced) {
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      var max = parseFloat(el.getAttribute("data-tilt")) || 8;
      var raf = 0;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", px * 100 + "%"); el.style.setProperty("--my", py * 100 + "%");
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.transform = "rotateX(" + ((0.5 - py) * max) + "deg) rotateY(" + ((px - 0.5) * max) + "deg)";
        });
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- lazy, crisp videos: load when near, play only while visible ---------- */
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting) {
        if (!v.src && v.dataset.src) {
          v.addEventListener("error", function () { v.closest(".media") && v.closest(".media").classList.add("missing"); }, { once: true });
          v.src = v.dataset.src;
        }
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) v.pause();
    });
  }, { rootMargin: "200px 0px" });
  document.querySelectorAll("video[data-src]").forEach(function (v) { vio.observe(v); });

  /* subtle parallax inside media tiles */
  if (window.gsap && window.ScrollTrigger && !reduced) {
    document.querySelectorAll(".band .tile").forEach(function (t) {
      var m = t.querySelector("video, img");
      if (m) gsap.fromTo(m, { yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: t, start: "top bottom", end: "bottom top", scrub: true } });
    });
    var cta = document.querySelector(".cta .bgimg");
    if (cta) gsap.fromTo(cta, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".cta", start: "top bottom", end: "bottom top", scrub: true } });
  }

  /* ---------- process steps: line draws as you scroll ---------- */
  document.querySelectorAll(".steps").forEach(function (steps) {
    var items = steps.querySelectorAll(".step");
    function upd() {
      var r = steps.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / (r.height + innerHeight * 0.25)));
      steps.style.setProperty("--p", p.toFixed(3));
      items.forEach(function (s, i) { s.classList.toggle("on", p >= (i + 0.2) / items.length); });
    }
    if (lenis) lenis.on("scroll", upd); else addEventListener("scroll", upd, { passive: true });
    upd();
  });

  /* ---------- flip cards: tap support on touch ---------- */
  document.querySelectorAll(".flip").forEach(function (f) {
    f.addEventListener("click", function (e) { if (!finePointer && !e.target.closest("a")) f.classList.toggle("on"); });
  });

  /* ---------- inquiry form → WhatsApp / email (no server needed) ---------- */
  var form = document.getElementById("inq");
  if (form) {
    function compose() {
      var d = new FormData(form), lines = ["Hello Samriddhi, I would like a quote.", ""];
      [["name", "Name"], ["company", "Company"], ["phone", "Phone"], ["role", "I am a"], ["commodity", "Commodity"], ["qty", "Quantity"], ["where", "Delivery"], ["notes", "Specification / notes"]]
        .forEach(function (k) { var v = (d.get(k[0]) || "").toString().trim(); if (v) lines.push(k[1] + ": " + v); });
      return lines.join("\n");
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      window.open("https://wa.me/" + SITE.whatsapp + "?text=" + encodeURIComponent(compose()), "_blank", "noopener");
    });
    var mb = document.getElementById("mailBtn");
    if (mb) mb.addEventListener("click", function () {
      if (!form.reportValidity()) return;
      location.href = "mailto:" + SITE.email + "?subject=" + encodeURIComponent("Quote request — " + (form.commodity ? form.commodity.value : "")) + "&body=" + encodeURIComponent(compose());
    });
  }

  /* pre-select commodity from ?c= link */
  var qp = new URLSearchParams(location.search).get("c");
  if (qp && form && form.commodity) Array.prototype.forEach.call(form.commodity.options, function (o) { if (o.value.toLowerCase().indexOf(qp.toLowerCase()) === 0) form.commodity.value = o.value; });

  window.addEventListener("resize", collectDark);
})();
