import axios from "axios";
import {
  corsResponse,
  successResponse,
  errorResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";
import { generateReference } from "../utils/security.js";
import { notifyAdmins } from "../utils/notifications.js";

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
    const price = await getAfaPrice();

    // ── GET ?phone=0241234567&ref=ABC123: status check ──
    if (event.httpMethod === "GET") {
      const phone = event.queryStringParameters?.phone?.replace(/\D/g, "");
      const ref = event.queryStringParameters?.ref;

      if (!phone && !ref) {
        return successResponse(200, { status: "none", price });
      }

      const where = ref
        ? `reference = $1`
        : `type = 'guest_afa' AND metadata->>'phone' = $1`;

      const rows = await executeQuery(
        `SELECT id, status, metadata, created_at FROM transactions 
         WHERE ${where} ORDER BY created_at DESC LIMIT 1`,
        ref ? [ref] : [phone]
      );

      if (!rows.length) return successResponse(200, { status: "none", price });

      const tx = rows[0];
      const meta =
        typeof tx.metadata === "string"
          ? JSON.parse(tx.metadata)
          : tx.metadata || {};
      const delivery = meta.delivery_status || null;

      let displayStatus;
      if (tx.status === "pending") displayStatus = "pending";
      else if (tx.status === "failed") displayStatus = "failed";
      else if (tx.status === "success") displayStatus = "paid_awaiting_form";
      else if (tx.status === "completed") {
        if (delivery === "ongoing") displayStatus = "ongoing";
        else displayStatus = "delivered";
      } else displayStatus = "none";

      return successResponse(200, {
        status: displayStatus,
        reference: tx.reference || ref,
        phone: meta.phone || phone,
        transaction_id: tx.id,
        created_at: tx.created_at,
        form_data: meta.guest_afa_form || null,
        price,
      });
    }

    // ── POST: Paystack init for guest ──
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { phone_number, form_data, payment_method = "paystack" } = body;

      if (payment_method !== "paystack")
        return errorResponse(400, "Only Paystack for guests");
      if (!phone_number || !form_data)
        return errorResponse(400, "phone_number and form_data required");

      const phone = phone_number.replace(/\D/g, "");
      if (phone.length !== 10)
        return errorResponse(400, "Valid 10-digit phone required");

      const reference = generateReference("GFA"); // Guest AFA

      // Check existing pending/active
      const existing = await executeQuery(
        `SELECT id FROM transactions WHERE 
         (reference = $1 OR (type = 'guest_afa' AND metadata->>'phone' = $2))
         AND status IN ('pending','success','completed') LIMIT 1`,
        [reference, phone]
      );
      if (existing.length)
        return errorResponse(409, "Active registration exists");

      const fee = Math.round(price * PAYSTACK_FEE_RATE * 100) / 100;
      const totalCharge = Math.round((price + fee) * 100) / 100;

      // Create pending tx with guest data
      await executeQuery(
        `INSERT INTO transactions (type, amount, status, reference, metadata)
         VALUES ('guest_afa', $1, 'pending', $2, $3)`,
        [
          price,
          reference,
          JSON.stringify({
            payment_method: "paystack",
            phone,
            fee,
            total_charged: totalCharge,
            guest_form_data: form_data,
          }),
        ]
      );

      // Paystack init
      const email = `guest_${phone}@putduckdata.guest`;
      const paystackRes = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email,
          amount: Math.round(totalCharge * 100),
          currency: "GHS",
          reference,
          callback_url: `${
            process.env.FRONTEND_URL || "https://putduckdata.com"
          }/payment/verify?type=guest_afa`,
          channels: ["mobile_money"],
          metadata: { transaction_type: "guest_afa", phone, form_data },
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
        return errorResponse(500, "Payment init failed");
      }

      return successResponse(200, {
        authorization_url: paystackRes.data.data.authorization_url,
        reference,
        amount: price,
        fee,
        total_charge: totalCharge,
      });
    }

    return errorResponse(405, "Method not allowed");
  } catch (err) {
    console.error("Guest AFA error:", err);
    return errorResponse(500, "Server error");
  }
};
