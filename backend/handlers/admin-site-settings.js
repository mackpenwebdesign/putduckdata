import { authenticateUser, hasRole, checkMaintenanceMode, verifyAdminFromDB } from '../utils/auth.js';
import { successResponse, errorResponse, corsResponse } from '../utils/response.js';
import { executeQuery } from '../utils/db.js';

/**
 * Safely read a JSONB value from PostgreSQL.
 * The driver may return it already parsed (object/boolean) or as a string.
 */
const readJsonbValue = (val) => {
  if (val === null || val === undefined) return null;
  // Already parsed by the driver
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsResponse();

  try {
    // GET - public (needed to check maintenance mode)
    if (event.httpMethod === 'GET') {
      try {
        const maintenance = await checkMaintenanceMode();
        const allSettings = await executeQuery(
          "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'maintenance_%' OR setting_key = 'data_provider'"
        );
        const settings = {};
        for (const row of allSettings) {
          settings[row.setting_key] = readJsonbValue(row.setting_value);
        }
        return successResponse(200, { maintenance_mode: maintenance.active, message: maintenance.message, scheduled_end: maintenance.scheduledEnd, settings });
      } catch (getError) {
        // If system_settings table doesn't exist, return defaults
        console.error('Site settings GET error:', getError);
        return successResponse(200, { maintenance_mode: false, message: null, scheduled_end: null, settings: {} });
      }
    }

    // PUT - admin only
    if (event.httpMethod === 'PUT') {
      const auth = await authenticateUser(event.headers);
      if (!auth.authenticated) return errorResponse(401, 'Authentication required');
      if (!hasRole(auth.user, 'admin')) return errorResponse(403, 'Admin access required');
      if (!(await verifyAdminFromDB(auth.user.id))) return errorResponse(403, 'Admin access required');

      const body = JSON.parse(event.body);
      const { settings } = body;

      if (!settings || !Array.isArray(settings)) {
        return errorResponse(400, 'Settings array is required');
      }

      const allowedKeys = ['maintenance_mode', 'maintenance_scheduled_start', 'maintenance_scheduled_end', 'maintenance_message', 'data_provider'];

      // Ensure system_settings table exists before writing
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value JSONB NOT NULL,
          description TEXT,
          updated_by INTEGER,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      let manualModeEnabled = false;

      for (const setting of settings) {
        if (!allowedKeys.includes(setting.key)) continue;

        const jsonValue = JSON.stringify(setting.value);

        await executeQuery(
          `INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
           VALUES ($1, $2::jsonb, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (setting_key)
           DO UPDATE SET setting_value = $2::jsonb, updated_by = $3, updated_at = CURRENT_TIMESTAMP`,
          [setting.key, jsonValue, auth.user.id]
        );

        if (setting.key === 'data_provider' && setting.value === 'manual') {
          manualModeEnabled = true;
        }
      }

      // When switching to manual mode, move all undelivered pending data orders to manual queue
      if (manualModeEnabled) {
        await executeQuery(
          `UPDATE transactions
           SET metadata = metadata || '{"needs_manual_fulfil": true}'::jsonb,
               updated_at = CURRENT_TIMESTAMP
           WHERE type IN ('data_purchase', 'guest_data_purchase')
             AND status IN ('pending', 'processing')
             AND (metadata->>'provider_reference' IS NULL OR metadata->>'provider_reference' = '')
             AND (metadata->>'delivery_attempted' IS NULL OR metadata->>'delivery_attempted' = 'false')`
        );
      }

      return successResponse(200, null, 'Site settings updated');
    }

    return errorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('Site settings error:', error);
    return errorResponse(500, 'Failed to process site settings');
  }
};
