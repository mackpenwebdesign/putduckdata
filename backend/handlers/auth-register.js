import { executeQuery, executeTransaction } from "../utils/db.js";
import { hashPassword, generateToken } from "../utils/auth.js";
import {
  validate,
  registerSchema,
  sanitizeObject,
} from "../utils/validation.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { checkRateLimit, getClientIp } from "../utils/security.js";
import { sendNotification, NotificationType } from "../utils/notifications.js";
import {
  isBot,
  hasSuspiciousPayload,
  isBodySizeValid,
} from "../utils/security-middleware.js";

/**
 * User Registration Function
 * POST /api/auth-register
 *
 * Security Features:
 * - Rate limiting
 * - Password hashing (bcrypt)
 * - Input validation
 * - SQL injection prevention
 * - XSS prevention
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
    // Security checks - block bots and malicious payloads
    if (isBot(event.headers)) {
      return errorResponse(403, "Request blocked");
    }
    if (hasSuspiciousPayload(event.body)) {
      return errorResponse(400, "Invalid request");
    }
    if (!isBodySizeValid(event.body, 10240)) {
      return errorResponse(413, "Request too large");
    }

    // Rate limiting by IP
    const clientIp = getClientIp(event.headers);
    const rateLimit = checkRateLimit(`register_${clientIp}`, 5); // 5 registrations per minute max

    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        "Too many registration attempts. Please try again later."
      );
    }

    // Parse and validate request body
    const body = sanitizeObject(JSON.parse(event.body));
    const validation = validate(registerSchema, body);

    if (!validation.success) {
      return errorResponse(400, "Validation failed", validation.errors);
    }

    const { full_name, email, password, phone_number } = validation.data;
    const referralCode = body.ref_code || body.referral_code || null;

    // Check if user already exists (email)
    const existingUser = await executeQuery(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.length > 0) {
      return errorResponse(409, "Email already registered");
    }

    // Check if phone number already registered
    if (phone_number) {
      const existingPhone = await executeQuery(
        "SELECT id FROM users WHERE phone_number = $1 AND phone_number IS NOT NULL AND phone_number != ''",
        [phone_number]
      );

      if (existingPhone.length > 0) {
        return errorResponse(
          409,
          "This phone number is already registered with another account"
        );
      }
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Use transaction to ensure data consistency
    let newUser;

    // Validate referral code if provided
    let validReferralCode = null;
    if (referralCode) {
      const refRows = await executeQuery(
        "SELECT user_id FROM referral_codes WHERE referral_code = $1 AND is_active = true",
        [referralCode]
      );
      if (refRows.length) validReferralCode = referralCode;
    }

    await executeTransaction(async (sql) => {
      // Insert new user
      const result = await sql(
        `INSERT INTO users (full_name, email, password_hash, phone_number, wallet_balance, is_admin, is_reseller, referred_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, full_name, email, phone_number, wallet_balance, is_admin, is_reseller, created_at`,
        [
          full_name,
          email,
          password_hash,
          phone_number || null,
          0.0,
          false,
          true,
          validReferralCode,
        ]
      );

      newUser = result[0];

      // Create referral record if came via referral link
      if (validReferralCode) {
        const refCode = await sql(
          "SELECT user_id, commission_rate FROM referral_codes WHERE referral_code = $1",
          [validReferralCode]
        );
        if (refCode.length) {
          await sql(
            `INSERT INTO referrals (referrer_id, referred_id, referral_code, commission_rate, status)
             VALUES ($1, $2, $3, $4, 'active')
             ON CONFLICT (referrer_id, referred_id) DO NOTHING`,
            [
              refCode[0].user_id,
              newUser.id,
              validReferralCode,
              refCode[0].commission_rate,
            ]
          );
          await sql(
            "UPDATE referral_codes SET total_referrals = total_referrals + 1 WHERE referral_code = $1",
            [validReferralCode]
          );
        }
      }
    });

    // Send welcome notification
    await sendNotification(newUser.id, NotificationType.REGISTRATION, {
      fullName: newUser.full_name,
    });

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      is_admin: newUser.is_admin,
      is_reseller: newUser.is_reseller,
    });

    return successResponse(
      201,
      {
        user: {
          id: newUser.id,
          full_name: newUser.full_name,
          email: newUser.email,
          phone_number: newUser.phone_number,
          is_admin: newUser.is_admin,
          is_reseller: newUser.is_reseller,
          wallet_balance: parseFloat(newUser.wallet_balance),
          created_at: newUser.created_at,
        },
        token,
      },
      "Registration successful"
    );
  } catch (error) {
    console.error("Registration error:", error);
    return errorResponse(500, "Registration failed. Please try again.");
  }
};
