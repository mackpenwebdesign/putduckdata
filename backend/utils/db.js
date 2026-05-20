import { neon, neonConfig } from "@neondatabase/serverless";

// Enable connection pooling for better performance and scalability
neonConfig.fetchConnectionCache = true;

let dbInstance = null;
let mockDbInstance = null;

const isDevMode =
  process.env.NODE_ENV === "development" || !process.env.DATABASE_URL;

const createMockDb = () => {
  const dataStores = {
    page_visits: [],
    system_settings: [
      { setting_key: "maintenance_mode", setting_value: false },
      { setting_key: "maintenance_message", setting_value: null },
      { setting_key: "maintenance_scheduled_end", setting_value: null },
    ],
    broadcasts: [
      {
        id: 1,
        title: "Welcome to PutDuckData!",
        message: "Fastest data bundles in Ghana. Buy now and save!",
        targets: "all",
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };

  return async (query, params = []) => {
    const qlower = query.toLowerCase();

    if (qlower.includes("create table") || qlower.includes("ensure table")) {
      console.log("Dev fallback: table created");
      return [];
    }

    if (qlower.includes("insert into page_visits")) {
      dataStores.page_visits.push({
        id: dataStores.page_visits.length + 1,
        ip_address: params[1] || "dev",
        page_path: params[2] || "/",
        user_agent: params[3] || "dev",
        created_at: new Date().toISOString(),
      });
      return [];
    }

    if (qlower.includes("system_settings")) {
      return dataStores.system_settings;
    }

    if (qlower.includes("data_plans")) {
      return [];
    }

    if (qlower.includes("active_broadcasts") && qlower.includes("select")) {
      let active = dataStores.broadcasts.filter(
        (b) =>
          b.is_active && (!b.expires_at || new Date(b.expires_at) > new Date())
      );

      if (params.length >= 1 && params[0] && typeof params[0] === "string") {
        try {
          const targetArrayStr = params[0].replace(/^{|}$/g, "");
          const targets = targetArrayStr.split(",");
          active = active.filter((b) => targets.includes(b.targets));
        } catch (e) {
          console.warn("Mock DB: Failed to parse targets param:", params[0]);
        }
      }

      return active;
    }

    if (
      qlower.includes("broadcasts") &&
      qlower.includes("update") &&
      qlower.includes("is_active = false")
    ) {
      dataStores.broadcasts.forEach((b) => (b.is_active = false));
      return [];
    }

    if (qlower.includes("insert into broadcasts")) {
      const newId = dataStores.broadcasts.length + 1;
      const newBroadcast = {
        id: newId,
        title: params[1],
        message: params[2],
        url: params[3],
        targets: params[4],
        created_by: params[5],
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      dataStores.broadcasts.push(newBroadcast);
      return [{ id: newId }];
    }

    console.warn("Dev DB fallback unknown query:", query.substring(0, 100));
    return [];
  };
};

/**
 * Get database connection with connection pooling
 * Implements singleton pattern for efficient connection management
 * @returns {Function} SQL query function
 */
export const getDb = () => {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    if (!dbInstance) {
      try {
        dbInstance = neon(process.env.DATABASE_URL);
        console.log("✅ Neon DB connected");
      } catch (e) {
        console.error("Neon connect fail:", e.message);
        return createMockDb();
      }
    }
    return dbInstance;
  }

  // Fallback to mock only if no DATABASE_URL
  if (!mockDbInstance) {
    mockDbInstance = createMockDb();
  }
  return mockDbInstance;
};

/**
 * Execute a parameterized SQL query (prevents SQL injection)
 * @param {string} query - SQL query with $1, $2, etc. placeholders
 * @param {Array} params - Parameters to bind to the query
 * @returns {Promise<Array>} Query results
 */
export const executeQuery = async (query, params = []) => {
  const sql = getDb();

  try {
    const result = await sql(query, params);
    return result;
  } catch (error) {
    if (
      error.name === "NeonDbError" ||
      error.message.includes("fetch failed") ||
      error.message.includes("ENOTFOUND")
    ) {
      console.warn(
        "DB connect error, using fallback: ",
        query.substring(0, 50)
      );
      return [];
    }
    console.error("Database query error:", error);
    throw new Error("Database operation failed");
  }
};

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Async function that receives sql instance
 * @returns {Promise<any>} Transaction result
 */
export const executeTransaction = async (callback) => {
  const sql = getDb();

  try {
    await sql("BEGIN");
    const result = await callback(sql);
    await sql("COMMIT");
    return result;
  } catch (error) {
    await sql("ROLLBACK");
    console.error("Transaction error:", error);
    throw error;
  }
};
