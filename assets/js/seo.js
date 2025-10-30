// assets/js/seo.js
(function () {
  try {
    const loc = window.location;
    const base = `${loc.protocol}//${loc.host}`;
    const path = loc.pathname.replace(/index\.html$/,'') || '/';

    // 若页面已有相同 rel/name 的标签则不重复添加
    const ensure = (tag, attrs) => {
      const sel = Object.entries(attrs).map(([k,v]) => `[${k}="${v}"]`).join('');
      if (!document.head.querySelector(`${tag}${sel}`)) {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
        document.head.appendChild(el);
      }
    };

    // canonical
    ensure('link', { rel: 'canonical', href: base + path });

    // icons（你已有 icon-192/512，这里都挂上）
    ensure('link', { rel: 'icon', href: '/assets/logo.svg' });
    ensure('link', { rel: 'apple-touch-icon', sizes: '192x192', href: '/assets/icon-192.png' });
    ensure('link', { rel: 'apple-touch-icon', sizes: '512x512', href: '/assets/icon-512.png' });

    // OpenGraph & Twitter 默认（可被各页额外 meta 覆盖）
    const TITLE = document.title || 'FreelanceKit — AI-Powered Freelancer Toolkit';
    const DESC  = (document.querySelector('meta[name="description"]')?.content)
               || 'Create invoices, AI quotes and manage clients — black-gold themed toolkit for freelancers.';

    const og = [
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:title', content: TITLE }],
      ['meta', { property: 'og:description', content: DESC }],
      ['meta', { property: 'og:url', content: base + path }],
      ['meta', { property: 'og:image', content: base + '/assets/logo.svg' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: TITLE }],
      ['meta', { name: 'twitter:description', content: DESC }],
      ['meta', { name: 'twitter:image', content: base + '/assets/logo.svg' }],
    ];
    og.forEach(([tag, attrs]) => ensure(tag, attrs));
  } catch(e) {
    console.warn('seo.js error', e);
  }
})();
