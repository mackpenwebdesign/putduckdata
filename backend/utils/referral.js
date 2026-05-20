import crypto from 'crypto';

export const generateReferralCode = (userId, email) => {
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}${email}${Date.now()}`)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
  return `REF${userId}${hash}`;
};

export const calculateCommission = (purchaseAmount, commissionRate = 1.0) => {
  return Math.round(purchaseAmount * (commissionRate / 100) * 100) / 100;
};
