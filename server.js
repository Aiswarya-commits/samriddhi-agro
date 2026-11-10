// Tiny local preview server — no packages needed. Run: npm start  (or: node server.js)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = __dirname;
let PORT = +(process.env.PORT || 3000);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found: " + p); }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;
    if (range && type.startsWith("video/")) {           // lets videos seek and loop properly
      const [s, e] = range.replace("bytes=", "").split("-"), start = +s, end = e ? +e : st.size - 1;
      res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
});
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && PORT < 3020) { console.log(`  Port ${PORT} is busy, trying ${PORT + 1}...`); server.listen(++PORT); }
  else { console.error(e.message); process.exit(1); }
});
server.on("listening", () => console.log(`\n  Samriddhi site running →  http://localhost:${PORT}\n  (press Ctrl+C to stop)\n`));
server.listen(PORT);
