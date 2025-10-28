/* FreelanceKit app — P0 UX upgrade (Cloudflare Pages ready) */
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
  const buyPro = byId('buyPro');

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
  if (buyPro) buyPro.title = 'Unlock Pro templates & features';

  // --- Form elements ---
  const yourName = byId('yourName');
  const yourEmail = byId('yourEmail');
  const clientName = byId('clientName');
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
      your: { name: yourName?.value, email: yourEmail?.value, address: byId('yourAddress')?.value || '', phone: byId('yourPhone')?.value || '' },
      client: { name: clientName?.value, email: byId('clientEmail')?.value || '', address: byId('clientAddress')?.value || '', ref: byId('clientRef')?.value || '' },
      doc: {
        type: docType?.value, no: docNo?.value, date: docDate?.value,
        currency: currency?.value, taxRate: taxRate?.value
      },
      rows,
      notes: byId('notes')?.value || '',
      terms: byId('terms')?.value || ''
    };
  };

  const hydrate = (data) => {
    try {
      yourName && (yourName.value = data.your?.name || '');
      yourEmail && (yourEmail.value = data.your?.email || '');
      byId('yourAddress') && (byId('yourAddress').value = data.your?.address || '');
      byId('yourPhone') && (byId('yourPhone').value = data.your?.phone || '');

      clientName && (clientName.value = data.client?.name || '');
      byId('clientEmail') && (byId('clientEmail').value = data.client?.email || '');
      byId('clientAddress') && (byId('clientAddress').value = data.client?.address || '');
      byId('clientRef') && (byId('clientRef').value = data.client?.ref || '');

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
    } catch (e) {
      console.error(e); toast('Invalid JSON structure');
    }
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
      const file = inp.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
        hydrate(data);
      } catch {
        toast('Invalid JSON file');
      }
    };
    inp.click();
  });

  if (importCSVBtn) {
    importCSVBtn.addEventListener('click', () => {
      toast('Clients CSV import is a Pro feature');
    });
  }

  // --- Preview & Export (native print) ---
  const openPrintWindow = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) { toast('Popup blocked'); return; }
    const rowsHtml = $$('.item-row').map(row => {
      const d = $('.item-desc', row)?.value || '';
      const q = $('.item-qty', row)?.value || '';
      const p = $('.item-price', row)?.value || '';
      const t = $('.item-tax', row)?.value || '';
      const amt = $('.item-amount', row)?.textContent || '';
      return `<tr><td>${d}</td><td>${q}</td><td>${p}</td><td>${t}</td><td>${amt}</td></tr>`;
    }).join('');
    const html = `
<!doctype html><html><head><meta charset="utf-8">
<title>Print — ${docType?.value || ''} ${docNo?.value || ''}</title>
<style>
  body{font:14px/1.5 system-ui; padding:24px; color:#111}
  h1{font-size:20px;margin:0 0 8px}
  table{width:100%; border-collapse:collapse}
  th,td{border:1px solid #ddd; padding:6px}
  tfoot td{font-weight:bold}
</style>
</head><body>
  <h1>${(docType?.value || 'Document').toUpperCase()} ${docNo?.value || ''}</h1>
  <p><strong>Date:</strong> ${docDate?.value || ''} • <strong>Currency:</strong> ${currency?.value || 'MYR'}</p>
  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Tax%</th><th>Amount</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr><td colspan="4">Subtotal</td><td>${subtotalEl?.textContent || ''}</td></tr>
      <tr><td colspan="4">Tax</td><td>${taxAmountEl?.textContent || ''}</td></tr>
      <tr><td colspan="4">Total</td><td>${grandTotalEl?.textContent || ''}</td></tr>
    </tfoot>
  </table>
  <script>window.addEventListener('load', ()=>window.print(), {once:true})</script>
</body></html>`;
    w.document.write(html);
    w.document.close();
  };

  if (previewBtn) previewBtn.addEventListener('click', () => {
    if (!validateCore()) { toast('Fix highlighted fields'); return; }
    openPrintWindow();
  });
  if (exportBtn) exportBtn.addEventListener('click', () => {
    if (!validateCore()) { toast('Fix highlighted fields'); return; }
    openPrintWindow();
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
