// assets/js/app.js — 集中改进版
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const byId = id => document.getElementById(id);
  const I = window.FK_I18N || { t: k=>k, getLang:()=> 'zh', setLang:()=>{} };

  /* THEME */
  const THEME_KEY='fk_theme';
  const getTheme = ()=> localStorage.getItem(THEME_KEY) || 'dark';
  const setTheme = v => {
    document.documentElement.classList.add('theme-x');
    setTimeout(()=>document.documentElement.classList.remove('theme-x'), 280);
    localStorage.setItem(THEME_KEY, v);
    document.documentElement.setAttribute('data-theme', v);
  };
  setTheme(getTheme());
  const themeToggle = byId('themeToggle');
  if(themeToggle) themeToggle.addEventListener('click', ()=> setTheme(getTheme()==='dark'?'light':'dark'));

  /* I18N wiring */
  const langSwitcher = byId('langSwitcher');
  if(langSwitcher){
    langSwitcher.value = I.getLang();
    langSwitcher.addEventListener('change', e => { I.setLang(e.target.value); applyI18n(); });
  }
  function applyI18n(){
    $$('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if(k) el.textContent = I.t(k);
    });
    const ns = byId('net-state');
    if(ns) ns.textContent = navigator.onLine ? I.t('online') : I.t('offline');
  }
  applyI18n();
  window.addEventListener('online', applyI18n);
  window.addEventListener('offline', applyI18n);

  /* PWA install handling */
  (function(){
    let deferredPrompt = null;
    const installBtn = byId('installPWA');
    const pwaState = byId('pwa-state');
    if(pwaState) pwaState.textContent = I.t('pwaReady');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if(installBtn){ installBtn.style.display = 'inline-flex'; }
    });

    if(byId('installPWA')){
      byId('installPWA').addEventListener('click', async () => {
        if(!deferredPrompt) return alert('Not installable');
        try {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          deferredPrompt = null;
          byId('installPWA').style.display = 'none';
          alert(choice.outcome === 'accepted' ? 'App installed' : 'Install dismissed');
        } catch(e){ console.warn(e); }
      });
    }
    // If already installed, hide
    if(navigator.standalone || window.matchMedia('(display-mode: standalone)').matches){
      if(byId('installPWA')) byId('installPWA').style.display = 'none';
    }
  })();

  /* Elements */
  const yourName = byId('yourName'), yourEmail = byId('yourEmail');
  const clientName = byId('clientName');
  const lineItemsWrap = byId('lineItems'), addItemBtn = byId('addItem'), clearItemsBtn = byId('clearItems');
  const previewBtn = byId('previewPDF'), exportBtn = byId('exportPDF');
  const subtotalEl = byId('subtotal'), taxAmountEl = byId('taxAmount'), grandTotalEl = byId('grandTotal');
  const saveJsonBtn = byId('saveJson'), loadJsonBtn = byId('loadJson');
  const currency = byId('currency'), taxRate = byId('taxRate');
  const notesEl = byId('notes'), termsEl = byId('terms');

  /* validation UX: no red on load */
  function setInvalid(el, bad){
    if(!el) return;
    if(bad) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid');
  }
  $$('input,textarea,select').forEach(el=>{
    el.addEventListener('input', ()=> setInvalid(el, !el.checkValidity()));
    el.addEventListener('focus', ()=> setInvalid(el, false));
    el.addEventListener('blur', ()=> setInvalid(el, !el.checkValidity()));
  });

  /* utility */
  function parseNum(v){ const n = Number(String(v||'').replace(/,/g,'')); return isFinite(n)?n:0; }
  function fmtMoney(v){
    const cur = currency?.value || 'MYR';
    try{
      return new Intl.NumberFormat(I.getLang()==='zh'?'zh-CN':undefined,{style:'currency',currency:cur}).format(v||0);
    }catch{ return (v||0).toFixed(2)+' '+cur; }
  }

  /* items */
  function newRow(data={}){
    const row = document.createElement('div'); row.className = 'item-row';
    row.innerHTML = `
      <input class="item-desc" placeholder="${I.t('description')}" value="${data.desc||''}">
      <input class="item-qty" inputmode="decimal" placeholder="1" value="${data.qty ?? 1}">
      <input class="item-price" inputmode="decimal" placeholder="0.00" value="${data.price ?? 0}">
      <input class="item-tax" inputmode="decimal" placeholder="0" value="${data.tax ?? ''}">
      <div class="item-amount">—</div>
      <button class="item-del" aria-label="Remove">✕</button>
    `;
    const qty = $('.item-qty', row), price = $('.item-price', row), itax = $('.item-tax', row), amt = $('.item-amount', row), del = $('.item-del', row);
    function recalc(){
      const q = Math.max(0, parseNum(qty.value)), p = Math.max(0, parseNum(price.value));
      const t = itax.value === '' ? parseNum(taxRate?.value || 0) : parseNum(itax.value);
      const base = q*p, tx = base*(Math.min(100, Math.max(0, t))/100);
      amt.textContent = fmtMoney(base + tx);
      updateTotals();
    }
    [qty, price, itax].forEach(el => el.addEventListener('input', recalc));
    del.addEventListener('click', ()=>{ if(confirm('Remove this line?')){ row.remove(); updateTotals(); }});
    recalc();
    return row;
  }
  function addRow(d){ if(!lineItemsWrap) return; lineItemsWrap.appendChild(newRow(d)); }

  if(addItemBtn) addItemBtn.addEventListener('click', ()=> addRow());
  if(clearItemsBtn) clearItemsBtn.addEventListener('click', ()=> { if(confirm('Clear all line items?')){ lineItemsWrap.innerHTML = ''; updateTotals(); }});

  function updateTotals(){
    let subtotal = 0, tax=0;
    $$('.item-row').forEach(row=>{
      const q = parseNum($('.item-qty',row)?.value), p = parseNum($('.item-price',row)?.value);
      const rT = $('.item-tax',row)?.value; const t = rT==='' ? parseNum(taxRate?.value||0) : parseNum(rT);
      const base = q*p; subtotal += base; tax += base*(Math.min(100, Math.max(0, t))/100);
    });
    subtotalEl && (subtotalEl.textContent = fmtMoney(subtotal));
    taxAmountEl && (taxAmountEl.textContent = fmtMoney(tax));
    grandTotalEl && (grandTotalEl.textContent = fmtMoney(subtotal + tax));
  }
  if(lineItemsWrap && lineItemsWrap.children.length===0) addRow({qty:1, price:0});

  /* serialize/hydrate json */
  function serialize(){
    const rows = $$('.item-row').map(r=>({
      desc: $('.item-desc',r)?.value||'',
      qty: parseNum($('.item-qty',r)?.value),
      price: parseNum($('.item-price',r)?.value),
      tax: $('.item-tax',r)?.value
    }));
    return { your:{name: yourName?.value||'', email: yourEmail?.value||''}, client:{name: clientName?.value||''}, doc:{currency: currency?.value||'', taxRate: taxRate?.value||''}, rows, notes: notesEl?.value||'', terms: termsEl?.value||'' };
  }
  function hydrate(d){
    try{
      yourName && (yourName.value = d.your?.name||''); yourEmail && (yourEmail.value = d.your?.email||'');
      clientName && (clientName.value = d.client?.name||'');
      currency && (currency.value = d.doc?.currency || currency.value);
      taxRate && (taxRate.value = d.doc?.taxRate || taxRate.value);
      if(lineItemsWrap){ lineItemsWrap.innerHTML = ''; (d.rows||[]).forEach(r => addRow(r)); }
      notesEl && (notesEl.value = d.notes || '');
      termsEl && (termsEl.value = d.terms || '');
      updateTotals(); $$('input,textarea,select').forEach(el=>setInvalid(el,false));
      alert(I.t('savedJson') || 'Loaded');
    }catch(e){ alert('Invalid JSON'); }
  }
  if(saveJsonBtn) saveJsonBtn.addEventListener('click', ()=> {
    const blob = new Blob([JSON.stringify(serialize(), null, 2)], {type:'application/json'}); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `freelancekit-${Date.now()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  });
  if(loadJsonBtn) loadJsonBtn.addEventListener('click', ()=> {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange = async ()=> { const f = inp.files?.[0]; if(!f) return; const txt = await f.text(); hydrate(JSON.parse(txt)); }; inp.click();
  });

  /* validate on demand */
  function validateOnDemand(){
    let ok = true;
    if(!yourName?.checkValidity()) { setInvalid(yourName, true); ok=false; }
    if(!yourEmail?.checkValidity()) { setInvalid(yourEmail, true); ok=false; }
    if(!clientName?.checkValidity()) { setInvalid(clientName, true); ok=false; }
    if((lineItemsWrap?.children.length || 0)===0){ alert(I.t('pleaseAddItem')); ok=false; }
    return ok;
  }

  /* printing / export */
  const LOGO_SVG = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#1e40af"/></linearGradient></defs><rect x="4" y="4" width="56" height="56" rx="12" fill="url(#g)"/><g fill="#fff"><rect x="14" y="20" width="28" height="8" rx="4"/><rect x="14" y="34" width="20" height="8" rx="4"/><circle cx="46" cy="38" r="6"/></g></svg>');
  function buildPrintHTML(autoPrint=false){
    const d = serialize();
    const rowsHtml = $$('.item-row').map(r=>{
      return `<tr><td>${$('.item-desc',r)?.value||''}</td><td class="r">${$('.item-qty',r)?.value||''}</td><td class="r">${$('.item-price',r)?.value||''}</td><td class="r">${$('.item-tax',r)?.value||''}</td><td class="r">${$('.item-amount',r)?.textContent||''}</td></tr>`;
    }).join('');
    const script = autoPrint ? `<script>window.addEventListener('load', ()=> setTimeout(()=> print(), 300));</script>` : '';
    return `<!doctype html><html lang="${I.getLang()}"><head><meta charset="utf-8"><title>${I.t('invoice')}</title><link rel="icon" href="data:image/svg+xml;utf8,${LOGO_SVG}"><style>body{font-family:system-ui, Arial; padding:20px; color:#111} table{width:100%; border-collapse:collapse} th,td{border:1px solid #ddd; padding:6px} th{background:#f3f4f6} .r{text-align:right}</style></head><body><header style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:10px"><img src="data:image/svg+xml;utf8,${LOGO_SVG}" alt="" style="width:36px;height:36px"><div><strong>${I.t('invoice')}</strong></div></div><div>${d.doc?.currency||''}</div></header><section style="margin-top:12px"><div><strong>${I.t('from')}</strong><div>${d.your?.name||''}</div><div>${d.your?.email||''}</div></div><div style="margin-top:8px"><strong>${I.t('billTo')}</strong><div>${d.client?.name||''}</div></div></section><table><thead><tr><th>${I.t('description')}</th><th>${I.t('qty')}</th><th>${I.t('unit')}</th><th>${I.t('taxPct')}</th><th>${I.t('amount')}</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr><td colspan="4" class="r">${I.t('subtotal')}</td><td class="r">${subtotalEl?.textContent||''}</td></tr><tr><td colspan="4" class="r">${I.t('tax')}</td><td class="r">${taxAmountEl?.textContent||''}</td></tr><tr><td colspan="4" class="r">${I.t('total')}</td><td class="r">${grandTotalEl?.textContent||''}</td></tr></tfoot></table><footer style="margin-top:20px">Made with FreelanceKit — Contact: <a href="mailto:${I.t('contactEmail')}">${I.t('contactEmail')}</a></footer>${script}</body></html>`;
  }
  function openHtml(html){ const blob = new Blob([html], {type:'text/html'}); const url = URL.createObjectURL(blob); const w = window.open(url, '_blank'); if(!w){ alert('Popup blocked'); URL.revokeObjectURL(url); return; } setTimeout(()=> URL.revokeObjectURL(url), 10000); }

  if(previewBtn) previewBtn.addEventListener('click', ()=> { if(!validateOnDemand()) return; openHtml(buildPrintHTML(false)); });
  if(exportBtn) exportBtn.addEventListener('click', ()=> { if(!validateOnDemand()) return; openHtml(buildPrintHTML(true)); alert(I.t('exportPdf')); });

  // keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if(mod && e.key.toLowerCase() === 'p'){ e.preventDefault(); previewBtn && previewBtn.click(); }
    if(mod && e.key.toLowerCase() === 's'){ e.preventDefault(); saveJsonBtn && saveJsonBtn.click(); }
  });

  // Pro modal wiring
  const openPro = byId('openPro'), proDlg = byId('proDlg'), proClose = byId('proClose'), proBuy = byId('proBuy');
  if(openPro) openPro.addEventListener('click', ()=> { if(proDlg){ proDlg.style.display='flex'; document.body.style.overflow='hidden'; }});
  if(proClose) proClose.addEventListener('click', ()=> { if(proDlg){ proDlg.style.display='none'; document.body.style.overflow=''; }});
  if(proBuy) proBuy.addEventListener('click', ()=> { alert('This is a demo checkout placeholder. Integrate Stripe/PayPal here.'); });

  // on load totals
  updateTotals();
  taxRate && taxRate.addEventListener('input', updateTotals);
  currency && currency.addEventListener('change', updateTotals);

  // expose API for debug
  window.FK = { serialize, hydrate: d => hydrate(d), updateTotals, addRow };
})();
