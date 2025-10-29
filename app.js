/* FreelanceKit – clean UX:
   - No red borders on load
   - Live remove red on input/focus
   - Smooth theme switch
   - Bigger logo also in preview (inline favicon)
*/
(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const byId = (id) => document.getElementById(id);

  /* Theme (light default) + smooth */
  const THEME_KEY='fk_theme';
  const getTheme=()=>localStorage.getItem(THEME_KEY)||'light';
  const setTheme=(v)=>{
    document.documentElement.classList.add('theme-x');
    setTimeout(()=>document.documentElement.classList.remove('theme-x'), 280);
    localStorage.setItem(THEME_KEY,v);
    document.documentElement.setAttribute('data-theme', v==='dark'?'dark':'light');
  };
  setTheme(getTheme());
  const themeBtn=byId('themeToggle');
  if(themeBtn){
    const sync=()=>themeBtn.textContent=getTheme()==='dark'?'🌙':'🌞';
    sync();
    themeBtn.addEventListener('click',()=>{ setTheme(getTheme()==='dark'?'light':'dark'); sync(); });
  }

  /* I18N */
  const I18N={en:{pwaReady:"PWA ready",online:"Online",offline:"Offline",install:"Install",unlockPro:"Unlock Pro",workflow:"Workflow: Fill → Preview → Export/Save",yourDetails:"Your Details",businessName:"Business / Name",email:"Email",address:"Address",phone:"Phone",clientDetails:"Client Details",clientName:"Client Name",clientEmail:"Client Email",clientAddress:"Client Address",clientRef:"PO / Reference",document:"Document",type:"Type",invoice:"Invoice",quote:"Quote",contract:"Contract",docNo:"Document No.",date:"Date",currency:"Currency",tax:"Tax %",load:"Load JSON",save:"Save JSON",importPro:"Import Clients CSV (Pro)",lineItems:"Line Items",description:"Description",qty:"Qty",unitPrice:"Unit Price",amount:"Amount",addItem:"Add Item",clearAll:"Clear All",notesTerms:"Notes & Terms",notes:"Notes",terms:"Terms",subtotal:"Subtotal",totalTax:"Tax",total:"Total",preview:"Preview (Ctrl+P)",export:"Export PDF",plsAddItem:"Please add at least one line item",fixFields:"Fix highlighted fields",saved:"Saved JSON",useDialog:"Use system dialog to save as PDF",from:"From",billTo:"Bill To",unit:"Unit"},
            zh:{pwaReady:"PWA 就绪",online:"在线",offline:"离线",install:"安装",unlockPro:"解锁 Pro",workflow:"流程：填写 → 预览 → 导出/保存",yourDetails:"你的信息",businessName:"单位 / 名称",email:"邮箱",address:"地址",phone:"电话",clientDetails:"客户信息",clientName:"客户名称",clientEmail:"客户邮箱",clientAddress:"客户地址",clientRef:"采购单号 / 参考",document:"单据",type:"类型",invoice:"发票",quote:"报价单",contract:"合同",docNo:"单据编号",date:"日期",currency:"币种",tax:"税率 %",load:"导入 JSON",save:"保存 JSON",importPro:"导入客户 CSV（Pro）",lineItems:"项目明细",description:"项目描述",qty:"数量",unitPrice:"单价",amount:"金额",addItem:"新增行",clearAll:"清空",notesTerms:"备注与条款",notes:"备注",terms:"条款",subtotal:"小计",totalTax:"税额",total:"合计",preview:"预览（Ctrl+P）",export:"导出 PDF",plsAddItem:"请至少添加一行项目",fixFields:"请修正高亮字段",saved:"已保存 JSON",useDialog:"在系统对话框中保存为 PDF",from:"发件方",billTo:"收件方",unit:"单价"}};
  const LANG_KEY='fk_lang', getLang=()=>localStorage.getItem(LANG_KEY)||'zh', setLang=(v)=>localStorage.setItem(LANG_KEY,v);
  const t=()=>I18N[getLang()]||I18N.en;
  const langSel=byId('langSwitcher');
  const applyI18n=()=>{ $$('[data-i18n]').forEach(el=>{const k=el.dataset.i18n; if(k&&t()[k]) el.textContent=t()[k];}); const ns=byId('net-state'); if(ns) ns.textContent=navigator.onLine?t().online:t().offline; };
  if(langSel){ langSel.value=getLang(); langSel.addEventListener('change',()=>{ setLang(langSel.value); applyI18n(); }); }
  applyI18n();

  /* Toast & network */
  const toasts=byId('toasts'); const toast=(m)=>{ if(!toasts) return; const el=document.createElement('div'); el.className='toast'; el.textContent=m; toasts.appendChild(el); setTimeout(()=>el.remove(),2200); };
  const netState=byId('net-state'), pwaState=byId('pwa-state'), installBtn=byId('installPWA');
  const setNet=()=>netState&&(netState.textContent=navigator.onLine?t().online:t().offline);
  setNet(); addEventListener('online',setNet); addEventListener('offline',setNet);
  let deferredPrompt=null; addEventListener('beforeinstallprompt',(e)=>{e.preventDefault(); deferredPrompt=e; pwaState&&(pwaState.textContent='Installable'); installBtn&&(installBtn.style.display='inline-flex');});
  if(installBtn){ installBtn.style.display='none'; installBtn.addEventListener('click',async()=>{ if(!deferredPrompt){toast('Already installed / not installable'); return;} deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; }); }

  /* Pro dialog */
  const proDlg=byId('proDlg'), proClose=byId('proClose'), buyProBtn=byId('buyPro');
  const openPro=(e)=>{if(e)e.preventDefault(); if(!proDlg)return; proDlg.style.display='flex'; proDlg.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';};
  const closePro=()=>{if(!proDlg)return; proDlg.style.display='none'; proDlg.setAttribute('aria-hidden','true'); document.body.style.overflow='';};
  buyProBtn&&buyProBtn.addEventListener('click',openPro); proClose&&proClose.addEventListener('click',closePro);
  proDlg&&proDlg.addEventListener('click',(e)=>{ if(e.target===proDlg) closePro(); });

  /* Elements */
  const yourName=byId('yourName'), yourEmail=byId('yourEmail'), yourAddress=byId('yourAddress'), yourPhone=byId('yourPhone');
  const clientName=byId('clientName'), clientEmail=byId('clientEmail'), clientAddress=byId('clientAddress'), clientRef=byId('clientRef');
  const docType=byId('docType'), docNo=byId('docNo'), docDate=byId('docDate'), currency=byId('currency'), taxRate=byId('taxRate');
  const lineItemsWrap=byId('lineItems'), addItemBtn=byId('addItem'), clearItemsBtn=byId('clearItems');
  const subtotalEl=byId('subtotal'), taxAmountEl=byId('taxAmount'), grandTotalEl=byId('grandTotal');
  const loadJsonBtn=byId('loadJson'), saveJsonBtn=byId('saveJson'), importCSVBtn=byId('importClientsCSV');
  const previewBtn=byId('previewPDF'), exportBtn=byId('exportPDF');

  /* Helpers */
  const setInvalid=(el,bad)=>el&&el.setAttribute('aria-invalid', bad?'true':'false');
  const parseNum=(v)=>{if(typeof v==='number')return v; const x=Number(String(v||'').replace(/,/g,'')); return isFinite(x)?x:0;};
  const moneyMask=(el)=>el&&el.addEventListener('blur',()=>{const n=Math.max(0,parseNum(el.value)); el.value=n.toFixed(2);});
  const percentMask=(el)=>el&&el.addEventListener('blur',()=>{let n=parseNum(el.value); if(n<0)n=0;if(n>100)n=100; el.value=String(n).replace(/\.00$/,'');});
  const fmt=(v)=>{const cur=currency?.value||'MYR'; try{return new Intl.NumberFormat(getLang()==='zh'?'zh-CN':undefined,{style:'currency',currency:cur}).format(v||0);}catch{return (v||0).toFixed(2)+' '+cur;}};

  // 实时输入时清除红框；初始不标红
  $$('input,textarea,select').forEach(el=>{
    el.addEventListener('input',()=>setInvalid(el,!el.checkValidity()));
    el.addEventListener('blur', ()=>setInvalid(el,!el.checkValidity()));
    el.addEventListener('focus',()=>setInvalid(el,false));
  });

  /* Items */
  const newRow=(data={})=>{
    const row=document.createElement('div'); row.className='item-row';
    row.innerHTML=`
      <input class="item-desc" placeholder="Design service — homepage" value="${data.desc||''}">
      <input class="item-qty"  inputmode="decimal" placeholder="1" value="${data.qty??''}">
      <input class="item-price" inputmode="decimal" placeholder="0.00" value="${data.price??''}">
      <input class="item-tax" inputmode="decimal" placeholder="${taxRate?.value||0}">
      <div class="item-amount" aria-label="row amount">—</div>
      <button class="item-del" title="Remove" aria-label="Remove line">✕</button>`;
    const qty=$('.item-qty',row), price=$('.item-price',row), rowTax=$('.item-tax',row), amount=$('.item-amount',row), del=$('.item-del',row);
    const recalc=()=>{const q=Math.max(0,parseNum(qty.value||0)), p=Math.max(0,parseNum(price.value||0)); const t=rowTax.value===''?parseNum(taxRate?.value||0):Math.min(100,Math.max(0,parseNum(rowTax.value))); const base=q*p; const tx=base*(t/100); amount.textContent=fmt(base+tx); updateTotals();};
    [qty,price].forEach(moneyMask); [rowTax].forEach(percentMask);
    [qty,price,rowTax].forEach(el=>el.addEventListener('input',recalc));
    del.addEventListener('click',()=>{ if(!confirm('Remove this line?')) return; row.remove(); updateTotals(); });
    recalc(); return row;
  };
  const addRow=(d)=>{ if(!lineItemsWrap) return; lineItemsWrap.appendChild(newRow(d)); };
  const clearRows=()=>{ if(!lineItemsWrap||lineItemsWrap.children.length===0) return; if(!confirm('Clear all line items?')) return; lineItemsWrap.innerHTML=''; updateTotals(); };
  addItemBtn&&addItemBtn.addEventListener('click',()=>addRow());
  clearItemsBtn&&clearItemsBtn.addEventListener('click', clearRows);

  const updateTotals=()=>{ if(!lineItemsWrap) return; let subtotal=0,tax=0,globalT=parseNum(taxRate?.value||0);
    $$('.item-row').forEach(row=>{const q=parseNum($('.item-qty',row)?.value||0), p=parseNum($('.item-price',row)?.value||0); const rowT=$('.item-tax',row)?.value; const t=rowT===''?globalT:parseNum(rowT); const base=q*p; subtotal+=base; tax+=base*(Math.min(100,Math.max(0,t))/100);});
    subtotalEl&&(subtotalEl.textContent=fmt(subtotal)); taxAmountEl&&(taxAmountEl.textContent=fmt(tax)); grandTotalEl&&(grandTotalEl.textContent=fmt(subtotal+tax));
  };
  taxRate&&percentMask(taxRate); taxRate&&taxRate.addEventListener('input',updateTotals);
  currency&&currency.addEventListener('change', updateTotals);

  /* Validate on demand only */
  const validateCore=()=>{let ok=true;
    [yourName,yourEmail,clientName,docType,docNo,docDate,currency].forEach(el=>{if(!el)return; const v=el.checkValidity(); setInvalid(el,!v); ok=ok&&v;});
    if(!lineItemsWrap||lineItemsWrap.children.length===0){ alert(t().plsAddItem); ok=false; }
    return ok;
  };

  /* JSON I/O */
  const serialize=()=>{const rows=$$('.item-row').map(row=>({desc:$('.item-desc',row)?.value||'', qty:parseNum($('.item-qty',row)?.value||0), price:parseNum($('.item-price',row)?.value||0), tax:$('.item-tax',row)?.value})); return {meta:{version:1}, your:{name:yourName?.value,email:yourEmail?.value,address:yourAddress?.value||'',phone:yourPhone?.value||''}, client:{name:clientName?.value,email:clientEmail?.value||'',address:clientAddress?.value||'',ref:clientRef?.value||''}, doc:{type:docType?.value,no:docNo?.value,date:docDate?.value,currency:currency?.value,taxRate:taxRate?.value}, rows, notes:byId('notes')?.value||'', terms:byId('terms')?.value||''};};
  const hydrate=(d)=>{ try{
    yourName&&(yourName.value=d.your?.name||''); yourEmail&&(yourEmail.value=d.your?.email||''); yourAddress&&(yourAddress.value=d.your?.address||''); yourPhone&&(yourPhone.value=d.your?.phone||'');
    clientName&&(clientName.value=d.client?.name||''); clientEmail&&(clientEmail.value=d.client?.email||''); clientAddress&&(clientAddress.value=d.client?.address||''); clientRef&&(clientRef.value=d.client?.ref||'');
    docType&&(docType.value=d.doc?.type||'invoice'); docNo&&(docNo.value=d.doc?.no||''); docDate&&(docDate.value=d.doc?.date||''); currency&&(currency.value=d.doc?.currency||'MYR'); taxRate&&(taxRate.value=d.doc?.taxRate??'');
    if(lineItemsWrap){lineItemsWrap.innerHTML=''; (d.rows||[]).forEach(r=>addRow(r));}
    byId('notes')&&(byId('notes').value=d.notes||''); byId('terms')&&(byId('terms').value=d.terms||'');
    updateTotals();
    $$('input,textarea,select').forEach(el=>setInvalid(el,false)); // 清掉历史红框
    alert('Data loaded');
  }catch(e){ alert('Invalid JSON'); }};
  saveJsonBtn&&saveJsonBtn.addEventListener('click',()=>{const data=serialize(); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${data.doc?.type||'document'}-${data.doc?.no||'draft'}.json`; a.click(); alert(t().saved);});
  loadJsonBtn&&loadJsonBtn.addEventListener('click',()=>{const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json'; inp.onchange=async()=>{const f=inp.files?.[0]; if(!f) return; const txt=await f.text(); hydrate(JSON.parse(txt));}; inp.click();});
  importCSVBtn&&importCSVBtn.addEventListener('click',()=>alert('Clients CSV import is a Pro feature'));

  /* Preview / Export with inline logo+favicon */
  const LOGO_SVG = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#2563eb'/><stop offset='1' stop-color='#1e40af'/></linearGradient></defs><rect x='4' y='4' width='56' height='56' rx='14' ry='14' fill='url(#g)'/><g fill='#fff'><rect x='14' y='20' width='30' height='8' rx='4'/><rect x='14' y='34' width='22' height='8' rx='4'/><circle cx='46' cy='38' r='6'/></g></svg>`);
  const buildPrintHTML=(autoPrint=false)=>{
    const d=serialize(), lang=getLang(), tt=t();
    const rowsHtml=$$('.item-row').map(row=>{
      const ds=$('.item-desc',row)?.value||''; const q=$('.item-qty',row)?.value||''; const p=$('.item-price',row)?.value||''; const tx=$('.item-tax',row)?.value||''; const amt=$('.item-amount',row)?.textContent||'';
      return `<tr><td>${ds}</td><td class="r">${q}</td><td class="r">${p}</td><td class="r">${tx}</td><td class="r">${amt}</td></tr>`;
    }).join('');
    const script=autoPrint?`<script>addEventListener('load',()=>print(),{once:true})<\/script>`:'';
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<link rel="icon" href="data:image/svg+xml;utf8,${LOGO_SVG}">
<title>${(d.doc?.type||'Document').toUpperCase()} ${d.doc?.no||''}</title>
<style>
  :root{--ink:#111;--muted:#666}
  body{font:14px/1.6 system-ui,Segoe UI,Roboto,Arial;padding:28px;color:var(--ink)}
  header{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .left{display:flex;align-items:center;gap:10px}
  .left img{width:32px;height:32px}
  h1{font-size:20px;margin:0}
  .muted{color:var(--muted)}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0 16px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{border:1px solid #ddd;padding:6px} th{background:#f3f4f6;text-align:left}
  .r{text-align:right} tfoot td{font-weight:bold}
  footer{margin-top:40px;color:#666;font-size:12px}
  a{color:#0b57d0}
</style></head><body>
  <header>
    <div class="left"><img alt="" src="data:image/svg+xml;utf8,${LOGO_SVG}"><h1>${(d.doc?.type||'Document').toUpperCase()} ${d.doc?.no||''}</h1></div>
    <div class="muted">${d.doc?.date||''} • ${d.doc?.currency||''}</div>
  </header>
  <div class="grid">
    <div><div class="muted">${tt.from}</div><div>${d.your?.name||''}</div><div>${d.your?.email||''}</div><div>${d.your?.address||''}</div><div>${d.your?.phone||''}</div></div>
    <div><div class="muted">${tt.billTo}</div><div>${d.client?.name||''}</div><div>${d.client?.email||''}</div><div>${d.client?.address||''}</div><div>Ref: ${d.client?.ref||'-'}</div></div>
  </div>
  <table>
    <thead><tr><th>${tt.description}</th><th class="r">${tt.qty}</th><th class="r">${tt.unit}</th><th class="r">${tt.tax}</th><th class="r">${tt.amount}</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr><td colspan="4" class="r">${tt.subtotal}</td><td class="r">${byId('subtotal')?.textContent||''}</td></tr>
      <tr><td colspan="4" class="r">${tt.totalTax}</td><td class="r">${byId('taxAmount')?.textContent||''}</td></tr>
      <tr><td colspan="4" class="r">${tt.total}</td><td class="r">${byId('grandTotal')?.textContent||''}</td></tr>
    </tfoot>
  </table>
  <p><strong>${tt.notes}</strong><br>${byId('notes')?.value||'-'}</p>
  <p><strong>${tt.terms}</strong><br>${byId('terms')?.value||'-'}</p>
  <footer><hr><p>Made with FreelanceKit — Contact: <a href="mailto:tmloong0128@gmail.com">tmloong0128@gmail.com</a></p></footer>
  ${script}
</body></html>`;
  };
  const openHtml=(html)=>{const blob=new Blob([html],{type:'text/html'}); const url=URL.createObjectURL(blob); const w=window.open(url,'_blank'); if(!w){alert('Popup blocked'); URL.revokeObjectURL(url); return;} setTimeout(()=>URL.revokeObjectURL(url),10000);};
  previewBtn&&previewBtn.addEventListener('click',()=>{ if(!validateCore()) return; openHtml(buildPrintHTML(false)); });
  exportBtn&&exportBtn.addEventListener('click',()=>{ if(!validateCore()) return; openHtml(buildPrintHTML(true)); alert(t().useDialog); });

  /* Keys */
  addEventListener('keydown',(e)=>{const m=(e.ctrlKey||e.metaKey); if(m&&e.key.toLowerCase()==='p'){e.preventDefault(); previewBtn?.click();} if(m&&e.key.toLowerCase()==='s'){e.preventDefault(); saveJsonBtn?.click();}});

  /* Boot */
  if(byId('lineItems')?.children.length===0) addRow({qty:1,price:0});
  updateTotals();
})();
