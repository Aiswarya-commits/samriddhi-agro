/* ==========================================================================
   "Ask Samriddhi" — AI trade assistant (chat panel on every page).
   Talks to /api/chat (keeps the AI key on the server). Streams answers live,
   prepares quote enquiries that send to WhatsApp / email in one tap,
   remembers the conversation while you browse, supports voice input.
   ========================================================================== */
(function () {
  if (window.__samChat) return; window.__samChat = 1;
  var CFG = window.SAMRIDDHI || {}, WA = CFG.whatsapp || "917875371535", MAIL = CFG.email || "info@samriddhi-agro.in";
  var KEY = "samChat.v1", busy = false, ctrl = null;
  var store = { get: function () { try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch (e) { return []; } },
                set: function (v) { try { sessionStorage.setItem(KEY, JSON.stringify(v.slice(-30))); } catch (e) {} } };
  var hist = store.get();      // [{role, content, enquiry?}]

  /* chips that fit the page you are on */
  var path = location.pathname, prod = (path.match(/\/products\/([a-z]+)\.html/) || [])[1] || (location.hash.match(/#pf-([a-z]+)/) || [])[1];
  var NAMES = { cereals: "wheat or maize", oilseeds: "soybean or groundnut", pulses: "chana or tur", cotton: "cotton bales", spices: "turmeric or cumin", flour: "atta or maida" };
  var chips = prod ? ["Which " + (NAMES[prod] || "grades") + " do you supply?", "How is it packed and delivered?", "Get a quote for " + (NAMES[prod] || "this product").split(" or ")[0]]
    : /supplier/.test(path) ? ["How can my FPO sell to you?", "How and when do you pay?", "What quality parameters do you check?"]
    : /quality/.test(path) ? ["What tests do you run before dispatch?", "Which documents come with a delivery?", "Do you handle export paperwork?"]
    : ["What commodities do you supply?", "Can you deliver a full railway rake?", "I need a quote", "Do you export?"];

  /* ---------- build the UI ---------- */
  var root = document.createElement("div"); root.className = "sc"; root.setAttribute("data-lenis-prevent", "");
  root.innerHTML =
    '<button class="sc-launch" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Ask Samriddhi — AI trade assistant">' +
      '<span class="sc-orb" aria-hidden="true"><i></i></span><span class="sc-launch-t"><b>Ask Samriddhi</b><small>AI trade assistant</small></span></button>' +
    '<section class="sc-panel" role="dialog" aria-modal="false" aria-label="Samriddhi Assistant" hidden>' +
      '<header class="sc-head"><span class="sc-orb sm" aria-hidden="true"><i></i></span>' +
        '<div class="sc-who"><b>Samriddhi Assistant</b><small><i class="sc-dot"></i>Online · replies instantly</small></div>' +
        '<button class="sc-ic sc-new" type="button" title="New chat" aria-label="Start a new chat"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg></button>' +
        '<button class="sc-ic sc-x" type="button" title="Close" aria-label="Close chat"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>' +
      '<div class="sc-body" aria-live="polite"></div>' +
      '<div class="sc-chips"></div>' +
      '<form class="sc-form"><textarea rows="1" placeholder="Ask about products, grades, delivery…" aria-label="Your message" maxlength="1500"></textarea>' +
        '<button class="sc-ic sc-mic" type="button" title="Speak" aria-label="Speak your question" hidden><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>' +
        '<button class="sc-send" type="submit" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button></form>' +
      '<p class="sc-note">AI answers can make mistakes · prices &amp; availability are confirmed by our team</p>' +
    '</section>';
  document.body.appendChild(root);
  var $ = function (s) { return root.querySelector(s); };
  var launch = $(".sc-launch"), panel = $(".sc-panel"), body = $(".sc-body"), chipBox = $(".sc-chips"), form = $(".sc-form"), ta = $("textarea"), sendBtn = $(".sc-send"), mic = $(".sc-mic");

  /* ---------- tiny, safe markdown: **bold**, - bullets, links to site pages ---------- */
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function md(s) {
    var lines = esc(s).split("\n"), out = "", list = false;
    lines.forEach(function (l) {
      var b = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
      if (b) { if (!list) { out += "<ul>"; list = true; } out += "<li>" + b[1] + "</li>"; return; }
      if (list) { out += "</ul>"; list = false; }
      out += l.trim() ? "<p>" + l + "</p>" : "";
    });
    if (list) out += "</ul>";
    return out.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
              .replace(/(^|[\s(])(\/[a-z-]+\.html(?:#[a-z-]+)?)/g, '$1<a href="$2">$2</a>')
              .replace(/(\+91[\s\d]{10,14})/g, '<a href="tel:$1">$1</a>');
  }

  function bubble(role, html, cls) {
    var d = document.createElement("div"); d.className = "sc-msg " + role + (cls ? " " + cls : "");
    d.innerHTML = html; body.appendChild(d); scroll(); return d;
  }
  function scroll() { body.scrollTop = body.scrollHeight; }

  function enquiryCard(e) {
    var rows = [["Commodity", e.commodity], ["Grade / spec", e.grade], ["Quantity", e.quantity], ["Location", e.location],
                ["Timeline", e.timeline], ["Packing", e.packing], ["Name", e.name], ["Company", e.company], ["Phone", e.phone], ["Notes", e.notes]]
      .filter(function (r) { return r[1]; });
    var who = e.role === "supplier" ? "I would like to supply" : "I would like a quote for";
    var text = "Hello Samriddhi, " + who + ":\n" + rows.map(function (r) { return "• " + r[0] + ": " + r[1]; }).join("\n") + "\n\n(Prepared with the website assistant)";
    var c = document.createElement("div"); c.className = "sc-card";
    c.innerHTML = '<div class="sc-card-h"><span>✦</span><b>' + (e.role === "supplier" ? "Supply offer ready" : "Enquiry ready") + '</b></div>' +
      '<dl>' + rows.map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(String(r[1])) + "</dd></div>"; }).join("") + "</dl>" +
      '<div class="sc-card-b"><a class="sc-wa" target="_blank" rel="noopener" href="https://wa.me/' + WA + "?text=" + encodeURIComponent(text) + '">Send on WhatsApp</a>' +
      '<a class="sc-mail" href="mailto:' + MAIL + "?subject=" + encodeURIComponent((e.role === "supplier" ? "Supply offer: " : "Quote enquiry: ") + e.commodity) + "&body=" + encodeURIComponent(text) + '">Email</a></div>';
    body.appendChild(c); scroll();
  }

  function welcome() {
    body.innerHTML = "";
    var w = document.createElement("div"); w.className = "sc-hello";
    w.innerHTML = '<span class="sc-orb lg" aria-hidden="true"><i></i></span><h3>Namaste! How can I help?</h3>' +
      "<p>Ask about our commodities, grades, packing, delivery or documents — or tell me what you need and I'll prepare a quote enquiry for you.</p>";
    body.appendChild(w);
  }
  function render() {
    if (!hist.length) welcome(); else { body.innerHTML = ""; hist.forEach(function (m) { bubble(m.role, m.role === "user" ? "<p>" + esc(m.content) + "</p>" : md(m.content)); if (m.enquiry) enquiryCard(m.enquiry); }); }
    chipBox.innerHTML = ""; chipBox.hidden = hist.length > 0;
    chips.forEach(function (t) { var b = document.createElement("button"); b.type = "button"; b.textContent = t; b.onclick = function () { ask(t); }; chipBox.appendChild(b); });
  }

  /* ---------- talk to the assistant (streamed) ---------- */
  function ask(text) {
    text = (text || "").trim(); if (!text || busy) return;
    busy = true; root.classList.add("busy"); chipBox.hidden = true;
    if (!hist.length) body.innerHTML = "";
    hist.push({ role: "user", content: text }); store.set(hist);
    bubble("user", "<p>" + esc(text) + "</p>");
    ta.value = ""; fit();
    var msg = bubble("assistant", '<span class="sc-typing"><i></i><i></i><i></i></span>', "streaming"), acc = "", enq = null, raf = 0;
    function paint() { raf = 0; msg.innerHTML = md(acc) + '<span class="sc-caret"></span>'; scroll(); }
    ctrl = window.AbortController ? new AbortController() : null;
    fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl && ctrl.signal,
      body: JSON.stringify({ messages: hist.map(function (m) { return { role: m.role, content: m.content }; }), page: { path: location.pathname + location.hash, title: document.title } }) })
      .then(function (r) {
        if (!r.ok || !r.body) throw new Error("http " + r.status);
        var rd = r.body.getReader(), dec = new TextDecoder(), buf = "";
        return (function pump() {
          return rd.read().then(function (x) {
            if (x.done) return;
            buf += dec.decode(x.value, { stream: true });
            var parts = buf.split("\n\n"); buf = parts.pop();
            parts.forEach(function (p) {
              if (p.indexOf("data:") !== 0) return; var ev; try { ev = JSON.parse(p.slice(5)); } catch (e) { return; }
              if (ev.type === "text") { acc += ev.t; if (!raf) raf = requestAnimationFrame(paint); }
              else if (ev.type === "enquiry") enq = ev.data;
              else if (ev.type === "error") acc += (acc ? "\n\n" : "") + ev.message;
            });
            return pump();
          });
        })();
      })
      .catch(function (e) { if (!(e && e.name === "AbortError")) acc += (acc ? "\n\n" : "") + "Sorry — I couldn't reach the assistant just now. You can message us on WhatsApp at +91 78753 71535."; })
      .then(function () {
        if (raf) cancelAnimationFrame(raf);
        if (!acc && enq) acc = "Here is your enquiry — send it in one tap:";
        msg.classList.remove("streaming"); msg.innerHTML = md(acc || "…");
        var rec = { role: "assistant", content: acc || "…" };
        if (enq && enq.commodity) { rec.enquiry = enq; enquiryCard(enq); }
        hist.push(rec); store.set(hist);
        busy = false; root.classList.remove("busy"); ctrl = null; scroll();
        if (matchMedia("(pointer:fine)").matches) ta.focus();
      });
  }

  /* ---------- open / close ---------- */
  function open(v) {
    panel.hidden = !v; root.classList.toggle("open", v); launch.setAttribute("aria-expanded", v);
    if (v) { render(); setTimeout(function () { scroll(); if (matchMedia("(pointer:fine)").matches) ta.focus(); }, 60); }
  }
  launch.onclick = function () { open(panel.hidden); };
  $(".sc-x").onclick = function () { open(false); launch.focus(); };
  $(".sc-new").onclick = function () { if (ctrl) ctrl.abort(); hist = []; store.set(hist); render(); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { open(false); launch.focus(); } });
  form.onsubmit = function (e) { e.preventDefault(); ask(ta.value); };
  function fit() { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; sendBtn.disabled = !ta.value.trim(); }
  ta.addEventListener("input", fit);
  ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(ta.value); } });
  fit();

  /* ---------- voice input (Chrome / Edge / Safari) ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    mic.hidden = false; var rec = null;
    mic.onclick = function () {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = document.documentElement.lang === "hi" ? "hi-IN" : "en-IN"; rec.interimResults = true;
      root.classList.add("listening");
      rec.onresult = function (e) { ta.value = [].map.call(e.results, function (r) { return r[0].transcript; }).join(""); fit(); };
      rec.onend = function () { root.classList.remove("listening"); rec = null; if (ta.value.trim()) ask(ta.value); };
      rec.onerror = function () { root.classList.remove("listening"); rec = null; };
      rec.start();
    };
  }

  /* a gentle hello bubble once per visit, after a few seconds */
  try {
    if (!sessionStorage.getItem("samChat.hi")) setTimeout(function () {
      if (!panel.hidden) return; sessionStorage.setItem("samChat.hi", "1");
      var h = document.createElement("button"); h.type = "button"; h.className = "sc-hint"; h.textContent = "Need a grade, quantity or quote? Ask me →";
      h.onclick = function () { h.remove(); open(true); }; root.appendChild(h);
      setTimeout(function () { h.classList.add("gone"); setTimeout(function () { h.remove(); }, 600); }, 7000);
    }, 6000);
  } catch (e) {}

  /* any link/button with data-ask="question" opens the assistant with that question */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-ask]"); if (!a) return;
    e.preventDefault(); open(true); ask(a.getAttribute("data-ask"));
  });
})();
