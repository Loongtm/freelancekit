// assets/js/app.js — FreelanceKit Full Version (with Minimal Gold Theme)
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const byId = id => document.getElementById(id);
  const win = window;
  const I = win.FK_I18N || { t:k=>k, getLang:()=> 'zh', setLang:()=>{} };

  /* =========================
   * THEME (Dark / Light)
   * ========================= */
  const THEME_KEY = 'fk_theme';
  const getTheme = () => localStorage.getItem(THEME_KEY) || 'dark';
  const setTheme = t => {
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.setAttribute('data-theme', t);
  };
  setTheme(getTheme());
  const themeToggle = byId('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTheme(getTheme()==='dark' ? 'light' : 'dark');
    });
  }

  /* =========================
   * I18N
   * ========================= */
  const langSwitcher = byId('langSwitcher');
  function applyI18n(){
    $$('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if (!k) return;
      el.textContent = I.t(k);
    });

    // 同步更新付款方式下拉
    const pmSel = byId('paymentMethodSelect');
    if (pmSel) {
      const map = {
        bank: I.getLang()==='zh' ? '银行转账' : I.t('bankTransfer'),
        card: I.getLang()==='zh' ? '信用卡'   : I.t('creditCard'),
        paypal: 'PayPal',
        ewallet: I.getLang()==='zh' ? '电子钱包' : I.t('ewallet'),
        cash: I.getLang()==='zh' ? '现金'     : I.t('cash'),
        other: I.getLang()==='zh' ? '其他（自定义）' : I.t('other'),
      };
      Array.from(pmSel.options).forEach(o => { if (map[o.value]) o.textContent = map[o.value]; });
    }
  }
  if (langSwitcher) {
    langSwitcher.value = I.getLang();
    langSwitcher.addEventListener('change', e => {
      I.setLang(e.target.value);
      applyI18n();
      updateTotals();
    });
  }
  applyI18n();

  /* =========================
   * Pro Dialog
   * ========================= */
  const proDlg = byId('proDlg');
  const openProBtn = byId('openPro');
  const proClose = byId('proClose');
  const proBuy = byId('proBuy');

  function showPro(v=true){ if (proDlg) proDlg.style.display = v ? 'grid' : 'none'; }
  if (openProBtn) openProBtn.addEventListener('click', () => showPro(true));
  if (proClose)   proClose.addEventListener('click', () => showPro(false));
  if (proDlg)     proDlg.addEventListener('click', (e)=>{ if(e.target===proDlg) showPro(false); });
  if (proBuy)     proBuy.addEventListener('click', () => { location.href = '/pages/pro.html'; });

  /* =========================
   * Elements
   * ========================= */
  const sellerName = byId('sellerName');
  const sellerAddress = byId('sellerAddress');
  const sellerEmail = byId('sellerEmail');
  const sellerPhone = byId('sellerPhone');
  const clientName = byId('clientName');
  const clientAddress = byId('clientAddress');
  const clientEmail = byId('clientEmail');
  const clientPhone = byId('clientPhone');
  const invoiceNumber = byId('invoiceNumber');
  const invoiceDate = byId('invoiceDate');
  const dueDate = byId('dueDate');
  const lineItemsWrap = byId('lineItems');
  const btnAddItem = byId('addItem');
  const btnClearItems = byId('clearItems');
  const subtotalEl = byId('subtotal');
  const taxAmountEl = byId('taxAmount');
  const totalEl = byId('grandTotal');
  const pmSelect = byId('paymentMethodSelect');
  const pmOther = byId('paymentMethodOther');
  const paidStatus = byId('paidStatus');
  const notesEl = byId('notes');
  const termsEl = byId('terms');

  /* =========================
   * New Feature: Export Theme Select
   * ========================= */
  const exportTheme = document.createElement('select');
  exportTheme.id = 'exportTheme';
  exportTheme.className = 'select-like';
  exportTheme.innerHTML = `
    <option value="normal">普通主题</option>
    <option value="gold">极简黑金主题</option>`;
  const fab = document.querySelector('.fab');
  if (fab) fab.insertBefore(exportTheme, fab.firstChild);

  /* =========================
   * Utils
   * ========================= */
  function parseNum(v){ const n = Number(String(v||'').replace(/,/g,'')); return isFinite(n)?n:0; }
  function fmtMoney(v, currency='MYR'){
    try {
      return new Intl.NumberFormat(I.getLang()==='zh'?'zh-CN':undefined,
        { style:'currency', currency }).format(v||0);
    } catch { return (v||0).toFixed(2)+' '+currency; }
  }

  /* Payment logic */
  function getPaymentText(){
    if (!pmSelect) return '';
    if (pmSelect.value==='other') return pmOther?.value || '';
    const opt = pmSelect.selectedOptions[0];
    return opt ? opt.textContent : pmSelect.value;
  }
  if (pmSelect) pmSelect.addEventListener('change', ()=>{
    const isOther = pmSelect.value==='other';
    if (pmOther){
      pmOther.style.display = isOther ? 'block' : 'none';
      if (isOther) pmOther.focus(); else pmOther.value='';
    }
  });

  /* =========================
   * Line Items
   * ========================= */
  function newRow(data={}){
    const row=document.createElement('div');
    row.className='item-row';
    row.innerHTML=`
      <input class="item-desc" placeholder="${I.t('description')}" value="${(data.desc||'').replace(/"/g,'&quot;')}">
      <input class="item-qty" inputmode="decimal" placeholder="1" value="${data.qty ?? 1}">
      <input class="item-price" inputmode="decimal" placeholder="0.00" value="${data.price ?? 0}">
      <select class="item-tax"><option value="0">0%</option><option value="6">6%</option><option value="8">8%</option><option value="10">10%</option></select>
      <div class="item-amount">0.00</div><button class="row-del">✕</button>`;
    const qty=$('.item-qty',row), price=$('.item-price',row), tax=$('.item-tax',row), del=$('.row-del',row);
    const sync=()=>{const q=parseNum(qty.value),p=parseNum(price.value),t=parseNum(tax.value);const net=q*p;const taxV=net*(t/100);$('.item-amount',row).textContent=fmtMoney(net+taxV);updateTotals();};
    qty.addEventListener('input',sync);price.addEventListener('input',sync);tax.addEventListener('change',sync);
    del.addEventListener('click',()=>{row.remove();updateTotals();});
    if(data.tax!=null) tax.value=String(data.tax);
    lineItemsWrap.appendChild(row);sync();
  }
  if(btnAddItem) btnAddItem.addEventListener('click',()=>newRow());
  if(btnClearItems) btnClearItems.addEventListener('click',()=>{lineItemsWrap.innerHTML='';updateTotals();});

  function collectRows(){
    return $$('.item-row',lineItemsWrap).map(r=>{
      const qty=parseNum($('.item-qty',r)?.value);
      const price=parseNum($('.item-price',r)?.value);
      const tax=parseNum($('.item-tax',r)?.value);
      const net=qty*price;const taxV=net*(tax/100);
      return {qty,price,tax,net,taxV,amount:net+taxV};
    });
  }

  function updateTotals(){
    const rows=collectRows();
    const subtotal=rows.reduce((s,it)=>s+it.net,0);
    const taxSum=rows.reduce((s,it)=>s+it.taxV,0);
    const total=subtotal+taxSum;
    if(subtotalEl) subtotalEl.textContent=fmtMoney(subtotal);
    if(taxAmountEl) taxAmountEl.textContent=fmtMoney(taxSum);
    if(totalEl) totalEl.textContent=fmtMoney(total);
  }

  function serialize(){
    const rows=$$('.item-row').map(r=>({
      desc:$('.item-desc',r)?.value||'',
      qty:parseNum($('.item-qty',r)?.value),
      price:parseNum($('.item-price',r)?.value),
      tax:$('.item-tax',r)?.value
    }));
    return {
      seller:{name:sellerName?.value||'',address:sellerAddress?.value||'',email:sellerEmail?.value||'',phone:sellerPhone?.value||''},
      client:{name:clientName?.value||'',address:clientAddress?.value||'',email:clientEmail?.value||'',phone:clientPhone?.value||''},
      doc:{number:invoiceNumber?.value||'',date:invoiceDate?.value||'',due:dueDate?.value||'',paymentMethod:getPaymentText(),paid:paidStatus?.checked||false},
      rows,notes:notesEl?.value||'',terms:termsEl?.value||''
    };
  }

  /* =========================
   * Print / Export
   * ========================= */

  const previewBtn=byId('previewPDF');
  const exportBtn=byId('exportPDF');

  function isFormOk(){
    if(!invoiceNumber.checkValidity()||!invoiceDate.checkValidity()||!dueDate.checkValidity()){
      alert('请填写完整的发票信息');return false;
    }
    if($$('.item-row').length===0){alert('请添加至少一项项目');return false;}
    return true;
  }

  /* ---- Normal Theme ---- */
  function buildPrintHTML_Normal(autoPrint=false){
    const d=serialize();const rowsHtml=$$('.item-row').map(r=>{
      const desc=$('.item-desc',r)?.value||'';
      const qty=parseNum($('.item-qty',r)?.value);
      const price=parseNum($('.item-price',r)?.value);
      const tax=parseNum($('.item-tax',r)?.value);
      const net=qty*price;const taxV=net*(tax/100);const amount=net+taxV;
      return `<tr><td>${desc}</td><td class="r">${qty}</td><td class="r">${fmtMoney(price)}</td><td class="r">${tax}%</td><td class="r">${fmtMoney(amount)}</td></tr>`;
    }).join('');
    const subtotal=collectRows().reduce((s,it)=>s+it.net,0);
    const taxSum=collectRows().reduce((s,it)=>s+it.taxV,0);
    const total=subtotal+taxSum;
    const auto=autoPrint?`<script>window.print();</script>`:'';
    return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice</title>
    <link rel="stylesheet" href="/assets/css/print-preview.css"></head>
    <body><h2 style="text-align:center">Invoice ${d.doc.number||''}</h2>
    <table><thead><tr><th>Desc</th><th>Qty</th><th>Price</th><th>Tax</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    <div style="text-align:right"><b>Total: ${fmtMoney(total)}</b></div>${auto}</body></html>`;
  }

  /* ---- Gold Theme ---- */
  function buildPrintHTML_Gold(autoPrint=false){
    const d = serialize();
    const rowsHtml = $$('.item-row').map(r=>{
      const desc=$('.item-desc',r)?.value||'';
      const qty=parseNum($('.item-qty',r)?.value);
      const price=parseNum($('.item-price',r)?.value);
      const tax=parseNum($('.item-tax',r)?.value);
      const net=qty*price;const taxV=net*(tax/100);const amount=net+taxV;
      return `<tr><td>${desc}</td><td class="r">${qty}</td><td class="r">${fmtMoney(price)}</td><td class="r">${tax}%</td><td class="r">${fmtMoney(amount)}</td></tr>`;
    }).join('');
    const subtotal=collectRows().reduce((s,it)=>s+it.net,0);
    const taxSum=collectRows().reduce((s,it)=>s+it.taxV,0);
    const total=subtotal+taxSum;
    const auto=autoPrint?`<script>window.print();</script>`:'';
    return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice</title>
    <style>
      body{margin:0;padding:32px;background:#0a0a0a;color:#f8fafc;font-family:system-ui;-apple-system,Roboto,sans-serif;}
      h1,h2,h3{margin:0;color:#fcd34d;}
      .cover{text-align:center;margin-bottom:28px;}
      .logo{width:80px;height:80px;margin-bottom:10px;}
      .invoice-id{margin-top:8px;color:#eab308;}
      .divider{height:2px;background:linear-gradient(90deg,#facc15,#fcd34d,#fde047);}
      table{width:100%;border-collapse:collapse;margin-top:14px;}
      th,td{border:1px solid #fcd34d;padding:8px;}
      th{background:#111;color:#fcd34d;}
      .r{text-align:right;}
      .section.r{text-align:right;margin-top:12px;}
      footer{text-align:center;margin-top:28px;font-size:12px;color:#a1a1aa;}
      .paid{position:fixed;right:40px;bottom:40px;color:#fcd34d;font-size:26px;font-weight:700;opacity:0.25;transform:rotate(-15deg);}
    </style></head>
    <body>
      ${d.doc.paid?`<div class="paid">PAID</div>`:''}
      <div class="cover"><img src="/assets/logo.svg" class="logo"><h1>${d.seller.name||'FreelanceKit'}</h1>
      <div class="invoice-id">INVOICE · ${d.doc.number||''}</div></div><div class="divider"></div>
      <table><thead><tr><th>${I.t('description')||'Desc'}</th><th>${I.t('qty')||'Qty'}</th><th>${I.t('unitPrice')||'Price'}</th><th>${I.t('tax')||'Tax'}</th><th>${I.t('amount')||'Amount'}</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <div class="section r"><div>${I.t('subtotal')||'Subtotal'}：${fmtMoney(subtotal)}</div><div>${I.t('tax')||'Tax'}：${fmtMoney(taxSum)}</div><div><b>${I.t('total')||'Total'}：${fmtMoney(total)}</b></div></div>
      <footer>FreelanceKit © ${new Date().getFullYear()} — Minimal Gold Edition</footer>${auto}
    </body></html>`;
  }

  function openPrintWindow(autoPrint=false){
    const theme = byId('exportTheme')?.value || 'normal';
    const html = theme==='gold' ? buildPrintHTML_Gold(autoPrint) : buildPrintHTML_Normal(autoPrint);
    const w=window.open('','_blank');if(!w)return alert('Popup blocked');
    w.document.open();w.document.write(html);w.document.close();
  }

  if(previewBtn) previewBtn.addEventListener('click',()=>{if(!isFormOk())return;openPrintWindow(false);});
  if(exportBtn) exportBtn.addEventListener('click',()=>{if(!isFormOk())return;openPrintWindow(true);});
  updateTotals();
})();
