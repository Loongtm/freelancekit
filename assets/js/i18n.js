// assets/js/i18n.js — 简易国际化（中/英），全局 FK_I18N 对象
window.FK_I18N = (function(){
  const LOCALES = {
    en: {
      pwaReady: "PWA ready",
      online: "Online",
      offline: "Offline",
      workflow: "Workflow: Fill → Preview → Export/Save",
      preview: "Preview (Ctrl+P)",
      exportPdf: "Export PDF",
      addItem: "Add Item",
      clearAll: "Clear All",
      loadJson: "Load JSON",
      saveJson: "Save JSON",
      importCsvPro: "Import Clients CSV (Pro)",
      notes: "Notes",
      terms: "Terms",
      subtotal: "Subtotal",
      tax: "Tax",
      total: "Total",
      pleaseAddItem: "Please add at least one line item",
      fixFields: "Please fix highlighted fields",
      savedJson: "Saved JSON",
      contactEmail: "tmloong0128@gmail.com",
      from: "From",
      billTo: "Bill To",
      description: "Description",
      qty: "Qty",
      unit: "Unit",
      taxPct: "Tax %",
      amount: "Amount",
      invoice: "Invoice",
      install: "Install",
      unlockPro: "Unlock Pro"
    },
    zh: {
      pwaReady: "PWA 就绪",
      online: "在线",
      offline: "离线",
      workflow: "流程：填写 → 预览 → 导出/保存",
      preview: "预览（Ctrl+P）",
      exportPdf: "导出 PDF",
      addItem: "新增行",
      clearAll: "清空",
      loadJson: "导入 JSON",
      saveJson: "保存 JSON",
      importCsvPro: "导入客户 CSV（Pro）",
      notes: "备注",
      terms: "条款",
      subtotal: "小计",
      tax: "税额",
      total: "合计",
      pleaseAddItem: "请至少添加一行项目",
      fixFields: "请修正高亮字段",
      savedJson: "已保存 JSON",
      contactEmail: "tmloong0128@gmail.com",
      from: "发件方",
      billTo: "收件方",
      description: "项目描述",
      qty: "数量",
      unit: "单价",
      taxPct: "税率 %",
      amount: "金额",
      invoice: "发票",
      install: "安装",
      unlockPro: "解锁 Pro"
    }
  };

  const KEY = 'fk_lang';
  function getLang(){ return localStorage.getItem(KEY) || 'zh'; }
  function setLang(l){ localStorage.setItem(KEY, l); }
  function t(key){
    const lang = getLang();
    return (LOCALES[lang] && LOCALES[lang][key]) || (LOCALES['en'][key]||key);
  }
  return { getLang, setLang, t, LOCALES };
})();
