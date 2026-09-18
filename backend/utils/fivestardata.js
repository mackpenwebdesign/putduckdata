/**
 * 5stardata.site provider integration
 * Base URL: https://api.5stardata.site/api/v1
 * Auth: Authorization: Bearer <key>  (same key as ONEPAPI_API_KEY)
 *
 * Endpoints:
 *   GET  /api/v1/plans                → active data plans with reseller pricing
 *   POST /api/v1/buy                  → returns status:"completed"|"pending_manual" + reference
 *   GET  /api/v1/status?reference=... → "completed"|"pending_manual"|"failed"
 *   GET  /api/v1/balance              → { balance, currency, ... }
 *   PUT  /api/api-keys                → { webhook_url } — set once in the account
 */

const BASE_URL =
  process.env.FIVESTARDATA_API_URL || "https://api.5stardata.site/api/v1";
const API_KEY = process.env.ONEPAPI_API_KEY;

// --- minimal in-process rate limiting ---
const _windows = new Map();
const _enforceLimit = (key, maxReq, windowMs) => {
  const now = Date.now();
  let w = _windows.get(key);
  if (!w || now > w.resetAt) {
    w = { count: 0, resetAt: now + windowMs };
  }
  if (w.count >= maxReq) {
    const waitSecs = Math.ceil((w.resetAt - now) / 1000);
    const err = new Error(`5stardata rate limit reached. Retry in ${waitSecs}s.`);
    err.code = "FIVESTARDATA_RATE_LIMIT";
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
    isBuy ? "fivestardata:buy" : "fivestardata:general",
    isBuy ? 5 : 30,
    60_000
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
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
        `5stardata returned non-JSON response (HTTP ${response.status})`
      );
      err.status = response.status;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(
        data?.message || `5stardata API error: HTTP ${response.status}`
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
  if (n === "TELECEL" || n === "VODAFONE") return "TELECEL";
  if (n === "MTN") return "MTN";
  return (network || "").toUpperCase();
};

const parseVolumeMb = (dataVolume) => {
  if (!dataVolume) return null;
  const match = (dataVolume + "").toUpperCase().match(/^(\d+(?:\.\d+)?)\s*(GB|MB)$/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2] === "GB" ? Math.round(val * 1000) : Math.round(val);
};

/**
 * List active data plans.
 * @param {{ network?: 'MTN'|'TELECEL'|'AIRTEL_TIGO' }} opts
 */
export const fetchPlans = async (opts = {}) => {
  const network = opts.network ? normalizeNetwork(opts.network) : null;
  const endpoint = network
    ? `/plans?network=${encodeURIComponent(network)}`
    : "/plans";

  const res = await request(endpoint, { method: "GET" });

  // Handle both { data: { plans: [...] } } and { data: [...] } and flat [...]
  let list = [];
  if (Array.isArray(res?.data?.plans)) {
    list = res.data.plans;
  } else if (Array.isArray(res?.data)) {
    list = res.data;
  } else if (Array.isArray(res)) {
    list = res;
  }

  return list.map((p) => ({
    id: p.id,
    network: normalizeNetwork(p.network),
    plan_name: p.plan_name || p.name || `${p.data_volume} ${p.network}`,
    data_volume: p.data_volume,
    validity_days: p.validity_days,
    price: p.price,
    volume_mb: p.volume_mb ?? parseVolumeMb(p.data_volume),
  }));
};

/**
 * Purchase a data plan.
 * Note: webhook URL is configured once at account level, not per-request.
 *
 * @param {string} phone - 10-digit Ghana number
 * @param {number|string} planId - plan.id from /plans
 * @returns status: "completed" | "pending_manual"
 */
export const buyData = async (phone, planId) => {
  const body = { phone, plan_id: planId };

  const res = await request("/buy", {
    method: "POST",
    body: JSON.stringify(body),
  });

  // Response may be flat: { status, reference, data_volume, network, phone }
  // or wrapped: { success, data: { status, reference, ... } }
  const data = res?.data || res || {};
  const status = data.status || res?.status || (res?.success ? "pending_manual" : "failed");
  const reference = data.reference || res?.reference || null;

  return {
    success: res?.success ?? (status !== "failed"),
    message: res?.message || data.message || null,
    status,
    reference,
    data_volume: data.data_volume || res?.data_volume || null,
    network: data.network || res?.network || null,
  };
};

/**
 * Fetch account balance.
 */
export const fetchBalance = async () => {
  const res = await request("/balance", { method: "GET" });
  return res?.data ?? res;
};

/**
 * Check order status by reference.
 * Returns status: "completed" | "pending_manual" | "failed"
 */
export const checkOrderStatus = async (reference) => {
  const res = await request(
    `/status?reference=${encodeURIComponent(reference)}`
  );
  return res?.data ?? res;
};

/**
 * Set the webhook URL for this account (call once from admin).
 */
export const setWebhookUrl = async (webhookUrl) => {
  if (!API_KEY) {
    throw new Error("ONEPAPI_API_KEY environment variable is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${BASE_URL.replace("/api/v1", "")}/api/api-keys`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ webhook_url: webhookUrl }),
      signal: controller.signal,
    });
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};
