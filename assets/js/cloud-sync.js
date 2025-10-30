// Simple cloud sync helper (can work with Supabase or Cloudflare Worker)
const CloudSync = (() => {
  const ENDPOINT = "/functions/sync";   // 你在Cloudflare配置的worker路径
  const KEY = "fk_sync_token";

  function getToken() {
    let t = localStorage.getItem(KEY);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(KEY, t);
    }
    return t;
  }

  async function saveDraft(data) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: getToken(), payload: data })
      });
      return res.ok;
    } catch (e) {
      console.error("Sync error:", e);
      return false;
    }
  }

  async function loadDraft() {
    try {
      const res = await fetch(`${ENDPOINT}?token=${getToken()}`);
      if (!res.ok) return null;
      const j = await res.json();
      return j.payload || null;
    } catch (e) {
      console.error("Load error:", e);
      return null;
    }
  }

  return { saveDraft, loadDraft, getToken };
})();
