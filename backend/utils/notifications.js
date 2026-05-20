/**
 * Notification System
 *
 * This module handles all notification events in the system.
 * Supports in-app notifications and can be extended for email/SMS.
 */

import { executeQuery } from "./db.js";

/**
 * Notification types
 */
export const NotificationType = {
  REGISTRATION: "registration",
  LOGIN: "login",
  WALLET_FUND: "wallet_fund",
  WALLET_FUND_SUCCESS: "wallet_fund_success",
  DATA_PURCHASE: "data_purchase",
  DATA_PURCHASE_SUCCESS: "data_purchase_success",
  ADMIN_ALERT: "admin_alert",
  BROADCAST: "broadcast",
  ADMIN_FUND: "admin_fund",
  MANUAL_FUND_APPROVED: "manual_fund_approved",
  MANUAL_FUND_REJECTED: "manual_fund_rejected",
  MANUAL_FUND_REQUEST: "manual_fund_request",
  MOMO_REQUEST: "momo_request",
  MOMO_APPROVED: "momo_approved",
  MOMO_REJECTED: "momo_rejected",
};

/**
 * Create a notification
 * @param {number} userId - User ID to notify
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} metadata - Additional data
 */
export const createNotification = async (
  userId,
  type,
  title,
  message,
  metadata = {}
) => {
  try {
    await executeQuery(
      `INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, message, JSON.stringify(metadata), false]
    );
  } catch (error) {
    console.error("Failed to create notification:", error);
    // Don't throw - notifications shouldn't break the main flow
  }
};

/**
 * Create notification for admin users
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} metadata - Additional data
 */
export const notifyAdmins = async (type, title, message, metadata = {}) => {
  try {
    // Get all admin users
    const admins = await executeQuery(
      "SELECT id FROM users WHERE is_admin = true"
    );

    // Create notification for each admin
    for (const admin of admins) {
      await createNotification(admin.id, type, title, message, metadata);
    }
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
};

/**
 * Notification templates for common events
 */
export const NotificationTemplates = {
  registration: (fullName) => ({
    title: "Welcome to PutDuckData!",
    message: `Hi ${fullName}, your account has been created successfully. Start by funding your wallet.`,
  }),

  walletFundSuccess: (amount) => ({
    title: "Wallet Funded Successfully",
    message: `Your wallet has been credited with GH₵${amount.toFixed(2)}`,
  }),

  dataPurchaseSuccess: (network, dataVolume, phoneNumber) => ({
    title: "Data Purchase Successful",
    message: `${dataVolume} ${network} data sent to ${phoneNumber}`,
  }),
};

/**
 * Send notification (wrapper function)
 * @param {number} userId - User ID
 * @param {string} type - Notification type from NotificationType
 * @param {Object} data - Data for the notification
 */
export const sendNotification = async (userId, type, data = {}) => {
  let title, message;

  switch (type) {
    case NotificationType.REGISTRATION:
      ({ title, message } = NotificationTemplates.registration(data.fullName));
      break;
    case NotificationType.WALLET_FUND_SUCCESS:
      ({ title, message } = NotificationTemplates.walletFundSuccess(data.amount));
      break;
    case NotificationType.DATA_PURCHASE_SUCCESS:
      ({ title, message } = NotificationTemplates.dataPurchaseSuccess(
        data.network,
        data.dataVolume,
        data.phoneNumber
      ));
      break;
    default:
      title = "Notification";
      message = data.message || "You have a new notification";
  }

  await createNotification(userId, type, title, message, data);
};

/**
 * Send notification to admins
 */
export const sendAdminNotification = async (type, data = {}) => {
  let title, message;

  title = data.title || "Admin Alert";
  message = data.message || "New admin notification";

  await notifyAdmins(type, title, message, data);
};
