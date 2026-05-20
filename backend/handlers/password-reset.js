import { executeQuery } from "../utils/db.js";
import { hashPassword } from "../utils/auth.js";
import { validate } from "../utils/validation.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { hashToken, isTokenValid } from "../utils/crypto.js";
import { sendEmail, EmailTemplates } from "../utils/email.js";
import { z } from "zod";

/**
 * Reset Password with Token
 * POST /api/password-reset
 *
 * Security:
 * - Token must be valid and not expired (15 minutes)
 * - Token can only be used once
 * - All user sessions invalidated after password change
 * - Email notification sent
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    const body = JSON.parse(event.body);
    const { token, new_password } = body;

    if (!token || !new_password) {
      return errorResponse(400, "Token and new password are required");
    }

    // Validate password strength
    const passwordSchema = z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number");

    const validation = validate(passwordSchema, new_password);

    if (!validation.success) {
      return errorResponse(
        400,
        "Password validation failed",
        validation.errors
      );
    }

    // Hash the token to compare with database
    const hashedToken = hashToken(token);

    // Find valid token
    const tokens = await executeQuery(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email, u.full_name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token_hash = $1 AND prt.used = false`,
      [hashedToken]
    );

    if (tokens.length === 0) {
      return errorResponse(400, "Invalid or expired reset token");
    }

    const tokenData = tokens[0];

    // Check if token is expired
    if (!isTokenValid(tokenData.expires_at)) {
      // Mark as used
      await executeQuery(
        "UPDATE password_reset_tokens SET used = true WHERE id = $1",
        [tokenData.id]
      );

      return errorResponse(
        400,
        "Reset token has expired. Please request a new one."
      );
    }

    // Hash new password
    const password_hash = await hashPassword(new_password);

    // Update password and mark token as used
    await executeQuery("UPDATE users SET password_hash = $1 WHERE id = $2", [
      password_hash,
      tokenData.user_id,
    ]);

    await executeQuery(
      "UPDATE password_reset_tokens SET used = true WHERE id = $1",
      [tokenData.id]
    );

    // Invalidate all existing JWT tokens for this user (security measure)
    await executeQuery(
      `INSERT INTO jwt_blacklist (token_jti, user_id, reason, expires_at)
       SELECT 'password_change_' || gen_random_uuid(), $1, 'password_change',
              CURRENT_TIMESTAMP + INTERVAL '7 days'`,
      [tokenData.user_id]
    );

    // Send confirmation email
    const emailHtml = EmailTemplates.passwordChanged();
    await sendEmail(
      tokenData.email,
      "Password Changed - PutDuckData",
      emailHtml
    );

    return successResponse(
      200,
      null,
      "Password reset successful. Please login with your new password."
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return errorResponse(500, "Failed to reset password");
  }
};
