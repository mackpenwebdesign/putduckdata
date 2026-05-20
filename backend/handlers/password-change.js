import {
  authenticateUser,
  hashPassword,
  verifyPassword,
} from "../utils/auth.js";
import { executeQuery } from "../utils/db.js";
import { validate } from "../utils/validation.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { sendEmail, EmailTemplates } from "../utils/email.js";
import { logSecurityEvent } from "../utils/auth.js";
import { getClientIp } from "../utils/security.js";
import { z } from "zod";

/**
 * Change Password (Authenticated)
 * POST /api/password-change
 *
 * Security:
 * - Requires current password verification
 * - Invalidates all existing sessions
 * - Sends email notification
 * - Logs security event
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

    const body = JSON.parse(event.body);
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return errorResponse(
        400,
        "Current password and new password are required"
      );
    }

    // Validate new password strength
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
        "New password validation failed",
        validation.errors
      );
    }

    // Prevent using same password
    if (current_password === new_password) {
      return errorResponse(
        400,
        "New password must be different from current password"
      );
    }

    // Get user's current password hash
    const users = await executeQuery(
      "SELECT id, email, full_name, password_hash FROM users WHERE id = $1",
      [auth.user.id]
    );

    if (users.length === 0) {
      return errorResponse(404, "User not found");
    }

    const user = users[0];

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      current_password,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      const clientIp = getClientIp(event.headers);
      await logSecurityEvent(
        user.id,
        "password_change_failed",
        clientIp,
        event.headers["user-agent"],
        "failed",
        { reason: "incorrect_current_password" }
      );

      return errorResponse(401, "Current password is incorrect");
    }

    // Hash new password
    const new_password_hash = await hashPassword(new_password);

    // Update password
    await executeQuery("UPDATE users SET password_hash = $1 WHERE id = $2", [
      new_password_hash,
      user.id,
    ]);

    // Invalidate all existing JWT tokens (force re-login)
    await executeQuery(
      `INSERT INTO jwt_blacklist (token_jti, user_id, reason, expires_at)
       SELECT $1, $2, 'password_change', CURRENT_TIMESTAMP + INTERVAL '7 days'`,
      [auth.user.jti, user.id]
    );

    // Log security event
    const clientIp = getClientIp(event.headers);
    await logSecurityEvent(
      user.id,
      "password_change",
      clientIp,
      event.headers["user-agent"],
      "success",
      {}
    );

    // Send email notification
    const emailHtml = EmailTemplates.passwordChanged();
    await sendEmail(
      user.email,
      "Password Changed - PutDuckData",
      emailHtml
    );

    return successResponse(
      200,
      null,
      "Password changed successfully. Please login again with your new password."
    );
  } catch (error) {
    console.error("Password change error:", error);
    return errorResponse(500, "Failed to change password");
  }
};
