import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// Load .env — try multiple paths for compatibility
const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "../../.env") }); // from backend/api/ → root
dotenv.config({ path: join(process.cwd(), "../.env") }); // fallback: cwd/../.env
dotenv.config({ path: join(process.cwd(), ".env") }); // fallback: cwd/.env

import express from "express";

// ── Handler imports ─────────────────────────────────────────────────────────
import { handler as authLogin } from "../handlers/auth-login.js";
import { handler as authRegister } from "../handlers/auth-register.js";
import { handler as authLogout } from "../handlers/auth-logout.js";
import { handler as authVerify } from "../handlers/auth-verify.js";
import { handler as tokenRefresh } from "../handlers/token-refresh.js";

import { handler as profileGet } from "../handlers/profile-get.js";
import { handler as profileUpdate } from "../handlers/profile-update.js";
import { handler as passwordChange } from "../handlers/password-change.js";
import { handler as passwordForgot } from "../handlers/password-forgot.js";
import { handler as passwordReset } from "../handlers/password-reset.js";
import { handler as adminPassReset } from "../handlers/admin-password-reset.js";

import { handler as walletBalance } from "../handlers/wallet-balance.js";

import { handler as txHistory } from "../handlers/transactions-history.js";
import { handler as txDelete } from "../handlers/transactions-delete.js";

import { handler as notifGet } from "../handlers/notifications-get.js";
import { handler as notifMarkRead } from "../handlers/notifications-mark-read.js";

import { handler as dataPlans } from "../handlers/data-plans.js";
import { handler as dataPurchase } from "../handlers/data-purchase.js";
import { handler as buyData } from "../handlers/buy-data.js";
import { handler as guestPurchase } from "../handlers/guest-purchase.js";
import { handler as guestTrack } from "../handlers/guest-order-track.js";
import { handler as orderStatus } from "../handlers/order-status-check.js";
import { handler as guestOrderStatusCheck } from "../handlers/guest-order-status-check.js";
import { handler as onepapiWebhook } from "../handlers/1papi-webhook.js";

import { handler as paymentInit } from "../handlers/payment-initialize.js";
import { handler as paymentVerify } from "../handlers/payment-verify.js";
import { handler as paystackWebhook } from "../handlers/paystack-webhook.js";
import { handler as paymentWebhook } from "../handlers/payment-webhook.js";

import { handler as getAds } from "../handlers/get-ads.js";
import { handler as manageAd } from "../handlers/manage-ad.js";
import { handler as publishAd } from "../handlers/publish-ad.js";
import { handler as momoSubmit } from "../handlers/momo-payment-submit.js";

import { handler as healthCheck } from "../handlers/health.js";

import { handler as adminBroadcast } from "../handlers/admin-broadcast.js";
import { handler as adminFundWallet } from "../handlers/admin-fund-wallet.js";
import { handler as adminUsers } from "../handlers/admin-users-manage.js";
import { handler as adminPlans } from "../handlers/admin-plans-manage.js";
import { handler as adminOrders } from "../handlers/admin-orders.js";
import { handler as adminSettings } from "../handlers/admin-site-settings.js";
import { handler as adminMomo } from "../handlers/admin-momo-manage.js";
import { handler as adminProvider } from "../handlers/admin-provider.js";
import { handler as getBroadcasts } from "../handlers/get-broadcasts.js";
import { handler as getAnalytics } from "../handlers/get-analytics.js";
import { handler as autoSyncPlans } from "../handlers/auto-sync-plans.js";
import { handler as trackVisit } from "../handlers/track-visit.js";
import { handler as guestAfaMomo } from "../handlers/guest-afa-momo-submit.js";
import { handler as getPurchaseList } from "../handlers/get-purchase-list.js";
import { handler as guestAfa } from "../handlers/guest-afa.js";
import { handler as guestAfaComplete } from "../handlers/guest-afa-complete.js";

// Reseller
import { handler as resellerActivate } from "../handlers/reseller-activate.js";
import { handler as resellerStats } from "../handlers/reseller-stats.js";
import { handler as resellerSetPricing } from "../handlers/reseller-set-pricing.js";
import { handler as resellerSetPricingBatch } from "../handlers/reseller-set-pricing-batch.js";
import { handler as resellerGetPricing } from "../handlers/reseller-get-pricing.js";
import { handler as resellerCustomers } from "../handlers/reseller-customers.js";
import { handler as resellerLeaderboard } from "../handlers/reseller-leaderboard.js";
import { handler as resellerBranding } from "../handlers/reseller-branding.js";
import { handler as withdrawalRequest } from "../handlers/withdrawal-request.js";
import { handler as withdrawalHistory } from "../handlers/withdrawal-history.js";
import { handler as adminResellerStats } from "../handlers/admin-reseller-stats.js";
import { handler as adminResellerPricing } from "../handlers/admin-reseller-pricing.js";

// AFA
import { handler as afaRegistration } from "../handlers/afa-registration.js";
import { handler as afaFormSubmit } from "../handlers/afa-form-submit.js";
import { handler as adminAfaComplete } from "../handlers/admin-afa-complete.js";

// ── Express app ──────────────────────────────────────────────────────────────
const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://putduckdata.com";

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow configured origin + localhost in development
  const allowed =
    origin === ALLOWED_ORIGIN ||
    (process.env.NODE_ENV !== "production" &&
      origin?.startsWith("http://localhost"));

  if (allowed) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400"); // preflight cached 24h

  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// ── Body parsers ──────────────────────────────────────────────────────────────
// Raw body for webhook signature verification - must come BEFORE express.json()
app.use("/api/paystack-webhook", express.raw({ type: "*/*" }));
app.use("/api/payment-webhook", express.raw({ type: "*/*" }));

// JSON for everything else (10kb limit to block oversized payloads)
app.use(express.json({ limit: "10kb" }));

// ── Adapter ───────────────────────────────────────────────────────────────────
// Converts Netlify-style handler (event) => { statusCode, body }
// into Express middleware (req, res) => res.status().json()
const wrap =
  (handler, { rawBody = false } = {}) =>
  async (req, res) => {
    try {
      const event = {
        httpMethod: req.method,
        headers: req.headers,
        // Raw body routes get Buffer; everything else gets re-serialized JSON
        body: rawBody
          ? Buffer.isBuffer(req.body)
            ? req.body.toString()
            : String(req.body ?? "")
          : req.body != null
          ? JSON.stringify(req.body)
          : null,
        queryStringParameters: req.query ?? {},
        pathParameters: req.params ?? {},
      };

      const result = await handler(event);

      // Parse body if it came back as a string (all current handlers do this)
      const payload =
        typeof result.body === "string" ? JSON.parse(result.body) : result.body;

      res.status(result.statusCode).json(payload);
    } catch (err) {
      console.error(`[${req.method}] ${req.path} →`, err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  };

// ── Routes ────────────────────────────────────────────────────────────────────

// Auth
app.post("/api/auth-login", wrap(authLogin));
app.post("/api/auth-register", wrap(authRegister));
app.post("/api/auth-logout", wrap(authLogout));
app.get("/api/auth-verify", wrap(authVerify));
app.post("/api/token-refresh", wrap(tokenRefresh));

// Profile & password
app.get("/api/profile-get", wrap(profileGet));
app.put("/api/profile-update", wrap(profileUpdate));
app.post("/api/password-change", wrap(passwordChange));
app.post("/api/password-forgot", wrap(passwordForgot));
app.post("/api/password-reset", wrap(passwordReset));
app.post("/api/admin-password-reset", wrap(adminPassReset));

// Wallet
app.get("/api/wallet-balance", wrap(walletBalance));

// Transactions
app.get("/api/transactions-history", wrap(txHistory));
app.delete("/api/transactions-delete", wrap(txDelete));

// Notifications
app.get("/api/notifications-get", wrap(notifGet));
app.put("/api/notifications-mark-read", wrap(notifMarkRead));

// Data plans & purchases
app.get("/api/data-plans", wrap(dataPlans));
app.post("/api/data-purchase", wrap(dataPurchase));
app.post("/api/buy-data", wrap(buyData));
app.post("/api/guest-purchase", wrap(guestPurchase));
app.get("/api/guest-order-track", wrap(guestTrack));
app.post("/api/order-status-check", wrap(orderStatus));
app.post("/api/guest-order-status-check", wrap(guestOrderStatusCheck));
app.post("/api/1papi-webhook", wrap(onepapiWebhook));

// Payments
app.post("/api/payment-initialize", wrap(paymentInit));
app.get("/api/payment-verify", wrap(paymentVerify));
app.post("/api/paystack-webhook", wrap(paystackWebhook, { rawBody: true }));
app.post("/api/payment-webhook", wrap(paymentWebhook, { rawBody: true }));

// Ads & MoMo
app.get("/api/get-ads", wrap(getAds));
app.all("/api/manage-ad", wrap(manageAd));
app.post("/api/publish-ad", wrap(publishAd));
app.post("/api/momo-payment-submit", wrap(momoSubmit));

// Health — cache 30 s, reduces invocations for uptime monitors
app.get(
  "/api/health",
  (req, res, next) => {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );
    next();
  },
  wrap(healthCheck)
);

// Admin
app.post("/api/admin-broadcast", wrap(adminBroadcast));
app.get("/api/broadcasts-active", wrap(getBroadcasts));
app.post("/api/admin-fund-wallet", wrap(adminFundWallet));
app.all("/api/admin-users-manage", wrap(adminUsers));
app.all("/api/admin-plans-manage", wrap(adminPlans));
app.all("/api/admin-orders", wrap(adminOrders));
app.all("/api/admin-site-settings", wrap(adminSettings));
app.all("/api/admin-momo-manage", wrap(adminMomo));
app.all("/api/admin-provider", wrap(adminProvider));
app.get("/api/get-analytics", wrap(getAnalytics));
app.get("/api/get-purchase-list", wrap(getPurchaseList));
app.get("/api/auto-sync-plans", wrap(autoSyncPlans));

// Reseller
app.post("/api/reseller-activate", wrap(resellerActivate));
app.get("/api/reseller-stats", wrap(resellerStats));
app.post("/api/reseller-set-pricing", wrap(resellerSetPricing));
app.post("/api/reseller-set-pricing-batch", wrap(resellerSetPricingBatch));
app.get("/api/reseller-get-pricing", wrap(resellerGetPricing));
app.get("/api/reseller-customers", wrap(resellerCustomers));
app.get("/api/reseller-leaderboard", wrap(resellerLeaderboard));
app.all("/api/reseller-branding", wrap(resellerBranding));
app.post("/api/withdrawal-request", wrap(withdrawalRequest));
app.get("/api/withdrawal-history", wrap(withdrawalHistory));
app.all("/api/admin-reseller-stats", wrap(adminResellerStats));
app.all("/api/admin-reseller-pricing", wrap(adminResellerPricing));

// Visitor tracking — public, no auth required
app.post("/api/track-visit", wrap(trackVisit));

// Guest AFA MoMo order (partner shop, no auth required)
app.post("/api/guest-afa-momo", wrap(guestAfaMomo));

// AFA Registration
app.get("/api/afa-registration", wrap(afaRegistration));
app.post("/api/afa-registration", wrap(afaRegistration));
app.post("/api/afa-form-submit", wrap(afaFormSubmit));
app.get("/api/guest-afa", wrap(guestAfa));
app.post("/api/guest-afa", wrap(guestAfa));
app.post("/api/guest-afa-complete", wrap(guestAfaComplete));
app.get("/api/admin-afa-orders", wrap(adminAfaComplete));
app.post("/api/admin-afa-complete", wrap(adminAfaComplete));

// Chrome DevTools probe — silence the 404
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.json({});
});

// 404 for unmatched API routes
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

export default app;
