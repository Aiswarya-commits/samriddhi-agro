/* ==========================================================================
   /api/chat — the "Ask Samriddhi" AI assistant (runs on Vercel's servers).
   Needs ONE of these environment variables (on Vercel, and in .env on your computer):
     GEMINI_API_KEY     — FREE: Google AI Studio key (aistudio.google.com/apikey), no card needed
     ANTHROPIC_API_KEY  — paid: Claude (console.anthropic.com)
   Optional: GEMINI_MODEL (default gemini-2.5-flash) · ANTHROPIC_MODEL (default claude-haiku-5-5)
   The key never reaches the browser. Replies stream back as server-sent events:
     {type:"text", t:"..."}   {type:"enquiry", data:{...}}   {type:"done"}   {type:"error", message:"..."}
   ========================================================================== */
const KB = require("./_kb.js");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_TURNS = 16, MAX_CHARS = 1500;
const hits = new Map();                         // simple per-visitor limit (resets every 10 minutes)
function limited(ip) {
  const now = Date.now(), h = hits.get(ip) || { n: 0, t: now };
  if (now - h.t > 10 * 60 * 1000) { h.n = 0; h.t = now; }
  h.n++; hits.set(ip, h);
  return h.n > 40;
}

const SYSTEM = (page) => `You are "Samriddhi Assistant", the website assistant of ${KB.site.company}, an Indian B2B agri-commodity trading and export company.

Answer ONLY from the company knowledge below and general, well-established agricultural knowledge (e.g. what a grade or a railway rake is).
Style: warm, professional, confident and brief — usually 2–5 short sentences or a short bullet list (use "- " bullets and **bold** sparingly). No headings.
Reply in the same language the visitor writes in (English, Hindi, Marathi, etc.).

Rules:
- Never quote or invent prices, stock levels, delivery dates, certificates or MOQ. Say these are confirmed per enquiry and offer to prepare one.
- If something is not in the knowledge, say you will connect them with the team rather than guessing.
- Stay on Samriddhi and agri-trade topics; politely steer anything else back.
- When a visitor wants a quote, to buy, or to supply: gather what is missing, ONE short question at a time
  (commodity and grade/specification, quantity, delivery location/port, timeline; then their name, company and phone if offered).
  As soon as you have at least the commodity, quantity and delivery location, call the prepare_enquiry tool, then add one short line saying it is ready to send.
- Point to useful pages with their path (for example /products.html#pf-cotton or /quote.html).
- Visitor is currently on: ${page}.

COMPANY KNOWLEDGE
${KB.text}`;

const TOOLS = [{
  name: "prepare_enquiry",
  description: "Prepare a quote enquiry card the visitor can send to Samriddhi on WhatsApp or by email. Call it once the commodity, quantity and delivery location are known.",
  input_schema: {
    type: "object",
    properties: {
      role: { type: "string", enum: ["buyer", "supplier"], description: "buyer wants to purchase; supplier wants to sell to Samriddhi" },
      commodity: { type: "string" }, grade: { type: "string", description: "grade or specification" },
      quantity: { type: "string" }, location: { type: "string", description: "delivery or pickup location / port" },
      timeline: { type: "string" }, packing: { type: "string" },
      name: { type: "string" }, company: { type: "string" }, phone: { type: "string" }, notes: { type: "string" }
    },
    required: ["commodity", "quantity", "location"]
  }
}];

function clean(messages) {
  if (!Array.isArray(messages)) return [];
  const out = messages.slice(-MAX_TURNS)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (out.length && out[0].role !== "user") out.shift();          // must start with the visitor
  const merged = [];                                                 // roles must alternate
  for (const m of out) { const last = merged[merged.length - 1]; if (last && last.role === m.role) last.content += "\n" + m.content; else merged.push(m); }
  return merged;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.statusCode = 405; return res.end(); }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const messages = clean(body.messages);
  const page = String((body.page && (body.page.title + " (" + body.page.path + ")")) || "the website").slice(0, 200);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  const send = (o) => res.write("data: " + JSON.stringify(o) + "\n\n");

  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "x").split(",")[0].trim();
  if (!messages.length) { send({ type: "error", message: "Please type a message." }); return res.end(); }
  if (limited(ip)) { send({ type: "error", message: "You've sent a lot of messages — please reach us on WhatsApp for anything more." }); return res.end(); }

  /* demo mode (no key needed) — for trying the design locally: set CHAT_DEMO=1 */
  const GEMINI = process.env.GEMINI_API_KEY, CLAUDE = process.env.ANTHROPIC_API_KEY;
  if (process.env.CHAT_DEMO === "1" || (!GEMINI && !CLAUDE)) {
    const demo = (GEMINI || CLAUDE) ? "" : "(Demo mode — add GEMINI_API_KEY to switch on the real AI.) ";
    const reply = demo + "We supply **milling-grade wheat** for flour mills, cleaned and graded to your specification.\n- Packing: loose (bulk / rake) or 50 kg PP / jute bags\n- Delivery: truck, railway rake or container\n- Documents: GST invoice, e-way bill and quality report\n\nPrice and availability are confirmed per enquiry — I've prepared one you can send now.";
    for (const w of reply.split(/(\s+)/)) { send({ type: "text", t: w }); await new Promise((r) => setTimeout(r, 18)); }
    send({ type: "enquiry", data: { role: "buyer", commodity: "Wheat", grade: "Milling grade", quantity: "1 rake", location: "Indore", timeline: "Next month" } });
    send({ type: "done" }); return res.end();
  }

  /* ---------- FREE: Google Gemini ---------- */
  if (GEMINI) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const S = (o) => JSON.parse(JSON.stringify(o).replace(/"type":"(object|string)"/g, (m, x) => '"type":"' + x.toUpperCase() + '"'));
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":streamGenerateContent?alt=sse", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": GEMINI },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM(page) }] },
          contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          tools: [{ functionDeclarations: TOOLS.map((x) => ({ name: x.name, description: x.description, parameters: S(x.input_schema) })) }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 }
        })
      });
      if (!r.ok || !r.body) {
        const detail = await r.text().catch(() => "");
        console.error("Gemini error", r.status, detail.slice(0, 300));
        send({ type: "error", message: r.status === 429 ? "The assistant is very busy right now — please try again in a minute, or reach us on WhatsApp." : "The assistant is unavailable right now. Please reach us on WhatsApp." });
        return res.end();
      }
      const reader = r.body.getReader(), dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          let ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { continue; }
          const parts = (ev.candidates && ev.candidates[0] && ev.candidates[0].content && ev.candidates[0].content.parts) || [];
          for (const pt of parts) {
            if (pt.text && !pt.thought) send({ type: "text", t: pt.text });
            if (pt.functionCall && pt.functionCall.name === "prepare_enquiry") send({ type: "enquiry", data: pt.functionCall.args || {} });
          }
        }
      }
      send({ type: "done" });
    } catch (e) {
      console.error(e);
      send({ type: "error", message: "Connection problem — please try again, or reach us on WhatsApp." });
    }
    return res.end();
  }

  /* ---------- paid: Anthropic Claude ---------- */
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": CLAUDE, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, temperature: 0.4, system: SYSTEM(page), tools: TOOLS, messages, stream: true })
    });
    if (!r.ok || !r.body) {
      const detail = await r.text().catch(() => "");
      console.error("Anthropic error", r.status, detail.slice(0, 300));
      send({ type: "error", message: "The assistant is busy right now. Please try again, or reach us on WhatsApp." });
      return res.end();
    }
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = "", tool = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        let ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { continue; }
        if (ev.type === "content_block_start" && ev.content_block && ev.content_block.type === "tool_use") tool = { name: ev.content_block.name, json: "" };
        else if (ev.type === "content_block_delta" && ev.delta) {
          if (ev.delta.type === "text_delta") send({ type: "text", t: ev.delta.text });
          else if (ev.delta.type === "input_json_delta" && tool) tool.json += ev.delta.partial_json;
        } else if (ev.type === "content_block_stop" && tool) {
          try { if (tool.name === "prepare_enquiry") send({ type: "enquiry", data: JSON.parse(tool.json || "{}") }); } catch (e) {}
          tool = null;
        }
      }
    }
    send({ type: "done" });
  } catch (e) {
    console.error(e);
    send({ type: "error", message: "Connection problem — please try again, or reach us on WhatsApp." });
  }
  res.end();
};