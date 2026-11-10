#!/usr/bin/env python3
"""
Samriddhi site builder — plain Python 3, no installs needed.

  python tools/build.py

Reads:   content/site.json         (phone, email, address, IDs)
         content/commodities.json  (the six product groups and their varieties)
         partials/nav.html, partials/footer.html
         src/index.html, src/product.html
Writes:  index.html and products/<slug>.html

Change text in content/ or src/, run this once, then deploy.
"""
import json, html, pathlib, re, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
site = json.loads((ROOT / "content/site.json").read_text(encoding="utf-8"))
items = json.loads((ROOT / "content/commodities.json").read_text(encoding="utf-8"))
nav = (ROOT / "partials/nav.html").read_text(encoding="utf-8")
foot = (ROOT / "partials/footer.html").read_text(encoding="utf-8")
e = lambda s: html.escape(s, quote=True)


def wa(text):
    return f"https://wa.me/{site['whatsapp']}?text=" + urllib.parse.quote(text)


def media(slug, name, eager=False):
    lazy = "" if eager else ' loading="lazy"'
    return (f'<div class="media"><img src="/products/img/{slug}.jpg" alt="{e(name)}"{lazy} '
            f'onerror="this.parentNode.classList.add(\'missing\')"><span class="fb">{e(name)}</span></div>')


product_links = "".join(f'<a href="/products/{c["slug"]}.html">{e(c["name"])}<small>{c["no"]}</small></a>' for c in items)
product_links_plain = "".join(f'<a href="/products/{c["slug"]}.html">{e(c["name"])}</a>' for c in items)
site_js = f'<script>window.SAMRIDDHI={json.dumps({"whatsapp": site["whatsapp"], "email": site["email"]})};</script>'


def fill(text):
    text = text.replace("{{PRODUCT_LINKS}}", product_links).replace("{{PRODUCT_LINKS_PLAIN}}", product_links_plain)
    for k, v in site.items():
        text = text.replace("{{" + k + "}}", e(str(v)))
    return text


def put(text, marker, content):
    pat = re.compile(rf"<!--{marker}-->.*?<!--/{marker}-->", re.S)
    return pat.sub(lambda m: f"<!--{marker}-->\n{content}\n<!--/{marker}-->", text)


import hashlib
VERSIONED = ["/assets/css/style.css", "/assets/js/main.js", "/assets/js/home.js", "/assets/js/product.js", "/assets/js/hero-film.js", "/assets/js/product-story.js", "/assets/css/about.css", "/assets/css/theme-green.css", "/assets/css/quality.css", "/assets/css/sustainability.css", "/assets/js/quality3d.js", "/assets/js/sustain3d.js",   "/assets/js/about3d.js", "/assets/css/pages.css", "/assets/js/pages3d.js"]
versions = {f: hashlib.md5((ROOT / f.lstrip("/")).read_bytes()).hexdigest()[:8] for f in VERSIONED}


def shell(text):
    text = put(text, "NAV", nav)
    text = put(text, "FOOT", foot + "\n" + site_js)
    # cache-busting: every change to CSS/JS gets a new URL, so visitors always see the latest version
    for f, v in versions.items():
        text = text.replace(f'"{f}"', f'"{f}?v={v}"')
    return fill(text)


# ---------- home ----------
home = (ROOT / "src/index.html").read_text(encoding="utf-8")
cards = "\n".join(
    f'      <a class="card" href="/products/{c["slug"]}.html" data-name="{e(c["name"])}" data-no="{c["no"]}" aria-label="{e(c["name"])}: {e(c["short"])}">'
    f'{media(c["slug"], c["no"])}<span class="open">Open ↗</span>'
    f'<span class="foot"><span class="idx">{c["no"]}</span><span><span class="nm">{e(c["name"])}</span><span class="rl">{e(c["short"])}</span></span></span></a>'
    for c in items)
home = put(home, "STRIP", cards)
home = put(home, "RANGE", "\n".join(
    f'        <li><a href="/products/{c["slug"]}.html" data-slug="{c["slug"]}" data-name="{e(c["name"])}"><span class="mono">{c["no"]}</span>{e(c["name"])}</a></li>' for c in items))
home = put(home, "OPTIONS", "".join(f"<option>{e(c['name'])}</option>" for c in items))
(ROOT / "index.html").write_text(shell(home), encoding="utf-8")

# ---------- about + other pages ----------
for page in ["about", "quality", "sustainability", "what-we-do", "supply-chain", "markets", "market-intelligence", "for-buyers", "for-suppliers", "insights", "trade-stories", "quote"]:   # src/<name>.html → <name>.html
    if (ROOT / f"src/{page}.html").exists():
        (ROOT / f"{page}.html").write_text(shell((ROOT / f"src/{page}.html").read_text(encoding="utf-8")), encoding="utf-8")
        # ---------- products ----------
tpl = (ROOT / "src/product.html").read_text(encoding="utf-8")
(ROOT / "products").mkdir(exist_ok=True)
for i, c in enumerate(items):
    title = "".join(f"<span style=\"display:block\">{e(l)}</span>" for l in c["title_lines"])
    chips = "".join(f'<span class="chip c{j+1}"><i></i>{e(t)}</span>' for j, t in enumerate(c["chips"][:4]))
    rows = []
    for k, v in enumerate(c["varieties"]):
        link = e(wa("Hello Samriddhi, I would like a quote for " + c["name"] + " - " + v[0] + "."))
        rows.append(
            f'      <div class="flip" tabindex="0" data-reveal style="--d:{k*0.07:.2f}s"><div class="in3d">'
            f'<div class="side front"><span class="idx">{k+1:02d}</span><div><h3>{e(v[0])}</h3><p class="sub mono">{e(v[1])}</p></div><span class="hint mono">Hover or tap for details ↻</span></div>'
            f'<div class="side back"><div><h4>{e(v[0])}</h4><p>{e(v[2])}</p></div><a href="{link}" target="_blank" rel="noopener">Ask for specification ↗</a></div>'
            f'</div></div>')
    varieties = "\n".join(rows)
    others = items[i + 1:] + items[:i]
    more = "\n".join(
        f'      <a href="/products/{o["slug"]}.html" data-reveal style="--d:{k*0.06:.2f}s">{media(o["slug"], o["no"])}'
        f'<span class="lbl"><small class="mono">{o["no"]}</small><b>{e(o["name"])}</b></span></a>' for k, o in enumerate(others))
    stry = c["story"]
    cut = (f'<img src="/products/img/{stry["cutout"]}" alt="{e(c["name"])}" onerror="this.onerror=null;this.src=\'/products/img/{c["slug"]}.jpg\';this.parentNode.classList.add(\'photo\')">'
           if stry.get("cutout") else f'<img src="/products/img/{c["slug"]}.jpg" alt="{e(c["name"])}" onerror="this.style.visibility=\'hidden\'">')
    cut_cls = "" if stry.get("cutout") else " photo"
    buyers_html = "\n".join(f'      <div class="buyer" data-reveal style="--d:{k*0.06:.2f}s"><span class="mono">{k+1:02d}</span><b>{e(x)}</b></div>' for k, x in enumerate(stry["buyers"]))
    tpl_c = tpl.replace('<div class="ps-cut" id="psCut">', f'<div class="ps-cut{cut_cls}" id="psCut">')
    out = (tpl_c.replace("{{CUTOUT}}", cut).replace("{{BUYERS}}", buyers_html)
.replace("{{PLANT}}", stry["plant"]).replace("{{PHOTO}}", stry.get("photo", ""))              .replace("{{L1}}", e(stry["l1"])).replace("{{L2}}", e(stry["l2"])).replace("{{READY}}", e(stry["ready"]))
              .replace("{{COUNT}}", e(stry["count"])).replace("{{NOUN}}", e(stry["noun"]))
              .replace("{{PLUSLIST}}", " + ".join(e(v[0]) for v in c["varieties"]))
              .replace("{{TITLE}}", title).replace("{{CHIPS}}", chips).replace("{{VARIETIES}}", varieties).replace("{{MORE}}", more)
              .replace("{{WA_MAIN}}", e(wa(f"Hello Samriddhi, I would like a quote for {c['name']}.")))
              .replace("{{NAME}}", e(c["name"])).replace("{{LEAD}}", e(c["lead"])).replace("{{CTA}}", e(c["cta"]))
              .replace("{{SLUG}}", c["slug"]).replace("{{NO}}", c["no"]).replace("{{ACCENT}}", c["accent"])
              .replace("{{PARTICLES}}", c["particles"]).replace("{{PALETTE}}", ",".join(c["palette"])))
    (ROOT / "products" / f"{c['slug']}.html").write_text(shell(out), encoding="utf-8")

print("Built index.html and", len(items), "product pages.")
