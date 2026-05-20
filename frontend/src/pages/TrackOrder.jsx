import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  Wifi,
  CreditCard,
  Calendar,
  Hash,
  FileDigit,
  Database,
  Gauge,
  Timer,
} from "lucide-react";
import Button from "../components/Button";
import api from "../utils/api";
import { formatCurrency } from "../utils/formatters";
import { toast } from "react-hot-toast";

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    label: "Processing",
  },
  success: {
    icon: Clock,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "Confirmed",
  },
  processing: {
    icon: Clock,
    color: "text-primary-400",
    bg: "bg-primary-600/10",
    border: "border-primary-600/20",
    label: "Processing",
  },
  completed: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    label: "Delivered ✓",
  },
  failed: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Failed",
  },
};

const CopyBtn = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success((label || "Value") + " copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center p-1 rounded-md text-dark-500 hover:text-primary-400 hover:bg-primary-600/10 transition-colors ml-1"
      title="Copy"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
};

const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(
    () => searchParams.get("ref") || ""
  );
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  // Auto-track if reference came from URL
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) handleTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = async (e) => {
    e?.preventDefault();
    const ref = reference.trim().toUpperCase();
    if (!ref) return;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await api.get(
        `/guest-order-track?reference=${encodeURIComponent(ref)}`
      );
      const d = res.data || res;
      setOrder(d);
    } catch (err) {
      setError(
        err?.message || "Order not found. Please check your reference number."
      );
    } finally {
      setLoading(false);
    }
  };

  const cfg = order
    ? STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
    : null;
  const StatusIcon = cfg?.icon;

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Track Your Order
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Enter your reference number to check delivery status
          </p>
        </div>

        {/* Search */}
        <form
          onSubmit={handleTrack}
          className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5 space-y-3"
        >
          <label className="block text-white text-sm font-medium">
            Order Reference
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder="e.g. GUEST-ABC123XYZ"
                className="w-full bg-dark-800/50 border border-dark-700 text-white placeholder-dark-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-600/60 focus:ring-1 focus:ring-primary-600/30 transition-colors"
              />
            </div>
            <Button
              type="submit"
              loading={loading}
              disabled={!reference.trim() || loading}
            >
              Track
            </Button>
          </div>
          {error && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}
        </form>

        {/* Result */}
        {order && cfg && (
          <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
            {/* Status banner */}
            <div
              className={`flex items-center gap-3 ${cfg.bg} border-b ${cfg.border} px-5 py-4`}
            >
              <StatusIcon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
              <div className="flex-1">
                <p className={`font-semibold text-sm ${cfg.color}`}>
                  {cfg.label}
                </p>
                <p className="text-dark-400 text-xs">{order.status_message}</p>
              </div>
              <button
                onClick={handleTrack}
                disabled={loading}
                className="p-1.5 rounded-lg text-dark-500 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh status"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {/* Details */}
            <div className="px-5 divide-y divide-dark-800/50">
              {/* Order ID */}
              {order.id && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-dark-500 flex items-center gap-2">
                    <FileDigit className="w-4 h-4" /> Order ID
                  </span>
                  <span className="text-white font-mono text-xs flex items-center">
                    #{order.id}
                    <CopyBtn text={String(order.id)} label="Order ID" />
                  </span>
                </div>
              )}
              {/* Reference */}
              <div className="flex items-center justify-between py-2">
                <span className="text-dark-500 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Reference
                </span>
                <span className="text-white font-mono text-xs flex items-center">
                  {order.reference}
                  <CopyBtn text={order.reference} label="Reference" />
                </span>
              </div>
              {/* Purchase Data Number — most prominent */}
              {order.phone && (
                <div className="flex items-center justify-between py-3 bg-primary-600/5 -mx-5 px-5 border-y border-primary-600/10">
                  <span className="text-primary-400 flex items-center gap-2 text-sm font-semibold">
                    <Smartphone className="w-4 h-4" /> Purchase Data Number
                  </span>
                  <span className="text-white font-bold text-sm flex items-center">
                    {order.phone}
                    <CopyBtn text={order.phone} label="Purchase data number" />
                  </span>
                </div>
              )}
              {/* Network */}
              {order.network && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-dark-500 flex items-center gap-2">
                    <Wifi className="w-4 h-4" /> Network
                  </span>
                  <span className="text-white font-medium">
                    {order.network}
                  </span>
                </div>
              )}
              {/* Plan */}
              {order.plan_name && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-dark-500 flex items-center gap-2">
                    <Database className="w-4 h-4" /> Plan
                  </span>
                  <span className="text-white font-medium">
                    {order.plan_name}
                  </span>
                </div>
              )}
              {/* Data Volume */}
              {order.data_volume && (
                <div className="flex items-center justify-between py-3 bg-dark-800/30 -mx-5 px-5">
                  <span className="text-dark-400 text-sm font-medium flex items-center gap-2">
                    <Gauge className="w-4 h-4" /> Data Volume
                  </span>
                  <span className="text-white font-semibold text-sm flex items-center">
                    {order.data_volume}
                    <CopyBtn text={order.data_volume} label="Data volume" />
                  </span>
                </div>
              )}
              {/* Validity — always 90 days */}
              <div className="flex items-center justify-between py-2">
                <span className="text-dark-500 flex items-center gap-2">
                  <Timer className="w-4 h-4" /> Validity
                </span>
                <span className="text-white font-medium">90 days</span>
              </div>
              {/* Purchase Date */}
              {order.purchase_date && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-dark-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Purchase Date
                  </span>
                  <span className="text-white font-medium">
                    {new Date(order.purchase_date).toLocaleString("en-GH")}
                  </span>
                </div>
              )}
              {/* Amount Paid */}
              {order.amount > 0 && (
                <div className="flex items-center justify-between py-3 bg-dark-800/30 -mx-5 px-5">
                  <span className="text-white font-semibold text-sm">
                    Amount Paid
                  </span>
                  <span className="text-primary-400 font-bold text-sm flex items-center">
                    {formatCurrency(order.amount)}
                    <CopyBtn text={String(order.amount)} label="Amount" />
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-3">
              <a
                href="https://wa.me/233322291381?text=Hi%2C+I+need+help+with+my+order"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 rounded-xl border border-dark-700 text-dark-300 text-sm hover:bg-dark-800/50 hover:text-white transition-colors"
              >
                Need Help?
              </a>
              <button
                onClick={() => {
                  setOrder(null);
                  setReference("");
                }}
                className="flex-1 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors"
              >
                Track Another
              </button>
            </div>
          </div>
        )}

        {/* Info note */}
        {!order && !error && (
          <div className="bg-dark-900/40 border border-dark-800/50 rounded-xl px-4 py-3">
            <p className="text-dark-500 text-xs">
              Your reference number was shown on the payment confirmation screen
              and in your receipt. It starts with{" "}
              <span className="text-dark-300 font-mono">GUEST-</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
