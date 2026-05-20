import axios from "axios";
import { authenticateUser } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";
import { generateReference } from "../utils/security.js";
import { createNotification, notifyAdmins } from "../utils/notifications.js";

const AFA_DEFAULT_PRICE = 30;
const PAYSTACK_FEE_RATE = 0.04;

const getAfaPrice = async () => {
  try {
    const rows = await executeQuery(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'afa_price' LIMIT 1"
    );
    if (rows.length) {
      const v = rows[0].setting_value;
      const parsed =
        typeof v === "string" ? parseFloat(v.replace(/"/g, "")) : parseFloat(v);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}
  return AFA_DEFAULT_PRICE;
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated)
      return errorResponse(401, "Authentication required");

    // ── GET: fetch user's current AFA status ─────────────────────────────────
    if (event.httpMethod === "GET") {
      const price = await getAfaPrice();

      const rows = await executeQuery(
        `SELECT id, status, metadata, created_at
         FROM transactions
         WHERE user_id = $1 AND type = 'afa_registration'
         ORDER BY created_at DESC LIMIT 1`,
        [auth.user.id]
      );

      if (!rows.length) {
        return successResponse(200, { status: "none", price });
      }

      const tx = rows[0];
      const meta =
        typeof tx.metadata === "string"
          ? JSON.parse(tx.metadata)
          : tx.metadata || {};
      const delivery = meta.delivery_status || null;

      let displayStatus;
      if (tx.status === "pending") displayStatus = "pending";
      else if (tx.status === "failed" || tx.status === "cancelled")
        displayStatus = "failed";
      else if (tx.status === "completed") displayStatus = "delivered";
      else if (delivery === "ongoing") displayStatus = "ongoing";
      else if (tx.status === "success") displayStatus = "paid_awaiting_form";
      else displayStatus = "none";

      return successResponse(200, {
        status: displayStatus,
        transaction_id: tx.id,
        created_at: tx.created_at,
        form_submitted: !!delivery,
        form_data: meta.afa_form || null,
        price,
      });
    }

    // ── POST: initiate payment ────────────────────────────────────────────────
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { payment_method } = body; // 'paystack' | 'wallet'

      if (!["paystack", "wallet"].includes(payment_method)) {
        return errorResponse(400, "payment_method must be paystack or wallet");
      }

      // Check if user already has a pending/success/completed AFA order
      const existing = await executeQuery(
        `SELECT id, status FROM transactions
         WHERE user_id = $1 AND type = 'afa_registration'
           AND status IN ('pending','success','completed')
         ORDER BY created_at DESC LIMIT 1`,
        [auth.user.id]
      );
      if (existing.length) {
        return errorResponse(
          409,
          "You already have an active AFA registration order."
        );
      }

      const price = await getAfaPrice();
      const reference = generateReference("AFA");

      // ── Wallet payment (form_data submitted together) ─────────────────────
      if (payment_method === "wallet") {
        const { form_data } = body;
        if (
          !form_data ||
          !form_data.full_name ||
          !form_data.phone_number ||
          !form_data.ghana_card_number
        ) {
          return errorResponse(
            400,
            "Please fill in all required personal details before paying."
          );
        }

        const users = await executeQuery(
          "SELECT wallet_balance, full_name, email FROM users WHERE id = $1 FOR UPDATE",
          [auth.user.id]
        );
        if (!users.length) return errorResponse(404, "User not found");
        const user = users[0];

        if (parseFloat(user.wallet_balance) < price) {
          return errorResponse(
            400,
            `Insufficient wallet balance. Required: GH₵${price.toFixed(2)}`
          );
        }

        await executeQuery(
          "UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2",
          [price, auth.user.id]
        );

        await executeQuery(
          `INSERT INTO transactions (user_id, type, amount, status, reference, metadata)
           VALUES ($1, 'afa_registration', $2, 'success', $3, $4)`,
          [
            auth.user.id,
            price,
            reference,
            JSON.stringify({
              payment_method: "wallet",
              afa_form: form_data,
              delivery_status: "ongoing",
              form_submitted_at: new Date().toISOString(),
            }),
          ]
        );

        await createNotification(
          auth.user.id,
          "broadcast",
          "AFA Registration Submitted",
          "Your AFA registration payment and details have been received. Admin will process within 24 hours.",
          {}
        );
        await notifyAdmins(
          "broadcast",
          "New AFA Registration",
          `${form_data.full_name} (${form_data.phone_number}) submitted AFA registration. Ghana Card: ${form_data.ghana_card_number}`,
          { user_id: auth.user.id, form: form_data }
        );

        return successResponse(
          200,
          { status: "submitted", reference },
          "Registration submitted successfully!"
        );
      }

      // ── Paystack payment ──────────────────────────────────────────────────
      const fee = Math.round(price * PAYSTACK_FEE_RATE * 100) / 100;
      const totalCharge = Math.round((price + fee) * 100) / 100;

      await executeQuery(
        `INSERT INTO transactions (user_id, type, amount, status, reference, metadata)
         VALUES ($1, 'afa_registration', $2, 'pending', $3, $4)`,
        [
          auth.user.id,
          price,
          reference,
          JSON.stringify({
            payment_method: "paystack",
            fee,
            total_charged: totalCharge,
          }),
        ]
      );

      const users = await executeQuery(
        "SELECT email FROM users WHERE id = $1",
        [auth.user.id]
      );
      const email = users[0]?.email || `afa_${auth.user.id}@putduckdata.com`;

      const paystackRes = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email,
          amount: Math.round(totalCharge * 100),
          currency: "GHS",
          reference,
          callback_url: `${
            process.env.FRONTEND_URL || "https://putduckdata.com"
          }/payment/verify?type=afa`,
          channels: ["mobile_money"],
          metadata: {
            transaction_type: "afa_registration",
            user_id: auth.user.id,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (!paystackRes.data.status) {
        await executeQuery(
          "UPDATE transactions SET status = 'failed' WHERE reference = $1",
          [reference]
        );
        return errorResponse(500, "Payment initialization failed");
      }

      return successResponse(
        200,
        {
          authorization_url: paystackRes.data.data.authorization_url,
          reference,
          amount: price,
          fee,
          total_charge: totalCharge,
        },
        "Payment initialized"
      );
    }

    return errorResponse(405, "Method not allowed");
  } catch (err) {
    console.error("AFA registration error:", err);
    return errorResponse(500, "AFA registration failed");
  }
};
