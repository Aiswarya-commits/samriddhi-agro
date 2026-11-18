/* Knowledge for the "Ask Samriddhi" assistant.
   Products come straight from content/commodities.json and contact details from content/site.json,
   so the assistant always matches the website. Edit FACTS below to teach it anything else. */
const site = require("../content/site.json");
const items = require("../content/commodities.json");

const FACTS = `
COMPANY
- ${site.company} — B2B agri-commodity trading, sourcing, domestic supply and import/export (exim).
- We procure from farmers, FPOs, mandis, traders and processors, check quality against the buyer's specification,
  and deliver by truck, railway rake or container — as a trader taking responsibility for sourcing, quality, logistics and documentation.
- Mission: build an efficient link between agricultural producers and markets through dependable sourcing, quality-focused
  trade execution, efficient logistics and responsive solutions for buyers and suppliers.
- Vision: become a trusted agricultural trading partner connecting Indian commodities with domestic and global markets.
- Core values: Integrity & Transparency, Quality First, Reliability, Customer Focus, Responsible Sourcing, Long-Term Partnerships.

SERVICES
1 Sourcing & procurement (farmers, FPOs, mandis, traders, processors) · 2 Domestic commodity trading at market-linked prices ·
3 Bulk supply (full truckloads and full railway rakes) · 4 Import & export (specification, quotation, documentation, customs, shipping) ·
5 Quality coordination (checked against buyer parameters before dispatch, lab testing where required) ·
6 Logistics & supply chain (truck, rake or container).

PACKING, DELIVERY, DOCUMENTS
- Packing: loose (bulk / rake) or 50 kg PP / jute bags, as agreed with the buyer.
- Delivery: truck, railway rake or container. Railway-rake capability for large-volume grain buyers.
- With every delivery: GST invoice, e-way bill and quality report. Export documentation handled for overseas orders.
- Minimum order quantity, specifications, prices, availability and terms are confirmed per enquiry.

HOW WE TRADE (4 steps): share requirement (commodity, grade, quantity, location, date) → receive specification & quote →
sourcing & quality checks → dispatch with documents.
EXPORT PROCESS: buyer enquiry → specification confirmation → quotation → order confirmation → quality & documentation →
packaging & dispatch → customs & shipping → delivery.

QUALITY & COMPLIANCE: quality control process, specifications & grading, lab testing where required, pre-dispatch inspection,
traceability where available, regulatory compliance, export documentation, certifications & registrations.

WHO WE SERVE: flour & roller mills, feed manufacturers, edible-oil refiners, food & FMCG companies, textile mills,
government buyers, wholesalers, exporters.
FOR SUPPLIERS / FPOs / FARMERS: market-linked prices, access to large corporate buyers, clear quality parameters,
timely agreed payment, long-term repeat procurement. They can start by messaging on WhatsApp.
MARKET INTELLIGENCE: weekly tracking of mandi prices, arrivals & supply, crop sowing & yield outlook, weather & monsoon impact,
government policy (MSP, duties, stock limits), outlook for coming weeks.

OFFICES
- Registered: Flat No. 301, Plot No. 10 / 310, Galaxy Carina, Sector-15, Kharghar, Panvel, Raigad, Maharashtra 410210.
- Corporate: ${site.address}.
- Branch: 98, LIG-1, Atirikt Vishv Bank Colony, Housing Board, Agar Road, Ujjain, Madhya Pradesh 456001.
REGISTRATIONS: LLPIN ${site.llpin} · GSTIN ${site.gstin} · IEC AFXFS6580B · FSSAI ${site.fssai}.
CONTACT: phone / WhatsApp ${site.phone_display} · email ${site.email}.
WEBSITE PAGES: /products.html (all products), /quote.html (request a quote form), /about.html, /quality.html,
/sustainability.html, /what-we-do.html, /supply-chain.html, /markets.html, /for-buyers.html, /for-suppliers.html.
`;

const PRODUCTS = items.map((c) =>
  `- ${c.name} (${c.short}): ${c.lead} Varieties: ` +
  c.varieties.map((v) => `${v[0]} (${v[1]}) — ${v[2]}`).join("; ") +
  `. Typical buyers: ${c.story.buyers.join(", ")}. Page: /products.html#pf-${c.slug}`
).join("\n");

module.exports = { site, text: FACTS + "\nPRODUCTS\n" + PRODUCTS };
