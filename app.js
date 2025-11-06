/* FreelanceKit app with HCI enhancements: accessibility, shortcuts, autosave, validation, undo */
window.FK = (function () {
  const LS_KEY = 'fk_invoice_v3';
  let dirty = false;
  let undoBuffer = null;
  let autosaveTimer = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmt = (n, { currency = 'USD', locale = 'en-US' } = {}) => {
    const value = Number.isFinite(n) ? n : 0;
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
    } catch {
      return value.toFixed(2);
    }
  };

  const state = () => ({
    biz_name: $('#biz_name')?.value || '',
    biz_addr: $('#biz_addr')?.value || '',
    inv_no: $('#inv_no')?.value || '',
    inv_date: $('#inv_date')?.value || new Date().toISOString().slice(0, 10),
    client_name: $('#client_name')?.value || '',
    client_addr: $('#client_addr')?.value || '',
    currency: $('#currency')?.value || guessCurrency(),
    locale: $('#locale')?.value || (navigator.language || 'en-US'),
    items: $$('#items tbody tr').map(tr => ({
      desc: $('.desc', tr)?.value || '',
      qty: Math.max(parseFloat($('.qty', tr)?.value || '0') || 0, 0),
      unit: $('.unit', tr)?.value || '',
      price: Math.max(parseFloat($('.price', tr)?.value || '0') || 0, 0)
    })),
    tax_rate: clamp(parseFloat($('#tax_rate')?.value || '0') || 0, 0, 100),
    disc_rate: clamp(parseFloat($('#disc_rate')?.value || '0') || 0, 0, 100),
    notes: $('#notes')?.value || ''
  });

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const write = (d = {}) => {
    $('#biz_name') && ($('#biz_name').value = d.biz_name || '');
    $('#biz_addr') && ($('#biz_addr').value = d.biz_addr || '');
    $('#inv_no') && ($('#inv_no').value = d.inv_no || '');
    $('#inv_date') && ($('#inv_date').value = d.inv_date || new Date().toISOString().slice(0, 10));
    $('#client_name') && ($('#client_name').value = d.client_name || '');
    $('#client_addr') && ($('#client_addr').value = d.client_addr || '');
    $('#currency') && ($('#currency').value = d.currency || guessCurrency());
    $('#locale') && ($('#locale').value = d.locale || (navigator.language || 'en-US'));
    $('#tax_rate') && ($('#tax_rate').value = d.tax_rate ?? 0);
    $('#disc_rate') && ($('#disc_rate').value = d.disc_rate ?? 0);
    $('#notes') && ($('#notes').value = d.notes || '');

    const tbody = $('#items tbody');
    if (tbody) {
      tbody.innerHTML = '';
      (d.items && d.items.length ? d.items : [{ desc: '', qty: 1, unit: 'hr', price: 0 }]).forEach(addRow);
    }
    calculate();
    markClean();
  };

  const markDirty = () => {
    if (!dirty) { dirty = true; document.title = '● FreelanceKit — Invoice'; }
    // debounce autosave
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      localStorage.setItem(LS_KEY, JSON.stringify(state()));
      toast('Autosaved');
    }, 800);
  };
  const markClean = () => { dirty = false; document.title = 'FreelanceKit — Invoice'; };

  const save = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(state()));
    markClean();
    toast('Saved locally');
  };

  const load = () => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return toast('Nothing to load');
    try { write(JSON.parse(raw)); toast('Loaded'); }
    catch { toast('Invalid data'); }
  };

  const addRow = (item = {}) => {
    const tbody = $('#items tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="desc" placeholder="Description" aria-label="Item description" value="${(item.desc ?? '').replace(/"/g, '&quot;')}"></td>
      <td><input class="qty" type="number" inputmode="decimal" min="0" step="0.01" aria-label="Quantity" value="${item.qty ?? 1}"></td>
      <td><input class="unit" placeholder="unit" aria-label="Unit" value="${(item.unit ?? 'hr').replace(/"/g, '&quot;')}"></td>
      <td><input class="price" type="number" inputmode="decimal" min="0" step="0.01" aria-label="Unit price" value="${item.price ?? 0}"></td>
      <td><button class="btn ghost rm" title="Delete row">Delete</button></td>
    `.trim();
    tbody.appendChild(tr);
    tr.addEventListener('input', () => { validateRow(tr); calculate(); markDirty(); });
    $('.rm', tr).addEventListener('click', () => removeRow(tr));
    validateRow(tr);
  };

  const removeRow = (tr) => {
    // buffer for undo
    const idx = $$('#items tbody tr').indexOf(tr);
    undoBuffer = { index: idx, data: rowData(tr) };
    $('#btn-undo')?.removeAttribute('disabled');
    tr.remove();
    calculate(); markDirty(); toast('Row deleted — Undo available');
  };

  const rowData = (tr) => ({
    desc: $('.desc', tr)?.value || '',
    qty: parseFloat($('.qty', tr)?.value || '0') || 0,
    unit: $('.unit', tr)?.value || '',
    price: parseFloat($('.price', tr)?.value || '0') || 0
  });

  const undo = () => {
    if (!undoBuffer) return;
    const tbody = $('#items tbody');
    const rows = $$('#items tbody tr');
    const insertAt = Math.min(Math.max(undoBuffer.index, 0), rows.length);
    const dummy = document.createElement('tr');
    if (insertAt >= rows.length) tbody.appendChild(dummy);
    else tbody.insertBefore(dummy, rows[insertAt]);
    addRow(undoBuffer.data);
    dummy.remove();
    undoBuffer = null;
    $('#btn-undo')?.setAttribute('disabled', 'true');
    toast('Undo successful');
  };

  const validateRow = (tr) => {
    const qty = $('.qty', tr);
    const price = $('.price', tr);
    [qty, price].forEach(inp => {
      const v = parseFloat(inp.value || '0');
      if (!Number.isFinite(v) || v < 0) inp.classList.add('error'); else inp.classList.remove('error');
    });
  };

  const calculate = () => {
    const d = state();
    const sub = d.items.reduce((s, it) => s + (it.qty * it.price), 0);
    const discount = clamp(sub * (d.disc_rate / 100), 0, sub);
    const taxedBase = Math.max(sub - discount, 0);
    const tax = clamp(taxedBase * (d.tax_rate / 100), 0, Infinity);
    const total = taxedBase + tax;

    $('#v-subtotal') && ($('#v-subtotal').textContent = fmt(sub, d));
    $('#v-discount') && ($('#v-discount').textContent = fmt(-discount, d));
    $('#v-tax') && ($('#v-tax').textContent = fmt(tax, d));
    $('#v-total') && ($('#v-total').textContent = fmt(total, d));
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(state(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = `${$('#inv_no')?.value || 'invoice'}.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const importJSON = async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    write(data); markDirty();
  };

  const printPDF = () => window.print();

  const newDoc = () => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    write({
      inv_date: new Date().toISOString().slice(0, 10),
      items: [{ desc: '', qty: 1, unit: 'hr', price: 0 }],
      tax_rate: 0, disc_rate: 0
    });
  };

  const toast = (msg = '') => {
    let el = $('#__toast');
    if (!el) {
      el = document.createElement('div'); el.id = '__toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      Object.assign(el.style, {
        position: 'fixed', right: '16px', bottom: '16px', background: 'rgba(15,23,42,.9)',
        color: '#e5e7eb', padding: '10px 12px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,.12)', zIndex: 9999, font: '14px/1.2 Inter,system-ui', transition:'opacity .2s ease'
      });
      document.body.appendChild(el);
    }
    el.textContent = msg; el.style.opacity = '1';
    clearTimeout(el.__t); el.__t = setTimeout(() => el.style.opacity = '0', 1600);
  };

  const guessCurrency = () => {
    const lang = (navigator.language || 'en-US').toLowerCase();
    if (lang.includes('my') || lang.includes('ms')) return 'MYR';
    if (lang.includes('sg')) return 'SGD';
    if (lang.includes('cn') || lang.includes('zh')) return 'CNY';
    if (lang.includes('gb')) return 'GBP';
    if (lang.includes('eu')) return 'EUR';
    return 'USD';
  };

  function initInvoice() {
    // Events
    $('#add-item')?.addEventListener('click', () => { addRow(); calculate(); markDirty(); });
    $('#currency')?.addEventListener('change', () => { calculate(); markDirty(); });
    $('#locale')?.addEventListener('change', () => { calculate(); markDirty(); });
    $('#tax_rate')?.addEventListener('input', () => { calculate(); markDirty(); });
    $('#disc_rate')?.addEventListener('input', () => { calculate(); markDirty(); });
    $('#btn-save')?.addEventListener('click', save);
    $('#btn-load')?.addEventListener('click', load);
    $('#btn-export')?.addEventListener('click', exportJSON);
    $('#btn-import')?.addEventListener('click', () => $('#file')?.click());
    $('#file')?.addEventListener('change', (e) => {
      const f = e.target.files?.[0]; if (f) importJSON(f);
      e.target.value = '';
    });
    $('#btn-print')?.addEventListener('click', printPDF);
    $('#btn-new')?.addEventListener('click', newDoc);
    $('#btn-undo')?.addEventListener('click', undo);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      if (ctrl && e.key.toLowerCase() === 'p') { e.preventDefault(); printPDF(); }
      if (ctrl && e.key.toLowerCase() === 'e') { e.preventDefault(); exportJSON(); }
      if (ctrl && e.key.toLowerCase() === 'o') { e.preventDefault(); $('#btn-import')?.click(); }
      if (ctrl && e.key.toLowerCase() === 'n') { e.preventDefault(); newDoc(); }
      if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if (e.key === '?' ) { e.preventDefault(); toggleHelp(); }
      if (ctrl && e.key === 'Enter') { e.preventDefault(); $('#add-item')?.click(); }
      if (e.altKey && e.key === 'Backspace') {
        const last = $$('#items tbody tr').pop();
        if (last) removeRow(last);
      }
    });

    // Unsaved changes guard
    window.addEventListener('beforeunload', (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    });

    // Seed
    const saved = localStorage.getItem(LS_KEY);
    if (saved) write(JSON.parse(saved)); else write();
  }

  function initAppShell(){
    // help dialog toggle for index.html
    const dlg = document.getElementById('help-dialog');
    const closeBtn = document.getElementById('help-close');
    if (dlg && closeBtn) {
      closeBtn.addEventListener('click', toggleHelp);
      document.addEventListener('keydown', (e) => { if (e.key === '?' ) { e.preventDefault(); toggleHelp(); } });
    }
  }

  function toggleHelp(){
    const dlg = document.getElementById('help-dialog');
    if (!dlg) return;
    const hidden = dlg.hasAttribute('hidden');
    if (hidden) dlg.removeAttribute('hidden'); else dlg.setAttribute('hidden', '');
    if (!hidden) $('#help-close')?.focus();
  }

  // Register SW (idempotent)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }

  return { initInvoice, initAppShell };
})();