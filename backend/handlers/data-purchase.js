import { authenticateWithMaintenance } from "../utils/auth.js";
import { validate, dataPurchaseSchema } from "../utils/validation.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery, executeTransaction } from "../utils/db.js";
import {
  generateReference,
  checkRateLimit,
  getClientIp,
} from "../utils/security.js";
import {
  createNotification,
  notifyAdmins,
  NotificationType,
} from "../utils/notifications.js";
import { buyData } from "../utils/onepapi.js";
import {
  isBot,
  hasSuspiciousPayload,
  isBodySizeValid,
} from "../utils/security-middleware.js";


/**
 * ============================================================
 * AUTOMATED DATA SALES LOGIC (GHS)
 * ============================================================
 *
 * FLOW:
 * 1. User clicks "Buy 1GB Data for GH₵5.00"
 * 2. Wallet Check: Backend checks user wallet balance
 * 3. Local Debit: Deduct selling price from user's wallet
 * 4. API Execution: Call Smart Data Hub API to deliver data
 * 5. Provider Debit: Provider debits our console wallet at cost_price
 * 6. Success → notify all parties
 * 7. Failure → Auto-refund user, mark transaction failed
 *
 * PROVIDER STATUS VALUES:
 *   completed      → Data delivered successfully
 *   pending        → Order placed, awaiting delivery
 *   pending_manual → Queued for manual fulfilment by provider
 *   failed         → Order failed (provider auto-refunds their wallet)
 *
 * ============================================================
 */

// Phone prefix → network mapping (Ghana)
const NETWORK_PREFIXES = {
  MTN: ["024", "025", "053", "054", "055", "059"],
  TELECEL: ["020", "050"],
  AIRTEL_TIGO: ["027", "057", "026", "056"],
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    // ─── Step 0: Security Checks ───────────────────────────────────────────
    if (isBot(event.headers)) {
      return errorResponse(403, "Request blocked");
    }

    if (hasSuspiciousPayload(event.body)) {
      return errorResponse(400, "Invalid request");
    }

    if (!isBodySizeValid(event.body, 10240)) {
      return errorResponse(413, "Request too large");
    }

    const clientIp = getClientIp(event.headers);

    // IP-level rate limit: 10 purchase attempts per minute
    const ipRateCheck = checkRateLimit(`purchase:${clientIp}`, 10);
    if (!ipRateCheck.allowed) {
      return errorResponse(
        429,
        "Too many purchase requests. Please wait a moment."
      );
    }

    // ─── Step 1: Authenticate ──────────────────────────────────────────────
    const auth = await authenticateWithMaintenance(event.headers);
    if (!auth.authenticated) {
      return errorResponse(401, auth.error || "Authentication required");
    }
    if (auth.maintenanceBlocked) {
      return errorResponse(503, auth.maintenanceMessage);
    }

    // Per-user rate limit: 5 purchases per minute
    const userRateCheck = checkRateLimit(`purchase:user:${auth.user.id}`, 5);
    if (!userRateCheck.allowed) {
      return errorResponse(
        429,
        "Too many purchases. Please wait before trying again."
      );
    }

    // ─── Step 2: Validate Request ──────────────────────────────────────────
    const body = JSON.parse(event.body);
    const validation = validate(dataPurchaseSchema, body);
    if (!validation.success) {
      return errorResponse(400, "Validation failed", validation.errors);
    }

    const { network, phone_number, data_plan_id, amount } = validation.data;

    // ─── Step 2a: Duplicate purchase guard (same user/plan/phone within 60s) ─
    const recentDuplicates = await executeQuery(
      `SELECT id, status, reference FROM transactions
       WHERE user_id = $1 AND data_plan_id = $2 AND recipient_phone = $3
         AND status IN ('pending', 'processing', 'completed')
         AND created_at > NOW() - INTERVAL '60 seconds'
       LIMIT 1`,
      [auth.user.id, data_plan_id, phone_number]
    );

    if (recentDuplicates.length > 0) {
      const dup = recentDuplicates[0];
      return errorResponse(
        409,
        `Duplicate purchase detected. A ${dup.status} transaction (${dup.reference}) ` +
          `for this same plan and number was made less than 60 seconds ago.`
      );
    }

    // ─── Step 2b: Validate phone prefix matches selected network ───────────
    const phonePrefix = phone_number.substring(0, 3);
    const expectedEntry = Object.entries(NETWORK_PREFIXES).find(
      ([, prefixes]) => prefixes.includes(phonePrefix)
    );

    if (!expectedEntry) {
      return errorResponse(
        400,
        `Unrecognized phone prefix "${phonePrefix}". Please check the number.`
      );
    }

    if (expectedEntry[0] !== network) {
      return errorResponse(
        400,
        `Phone number ${phone_number} belongs to ${expectedEntry[0]}, not ${network}. ` +
          `Please select the correct network.`
      );
    }

    // ─── Step 3: Fetch Plan ────────────────────────────────────────────────
    const plans = await executeQuery(
      `SELECT id, network, plan_name, data_volume, price,
              COALESCE(cost_price, 0) AS cost_price,
              reseller_price, provider_plan_id, volume_mb
       FROM data_plans WHERE id = $1 AND is_active = true`,
      [data_plan_id]
    );

    if (plans.length === 0) {
      return errorResponse(404, "Data plan not found or inactive");
    }

    const plan = plans[0];
    const costPrice = parseFloat(plan.cost_price);
    const platformPrice = parseFloat(plan.price);

    if (plan.network !== network) {
      return errorResponse(400, "Network mismatch");
    }

    // ─── Step 3b: Determine effective price for reseller vs regular user ────
    let sellingPrice = platformPrice;
    const userResellerCheck = await executeQuery(
      "SELECT is_reseller FROM users WHERE id = $1",
      [auth.user.id]
    );
    const isUserReseller = userResellerCheck[0]?.is_reseller || false;

    if (isUserReseller) {
      const resellerPriceRows = await executeQuery(
        `SELECT COALESCE(rco.cost_price, dp.reseller_price, dp.price) AS effective_price
         FROM data_plans dp
         LEFT JOIN reseller_cost_overrides rco
           ON rco.data_plan_id = dp.id AND rco.reseller_id = $1
         WHERE dp.id = $2`,
        [auth.user.id, data_plan_id]
      );
      if (resellerPriceRows.length > 0) {
        sellingPrice = parseFloat(resellerPriceRows[0].effective_price);
      }
    }

    // ─── Step 4: Verify amount ─────────────────────────────────────────────
    if (Math.abs(sellingPrice - amount) > 0.01) {
      return errorResponse(400, "Amount does not match plan price");
    }

    const adminProfit = Math.max(0, sellingPrice - costPrice);

    // ─── Step 5: Execute Purchase (atomic, with row-lock) ──────────────────
    const reference = generateReference("DATA");
    let transactionId;
    let finalStatus = "pending";
    let providerRef = null;
    let user;

    await executeTransaction(async (sql) => {
      // Lock wallet row to prevent double-spend
      const users = await sql(
        "SELECT id, full_name, wallet_balance FROM users WHERE id = $1 FOR UPDATE",
        [auth.user.id]
      );

      if (users.length === 0) throw new Error("USER_NOT_FOUND");

      user = users[0];
      const walletBalance = parseFloat(user.wallet_balance);

      if (walletBalance < sellingPrice) {
        throw new Error(`INSUFFICIENT_BALANCE:${walletBalance.toFixed(2)}`);
      }

      // Debit user wallet
      await sql(
        "UPDATE users SET wallet_balance = wallet_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [sellingPrice, auth.user.id]
      );

      // Resolve reseller info if user was referred
      let resellerId = null;
      let commissionAmount = null;
      const referralRows = await sql(
        `SELECT r.referrer_id, rc.commission_rate
         FROM referrals r
         JOIN referral_codes rc ON rc.referral_code = r.referral_code
         WHERE r.referred_id = $1 AND r.status = 'active'
         LIMIT 1`,
        [auth.user.id]
      );
      if (referralRows.length) {
        resellerId = referralRows[0].referrer_id;
        commissionAmount =
          Math.round(
            sellingPrice *
              (parseFloat(referralRows[0].commission_rate) / 100) *
              100
          ) / 100;
      }

      // Create transaction record
      const txResult = await sql(
        `INSERT INTO transactions (
           user_id, type, amount, status, reference,
           data_plan_id, recipient_phone, payment_locked, metadata,
           reseller_id, commission_amount
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          auth.user.id,
          "data_purchase",
          sellingPrice,
          "pending",
          reference,
          data_plan_id,
          phone_number,
          true,
          JSON.stringify({
            network,
            plan_name: plan.plan_name,
            data_volume: plan.data_volume,
            phone_number,
            _admin: {
              cost_price: costPrice,
              selling_price: sellingPrice,
              admin_profit: adminProfit,
            },
          }),
          resellerId,
          commissionAmount,
        ]
      );

      transactionId = txResult[0].id;

      // Credit reseller commission if applicable
      if (resellerId && commissionAmount > 0) {
        await sql(
          "UPDATE users SET commission_balance = commission_balance + $1 WHERE id = $2",
          [commissionAmount, resellerId]
        );
        await sql(
          `INSERT INTO commissions (referrer_id, referred_user_id, transaction_id, amount, commission_rate, status)
           VALUES ($1, $2, $3, $4, $5, 'approved')`,
          [
            resellerId,
            auth.user.id,
            transactionId,
            commissionAmount,
            referralRows[0].commission_rate,
          ]
        );
        await sql(
          "UPDATE referrals SET total_earned = total_earned + $1 WHERE referrer_id = $2 AND referred_id = $3",
          [commissionAmount, resellerId, auth.user.id]
        );
      }

      // ─── 1Papi provider ──────────────────────────────────────────────────
      if (plan.provider_plan_id) {
        try {
          const onepapiWebhookUrl = `${process.env.FRONTEND_URL || "https://putduckdata.com"}/api/1papi-webhook`;
          const providerResult = await buyData(phone_number, plan.provider_plan_id, onepapiWebhookUrl);
          providerRef = providerResult.reference || null;

          if (providerResult.success && providerResult.status !== "failed") {
            if (providerResult.status === "completed") {
              finalStatus = "completed";
            } else if (providerResult.status === "pending_manual") {
              finalStatus = "processing";
            } else {
              finalStatus = "pending";
            }

            await sql(
              `UPDATE transactions SET
                 status = $1,
                 metadata = metadata || $2::jsonb,
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = $3`,
              [
                finalStatus,
                JSON.stringify({
                  provider: "1papi",
                  provider_reference: providerRef,
                  provider_status: providerResult.status,
                  provider_success: true,
                }),
                transactionId,
              ]
            );
          } else {
            finalStatus = "failed";
            throw new Error(
              `PROVIDER_FAIL:${providerResult.message || "Provider rejected the order"}`
            );
          }
        } catch (apiError) {
          if (apiError.message?.startsWith("PROVIDER_FAIL:")) {
            const providerErrMsg = apiError.message.replace("PROVIDER_FAIL:", "");
            finalStatus = "failed";
            await sql(
              "UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
              [sellingPrice, auth.user.id]
            );
            await sql(
              `UPDATE transactions SET
                 status = 'failed',
                 metadata = metadata || $1::jsonb,
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [
                JSON.stringify({
                  provider_error: providerErrMsg,
                  auto_refunded: true,
                  refund_amount: sellingPrice,
                }),
                transactionId,
              ]
            );
          } else if (apiError.code === "ONEPAPI_RATE_LIMIT") {
            finalStatus = "processing";
            console.warn("1Papi rate limit hit for tx:", reference);
            await sql(
              `UPDATE transactions SET
                 status = 'processing',
                 metadata = metadata || $1::jsonb,
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [
                JSON.stringify({
                  provider: "1papi",
                  provider_error: "Rate limit exceeded",
                  needs_manual_check: true,
                  retry_after_seconds: apiError.retryAfter,
                }),
                transactionId,
              ]
            );
          } else {
            finalStatus = "processing";
            console.error("1Papi API error (will check later):", apiError.message);
            await sql(
              `UPDATE transactions SET
                 status = 'processing',
                 metadata = metadata || $1::jsonb,
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [
                JSON.stringify({
                  provider: "1papi",
                  provider_error: apiError.message,
                  needs_manual_check: true,
                }),
                transactionId,
              ]
            );
          }
        }
      } else {
        // No provider_plan_id — queue for manual fulfilment
        finalStatus = "processing";
        await sql(
          `UPDATE transactions SET
             status = 'processing',
             metadata = metadata || $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [
            JSON.stringify({
              provider_mode: "no_provider_id",
              needs_manual_fulfil: true,
            }),
            transactionId,
          ]
        );
      }
    });

    // ─── Step 6: Notifications ─────────────────────────────────────────────
    if (finalStatus === "completed") {
      await createNotification(
        auth.user.id,
        NotificationType.DATA_PURCHASE_SUCCESS,
        "Data Purchase Successful",
        `${plan.data_volume} ${network} data sent to ${phone_number}`,
        {
          network,
          dataVolume: plan.data_volume,
          phoneNumber: phone_number,
          amount: sellingPrice,
        }
      );
    } else if (finalStatus === "failed") {
      await createNotification(
        auth.user.id,
        NotificationType.DATA_PURCHASE,
        "Data Purchase Failed — Refunded",
        `Your purchase of ${
          plan.data_volume
        } ${network} data failed. GH₵${sellingPrice.toFixed(
          2
        )} has been refunded to your wallet.`,
        { refunded: true, amount: sellingPrice }
      );
    } else if (finalStatus === "processing") {
      await createNotification(
        auth.user.id,
        NotificationType.DATA_PURCHASE,
        "Data Purchase Processing",
        `Your ${plan.data_volume} ${network} data purchase is being processed. You'll be notified once complete.`,
        { amount: sellingPrice }
      );

      await notifyAdmins(
        NotificationType.ADMIN_ALERT,
        "Order Needs Attention",
        `Transaction ${reference} is stuck in processing. Customer: ${user.full_name}, ${plan.data_volume} ${network} to ${phone_number}.`,
        { transactionId, reference }
      );
    } else {
      // pending — data is on its way
      await createNotification(
        auth.user.id,
        NotificationType.DATA_PURCHASE,
        "Data Purchase Pending",
        `Your ${plan.data_volume} ${network} data purchase is pending delivery to ${phone_number}.`,
        { amount: sellingPrice }
      );
    }

    // ─── Step 7: Return Response ───────────────────────────────────────────
    const updatedUser = await executeQuery(
      "SELECT wallet_balance FROM users WHERE id = $1",
      [auth.user.id]
    );

    const responseData = {
      transaction_id: transactionId,
      reference,
      status: finalStatus,
      phone_number,
      network,
      plan_name: plan.plan_name,
      data_volume: plan.data_volume,
      amount: sellingPrice,
      new_balance: parseFloat(updatedUser[0].wallet_balance),
    };

    const messages = {
      completed: `${plan.plan_name} successfully sent to ${phone_number}`,
      pending:
        "Your purchase is pending delivery. You will be notified once complete.",
      processing:
        "Your purchase is being processed. You will be notified once complete.",
      failed: `Purchase failed. GH₵${sellingPrice.toFixed(
        2
      )} has been refunded to your wallet.`,
    };

    if (finalStatus === "failed") {
      return errorResponse(400, messages.failed);
    }

    return successResponse(
      200,
      responseData,
      messages[finalStatus] || "Purchase submitted"
    );
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return errorResponse(404, "User not found");
    }
    if (error.message?.startsWith("INSUFFICIENT_BALANCE:")) {
      const balance = error.message.split(":")[1];
      return errorResponse(
        400,
        `Insufficient balance. Current balance: GH₵${balance}. Please top up your wallet.`,
        { suggest_topup: true }
      );
    }

    console.error("Data purchase error:", error);
    return errorResponse(500, "Data purchase failed. Please try again.");
  }
};
