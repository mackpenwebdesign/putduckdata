import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  TrendingUp,
  Wallet,
  ArrowDownLeft,
  Star,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  ChevronDown,
  ChevronUp,
  Phone,
  FileText,
  BadgeCheck,
  AlertCircle,
  Settings,
  RotateCcw,
  Tag,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/formatters";

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const STATUS_STYLES = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  pending_manual: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
      STATUS_STYLES[status] || "bg-dark-700 text-dark-400 border-dark-600"
    }`}
  >
    {status?.replace(/_/g, " ")}
  </span>
);

const WithdrawalRow = ({ w, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(null);

  const handle = async (action) => {
    setLoading(action);
    try {
      await api.put("/admin-reseller-stats", {
        withdrawal_id: w.id,
        action,
        admin_note: note || undefined,
      });
      toast.success(
        action === "approve"
          ? "Withdrawal approved & marked paid"
          : "Withdrawal rejected & refunded"
      );
      onAction();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const acct = w.account_details || {};
  const initials =
    w.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        expanded ? "border-dark-700" : "border-dark-800/60"
      }`}
    >
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-dark-800/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-yellow-400 text-xs font-bold">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">
              {w.full_name}
            </p>
            <p className="text-dark-500 text-xs truncate">{w.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <div className="text-right hidden sm:block">
            <p className="text-white font-bold text-sm tabular-nums">
              {formatCurrency(w.amount)}
            </p>
            <p className="text-dark-600 text-[10px]">{timeAgo(w.created_at)}</p>
          </div>
          <StatusBadge status={w.status} />
          <div className="text-dark-600">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-dark-800/60 space-y-3">
          {/* Amount visible on mobile */}
          <div className="sm:hidden flex items-center justify-between py-1">
            <span className="text-dark-500 text-xs">Amount</span>
            <span className="text-white font-bold">
              {formatCurrency(w.amount)}
            </span>
          </div>

          {/* MoMo details */}
          <div className="bg-dark-950/60 rounded-xl border border-dark-800/60 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-dark-500 flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> MoMo Payment Details
            </p>
            <div className="space-y-1.5">
              {acct.momo_number && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-dark-500">Number</span>
                  <span className="text-white font-mono font-semibold">
                    {acct.momo_number}
                  </span>
                </div>
              )}
              {acct.momo_network && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-dark-500">Network</span>
                  <span className="text-white">{acct.momo_network}</span>
                </div>
              )}
              {acct.account_name && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-dark-500">Name</span>
                  <span className="text-white font-semibold">
                    {acct.account_name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-dark-800/60">
                <span className="text-dark-500">Amount to send</span>
                <span className="text-green-400 font-bold text-sm">
                  {formatCurrency(w.amount)}
                </span>
              </div>
              {w.reference && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-dark-500">Reference</span>
                  <span className="text-dark-400 font-mono text-[10px]">
                    {w.reference}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Admin note */}
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-dark-600" />
            <textarea
              placeholder="Admin note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-dark-800/60 border border-dark-700 text-white text-xs rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-600 resize-none placeholder-dark-600"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handle("approve")}
              disabled={loading !== null}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600/10 border border-green-600/20 text-green-400 hover:bg-green-600/20 text-xs font-bold transition-colors disabled:opacity-50"
            >
              {loading === "approve" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Approve & Pay
            </button>
            <button
              onClick={() => handle("reject")}
              disabled={loading !== null}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600/10 border border-red-600/20 text-red-400 hover:bg-red-600/20 text-xs font-bold transition-colors disabled:opacity-50"
            >
              {loading === "reject" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Reject & Refund
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, bg, sub }) => (
  <div className="bg-dark-900/60 border border-dark-800/60 rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-dark-500 font-semibold uppercase tracking-widest">
        {label}
      </span>
      <div
        className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}
      >
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
    </div>
    <div>
      <p className="text-xl font-extrabold text-white tabular-nums">{value}</p>
      {sub && <p className="text-dark-600 text-[11px] mt-0.5">{sub}</p>}
    </div>
  </div>
);

const NETWORK_ORDER = ["MTN", "AIRTEL_TIGO", "TELECEL"];
const NETWORK_LABEL = {
  MTN: "MTN",
  AIRTEL_TIGO: "AirtelTigo",
  TELECEL: "Telecel",
};

const GlobalShopPricing = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({});
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin-plans-manage");
      const ps = (res.data ?? res).plans || [];
      setPlans(ps);
      const init = {};
      ps.forEach((p) => {
        init[p.id] = String(p.reseller_price ?? p.cost_price ?? "");
      });
      setEdits(init);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(edits)
        .filter(([planId, val]) => {
          const plan = plans.find((p) => p.id === parseInt(planId));
          if (!plan) return false;
          const newVal = parseFloat(val);
          const oldVal = parseFloat(plan.reseller_price || 0);
          return !isNaN(newVal) && Math.abs(newVal - oldVal) > 0.001;
        })
        .map(([planId, val]) => ({
          plan_id: parseInt(planId),
          reseller_price: parseFloat(val),
        }));

      if (payload.length === 0) {
        toast("No changes to save");
        setSaving(false);
        return;
      }

      await api.put("/admin-plans-manage", {
        bulk_action: "bulk_update_reseller_prices",
        prices: payload,
      });
      toast.success(`${payload.length} plan prices updated`);
      loadPlans();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const grouped = NETWORK_ORDER.reduce((acc, n) => {
    acc[n] = plans.filter((p) => p.network === n);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-white">Global Shop Pricing</h2>
          <span className="text-[10px] font-semibold text-dark-500 bg-dark-800 px-2 py-0.5 rounded-full">
            Applies to all partners
          </span>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/15 border border-primary-500/30 text-primary-400 hover:bg-primary-600/25 text-xs font-bold transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Tag className="w-3 h-3" />
          )}
          Save Changes
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-6 text-dark-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading plans…
        </div>
      )}

      {!loading && plans.length === 0 && (
        <div className="bg-dark-900/60 border border-dark-800/60 rounded-xl p-8 text-center text-dark-500 text-sm">
          No active plans found.
        </div>
      )}

      {!loading &&
        plans.length > 0 &&
        NETWORK_ORDER.map((net) => {
          const netPlans = grouped[net];
          if (!netPlans.length) return null;
          return (
            <div
              key={net}
              className="bg-dark-900/60 border border-dark-800/60 rounded-xl overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-dark-800/60 bg-dark-900/40">
                <p className="text-[11px] font-bold uppercase tracking-widest text-dark-400">
                  {NETWORK_LABEL[net]}
                </p>
              </div>
              <div className="divide-y divide-dark-800/40">
                {netPlans.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold">
                        {p.plan_name || p.data_volume}
                      </p>
                      <p className="text-dark-600 text-[10px] mt-0.5">
                        Retail: {formatCurrency(p.price)} · Provider cost:{" "}
                        {formatCurrency(p.cost_price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-500 text-xs">
                          GH₵
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={edits[p.id] ?? ""}
                          onChange={(e) =>
                            setEdits((ed) => ({
                              ...ed,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="w-24 bg-dark-800 border border-dark-700 text-white rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-600"
                        />
                      </div>
                      <span
                        className={`text-[10px] font-semibold whitespace-nowrap ${
                          parseFloat(edits[p.id] || 0) > 0
                            ? "text-green-400"
                            : "text-dark-500"
                        }`}
                      >
                        {parseFloat(edits[p.id] || 0) > 0
                          ? `✓ ${formatCurrency(parseFloat(edits[p.id]))}`
                          : "default"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
};

const PartnerPricing = () => {
  const [resellers, setResellers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [saving, setSaving] = useState({});
  const [edits, setEdits] = useState({});
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    api
      .get("/admin-reseller-pricing")
      .then((res) => setResellers((res.data ?? res).resellers || []))
      .catch(() => toast.error("Failed to load partners"));
  }, []);

  const loadPlans = async (id) => {
    if (!id) {
      setPlans([]);
      setEdits({});
      return;
    }
    setLoadingPlans(true);
    try {
      const res = await api.get(`/admin-reseller-pricing?reseller_id=${id}`);
      const ps = (res.data ?? res).plans || [];
      setPlans(ps);
      const init = {};
      ps.forEach((p) => {
        // pre-fill with admin override if set, otherwise platform price
        const effective =
          p.admin_base_price != null ? p.admin_base_price : p.platform_price;
        init[p.id] = String(effective ?? "");
      });
      setEdits(init);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSelect = (id) => {
    setSelectedId(id);
    loadPlans(id);
  };

  const savePrice = async (planId, reset = false) => {
    setSaving((s) => ({ ...s, [planId]: true }));
    try {
      const body = reset
        ? { reseller_id: selectedId, data_plan_id: planId, reset: true }
        : {
            reseller_id: selectedId,
            data_plan_id: planId,
            base_price: parseFloat(edits[planId] || 0),
          };
      await api.post("/admin-reseller-pricing", body);
      toast.success(
        reset ? "Price reset to platform default" : "Base price saved"
      );
      loadPlans(selectedId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving((s) => ({ ...s, [planId]: false }));
    }
  };

  const grouped = NETWORK_ORDER.reduce((acc, n) => {
    acc[n] = plans.filter((p) => p.network === n);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 mb-1">
        <h2 className="text-sm font-bold text-white">Partner Shop Pricing</h2>
        <span className="text-[10px] font-semibold text-dark-500 bg-dark-800 px-2 py-0.5 rounded-full">
          Admin sets base price per partner
        </span>
      </div>

      {/* Partner selector */}
      <select
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full sm:w-72 bg-dark-800 border border-dark-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50"
      >
        <option value="">Select a partner…</option>
        {resellers.map((r) => (
          <option key={r.id} value={r.id}>
            {r.full_name} ({r.referral_code || "no code"})
          </option>
        ))}
      </select>

      {loadingPlans && (
        <div className="flex items-center gap-2 py-6 text-dark-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading plans…
        </div>
      )}

      {!loadingPlans && selectedId && plans.length === 0 && (
        <div className="bg-dark-900/60 border border-dark-800/60 rounded-xl p-8 text-center text-dark-500 text-sm">
          No active plans found.
        </div>
      )}

      {!loadingPlans &&
        plans.length > 0 &&
        NETWORK_ORDER.map((net) => {
          const netPlans = grouped[net];
          if (!netPlans.length) return null;
          return (
            <div
              key={net}
              className="bg-dark-900/60 border border-dark-800/60 rounded-xl overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-dark-800/60 bg-dark-900/40">
                <p className="text-[11px] font-bold uppercase tracking-widest text-dark-400">
                  {NETWORK_LABEL[net]}
                </p>
              </div>
              <div className="divide-y divide-dark-800/40">
                {netPlans.map((p) => {
                  const isSaving = saving[p.id];
                  const hasOverride = p.admin_base_price != null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">
                          {p.plan_name || p.data_volume}
                        </p>
                        <p className="text-dark-600 text-[10px] mt-0.5">
                          Platform: {formatCurrency(p.platform_price)}
                          {p.reseller_custom_price != null &&
                            ` · Partner selling: ${formatCurrency(
                              p.reseller_custom_price
                            )}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-500 text-xs">
                            GH₵
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={edits[p.id] ?? ""}
                            onChange={(e) =>
                              setEdits((ed) => ({
                                ...ed,
                                [p.id]: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="w-24 bg-dark-800 border border-dark-700 text-white rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-600"
                          />
                        </div>
                        <button
                          onClick={() => savePrice(p.id)}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600/15 border border-primary-500/30 text-primary-400 hover:bg-primary-600/25 text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Tag className="w-3 h-3" />
                          )}
                          Set
                        </button>
                        {hasOverride && (
                          <button
                            onClick={() => savePrice(p.id, true)}
                            disabled={isSaving}
                            title="Reset to platform default"
                            className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-500 hover:text-white hover:border-dark-600 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                        <span
                          className={`text-[10px] font-semibold whitespace-nowrap ${
                            hasOverride ? "text-green-400" : "text-dark-500"
                          }`}
                        >
                          {hasOverride
                            ? `✓ ${formatCurrency(p.admin_base_price)}`
                            : "default"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
};

const AdminResellers = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin-reseller-stats");
      setData(res.data ?? res);
    } catch {
      toast.error("Failed to load reseller stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overview = data?.overview || {};
  const topResellers = data?.top_resellers || [];
  const pendingWithdrawals = data?.pending_withdrawals || [];

  const stats = [
    {
      label: "Total Partners",
      value: overview.total_resellers ?? "—",
      icon: Users,
      color: "text-primary-400",
      bg: "bg-primary-500/10",
      sub: "Active resellers",
    },
    {
      label: "Brand Pro",
      value: overview.brand_pro_count ?? "—",
      icon: Star,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      sub: "Premium accounts",
    },
    {
      label: "Commissions Held",
      value:
        overview.total_pending_commissions != null
          ? formatCurrency(overview.total_pending_commissions)
          : "—",
      icon: Wallet,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      sub: "Unpaid balance",
    },
    {
      label: "Total Paid Out",
      value:
        overview.total_paid_out != null
          ? formatCurrency(overview.total_paid_out)
          : "—",
      icon: ArrowDownLeft,
      color: "text-green-400",
      bg: "bg-green-500/10",
      sub: "All time",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        <p className="text-dark-500 text-sm">Loading reseller stats…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Partner Management
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Overview of all partners, performance, and withdrawal requests
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl bg-dark-800/50 border border-dark-700/50 text-dark-400 hover:text-white hover:bg-dark-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Pending Withdrawals */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <h2 className="text-sm font-bold text-white">Pending Withdrawals</h2>
          {pendingWithdrawals.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              {pendingWithdrawals.length} pending
            </span>
          )}
        </div>

        {pendingWithdrawals.length === 0 ? (
          <div className="bg-dark-900/60 border border-dark-800/60 rounded-xl p-10 text-center">
            <div className="w-12 h-12 bg-dark-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-dark-600" />
            </div>
            <p className="text-dark-400 text-sm font-semibold">
              No pending withdrawals
            </p>
            <p className="text-dark-600 text-xs mt-1">
              All withdrawal requests have been processed
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingWithdrawals.map((w) => (
              <WithdrawalRow key={w.id} w={w} onAction={load} />
            ))}
          </div>
        )}
      </div>

      {/* Global Shop Pricing */}
      <div className="bg-dark-900/40 border border-dark-800/60 rounded-2xl p-4">
        <GlobalShopPricing />
      </div>

      {/* Partner Pricing */}
      <div className="bg-dark-900/40 border border-dark-800/60 rounded-2xl p-4">
        <PartnerPricing />
      </div>

      {/* Top Resellers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-white">Top Resellers</h2>
          {topResellers.length > 0 && (
            <span className="text-[10px] font-semibold text-dark-500 bg-dark-800 px-2 py-0.5 rounded-full">
              {topResellers.length}
            </span>
          )}
        </div>

        {topResellers.length === 0 ? (
          <div className="bg-dark-900/60 border border-dark-800/60 rounded-xl p-10 text-center">
            <div className="w-12 h-12 bg-dark-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-dark-600" />
            </div>
            <p className="text-dark-400 text-sm font-semibold">
              No resellers yet
            </p>
            <p className="text-dark-600 text-xs mt-1">
              Resellers will appear here once approved
            </p>
          </div>
        ) : (
          <div className="bg-dark-900/60 border border-dark-800/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-800/80 bg-dark-900/40">
                    {[
                      "#",
                      "Partner",
                      "Phone",
                      "Code",
                      "Orders",
                      "Revenue",
                      "Balance",
                      "Withdrawn",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-dark-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/40">
                  {topResellers.map((r, i) => {
                    const initials =
                      r.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "??";
                    const displayPhone = r.momo_phone || r.phone_number || "—";
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-dark-800/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="w-7 h-7 rounded-lg bg-primary-600/10 flex items-center justify-center text-primary-400 text-xs font-extrabold">
                            {i + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-dark-800 flex items-center justify-center text-dark-300 text-xs font-bold flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-xs font-semibold truncate max-w-[110px]">
                                {r.full_name}
                              </p>
                              <p className="text-dark-600 text-[10px] truncate max-w-[110px]">
                                {r.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-dark-600" />
                            <span className="text-dark-300 text-xs font-mono">
                              {displayPhone}
                            </span>
                          </div>
                          {r.momo_phone &&
                            r.phone_number &&
                            r.momo_phone !== r.phone_number && (
                              <p className="text-dark-600 text-[10px] mt-0.5 ml-4">
                                {r.phone_number}
                              </p>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          {r.referral_code ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-dark-300 text-xs font-mono bg-dark-800 px-2 py-0.5 rounded-lg">
                                {r.referral_code}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    r.referral_code
                                  );
                                  toast.success("Copied!");
                                }}
                                className="text-dark-600 hover:text-dark-400 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-dark-700 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white text-xs font-semibold tabular-nums">
                          {r.order_count}
                        </td>
                        <td className="px-4 py-3 text-green-400 text-xs font-bold tabular-nums">
                          {formatCurrency(r.revenue)}
                        </td>
                        <td className="px-4 py-3 text-yellow-400 text-xs tabular-nums">
                          {formatCurrency(r.commission_balance)}
                        </td>
                        <td className="px-4 py-3 text-dark-400 text-xs tabular-nums">
                          {formatCurrency(r.total_withdrawn)}
                        </td>
                        <td className="px-4 py-3">
                          {r.brand_pro ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                              <Star className="w-2.5 h-2.5" /> Pro
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-dark-800 border border-dark-700 text-dark-500">
                              <BadgeCheck className="w-2.5 h-2.5" /> Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminResellers;
