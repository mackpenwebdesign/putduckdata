import { authenticateUser } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery, executeTransaction } from "../utils/db.js";
import { generateReferralCode } from "../utils/referral.js";
import { generateReference } from "../utils/security.js";
import {
  sendNotification,
  notifyAdmins,
  NotificationType,
} from "../utils/notifications.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "POST")
    return errorResponse(405, "Method not allowed");

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated)
      return errorResponse(401, "Authentication required");

    const body = JSON.parse(event.body || "{}");
    const { action } = body;

    // ── GET_REFERRAL_CODE ─────────────────────────────────────────────────────
    if (action === "get_referral_code") {
      const users = await executeQuery(
        "SELECT id, full_name, email, is_reseller, referral_code FROM users WHERE id = $1",
        [auth.user.id]
      );
      if (!users.length) return errorResponse(404, "User not found");
      const user = users[0];

      if (!user.is_reseller && !auth.user.is_admin) {
        return errorResponse(403, "You are not an approved reseller");
      }

      if (user.referral_code) {
        const code = user.referral_code;
        const link = `${
          process.env.FRONTEND_URL || "https://putduckdata.com"
        }/register?ref=${code}`;
        return successResponse(200, {
          referral_code: code,
          referral_link: link,
          social_sharing: {
            whatsapp: `https://wa.me/?text=Buy cheap data via my shop: ${encodeURIComponent(
              link
            )}`,
            twitter: `https://twitter.com/intent/tweet?text=Buy cheap data via my shop: ${encodeURIComponent(
              link
            )}`,
          },
        });
      }

      // Generate new code
      const code = generateReferralCode(user.id, user.email);
      await executeTransaction(async (sql) => {
        await sql("UPDATE users SET referral_code = $1 WHERE id = $2", [
          code,
          user.id,
        ]);
        await sql(
          `INSERT INTO referral_codes (user_id, referral_code, commission_rate, is_active)
           VALUES ($1, $2, 1.00, true)
           ON CONFLICT (referral_code) DO NOTHING`,
          [user.id, code]
        );
      });

      const link = `${
        process.env.FRONTEND_URL || "https://putduckdata.com"
      }/register?ref=${code}`;
      return successResponse(200, {
        referral_code: code,
        referral_link: link,
        social_sharing: {
          whatsapp: `https://wa.me/?text=Buy cheap data via my shop: ${encodeURIComponent(
            link
          )}`,
          twitter: `https://twitter.com/intent/tweet?text=Buy cheap data via my shop: ${encodeURIComponent(
            link
          )}`,
        },
      });
    }

    // ── REQUEST_RESELLER ──────────────────────────────────────────────────────
    if (action === "request_reseller") {
      const FEE = 100.0;

      const users = await executeQuery(
        "SELECT id, full_name, email, wallet_balance, is_reseller FROM users WHERE id = $1 FOR UPDATE",
        [auth.user.id]
      );
      if (!users.length) return errorResponse(404, "User not found");
      const user = users[0];

      if (user.is_reseller) {
        return errorResponse(409, "You are already a reseller");
      }

      if (parseFloat(user.wallet_balance) < FEE) {
        return errorResponse(
          400,
          `Insufficient balance. You need GH₵${FEE} to apply. Please top up your wallet.`
        );
      }

      // Check for existing pending application (transaction fee already paid)
      const existing = await executeQuery(
        `SELECT id FROM transactions WHERE user_id = $1 AND type = 'reseller_fee' AND status = 'pending'`,
        [auth.user.id]
      );
      if (existing.length) {
        return errorResponse(
          409,
          "Your reseller application is already pending review"
        );
      }

      const reference = generateReference("RSL");
      await executeTransaction(async (sql) => {
        await sql(
          "UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2",
          [FEE, auth.user.id]
        );
        await sql(
          `INSERT INTO transactions (user_id, type, amount, status, reference, metadata)
           VALUES ($1, 'reseller_fee', $2, 'pending', $3, $4)`,
          [
            auth.user.id,
            FEE,
            reference,
            JSON.stringify({ action: "reseller_application" }),
          ]
        );
      });

      await sendNotification(auth.user.id, NotificationType.DATA_PURCHASE, {
        title: "Reseller Application Submitted",
        message: `GH₵${FEE} has been deducted for your reseller application. An admin will review and approve it shortly.`,
      });

      await notifyAdmins(
        NotificationType.ADMIN_ALERT,
        "New Reseller Application",
        `${user.full_name} (${user.email}) has applied to become a reseller. GH₵${FEE} fee collected. Approve via Admin → Users.`,
        { user_id: auth.user.id, reference }
      );

      return successResponse(
        201,
        { reference, fee_paid: FEE, status: "pending" },
        "Application submitted. GH₵100 deducted. Admin will review shortly."
      );
    }

    return errorResponse(
      400,
      "Invalid action. Use: request_reseller or get_referral_code"
    );
  } catch (err) {
    console.error("reseller-activate error:", err);
    return errorResponse(500, "Failed to process reseller activation");
  }
};
