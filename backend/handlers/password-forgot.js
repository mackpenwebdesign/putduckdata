import { executeQuery } from "../utils/db.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { checkRateLimit, getClientIp } from "../utils/security.js";
import { generatePasswordResetToken } from "../utils/crypto.js";
import { sendEmail, EmailTemplates } from "../utils/email.js";

/**
 * Forgot Password - Request Reset Link
 * POST /api/password-forgot
 *
 * Security:
 * - Rate limited (3 requests per 15 minutes)
 * - Token expires in 15 minutes
 * - One-way hashed tokens stored in database
 * - Generic responses (don't reveal if email exists)
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    const clientIp = getClientIp(event.headers);

    // Strict rate limiting for password reset
    const rateLimit = checkRateLimit(`password_reset_${clientIp}`, 3);

    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        "Too many password reset attempts. Please try again later."
      );
    }

    const body = JSON.parse(event.body);
    const { email } = body;

    if (!email || typeof email !== "string") {
      return errorResponse(400, "Email is required");
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user exists (but don't reveal this information)
    const users = await executeQuery(
      "SELECT id, email, full_name FROM users WHERE email = $1",
      [emailLower]
    );

    // Generate token even if user doesn't exist (timing attack prevention)
    const { token, hashedToken, expiresAt } = generatePasswordResetToken();

    if (users.length > 0) {
      const user = users[0];

      // Invalidate any existing tokens for this user
      await executeQuery(
        "UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false",
        [user.id]
      );

      // Store hashed token
      await executeQuery(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [user.id, hashedToken, expiresAt, clientIp]
      );

      // Send reset email
      const resetLink = `${
        process.env.FRONTEND_URL || "https://putduckdata.com"
      }/reset-password?token=${token}`;
      const emailHtml = EmailTemplates.passwordReset(resetLink, 15);

      await sendEmail(
        user.email,
        "Password Reset Request - PutDuckData",
        emailHtml
      );
    }

    // Always return success (don't reveal if email exists)
    return successResponse(
      200,
      null,
      "If an account exists with that email, you will receive password reset instructions."
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    return errorResponse(500, "Failed to process password reset request");
  }
};
