/* Minimal HTML→Print PDF (uses browser's native "Save as PDF") */
function exportToPDF(previewEl, filename='document.pdf'){
  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(filename)}</title>
  <style>
    body{margin:0;background:#fff}
    .wrap{padding:24px}
    ${inlinePrintCSS()}
  </style>
</head>
<body>
  <div class="wrap">
    ${previewEl.outerHTML}
  </div>
  <script>
    window.onload = function(){
      setTimeout(function(){
        window.print();
        setTimeout(()=>window.close(), 300);
      }, 250);
    };
  </script>
</body>
</html>`;
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener');
  // Revoke later
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
}

// Keep print CSS minimal to make it self-contained
function inlinePrintCSS(){
  return `
.printable{background:#fff;color:#000;width:auto;max-width:800px;margin:0 auto;box-shadow:none;border-radius:0;padding:0}
.template .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
.template .title{font-size:26px}
.template .idblock{font-size:12px;color:#374151;text-align:right}
.template .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.template .box{border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fff}
.template .label{font-size:12px;color:#6b7280;margin-bottom:4px}
.template table{width:100%;border-collapse:collapse;margin-top:10px}
.template th,.template td{border-bottom:1px solid #e5e7eb;padding:10px;text-align:right}
.template th:nth-child(2), .template td:nth-child(2){text-align:left}
.template tfoot td{font-weight:600}
.template .notes{margin-top:16px;font-size:13px;color:#1f2937}
.template .watermark{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:.08;font-size:100px;transform:rotate(-18deg);color:#0f172a}
.template-modern .box{border-color:#dbeafe;background:#f8fafc}
  `;
}
