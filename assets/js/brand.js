// assets/js/brand.js
// Pro 白标：本地保存品牌配置（logo / color / footer），并应用到发票页面
// 数据保存在 localStorage 的 fk_brand 配置下

(function (global) {
  const STORE_KEY = "fk_brand"; // 全站共享一份，后续可扩展为 per-email

  function read() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  function write(obj) {
    localStorage.setItem(STORE_KEY, JSON.stringify(obj || {}));
  }

  async function fileToDataURL(file) {
    if (!file) return null;
    if (!/^image\//.test(file.type)) throw new Error("Please choose an image file");
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // ===== Public API =====
  async function setLogoFile(file) {
    const url = await fileToDataURL(file);
    const cfg = read();
    cfg.logo = url; // base64 data URL
    write(cfg);
    return url;
  }
  function setColor(hex) {
    const cfg = read();
    cfg.color = (hex || "").trim();
    write(cfg);
    return cfg.color;
  }
  function setFooter(text) {
    const cfg = read();
    cfg.footer = (text || "").trim();
    write(cfg);
    return cfg.footer;
  }

  // 在当前文档应用品牌（发票页用）
  function applyToInvoice(doc) {
    const d = doc || document;
    const cfg = read();

    // 1) 主题主色（影响黑金主题里的 --gold）
    const color = cfg.color && /^#?[0-9a-f]{6}$/i.test(cfg.color)
      ? (cfg.color.startsWith('#') ? cfg.color : `#${cfg.color}`)
      : null;

    if (color) {
      d.documentElement.style.setProperty('--gold', color);
      // 辅助高光色自动生成浅色（简单提亮）
      try {
        const c = +('0x' + color.replace('#',''));
        const r = Math.min(255, ((c>>16)&255) + 30);
        const g = Math.min(255, ((c>>8)&255) + 30);
        const b = Math.min(255, (c&255) + 30);
        d.documentElement.style.setProperty('--gold-2', `rgb(${r}, ${g}, ${b})`);
      } catch {}
    }

    // 2) 替换 Logo（优先使用自定义，其次按主题的 /assets/logo.svg / logo-light.svg）
    const logoEl = d.getElementById('logoImg');
    if (logoEl && cfg.logo) {
      logoEl.src = cfg.logo;
      logoEl.style.display = 'block';
    }

    // 3) 页脚文案
    const footEl = d.querySelector('.foot');
    if (footEl && cfg.footer) {
      footEl.textContent = cfg.footer;
    }
  }

  // 给设置面板读回当前值
  function getConfig() {
    return read();
  }

  global.BrandKit = {
    setLogoFile, setColor, setFooter, applyToInvoice, getConfig
  };
})(window);
