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
    if (!auth.authenticated)
      return errorResponse(401, auth.error || "Authentication required");
    if (!hasRole(auth.user, "admin"))
      return errorResponse(403, "Admin access required");
    if (!(await verifyAdminFromDB(auth.user.id)))
      return errorResponse(403, "Admin access required");

    const params = event.queryStringParameters || {};
    const period = parseInt(params.period) || 30;
    const dateFilter = params.date || "30days";

    if (period < 1 || period > 365)
      return errorResponse(400, "Period must be between 1 and 365 days");

    // ── Date conditions ───────────────────────────────────────────────────────
    let txnDateCondition = `t.created_at >= CURRENT_DATE - INTERVAL '${period} days'`;
    let userDateCondition = `u.created_at >= CURRENT_DATE - INTERVAL '${period} days'`;
    let plainDateCondition = `created_at >= CURRENT_DATE - INTERVAL '${period} days'`;
    let visitDateCondition = `created_at >= CURRENT_DATE - INTERVAL '${period} days'`;

    if (dateFilter === "today") {
      txnDateCondition = "DATE(t.created_at) = CURRENT_DATE";
      userDateCondition = "DATE(u.created_at) = CURRENT_DATE";
      plainDateCondition = "DATE(created_at) = CURRENT_DATE";
      visitDateCondition = "DATE(created_at) = CURRENT_DATE";
    } else if (dateFilter === "yesterday") {
      txnDateCondition = "DATE(t.created_at) = CURRENT_DATE - INTERVAL '1 day'";
      userDateCondition =
        "DATE(u.created_at) = CURRENT_DATE - INTERVAL '1 day'";
      plainDateCondition = "DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'";
      visitDateCondition = "DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'";
    } else if (dateFilter === "7days") {
      txnDateCondition = "t.created_at >= CURRENT_DATE - INTERVAL '7 days'";
      userDateCondition = "u.created_at >= CURRENT_DATE - INTERVAL '7 days'";
      plainDateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
      visitDateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (dateFilter === "all") {
      txnDateCondition = "t.created_at IS NOT NULL";
      userDateCondition = "u.created_at IS NOT NULL";
      plainDateCondition = "created_at IS NOT NULL";
      visitDateCondition = "created_at IS NOT NULL";
    }

    // ── 1. Revenue Analytics ──────────────────────────────────────────────────
    const revenueData = await executeQuery(
      `SELECT
        DATE(t.created_at) as date,
        SUM(CASE WHEN t.type = 'wallet_fund' AND t.status = 'success' THEN t.amount ELSE 0 END) as wallet_funds,
        SUM(CASE WHEN t.type IN ('data_purchase', 'guest_data_purchase') AND t.status IN ('success', 'completed') THEN t.amount ELSE 0 END) as data_sales,
        COUNT(CASE WHEN t.type IN ('data_purchase', 'guest_data_purchase') AND t.status IN ('success', 'completed') THEN 1 END) as transaction_count
       FROM transactions t
       WHERE ${txnDateCondition}
       GROUP BY DATE(t.created_at)
       ORDER BY date ASC`
    );

    // ── 2. Revenue Summary ────────────────────────────────────────────────────
    const revenueSummary = await executeQuery(
      `SELECT
        SUM(CASE WHEN t.type = 'wallet_fund' AND t.status = 'success' THEN t.amount ELSE 0 END) as total_wallet_funds,
        SUM(CASE WHEN t.type IN ('data_purchase', 'guest_data_purchase') AND t.status IN ('success', 'completed') THEN t.amount ELSE 0 END) as total_data_sales,
        COUNT(CASE WHEN t.type IN ('data_purchase', 'guest_data_purchase') AND t.status IN ('success', 'completed') THEN 1 END) as total_transactions
       FROM transactions t
       WHERE ${txnDateCondition}`
    );

    // ── 3. User Growth ────────────────────────────────────────────────────────
    const userGrowth = await executeQuery(
      `SELECT
        DATE(u.created_at) as date,
        COUNT(*) as new_users,
        SUM(COUNT(*)) OVER (ORDER BY DATE(u.created_at)) as cumulative_users
       FROM users u
       WHERE ${userDateCondition}
       GROUP BY DATE(u.created_at)
       ORDER BY date ASC`
    );

    // ── 4. User Role Distribution ─────────────────────────────────────────────
    const usersByRole = await executeQuery(
      `SELECT
        CASE WHEN is_admin = true THEN 'admin' ELSE 'customer' END as role,
        COUNT(*) as count
       FROM users
       GROUP BY CASE WHEN is_admin = true THEN 'admin' ELSE 'customer' END`
    );

    // ── 5. Network Popularity ─────────────────────────────────────────────────
    const networkPopularity = await executeQuery(
      `SELECT
        t.metadata->>'network' as network,
        COUNT(*) as purchase_count,
        SUM(t.amount) as total_revenue
       FROM transactions t
       WHERE t.type IN ('data_purchase', 'guest_data_purchase')
         AND t.status IN ('success', 'completed')
         AND t.metadata->>'network' IS NOT NULL
         AND ${txnDateCondition}
       GROUP BY t.metadata->>'network'
       ORDER BY purchase_count DESC`
    );

    // ── 6. Geographic Distribution ────────────────────────────────────────────
    const geographicData = await executeQuery(
      `SELECT country, COUNT(*) as user_count
       FROM users
       WHERE country IS NOT NULL
       GROUP BY country
       ORDER BY user_count DESC
       LIMIT 10`
    );

    // ── 7. Active Users ───────────────────────────────────────────────────────
    const activeUsers = await executeQuery(
      `SELECT
        COUNT(DISTINCT last_login_ip) as unique_ips,
        COUNT(*) as total_users
       FROM users
       WHERE last_login_ip IS NOT NULL`
    );

    // ── 8. Top Customers ──────────────────────────────────────────────────────
    const topCustomers = await executeQuery(
      `SELECT
        u.id,
        u.full_name,
        u.email,
        COUNT(t.id) as transaction_count,
        SUM(t.amount) as total_spent
       FROM users u
       JOIN transactions t ON u.id = t.user_id
       WHERE t.type = 'data_purchase'
         AND t.status IN ('success', 'completed')
         AND ${txnDateCondition}
       GROUP BY u.id, u.full_name, u.email
       ORDER BY total_spent DESC
       LIMIT 10`
    );

    // ── 9. Platform Stats ─────────────────────────────────────────────────────
    const platformStats = await executeQuery(
      `SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COALESCE(SUM(wallet_balance), 0) FROM users) as total_wallet_balance,
        (SELECT COUNT(*) FROM transactions WHERE type IN ('data_purchase', 'guest_data_purchase') AND status IN ('success', 'completed')) as total_successful_transactions,
        (SELECT COUNT(*) FROM transactions WHERE type IN ('data_purchase', 'guest_data_purchase') AND status IN ('success', 'completed', 'pending', 'processing')) as total_data_purchases`
    );

    // ── 10. Visitor Stats — total visits in period ────────────────────────────
    // Gracefully returns zeros if the page_visits table doesn't exist yet.
    let visitorSummary = [{ total_visits: 0, unique_visitors: 0 }];
    let visitorDaily = [];
    try {
      const [vs, vd] = await Promise.all([
        executeQuery(
          `SELECT
            COUNT(*) as total_visits,
            COUNT(DISTINCT visitor_id) as unique_visitors
           FROM page_visits
           WHERE ${visitDateCondition}`
        ),
        executeQuery(
          `SELECT
            DATE(created_at) as date,
            COUNT(*) as total_visits,
            COUNT(DISTINCT visitor_id) as unique_visitors
           FROM page_visits
           WHERE ${visitDateCondition}
           GROUP BY DATE(created_at)
           ORDER BY date ASC`
        ),
      ]);
      const norm = (r) => (Array.isArray(r) ? r : r?.rows || []);
      visitorSummary = norm(vs);
      visitorDaily = norm(vd);
    } catch (_) {
      // Table not yet created — return zeros so frontend doesn't break
    }

    // ── Normalize all results ─────────────────────────────────────────────────
    const normalize = (r) => (Array.isArray(r) ? r : r?.rows || []);

    const revenueRows = normalize(revenueData);
    const summaryRows = normalize(revenueSummary);
    const growthRows = normalize(userGrowth);
    const roleRows = normalize(usersByRole);
    const networkRows = normalize(networkPopularity);
    const geoRows = normalize(geographicData);
    const activeRows = normalize(activeUsers);
    const customerRows = normalize(topCustomers);
    const platformRows = normalize(platformStats);

    return successResponse(
      200,
      {
        period_days: period,
        date_filter: dateFilter,

        // ── Visitors ────────────────────────────────────────────────────────
        visitors: {
          total_visits: parseInt(visitorSummary[0]?.total_visits) || 0,
          unique_visitors: parseInt(visitorSummary[0]?.unique_visitors) || 0,
          daily: visitorDaily.map((row) => ({
            date: row.date,
            total_visits: parseInt(row.total_visits) || 0,
            unique_visitors: parseInt(row.unique_visitors) || 0,
          })),
        },

        // ── Revenue ─────────────────────────────────────────────────────────
        revenue: {
          daily: revenueRows.map((row) => ({
            date: row.date,
            wallet_funds: parseFloat(row.wallet_funds) || 0,
            data_sales: parseFloat(row.data_sales) || 0,
            transaction_count: parseInt(row.transaction_count) || 0,
          })),
          summary: {
            total_wallet_funds:
              parseFloat(summaryRows[0]?.total_wallet_funds) || 0,
            total_data_sales: parseFloat(summaryRows[0]?.total_data_sales) || 0,
            total_revenue:
              (parseFloat(summaryRows[0]?.total_wallet_funds) || 0) +
              (parseFloat(summaryRows[0]?.total_data_sales) || 0),
            total_transactions:
              parseInt(summaryRows[0]?.total_transactions) || 0,
          },
        },

        // ── User Growth ──────────────────────────────────────────────────────
        user_growth: {
          daily: growthRows.map((row) => ({
            date: row.date,
            new_users: parseInt(row.new_users) || 0,
            cumulative_users: parseInt(row.cumulative_users) || 0,
          })),
          by_role: roleRows.map((row) => ({
            role: row.role,
            count: parseInt(row.count) || 0,
          })),
        },

        // ── Network ──────────────────────────────────────────────────────────
        network_analytics: networkRows.map((row) => ({
          network: row.network,
          purchase_count: parseInt(row.purchase_count) || 0,
          total_revenue: parseFloat(row.total_revenue) || 0,
        })),

        // ── Geo ──────────────────────────────────────────────────────────────
        geographic_distribution: geoRows.map((row) => ({
          country: row.country,
          user_count: parseInt(row.user_count) || 0,
        })),

        // ── Active Users ─────────────────────────────────────────────────────
        active_users: {
          unique_ips: parseInt(activeRows[0]?.unique_ips) || 0,
          total_users: parseInt(activeRows[0]?.total_users) || 0,
        },

        // ── Top Customers ────────────────────────────────────────────────────
        top_customers: customerRows.map((row) => ({
          id: row.id,
          full_name: row.full_name,
          email: row.email,
          transaction_count: parseInt(row.transaction_count) || 0,
          total_spent: parseFloat(row.total_spent) || 0,
        })),

        // ── Platform ─────────────────────────────────────────────────────────
        platform_stats: {
          total_users: parseInt(platformRows[0]?.total_users) || 0,
          total_wallet_balance:
            parseFloat(platformRows[0]?.total_wallet_balance) || 0,
          total_successful_transactions:
            parseInt(platformRows[0]?.total_successful_transactions) || 0,
          total_data_purchases:
            parseInt(platformRows[0]?.total_data_purchases) || 0,
        },
      },
      "Analytics retrieved successfully"
    );
  } catch (error) {
    console.error("Analytics error:", error);
    return errorResponse(500, "Failed to retrieve analytics data");
  }
};
