// Cloudflare Function: subscribe.js
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) return new Response('Invalid email', { status: 400 });

    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/${env.SUPABASE_TABLE}`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ email, created_at: new Date().toISOString() })
    });

    if (!resp.ok) throw new Error(await resp.text());
    return new Response('ok', { status: 200 });
  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}
