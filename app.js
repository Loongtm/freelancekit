/* FreelanceKit — Complete app.js
   - Theme toggle (light/dark) with persistence
   - i18n via [data-i18n] (EN/中文), persisted in localStorage('fk_lang')
   - Robust preview/export via Blob URL (fixes blank tab)
   - Pro dialog: ESC / 背景点击 / 按钮均可关闭；另有 /pages/pro.html
   - JSON import/export, validation, money/percent masks, totals live calc
   - Keyboard: Ctrl+S save JSON, Ctrl+P preview
   - Contact email unified as tmloong0128@gmail.com
*/
(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const byId = (id) => document.getElementById(id);

  /* ================= THEME ================= */
  const THEME_KEY = 'fk_theme';
  const getTheme = () => localStorage.getItem(THEME_KEY) || 'dark';
  const setTheme = (v) => {
    localStorage.setItem(THEME_KEY, v);
    document.documentElement.setAttribute('data-theme', v === 'light' ? 'light' : 'dark');
  };
  setTheme(getTheme());
  const themeBtn = byId('themeToggle');
  if (themeBtn) {
    const syncIcon = () => themeBtn.textContent = getTheme() === 'light' ? '🌞' : '🌗';
    syncIcon();
    themeBtn.addEventListener('click', () => {
      setTheme(getTheme() === 'light' ? 'dark' : 'light');
      syncIcon();
    });
  }

  /* ================= I18N ================= */
  const I18N = {
    en:{
      pwaReady:"PWA ready", online:"Online", offline:"Offline",
      install:"Install", unlockPro:"Unlock Pro",
      workflow:"Workflow: Fill → Preview → Export/Save",
      yourDetails:"Your Details", businessName:"Business / Name", email:"Email", address:"Address", phone:"Phone",
      clientDetails:"Client Details", clientName:"Client Name", clientEmail:"Client Email", clientAddress:"Client Address", clientRef:"PO / Reference",
      document:"Document", type:"Type", invoice:"Invoice", quote:"Quote", contract:"Contract", docNo:"Document No.", date:"Date", currency:"Currency", tax:"Tax %",
      load:"Load JSON", save:"Save JSON", importPro:"Import Clients CSV (Pro)",
      lineItems:"Line Items", description:"Description", qty:"Qty", unitPrice:"Unit Price", amount:"Amount",
      addItem:"Add Item", clearAll:"Clear All",
      notesTerms:"Notes & Terms", notes:"Notes", terms:"Terms",
      subtotal:"Subtotal", totalTax:"Tax", total:"Total",
      preview:"Preview (Ctrl+P)", export:"Export PDF",
      plsAddItem:"Please add at least one line item", fixFields:"Fix highlighted fields", saved:"Saved JSON", useDialog:"Use system dialog to save as PDF",
      from:"From", billTo:"Bill To", unit:"Unit"
    },
    zh:{
      pwaReady:"PWA 就绪", online:"在线", offline:"离线",
      install:"安装", unlockPro:"解锁 Pro",
      workflow:"流程：填写 → 预览 → 导出/保存",
      yourDetails:"你的信息", businessName:"单位 / 名称", email:"邮箱", address:"地址", phone:"电话",
      clientDetails:"客户信息", clientName:"客户名称", clientEmail:"客户邮箱", clientAddress:"客户地址", clientRef:"采购单号 / 参考",
      document:"单据", type:"类型", invoice:"发票", quote:"报价单", contract:"合同", docNo:"单据编号", date:"日期", currency:"币种", tax:"税率 %",
      load:"导入 JSON", save:"保存 JSON", importPro:"导入客户 CSV（Pro）",
      lineItems:"项目明细", description:"项目描述", qty:"数量", unitPrice:"单价", amount:"金额",
      addItem:"新增行", clearAll:"清空",
      notesTerms:"备注与条款", notes:"备注", terms:"条款",
      subtotal:"小计", totalTax:"税额", total:"合计",
      preview:"预览（Ctrl+P）", export:"导出 PDF",
      plsAddItem:"请至少添加一行项目", fixFields:"请修正高亮字段", saved:"已保存 JSON", useDialog:"在系统对话框中保存为 PDF",
      from:"发件方", billTo:"收件方", unit:"单价"
    }
  };
  const LANG_KEY = 'fk_lang';
  const getLang = () => localStorage.getItem(LANG_KEY) || 'en';
  const setLang = (v) => localStorage.setItem(LANG_KEY, v);
  const t = () => I18N[getLang()] || I18N.en;

  const applyI18n = () => {
    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && t()[key]) el.textContent = t()[key];
    });
    // Update network label with current state
    const netState = byId('net-state');
    if (netState) netState.textContent = navigator.onLine ? t().online : t().offline;
  };

  const langSel = byId('langSwitcher');
  if (langSel) {
    langSel.value = getLang();
    langSel.addEventListener('change', () => { setLang(langSel.value); applyI18n(); toast('Language updated'); });
  }
  applyI18n();

  /* ================= STATUS / PWA ================= */
  const toasts = byId('toasts');
  const toast = (msg) => {
    if (!toasts) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  };

  const netState = byId('net-state');
  const pwaState = byId('pwa-state');
  const installBtn = byId('installPWA');

  const updateNet = () => netState && (netState.textContent = navigator.onLine ? t().online : t().offline);
  updateNet();
  window.addEventListener('online',  () => { updateNet(); toast('Online'); });
  window.addEventListener('offline', () => { updateNet(); toast('Offline'); });

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    if (pwaState) pwaState.textContent = 'Installable';
    if (installBtn) installBtn.style.display = 'inline-flex';
  });
  if (installBtn) {
    installBtn.style.display = 'none';
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) { toast('Already installed / not installable'); return; }
      deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null;
    });
  }

  /* ================= PRO DIALOG ================= */
  const buyProBtn = byId('buyPro');
  const proDlg = byId('proDlg');
  const proClose = byId('proClose');
  const openPro = (e) => { if (e) e.preventDefault(); if (!proDlg) return; proDlg.style.display='flex'; proDlg.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; };
  const closePro = () => { if (!proDlg) return; proDlg.style.display='none'; proDlg.setAttribute('aria-hidden','true'); document.body.style.overflow=''; };
  if (buyProBtn) buyProBtn.addEventListener('click', openPro);
  if (proClose)  proClose.addEventListener('click', closePro);
  if (proDlg) {
    proDlg.addEventListener('click', (e)=>{ if(e.target===proDlg) closePro(); });
    window.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && proDlg.style.display==='flex') closePro(); });
  }

  /* ================= ELEMENTS ================= */
  const yourName = byId('yourName');
  const yourEmail = byId('yourEmail');
  const yourAddress = byId('yourAddress');
  const yourPhone = byId('yourPhone');

  const clientName = byId('clientName');
  const clientEmail = byId('clientEmail');
  const clientAddress = byId('clientAddress');
  const clientRef = byId('clientRef');

  const docType = byId('docType');
  const docNo = byId('docNo');
  const docDate = byId('docDate');
  const currency = byId('currency');
  const taxRate = byId('taxRate');

  const lineItemsWrap = byId('lineItems');
  const addItemBtn = byId('addItem');
  const clearItemsBtn = byId('clearItems');

  const subtotalEl = byId('subtotal');
  const taxAmountEl = byId('taxAmount');
  const grandTotalEl = byId('grandTotal');

  const loadJsonBtn = byId('loadJson');
  const saveJsonBtn = byId('saveJson');
  const importCSVBtn = byId('importClientsCSV');

  const previewBtn = byId('previewPDF');
  const exportBtn = byId('exportPDF');

  /* ================= HELPERS ================= */
  const setInvalid = (el, bad) => el && el.setAttribute('aria-invalid', bad ? 'true' : 'false');
  const parseNum = (v) => {
    if (typeof v === 'number') return v;
    const n = String(v || '').replace(/,/g,'').trim();
    const x = Number(n);
    return isFinite(x) ? x : 0;
  };
  const moneyMask = (el) => el && el.addEventListener('blur', () => { const n = Math.max(0, parseNum(el.value)); el.value = n.toFixed(2); });
  const percentMask = (el) => el && el.addEventListener('blur', () => { let n = parseNum(el.value); if (n<0) n=0; if (n>100) n=100; el.value = String(n).replace(/\.00$/,''); });

  const fmt = (val) => {
    const cur = currency?.value || 'MYR';
    try { return new Intl.NumberFormat(getLang()==='zh'?'zh-CN':undefined,{style:'currency',currency:cur}).format(val||0); }
    catch { return (val||0).toFixed(2)+' '+cur; }
  };

  let dirty=false;
  const markDirty = () => { dirty=true; };
  $$('input,textarea,select').forEach(el => el.addEventListener('input', markDirty));
  window.addEventListener('beforeunload', (e) => { if (!dirty) return; e.preventDefault(); e.returnValue=''; });

  /* ================= ITEMS ================= */
  const newRow = (data={}) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <input class="item-desc" placeholder="Design service — homepage" value="${data.desc || ''}">
      <input class="item-qty"  inputmode="decimal" placeholder="1" value="${data.qty ?? ''}">
      <input class="item-price" inputmode="decimal" placeholder="0.00" value="${data.price ?? ''}">
      <input class="item-tax" inputmode="decimal" placeholder="${taxRate?.value || 0}">
      <div class="item-amount" aria-label="row amount">—</div>
      <button class="item-del" title="Remove" aria-label="Remove line">✕</button>
    `;
    const [desc, qty, price, rowTax, amount, del] =
      ['.item-desc','.item-qty','.item-price','.item-tax','.item-amount','.item-del'].map(s=>row.querySelector(s));

    const recalc = () => {
      const q = Math.max(0, parseNum(qty.value||0));
      const p = Math.max(0, parseNum(price.value||0));
      const tval = rowTax.value === '' ? parseNum(taxRate?.value||0) : Math.min(100, Math.max(0, parseNum(rowTax.value)));
      const base = q*p; const tx = base*(tval/100);
      amount.textContent = fmt(base+tx);
      updateTotals();
    };

    [qty, price].forEach(moneyMask);
    [rowTax].forEach(percentMask);
    [desc, qty, price, rowTax].forEach(el => el.addEventListener('input', () => { markDirty(); recalc(); }));
    del.addEventListener('click', () => { if (!confirm('Remove this line?')) return; row.remove(); updateTotals(); markDirty(); });

    recalc();
    return row;
  };

  const addRow = (data) => { if (!lineItemsWrap) return; lineItemsWrap.appendChild(newRow(data)); markDirty(); };
  const clearRows = () => {
    if (!lineItemsWrap || lineItemsWrap.children.length===0) return;
    if (!confirm('Clear all line items?')) return;
    lineItemsWrap.innerHTML=''; updateTotals(); markDirty();
  };
  addItemBtn && addItemBtn.addEventListener('click', () => addRow());
  clearItemsBtn && clearItemsBtn.addEventListener('click', clearRows);

  const updateTotals = () => {
    if (!lineItemsWrap) return;
    let subtotal=0, tax=0, globalT=parseNum(taxRate?.value||0);
    $$('.item-row').forEach(row=>{
      const qty=parseNum($('.item-qty',row)?.value||0);
      const price=parseNum($('.item-price',row)?.value||0);
      const rowT=$('.item-tax',row)?.value;
      const tval = rowT===''?globalT:parseNum(rowT);
      const base=qty*price;
      subtotal+=base; tax+=base*(Math.min(100,Math.max(0,tval))/100);
    });
    subtotalEl && (subtotalEl.textContent=fmt(subtotal));
    taxAmountEl && (taxAmountEl.textContent=fmt(tax));
    grandTotalEl && (grandTotalEl.textContent=fmt(subtotal+tax));
  };
  taxRate && (percentMask(taxRate), taxRate.addEventListener('input', ()=>{ markDirty(); updateTotals(); }));
  currency && currency.addEventListener('change', updateTotals);

  /* ================= VALIDATE ================= */
  const validateCore = () => {
    let ok=true;
    [yourName,yourEmail,clientName,docType,docNo,docDate,currency].forEach(el=>{
      if(!el) return; const valid=el.checkValidity(); setInvalid(el,!valid); ok=ok&&valid;
    });
    if(!lineItemsWrap || lineItemsWrap.children.length===0){ toast(t().plsAddItem); ok=false; }
    return ok;
  };

  /* ================= JSON I/O ================= */
  const serialize = () => {
    const rows = $$('.item-row').map(row=>({
      desc: $('.item-desc',row)?.value||'',
      qty:  parseNum($('.item-qty',row)?.value||0),
      price:parseNum($('.item-price',row)?.value||0),
      tax:  $('.item-tax',row)?.value
    }));
    return {
      meta:{version:1},
      your:{ name:yourName?.value, email:yourEmail?.value, address:yourAddress?.value||'', phone:yourPhone?.value||'' },
      client:{ name:clientName?.value, email:clientEmail?.value||'', address:clientAddress?.value||'', ref:clientRef?.value||'' },
      doc:{ type:docType?.value, no:docNo?.value, date:docDate?.value, currency:currency?.value, taxRate:taxRate?.value },
      rows, notes:byId('notes')?.value||'', terms:byId('terms')?.value||''
    };
  };
  const hydrate = (data) => {
    try{
      yourName && (yourName.value=data.your?.name||'');
      yourEmail && (yourEmail.value=data.your?.email||'');
      yourAddress && (yourAddress.value=data.your?.address||'');
      yourPhone && (yourPhone.value=data.your?.phone||'');

      clientName && (clientName.value=data.client?.name||'');
      clientEmail && (clientEmail.value=data.client?.email||'');
      clientAddress && (clientAddress.value=data.client?.address||'');
      clientRef && (clientRef.value=data.client?.ref||'');

      docType && (docType.value=data.doc?.type||'invoice');
      docNo && (docNo.value=data.doc?.no||'');
      docDate && (docDate.value=data.doc?.date||'');
      currency && (currency.value=data.doc?.currency||'MYR');
      taxRate && (taxRate.value=data.doc?.taxRate??'');

      if(lineItemsWrap){ lineItemsWrap.innerHTML=''; (data.rows||[]).forEach(r=>addRow(r)); }
      byId('notes') && (byId('notes').value=data.notes||'');
      byId('terms') && (byId('terms').value=data.terms||'');
      updateTotals(); toast('Data loaded'); dirty=false;
    }catch(e){ console.error(e); toast('Invalid JSON structure'); }
  };
  saveJsonBtn && saveJsonBtn.addEventListener('click', ()=>{
    const data=serialize();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`${data.doc?.type||'document'}-${data.doc?.no||'draft'}.json`; a.click();
    toast(t().saved); dirty=false;
  });
  loadJsonBtn && loadJsonBtn.addEventListener('click', async ()=>{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange=async()=>{ const f=inp.files?.[0]; if(!f) return;
      const txt=await f.text(); try{ hydrate(JSON.parse(txt)); }catch{ toast('Invalid JSON file'); }
    }; inp.click();
  });
  importCSVBtn && importCSVBtn.addEventListener('click', ()=>toast('Clients CSV import is a Pro feature'));

  /* ================= PRINT / EXPORT ================= */
  const buildPrintHTML = (autoPrint=false) => {
    const data=serialize(); const lang=getLang(); const tt=t();
    const rowsHtml=$$('.item-row').map(row=>{
      const d=$('.item-desc',row)?.value||''; const q=$('.item-qty',row)?.value||'';
      const p=$('.item-price',row)?.value||''; const tx=$('.item-tax',row)?.value||'';
      const amt=$('.item-amount',row)?.textContent||'';
      return `<tr><td>${d}</td><td style="text-align:right">${q}</td><td style="text-align:right">${p}</td><td style="text-align:right">${tx}</td><td style="text-align:right">${amt}</td></tr>`;
    }).join('');
    const script=autoPrint?`<script>window.addEventListener('load',()=>window.print(),{once:true})<\/script>`:'';
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<title>${(data.doc?.type||'Document').toUpperCase()} ${data.doc?.no||''}</title>
<style>
  :root{--ink:#111;--muted:#666}
  body{font:14px/1.6 system-ui,Segoe UI,Roboto,Arial;padding:28px;color:var(--ink)}
  h1{font-size:20px;margin:0 0 8px}
  .muted{color:var(--muted)}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0 16px}
  table{width:100%; border-collapse:collapse; margin-top:10px}
  th,td{border:1px solid #ddd; padding:6px}
  th{background:#f3f4f6;text-align:left}
  tfoot td{font-weight:bold}
  a{color:#0b57d0}
</style>
</head><body>
  <h1>${(data.doc?.type||'Document').toUpperCase()} ${data.doc?.no||''}</h1>
  <div class="grid">
    <div>
      <div class="muted">${tt.from}</div>
      <div>${data.your?.name||''}</div>
      <div>${data.your?.email||''}</div>
      <div>${data.your?.address||''}</div>
      <div>${data.your?.phone||''}</div>
    </div>
    <div>
      <div class="muted">${tt.billTo}</div>
      <div>${data.client?.name||''}</div>
      <div>${data.client?.email||''}</div>
      <div>${data.client?.address||''}</div>
      <div>Ref: ${data.client?.ref||'-'}</div>
      <div>Date: ${data.doc?.date||''} • Currency: ${data.doc?.currency||''}</div>
    </div>
  </div>

  <table>
    <thead><tr><th>${tt.description}</th><th style="text-align:right">${tt.qty}</th><th style="text-align:right">${tt.unit}</th><th style="text-align:right">${tt.tax}</th><th style="text-align:right">${tt.amount}</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr><td colspan="4" style="text-align:right">${tt.subtotal}</td><td style="text-align:right">${byId('subtotal')?.textContent||''}</td></tr>
      <tr><td colspan="4" style="text-align:right">${tt.totalTax}</td><td style="text-align:right">${byId('taxAmount')?.textContent||''}</td></tr>
      <tr><td colspan="4" style="text-align:right">${tt.total}</td><td style="text-align:right">${byId('grandTotal')?.textContent||''}</td></tr>
    </tfoot>
  </table>

  <p><strong>${tt.notes}</strong><br>${byId('notes')?.value||'-'}</p>
  <p><strong>${tt.terms}</strong><br>${byId('terms')?.value||'-'}</p>
  <footer style="margin-top:40px;color:#666;font-size:12px">
    <hr>
    <p>Made with FreelanceKit — For questions, contact: <a href="mailto:tmloong0128@gmail.com">tmloong0128@gmail.com</a></p>
  </footer>
  ${script}
</body></html>`;
  };
  const openHtmlInNewTab = (html) => {
    const blob=new Blob([html],{type:'text/html'}); const url=URL.createObjectURL(blob);
    const w=window.open(url,'_blank'); if(!w){ toast('Popup blocked. Please allow popups.'); URL.revokeObjectURL(url); return; }
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  };
  const openPreview = () => openHtmlInNewTab(buildPrintHTML(false));
  const openExport  = () => openHtmlInNewTab(buildPrintHTML(true));

  previewBtn && previewBtn.addEventListener('click', ()=>{ if(!validateCore()) { toast(t().fixFields); return; } openPreview(); });
  exportBtn  && exportBtn.addEventListener('click', ()=>{ if(!validateCore()) { toast(t().fixFields); return; } openExport(); toast(t().useDialog); });

  /* ================= KEYS ================= */
  window.addEventListener('keydown', (e)=>{ const mod=(e.ctrlKey||e.metaKey);
    if(mod && e.key.toLowerCase()==='p'){ e.preventDefault(); previewBtn?.click(); }
    if(mod && e.key.toLowerCase()==='s'){ e.preventDefault(); saveJsonBtn?.click(); }
  });

  /* ================= BOOT ================= */
  if(lineItemsWrap && lineItemsWrap.children.length===0) addRow({qty:1,price:0});
  updateTotals();
})();
