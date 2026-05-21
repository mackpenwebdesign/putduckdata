/**
 * Formats a number into a compact string (e.g., 1.5M+, 50K+)
 */
export const formatCompactNumber = (num) => {
  const n = parseFloat(num) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
  if (n >= 50000) return `${Math.floor(n / 1000)}K+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
};

/**
 * Formats a number into Ghana Cedi currency (GH₵)
 */
export const formatCurrency = (amount, compact = false) => {
  const num = parseFloat(amount) || 0;
  if (compact && num >= 50000) return `GH₵${formatCompactNumber(num)}`;
  return `GH₵${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Strips period-type suffixes from plan names (Monthly, Daily, Weekly, etc.)
 * so they never appear in the UI regardless of what the DB contains.
 */
export const cleanPlanName = (name) => {
  if (!name) return name;
  return name
    .replace(/\b(monthly|daily|weekly|yearly|annual|biweekly|fortnightly)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

/**
 * Formats a date string or object into a readable format
 * Fixes the "missing export" error in AdminAnalytics.jsx
 */
export const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);

  // Returns format: 01 Apr 2026
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
