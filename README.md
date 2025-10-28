# FreelanceKit — Quotes • Invoices • Contracts (PWA)

Live demo: https://freelancekit-loongtm.netlify.app/

Offline-first, multi-currency, multi-language, export to PDF, templates system. Built for freelancers and small teams.

- **PWA**: works offline (Service Worker + Manifest)
- **Templates**: default + Pro (demo watermark)
- **Multi-language**: English, 简体中文
- **Multi-currency**: via `Intl.NumberFormat`
- **Export PDF**: native print-to-PDF (offline)
- **Import/Export**: JSON; Clients CSV (Pro)
- **100% static** — deploy anywhere

## Quick start
1) Copy all files to a static host (Netlify / GitHub Pages / Vercel static).  
2) Open the site → **Install** (PWA) if prompted → Start creating invoices.

## Pro (monetization)
Buttons in the app link to purchase (replace with your own URL):
- `https://ko-fi.com/loongtm` ← (fixed duplicated protocol)

Pro ideas:
- Template pack (no watermark), batch invoicing, CSV import, timesheet→invoice, white-label.

## Development
No build step. Pure HTML/CSS/JS.
- `sw.js` caches assets for offline.
- PDF uses browser print-to-PDF.
- i18n lives in `app.js`.

## Roadmap
- More languages, advanced taxes, recurring invoices, signatures, embedded PDF engine.

## Links
- Privacy: /pages/privacy.html
- Terms:   /pages/terms.html

## License
MIT. Pro templates are separately licensed (no redistribution).
