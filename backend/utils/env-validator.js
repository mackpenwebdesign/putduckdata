/**
 * Environment Variable Validation
 * Validates all required environment variables on startup
 */

const REQUIRED_ENV_VARS =
  process.env.NODE_ENV === "development"
    ? [
        {
          name: "JWT_SECRET",
          validator: (val) => val && val.length >= 32,
          error: "JWT_SECRET must be at least 32 characters for security",
        },
        {
          name: "PAYSTACK_SECRET_KEY",
          validator: (val) =>
            val && (val.startsWith("sk_test_") || val.startsWith("sk_live_")),
          error: "PAYSTACK_SECRET_KEY must start with sk_test_ or sk_live_",
        },
        {
          name: "PAYSTACK_PUBLIC_KEY",
          validator: (val) =>
            val && (val.startsWith("pk_test_") || val.startsWith("pk_live_")),
          error: "PAYSTACK_PUBLIC_KEY must start with pk_test_ or pk_live_",
        },
      ]
    : [
        {
          name: "DATABASE_URL",
          validator: (val) => val && val.startsWith("postgresql://"),
          error: "DATABASE_URL must be a valid PostgreSQL connection string",
        },

        {
          name: "JWT_SECRET",
          validator: (val) => val && val.length >= 32,
          error: "JWT_SECRET must be at least 32 characters for security",
        },
        {
          name: "PAYSTACK_SECRET_KEY",
          validator: (val) =>
            val && (val.startsWith("sk_test_") || val.startsWith("sk_live_")),
          error: "PAYSTACK_SECRET_KEY must start with sk_test_ or sk_live_",
        },
        {
          name: "PAYSTACK_PUBLIC_KEY",
          validator: (val) =>
            val && (val.startsWith("pk_test_") || val.startsWith("pk_live_")),
          error: "PAYSTACK_PUBLIC_KEY must start with pk_test_ or pk_live_",
        },
      ];

const OPTIONAL_ENV_VARS = [
  "NODE_ENV",
  "JWT_EXPIRY",
  "RATE_LIMIT_MAX",
  "FRONTEND_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "FROM_EMAIL",
  "FROM_NAME",
];

/**
 * Validate environment variables
 * @returns {Object} { valid: boolean, errors: Array }
 */
export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      errors.push(`Missing required environment variable: ${envVar.name}`);
    } else if (!envVar.validator(value)) {
      errors.push(envVar.error);
    }
  }

  // Check optional but recommended variables
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (!process.env[envVar]) {
      warnings.push(`Optional environment variable not set: ${envVar}`);
    }
  }

  // Environment-specific checks
  if (process.env.NODE_ENV === "production") {
    if (process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_")) {
      errors.push("PRODUCTION: Must use live Paystack keys (sk_live_...)");
    }

    if (
      !process.env.FRONTEND_URL ||
      process.env.FRONTEND_URL.includes("localhost")
    ) {
      warnings.push(
        "PRODUCTION: FRONTEND_URL should be set to production domain"
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Print validation results
 */
export const printValidationResults = () => {
  const result = validateEnvironment();

  console.log("\n========================================");
  console.log("ENVIRONMENT VALIDATION");
  console.log("========================================\n");

  if (result.valid) {
    console.log("✅ All required environment variables are valid\n");
  } else {
    console.error("❌ ENVIRONMENT VALIDATION FAILED\n");
    result.errors.forEach((error) => console.error(`  ❌ ${error}`));
    console.log("\n");
    process.exit(1); // Exit if validation fails
  }

  if (result.warnings.length > 0) {
    console.warn("⚠️  WARNINGS:\n");
    result.warnings.forEach((warning) => console.warn(`  ⚠️  ${warning}`));
    console.log("\n");
  }

  console.log("Environment: " + (process.env.NODE_ENV || "development"));
  console.log("========================================\n");
};

// Auto-validate on import in development
if (process.env.NODE_ENV !== "test") {
  printValidationResults();
}
