// functions/sitemap.xml.js
export async function onRequest(context) {
  const { request } = context;
  const u = new URL(request.url);
  const base = `${u.protocol}//${u.host}`;
  const today = new Date().toISOString().slice(0, 10);

  // 只列 HTML 页面（不要把 templates/*.json 放进 sitemap）
  const pages = [
    '/',                // 主页（经 _redirects 指向 landing.html）
    '/landing.html',
    '/index.html',
    '/invoice.html',
    '/pages/quote.html',
    '/pages/terms.html',
    '/pages/privacy.html'
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${base}${p}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p==='/'? '1.0':'0.7'}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
