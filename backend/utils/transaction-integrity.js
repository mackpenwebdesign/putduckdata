import crypto from "crypto";

/**
 * Transaction Integrity
 *
 * Signs critical transaction fields with HMAC-SHA256 at creation time.
 * Verified before any wallet credit, preventing DB-level amount tampering.
 *
 * Protected fields: reference + amount (in pesewas) + userId
 * Secret: JWT_SECRET (never exposed to client)
 */

/**
 * Sign a transaction to produce an integrity hash
 * @param {string} reference - Unique transaction reference
 * @param {number} amountPrecis - Amount in pesewas (integer, no floats)
 * @param {number} userId - User ID (or 0 for guest, -1 for guest purchase)
 * @returns {string} HMAC-SHA256 hex string
 */
export const signTransaction = (reference, amountPrecis, userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set — cannot sign transaction");
  const payload = `${reference}:${amountPrecis}:${userId}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

/**
 * Sign a guest transaction with additional phone verification
 * Prevents tampering of phone number or plan after payment is initiated
 * @param {string} reference - Unique transaction reference
 * @param {number} amountPrecis - Amount in pesewas
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} dataPlanId - Data plan ID
 * @returns {string} HMAC-SHA256 hex string
 */
export const signGuestTransaction = (
  reference,
  amountPrecis,
  phoneNumber,
  dataPlanId
) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set — cannot sign transaction");
  // Include phone and plan in hash to prevent tampering of these fields
  const payload = `${reference}:${amountPrecis}:${phoneNumber}:${dataPlanId}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

/**
 * Verify a guest transaction's integrity hash
 * @param {string} reference - Transaction reference
 * @param {number} amountPrecis - Amount in pesewas
 * @param {string} phoneNumber - Phone number
 * @param {string} dataPlanId - Data plan ID
 * @param {string|null} storedHash - Hash stored in transaction metadata
 * @returns {boolean} True if integrity is confirmed
 */
export const verifyGuestTransactionIntegrity = (
  reference,
  amountPrecis,
  phoneNumber,
  dataPlanId,
  storedHash
) => {
  if (!storedHash) return false;

  try {
    const expected = signGuestTransaction(
      reference,
      amountPrecis,
      phoneNumber,
      dataPlanId
    );
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(storedHash, "hex")
    );
  } catch {
    return false;
  }
};

/**
 * Verify a transaction's integrity hash
 * @param {string} reference - Transaction reference
 * @param {number} amountPrecis - Amount in pesewas
 * @param {number} userId - User ID
 * @param {string|null} storedHash - Hash stored in transaction metadata
 * @returns {boolean} True if integrity is confirmed (or hash not present for old transactions)
 */
export const verifyTransactionIntegrity = (
  reference,
  amountPrecis,
  userId,
  storedHash
) => {
  // Graceful fallback for transactions created before this feature was added
  if (!storedHash) return true;

  try {
    const expected = signTransaction(reference, amountPrecis, userId);
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(storedHash, "hex")
    );
  } catch {
    return false;
  }
};

/**
 * Compare two values using timing-safe equality
 * Use this for any secret/signature comparison to prevent timing attacks
 * @param {string} a - First value
 * @param {string} b - Second value
 * @returns {boolean}
 */
export const timingSafeCompare = (a, b) => {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
      // Still run timingSafeEqual on same-length buffers to avoid leaking length info
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};
