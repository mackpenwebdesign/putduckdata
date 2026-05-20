import { authenticateUser, hasRole, verifyAdminFromDB } from "../utils/auth.js";
import {
  successResponse,
  errorResponse,
  corsResponse,
} from "../utils/response.js";
import { executeQuery } from "../utils/db.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse();
  if (event.httpMethod !== "GET")
    return errorResponse(405, "Method not allowed");

  try {
    const auth = await authenticateUser(event.headers);
    if (!auth.authenticated) return errorResponse(401, "Auth required");
    if (!hasRole(auth.user, "admin")) return errorResponse(403, "Admin only");
    if (!(await verifyAdminFromDB(auth.user.id))) return errorResponse(403, "Admin only");

    const params = event.queryStringParameters || {};
    const dateFilter = params.date || "today";
    const limit = parseInt(params.limit) || 100;
    const offset = parseInt(params.offset) || 0;

    // ── Date condition ──────────────────────────────────────────────────────
    let dateCondition;
    switch (dateFilter) {
      case "today":
        dateCondition = "DATE(t.created_at) = CURRENT_DATE";
        break;
      case "yesterday":
        dateCondition = "DATE(t.created_at) = CURRENT_DATE - INTERVAL '1 day'";
        break;
      case "7days":
        dateCondition = "t.created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case "30days":
        dateCondition = "t.created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case "month":
        dateCondition =
          "DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case "lastmonth":
        dateCondition =
          "DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')";
        break;
      case "all":
        dateCondition = "true";
        break;
      default:
        dateCondition = "DATE(t.created_at) = CURRENT_DATE";
    }

    // ── Type + status condition (only confirmed Paystack-paid purchases) ─
    const typeCondition = `
      t.type IN ('data_purchase', 'guest_data_purchase')
      AND t.status IN ('success', 'completed')
    `;

    const purchases = await executeQuery(
      `
      SELECT 
        t.id,
        t.reference,
        COALESCE(
        t.recipient_phone,
        t.metadata->>'phone_number',
        t.metadata->>'phone',
        t.metadata->>'recipient_phone'
        ) AS phone,
        t.amount,
        t.status,
        t.type,
        t.created_at,
        t.metadata,
        COALESCE(u.full_name, 'Guest') AS user_name,
        u.email,
        t.metadata->>'network' AS network,
        t.metadata->>'plan'    AS plan
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE ${typeCondition}
        AND ${dateCondition}
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const total = await executeQuery(
      `SELECT COUNT(*)::int AS count
       FROM transactions t
       WHERE ${typeCondition}
         AND ${dateCondition}`
    );

    const purchaseRows = Array.isArray(purchases)
      ? purchases
      : purchases?.rows || [];
    const totalRows = Array.isArray(total) ? total : total?.rows || [];

    return successResponse(200, {
      date_filter: dateFilter,
      purchases: purchaseRows.map((p) => ({
        id: p.id,
        reference: p.reference,
        phone: p.phone || "N/A",
        amount: parseFloat(p.amount),
        status: p.status,
        type: p.type,
        date: p.created_at,
        network: p.network || "Unknown",
        plan: p.plan || "Unknown",
        user_name: p.user_name,
        email: p.email || "Guest",
      })),
      pagination: {
        total: parseInt(totalRows[0]?.count || 0),
        limit,
        offset,
        has_more: offset + limit < parseInt(totalRows[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Purchase list error:", error);
    return errorResponse(500, "Failed to fetch purchases");
  }
};
