import axios from "axios";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";
import {
  generateReference,
  checkRateLimit,
  getClientIp,
} from "../utils/security.js";
import {
  isBot,
  hasSuspiciousPayload,
  isBodySizeValid,
} from "../utils/security-middleware.js";
import {
  signGuestTransaction,
  verifyGuestTransactionIntegrity,
} from "../utils/transaction-integrity.js";

// Paystack fee: 2.10%
const calculatePaystackFee = (amount) => Math.round(amount * 0.021 * 100) / 100;

const NETWORK_PREFIXES = {
  MTN: ["024", "025", "053", "054", "055", "059"],
  TELECEL: ["020", "050"],
  AIRTEL_TIGO: ["027", "057", "026", "056"],
};

/**
 * Guest Data Purchase via Paystack
 * POST /api/guest-purchase
 *
 * No authentication required. Initializes a Paystack payment
 * for direct data purchase. After payment verification, data
 * is delivered to the recipient phone number.
 *
 * SECURITY FIXES:
 * - Never trust client-side amount - always fetch from database
 * - Add transaction integrity signing to prevent tampering
 * - Validate price floor/ceiling against cost
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "POST")
    return errorResponse(405, "Method not allowed");

  try {
    // Security: Bot detection
    if (isBot(event.headers)) return errorResponse(403, "Request blocked");

    // Security: Suspicious payload detection
    if (hasSuspiciousPayload(event.body))
      return errorResponse(400, "Invalid request");

    // Security: Body size limit
    if (!isBodySizeValid(event.body, 10240))
      return errorResponse(413, "Request too large");

    const clientIp = getClientIp(event.headers);

    // Rate limit: 3 guest purchases per minute per IP (in-memory, best-effort in serverless)
    const rateCheck = checkRateLimit(`guest_purchase:${clientIp}`, 3);
    if (!rateCheck.allowed)
      return errorResponse(429, "Too many requests. Please wait a moment.");

    const body = JSON.parse(event.body);
    const { network, data_plan_id, phone_number } = body;

    // Validates required inputs
    if (!network || !data_plan_id || !phone_number) {
      return errorResponse(
        400,
        "network, data_plan_id, and phone_number are required"
      );
    }

    if (!["MTN", "TELECEL", "AIRTEL_TIGO"].includes(network)) {
      return errorResponse(
        400,
        "Invalid network. Must be MTN, TELECEL, or AIRTEL_TIGO"
      );
    }

    if (!/^0\d{9}$/.test(phone_number)) {
      return errorResponse(
        400,
        "Phone number must be 10 digits starting with 0"
      );
    }

    // Validate phone prefix matches network
    const phonePrefix = phone_number.substring(0, 3);
    const expectedPrefixes = NETWORK_PREFIXES[network] || [];
    if (!expectedPrefixes.includes(phonePrefix)) {
      return errorResponse(
        400,
        "Phone number prefix does not match selected network"
      );
    }

    // DB-backed rate limit: max 5 attempts per phone number in the last hour.
    // Works across serverless cold starts unlike the in-memory limit above.
    const phoneHourlyCount = await executeQuery(
      `SELECT COUNT(*) AS cnt FROM transactions
       WHERE type = 'guest_data_purchase'
         AND metadata->>'phone_number' = $1
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [phone_number]
    );
    if (parseInt(phoneHourlyCount[0]?.cnt || 0) >= 5) {
      console.warn("Phone rate limit hit:", phone_number);
      return errorResponse(
        429,
        "Too many purchase attempts for this number. Please try again in an hour."
      );
    }

    const { reseller_code } = body;

    // SECURITY: Validate reseller_code if provided
    if (reseller_code !== undefined) {
      if (typeof reseller_code !== "string") {
        return errorResponse(400, "Invalid reseller_code type");
      }
      if (reseller_code.length > 50) {
        return errorResponse(400, "Invalid reseller_code");
      }
    }

    // SECURITY FIX #1: Fetch plan from database - NEVER trust client amount
    const plans = await executeQuery(
      `SELECT id, network, plan_name, data_volume, validity_days, price, 
              COALESCE(cost_price, 0) AS cost_price, 
              COALESCE(reseller_price, price) AS reseller_price,
              volume_mb, provider_plan_id 
       FROM data_plans WHERE id = $1 AND is_active = true`,
      [data_plan_id]
    );

    if (plans.length === 0) {
      return errorResponse(404, "Data plan not found or inactive");
    }

    const plan = plans[0];

    if (plan.network !== network) {
      return errorResponse(400, "Plan does not belong to selected network");
    }

    // Determine the correct price (platform price for guests)
    let sellingPrice = parseFloat(plan.price);

    // Resolve reseller custom price if reseller_code provided
    let resellerId = null;
    let resellerCommissionAmount = null;

    if (reseller_code) {
      const resellerRows = await executeQuery(
        `SELECT u.id, u.is_reseller, rp.custom_price
         FROM users u
         LEFT JOIN referral_codes rc ON rc.user_id = u.id
         LEFT JOIN reseller_pricing rp ON rp.reseller_id = u.id AND rp.data_plan_id = $1 AND rp.is_active = true
         WHERE (u.referral_code = $2 OR rc.referral_code = $2)
           AND (u.is_reseller = true OR u.is_admin = true)
         LIMIT 1`,
        [data_plan_id, reseller_code]
      );

      if (resellerRows.length > 0) {
        resellerId = resellerRows[0].id;
        if (resellerRows[0].custom_price) {
          sellingPrice = parseFloat(resellerRows[0].custom_price);
          // Commission = markup above platform cost price
          resellerCommissionAmount = Math.max(
            0,
            Math.round((sellingPrice - parseFloat(plan.cost_price)) * 100) / 100
          );
        }
      }
    }

    // SECURITY FIX #2: Price floor/ceiling validation
    // Price must be >= cost_price (minimum we need to pay provider)
    const minPrice = parseFloat(plan.cost_price) * 0.9; // Allow 10% tolerance
    const maxPrice = parseFloat(plan.price) * 3; // Cap at 3x to prevent abuse

    if (sellingPrice < minPrice) {
      console.error("Price below minimum:", { sellingPrice, minPrice });
      return errorResponse(400, "Invalid plan price");
    }

    if (sellingPrice > maxPrice) {
      console.error("Price above maximum:", { sellingPrice, maxPrice });
      return errorResponse(400, "Invalid plan price");
    }

    const fee = calculatePaystackFee(sellingPrice);
    const totalCharge = Math.round((sellingPrice + fee) * 100) / 100;

    const reference = generateReference("GUEST");

    // SECURITY FIX #3: Add transaction integrity hash
    // This prevents tampering of phone/plan after payment initiation
    const amountPrecis = Math.round(sellingPrice * 100); // Convert to pesewas
    const guestIntegrityHash = signGuestTransaction(
      reference,
      amountPrecis,
      phone_number,
      String(data_plan_id)
    );

    // Create guest transaction record with integrity hash
    await executeQuery(
      `INSERT INTO transactions (user_id, type, amount, status, reference, metadata, reseller_id, commission_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        null, // No user - guest purchase
        "guest_data_purchase",
        sellingPrice,
        "pending",
        reference,
        JSON.stringify({
          guest: true,
          network,
          data_plan_id,
          phone_number,
          plan_name: plan.plan_name,
          data_volume: plan.data_volume,
          validity_days: plan.validity_days,
          volume_mb: plan.volume_mb,
          provider_plan_id: plan.provider_plan_id,
          total_charged: totalCharge,
          fee,
          fee_type: "2.1pct",
          reseller_code: reseller_code || null,
          reseller_id: resellerId,
          reseller_commission: resellerCommissionAmount,
          // SECURITY: Store integrity hash
          guest_integrity_hash: guestIntegrityHash,
          guest_integrity_verified: false,
          client_ip: clientIp,
        }),
        resellerId,
        resellerCommissionAmount,
      ]
    );

    // Initialize Paystack payment
    const guestEmail = `guest_${Date.now()}@putduckdata.com`;

    // SECURITY FIX: Force MoMo only - prevent card payments for security
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: guestEmail,
        amount: Math.round(totalCharge * 100), // Paystack uses pesewas
        currency: "GHS",
        reference,
        callback_url: `${
          process.env.NODE_ENV === "development"
            ? "http://localhost:5173"
            : process.env.FRONTEND_URL || "https://putduckdata.com"
        }/payment/verify?guest=true`,
        // SECURITY: Only allow Mobile Money - blocks card payments/hacking
        channel: "mobile_money",
        mobile_money: {
          phone: phone_number,
          provider: "mtn", // Default to MTN - Paystack will show MoMo picker
        },
        metadata: {
          guest: true,
          transaction_type: "guest_data_purchase",
          network,
          data_plan_id,
          phone_number,
          plan_name: plan.plan_name,
          data_volume: plan.data_volume,
          amount: sellingPrice,
          fee,
          total_charged: totalCharge,
          reseller_code: reseller_code || null,
          reseller_id: resellerId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!paystackResponse.data.status) {
      await executeQuery(
        "UPDATE transactions SET status = $1 WHERE reference = $2",
        ["failed", reference]
      );
      return errorResponse(500, "Payment initialization failed");
    }

    return successResponse(
      200,
      {
        authorization_url: paystackResponse.data.data.authorization_url,
        access_code: paystackResponse.data.data.access_code,
        reference,
        amount: sellingPrice,
        fee,
        total_charge: totalCharge,
      },
      "Payment initialized"
    );
  } catch (error) {
    console.error("Guest purchase error:", error);
    if (error.response) {
      return errorResponse(
        error.response.status,
        error.response.data.message || "Payment service error"
      );
    }
    return errorResponse(500, "Guest purchase failed");
  }
};
