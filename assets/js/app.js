// assets/js/app.js — 更新版（含 print/export 确保有效）
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

  /* I18N */
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

  /* PWA install */
  (function(){
    let deferredPrompt = null;
    const installBtn = byId('installPWA');
    const pwaState = byId('pwa-state');
    if(pwaState) pwaState.textContent = I.t('pwaReady');

    window.addEventListener('beforeinstallprompt', (e)=>{
      e.preventDefault();
      deferredPrompt = e;
      if(installBtn) installBtn.style.display = 'inline-flex';
    });

    if(installBtn){
      installBtn.addEventListener('click', async ()=>{
        if(!deferredPrompt){
          alert('Install not available');
          return;
        }
        try {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          deferredPrompt = null;
          installBtn.style.display = 'none';
        } catch(e){
          console.warn('PWA install error', e);
        }
      });
    }

    if(navigator.standalone || window.matchMedia('(display-mode: standalone)').matches){
      if(installBtn) installBtn.style.display = 'none';
    }
  })();

  /* Elements */
  const sellerName = byId('sellerName'), sellerEmail = byId('sellerEmail'),
        sellerAddress = byId('sellerAddress'), sellerPhone = byId('sellerPhone');
  const clientName = byId('clientName'), clientEmail = byId('clientEmail'),
        clientAddress = byId('clientAddress'), clientPhone = byId('clientPhone');
  const invoiceNumber = byId('invoiceNumber'), invoiceDate = byId('invoiceDate'), dueDate = byId('dueDate');
  const vatNumber = byId('vatNumber'), discountRate = byId('discountRate'), shippingFee = byId('shippingFee');
  const lineItemsWrap = byId('lineItems');
  const addItemBtn = byId('addItem'), clearItemsBtn = byId('clearItems');
  const subtotalEl = byId('subtotal'), taxEl = byId('taxAmount'), totalEl = byId('grandTotal');
  const previewBtn = byId('previewPDF'), exportBtn = byId('exportPDF');
  const saveJsonBtn = byId('saveJson'), loadJsonBtn = byId('loadJson');
  const currency = byId('currency'), taxRate = byId('taxRate');
  const notesEl = byId('notes'), termsEl = byId('terms');
  const paymentMethod = byId('paymentMethod'), paidStatus = byId('paidStatus');

  /* Validation UX */
  function setInvalid(el, bad){
    if(!el) return;
    if(bad) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid');
  }
  $$('input,textarea,select').forEach(el=>{
    el.addEventListener('input', ()=> setInvalid(el, !el.checkValidity()));
    el.addEventListener('focus', ()=> setInvalid(el, false));
  });

  /* Utility */
  function parseNum(v){ const n = Number(String(v||'').replace(/,/g,'')); return isFinite(n)?n:0; }
  function fmtMoney(v){
    const cur = currency?.value || 'MYR';
    try {
      return new Intl.NumberFormat(I.getLang()==='zh'?'zh-CN':undefined,{style:'currency',currency:cur}).format(v||0);
    } catch(e) {
      return (v||0).toFixed(2)+' '+cur;
    }
  }

  /* Row logic */
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
      const base = q*p; const tx = base*(Math.min(100, Math.max(0, t))/100);
      amt.textContent = fmtMoney(base + tx);
      updateTotals();
    }
    [qty, price, itax].forEach(el => el.addEventListener('input', recalc));
    del.addEventListener('click', ()=>{
      if(confirm('Remove this line?')){
        row.remove(); updateTotals();
      }
    });
    recalc();
    return row;
  }
  function addRow(d){ if(!lineItemsWrap) return; lineItemsWrap.appendChild(newRow(d)); }

  if(addItemBtn) addItemBtn.addEventListener('click', ()=> addRow());
  if(clearItemsBtn) clearItemsBtn.addEventListener('click', ()=>{
    if(confirm('Clear all line items?')){
      lineItemsWrap.innerHTML = ''; updateTotals();
    }
  });

  /* Totals */
  function updateTotals(){
    let subtotal = 0, taxTotal = 0;
    $$('.item-row').forEach(row=>{
      const q = parseNum($('.item-qty',row)?.value), p = parseNum($('.item-price',row)?.value);
      const rT = $('.item-tax',row)?.value; const t = rT === '' ? parseNum(taxRate?.value||0) : parseNum(rT);
      const base = q*p; subtotal += base; taxTotal += base*(Math.min(100, Math.max(0, t))/100);
    });
    const discount = parseNum(discountRate?.value)/100 * subtotal;
    const shipping = parseNum(shippingFee?.value);
    const total = subtotal - discount + shipping + taxTotal;
    subtotalEl && (subtotalEl.textContent = fmtMoney(subtotal));
    taxEl && (taxEl.textContent = fmtMoney(taxTotal));
    totalEl && (totalEl.textContent = fmtMoney(total));
  }

  if(lineItemsWrap && lineItemsWrap.children.length===0) addRow({qty:1, price:0});

  /* Serialize/hydrate */
  function serialize(){
    const rows = $$('.item-row').map(r=>({
      desc: $('.item-desc',r)?.value||'',
      qty: parseNum($('.item-qty',r)?.value),
      price: parseNum($('.item-price',r)?.value),
      tax: $('.item-tax',r)?.value
    }));
    return {
      seller:{name:sellerName?.value||'', email:sellerEmail?.value||'', address:sellerAddress?.value||'', phone:sellerPhone?.value||''},
      client:{name:clientName?.value||'', email:clientEmail?.value||'', address:clientAddress?.value||'', phone:clientPhone?.value||''},
      doc:{ number: invoiceNumber?.value||'', date: invoiceDate?.value||'', due: dueDate?.value||'', vatNumber: vatNumber?.value||'', currency: currency?.value||'', taxRate: taxRate?.value||'', discountRate: discountRate?.value||'', shippingFee: shippingFee?.value||'', paymentMethod: paymentMethod?.value||'', paid: paidStatus?.checked||false },
      rows,
      notes: notesEl?.value||'', terms: termsEl?.value||''
    };
  }

  function hydrate(data){
    try{
      sellerName.value = data.seller?.name||'';
      sellerEmail.value = data.seller?.email||'';
      sellerAddress.value = data.seller?.address||'';
      sellerPhone.value = data.seller?.phone||'';
      clientName.value = data.client?.name||'';
      clientEmail.value = data.client?.email||'';
      clientAddress.value = data.client?.address||'';
      clientPhone.value = data.client?.phone||'';
      invoiceNumber.value = data.doc?.number||'';
      invoiceDate.value = data.doc?.date||'';
      dueDate.value = data.doc?.due||'';
      vatNumber.value = data.doc?.vatNumber||'';
      discountRate.value = data.doc?.discountRate||'';
      shippingFee.value = data.doc?.shippingFee||'';
      currency.value = data.doc?.currency||currency.value;
      taxRate.value = data.doc?.taxRate||taxRate.value;
      paymentMethod.value = data.doc?.paymentMethod||'';
      paidStatus.checked = !!data.doc?.paid;
      lineItemsWrap.innerHTML = '';
      (data.rows||[]).forEach(r=> addRow(r));
      notesEl.value = data.notes||'';
      termsEl.value = data.terms||'';
      updateTotals();
      $$('input,textarea,select').forEach(el=> setInvalid(el,false));
      alert(I.t('savedJson') || 'Loaded');
    } catch(e){
      alert('Invalid JSON');
    }
  }

  if(saveJsonBtn) saveJsonBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(serialize(), null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `freelancekit-${Date.now()}.json`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href),5000);
  });

  if(loadJsonBtn) loadJsonBtn.addEventListener('click', ()=>{
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='application/json';
    inp.onchange = async ()=>{
      const f = inp.files?.[0];
      if(!f) return;
      const txt = await f.text();
      hydrate(JSON.parse(txt));
    };
    inp.click();
  });

  /* Validate */
  function validateOnDemand(){
    let ok = true;
    if(!sellerName.checkValidity()){ setInvalid(sellerName,true); ok=false;}
    if(!sellerEmail.checkValidity()){ setInvalid(sellerEmail,true); ok=false;}
    if(!clientName.checkValidity()){ setInvalid(clientName,true); ok=false;}
    if(!invoiceNumber.checkValidity()){ setInvalid(invoiceNumber,true); ok=false;}
    if(!invoiceDate.checkValidity()){ setInvalid(invoiceDate,true); ok=false;}
    if(!dueDate.checkValidity()){ setInvalid(dueDate,true); ok=false;}
    if((lineItemsWrap.children.length || 0) === 0){ alert(I.t('pleaseAddItem')); ok=false; }
    return ok;
  }

  /* Build print preview HTML and trigger print/export */
  function buildPrintHTML(autoPrint=false){
    const d = serialize();
    const rowsHtml = $$('.item-row').map(r=>{
      return `<tr><td>${$('.item-desc',r)?.value||''}</td><td>${$('.item-qty',r)?.value||''}</td><td>${$('.item-price',r)?.value||''}</td><td>${$('.item-tax',r)?.value||''}</td><td>${$('.item-amount',r)?.textContent||''}</td></tr>`;
    }).join('');
    const script = autoPrint ? `<script>window.print();</script>` : '';
    return `<!doctype html><html lang="${I.getLang()}"><head><meta charset="utf-8"><title>${I.t('invoice')} ${d.doc.number}</title><link rel="icon" href="data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#1e40af"/></linearGradient></defs><rect x="4" y="4" width="56" height="56" rx="12" fill="url(#g)"/><g fill="#fff"><rect x="14" y="20" width="28" height="8" rx="4"/><rect x="14" y="34" width="20" height="8" rx="4"/><circle cx="46" cy="38" r="6"/></g></svg>`)}"><style>body{font-family:system-ui,Arial;margin:20px;color:#111} header{display:flex;justify-content:space-between;align-items:center} header img{width:36px;height:36px} table{width:100%;border-collapse:collapse;margin-top:12px} th,td{border:1px solid #ddd;padding:8px} th{background:#f3f4f6;text-align:left} .r{text-align:right} .section{margin-top:12px} footer{margin-top:24px;color:#666;font-size:13px}</style></head><body><header><div><img src="data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#1e40af"/></linearGradient></defs><rect x="4" y="4" width="56" height="56" rx="12" fill="url(#g)"/><g fill="#fff"><rect x="14" y="20" width="28" height="8" rx="4"/><rect x="14" y="34" width="20" height="8" rx="4"/><circle cx="46" cy="38" r="6"/></g></svg>`)}" alt=""><h2 style="display:inline-block;margin-left:8px">${I.t('invoice')}</h2></div><div>${d.doc.date}</div></header><section class="section"><div><strong>${I.t('from')}</strong><div>${d.seller.name}</div><div>${d.seller.address}</div><div>${d.seller.email}</div><div>${d.seller.phone}</div></div><div style="margin-top:8px"><strong>${I.t('billTo')}</strong><div>${d.client.name}</div><div>${d.client.address}</div><div>${d.client.email}</div><div>${d.client.phone}</div></div></section><section class="section"><div><strong>${I.t('invoiceNumber')}</strong> ${d.doc.number}</div><div><strong>${I.t('dueDate')}</strong> ${d.doc.due}</div><div><strong>${I.t('vatNumber')}</strong> ${d.doc.vatNumber}</div></section><table><thead><tr><th>${I.t('description')}</th><th>${I.t('qty')}</th><th>${I.t('unit')}</th><th>${I.t('taxPct')}</th><th class="r">${I.t('amount')}</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr><td colspan="4" class="r">${I.t('subtotal')}</td><td class="r">${subtotalEl?.textContent||''}</td></tr><tr><td colspan="4" class="r">${I.t('tax')}</td><td class="r">${taxEl?.textContent||''}</td></tr><tr><td colspan="4" class="r">${I.t('discount')}</td><td class="r">${fmtMoney(parseNum(d.doc.discountRate)/100 * parseNum(subtotalEl.textContent.replace(/[^\d.-]/g,'')))}</td></tr><tr><td colspan="4" class="r">${I.t('shippingFee')}</td><td class="r">${fmtMoney(parseNum(d.doc.shippingFee))}</td></tr><tr><td colspan="4" class="r">${I.t('total')}</td><td class="r">${totalEl?.textContent||''}</td></tr></tfoot></table><footer><div><strong>${I.t('paymentMethod')}</strong><div>${d.doc.paymentMethod}</div></div><div style="margin-top:8px">${d.doc.paid?'<span style="color:green;"><strong>PAID</strong></span>':'<span style="color:red;"><strong>UNPAID</strong></span>'}</div><div style="margin-top:12px">Made with FreelanceKit — Contact: <a href="mailto:${I.t('contactEmail')}">${I.t('contactEmail')}</a></div></footer>${script}</body></html>`;
  }

  function openHtml(html){
    const blob = new Blob([html], { type:'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if(!w){
      alert('Popup blocked — please allow popups.');
      URL.revokeObjectURL(url);
      return;
    }
    w.focus();
    // if export, auto print is inside html by script
    setTimeout(()=> { URL.revokeObjectURL(url); }, 20000);
  }

  if(previewBtn) previewBtn.addEventListener('click', ()=>{
    if(!validateOnDemand()) return;
    openHtml(buildPrintHTML(false));
  });
  if(exportBtn) exportBtn.addEventListener('click', ()=>{
    if(!validateOnDemand()) return;
    openHtml(buildPrintHTML(true));
  });

  // keyboard shortcuts
  window.addEventListener('keydown', e=>{
    const mod = e.ctrlKey || e.metaKey;
    if(mod && e.key.toLowerCase()==='p'){
      e.preventDefault();
      previewBtn && previewBtn.click();
    }
    if(mod && e.key.toLowerCase()==='s'){
      e.preventDefault();
      saveJsonBtn && saveJsonBtn.click();
    }
  });

  /* Initial update */
  updateTotals();
  taxRate && taxRate.addEventListener('input', updateTotals);
  currency && currency.addEventListener('change', updateTotals);

})();
