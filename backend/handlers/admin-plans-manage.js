import { authenticateUser, hasRole, verifyAdminFromDB } from "../utils/auth.js";
import { executeQuery } from "../utils/db.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";

/**
 * Admin Data Plans Management
 * GET /api/admin-plans-manage - List all plans
 * POST /api/admin-plans-manage - Create plan
 * PUT /api/admin-plans-manage - Update plan
 * DELETE /api/admin-plans-manage - Delete plan
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return corsResponse();
  }

  try {
    const auth = await authenticateUser(event.headers);

    if (!auth.authenticated) {
      return errorResponse(401, auth.error || "Authentication required");
    }

    if (!hasRole(auth.user, "admin")) {
      return errorResponse(403, "Admin access required");
    }
    if (!(await verifyAdminFromDB(auth.user.id))) {
      return errorResponse(403, "Admin access required");
    }

    const isAdmin = true;

    // GET - List plans
    if (event.httpMethod === "GET") {
      const network = event.queryStringParameters?.network;
      const is_active = event.queryStringParameters?.is_active;

      let query = "SELECT * FROM data_plans WHERE 1=1";
      const params = [];
      let paramIndex = 1;

      if (network) {
        query += ` AND network = $${paramIndex}`;
        params.push(network.toUpperCase());
        paramIndex++;
      }

      if (is_active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        params.push(is_active === "true");
        paramIndex++;
      }

      query += " ORDER BY network, price ASC";

      const plans = await executeQuery(query, params);

      return successResponse(200, {
        plans: plans.map((p) => ({
          id: p.id,
          network: p.network,
          plan_name: p.plan_name,
          data_volume: p.data_volume,
          validity_days: p.validity_days,
          price: parseFloat(p.price),
          cost_price: parseFloat(p.cost_price || 0),
          reseller_price: parseFloat(p.reseller_price || 0),
          reseller_pro_price: parseFloat(p.reseller_pro_price || 0),
          is_active: p.is_active,
          provider_plan_id: p.provider_plan_id,
          volume_mb: p.volume_mb,
          created_at: p.created_at,
          updated_at: p.updated_at,
        })),
        total: plans.length,
      });
    }

    // POST - Create plan (admin only)
    if (event.httpMethod === "POST") {
      if (!isAdmin) {
        return errorResponse(403, "Only admins can create plans");
      }

      const body = JSON.parse(event.body);
      const {
        network,
        plan_name,
        data_volume,
        validity_days,
        price,
        cost_price,
        is_active,
      } = body;

      // Validate required fields
      if (
        !network ||
        !plan_name ||
        !data_volume ||
        !validity_days ||
        !price ||
        !cost_price
      ) {
        return errorResponse(400, "All fields are required");
      }

      // Validate network
      if (!["MTN", "TELECEL", "AIRTEL_TIGO"].includes(network.toUpperCase())) {
        return errorResponse(400, "Invalid network");
      }

      // Validate numeric fields
      if (validity_days < 1 || price <= 0 || cost_price <= 0) {
        return errorResponse(400, "Invalid numeric values");
      }

      // Parse volume in MB from data_volume string (e.g., "5GB" -> 5000)
      const volumeMatch = data_volume.match(/(\d+(?:\.\d+)?)\s*GB/i);
      const volumeMb = volumeMatch
        ? Math.round(parseFloat(volumeMatch[1]) * 1000)
        : 0;

      const result = await executeQuery(
        `INSERT INTO data_plans (network, plan_name, data_volume, validity_days, price, cost_price, volume_mb, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          network.toUpperCase(),
          plan_name,
          data_volume,
          validity_days,
          price,
          cost_price,
          volumeMb,
          is_active !== false,
        ]
      );

      return successResponse(
        201,
        {
          plan: {
            ...result[0],
            price: parseFloat(result[0].price),
            cost_price: parseFloat(result[0].cost_price),
          },
        },
        "Data plan created successfully"
      );
    }

    // PUT - Update plan (supports bulk actions, admin only for most ops)
    if (event.httpMethod === "PUT") {
      const body = JSON.parse(event.body);

      // Handle bulk actions (admin only)
      if (body.bulk_action) {
        if (!isAdmin) {
          return errorResponse(403, "Only admins can perform bulk actions");
        }
        if (body.bulk_action === "deactivate_all") {
          await executeQuery("UPDATE data_plans SET is_active = false");
          return successResponse(200, null, "All plans deactivated");
        }
        if (body.bulk_action === "activate_all") {
          await executeQuery("UPDATE data_plans SET is_active = true");
          return successResponse(200, null, "All plans activated");
        }
        if (
          body.bulk_action === "deactivate_selected" &&
          Array.isArray(body.plan_ids)
        ) {
          await executeQuery(
            "UPDATE data_plans SET is_active = false WHERE id = ANY($1::int[])",
            [body.plan_ids]
          );
          return successResponse(
            200,
            null,
            `${body.plan_ids.length} plans deactivated`
          );
        }
        if (
          body.bulk_action === "activate_selected" &&
          Array.isArray(body.plan_ids)
        ) {
          await executeQuery(
            "UPDATE data_plans SET is_active = true WHERE id = ANY($1::int[])",
            [body.plan_ids]
          );
          return successResponse(
            200,
            null,
            `${body.plan_ids.length} plans activated`
          );
        }
        if (
          body.bulk_action === "bulk_update_reseller_prices" &&
          Array.isArray(body.prices)
        ) {
          const updates = body.prices;
          let updated = 0;
          for (const up of updates) {
            if (!up.plan_id || up.reseller_price === undefined) continue;
            const res = await executeQuery(
              "UPDATE data_plans SET reseller_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id",
              [parseFloat(up.reseller_price), up.plan_id]
            );
            if (res.length) updated++;
          }
          return successResponse(
            200,
            { updated },
            `${updated} plan reseller prices updated`
          );
        }
        return errorResponse(400, "Invalid bulk action");
      }

      // cost_price is provider-controlled — only the sync endpoint may update it
      const {
        plan_id,
        plan_name,
        data_volume,
        validity_days,
        price,
        reseller_price,
        reseller_pro_price,
        is_active,
      } = body;

      if (!plan_id) {
        return errorResponse(400, "plan_id is required");
      }

      if (!isAdmin) {
        return errorResponse(403, "Only admins can edit plans");
      }

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (plan_name) {
        updates.push(`plan_name = $${paramIndex}`);
        params.push(plan_name);
        paramIndex++;
      }

      if (data_volume) {
        updates.push(`data_volume = $${paramIndex}`);
        params.push(data_volume);
        paramIndex++;
        const volumeMatch = data_volume.match(/(\d+(?:\.\d+)?)\s*GB/i);
        if (volumeMatch) {
          updates.push(`volume_mb = $${paramIndex}`);
          params.push(Math.round(parseFloat(volumeMatch[1]) * 1000));
          paramIndex++;
        }
      }

      if (validity_days) {
        updates.push(`validity_days = $${paramIndex}`);
        params.push(validity_days);
        paramIndex++;
      }

      if (price !== undefined) {
        updates.push(`price = $${paramIndex}`);
        params.push(price);
        paramIndex++;
      }

      if (reseller_price !== undefined) {
        updates.push(`reseller_price = $${paramIndex}`);
        params.push(parseFloat(reseller_price));
        paramIndex++;
      }

      if (reseller_pro_price !== undefined) {
        updates.push(`reseller_pro_price = $${paramIndex}`);
        params.push(parseFloat(reseller_pro_price));
        paramIndex++;
      }

      if (typeof is_active === "boolean") {
        updates.push(`is_active = $${paramIndex}`);
        params.push(is_active);
        paramIndex++;
      }

      if (updates.length === 0) {
        return errorResponse(400, "No updates provided");
      }

      params.push(plan_id);

      const result = await executeQuery(
        `UPDATE data_plans SET ${updates.join(
          ", "
        )} WHERE id = $${paramIndex} RETURNING *`,
        params
      );

      if (result.length === 0) {
        return errorResponse(404, "Plan not found");
      }

      return successResponse(
        200,
        {
          plan: {
            ...result[0],
            price: parseFloat(result[0].price),
            cost_price: parseFloat(result[0].cost_price),
          },
        },
        "Data plan updated successfully"
      );
    }

    // DELETE - Delete plan (admin only)
    if (event.httpMethod === "DELETE") {
      if (!isAdmin) {
        return errorResponse(403, "Only admins can delete plans");
      }
      const plan_id = event.queryStringParameters?.plan_id;

      if (!plan_id) {
        return errorResponse(400, "plan_id is required");
      }

      const result = await executeQuery(
        "DELETE FROM data_plans WHERE id = $1 RETURNING id",
        [plan_id]
      );

      if (result.length === 0) {
        return errorResponse(404, "Plan not found");
      }

      return successResponse(200, null, "Data plan deleted successfully");
    }

    return errorResponse(405, "Method not allowed");
  } catch (error) {
    console.error("Admin plans management error:", error);
    return errorResponse(500, "Failed to manage data plans");
  }
};
