/* FreelanceKit app — Cloudflare Pages ready
   - Robust Preview/Export via Blob URL (fixes blank new tab)
   - Pro dialog: ESC / 背景点击 / 关闭按钮均可退出；打开时锁滚动
   - Online/Offline + PWA install cues
   - Validation, money/percent masks, totals live calc
   - Keyboard: Ctrl+S save JSON, Ctrl+P preview
   - JSON import/export with precheck
   - Basic i18n (EN/中文) with persistent selector (localStorage: fk_lang)
*/
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  // ---------- Toasts ----------
  const toasts = byId('toasts');
  const toast = (msg) => {
    if (!toasts) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  };

  // ---------- App/Network state & PWA install ----------
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

  // ---------- Pro dialog (可退回，不卡死) ----------
  const proDlg = byId('proDlg');
  const proClose = byId('proClose');
  const openPro = (e) => {
    if (e) e.preventDefault();
    if (!proDlg) return;
    proDlg.style.display = 'flex';
    document.body.dataset.lock = '1';
    document.body.style.overflow = 'hidden';
  };
  const closePro = () => {
    if (!proDlg) return;
    proDlg.style.display = 'none';
    document.body.dataset.lock = '';
    document.body.style.overflow = '';
  };
  if (buyProBtn) buyProBtn.addEventListener('click', openPro);
  if (proClose) proClose.addEventListener('click', closePro);
  if (proDlg) {
    // 背景点击关闭
    proDlg.addEventListener('click', (e) => { if (e.target === proDlg) closePro(); });
    // ESC 关闭
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && proDlg.style.display === 'flex') closePro();
    });
  }

  // ---------- 多语言（基本版 EN/中文） ----------
  const i18n = {
    en: {
      install: 'Install',
      unlockPro: 'Unlock Pro',
      workflow: 'Workflow: Fill → Preview → Export/Save',
      yourDetails: 'Your Details',
      email: 'Email',
      address: 'Address',
      phone: 'Phone',
      clientDetails: 'Client Details',
      clientName: 'Client Name',
      clientEmail: 'Client Email',
      clientAddress: 'Client Address',
      clientRef: 'PO / Reference',
      document: 'Document',
      type: 'Type',
      docNo: 'Document No.',
      date: 'Date',
      currency: 'Currency',
      tax: 'Tax %',
      load: 'Load JSON',
      save: 'Save JSON',
      importPro: 'Import Clients CSV (Pro)',
      lineItems: 'Line Items',
      description: 'Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      amount: 'Amount',
      addItem: 'Add Item',
      clearAll: 'Clear All',
      notesTerms: 'Notes & Terms',
      notes: 'Notes',
      terms: 'Terms',
      subtotal: 'Subtotal',
      totalTax: 'Tax',
      total: 'Total',
      preview: 'Preview (Ctrl+P)',
      export: 'Export PDF',
      online: 'Online',
      offline: 'Offline',
      plsAddItem: 'Please add at least one line item',
      fixFields: 'Fix highlighted fields',
      saved: 'Saved JSON',
      useDialog: 'Use system dialog to save as PDF',
      from: 'From',
      billTo: 'Bill To',
      unit: 'Unit'
    },
    zh: {
      install: '安装',
      unlockPro: '解锁 Pro',
      workflow: '流程：填写 → 预览 → 导出/保存',
      yourDetails: '你的信息',
      email: '邮箱',
      address: '地址',
      phone: '电话',
      clientDetails: '客户信息',
      clientName: '客户名称',
      clientEmail: '客户邮箱',
      clientAddress: '客户地址',
      clientRef: '采购单号 / 参考',
      document: '单据',
      type: '类型',
      docNo: '单据编号',
      date: '日期',
      currency: '币种',
      tax: '税率 %',
      load: '导入 JSON',
      save: '保存 JSON',
      importPro: '导入客户 CSV（Pro）',
      lineItems: '项目明细',
      description: '项目描述',
      qty: '数量',
      unitPrice: '单价',
      amount: '金额',
      addItem: '新增行',
      clearAll: '清空',
      notesTerms: '备注与条款',
      notes: '备注',
      terms: '条款',
      subtotal: '小计',
      totalTax: '税额',
      total: '合计',
      preview: '预览（Ctrl+P）',
      export: '导出 PDF',
      online: '在线',
      offline: '离线',
      plsAddItem: '请至少添加一行项目',
      fixFields: '请修正高亮字段',
      saved: '已保存 JSON',
      useDialog: '在系统对话框中保存为 PDF',
      from: '发件方',
      billTo: '收件方',
      unit: '单价'
    }
  };
  const getLang = () => localStorage.getItem('fk_lang') || 'en';
  const setLang = (lng) => localStorage.setItem('fk_lang', lng);

  // 注入语言切换器（若不存在）
  const ensureLangSwitcher = () => {
    const headerActions = $('.header-actions');
    if (!headerActions) return;
    if (byId('langSwitcher')) return;
    const sel = document.createElement('select');
    sel.id = 'langSwitcher';
    sel.className = 'btn ghost';
    sel.style.minWidth = '110px';
    sel.ariaLabel = 'Language';
    sel.innerHTML = `
      <option value="en">English</option>
      <option value="zh">简体中文</option>
    `;
    sel.value = getLang();
    sel.addEventListener('change', () => { setLang(sel.value); applyI18n(); toast('Language updated'); });
    headerActions.prepend(sel);
  };

  const applyI18n = () => {
    const lang = getLang();
    const t = i18n[lang] || i18n.en;

    // 顶部按钮/提示
    const ins = byId('installPWA'); if (ins) ins.textContent = t.install;
    if (buyProBtn) buyProBtn.textContent = t.unlockPro;
    const wf = byId('workflow'); if (wf) wf.textContent = t.workflow;
    if (netState) netState.textContent = navigator.onLine ? t.online : t.offline;

    // Section 标题
    const mapText = [
      ['#sec-your', t.yourDetails], ['#sec-client', t.clientDetails],
      ['#sec-doc', t.document], ['#sec-items', t.lineItems], ['#sec-notes', t.notesTerms]
    ];
    mapText.forEach(([sel, val]) => { const el = $(sel); if (el) el.textContent = val; });

    // 表单 label 与按钮
    const lbls = [
      ['label[for="yourEmail"]', t.email],
      ['label[for="clientEmail"]', t.clientEmail]
    ];
    // 因为没有 for 属性，使用包含文本的方式尽量保守（不精确也不会报错）
    const btnMap = [
      ['#loadJson', t.load], ['#saveJson', t.save], ['#addItem', t.addItem],
      ['#clearItems', t.clearAll], ['#previewPDF', t.preview], ['#exportPDF', t.export]
    ];
    btnMap.forEach(([sel, val]) => { const el = $(sel); if (el) el.textContent = val; });

    // 列头
    const head = $$('.items-head span');
    if (head.length >= 5) {
      head[0].textContent = t.description;
      head[1].textContent = t.qty;
      head[2].textContent = t.unitPrice;
      head[3].textContent = t.tax;
      head[4].textContent = t.amount;
    }

    // totals
    const totRows = $$('#totals .totals-row');
    if (totRows.length >= 3) {
      totRows[0].firstElementChild.textContent = t.subtotal;
      totRows[1].firstElementChild.textContent = t.totalTax;
      totRows[2].firstElementChild.textContent = t.total;
    }
  };

  ensureLangSwitcher();
  applyI18n();

  // ---------- Form elements ----------
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

  // ---------- Currency formatting ----------
  const fmt = (val) => {
    const cur = currency?.value || 'MYR';
    try {
      return new Intl.NumberFormat(getLang() === 'zh' ? 'zh-CN' : undefined, { style:'currency', currency: cur }).format(val || 0);
    } catch {
      return (val || 0).toFixed(2) + ' ' + cur;
    }
  };

  // ---------- State & change guard ----------
  let dirty = false;
  const markDirty = () => { dirty = true; };
  $$('input,textarea,select').forEach(el => el.addEventListener('input', markDirty));
  window.addEventListener('beforeunload', (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  // ---------- Validation helpers ----------
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

  // ---------- Line items ----------
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

  // ---------- Totals ----------
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

  // ---------- Basic required validation before export/preview ----------
  const validateCore = () => {
    let ok = true;
    [yourName, yourEmail, clientName, docType, docNo, docDate, currency].forEach(el => {
      if (!el) return;
      const valid = el.checkValidity();
      setInvalid(el, !valid);
      ok = ok && valid;
    });
    if (!lineItemsWrap || lineItemsWrap.children.length === 0) {
      toast(i18n[getLang()]?.plsAddItem || i18n.en.plsAddItem); ok = false;
    }
    return ok;
  };

    // ---------- JSON Import/Export (precheck) ----------
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
    toast(i18n[getLang()]?.saved || i18n.en.saved);
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
    // ---------- Print preview + export (Blob URL) ----------
  const buildPrintHTML = (autoPrint = false) => {
    const data = serialize();
    const lang = getLang();
    const t = i18n[lang] || i18n.en;
    const rowsHtml = $$('.item-row').map(row => {
      const d = $('.item-desc', row)?.value || '';
      const q = $('.item-qty', row)?.value || '';
      const p = $('.item-price', row)?.value || '';
      const tx = $('.item-tax', row)?.value || '';
      const amt = $('.item-amount', row)?.textContent || '';
      return `<tr><td>${d}</td><td style="text-align:right">${q}</td><td style="text-align:right">${p}</td><td style="text-align:right">${tx}</td><td style="text-align:right">${amt}</td></tr>`;
    }).join('');
    const script = autoPrint ? `<script>window.addEventListener('load',()=>window.print(),{once:true})<\/script>` : '';
    return `<!doctype html><html><head><meta charset="utf-8">
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
</style>
</head><body>
  <h1>${(data.doc?.type || 'Document').toUpperCase()} ${data.doc?.no || ''}</h1>
  <div class="grid">
    <div>
      <div class="muted">${t.from}</div>
      <div>${data.your?.name || ''}</div>
      <div>${data.your?.email || ''}</div>
      <div>${data.your?.address || ''}</div>
      <div>${data.your?.phone || ''}</div>
    </div>
    <div>
      <div class="muted">${t.billTo}</div>
      <div>${data.client?.name || ''}</div>
      <div>${data.client?.email || ''}</div>
      <div>${data.client?.address || ''}</div>
      <div>Ref: ${data.client?.ref || '-'}</div>
      <div>Date: ${data.doc?.date || ''} • Currency: ${data.doc?.currency || ''}</div>
    </div>
  </div>

  <table>
    <thead><tr><th>${t.description}</th><th style="text-align:right">${t.qty}</th><th style="text-align:right">${t.unit}</th><th style="text-align:right">${t.tax}</th><th style="text-align:right">${t.amount}</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr><td colspan="4" style="text-align:right">${t.subtotal}</td><td style="text-align:right">${byId('subtotal')?.textContent || ''}</td></tr>
      <tr><td colspan="4" style="text-align:right">${t.totalTax}</td><td style="text-align:right">${byId('taxAmount')?.textContent || ''}</td></tr>
      <tr><td colspan="4" style="text-align:right">${t.total}</td><td style="text-align:right">${byId('grandTotal')?.textContent || ''}</td></tr>
    </tfoot>
  </table>

  <p><strong>${t.notes}</strong><br>${data.notes || '-'}</p>
  <p><strong>${t.terms}</strong><br>${data.terms || '-'}</p>
  <footer style="margin-top:40px;color:#666;font-size:12px">
    <hr>
    <p>Made with FreelanceKit — For questions, contact: <a href="mailto:tmloong0128@gmail.com">tmloong0128@gmail.com</a></p>
  </footer>
  ${script}
</body></html>`;
  };

  const openHtmlInNewTab = (html) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      toast('Popup blocked. Please allow popups and try again.');
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const openPreview = () => openHtmlInNewTab(buildPrintHTML(false));
  const openExport = () => openHtmlInNewTab(buildPrintHTML(true));

  if (previewBtn) previewBtn.addEventListener('click', () => {
    if (!validateCore()) { toast(i18n[getLang()]?.fixFields || i18n.en.fixFields); return; }
    openPreview();
  });
  if (exportBtn) exportBtn.addEventListener('click', () => {
    if (!validateCore()) { toast(i18n[getLang()]?.fixFields || i18n.en.fixFields); return; }
    openExport();
    toast(i18n[getLang()]?.useDialog || i18n.en.useDialog);
  });

  // ---------- Keyboard shortcuts ----------
  window.addEventListener('keydown', (e) => {
    const mod = (e.ctrlKey || e.metaKey);
    if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); previewBtn?.click(); }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveJsonBtn?.click(); }
  });

  // ---------- Bootstrap defaults ----------
  if (lineItemsWrap && lineItemsWrap.children.length === 0) addRow({ qty: 1, price: 0 });
  updateTotals();
})();

