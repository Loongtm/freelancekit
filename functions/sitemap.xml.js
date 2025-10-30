// functions/sitemap.xml.js
export async function onRequest(context) {
  const { request } = context;
  const origin = new URL(request.url);
  const base = `${origin.protocol}//${origin.host}`;

  // 列出所有公开页面（按你当前实际结构）
  const pages = [
    '/',                // 你可以把 landing.html 设为首页时用
    '/landing.html',
    '/index.html',      // Dashboard
    '/invoice.html',
    '/pages/quote.html',
    '/pages/terms.html',
    '/pages/privacy.html'
  ];

  // 如果 templates 下固定有 5 个文件，手动列出来更稳
  // 也可以按你的真实文件名改成对应的路径（示例）：
  const templates = [
    '/templates/default-invoice.html',
    '/templates/professional-invoice.html',
    '/templates/minimal-invoice.html',
    '/templates/quote-classic.html',
    '/templates/quote-modern.html'
  ];

  const urls = [...pages, ...templates];

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `
  <url>
    <loc>${base}${u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u === '/' ? '1.0' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>`.trim();

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
