const LUNO_BASE = "https://api.luno.com";

export async function lunoRequest(path, { method = "GET", params, keyId, keySecret } = {}) {
  const auth = btoa(`${keyId}:${keySecret}`);
  const headers = { Authorization: `Basic ${auth}` };
  let url = `${LUNO_BASE}${path}`;
  if (params) url += "?" + new URLSearchParams(params).toString();
  const res = await fetch(url, { method, headers });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* non-JSON response */
  }
  if (!res.ok) {
    const msg = data.error || data.message || `Luno API error ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}