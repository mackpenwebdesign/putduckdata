import { authenticateUser } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';
import { createNotification, notifyAdmins } from '../utils/notifications.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();
  if (event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, 'Authentication required');

    const body = JSON.parse(event.body || '{}');
    const { full_name, date_of_birth, gender, phone_number, ghana_card_number, region, community } = body;

    if (!full_name || !date_of_birth || !gender || !phone_number || !ghana_card_number || !region) {
      return errorResponse(400, 'All required fields must be filled');
    }

    // Find a paid AFA transaction with no form submitted yet
    const txRows = await executeQuery(
      `SELECT id, status, metadata FROM transactions
       WHERE user_id = $1 AND type = 'afa_registration' AND status = 'success'
       ORDER BY created_at DESC LIMIT 1`,
      [auth.user.id]
    );

    if (!txRows.length) {
      return errorResponse(400, 'No paid AFA registration found. Please complete payment first.');
    }

    const tx = txRows[0];
    const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : (tx.metadata || {});

    if (meta.delivery_status === 'ongoing' || meta.delivery_status === 'completed') {
      return errorResponse(409, 'Form already submitted for this registration.');
    }

    const formData = { full_name, date_of_birth, gender, phone_number, ghana_card_number, region, community: community || '' };

    await executeQuery(
      `UPDATE transactions
       SET metadata = metadata || $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify({ afa_form: formData, delivery_status: 'ongoing', form_submitted_at: new Date().toISOString() }), tx.id]
    );

    // Notify user
    await createNotification(
      auth.user.id, 'broadcast',
      'AFA Registration Submitted',
      'Your AFA registration details have been submitted. Admin will process your registration within 24 hours.',
      { transaction_id: tx.id }
    );

    // Notify admins
    await notifyAdmins(
      'broadcast',
      'New AFA Registration Form',
      `${full_name} (${phone_number}) submitted AFA registration details. Ghana Card: ${ghana_card_number}`,
      { user_id: auth.user.id, transaction_id: tx.id, form: formData }
    );

    return successResponse(200, { transaction_id: tx.id }, 'Registration details submitted successfully. Admin will process within 24 hours.');
  } catch (err) {
    console.error('AFA form submit error:', err);
    return errorResponse(500, 'Form submission failed');
  }
};
