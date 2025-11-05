/* FreelanceKit minimal app bindings — keeps keys stable with localStorage */
window.FK = (function () {
  const LS_KEY = 'fk_invoice_v2';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmt = (n, { currency = 'USD', locale = 'en-US' } = {}) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n ?? 0);
    } catch {
      return (n ?? 0).toFixed(2);
    }
  };

  const readForm = () => ({
    biz_name: $('#biz_name')?.value || '',
    biz_addr: $('#biz_addr')?.value || '',
    inv_no: $('#inv_no')?.value || '',
    inv_date: $('#inv_date')?.value || new Date().toISOString().slice(0, 10),
    client_name: $('#client_name')?.value || '',
    client_addr: $('#client_addr')?.value || '',
    currency: $('#currency')?.value || 'USD',
    locale: $('#locale')?.value || 'en-US',
    items: $$('#items tbody tr').map(tr => ({
      desc: $('.desc', tr)?.value || '',
      qty: parseFloat($('.qty', tr)?.value || '0') || 0,
      unit: $('.unit', tr)?.value || '',
      price: parseFloat($('.price', tr)?.value || '0') || 0
    })),
    tax_rate: parseFloat($('#tax_rate')?.value || '0') || 0,
    disc_rate: parseFloat($('#disc_rate')?.value || '0') || 0,
    notes: $('#notes')?.value || ''
  });

  const writeForm = (d = {}) => {
    $('#biz_name') && ($('#biz_name').value = d.biz_name || '');
    $('#biz_addr') && ($('#biz_addr').value = d.biz_addr || '');
    $('#inv_no') && ($('#inv_no').value = d.inv_no || '');
    $('#inv_date') && ($('#inv_date').value = d.inv_date || new Date().toISOString().slice(0, 10));
    $('#client_name') && ($('#client_name').value = d.client_name || '');
    $('#client_addr') && ($('#client_addr').value = d.client_addr || '');
    $('#currency') && ($('#currency').value = d.currency || 'USD');
    $('#locale') && ($('#locale').value = d.locale || 'en-US');
    $('#tax_rate') && ($('#tax_rate').value = d.tax_rate ?? 0);
    $('#disc_rate') && ($('#disc_rate').value = d.disc_rate ?? 0);
    $('#notes') && ($('#notes').value = d.notes || '');

    const tbody = $('#items tbody');
    if (tbody) {
      tbody.innerHTML = '';
      (d.items && d.items.length ? d.items : [{ desc: '', qty: 1, unit: 'hr', price: 0 }]).forEach(addItemRow);
    }
    calc();
  };

  const save = () => {
    const data = readForm();
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    toast('Saved locally');
  };

  const load = () => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return toast('Nothing to load');
    try {
      const data = JSON.parse(raw);
      writeForm(data);
      toast('Loaded');
    } catch {
      toast('Invalid data');
    }
  };

  const addItemRow = (item = {}) => {
    const tbody = $('#items tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="desc" placeholder="Description" value="${(item.desc ?? '').replace(/"/g, '&quot;')}"></td>
      <td><input class="qty" type="number" step="0.01" value="${item.qty ?? 1}"></td>
      <td><input class="unit" placeholder="unit" value="${(item.unit ?? 'hr').replace(/"/g, '&quot;')}"></td>
      <td><input class="price" type="number" step="0.01" value="${item.price ?? 0}"></td>
      <td><button class="btn ghost rm">×</button></td>
    `.trim();
    tbody.appendChild(tr);
    tr.addEventListener('input', calc);
    $('.rm', tr).addEventListener('click', () => { tr.remove(); calc(); });
  };

  const calc = () => {
    const d = readForm();
    const sub = d.items.reduce((s, it) => s + (it.qty * it.price), 0);
    const discount = sub * (d.disc_rate / 100);
    const taxedBase = Math.max(sub - discount, 0);
    const tax = taxedBase * (d.tax_rate / 100);
    const total = taxedBase + tax;

    $('#v-subtotal') && ($('#v-subtotal').textContent = fmt(sub, d));
    $('#v-discount') && ($('#v-discount').textContent = fmt(-discount, d));
    $('#v-tax') && ($('#v-tax').textContent = fmt(tax, d));
    $('#v-total') && ($('#v-total').textContent = fmt(total, d));
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(readForm(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = `${$('#inv_no')?.value || 'invoice'}.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const importJSON = async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    writeForm(data);
  };

  const printPDF = () => {
    window.print();
  };

  const newDoc = () => {
    writeForm({
      inv_date: new Date().toISOString().slice(0, 10),
      items: [{ desc: '', qty: 1, unit: 'hr', price: 0 }],
      tax_rate: 0, disc_rate: 0
    });
  };

  const toast = (msg = '') => {
    let el = $('#__toast');
    if (!el) {
      el = document.createElement('div'); el.id = '__toast';
      Object.assign(el.style, {
        position: 'fixed', right: '16px', bottom: '16px', background: 'rgba(15,23,42,.9)',
        color: '#e5e7eb', padding: '10px 12px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,.12)', zIndex: 9999, font: '14px/1.2 Inter,system-ui'
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el.__t);
    el.__t = setTimeout(() => el.style.opacity = '0', 1600);
  };

  function initInvoice() {
    // Events
    $('#add-item')?.addEventListener('click', () => { addItemRow(); calc(); });
    $('#currency')?.addEventListener('change', calc);
    $('#locale')?.addEventListener('change', calc);
    $('#tax_rate')?.addEventListener('input', calc);
    $('#disc_rate')?.addEventListener('input', calc);
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

    // Seed date + load existing
    const saved = localStorage.getItem(LS_KEY);
    if (saved) writeForm(JSON.parse(saved)); else writeForm();
  }

  function initAppShell(){ /* reserved for future navigation/state */ }

  // Register SW (idempotent)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }

  return { initInvoice, initAppShell };
})();