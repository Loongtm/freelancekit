// Cloudflare Pages Functions (ai-quote)
// Bind env var: OPENAI_API_KEY
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await request.json();
  const {
    seller, client, lang = 'en', currency = 'USD',
    scope = '', deliverables = '', notes = '',
    pricingModel = 'fixed', tone = 'professional'
  } = body || {};

  const system = `You generate professional SALES QUOTES for freelancers.
Output STRICTLY valid, print-ready HTML. Do not include <script>.
Use clean sections, h1-h3 headings, and a pricing table.
Currency code: ${currency}. Language: ${lang}. Tone: ${tone}.
Include: Project Overview, Scope of Work, Deliverables, Timeline, Pricing (with subtotal/tax/total placeholders), Payment Terms, Acceptance (signature area).`;

  const user = `Company/Seller: ${seller}
Client: ${client}
Scope/Requirements:
${scope}

Deliverables:
${deliverables || '(not provided)'}

Constraints/Notes:
${notes || '(not provided)'}

Pricing Model: ${pricingModel}
Please produce a branded, modern HTML with minimal inline styles suitable for printing. Add a centered header with company name and QUOTE number placeholder.`;

  // ---- Call OpenAI Chat Completions ----
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // 体积小、性价比高；可替换
      temperature: 0.5,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });

  if (!resp.ok) {
    const txt = await resp.text();
    return new Response(`AI error: ${txt}`, { status: 500 });
  }

  const data = await resp.json();
  const html = data.choices?.[0]?.message?.content || '<p>Failed to generate.</p>';

  // 简单安全处理：移除任何 <script>（双保险）
  const safe = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

  return Response.json({ html: safe });
}
