import { useState, useEffect, useCallback } from "react";
import useAuthStore from "../../stores/authStore";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  CreditCard,
  Wallet,
  ArrowDownCircle,
  ChevronDown,
  ChevronUp,
  Banknote,
  X,
  Copy,
  Check,
  ClipboardList,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/formatters";
import { toast } from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";

const TYPE_CONFIG = {
  data_purchase: {
    label: "Data Purchase",
    icon: Smartphone,
    color: "text-primary-400 bg-primary-600/10",
  },
  guest_data_purchase: {
    label: "Guest Purchase",
    icon: Smartphone,
    color: "text-amber-400 bg-amber-500/10",
  },
  wallet_fund: {
    label: "Wallet Fund",
    icon: CreditCard,
    color: "text-green-400 bg-green-500/10",
  },
  wallet_funding: {
    label: "Wallet Fund",
    icon: CreditCard,
    color: "text-green-400 bg-green-500/10",
  },
  admin_fund: {
    label: "Admin Credit",
    icon: Wallet,
    color: "text-dark-300 bg-dark-700/60",
  },
  refund: {
    label: "Refund",
    icon: ArrowDownCircle,
    color: "text-amber-400 bg-amber-500/10",
  },
};

const STATUS_CONFIG = {
  success: { label: "Success", color: "success", icon: CheckCircle },
  completed: { label: "Completed", color: "success", icon: CheckCircle },
  pending: { label: "Pending", color: "warning", icon: Clock },
  failed: { label: "Failed", color: "danger", icon: XCircle },
  processing: { label: "Processing", color: "primary", icon: RefreshCw },
};

const CopyBtn = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label || "Copy"}
    </button>
  );
};

const AdminOrders = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 30,
    has_more: false,
  });
  const [expandedId, setExpandedId] = useState(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [verifyingPending, setVerifyingPending] = useState(false);
  const [updatingTx, setUpdatingTx] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const fetchOrders = useCallback(
    async (offset = 0) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "30",
          offset: offset.toString(),
        });
        if (typeFilter !== "all") params.set("type", typeFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (search.trim()) params.set("search", search.trim());

        const res = await api.get(`/admin-orders?${params}`);
        const d = res.data || res;
        setTransactions(d.transactions || []);
        setStats(d.stats || null);
        setPagination(
          d.pagination || { total: 0, offset: 0, limit: 30, has_more: false }
        );
      } catch {
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    },
    [typeFilter, statusFilter, search]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (txId, action, adminNote) => {
    setUpdatingTx(`${txId}-${action}`);
    try {
      await api.put("/admin-orders", {
        transaction_id: txId,
        action,
        admin_note: adminNote,
      });
      toast.success(`Order marked as ${action}`);
      fetchOrders(pagination.offset);
      setExpandedId(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update order");
    } finally {
      setUpdatingTx(null);
    }
  };

  const verifyAllPending24h = async () => {
    setVerifyingPending(true);
    try {
      const res = await api.put("/admin-orders", { action: "verify_pending_24h" });
      const d = res.data || res;
      toast.success(d.message || `Verified: ${d.placed || 0} placed, ${d.failed || 0} failed`);
      fetchOrders();
    } catch (err) {
      toast.error(err?.message || "Bulk verify failed");
    } finally {
      setVerifyingPending(false);
    }
  };

  const syncPendingOrders = async () => {
    setSyncingOrders(true);
    try {
      const res = await api.get("/admin-provider?action=sync-orders");
      const d = res.data || res;
      toast.success(d.message || `Synced ${d.total_checked || 0} orders`);
      fetchOrders();
    } catch {
      toast.error("Failed to sync orders");
    } finally {
      setSyncingOrders(false);
    }
  };

  // Manual pending orders (data purchases queued for manual fulfil)
  const manualPending = transactions.filter(
    (tx) =>
      tx.type === "data_purchase" &&
      tx.status === "pending" &&
      tx.metadata?.needs_manual_fulfil
  );

  const copyAllNumbers = () => {
    const numbers = manualPending
      .map((tx) => tx.recipient_phone)
      .filter(Boolean);
    navigator.clipboard.writeText(numbers.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success(
      `Copied ${numbers.length} number${numbers.length !== 1 ? "s" : ""}`
    );
  };

  const typeIcon = (type) => {
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.data_purchase;
    const Icon = cfg.icon;
    return (
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}
      >
        <Icon className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Order Tracking
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Manage all payments, data orders, and credits
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={verifyAllPending24h}
            disabled={verifyingPending}
            className="border-primary-600/40 text-primary-400 hover:bg-primary-600/10"
          >
            <ShieldCheck className={`w-4 h-4 mr-1 ${verifyingPending ? "animate-pulse" : ""}`} />
            {verifyingPending ? "Verifying..." : "Verify Pending (24h)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={syncPendingOrders}
            disabled={syncingOrders}
            className="border-yellow-600/40 text-yellow-400 hover:bg-yellow-600/10"
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${syncingOrders ? "animate-spin" : ""}`}
            />
            {syncingOrders ? "Syncing..." : "Sync"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowFundModal(true)}
          >
            <Banknote className="w-4 h-4 mr-1" /> Credit / Deduct
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fetchOrders()}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Manual Queue Banner ── */}
      {manualPending.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-semibold text-sm">
                Manual Queue — {manualPending.length} order
                {manualPending.length !== 1 ? "s" : ""} awaiting fulfilment
              </span>
            </div>
            <button
              onClick={copyAllNumbers}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 transition-colors"
            >
              {copiedAll ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedAll ? "Copied all!" : "Copy all numbers"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {manualPending.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-2 bg-dark-900/60 border border-dark-800 rounded-xl px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold tabular-nums">
                    {tx.recipient_phone || "—"}
                  </p>
                  <p className="text-dark-500 text-[10px] truncate">
                    {tx.metadata?.data_volume} · {tx.metadata?.network} ·{" "}
                    {tx.user_name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {tx.recipient_phone && <CopyBtn text={tx.recipient_phone} />}
                  <button
                    onClick={() => updateOrderStatus(tx.id, "complete")}
                    disabled={updatingTx === `${tx.id}-complete`}
                    className="text-[11px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                  >
                    {updatingTx === `${tx.id}-complete` ? "..." : "Done"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-3 sm:p-4 min-w-0">
            <p className="text-dark-500 text-[11px] uppercase tracking-wide truncate">
              Total Funded
            </p>
            <p className="text-white font-bold text-sm sm:text-lg truncate block">
              {formatCurrency(stats.total_funded)}
            </p>
            <p className="text-green-400 text-xs mt-0.5">
              {stats.fund_orders} orders
            </p>
          </div>
          <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-3 sm:p-4 min-w-0">
            <p className="text-dark-500 text-[11px] uppercase tracking-wide truncate">
              Total Purchases
            </p>
            <p className="text-white font-bold text-sm sm:text-lg truncate block">
              {formatCurrency(stats.total_purchases)}
            </p>
            <p className="text-primary-400 text-xs mt-0.5">
              {stats.data_orders} orders
            </p>
          </div>
          <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-3 sm:p-4 min-w-0">
            <p className="text-dark-500 text-[11px] uppercase tracking-wide truncate">
              Successful
            </p>
            <p className="text-green-400 font-bold text-sm sm:text-lg truncate block">
              {stats.successful}
            </p>
          </div>
          <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-3 sm:p-4 min-w-0">
            <p className="text-dark-500 text-[11px] uppercase tracking-wide truncate">
              Pending
            </p>
            <p className="text-yellow-400 font-bold text-sm sm:text-lg truncate block">
              {stats.pending}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <div className="flex-1 min-w-0">
          <Input
            icon={Search}
            placeholder="Search by name, email, reference, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 min-w-0 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="data_purchase">Data Purchase</option>
            <option value="guest_data_purchase">Guest Purchase</option>
            <option value="wallet_fund">Wallet Fund</option>
            <option value="admin_fund">Admin Credit</option>
            <option value="refund">Refund</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 min-w-0 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-dark-900/50 border border-dark-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-dark-400 text-sm">Loading orders...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-dark-500 text-sm">No orders found</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-800/50">
            {transactions.map((tx) => {
              const typeCfg = TYPE_CONFIG[tx.type] || {
                label: tx.type,
                color: "text-dark-400 bg-dark-800",
              };
              const statusCfg =
                STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
              const isExpanded = expandedId === tx.id;
              const isCredit = [
                "wallet_fund",
                "wallet_funding",
                "admin_fund",
                "refund",
              ].includes(tx.type);
              const isManual = tx.metadata?.needs_manual_fulfil;

              return (
                <div
                  key={tx.id}
                  className="hover:bg-primary-600/5 transition-colors"
                >
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                  >
                    {typeIcon(tx.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white text-sm font-medium truncate max-w-[120px] sm:max-w-[200px]">
                          {tx.user_name}
                        </span>
                        <span className="text-dark-600 text-xs truncate hidden sm:inline">
                          {tx.user_email}
                        </span>
                        {isManual && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex-shrink-0">
                            Manual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 min-w-0">
                        <span className="text-dark-500 text-xs flex-shrink-0">
                          {typeCfg.label}
                        </span>
                        {(tx.recipient_phone || tx.metadata?.phone_number) && (
                          <span className="text-dark-600 text-xs font-mono truncate">
                            {tx.recipient_phone || tx.metadata?.phone_number}
                          </span>
                        )}
                        {tx.metadata?.data_volume && (
                          <span className="text-primary-500 text-[10px] font-semibold flex-shrink-0">
                            {tx.metadata.data_volume}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`font-bold text-sm ${
                          isCredit ? "text-green-400" : "text-white"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </p>
                      <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <Badge variant={statusCfg.color} size="sm">
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-dark-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-dark-500 flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-dark-800/40 rounded-xl p-4 space-y-3 text-sm">
                        {/* Reference + Date */}
                        <div className="space-y-2">
                          <div>
                            <span className="text-dark-500 text-xs">
                              Reference
                            </span>
                            <div className="flex items-start gap-1.5 mt-0.5 min-w-0 flex-wrap">
                              <p className="text-dark-300 font-mono text-[10px] break-all leading-relaxed flex-1 min-w-0">
                                {tx.reference || "N/A"}
                              </p>
                              {tx.reference && <CopyBtn text={tx.reference} />}
                            </div>
                          </div>
                          {(tx.recipient_phone ||
                            tx.metadata?.phone_number) && (
                            <div>
                              <span className="text-dark-500 text-xs">
                                Recipient Phone
                              </span>
                              <div className="flex items-start gap-1.5 mt-0.5 min-w-0 flex-wrap">
                                <p className="text-white font-mono text-[11px] font-bold leading-relaxed flex-1 min-w-0">
                                  {tx.recipient_phone ||
                                    tx.metadata?.phone_number}
                                </p>
                                <CopyBtn
                                  text={
                                    tx.recipient_phone ||
                                    tx.metadata?.phone_number
                                  }
                                />
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-dark-500 text-xs">Date</span>
                            <p className="text-dark-300 text-xs mt-0.5">
                              {format(
                                new Date(tx.created_at),
                                "dd MMM yyyy, HH:mm"
                              )}
                              <span className="text-dark-600 ml-1">
                                (
                                {formatDistanceToNow(new Date(tx.created_at), {
                                  addSuffix: true,
                                })}
                                )
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* ── Admin Actions ── */}
                        {(tx.type === "data_purchase" ||
                          tx.type === "guest_data_purchase" ||
                          tx.type === "wallet_fund" ||
                          tx.type === "wallet_funding") && (
                          <div className="pt-2 border-t border-dark-700/50">
                            <p className="text-dark-500 text-xs mb-2">
                              Admin Actions
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {/* Verify with Paystack — for any pending transaction with a reference */}
                              {tx.status === "pending" && tx.reference && (
                                <button
                                  onClick={() =>
                                    updateOrderStatus(tx.id, "verify_paystack")
                                  }
                                  disabled={!!updatingTx}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-600/10 border border-primary-600/30 text-primary-400 hover:bg-primary-600/20 transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  {updatingTx === `${tx.id}-verify_paystack`
                                    ? "Verifying..."
                                    : "Verify with Paystack"}
                                </button>
                              )}
                              {(tx.type === "data_purchase" ||
                                tx.type === "guest_data_purchase") &&
                                tx.status !== "completed" &&
                                tx.status !== "success" && (
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(tx.id, "complete")
                                    }
                                    disabled={!!updatingTx}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {updatingTx === `${tx.id}-complete`
                                      ? "Marking..."
                                      : "Mark Complete"}
                                  </button>
                                )}
                              {tx.status !== "completed" &&
                                tx.status !== "success" && (
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(
                                        tx.id,
                                        "refund",
                                        "Admin refund"
                                      )
                                    }
                                    disabled={!!updatingTx}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    {updatingTx === `${tx.id}-refund`
                                      ? "Refunding..."
                                      : "Refund"}
                                  </button>
                                )}
                              {(tx.type === "data_purchase" ||
                                tx.type === "guest_data_purchase") &&
                                tx.status === "pending" && (
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(tx.id, "processing")
                                    }
                                    disabled={!!updatingTx}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-600/10 border border-primary-600/20 text-primary-400 hover:bg-primary-600/20 transition-colors disabled:opacity-50"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    {updatingTx === `${tx.id}-processing`
                                      ? "..."
                                      : "Set Processing"}
                                  </button>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-800/50">
            <p className="text-dark-500 text-xs">
              Showing {pagination.offset + 1}–
              {Math.min(pagination.offset + pagination.limit, pagination.total)}{" "}
              of {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={pagination.offset === 0}
                onClick={() =>
                  fetchOrders(Math.max(0, pagination.offset - pagination.limit))
                }
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!pagination.has_more}
                onClick={() =>
                  fetchOrders(pagination.offset + pagination.limit)
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {showFundModal && (
        <FundUserModal
          onClose={() => setShowFundModal(false)}
          onSuccess={() => fetchOrders()}
        />
      )}
    </div>
  );
};

const FundUserModal = ({ onClose, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [operation, setOperation] = useState("credit"); // 'credit' | 'deduct'
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { user: currentUser, refreshUser } = useAuthStore();

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(
        `/admin-users-manage?search=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const d = res.data || res;
      setUsers(d.users || []);
    } catch {
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      toast.error("Select a user and enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/admin-fund-wallet", {
        user_id: selectedUser.id,
        amount: parseFloat(amount),
        reason: reason || undefined,
        operation,
      });
      const d = res.data || res;
      toast.success(
        d.message ||
          `${operation === "deduct" ? "Deducted" : "Credited"} GH₵${parseFloat(
            amount
          ).toFixed(2)} ${operation === "deduct" ? "from" : "to"} ${
            selectedUser.full_name
          }`
      );
      // Refresh auth store so wallet balance updates immediately for the logged-in admin
      if (currentUser && selectedUser.id === currentUser.id) {
        await refreshUser();
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.message || `Failed to ${operation} wallet`);
    } finally {
      setLoading(false);
    }
  };

  const isDeduct = operation === "deduct";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Banknote
              className={`w-5 h-5 ${
                isDeduct ? "text-red-500" : "text-primary-600"
              }`}
            />
            <h2 className="text-lg font-bold text-white">Wallet Management</h2>
          </div>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Operation toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-dark-800/60 rounded-xl">
            <button
              onClick={() => setOperation("credit")}
              className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                !isDeduct
                  ? "bg-primary-600 text-white shadow"
                  : "text-dark-400 hover:text-dark-200"
              }`}
            >
              Credit Wallet
            </button>
            <button
              onClick={() => setOperation("deduct")}
              className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                isDeduct
                  ? "bg-red-600 text-white shadow"
                  : "text-dark-400 hover:text-dark-200"
              }`}
            >
              Deduct Wallet
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Find User
            </label>
            <div className="flex gap-2">
              <Input
                icon={Search}
                placeholder="Name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={searchUsers}
                loading={searching}
              >
                Search
              </Button>
            </div>
          </div>

          {users.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                    selectedUser?.id === u.id
                      ? "bg-primary-600/10 border border-primary-600/30"
                      : "bg-dark-800/40 border border-transparent hover:bg-dark-800"
                  }`}
                >
                  <div className="w-7 h-7 bg-primary-600 rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">
                      {u.full_name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">
                      {u.full_name}
                    </p>
                    <p className="text-dark-500 text-[10px] truncate">
                      {u.email} · {formatCurrency(u.wallet_balance || 0)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedUser && (
            <>
              {isDeduct && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  Current balance:{" "}
                  {formatCurrency(selectedUser.wallet_balance || 0)}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Amount (GH₵)
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Reason (optional)
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isDeduct
                      ? "e.g. Chargeback, correction"
                      : "e.g. Bonus credit"
                  }
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedUser || !amount}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isDeduct
                ? "bg-red-600 hover:bg-red-500"
                : "bg-primary-600 hover:bg-primary-500"
            }`}
          >
            {loading
              ? "Processing..."
              : isDeduct
              ? "Deduct Funds"
              : "Credit Wallet"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
