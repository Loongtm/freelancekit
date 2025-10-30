(() => {
  const $ = s => document.querySelector(s);
  const out = $('#out');

  function collect() {
    return {
      seller: $('#seller').value.trim(),
      client: $('#client').value.trim(),
      lang: $('#lang').value,
      currency: $('#currency').value,
      scope: $('#scope').value.trim(),
      deliverables: $('#deliverables').value.trim(),
      notes: $('#notes').value.trim(),
      pricingModel: $('#pricingModel').value,
      tone: $('#tone').value
    };
  }

  async function generate() {
    const payload = collect();
    if (!payload.seller || !payload.client || !payload.scope) {
      alert('Please fill at least Seller, Client and Scope.');
      return;
    }
    out.innerHTML = '⏳ Generating…';
    try {
      const res = await fetch('/functions/ai-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const { html } = await res.json();
      out.classList.remove('muted');
      out.innerHTML = html;
      window.lastQuoteHTML = html; // for preview/export
    } catch (e) {
      console.error(e);
      out.innerHTML = `<span style="color:#ef4444">Failed: ${e.message || e}</span>`;
    }
  }

  function buildPreviewHTML(autoPrint=false) {
    const html = window.lastQuoteHTML || out.innerHTML || '';
    const auto = autoPrint ? `<script>window.print();</script>` : '';
    return `<!doctype html><html><head><meta charset="utf-8">
      <title>Quote Preview</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <link rel="stylesheet" href="/assets/css/print-preview.css">
    </head><body>${html}${auto}</body></html>`;
  }

  function openPreview(auto=false){
    const w = window.open('', '_blank');
    if (!w) return alert('Popup blocked');
    w.document.open(); w.document.write(buildPreviewHTML(auto)); w.document.close();
  }

  $('#gen').addEventListener('click', generate);
  $('#preview').addEventListener('click', () => openPreview(false));
  $('#export').addEventListener('click', () => openPreview(true));
})();
