/* FreelanceKit Core — UX upgrades: validation, toast, undo, shortcuts */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const App = {
  state: {
    lang: 'en',
    currency: 'USD',
    docType: 'invoice',
    templateId: 'invoice-default',
    pro: false,
    logoDataUrl: null,
    your: { name:'', taxId:'', address:'', email:'', phone:'' },
    client: { name:'', taxId:'', address:'', email:'', phone:'' },
    meta: { number:'', issueDate:'', dueDate:'' },
    items: [],
    notes: '',
    paymentTerms: '',
    templateMeta: null
  },
  lastRemoved: null,
  i18n: {
    en: {
      tagline: "Quotes • Invoices • Contracts",
      yourDetails: "Your Details", yourName:"Name/Company", yourTaxId:"Tax ID", yourAddress:"Address", yourPhone:"Phone", yourLogo:"Logo",
      clientDetails:"Client Details", clientName:"Name/Company", clientTaxId:"Tax ID", clientAddress:"Address", clientPhone:"Phone",
      docDetails:"Document", docNumber:"Number", issueDate:"Issue Date", dueDate:"Due Date",
      lineItems:"Line Items", qty:"Qty", description:"Description", unitPrice:"Unit Price", tax:"Tax %", amount:"Amount", addItem:"Add item",
      notes:"Notes", paymentTerms:"Payment Terms", preview:"Preview", save:"Save", load:"Load", exportJson:"Export JSON", importJson:"Import JSON",
      privacy:"Privacy", terms:"Terms", offline:"Offline", install:"Install App"
    },
    zh: {
      tagline:"报价 • 发票 • 合同",
      yourDetails:"我的信息", yourName:"名称/公司", yourTaxId:"税号", yourAddress:"地址", yourPhone:"电话", yourLogo:"Logo",
      clientDetails:"客户信息", clientName:"名称/公司", clientTaxId:"税号", clientAddress:"地址", clientPhone:"电话",
      docDetails:"单据", docNumber:"编号", issueDate:"开具日期", dueDate:"到期日",
      lineItems:"项目明细", qty:"数量", description:"描述", unitPrice:"单价", tax:"税率 %", amount:"金额", addItem:"新增行",
      notes:"备注", paymentTerms:"付款条款", preview:"预览", save:"保存", load:"读取", exportJson:"导出 JSON", importJson:"导入 JSON",
      privacy:"隐私政策", terms:"使用条款", offline:"离线", install:"安装应用"
    }
  },
  templatesIndex: [
    { id:'invoice-default',   path:'templates/invoice-default.json', name:'Invoice — Default' },
    { id:'invoice-pro-classic', path:'templates/invoice-pro-classic.json', name:'Invoice — Pro Classic (Demo)', pro:true },
    { id:'invoice-pro-modern',  path:'templates/invoice-pro-modern.json', name:'Invoice — Pro Modern (Demo)', pro:true },
    { id:'quote-default',     path:'templates/quote-default.json', name:'Quote — Default' },
    { id:'contract-default',  path:'templates/contract-default.json', name:'Contract — Default' },
  ],
  currencyFmt(v){
    const { currency } = App.state;
    try {
      return new Intl.NumberFormat(undefined, { style:'currency', currency }).format(v || 0);
    } catch {
      return `${currency} ${(+v||0).toFixed(2)}`;
    }
  },
  setLang(lang){
    App.state.lang = lang;
    const dict = App.i18n[lang] || App.i18n.en;
    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    if (lang === 'zh') {
      $('#yourName').placeholder = '某某工作室';
      $('#clientName').placeholder = '某某公司';
      $('#docNumber').placeholder = 'INV-2025-001';
    } else {
      $('#yourName').placeholder = 'Acme Studio';
      $('#clientName').placeholder = 'Client Inc.';
      $('#docNumber').placeholder = 'INV-2025-001';
    }
    App.renderPreview();
  },
  init(){
    const now = new Date();
    $('#issueDate').valueAsDate = now;
    const due = new Date(now); due.setDate(due.getDate()+14);
    $('#dueDate').valueAsDate = due;

    $('#documentType').addEventListener('change', (e)=>{
      App.state.docType = e.target.value;
      App.syncDocTypeVisibility();
      App.autoPickTemplateForType();
      App.renderPreview();
    });

    $('#currencySelect').addEventListener('change', e => { App.state.currency = e.target.value; App.renderPreview(); });
    $('#langSelect').addEventListener('change', e => App.setLang(e.target.value));

    $('#addItemBtn').addEventListener('click', App.addItem);
    $('#previewBtn').addEventListener('click', ()=>{
      App.renderPreview();
      $('.preview-pane').scrollIntoView({behavior:'smooth',block:'start'});
    });

    $('#exportPdfBtn').addEventListener('click', () => {
      const issues = App.validate();
      if (issues.length){
        if (!confirm('Please check:\n- ' + issues.join('\n- ') + '\n\nContinue to export?')) return;
      }
      exportToPDF($('#preview'), App.filename());
    });

    $('#saveLocalBtn').addEventListener('click', App.saveLocal);
    $('#loadLocalBtn').addEventListener('click', App.loadLocal);
    $('#exportJsonBtn').addEventListener('click', App.exportJSON);
    $('#importJsonInput').addEventListener('change', App.importJSON);
    $('#importCsvClients').addEventListener('change', App.importClientsCSV);
    $('#enterKeyBtn').addEventListener('click', ()=>{
      const key = prompt('Enter your Pro key (local unlock)');
      if (!key) return;
      localStorage.setItem('fk.proKey', key);
      App.state.pro = true;
      showToast('Pro unlocked locally. Thank you!');
      App.toggleProUI();
    });

    $('#yourLogo').addEventListener('change', App.loadLogo);

    ['yourName','yourTaxId','yourAddress','yourEmail','yourPhone',
     'clientName','clientTaxId','clientAddress','clientEmail','clientPhone',
     'docNumber','issueDate','dueDate','notes','paymentTerms'].forEach(id=>{
      $('#'+id).addEventListener('input', App.onFieldChange);
    });

    App.setupInstall();

    // User templates (offline import)
    const importTplBtn = $('#importTplInput');
    if (importTplBtn) importTplBtn.addEventListener('change', App.importTemplateJSON);
    App.loadUserTemplates();

    App.populateTemplateSelect();
    App.loadTemplateById(App.state.templateId);

    function updateOffline(){
      $('#offlineBadge').hidden = navigator.onLine;
    }
    window.addEventListener('online', updateOffline);
    window.addEventListener('offline', updateOffline);
    updateOffline();

    App.loadLocal(true);
    App.setLang('en');

    // Shortcuts: Ctrl/Cmd+S save, Ctrl/Cmd+P export PDF, Ctrl/Cmd+I add item
    window.addEventListener('keydown', (e)=>{
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); App.saveLocal(); showToast('Saved locally'); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='p'){ e.preventDefault(); const issues = App.validate(); if (!issues.length || confirm('Issues:\n- '+issues.join('\n- ')+'\nContinue?')) exportToPDF($('#preview'), App.filename()); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='i'){ e.preventDefault(); App.addItem(); showToast('Item added'); }
    });
  },
  syncDocTypeVisibility(){
    const type = App.state.docType;
    $$('[data-doc-type]').forEach(el=>{
      const visibleFor = (el.getAttribute('data-doc-type')||'').split(/\s+/);
      el.style.display = visibleFor.includes(type) ? '' : 'none';
    });
  },
  autoPickTemplateForType(){
    const type = App.state.docType;
    const list = App.templatesIndex.filter(t => t.id.startsWith(type));
    const pick = (list[0] && list[0].id) || App.state.templateId;
    if (pick !== App.state.templateId) {
      App.state.templateId = pick;
      $('#templateSelect').value = pick;
      App.loadTemplateById(pick);
    }
  },
  onFieldChange(){
    App.state.your = {
      name: $('#yourName').value,
      taxId: $('#yourTaxId').value,
      address: $('#yourAddress').value,
      email: $('#yourEmail').value,
      phone: $('#yourPhone').value,
    };
    App.state.client = {
      name: $('#clientName').value,
      taxId: $('#clientTaxId').value,
      address: $('#clientAddress').value,
      email: $('#clientEmail').value,
      phone: $('#clientPhone').value,
    };
    App.state.meta = {
      number: $('#docNumber').value,
      issueDate: $('#issueDate').value,
      dueDate: $('#dueDate').value,
    };
    App.state.notes = $('#notes').value;
    App.state.paymentTerms = $('#paymentTerms').value;
    App.captureItems();
    App.renderPreview();
  },
  addItem(){
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
    const el = document.createElement('div');
    el.className = 'item-row';
    el.dataset.id = id;
    el.innerHTML = `
      <input class="qty" type="number" min="0" step="0.01" placeholder="1" />
      <textarea class="desc" rows="1" placeholder="Design work / Development"></textarea>
      <input class="unit" type="number" min="0" step="0.01" placeholder="100" />
      <input class="tax" type="number" min="0" step="0.01" placeholder="0" />
      <input class="amount" type="text" readonly />
      <button class="remove" title="Remove">✕</button>
    `;
    $('#items').appendChild(el);

    const update = ()=>{
      const qty = parseFloat($('.qty', el).value) || 0;
      const unit = parseFloat($('.unit', el).value) || 0;
      const tax = parseFloat($('.tax', el).value) || 0;
      const base = qty * unit;
      const total = base * (1 + tax/100);
      $('.amount', el).value = App.currencyFmt(total);
      App.captureItems();
      App.renderPreview();
    };
    $$('.qty, .unit, .tax, .desc', el).forEach(inp => inp.addEventListener('input', update));

    $('.remove', el).addEventListener('click', ()=>{
      const idx = $$('#items .item-row').indexOf ? $$('#items .item-row').indexOf(el) : Array.from($('#items').children).indexOf(el);
      const snap = {
        data: {
          qty: parseFloat($('.qty', el).value)||0,
          desc: $('.desc', el).value||'',
          unit: parseFloat($('.unit', el).value)||0,
          tax: parseFloat($('.tax', el).value)||0
        },
        pos: idx
      };
      el.remove();
      App.captureItems();
      App.renderPreview();
      App.lastRemoved = snap;
      showToast('Item removed', 'Undo', ()=>{
        const row = App.addItem();
        // Move it back to the original position
        if (snap.pos >= 0 && snap.pos < $('#items').children.length-1){
          $('#items').insertBefore(row, $('#items').children[snap.pos]);
        }
        $('.qty', row).value = snap.data.qty;
        $('.desc', row).value = snap.data.desc;
        $('.unit', row).value = snap.data.unit;
        $('.tax', row).value = snap.data.tax;
        $('.qty', row).dispatchEvent(new Event('input'));
      });
    });

    update();
    return el;
  },
  captureItems(){
    App.state.items = $$('#items .item-row').map(row => ({
      qty: parseFloat($('.qty', row).value) || 0,
      desc: $('.desc', row).value || '',
      unit: parseFloat($('.unit', row).value) || 0,
      tax: parseFloat($('.tax', row).value) || 0
    }));
  },
  totals(){
    const items = App.state.items || [];
    let sub = 0, tax = 0, total = 0;
    items.forEach(it => {
      const base = it.qty * it.unit;
      const t = base * (it.tax/100);
      sub += base;
      tax += t;
      total += base + t;
    });
    return { sub, tax, total };
  },
  populateTemplateSelect(){
    const sel = $('#templateSelect');
    sel.innerHTML = '';
    App.templatesIndex.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name + (t.pro ? ' 🔒' : '') + (t.user ? ' (Imported)' : '');
      sel.appendChild(opt);
    });
    sel.addEventListener('change', (e)=>{
      App.state.templateId = e.target.value;
      App.loadTemplateById(App.state.templateId);
    });
  },
  async loadTemplateById(id){
    const meta = App.templatesIndex.find(t => t.id === id);
    if (!meta) return;
    try {
      if (meta.user && meta.inlineTpl){
        const tpl = meta.inlineTpl;
        App.state.templateMeta = tpl;
        $('#templateName').textContent = tpl.title || meta.name;
        App.state.isProTemplateDemo = false;
        App.applyTemplate(tpl);
        return;
      }
      const res = await fetch(meta.path);
      const tpl = await res.json();
      App.state.templateMeta = tpl;
      $('#templateName').textContent = tpl.title || meta.name;
      const isPro = !!tpl.isPro;
      App.state.isProTemplateDemo = isPro && !App.state.pro && tpl.demoWatermark;
      App.applyTemplate(tpl);
    } catch (e) {
      console.error('Template load failed', e);
    }
  },
  applyTemplate(tpl){
    const pv = $('#preview');
    pv.classList.remove('template-classic','template-modern');
    pv.classList.add(`template-${tpl.layout || 'classic'}`);
    document.documentElement.style.setProperty('--accent', tpl.accentColor || '#0ea5e9');
    App.renderPreview();
  },
  renderPreview(){
    const s = App.state;
    const t = App.totals();
    const typeTitle = {
      invoice: (s.lang==='zh'?'发票':'Invoice'),
      quote:   (s.lang==='zh'?'报价单':'Quote'),
      contract:(s.lang==='zh'?'合同':'Contract')
    }[s.docType];

    const yourBlock = `
      <div class="box">
        <div class="label">${s.lang==='zh'?'开票方':'From'}</div>
        <div><strong>${escapeHtml(s.your.name||'')}</strong></div>
        ${s.your.taxId? `<div>${s.lang==='zh'?'税号':'Tax ID'}: ${escapeHtml(s.your.taxId)}</div>`:''}
        ${s.your.address? `<div>${nl2br(escapeHtml(s.your.address))}</div>`:''}
        ${s.your.email? `<div>${escapeHtml(s.your.email)}</div>`:''}
        ${s.your.phone? `<div>${escapeHtml(s.your.phone)}</div>`:''}
      </div>`;
    const clientBlock = `
      <div class="box">
        <div class="label">${s.lang==='zh'?'收件方':'Bill To'}</div>
        <div><strong>${escapeHtml(s.client.name||'')}</strong></div>
        ${s.client.taxId? `<div>${s.lang==='zh'?'税号':'Tax ID'}: ${escapeHtml(s.client.taxId)}</div>`:''}
        ${s.client.address? `<div>${nl2br(escapeHtml(s.client.address))}</div>`:''}
        ${s.client.email? `<div>${escapeHtml(s.client.email)}</div>`:''}
        ${s.client.phone? `<div>${escapeHtml(s.client.phone)}</div>`:''}
      </div>`;
    const logo = s.logoDataUrl ? `<img src="${s.logoDataUrl}" alt="logo" style="height:48px;max-width:220px;border-radius:6px" />` : '';

    const itemsTable = (s.docType === 'contract') ? '' : `
      <table>
        <thead>
          <tr>
            <th style="width:80px">${s.lang==='zh'?'数量':'Qty'}</th>
            <th>${s.lang==='zh'?'描述':'Description'}</th>
            <th style="width:140px">${s.lang==='zh'?'单价':'Unit Price'}</th>
            <th style="width:90px">${s.lang==='zh'?'税率 %':'Tax %'}</th>
            <th style="width:140px">${s.lang==='zh'?'金额':'Amount'}</th>
          </tr>
        </thead>
        <tbody>
          ${s.items.map(it => {
            const base = it.qty * it.unit;
            const lineTax = base * (it.tax/100);
            const amt = base + lineTax;
            return `<tr>
              <td>${fmt(it.qty)}</td>
              <td style="text-align:left">${escapeHtml(it.desc)}</td>
              <td>${App.currencyFmt(it.unit)}</td>
              <td>${fmt(it.tax)}</td>
              <td>${App.currencyFmt(amt)}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="4" style="text-align:right">${s.lang==='zh'?'小计':'Subtotal'}</td><td>${App.currencyFmt(t.sub)}</td></tr>
          <tr><td colspan="4" 
