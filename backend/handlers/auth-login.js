import { executeQuery } from "../utils/db.js";
import {
  verifyPassword,
  generateToken,
  logSecurityEvent,
  checkMaintenanceMode,
} from "../utils/auth.js";
import { validate, loginSchema } from "../utils/validation.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { checkRateLimit, getClientIp } from "../utils/security.js";
import {
  isAccountLocked,
  recordFailedLogin,
  clearFailedLogins,
} from "../utils/security-middleware.js";

/**
 * User Login Function
 * POST /api/auth-login
 *
 * Security Features:
 * - Rate limiting (prevents brute force attacks)
 * - Password verification with bcrypt
 * - JWT token generation
 * - IP tracking for security monitoring
 */
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    // Rate limiting by IP (prevents brute force)
    const clientIp = getClientIp(event.headers);
    const rateLimit = checkRateLimit(`login_${clientIp}`, 10); // 10 login attempts per minute

    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        "Too many login attempts. Please try again later."
      );
    }

    // Parse and validate request body
    const body = JSON.parse(event.body);
    const validation = validate(loginSchema, body);

    if (!validation.success) {
      return errorResponse(400, "Validation failed", validation.errors);
    }

    const { email, password } = validation.data;

    // Check if account is locked
    const lockStatus = await isAccountLocked(email);

    if (lockStatus.locked) {
      return errorResponse(
        403,
        `Account temporarily locked due to too many failed attempts. Try again after ${new Date(
          lockStatus.until
        ).toLocaleTimeString()}`
      );
    }

    // Find user by email
    const users = await executeQuery(
      "SELECT id, full_name, email, password_hash, phone_number, wallet_balance, is_admin, is_blocked, is_reseller, referral_code FROM users WHERE email = $1",
      [email]
    );

    if (users.length === 0) {
      // Record failed attempt
      await recordFailedLogin(email, clientIp, event.headers["user-agent"]);

      await logSecurityEvent(
        null,
        "login_failed",
        clientIp,
        event.headers["user-agent"],
        "failed",
        { reason: "user_not_found", email }
      );

      // Use generic message to prevent user enumeration
      return errorResponse(401, "Invalid email or password");
    }

    const user = users[0];

    // Check if account is blocked by admin
    if (user.is_blocked) {
      return errorResponse(
        403,
        "Your account has been suspended. Please contact support for assistance."
      );
    }

    // Check maintenance mode - only admins can login during maintenance
    if (!user.is_admin) {
      try {
        const maintenance = await checkMaintenanceMode();
        if (maintenance.active) {
          return errorResponse(
            503,
            maintenance.message ||
              "The platform is currently under maintenance. Please try again later."
          );
        }
      } catch (maintErr) {
        // If maintenance check fails, allow login to proceed
        console.error("Maintenance check error:", maintErr);
      }
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Record failed attempt
      const accountLocked = await recordFailedLogin(
        email,
        clientIp,
        event.headers["user-agent"]
      );

      await logSecurityEvent(
        user.id,
        "login_failed",
        clientIp,
        event.headers["user-agent"],
        "failed",
        { reason: "invalid_password" }
      );

      if (accountLocked) {
        return errorResponse(
          403,
          "Too many failed attempts. Account locked for 15 minutes."
        );
      }

      return errorResponse(401, "Invalid email or password");
    }

    // Clear failed login attempts on successful login
    await clearFailedLogins(email);

    // Update last login timestamp
    await executeQuery(
      "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    // Log successful login
    await logSecurityEvent(
      user.id,
      "login_success",
      clientIp,
      event.headers["user-agent"],
      "success",
      {}
    );

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      is_reseller: user.is_reseller,
    });

    return successResponse(
      200,
      {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          wallet_balance: parseFloat(user.wallet_balance),
          is_admin: user.is_admin,
          is_reseller: user.is_reseller,
          referral_code: user.referral_code,
        },
        token,
      },
      "Login successful"
    );
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(500, "Login failed. Please try again.");
  }
};
