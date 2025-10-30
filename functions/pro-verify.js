// functions/pro-verify.js
// Verify Pro license key and issue a signed session token.

async function hmacSHA256(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const b = Array.from(new Uint8Array(sigBuf)).map(x => x.toString(16).padStart(2,"0")).join("");
  return b; // hex string
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: cors() });
  }
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  const { email, key } = await request.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Invalid email" }, 400);
  }
  if (!key || key.length < 8) {
    return json({ error: "Invalid key" }, 400);
  }

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_KEY;
  const TABLE = "pro_keys"; // 固定表名
  const SIGN_SECRET = env.PRO_SIGN_SECRET || "dev-secret-change-me";

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return json({ error: "Missing Supabase credentials" }, 500);
  }

  // 1) 读取该 key
  const selectResp = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?key=eq.${encodeURIComponent(key)}&select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  if (!selectResp.ok) {
    return json({ error: `Supabase read error ${selectResp.status}` }, 500);
  }
  const rows = await selectResp.json();
  if (!rows.length) {
    return json({ error: "Key not found" }, 404);
  }
  const row = rows[0];

  // 2) 如果未绑定邮箱，则绑定；如果已绑定但不是同一邮箱，拒绝
  if (row.assigned_email && row.assigned_email.toLowerCase() !== email.toLowerCase()) {
    return json({ error: "Key already bound to another email" }, 403);
  }
  // 允许重复验证同邮箱（重装设备等）
  const nowISO = new Date().toISOString();
  const upResp = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ assigned_email: email, used_at: nowISO, key }) // 需要设置 row level upsert 条件
  });

  if (!upResp.ok && upResp.status !== 204) {
    // 某些 PostgREST 需要指定条件，改用 RPC 或 update by eq
    const patchByEq = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?key=eq.${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ assigned_email: email, used_at: nowISO })
    });
    if (!patchByEq.ok && patchByEq.status !== 204) {
      return json({ error: `Supabase update error ${patchByEq.status}` }, 500);
    }
  }

  // 3) 签发简易 token：email|ts|sig
  const ts = Date.now().toString();
  const payload = `${email}|${ts}`;
  const sig = await hmacSHA256(SIGN_SECRET, payload);
  const token = b64url(`${payload}|${sig}`);
  return json({ pro: true, token, email });
}

function b64url(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json", ...cors() }
  });
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
