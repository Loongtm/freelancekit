/* app.js — improved: i18n, better validation, print fallback, pro modal, mobile-first */
(() => {
  // helpers
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const byId = id => document.getElementById(id);

  // i18n helper (expects i18n.js loaded)
  const I = window.FK_I18N || { t: (k)=>k, setLang:()=>{}, getLang:()=> 'zh' };

  // theme (smooth)
  const THEME_KEY = 'fk_theme';
  function getTheme(){ return localStorage.getItem(THEME_KEY) || 'dark'; }
  function setTheme(v){
    document.documentElement.classList.add('theme-x');
    setTimeout(()=>document.documentElement.classList.remove('theme-x'), 280);
    localStorage.setItem(THEME_KEY, v);
    document.documentElement.setAttribute('data-theme', v);
  }
  setTheme(getTheme());
  const themeToggle = byId('themeToggle');
  if(themeToggle) themeToggle.addEventListener('click', ()=> setTheme(getTheme()==='dark'?'light':'dark'));

  // language: wire UI selects with i18n
  const langSelect = byId('langSwitcher');
  if(langSelect){
    langSelect.value = I.getLang();
    langSelect.addEventListener('change', e => { I.setLang(e.target.value); applyI18n(); });
  }
  function applyI18n(){
    $$('[data-i18n]').forEach(el=>{
      const key = el.dataset.i18n;
      if(key) el.textContent = I.t(key);
    });
    // net state
    const ns = byId('net-state');
    if(ns) ns.textContent = navigator.onLine ? I.t('online') : I.t('offline');
  }
  applyI18n();
  window.addEventListener('online', applyI18n);
  window.addEventListener('offline', applyI18n);

  // form elements
  const yourName = byId('yourName'), yourEmail = byId('yourEmail');
  const clientName = byId('clientName'), lineItemsWrap = byId('lineItems');
  const addItemBtn = byId('addItem'), clearItemsBtn = byId('clearItems');
  const previewBtn = byId('previewPDF'), exportBtn = byId('exportPDF');
  const saveJsonBtn = byId('saveJson'), loadJsonBtn = byId('loadJson');
  const subtotalEl = byId('subtotal'), taxEl = byId('taxAmount'), totalEl = byId('grandTotal');
  const notesEl = byId('notes'), termsEl = byId('terms');
  const taxRate = byId('taxRate'), currency = byId('currency');

  // validation UX: no red on load; mark after user triggers preview/export
  function setInvalid(el, bad){
    if(!el) return;
    if(bad) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid');
  }
  function attachLiveClear(){
    $$('input,textarea,select').forEach(el=>{
      el.addEventListener('input',()=> setInvalid(el, !el.checkValidity()));
      el.addEventListener('focus', ()=> setInvalid(el, false));
    });
  }
  attachLiveClear();

  // items
  function parseNum(v){ const n = Number(String(v||'').replace(/[^\d.-]/g,'')); return isFinite(n)?n:0; }
  function fmtMoney(v){ try{ return new Intl.NumberFormat(I.getLang()==='zh'?'zh-CN':undefined,{style:'currency', currency: currency?.value||'MYR'}).format(v||0); }catch{ return (v||0).toFixed(2) + ' ' + (currency?.value||'MYR'); } }

  function newItem(data={}){
    const row = document.createElement('div'); row.className = 'item-row';
    row.innerHTML = `
      <input class="item-desc" placeholder="${I.t('description')}" value="${data.desc||''}">
      <input class="item-qty" inputmode="decimal" placeholder="1" value="${data.qty ?? 1}">
      <input class="item-price" inputmode="decimal" placeholder="0.00" value="${data.price ?? 0}">
      <input class="item-tax" inputmode="decimal" placeholder="0" value="${data.tax ?? ''}">
      <div class="item-amount">—</div>
      <button class="item-del" aria-label="Remove">✕</button>`;
    const qty = $('.item-qty', row), price = $('.item-price', row), itax = $('.item-tax', row), amt = $('.item-amount', row), del = $('.item-del', row);
    function recalc(){
      const q = Math.max(0, parseNum(qty.value));
      const p = Math.max(0, parseNum(price.value));
      const t = itax.value === '' ? parseNum(taxRate?.value || 0) : parseNum(itax.value);
      const base = q * p; const tx = base * (Math.min(100, Math.max(0, t))/100);
      amt.textContent = fmtMoney(base + tx);
      updateTotals();
    }
    [qty, price, itax].forEach(el => el.addEventListener('input', recalc));
    del.addEventListener('click', ()=>{ if(confirm('Remove this line?')){ row.remove(); updateTotals(); }});
    recalc();
    return row;
  }

  function addRow(d){ if(!lineItemsWrap) return; lineItemsWrap.appendChild(newItem(d)); }
  if(addItemBtn) addItemBtn.addEventListener('click', ()=> addRow());
  if(clearItemsBtn) clearItemsBtn.addEventListener('click', ()=>{ if(confirm('Clear all items?')){ lineItemsWrap.innerHTML=''; updateTotals(); }});

  function updateTotals(){
    let subtotal = 0, tax = 0;
    $$('.item-row').forEach(row=>{
      const q = parseNum($('.item-qty',row)?.value), p = parseNum($('.item-price',row)?.value);
      const rT = $('.item-tax',row)?.value; const t = rT === '' ? parseNum(taxRate?.value||0) : parseNum(rT);
      const base = q*p; subtotal += base; tax += base * (Math.min(100, Math.max(0, t))/100);
    });
    subtotalEl && (subtotalEl.textContent = fmtMoney(subtotal));
    taxEl && (taxEl.textContent = fmtMoney(tax));
    totalEl && (totalEl.textContent = fmtMoney(subtotal + tax));
  }

  // initial item if none
  if(lineItemsWrap && lineItemsWrap.children.length === 0) addRow({qty:1, price:0});

  // serialize/hydrate
  function serialize(){
    const rows = $$('.item-row').map(r=>({
      desc: $('.item-desc', r)?.value||'',
      qty: parseNum($('.item-qty', r)?.value),
      price: parseNum($('.item-price', r)?.value),
      tax: $('.item-tax', r)?.value
    }));
    return {
      your: { name: yourName?.value || '', email: yourEmail?.value || '' },
      client: { name: clientName?.value || '' },
      doc: { currency: currency?.value || '', taxRate: taxRate?.value || '' },
      rows, notes: notesEl?.value || '', terms: termsEl?.value || ''
    };
  }

  function hydrate(data){
    try{
      yourName && (yourName.value = data.your?.name || '');
      yourEmail && (yourEmail.value = data.your?.email || '');
      clientName && (clientName.value = data.client?.name || '');
      currency && (currency.value = data.doc?.currency || currency.value);
      taxRate && (taxRate.value = data.doc?.taxRate || taxRate.value);
      lineItemsWrap && (lineItemsWrap.innerHTML = '');
      (data.rows||[]).forEach(r => addRow(r));
      notesEl && (notesEl.value = data.notes || '');
      termsEl && (termsEl.value = data.terms || '');
      updateTotals();
      $$('input,textarea,select').forEach(el=> el.removeAttribute('aria-invalid'));
      alert(I.t('savedJson') || 'Loaded');
    }catch(e){ alert('Invalid JSON file'); }
  }

  // Save/Load JSON (client-side)
  if(saveJsonBtn) saveJsonBtn.addEventListener('click', ()=>{
    const data = serialize(); const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' }); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `freelancekit-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  });
  if(loadJsonBtn) loadJsonBtn.addEventListener('click', ()=>{
    const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange = async ()=>{ const f = inp.files?.[0]; if(!f) return; const tx = await f.text(); hydrate(JSON.parse(tx)); };
    inp.click();
  });

  // Validate on demand only (preview/print)
  function validateOnDemand(){
    let ok = true;
    if(!yourName?.checkValidity()) { setInvalid(yourName, true); ok = false; }
    if(!yourEmail?.checkValidity()) { setInvalid(yourEmail, true); ok = false; }
    if(!clientName?.checkValidity()) { setInvalid(clientName, true); ok = false; }
    if((lineItemsWrap?.children.length || 0) === 0){ alert(I.t('pleaseAddItem')); ok = false; }
    return ok;
  }

  // Build printable HTML (inline CSS + svg logo) — fallback friendly
  const LOGO_SVG = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#1e40af"/></linearGradient></defs><rect x="4" y="4" width="56" height="56" rx="12" fill="url(#g)"/><g fill="#fff"><rect x="14" y="20" width="28" height="8" rx="4"/><rect x="14" y="34" width="20" height="8" rx="4"/><circle cx="46" cy="38" r="6"/></g></svg>');
  function buildPrintHTML(autoPrint=false){
    const data = serialize();
    const rowsHtml = $$('.item-row').map(r=>{
      return `<tr><td>${$('.item-desc',r)?.value||''}</td><td style="text-align:right">${$('.item-qty',r)?.value||''}</td><td style="text-align:right">${$('.item-price',r)?.value||''}</td><td style="text-align:right">${$('.item-tax',r)?.value||''}</td><td style="text-align:right">${$('.item-amount',r)?.textContent||''}</td></tr>`;
    }).join('');
    const script = autoPrint ? `<script>window.onload = ()=> setTimeout(()=> window.print(),300);</script>` : '';
    return `<!doctype html><html lang="${I.getLang()}"><head><meta charset="utf-8"><title>${I.t('invoice')} ${Date.now()}</title><link rel="icon" href="data:image/svg+xml;utf8,${LOGO_SVG}"><style>
      body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:20px;color:#111}
      header{display:flex;justify-content:space-between;align-items:center}
      header img{width:36px;height:36px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #ddd;padding:8px}
      th{background:#f3f4f6;text-align:left}
      .r{text-align:right}
      footer{margin-top:24px;color:#666;font-size:13px}
    </style></head><body>
      <header><div><img src="data:image/svg+xml;utf8,${LOGO_SVG}" alt=""><h2 style="display:inline-block;margin-left:8px">${I.t('invoice')}</h2></div><div>${data.doc?.currency || ''}</div></header>
      <section style="margin-top:12px"><div><strong>${I.t('from')}</strong><div>${data.your?.name||''}</div><div>${data.your?.email||''}</div></div><div style="margin-top:8px"><strong>${I.t('billTo')}</strong><div>${data.client?.name||''}</div></div></section>
      <table><thead><tr><th>${I.t('description')}</th><th class="r">${I.t('qty')}</th><th class="r">${I.t('unit')}</th><th class="r">${I.t('taxPct')}</th><th class="r">${I.t('amount')}</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr><td colspan="4" class="r">${I.t('subtotal')}</td><td class="r">${subtotalEl?.textContent||''}</td></tr><tr><td colspan="4" class="r">${I.t('tax')}</td><td class="r">${taxEl?.textContent||''}</td></tr><tr><td colspan="4" class="r">${I.t('total')}</td><td class="r">${totalEl?.textContent||''}</td></tr></tfoot></table>
      <footer><div><strong>${I.t('notes')}</strong><div>${data.notes||''}</div></div><div style="margin-top:8px">Made with FreelanceKit — Contact: <a href="mailto:${I.t('contactEmail')}">${I.t('contactEmail')}</a></div></footer>
      ${script}</body></html>`;
  }

  function openPreview(autoPrint=false){
    if(!validateOnDemand()) return;
    const html = buildPrintHTML(autoPrint);
    const blob = new Blob([html], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if(!w){ alert('Popup blocked — allow popups for export'); URL.revokeObjectURL(url); return; }
    setTimeout(()=> URL.revokeObjectURL(url), 20*1000);
  }

  if(previewBtn) previewBtn.addEventListener('click', ()=> openPreview(false));
  if(exportBtn) exportBtn.addEventListener('click', ()=> openPreview(true));

  // Pro modal (mock flow)
  const proOpen = byId('openPro'), proDialog = byId('proDlg'), proClose = byId('proClose'), proBuy = byId('proBuy');
  if(proOpen) proOpen.addEventListener('click', ()=> { if(proDialog) { proDialog.style.display='flex'; document.body.style.overflow='hidden'; }});
  if(proClose) proClose.addEventListener('click', ()=> { if(proDialog){ proDialog.style.display='none'; document.body.style.overflow=''; }});
  if(proBuy) proBuy.addEventListener('click', ()=> {
    // mock checkout — replace with Stripe/PayPal/your payment gateway
    alert('This is a demo checkout placeholder. Integrate Stripe/PayPal here.');
    // real flow: call backend to create checkout session then redirect to checkout url
  });

  // keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if(mod && e.key.toLowerCase() === 'p'){ e.preventDefault(); previewBtn && previewBtn.click(); }
    if(mod && e.key.toLowerCase() === 's'){ e.preventDefault(); saveJsonBtn && saveJsonBtn.click(); }
  });

  // update totals when items change (also when currency/tax change)
  updateTotals();
  taxRate && taxRate.addEventListener('input', updateTotals);
  currency && currency.addEventListener('change', updateTotals);

  // expose some debug
  window.FK = { serialize, hydrate, updateTotals, addRow };
})();
