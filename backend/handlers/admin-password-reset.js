import { authenticateUser } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";
import { generatePasswordResetToken } from "../utils/crypto.js";
import { sendEmail, EmailTemplates } from "../utils/email.js";

/**
 * Admin Password Reset - Send reset link to a specific user
 * POST /api/admin-password-reset
 *
 * Body: { user_id: number }
 *
 * Admin-only endpoint that:
 * 1. Generates a password reset token (30 min expiry)
 * 2. Sends the reset link email to the user
 * 3. Logs the action
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || "Authentication required");
    }

    // Verify admin
    const adminCheck = await executeQuery(
      "SELECT id, full_name, is_admin FROM users WHERE id = $1",
      [auth.user.id]
    );

    if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
      return errorResponse(403, "Admin access required");
    }

    const adminUser = adminCheck[0];
    const body = JSON.parse(event.body || "{}");
    const { user_id } = body;

    if (!user_id) {
      return errorResponse(400, "User ID is required");
    }

    // Get target user
    const users = await executeQuery(
      "SELECT id, email, full_name FROM users WHERE id = $1",
      [user_id]
    );

    if (users.length === 0) {
      return errorResponse(404, "User not found");
    }

    const targetUser = users[0];

    // Generate reset token with 30 min expiry for admin-initiated resets
    const { token, hashedToken } = generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Invalidate existing tokens
    await executeQuery(
      "UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false",
      [targetUser.id]
    );

    // Store new token
    await executeQuery(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [targetUser.id, hashedToken, expiresAt, "admin-initiated"]
    );

    // Send email
    const resetLink = `${
      process.env.FRONTEND_URL || "https://putduckdata.com"
    }/reset-password?token=${token}`;
    const emailHtml = EmailTemplates.adminPasswordReset(
      resetLink,
      adminUser.full_name,
      30
    );

    const emailSent = await sendEmail(
      targetUser.email,
      "Password Reset - PutDuckData",
      emailHtml
    );

    return successResponse(
      200,
      {
        email_sent: emailSent,
        user_email: targetUser.email,
        user_name: targetUser.full_name,
        expires_in: "30 minutes",
      },
      `Password reset link sent to ${targetUser.email}`
    );
  } catch (error) {
    console.error("Admin password reset error:", error);
    return errorResponse(500, "Failed to send password reset");
  }
};
