/**
 * 1Papi provider integration
 * Base URL: https://www.1papi.com/api/v1
 * Auth: x-api-key header (not Authorization)
 *
 * Endpoints:
 *   GET  /api/v1/plans?network=MTN|TELECEL|AIRTEL_TIGO
 *   POST /api/v1/buy  → returns status:"processing" + poll_url + poll_again_in_seconds:30
 *   GET  /api/v1/status?reference=...  → "pending"|"processing" DB states both return "processing"
 *   GET  /api/v1/balance  → { balance, currency, price_tier, orders:{total,completed,processing,failed,...} }
 */

const BASE_URL = process.env.ONEPAPI_API_URL || "https://www.1papi.com/api/v1";
const API_KEY = process.env.ONEPAPI_API_KEY;

// --- minimal in-process rate limiting (avoid provider 429s) ---
const _windows = new Map();
const _enforceLimit = (key, maxReq, windowMs) => {
  const now = Date.now();
  let w = _windows.get(key);
  if (!w || now > w.resetAt) {
    w = { count: 0, resetAt: now + windowMs };
  }
  if (w.count >= maxReq) {
    const waitSecs = Math.ceil((w.resetAt - now) / 1000);
    const err = new Error(`1Papi rate limit reached. Retry in ${waitSecs}s.`);
    err.code = "ONEPAPI_RATE_LIMIT";
    err.retryAfter = waitSecs;
    throw err;
  }
  w.count++;
  _windows.set(key, w);
};

const request = async (endpoint, options = {}) => {
  if (!API_KEY) {
    throw new Error("ONEPAPI_API_KEY environment variable is not configured");
  }

  const isBuy = endpoint.startsWith("/buy");
  _enforceLimit(
    isBuy ? "onepapi:buy" : "onepapi:general",
    isBuy ? 5 : 30,
    60_000
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  // Avoid bot detection: provide a normal User-Agent.
  const headers = {
    "x-api-key": API_KEY,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      const err = new Error(
        `1Papi returned non-JSON response (HTTP ${response.status})`
      );
      err.status = response.status;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(
        data?.message || `1Papi API error: HTTP ${response.status}`
      );
      err.status = response.status;
      err.providerError = true;
      err.providerData = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeNetwork = (network) => {
  const n = (network || "").toUpperCase().replace(/[\s_-]/g, "");
  if (n === "AIRTELTIGO" || n === "AT") return "AIRTEL_TIGO";
  if (n === "TELECEL") return "TELECEL";
  if (n === "MTN") return "MTN";
  return (network || "").toUpperCase();
};

/**
 * List active data plans with effective account prices.
 * Provider response is grouped by network; we flatten to an array.
 *
 * @param {{ network?: 'MTN'|'TELECEL'|'AIRTEL_TIGO' }} opts
 * @returns {Promise<Array<{id, network, plan_name, data_volume, validity_days, price, volume_mb}>>}
 */
export const fetchPlans = async (opts = {}) => {
  const network = opts.network ? normalizeNetwork(opts.network) : null;
  const endpoint = network
    ? `/plans?network=${encodeURIComponent(network)}`
    : "/plans";

  const res = await request(endpoint, { method: "GET" });

  // Response: { success:true, data:{ plans:[{id, network, plan_name, data_volume, validity_days, price}] } }
  const rawPlans = res?.data?.plans;
  const list = Array.isArray(rawPlans) ? rawPlans : [];

  return list.map((p) => ({
    id: p.id,
    network: normalizeNetwork(p.network),
    plan_name: p.plan_name,
    data_volume: p.data_volume,
    validity_days: p.validity_days,
    price: p.price,
    volume_mb: p.volume_mb ?? parseVolumeMb(p.data_volume),
  }));
};

const parseVolumeMb = (dataVolume) => {
  if (!dataVolume) return null;
  const match = (dataVolume + "").toUpperCase().match(/^(\d+(?:\.\d+)?)\s*(GB|MB)$/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2] === "GB" ? Math.round(val * 1000) : Math.round(val);
};

/**
 * Purchase a data plan.
 *
 * @param {string} phone - 10-digit Ghana number (e.g. "0241234567")
 * @param {number|string} planId - plan.id from /plans
 * @param {string=} webhookUrl - optional HTTPS URL
 */
export const buyData = async (phone, planId, webhookUrl) => {
  const body = {
    phone,
    plan_id: planId,
  };

  if (webhookUrl) {
    body.webhook_url = webhookUrl;
  }

  const res = await request("/buy", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = res?.data || {};
  return {
    success: res?.success,
    message: res?.message,
    status: data.status || (res?.success ? "processing" : "failed"),
    poll_url: data.poll_url ?? null,
    poll_again_in_seconds: data.poll_again_in_seconds ?? null,
    ...data,
  };
};

/**
 * Fetch account balance and order stats from 1Papi.
 * Returns: { balance, currency, price_tier, orders: { total, completed, processing, failed, total_spent, spent_last_30d } }
 */
export const fetchBalance = async () => {
  const res = await request("/balance", { method: "GET" });
  return res?.data ?? res;
};

/**
 * Check order status by reference.
 * Provider maps both "pending" and "processing" DB states to "processing".
 * Also returns: provider, provider_ref, needs_manual, poll_again_in_seconds
 */
export const checkOrderStatus = async (reference) => {
  const res = await request(
    `/status?reference=${encodeURIComponent(reference)}`
  );
  return res?.data ?? res;
};
