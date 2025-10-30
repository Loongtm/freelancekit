export async function onRequest(context) {
  const kv = context.env.FK_DRAFTS; // 绑定的KV
  if (context.request.method === "POST") {
    const { token, payload } = await context.request.json();
    await kv.put(token, JSON.stringify({ payload, updated: Date.now() }));
    return new Response("ok", { status: 200 });
  }
  const url = new URL(context.request.url);
  const token = url.searchParams.get("token");
  const value = await kv.get(token);
  return new Response(value || "{}", { headers: { "Content-Type": "application/json" } });
}
