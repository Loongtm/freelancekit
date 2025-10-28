# FreelanceKit — Quotes • Invoices • Contracts (PWA)

Live demo (deploy yours on Cloudflare Pages).

Offline-first, multi-currency, multi-language, export to PDF, templates system. Built for freelancers and small teams.

- **PWA**: works offline (Service Worker + Manifest)
- **Templates**: default + Pro (demo watermark)
- **Multi-language**: English, 简体中文
- **Multi-currency**: via `Intl.NumberFormat`
- **Export PDF**: native print-to-PDF (offline)
- **Import/Export**: JSON; Clients CSV (Pro)
- **100% static** — deploy anywhere

## Deploy on Cloudflare Pages (no build)
1) Push this repo to GitHub.  
2) Cloudflare Dashboard → **Pages** → **Connect to Git** → 选择仓库  
   - Build command: _(leave empty)_  
   - Output directory: `/`  
3) 点部署。完成后绑定自定义域名（可选）。  
4) **强刷缓存**：首次打开后按 `Ctrl+Shift+R`（或在 DevTools→Application→Service Workers → Unregister 旧 SW）。

> SPA 路由和安全头已通过根目录的 `_redirects` 与 `_headers` 配置。

## Pro (monetization)
按钮指向购买/支持链接（自行替换）：
- `https://ko-fi.com/loongtm`

## Roadmap
- More languages, advanced taxes, recurring invoices, signatures, embedded PDF engine.

## Links
- Privacy: /pages/privacy.html
- Terms:   /pages/terms.html

## License
MIT. Pro templates are separately licensed (no redistribution).
