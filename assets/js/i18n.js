window.FK_I18N = (function(){
  const LOCALES = {
    en: {
      pwaReady: "PWA ready",
      online: "Online",
      offline: "Offline",
      workflow: "Workflow: Fill → Preview → Export/Save",
      preview: "Preview (Ctrl+P)",
      exportPdf: "Export PDF",
      addItem: "Add Item",
      clearAll: "Clear All",
      notes: "Notes",
      terms: "Terms",
      subtotal: "Subtotal",
      tax: "Tax",
      total: "Total",
      invoiceNumber: "Invoice Number",
      invoiceDate: "Invoice Date",
      dueDate: "Due Date",
      paymentMethod: "Payment Method",
      paidStatus: "Paid Status",
      sellerInfo: "Seller Info",
      clientInfo: "Client Info",
      paidStatusCheckbox: "Marked as Paid",
      description: "Description",
      qty: "Qty",
      amount: "Amount",
      name: "Name",
      address: "Address",
      email: "Email",
      phone: "Phone",
      unlockPro: "Unlock Pro 🔒",
      // Payment options
      bankTransfer: "Bank Transfer",
      creditCard: "Credit Card",
      paypal: "PayPal",
      ewallet: "e-Wallet",
      cash: "Cash",
      other: "Other (Custom)",
    },
    zh: {
      pwaReady: "PWA 就绪",
      online: "在线",
      offline: "离线",
      workflow: "流程：填写 → 预览 → 导出/保存",
      preview: "预览（Ctrl+P）",
      exportPdf: "导出 PDF",
      addItem: "新增项目",
      clearAll: "全部清除",
      notes: "备注",
      terms: "付款条款",
      subtotal: "小计",
      tax: "税额",
      total: "合计",
      invoiceNumber: "发票编号",
      invoiceDate: "开具日期",
      dueDate: "付款截止",
      paymentMethod: "付款方式",
      paidStatus: "已付款状态",
      sellerInfo: "发票开具方",
      clientInfo: "客户信息",
      description: "项目描述",
      qty: "数量",
      amount: "金额",
      name: "名称",
      address: "地址",
      email: "邮箱",
      phone: "电话",
      unlockPro: "解锁 Pro 🔒",
      // 付款方式选项
      bankTransfer: "银行转账",
      creditCard: "信用卡",
      paypal: "PayPal",
      ewallet: "电子钱包",
      cash: "现金",
      other: "其他（自定义）",
    }
  };

  const KEY = 'fk_lang';
  function getLang(){ return localStorage.getItem(KEY) || 'zh'; }
  function setLang(l){ localStorage.setItem(KEY, l); }
  function t(key){
    const lang = getLang();
    return (LOCALES[lang] && LOCALES[lang][key]) || LOCALES['en'][key] || key;
  }
  return { getLang, setLang, t, LOCALES };
})();
