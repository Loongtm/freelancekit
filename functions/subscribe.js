// functions/subscribe.js
// Cloudflare Pages Functions — save email subscriber to Supabase

export async function onRequest(context) {
  const { request, env } = context;

  // --- CORS (允许你站内或将来自定义域访问) ---
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: cors });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }

  // --- 读取环境变量 ---
  const url  = env.SUPABASE_URL;
  const key  = env.SUPABASE_KEY;
  const table = env.SUPABASE_TABLE || "subscribers";

  if (!url || !key) {
    return new Response(JSON.stringify({ error: "Missing Supabase credentials" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }

  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    // --- 基础校验 ---
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // --- 写入 Supabase REST ---
    const endpoint = `${url.replace(/\/+$/,"")}/rest/v1/${table}`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({ email, created_at: new Date().toISOString() })
    });

    // 处理重复订阅（unique 冲突）
    if (resp.status === 409) {
      return new Response(JSON.stringify({ ok: true, message: "Already subscribed" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `Supabase error ${resp.status}: ${txt}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
}
