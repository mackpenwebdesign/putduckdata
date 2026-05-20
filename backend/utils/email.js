/**
 * Email Utility - Gmail SMTP via Nodemailer
 *
 * Required .env variables:
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_USER=your-email@gmail.com
 * SMTP_PASS=your-app-password (Google App Password, NOT your regular password)
 * FROM_EMAIL=your-email@gmail.com
 * FROM_NAME=PutDuckData
 */

import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.warn("[EMAIL] SMTP not configured - emails will be logged only");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export const sendEmail = async (to, subject, html) => {
  try {
    /* SMTP disabled — configure SMTP env vars and remove this block to re-enable
    const transporter = createTransporter();

    if (!transporter) {
      console.log(`[EMAIL] (no SMTP) To: ${to}, Subject: ${subject}`);
      return true;
    }

    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "PutDuckData"}" <${
        process.env.FROM_EMAIL || process.env.SMTP_USER
      }>`,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
    return true;
    */

    console.log(`[EMAIL] (SMTP disabled) To: ${to}, Subject: ${subject}`);
    return true;
  } catch (error) {
    console.error("[EMAIL] Send error:", error.message);
    return false;
  }
};

/**
 * Email templates
 */
export const EmailTemplates = {
  passwordReset: (resetLink, expiryMinutes = 15) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #f87171); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; background: #ffffff; }
        .button { display: inline-block; padding: 14px 32px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f4f4f4; border-radius: 0 0 12px 12px; }
        .warning { color: #d32f2f; font-weight: bold; }
        code { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 13px; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PutDuckData</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </p>
          <p>Or copy this link:<br><code>${resetLink}</code></p>
          <p class="warning">This link expires in ${expiryMinutes} minutes.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PutDuckData. All rights reserved.</p>
          <p>Contact: support@putduckdata.com</p>
          <p>Tel: 0322291381</p>
        </div>
      </div>
    </body>
    </html>
  `,

  adminPasswordReset: (resetLink, adminName, expiryMinutes = 30) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #f87171); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; background: #ffffff; }
        .button { display: inline-block; padding: 14px 32px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f4f4f4; border-radius: 0 0 12px 12px; }
        .info { background: #fef2f2; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 16px 0; }
        code { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 13px; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PutDuckData</h1>
        </div>
        <div class="content">
          <h2>Password Reset</h2>
          <div class="info">
            <p style="margin: 0;">An administrator (${adminName}) has initiated a password reset for your account.</p>
          </div>
          <p>Click the button below to set a new password:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Set New Password</a>
          </p>
          <p>Or copy this link:<br><code>${resetLink}</code></p>
          <p><strong>This link expires in ${expiryMinutes} minutes.</strong></p>
          <p>If you did not request this, please contact support immediately.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PutDuckData. All rights reserved.</p>
          <p>Contact: support@putduckdata.com</p>
          <p>Tel: 0322291381</p>
        </div>
      </div>
    </body>
    </html>
  `,

  passwordChanged: () => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #f87171); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; background: #ffffff; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f4f4f4; border-radius: 0 0 12px 12px; }
        .success { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PutDuckData</h1>
        </div>
        <div class="content">
          <h2>Password Changed Successfully</h2>
          <p class="success">Your password has been changed successfully.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PutDuckData. All rights reserved.</p>
          <p>Contact: support@putduckdata.com</p>
          <p>Tel: 0322291381</p>
        </div>
      </div>
    </body>
    </html>
  `,

  welcome: (fullName) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #f87171); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; background: #ffffff; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f4f4f4; border-radius: 0 0 12px 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to PutDuckData!</h1>
        </div>
        <div class="content">
          <h2>Hi ${fullName},</h2>
          <p>Thank you for registering with PutDuckData!</p>
          <p>You can now:</p>
          <ul>
            <li>Fund your wallet securely</li>
            <li>Purchase data for MTN, Vodafone, and AirtelTigo</li>
            <li>Get the cheapest data prices in Ghana</li>
            <li>Track all your transactions</li>
          </ul>
          <p>Get started by funding your wallet!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PutDuckData. All rights reserved.</p>
          <p>Contact: support@putduckdata.com</p>
          <p>Tel: 0322291381</p>
        </div>
      </div>
    </body>
    </html>
  `,
};
