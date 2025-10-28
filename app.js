/* FreelanceKit app — refine preview/export + footer + Pro dialog */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  // --- Toasts ---
  const toasts = byId('toasts');
  const toast = (msg) => {
    if (!toasts) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  };

  // --- App/network status & PWA install ---
  const netState = byId('net-state');
  const pwaState = byId('pwa-state');
  const installBtn = byId('installPWA');
  const buyProBtn = byId('buyPro');

  const setNetState = () => {
    if (netState) netState.textContent = navigator.onLine ? 'Online' : 'Offline';
  };
  setNetState();
  window.addEventListener('online',  () => { setNetState(); toast('You are back online'); });
  window.addEventListener('offline', () => { setNetState(); toast('You are offline'); });

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaState) pwaState.textContent = 'Installable';
    if (installBtn) installBtn.style.display = 'inline-flex';
  });
  if (installBtn) {
    installBtn.style.display = 'none';
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) { toast('Already installed or not installable'); return; }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      toast('Install prompt shown');
    });
  }

  // Pro dialog
  const proDlg = byId('proDlg');
  const proClose = byId('proClose');
  if (buyProBtn) buyProBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (proDlg) proDlg.style.display = 'flex';
  });
  if (proClose) proClose.addEventListener('click', () => { if (proDlg) proDlg.style.display = 'none'; });

  // --- Form elements ---
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

  // --- Currency formatting ---
  const fmt = (val) => {
    const cur = currency?.value || 'MYR';
    try {
      return new Intl.NumberFormat(undefined, { style:'currency', currency: cur }).format(val || 0);
    } catch {
      return (val || 0).toFixed(2) + ' ' + cur;
    }
  };

  // --- State & change guard ---
  let dirty = false;
  const markDirty = () => { dirty = true; };
  $$('input,textarea,select').forEach(el => el.addEventListener('input', markDirty));
  window.addEventListener('beforeunload', (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  // --- Validation helpers ---
  const setInvalid = (el, bad) => { if (el) el.setAttribute('aria-invalid', bad ? 'true' : 'false'); };
  const parseNum = (v) => {
    if (typeof v === 'number') return v;
    const n = String(v || '').replace(/,/g,'').trim();
    const x = Number(n);
    return isFinite(x) ? x : 0;
  };

  const moneyMask = (el) => {
    if (!el) return;
    el.addEventListener('blur', () => {
      const n = Math.max(0, parseNum(el.value));
      el.value = n.toFixed(2);
    });
  };
  const percentMask = (el) => {
    if (!el) return;
    el.addEventListener('blur', () => {
      let n = parseNum(el.value);
      if (n < 0) n = 0; if (n > 100) n = 100;
      el.value = n.toFixed(2).replace(/\.00$/,'');
    });
  };

  // --- Line items ---
  const newRow = (data = {}) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <input class="item-desc" placeholder="Design service — homepage" value="${data.desc || ''}">
      <input class="item-qty"  inputmode="decimal" placeholder="1" value="${data.qty ?? ''}">
      <input class="item-price" inputmode="decimal" placeholder="0.00" value="${data.price ?? ''}">
      <input class="item-tax" inputmode="decimal" placeholder="${taxRate?.value || 0}">
      <div class="item-amount" aria-label="row amount">—</div>
      <button class="item-del" title="Remove">✕</button>
    `;
    const [desc, qty, price, rowTax, amount, del] =
      [ '.item-desc','.item-qty','.item-price','.item-tax','.item-amount','.item-del' ].map(s => row.querySelector(s));

    const recalc = () => {
      const q = Math.max(0, parseNum(qty.value || 0));
      const p = Math.max(0, parseNum(price.value || 0));
      const t = rowTax.value === '' ? parseNum(taxRate?.value || 0) : Math.min(100, Math.max(0, parseNum(rowTax.value)));
      const base = q * p;
      const tx = base * (t/100);
      amount.textContent = fmt(base + tx);
      updateTotals();
    };

    [qty, price].forEach(moneyMask);
    [rowTax].forEach(percentMask);
    [desc, qty, price, rowTax].forEach(el => el.addEventListener('input', () => { markDirty(); recalc(); }));
    del.addEventListener('click', () => {
      if (!confirm('Remove this line?')) return;
      row.remove(); updateTotals(); markDirty();
    });

    recalc();
    return row;
  };

  const addRow = (data) => {
    if (!lineItemsWrap) return;
    lineItemsWrap.appendChild(newRow(data));
    markDirty();
  };

  const clearRows = () => {
    if (!lineItemsWrap) return;
    if (lineItemsWrap.children.length === 0) return;
    if (!confirm('Clear all line items?')) return;
    lineItemsWrap.innerHTML = '';
    updateTotals(); markDirty();
  };

  if (addItemBtn) addItemBtn.addEventListener('click', () => addRow());
  if (clearItemsBtn) clearItemsBtn.addEventListener('click', clearRows);

  // --- Totals ---
  const updateTotals = () => {
    if (!lineItemsWrap) return;
    let subtotal = 0, tax = 0, globalT = parseNum(taxRate?.value || 0);
    $$('.item-row').forEach(row => {
      const qty = parseNum($('.item-qty', row)?.value || 0);
      const price = parseNum($('.item-price', row)?.value || 0);
      const rowT = $('.item-tax', row)?.value;
      const t = rowT === '' ? globalT : parseNum(rowT);
      const base = qty * price;
      subtotal += base;
      tax += base * (Math.min(100, Math.max(0, t))/100);
    });
    if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
    if (taxAmountEl) taxAmountEl.textContent = fmt(tax);
    if (grandTotalEl) grandTotalEl.textContent = fmt(subtotal + tax);
  };

  if (taxRate) {
    percentMask(taxRate);
    taxRate.addEventListener('input', () => { markDirty(); updateTotals(); });
  }
  if (currency) currency.addEventListener('change', updateTotals);

  // --- Basic required validation before export/preview ---
  const validateCore = () => {
    let ok = true;
    [yourName, yourEmail, clientName, docType, docNo, docDate, currency].forEach(el => {
      if (!el) return;
      const valid = el.checkValidity();
      setInvalid(el, !valid);
      ok = ok && valid;
    });
    if (!lineItemsWrap || lineItemsWrap.children.length === 0) {
      toast('Please add at least one line item'); ok = false;
    }
    return ok;
  };

  // --- JSON Import/Export (precheck) ---
  const serialize = () => {
    const rows = $$('.item-row').map(row => ({
      desc: $('.item-desc', row)?.value || '',
      qty: parseNum($('.item-qty', row)?.value || 0),
      price: parseNum($('.item-price', row)?.value || 0),
      tax: $('.item-tax', row)?.value
    }));
    return {
      meta: { version: 1 },
      your: { name: yourName?.value, email: yourEmail?.value, address: yourAddress?.value || '', phone: yourPhone?.value || '' },
      client: { name: clientName?.value, email: clientEmail?.value || '', address: clientAddress?.value || '', ref: clientRef?.value || '' },
      doc: { type: docType?.value, no: docNo?.value, date: docDate?.value, currency: currency?.value, taxRate: taxRate?.value },
      rows,
      notes: byId('notes')?.value || '',
      terms: byId('terms')?.value || ''
    };
  };

  const hydrate = (data) => {
    try {
      yourName && (yourName.value = data.your?.name || '');
      yourEmail && (yourEmail.value = data.your?.email || '');
      yourAddress && (yourAddress.value = data.your?.address || '');
      yourPhone && (yourPhone.value = data.your?.phone || '');

      clientName && (clientName.value = data.client?.name || '');
      clientEmail && (clientEmail.value = data.client?.email || '');
      clientAddress && (clientAddress.value = data.client?.address || '');
      clientRef && (clientRef.value = data.client?.ref || '');

      docType && (docType.value = data.doc?.type || 'invoice');
      docNo && (docNo.value = data.doc?.no || '');
      docDate && (docDate.value = data.doc?.date || '');
      currency && (currency.value = data.doc?.currency || 'MYR');
      taxRate && (taxRate.value = data.doc?.taxRate ?? '');

      if (lineItemsWrap) {
        lineItemsWrap.innerHTML = '';
        (data.rows || []).forEach(r => addRow(r));
      }
      byId('notes') && (byId('notes').value = data.notes || '');
      byId('terms') && (byId('terms').value = data.terms || '');
      updateTotals();
      toast('Data loaded');
      dirty = false;
    } catch (e) { console.error(e); toast('Invalid JSON structure'); }
  };

  if (saveJsonBtn) saveJsonBtn.addEventListener('click', () => {
    const data = serialize();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${data.doc?.type || 'document'}-${data.doc?.no || 'draft'}.json`;
    a.click();
    toast('Saved JSON');
    dirty = false;
  });

  if (loadJsonBtn) loadJsonBtn.addEventListener('click', async () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = async () => {
      const file = inp.files?.[0]; if (!file) return;
      const text = await file.text();
      try { const data = JSON.parse(text); hydrate(data); }
      catch { toast('Invalid JSON file'); }
    };
    inp.click();
  });

  if (importCSVBtn) importCSVBtn.addEventListener('click', () => toast('Clients CSV import is a Pro feature'));

  // --- Print preview + export ---
  const buildPrintHTML = (autoPrint=false) => {
    const data = serialize();
    const rowsHtml = $$('.item-row').map(row => {
      const d = $('.item-desc', row)?.value || '';
      const q = $('.item-qty', row)?.value || '';
      const p = $('.item-price', row)?.value || '';
      const t = $('.item-tax', row)?.value || '';
      const amt = $('.item-amount', row)?.textContent || '';
      return `<tr><td>${d}</td><td style="text-align:right">${q}</td><td style="text-align:right">${p}</td><td style="text-align:right">${t}</td><td style="text-align:right">${amt}</td></tr>`;
    }).join('');
    const script = autoPrint ? `<script>window.addEventListener('load',()=>window.print(),{once:true})<\/script>` : '';
    return `
<!doctype html><html><head><meta charset="utf-8">
<title>${(data.doc?.type || 'Document').toUpperCase()} ${data.doc?.no || ''}</title>
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
  .totals td{font-weight:bold}
</style>
</head><body>
  <h1>${(data.doc?.type || 'Document').toUpperCase()} ${data.doc?.no || ''}</h1>
  <div class="grid">
    <div>
      <div class="muted">From</div>
      <div>${data.your?.name || ''}</div>
      <div>${data.your?.email || ''}</div>
      <div>${data.your?.address || ''}</div>
      <div>${data.your?.phone || ''}</div>
    </div>
    <div>
      <div class="muted">Bill To</div>
      <div>${data.client?.name || ''}</div>
      <div>${data.client?.email || ''}</div>
      <div>${data.client?.address || ''}</div>
      <div>Ref: ${data.client?.ref || '-'}</div>
      <div>Date: ${data.doc?.date || ''} • Currency: ${data.doc?.currency || ''}</div>
    </div>
  </div>

  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Tax%</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr><td colspan="4" style="text-align:right">Subtotal</td><td style="text-align:right">${byId('subtotal')?.textContent || ''}</td></tr>
      <tr><td colspan="4" style="text-align:right">Tax</td><td style="text-align:right">${byId('taxAmount')?.textContent || ''}</td></tr>
      <tr><td colspan="4" style="text-align:right">Total</td><td style="text-align:right">${byId('grandTotal')?.textContent || ''}</td></tr>
    </tfoot>
  </table>

  <p><strong>Notes</strong><br>${data.notes || '-'}</p>
  <p><strong>Terms</strong><br>${data.terms || '-'}</p>
  ${script}
</body></html>`;
  };

  const openPreview = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) { toast('Popup blocked'); return; }
    w.document.write(buildPrintHTML(false));
    w.document.close();
  };
  const openExport = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) { toast('Popup blocked'); return; }
    w.document.write(buildPrintHTML(true));
    w.document.close();
  };

  if (previewBtn) previewBtn.addEventListener('click', () => {
    if (!validateCore()) { toast('Fix highlighted fields'); return; }
    openPreview();
  });
  if (exportBtn) exportBtn.addEventListener('click', () => {
    if (!validateCore()) { toast('Fix highlighted fields'); return; }
    openExport();
    toast('Use system dialog to save as PDF');
  });

  // --- Keyboard shortcuts ---
  window.addEventListener('keydown', (e) => {
    const mod = (e.ctrlKey || e.metaKey);
    if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); previewBtn?.click(); }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveJsonBtn?.click(); }
  });

  // --- Bootstrap defaults ---
  if (lineItemsWrap && lineItemsWrap.children.length === 0) addRow({ qty:1, price:0 });
  updateTotals();
})();
