/* Export HTML → PDF via native print dialog */
function exportToPDF(previewEl, filename = 'document.pdf') {
  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(filename)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
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
        window.focus();
        window.print();
        setTimeout(()=>window.close(), 400);
      }, 250);
    };
  </script>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function inlinePrintCSS(){
  return `
  :root{ --paper-w: 800px; }
  html,body{margin:0;padding:0;background:#fff;color:#000}
  .wrap{padding:24px}
  .printable{background:#fff;color:#000;width:auto;max-width:var(--paper-w);margin:0 auto;box-shadow:none;border-radius:0;padding:0}
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

  /* Page breaks for long docs (optional helper class) */
  .page-break{break-after: page;}

  @page { margin: 16mm; }
  @media print{
    .wrap{padding:0}
  }
  `;
}