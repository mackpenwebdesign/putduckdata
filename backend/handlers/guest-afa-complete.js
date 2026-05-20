import {
  corsResponse,
  successResponse,
  errorResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";
import { notifyAdmins } from "../utils/notifications.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "POST") return errorResponse(405, "POST only");

  try {
    const body = JSON.parse(event.body || "{}");
    const { reference, phone_number, form_data } = body;

    if (!reference || !form_data || !phone_number) {
      return errorResponse(400, "reference, phone_number, form_data required");
    }

    const phone = phone_number.replace(/\D/g, "");
    if (phone.length !== 10) return errorResponse(400, "Valid phone required");

    // Find tx by ref (payment verified)
    const txRows = await executeQuery(
      `SELECT id, status, metadata FROM transactions 
       WHERE reference = $1 AND type = 'guest_afa'`,
      [reference]
    );

    if (!txRows.length) return errorResponse(404, "Transaction not found");
    if (txRows[0].status !== "success")
      return errorResponse(400, "Payment not completed");

    const tx = txRows[0];
    const meta =
      typeof tx.metadata === "string"
        ? JSON.parse(tx.metadata)
        : tx.metadata || {};

    if (
      meta.delivery_status === "ongoing" ||
      meta.delivery_status === "completed"
    ) {
      return errorResponse(409, "Form already submitted");
    }

    // Update with form data
    const updateMeta = {
      ...meta,
      guest_afa_form: form_data,
      phone,
      delivery_status: "ongoing",
      form_submitted_at: new Date().toISOString(),
    };

    await executeQuery(
      `UPDATE transactions SET 
       metadata = $1, updated_at = CURRENT_TIMESTAMP, status = 'completed'
       WHERE id = $2`,
      [JSON.stringify(updateMeta), tx.id]
    );

    // Notify ALL ADMINS
    await notifyAdmins(
      "broadcast",
      "🆕 NEW GUEST AFA Registration",
      `${form_data.full_name} (${phone}) submitted Guest AFA form. Ref: ${reference}. Ghana Card: ${form_data.ghana_card_number}`,
      {
        type: "guest_afa",
        reference,
        phone,
        form: form_data,
        tx_id: tx.id,
      }
    );

    return successResponse(200, {
      reference,
      status: "ongoing",
      message: "Form submitted! Admin notified. Processing within 24h.",
    });
  } catch (err) {
    console.error("Guest AFA complete error:", err);
    return errorResponse(500, "Submission failed");
  }
};
