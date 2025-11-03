export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!email) return new Response("Missing email", { status: 400 });

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/brand_settings?email=eq.${email}`, {
    headers: {
      apikey: env.SUPABASE_KEY,
      Authorization: `Bearer ${env.SUPABASE_KEY}`,
    },
  });

  const data = await res.json();
  return new Response(JSON.stringify(data[0] || {}), {
    headers: { "Content-Type": "application/json" },
  });
}
