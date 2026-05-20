import axios from "axios";
import { authenticateWithMaintenance } from "../utils/auth.js";
import { validate, walletFundSchema } from "../utils/validation.js";
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
import { signTransaction } from "../utils/transaction-integrity.js";

// Paystack fee: 2.9%
const calculatePaystackFee = (amount) => Math.round(amount * 0.029 * 100) / 100;

/**
 * Initialize Paystack Payment
 * POST /api/payment-initialize
 *
 * Security:
 * - Requires authentication
 * - Validates payment amount
 * - Creates pending transaction record
 * - Adds Paystack fee (2.10%)
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    // Security checks
    if (isBot(event.headers)) {
      return errorResponse(403, "Request blocked");
    }
    if (hasSuspiciousPayload(event.body)) {
      return errorResponse(400, "Invalid request");
    }
    if (!isBodySizeValid(event.body, 10240)) {
      return errorResponse(413, "Request too large");
    }

    // Rate limit: 5 payment initializations per minute per IP
    const clientIp = getClientIp(event.headers);
    const rateCheck = checkRateLimit(`payment_init:${clientIp}`, 5);
    if (!rateCheck.allowed) {
      return errorResponse(429, "Too many payment requests. Please wait.");
    }

    const auth = await authenticateWithMaintenance(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || "Authentication required");
    }
    if (auth.maintenanceBlocked) {
      return errorResponse(503, auth.maintenanceMessage);
    }

    const body = JSON.parse(event.body);
    const validation = validate(walletFundSchema, body);

    if (!validation.success) {
      return errorResponse(400, "Validation failed", validation.errors);
    }

    const { amount } = validation.data;

    // Calculate Paystack fee (2.10%)
    const fee = calculatePaystackFee(amount);
    const totalCharge = Math.round((amount + fee) * 100) / 100;

    // Get user details (including phone for MoMo)
    const users = await executeQuery(
      "SELECT id, email, full_name, phone_number FROM users WHERE id = $1",
      [auth.user.id]
    );

    if (users.length === 0) {
      return errorResponse(404, "User not found");
    }

    const user = users[0];
    const reference = generateReference("FUND");

    // Store the WALLET CREDIT amount (original amount, not the fee-inclusive total)
    // The total charged on Paystack includes the fee
    const integrityHash = signTransaction(
      reference,
      Math.round(amount * 100),
      user.id
    );
    await executeQuery(
      `INSERT INTO transactions (user_id, type, amount, status, reference, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        "wallet_fund",
        amount,
        "pending",
        reference,
        JSON.stringify({
          total_charged: totalCharge,
          fee,
          fee_type: "2.9pct",
          integrity_hash: integrityHash,
        }),
      ]
    );

    // SECURITY FIX: Force MoMo only - prevent card payments/hacking
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        amount: Math.round(totalCharge * 100), // Paystack uses pesewas (1 GHS = 100 pesewas)
        currency: "GHS",
        reference,
        callback_url: `${
          process.env.NODE_ENV === "development"
            ? "http://localhost:5173"
            : process.env.FRONTEND_URL || "https://putduckdata.com"
        }/payment/verify`,
        // SECURITY: Only allow Mobile Money - blocks card payments
        channel: "mobile_money",
        mobile_money: {
          phone: user.phone_number || "0540000000", // Use user reg phone or default
          provider: "mtn",
        },
        metadata: {
          user_id: user.id,
          full_name: user.full_name,
          transaction_type: "wallet_fund",
          wallet_credit: amount,
          fee,
          total_charged: totalCharge,
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
        amount,
        fee,
        total_charge: totalCharge,
      },
      "Payment initialized successfully"
    );
  } catch (error) {
    console.error("Payment initialization error:", error);

    if (error.response) {
      return errorResponse(
        error.response.status,
        error.response.data.message || "Payment service error"
      );
    }

    return errorResponse(500, "Payment initialization failed");
  }
};
