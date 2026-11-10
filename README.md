# Samriddhi Agro — 3D website

A fast, hand-built 3D website for Samriddhi Agro Trading and Exim LLP.
Plain HTML, CSS and JavaScript — no Framer, no React build, no iframes.
Hosts on Vercel, Netlify, cPanel or any web server as-is.

## What's inside

| Path | What it is |
|---|---|
| `index.html` | Home page (generated — see "Editing") |
| `products/*.html` | 6 commodity pages (generated) |
| `assets/css/style.css` | All styling. Colours and fonts are at the top in `:root` |
| `assets/js/main.js` | Smooth scrolling, reveals, menu, cursor, 3D tilt, page transitions, videos, inquiry form |
| `assets/js/home.js` | Home 3D: live wheat field (hero), trade-route globe (markets), commodity filmstrip |
| `assets/js/product.js` | Product page 3D: floating grains / pulses / cotton / spice particles in each product's colours |
| `assets/js/land.js` | Dot map of the world for the globe |
| `assets/js/vendor/` | Three.js 0.169, GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13 — all stored locally, no CDN |
| `content/site.json` | Phone, WhatsApp, email, address, LLPIN / GSTIN / FSSAI |
| `content/commodities.json` | The 6 commodity groups: names, text, colours, varieties |
| `src/` | Page templates. `partials/` holds the shared header and footer |
| `images/`, `products/img/`, `videos/` | Your media. Read the `.txt` notes in each folder for the file names |

## 1. Add your photos and videos

Copy them from your current project (same names):

- `products/img/` → `cereals.jpg oilseeds.jpg pulses.jpg cotton.jpg spices.jpg flour.jpg`
- `videos/` → `hero-video.mp4 video-field.mp4 hero-wheat.mp4`

To make them sharper and lighter at the same time, run the following (needs ffmpeg):

```
bash tools/optimize-media.sh my-original.mp4 videos/hero-video.mp4
bash tools/optimize-media.sh my-photo.jpg     products/img/cereals.jpg
```

No CSS filters, blur or sepia are applied to your media, so it shows at full clarity.
Videos only load when they scroll into view and pause when they leave, which keeps the page fast.

## 2. Preview on your computer

Pages use root paths like `/assets/...`, so open the site through a small server instead of double-clicking the HTML file:

- `npm start` (no `npm install` needed), then open http://localhost:3000
- Windows: or double-click `start.bat`
- Any OS: `python -m http.server 3000`, then open http://localhost:3000

## 3. Editing content

- Phone, email, address, IDs → `content/site.json`
- Product text and varieties → `content/commodities.json`
- Home page sections → `src/index.html`
- Header menu / footer → `partials/nav.html`, `partials/footer.html`

Then run:

```
python tools/build.py
```

This rebuilds `index.html` and every product page. It also stamps CSS/JS links with a version (`?v=…`) so visitors always get the newest files — no more "I changed it but the live site didn't update".

## 4. Deploy to Vercel

1. Put this folder in your GitHub repo, replacing the old Framer export.
2. In Vercel: Framework preset **Other**, Build command **empty**, Output directory **`.`**
3. Push. `vercel.json` already sets caching: pages always revalidate; versioned CSS/JS are cached long-term.

## Performance notes

- The wheat field is one instanced mesh (9,000 stalks on desktop, 3,200 on phones) animated by the GPU. It checks the frame rate after about 2 seconds and lowers quality automatically on slow devices.
- Every 3D scene pauses when it's off-screen or the tab is hidden.
- If WebGL is unavailable, the page shows a warm gradient and all content still works.
- Respects "reduce motion" accessibility settings.

## Notes

- The inquiry form needs no server. It opens WhatsApp (or the visitor's email app) with all fields filled in.
- Globe routes are illustrative. Edit the `routes` list in `assets/js/home.js` to show your real destinations.
- The old site's footer linked to Privacy Policy, Terms, Disclaimer and Cookie Policy pages. Add those pages when you have the text and link them in `partials/footer.html`.
