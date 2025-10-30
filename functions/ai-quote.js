// functions/ai-quote.js
// 带回退：OpenAI 不可用时，生成本地模板版黑金报价单

function fallbackHTML(input) {
  const {
    seller = "FreelanceKit Studio",
    client = "Client Company",
    lang = "en",
    currency = "USD",
    scope = "",
    deliverables = "",
    notes = "",
    pricingModel = "fixed",
    tone = "professional"
  } = input || {};

  const nl = (t) => (t || "").split(/\r?\n/).filter(Boolean).map(s=>s.replace(/^\s*[-•]\s*/,'')).slice(0,12);

  const scopeLis = nl(scope).map(s=>`<li>${s}</li>`).join("") || "<li>Project discovery & planning</li>";
  const deliLis  = nl(deliverables).map(s=>`<li>${s}</li>`).join("") || "<li>Responsive website</li>";
  const noteLis  = nl(notes).map(s=>`<li>${s}</li>`).join("");

  const priceBlock = (() => {
    if (pricingModel === "hourly") {
      return `<tr><td>Hourly rate</td><td style="text-align:right"> ${currency} 80 / hr</td></tr>
              <tr><td>Estimated hours</td><td style="text-align:right"> 40–60 hrs</td></tr>`;
    }
    if (pricingModel === "milestones") {
      return `<tr><td>Phase 1 — Design</td><td style="text-align:right">${currency} 1,200</td></tr>
              <tr><td>Phase 2 — Build</td><td style="text-align:right">${currency} 2,000</td></tr>
              <tr><td>Phase 3 — Launch</td><td style="text-align:right">${currency} 800</td></tr>`;
    }
    // fixed
    return `<tr><td>Project fixed price</td><td style="text-align:right">${currency} 2,800</td></tr>`;
  })();

  const now = new Date();
  const qn  = `Q${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${now.getHours()}${now.getMinutes()}`;

  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quote • ${seller}</title>
<style>
  :root{--gold:#facc15;--bg:#0a0a0a;--panel:#111;--text:#f8fafc;--muted:#a1a1aa}
  body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;padding:28px}
  .cover{text-align:center;margin-bottom:16px}
  .logo{width:80px;height:80px;object-fit:contain;margin-bottom:6px}
  h1,h2{margin:0;color:var(--gold)}
  .meta{color:#eab308;opacity:.95;margin-top:4px}
  .box{background:var(--panel);border:1px solid rgba(250,204,21,.25);border-radius:14px;padding:16px;margin-top:14px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{border:1px solid rgba(250,204,21,.35);padding:8px}
  th{background:#0d0d0d;color:var(--gold);text-align:left}
  .r{text-align:right}
  footer{margin-top:24px;text-align:center;color:var(--muted);font-size:.9rem}
  .divider{height:2px;background:linear-gradient(90deg,#facc15,#fde047);margin:12px 0 16px}
</style>
</head><body>

<div class="cover">
  <img src="/assets/logo.svg" class="logo" alt="Logo" onerror="this.style.display='none'">
  <h1>${seller}</h1>
  <div class="meta">QUOTE · ${qn} — For ${client}</div>
</div>
<div class="divider"></div>

<div class="box">
  <h2>Project Overview</h2>
  <p>This document outlines the proposed scope, deliverables, timeline, and pricing for the project between <b>${seller}</b> and <b>${client}</b>.</p>
</div>

<div class="box">
  <h3 style="color:var(--gold);margin:0 0 6px">Scope of Work</h3>
  <ul style="margin:0 0 6px 18px">${scopeLis}</ul>
</div>

<div class="box">
  <h3 style="color:var(--gold);margin:0 0 6px">Deliverables</h3>
  <ul style="margin:0 0 6px 18px">${deliLis}</ul>
</div>

<div class="box">
  <h3 style="color:var(--gold);margin:0 0 6px">Pricing (${pricingModel})</h3>
  <table><tbody>
    ${priceBlock}
    <tr><td>Tax (estimate)</td><td class="r">${currency} 0.00</td></tr>
    <tr><th>Total (estimate)</th><th class="r">${currency} —</th></tr>
  </tbody></table>
  <p style="color:var(--muted);margin:8px 0 0">* Final total depends on approved scope and change requests.</p>
</div>

<div class="box">
  <h3 style="color:var(--gold);margin:0 0 6px">Timeline</h3>
  <ul style="margin:0 0 6px 18px">
    <li>Kickoff & discovery — Week 1</li>
    <li>Design & approval — Weeks 2–3</li>
    <li>Build & content — Weeks 3–5</li>
    <li>Testing & launch — Week 6</li>
  </ul>
</div>

<div class="box">
  <h3 style="color:var(--gold);margin:0 0 6px">Payment Terms</h3>
  <ul style="margin:0 0 6px 18px">
    <li>50% deposit to start; 50% upon completion (fixed).</li>
    <li>Milestone invoices issued per phase (milestones).</li>
    <li>Hourly work billed weekly (hourly).</li>
  </ul>
</div>

${noteLis ? `<div class="box"><h3 style="color:var(--gold);margin:0 0 6px">Notes</h3><ul style="margin:0 0 6px 18px">${noteLis}</ul></div>` : ""}

<div class="box">
  <h3 style="color:var(--gold);margin:0 0 6px">Acceptance</h3>
  <p>By signing below, ${client} approves the scope and pricing outlined in this quote.</p>
  <p style="height:64px;border-top:1px dashed rgba(250,204,21,.35);margin-top:18px"></p>
  <div style="display:flex;justify-content:space-between;gap:16px">
    <div><b>Client Signature</b><br><span style="color:var(--muted)">${client}</span></div>
    <div><b>Date</b><br><span style="color:var(--muted)">__________</span></div>
  </div>
</div>

<footer>FreelanceKit — Minimal Gold Template (fallback)</footer>
</body></html>`;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await request.json();
  const { OPENAI_API_KEY } = env; // 兼容旧命名，实为 env.OPENAI_API_KEY
  const key = env.OPENAI_API_KEY || OPENAI_API_KEY;

  // 如果没配置 key，直接回退模板
  if (!key) {
    return Response.json({ html: fallbackHTML(body), note: "no_api_key_fallback" });
  }

  // 调 OpenAI（额度够就用 AI）
  try {
    const system = `You generate professional SALES QUOTES for freelancers.
Return strictly valid, print-ready HTML (no <script>).
Use black-gold styling hints in inline CSS.
Sections: Overview, Scope, Deliverables, Timeline, Pricing table, Payment Terms, Notes, Acceptance.`;

    const user = JSON.stringify(body);

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        messages: [{ role: "system", content: system }, { role: "user", content: user }]
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      // 若额度不足或其他错误，回退模板，但把错误一并返回给前端展示
      return Response.json({ html: fallbackHTML(body), note: "ai_error_fallback", error: txt });
    }

    const data = await resp.json();
    const html = (data.choices?.[0]?.message?.content || "").replace(/<script[\s\S]*?<\/script>/gi, "");
    if (!html) {
      return Response.json({ html: fallbackHTML(body), note: "empty_ai_fallback" });
    }
    return Response.json({ html });
  } catch (e) {
    return Response.json({ html: fallbackHTML(body), note: "exception_fallback", error: String(e) });
  }
}
