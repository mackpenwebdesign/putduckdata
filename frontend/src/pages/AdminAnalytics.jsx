import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Copy,
  RefreshCw,
  Users,
  TrendingUp,
  Wifi,
  Banknote,
  ShoppingBag,
  UserCheck,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { toast } from "react-hot-toast";
import useAuthStore from "../stores/authStore";
import AnalyticsChart from "../components/AnalyticsChart";
import api from "../utils/api";
import { formatCurrency, formatDate } from "../utils/formatters";

// ─────────────────────────────────────────────
// Compact number formatter for stat cards
// ─────────────────────────────────────────────
const formatCompact = (raw) => {
  const n = Number(raw) || 0;
  const sample = formatCurrency(0);
  const symbol = sample.replace(/[\d.,\s]/g, "").trim() || "GHC";
  const prefix = `${symbol} `;
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n.toFixed(2)}`;
};

// ─────────────────────────────────────────────
// Date options
// ─────────────────────────────────────────────
const DATE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "This month", value: "month" },
  { label: "Last month", value: "lastmonth" },
  { label: "All time", value: "all" },
];

// ─────────────────────────────────────────────
// Mobile-safe Date Picker
// ─────────────────────────────────────────────
const MobileDatePicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const dropRef = useRef(null);
  const selected =
    DATE_OPTIONS.find((o) => o.value === value) || DATE_OPTIONS[0];

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open || !dropRef.current) return;
    const rect = dropRef.current.getBoundingClientRect();
    if (rect.left < 8) {
      dropRef.current.style.right = "auto";
      dropRef.current.style.left = `${8 - rect.left}px`;
    }
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-2.5 bg-dark-800 border border-dark-700
                   hover:border-primary-500/60 text-white rounded-xl text-sm font-medium
                   transition-all duration-200 min-w-[148px]"
      >
        <Calendar className="w-4 h-4 text-primary-400 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{selected.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-dark-400 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          ref={dropRef}
          className="absolute right-0 top-full mt-2 z-50
                     bg-dark-800 border border-dark-700 rounded-xl
                     shadow-2xl shadow-black/60 overflow-hidden"
          style={{ minWidth: "160px", maxWidth: "calc(100vw - 16px)" }}
        >
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                opt.value === value
                  ? "bg-primary-600/25 text-primary-400 font-semibold"
                  : "text-dark-200 hover:bg-dark-700 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Shimmer / Skeleton
// ─────────────────────────────────────────────
const Shimmer = ({ className = "" }) => (
  <div
    className={`relative overflow-hidden bg-dark-800/60 rounded-xl ${className}`}
  >
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]
                    bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"
    />
  </div>
);

const SkeletonStatCard = () => (
  <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <Shimmer className="w-9 h-9 rounded-xl flex-shrink-0" />
      <Shimmer className="h-3 w-16 flex-1" />
    </div>
    <Shimmer className="h-7 w-24" />
  </div>
);

const SkeletonChart = () => (
  <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 sm:p-6 space-y-4">
    <div className="flex items-center gap-2">
      <Shimmer className="w-8 h-8 rounded-xl" />
      <Shimmer className="h-5 w-36" />
    </div>
    <Shimmer className="h-48 sm:h-[220px] w-full rounded-xl" />
  </div>
);

const AnalyticsSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 sm:space-y-8">
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-2">
        <Shimmer className="h-8 w-44 sm:w-56" />
        <Shimmer className="h-3.5 w-32 sm:w-44" />
      </div>
      <div className="flex items-center gap-2">
        <Shimmer className="h-10 w-36 rounded-xl" />
        <Shimmer className="h-10 w-10 rounded-xl" />
      </div>
    </div>
    {/* visitor cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[0, 1, 2, 3].map((i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
    {/* main stat cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[0, 1, 2, 3].map((i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <SkeletonChart />
      <SkeletonChart />
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────
const CARD_COLORS = {
  primary: {
    icon: "bg-primary-600/10 border-primary-600/25 text-primary-400",
    dot: "bg-primary-500",
  },
  green: {
    icon: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    dot: "bg-emerald-500",
  },
  blue: {
    icon: "bg-sky-500/10     border-sky-500/25     text-sky-400",
    dot: "bg-sky-500",
  },
  purple: {
    icon: "bg-violet-500/10  border-violet-500/25  text-violet-400",
    dot: "bg-violet-500",
  },
  cyan: {
    icon: "bg-cyan-500/10    border-cyan-500/25    text-cyan-400",
    dot: "bg-cyan-500",
  },
  orange: {
    icon: "bg-primary-500/10  border-primary-500/25  text-primary-400",
    dot: "bg-primary-500",
  },
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color = "primary",
}) => {
  const c = CARD_COLORS[color];
  const len = String(value).length;
  const valueCls =
    len > 12
      ? "text-base sm:text-lg font-bold text-white leading-snug"
      : len > 8
      ? "text-lg sm:text-xl font-bold text-white leading-snug"
      : "text-xl sm:text-2xl font-bold text-white leading-snug";

  return (
    <div
      className="bg-dark-900 border border-dark-800 hover:border-dark-600
                    rounded-2xl p-4 flex flex-col gap-2.5 transition-all duration-300
                    relative overflow-hidden group"
    >
      <span
        className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full opacity-40 ${c.dot}`}
      />
      <div className="flex items-center gap-2.5">
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${c.icon}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs sm:text-sm text-dark-400 font-medium leading-tight line-clamp-2">
          {label}
        </p>
      </div>
      <p className={valueCls}>{value}</p>
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-dark-500 -mt-1 leading-tight">
          {subtitle}
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Network Badge
// ─────────────────────────────────────────────
const NETWORK_COLORS = {
  mtn: "bg-yellow-500/15 text-yellow-400  border-yellow-500/25",
  vodafone: "bg-red-500/15    text-red-400     border-red-500/25",
  airtel: "bg-red-600/15    text-red-300     border-red-600/25",
  airteltigo: "bg-sky-500/15    text-sky-400     border-sky-500/25",
  tigo: "bg-sky-500/15    text-sky-400     border-sky-500/25",
  glo: "bg-green-500/15  text-green-400   border-green-500/25",
};

const NetworkBadge = ({ network }) => {
  const key = (network || "").toLowerCase().replace(/\s/g, "");
  const cls =
    NETWORK_COLORS[key] ||
    "bg-primary-600/15 text-primary-400 border-primary-500/25";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border rounded-full
                      text-[10px] sm:text-xs font-bold uppercase tracking-wide ${cls}`}
    >
      {network}
    </span>
  );
};

// ─────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────
const EmptyState = ({ icon: Icon = TrendingUp, message }) => (
  <div className="h-44 sm:h-[220px] flex flex-col items-center justify-center gap-3">
    <div
      className="w-12 h-12 rounded-2xl bg-dark-800 border border-dark-700
                    flex items-center justify-center"
    >
      <Icon className="w-5 h-5 text-dark-600" />
    </div>
    <p className="text-sm text-dark-500">{message}</p>
  </div>
);

// ─────────────────────────────────────────────
// Section Heading
// ─────────────────────────────────────────────
const SectionHead = ({ icon: Icon, iconCls, bgCls, title }) => (
  <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2.5 mb-4">
    <span
      className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${bgCls}`}
    >
      <Icon className={`w-4 h-4 ${iconCls}`} />
    </span>
    {title}
  </h2>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const AdminAnalytics = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({});
  const [purchases, setPurchases] = useState([]);
  const [dateFilter, setDateFilter] = useState("today");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aRes, pRes] = await Promise.all([
        api.get(`/get-analytics?date=${dateFilter}`),
        api.get(`/get-purchase-list?date=${dateFilter}&limit=200`),
      ]);
      setAnalytics(aRes.data || aRes);
      setPurchases((pRes.data || pRes).purchases || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.is_admin) {
      navigate("/dashboard");
      return;
    }
    fetchData();
  }, [dateFilter]);

  const copyAllPhones = () => {
    const phones = purchases
      .map((p) => p.phone)
      .filter(Boolean)
      .join("\n");
    if (!phones) {
      toast.error("No phone numbers to copy");
      return;
    }
    navigator.clipboard.writeText(phones);
    toast.success(`${purchases.length} phone numbers copied!`);
  };

  const exportCSV = () => {
    if (!purchases.length) {
      toast.error("No data to export");
      return;
    }
    const csv = [
      `"Phone","Reference","Network","Plan","Amount","User","Date"`,
      ...purchases.map(
        (p) =>
          `"${p.phone}","${p.reference}","${p.network}","${p.plan}","${
            p.amount
          }","${p.user_name || "Guest"}","${new Date(p.date).toLocaleString()}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchases-${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const platformStats = analytics.platform_stats || {};
  const totalRevenue = platformStats.total_revenue || 0;

  if (loading) return <AnalyticsSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-7">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Analytics
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <MobileDatePicker value={dateFilter} onChange={setDateFilter} />
          <button
            onClick={fetchData}
            title="Refresh"
            className="p-2.5 text-dark-400 hover:text-white bg-dark-800
                       hover:bg-dark-700 border border-dark-700 rounded-xl
                       transition-all duration-200 active:scale-95 flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* ── Revenue / Purchase Stats ── */}
      <div>
        <p className="text-xs text-dark-500 uppercase tracking-widest font-semibold mb-3 px-0.5">
          Sales & Revenue
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={Banknote}
            label="All-time Revenue"
            value={formatCompact(totalRevenue)}
            subtitle={formatCurrency(totalRevenue)}
            color="green"
          />
          <StatCard
            icon={ShoppingBag}
            label="Purchases"
            value={platformStats.total_data_purchases?.toLocaleString() || "0"}
            color="blue"
          />
          <StatCard
            icon={UserCheck}
            label="Successful Txns"
            value={
              platformStats.total_successful_transactions?.toLocaleString() ||
              "0"
            }
            color="purple"
          />
          <StatCard
            icon={Banknote}
            label="Wallet Balance"
            value={formatCompact(platformStats.total_wallet_balance || 0)}
            subtitle={formatCurrency(platformStats.total_wallet_balance || 0)}
            color="orange"
          />
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue Trend */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4 sm:p-6">
          <SectionHead
            icon={TrendingUp}
            iconCls="text-primary-400"
            bgCls="bg-primary-600/15 border-primary-500/20"
            title="Revenue Trend"
          />
          {analytics.revenue?.daily?.length > 0 ? (
            <AnalyticsChart
              type="line"
              data={analytics.revenue.daily}
              categories={["data_sales", "wallet_funds"]}
              height={220}
            />
          ) : (
            <EmptyState message="No revenue data for this period" />
          )}
        </div>

        {/* Network Popularity */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4 sm:p-6">
          <SectionHead
            icon={Wifi}
            iconCls="text-sky-400"
            bgCls="bg-sky-500/15 border-sky-500/20"
            title="Network Popularity"
          />
          {analytics.network_analytics?.length > 0 ? (
            <AnalyticsChart
              type="bar"
              data={analytics.network_analytics}
              height={220}
            />
          ) : (
            <EmptyState icon={Wifi} message="No network data for this period" />
          )}
        </div>

      </div>

      {/* ── Top Customers ── */}
      {analytics.top_customers?.length > 0 && (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-dark-800">
            <h2 className="text-sm sm:text-base font-bold text-white">
              Top Customers
            </h2>
          </div>

          {/* Mobile */}
          <div className="divide-y divide-dark-800 sm:hidden">
            {analytics.top_customers.map((c, i) => (
              <div
                key={c.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-6 h-6 rounded-full bg-dark-700 border border-dark-600
                                   flex items-center justify-center text-[10px] font-bold
                                   text-dark-300 flex-shrink-0"
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-white truncate">
                    {c.full_name}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-400">
                    {formatCompact(c.total_spent)}
                  </p>
                  <p className="text-xs text-dark-500">
                    {c.transaction_count} txns
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-800/50 text-dark-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left w-10">#</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-right">Purchases</th>
                  <th className="px-4 py-3 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {analytics.top_customers.map((c, i) => (
                  <tr
                    key={c.id}
                    className="hover:bg-dark-800/30 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-dark-500 text-xs font-mono">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3.5 text-white font-medium">
                      {c.full_name}
                    </td>
                    <td className="px-4 py-3.5 text-right text-dark-300">
                      {c.transaction_count}
                    </td>
                    <td
                      className="px-4 py-3.5 text-right text-emerald-400 font-bold"
                      title={formatCurrency(c.total_spent)}
                    >
                      {formatCompact(c.total_spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Purchase History ── */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-dark-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white">
              Purchase History
            </h2>
            <p className="text-dark-500 text-xs mt-0.5">
              {purchases.length} records
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={copyAllPhones}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4
                         bg-primary-600 hover:bg-primary-700 active:scale-95
                         text-white rounded-xl text-xs sm:text-sm font-semibold
                         transition-all duration-150 whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Phones</span>
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4
                         bg-emerald-600 hover:bg-emerald-700 active:scale-95
                         text-white rounded-xl text-xs sm:text-sm font-semibold
                         transition-all duration-150 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {purchases.length > 0 ? (
          <>
            {/* Mobile */}
            <div className="divide-y divide-dark-800 sm:hidden">
              {purchases.map((p) => (
                <div key={p.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-white font-semibold">
                      {p.phone}
                    </span>
                    <span className="text-sm font-bold text-emerald-400 flex-shrink-0">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <NetworkBadge network={p.network} />
                      <span className="text-xs text-dark-400 truncate">
                        {p.plan}
                      </span>
                    </div>
                    <span className="text-xs text-dark-500 flex-shrink-0">
                      {formatDate(p.date, "short")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-dark-800/50 text-dark-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">Network</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {purchases.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-dark-800/30 transition-colors"
                    >
                      <td className="px-6 py-3.5 font-mono text-white">
                        {p.phone}
                      </td>
                      <td className="px-4 py-3.5">
                        <NetworkBadge network={p.network} />
                      </td>
                      <td className="px-4 py-3.5 text-dark-300">{p.plan}</td>
                      <td className="px-4 py-3.5 text-right text-emerald-400 font-bold">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-dark-400">
                        {formatDate(p.date, "short")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-14 flex flex-col items-center text-center px-6">
            <div
              className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700
                            flex items-center justify-center mb-4"
            >
              <ShoppingBag className="w-6 h-6 text-dark-600" />
            </div>
            <p className="text-sm font-semibold text-dark-300">
              No purchases found
            </p>
            <p className="text-xs text-dark-500 mt-1">
              Try selecting a different date range
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
