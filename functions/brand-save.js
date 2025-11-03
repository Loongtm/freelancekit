export async function onRequestPost(context) {
  const { request, env } = context;
  const { email, data } = await request.json();

  if (!email || !data) {
    return new Response("Missing fields", { status: 400 });
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/brand_settings`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_KEY,
      Authorization: `Bearer ${env.SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ email, data }),
  });

  return new Response(await res.text(), { status: res.status });
}
