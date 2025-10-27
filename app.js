/* FreelanceKit Core */
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
    // Placeholders
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
    // UI wiring
    const now = new Date();
    $('#issueDate').valueAsDate = now;
    const due = new Date(now); due.setDate(due.getDate()+14);
    $('#dueDate').valueAsDate = due;

    // Document type switch
    $('#documentType').addEventListener('change', (e)=>{
      App.state.docType = e.target.value;
      App.syncDocTypeVisibility();
      App.autoPickTemplateForType();
      App.renderPreview();
    });

    // Currency / Lang
    $('#currencySelect').addEventListener('change', e => { App.state.currency = e.target.value; App.renderPreview(); });
    $('#langSelect').addEventListener('change', e => App.setLang(e.target.value));

    // Items
    $('#addItemBtn').addEventListener('click', App.addItem);
    // Actions
    $('#previewBtn').addEventListener('click', App.renderPreview);
    $('#exportPdfBtn').addEventListener('click', () => exportToPDF($('#preview'), App.filename()));
    $('#saveLocalBtn').addEventListener('click', App.saveLocal);
    $('#loadLocalBtn').addEventListener('click', App.loadLocal);
    $('#exportJsonBtn').addEventListener('click', App.exportJSON);
    $('#importJsonInput').addEventListener('change', App.importJSON);
    $('#importCsvClients').addEventListener('change', App.importClientsCSV);

    // Enter Key (dummy local unlock)
    $('#enterKeyBtn').addEventListener('click', ()=>{
      const key = prompt('Enter your Pro key (local unlock)');
      if (!key) return;
      localStorage.setItem('fk.proKey', key);
      App.state.pro = true;
      alert('Pro unlocked locally. Thank you!');
      App.toggleProUI();
    });

    // Files
    $('#yourLogo').addEventListener('change', App.loadLogo);

    // Inputs sync
    ['yourName','yourTaxId','yourAddress','yourEmail','yourPhone',
     'clientName','clientTaxId','clientAddress','clientEmail','clientPhone',
     'docNumber','issueDate','dueDate','notes','paymentTerms'].forEach(id=>{
      $('#'+id).addEventListener('input', App.onFieldChange);
    });

    // Install prompt
    App.setupInstall();

    // Templates
    App.populateTemplateSelect();
    App.loadTemplateById(App.state.templateId);

    // Offline indicator
    function updateOffline(){
      $('#offlineBadge').hidden = navigator.onLine;
    }
    window.addEventListener('online', updateOffline);
    window.addEventListener('offline', updateOffline);
    updateOffline();

    // Load last state if any
    App.loadLocal(true);

    // i18n
    App.setLang('en');
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
      <button class="remove">✕</button>
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
      el.remove();
      App.captureItems();
      App.renderPreview();
    });
    update();
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
      opt.textContent = t.name + (t.pro ? ' 🔒' : '');
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
      const res = await fetch(meta.path);
      const tpl = await res.json();
      App.state.templateMeta = tpl;
      $('#templateName').textContent = tpl.title || meta.name;
      // If pro demo, show watermark unless unlocked
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

    // Basic sections
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
          <tr><td colspan="4" style="text-align:right">${s.lang==='zh'?'税额':'Tax'}</td><td>${App.currencyFmt(t.tax)}</td></tr>
          <tr><td colspan="4" style="text-align:right">${s.lang==='zh'?'总计':'Total'}</td><td>${App.currencyFmt(t.total)}</td></tr>
        </tfoot>
      </table>`;

    const termsNotes = `
      ${s.notes? `<div class="notes"><strong>${s.lang==='zh'?'备注':'Notes'}:</strong><br>${nl2br(escapeHtml(s.notes))}</div>`:''}
      ${(s.paymentTerms && s.docType!=='contract')? `<div class="notes"><strong>${s.lang==='zh'?'付款条款':'Payment Terms'}:</strong><br>${nl2br(escapeHtml(s.paymentTerms))}</div>`:''}
    `;

    const contractBody = (s.docType==='contract')
      ? `<div class="box">
           <div class="label">${s.lang==='zh'?'合同内容':'Contract'}</div>
           ${renderContractDefault(s)}
         </div>`
      : '';

    const idblock = `
      <div class="idblock">
        <div>${s.lang==='zh'?'编号':'Number'}: <strong>${escapeHtml(s.meta.number||'')}</strong></div>
        <div>${s.lang==='zh'?'开具日期':'Issue'}: ${escapeHtml(s.meta.issueDate||'')}</div>
        ${s.docType!=='contract'? `<div>${s.lang==='zh'?'到期日':'Due'}: ${escapeHtml(s.meta.dueDate||'')}</div>`:''}
        <div>${s.lang==='zh'?'货币':'Currency'}: ${s.currency}</div>
      </div>`;

    $('#preview').innerHTML = `
      ${App.state.isProTemplateDemo ? `<div class="watermark">DEMO</div>`:''}
      <div class="header">
        <div>
          <div class="title"><span class="accent">${typeTitle}</span></div>
        </div>
        <div>${logo || ''}</div>
        ${idblock}
      </div>

      <div class="two-col">
        ${yourBlock}
        ${clientBlock}
      </div>

      ${itemsTable}
      ${contractBody}
      ${termsNotes}
    `;
  },
  filename(){
    const s = App.state;
    const safe = (s.client.name||'client').replace(/[^\w\-]+/g,'_');
    return `${s.docType}-${safe}-${s.meta.number||'draft'}.pdf`;
  },
  saveLocal(){
    App.captureItems();
    const data = JSON.stringify(App.state);
    localStorage.setItem('fk.state', data);
    alert('Saved locally.');
  },
  loadLocal(silent=false){
    const raw = localStorage.getItem('fk.state');
    const proKey = localStorage.getItem('fk.proKey');
    if (proKey) App.state.pro = true;
    App.toggleProUI();
    if (!raw) return;
    try{
      const s = JSON.parse(raw);
      Object.assign(App.state, s);
      // Fill inputs
      $('#yourName').value = s.your?.name || '';
      $('#yourTaxId').value = s.your?.taxId || '';
      $('#yourAddress').value = s.your?.address || '';
      $('#yourEmail').value = s.your?.email || '';
      $('#yourPhone').value = s.your?.phone || '';
      $('#clientName').value = s.client?.name || '';
      $('#clientTaxId').value = s.client?.taxId || '';
      $('#clientAddress').value = s.client?.address || '';
      $('#clientEmail').value = s.client?.email || '';
      $('#clientPhone').value = s.client?.phone || '';
      $('#docNumber').value = s.meta?.number || '';
      $('#issueDate').value = s.meta?.issueDate || '';
      $('#dueDate').value = s.meta?.dueDate || '';
      $('#notes').value = s.notes || '';
      $('#paymentTerms').value = s.paymentTerms || '';
      $('#documentType').value = s.docType || 'invoice';
      $('#currencySelect').value = s.currency || 'USD';
      $('#langSelect').value = s.lang || 'en';
      App.setLang($('#langSelect').value);

      // Items
      $('#items').innerHTML = '';
      (s.items || []).forEach(()=> App.addItem());
      // Fill row values
      $$('#items .item-row').forEach((row, idx)=>{
        const it = s.items[idx];
        if (!it) return;
        $('.qty', row).value = it.qty ?? 0;
        $('.desc', row).value = it.desc ?? '';
        $('.unit', row).value = it.unit ?? 0;
        $('.tax', row).value = it.tax ?? 0;
        const ev = new Event('input'); $('.qty', row).dispatchEvent(ev);
      });

      // Logo
      if (s.logoDataUrl) App.state.logoDataUrl = s.logoDataUrl;

      // Template
      App.populateTemplateSelect();
      $('#templateSelect').value = s.templateId || 'invoice-default';
      App.loadTemplateById($('#templateSelect').value);

      App.syncDocTypeVisibility();
      App.renderPreview();
      if (!silent) alert('Loaded.');
    }catch(e){ console.warn('Load failed', e); }
  },
  exportJSON(){
    App.captureItems();
    const blob = new Blob([JSON.stringify(App.state, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `freelancekit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  importJSON(e){
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(reader.result);
        localStorage.setItem('fk.state', JSON.stringify(s));
        App.loadLocal();
      } catch(err) {
        alert('Invalid JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },
  importClientsCSV(e){
    if (!App.state.pro){ alert('This is a Pro feature.'); e.target.value=''; return; }
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Simple CSV: name,email,phone,address,taxId
      const lines = reader.result.split(/\r?\n/).filter(Boolean);
      const header = lines.shift();
      const cols = header.split(',').map(s=>s.trim().toLowerCase());
      const idx = (k)=> cols.indexOf(k);
      const list = lines.map(line=>{
        const cells = parseCsvLine(line);
        return {
          name: cells[idx('name')] || '',
          email: cells[idx('email')] || '',
          phone: cells[idx('phone')] || '',
          address: cells[idx('address')] || '',
          taxId: cells[idx('taxid')] || cells[idx('tax_id')] || ''
        };
      });
      // Fill first one
      if (list[0]){
        $('#clientName').value = list[0].name;
        $('#clientEmail').value = list[0].email;
        $('#clientPhone').value = list[0].phone;
        $('#clientAddress').value = list[0].address;
        $('#clientTaxId').value = list[0].taxId;
        App.onFieldChange();
        alert(`Imported ${list.length} clients. First applied to form.`);
      } else {
        alert('No rows found.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },
  toggleProUI(){
    // Mark pro-only controls
    if (App.state.pro){
      $$('.file-btn.pro').forEach(el => el.style.opacity = 1);
      $('#getProBtn').textContent = 'Pro Active ✅';
      $('#getProBtn').href = '#';
    }
  },
  loadLogo(e){
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      App.state.logoDataUrl = reader.result;
      App.renderPreview();
    };
    reader.readAsDataURL(f);
  },
  setupInstall(){
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      $('#installBtn').hidden = false;
      $('#installBtn').addEventListener('click', async ()=>{
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        $('#installBtn').hidden = true;
      });
    });
  }
};

function escapeHtml(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function nl2br(s=''){ return s.replace(/\n/g,'<br/>'); }
function fmt(n){ return (isFinite(n)? Number(n).toLocaleString(): '0'); }
function parseCsvLine(line){
  // naive CSV parsing with quotes
  const out=[]; let cur=''; let inQ=false;
  for (let i=0;i<line.length;i++){
    const c=line[i];
    if (c==='"' ){ if (inQ && line[i+1]==='"'){cur+='"'; i++;} else { inQ=!inQ; } }
    else if (c===',' && !inQ){ out.push(cur); cur=''; }
    else { cur+=c; }
  }
  out.push(cur); return out.map(s=>s.trim());
}

function renderContractDefault(s){
  // Very simple contract body; real Pro templates should provide detailed clauses.
  const partyA = escapeHtml(s.your.name||'[Your Company]');
  const partyB = escapeHtml(s.client.name||'[Client]');
  return `
    <p>This Agreement ("Agreement") is entered into between <strong>${partyA}</strong> ("Contractor") and <strong>${partyB}</strong> ("Client").</p>
    <ol>
      <li><strong>Scope.</strong> Contractor agrees to provide services as described in the attached Statement of Work.</li>
      <li><strong>Fees.</strong> Client agrees to pay fees as invoiced. Taxes (VAT/GST) are client’s responsibility when applicable.</li>
      <li><strong>Timeline.</strong> Work commences upon initial payment and required materials from Client.</li>
      <li><strong>IP & License.</strong> Upon full payment, deliverables are licensed to Client as agreed.</li>
      <li><strong>Confidentiality.</strong> Both parties agree to keep confidential information private.</li>
      <li><strong>Termination.</strong> Either party may terminate with written notice. Fees due for work performed remain payable.</li>
      <li><strong>Governing Law.</strong> This Agreement is governed by applicable law chosen by Contractor.</li>
    </ol>
  `;
}

// Kickoff
window.addEventListener('DOMContentLoaded', App.init);
