// Lightweight SEO injector with auto OG image detection
// - Adds canonical, icons, og/twitter meta if missing
// - Auto-detects /assets/og-card.png; falls back to /assets/logo.svg
// - Respects any meta already defined in the page

(function () {
  try {
    const loc = window.location;
    const base = `${loc.protocol}//${loc.host}`;
    // Normalize path: /index.html -> /
    const path = loc.pathname.replace(/\/index\.html$/i, "/") || "/";

    // Helpers
    const q = (sel) => document.head.querySelector(sel);
    const create = (tag, attrs = {}) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    };
    const ensure = (tag, attrs = {}, { markAuto = false } = {}) => {
      const sel = Object.entries(attrs).map(([k, v]) => `[${k}="${v}"]`).join("");
      let el = q(`${tag}${sel}`);
      if (!el) {
        el = create(tag, attrs);
        if (markAuto) el.dataset.auto = "1"; // for later safe updates
        document.head.appendChild(el);
      }
      return el;
    };
    const ensureOrUpdate = (tag, matchAttrs = {}, setAttrs = {}, { markAuto = false } = {}) => {
      // Find by "matchAttrs"; if not found, create; then set "setAttrs"
      const sel = Object.entries(matchAttrs).map(([k, v]) => `[${k}="${v}"]`).join("");
      let el = q(`${tag}${sel}`);
      if (!el) {
        el = create(tag, { ...matchAttrs, ...setAttrs });
        if (markAuto) el.dataset.auto = "1";
        document.head.appendChild(el);
      } else {
        Object.entries(setAttrs).forEach(([k, v]) => el.setAttribute(k, v));
      }
      return el;
    };

    // Title & Description (use existing if present)
    const TITLE =
      document.title ||
      "FreelanceKit — AI-Powered Freelancer Toolkit";
    const DESC =
      q('meta[name="description"]')?.content ||
      "Create invoices, AI quotes and manage clients — black-gold toolkit for freelancers.";

    // Canonical
    ensure("link", { rel: "canonical", href: base + path });

    // Icons (use your existing files)
    ensure("link", { rel: "icon", href: "/assets/logo.svg" });
    ensure("link", { rel: "apple-touch-icon", sizes: "192x192", href: "/assets/icon-192.png" });
    ensure("link", { rel: "apple-touch-icon", sizes: "512x512", href: "/assets/icon-512.png" });

    // Defaults for OG/Twitter (will upgrade to og-card.png if available)
    const defaultImg = base + "/assets/logo.svg";
    const autoOg = [
      ["meta", { property: "og:type" }, { content: "website" }],
      ["meta", { property: "og:title" }, { content: TITLE }],
      ["meta", { property: "og:description" }, { content: DESC }],
      ["meta", { property: "og:url" }, { content: base + path }],
      ["meta", { property: "og:image" }, { content: defaultImg }],
      ["meta", { name: "twitter:card" }, { content: "summary_large_image" }],
      ["meta", { name: "twitter:title" }, { content: TITLE }],
      ["meta", { name: "twitter:description" }, { content: DESC }],
      ["meta", { name: "twitter:image" }, { content: defaultImg }]
    ];

    autoOg.forEach(([tag, match, set]) => {
      // Only inject if not already present with same key (property/name)
      const key = match.property ? `meta[property="${match.property}"]` : `meta[name="${match.name}"]`;
      if (!q(key)) {
        ensureOrUpdate(tag, match, set, { markAuto: true });
      }
    });

    // If page author already set og:image or twitter:image, do nothing more.
    const authorSetOg = !!q('meta[property="og:image"]:not([data-auto])');
    const authorSetTw = !!q('meta[name="twitter:image"]:not([data-auto])');

    // Try to auto-upgrade image to /assets/og-card.png (no fetch needed: use image probe)
    const target = base + "/assets/og-card.png";
    const probe = new Image();
    // If image loads successfully, and our current tags are auto-generated, upgrade them.
    probe.onload = () => {
      if (!authorSetOg) ensureOrUpdate("meta", { property: "og:image" }, { content: target }, { markAuto: true });
      if (!authorSetTw) ensureOrUpdate("meta", { name: "twitter:image" }, { content: target }, { markAuto: true });
      // Also consider setting <link rel="image_src"> for some platforms
      ensureOrUpdate("link", { rel: "image_src" }, { href: target }, { markAuto: true });
    };
    probe.onerror = () => {
      // Keep default logo.svg; no action needed
    };
    probe.src = target;

  } catch (e) {
    console.warn("seo.js error", e);
  }
})();
