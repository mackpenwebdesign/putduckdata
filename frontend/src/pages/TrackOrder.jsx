import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
  ArrowLeft,
  Package,
  CircleDot,
} from "lucide-react";
import api from "../utils/api";
import { formatCurrency, cleanPlanName } from "../utils/formatters";
import { toast } from "react-hot-toast";

const NETWORK_STYLE = {
  MTN: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", dot: "bg-yellow-400", label: "MTN MoMo" },
  TELECEL: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-400", label: "Telecel" },
  AIRTEL_TIGO: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", dot: "bg-blue-400", label: "AirtelTigo" },
};

const STATUS_CONFIG = {
  pending:    { color: "text-yellow-400", bg: "from-yellow-500/15 to-yellow-500/5", border: "border-yellow-500/20", label: "Payment Received", sub: "Your payment is confirmed. We're preparing your order." },
  success:    { color: "text-blue-400",   bg: "from-blue-500/15 to-blue-500/5",     border: "border-blue-500/20",   label: "Order Confirmed",  sub: "Your order has been confirmed and is being processed." },
  processing: { color: "text-primary-400",bg: "from-primary-600/15 to-primary-600/5",border: "border-primary-600/20",label: "Processing",       sub: "We're sending your data bundle now." },
  completed:  { color: "text-green-400",  bg: "from-green-500/15 to-green-500/5",   border: "border-green-500/20",  label: "Delivered",        sub: "Your data bundle has been delivered successfully." },
  failed:     { color: "text-red-400",    bg: "from-red-500/15 to-red-500/5",       border: "border-red-500/20",    label: "Failed",           sub: "Something went wrong. Please contact support." },
};

const STEPS = ["Payment Received", "Order Confirmed", "Processing", "Delivered"];

const stepIndex = (status) => {
  if (status === "completed") return 3;
  if (status === "processing") return 2;
  if (status === "success") return 1;
  return 0;
};

const CopyBtn = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success((label || "Copied") + "!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="p-1 rounded text-dark-500 hover:text-primary-400 transition-colors" title="Copy">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(() => searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("ref")) handleTrack();
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
      const res = await api.get(`/guest-order-track?reference=${encodeURIComponent(ref)}`);
      setOrder(res.data || res);
    } catch (err) {
      setError(err?.message || "Order not found. Check your reference number.");
    } finally {
      setLoading(false);
    }
  };

  const cfg = order ? STATUS_CONFIG[order.status] || STATUS_CONFIG.pending : null;
  const netStyle = order?.network ? NETWORK_STYLE[order.network] || NETWORK_STYLE.MTN : null;
  const step = order ? stepIndex(order.status) : -1;
  const isFailed = order?.status === "failed";

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Back + Header */}
        <div>
          <Link to="/buy" className="inline-flex items-center gap-1.5 text-dark-400 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Buy Data
          </Link>
          <h1 className="text-2xl font-bold text-white">Track Order</h1>
          <p className="text-dark-400 text-sm mt-0.5">Enter your reference to check delivery status</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleTrack} className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5 space-y-3">
          <label className="block text-dark-300 text-xs font-semibold uppercase tracking-widest">
            Order Reference
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder="GUEST-XXXXXXXXXX"
                className="w-full bg-dark-800/60 border border-dark-700 text-white placeholder-dark-600 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary-600/60 focus:ring-1 focus:ring-primary-600/20 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!reference.trim() || loading}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Track
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-xs flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </p>
          )}
        </form>

        {/* Result card */}
        {order && cfg && (
          <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">

            {/* Status hero */}
            <div className={`bg-gradient-to-br ${cfg.bg} border-b ${cfg.border} p-5`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                    {isFailed
                      ? <XCircle className={`w-5 h-5 ${cfg.color}`} />
                      : order.status === "completed"
                      ? <CheckCircle className={`w-5 h-5 ${cfg.color}`} />
                      : <Clock className={`w-5 h-5 ${cfg.color} ${order.status === "processing" ? "animate-pulse" : ""}`} />
                    }
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-dark-400 text-xs mt-0.5 max-w-[220px]">{order.status_message || cfg.sub}</p>
                  </div>
                </div>
                <button
                  onClick={handleTrack}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-dark-500 hover:text-white transition-colors disabled:opacity-40 flex-shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Progress steps — hidden for failed */}
              {!isFailed && (
                <div className="mt-5">
                  <div className="flex items-center gap-0">
                    {STEPS.map((s, i) => {
                      const done = i <= step;
                      const active = i === step;
                      return (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                              done
                                ? "border-green-400 bg-green-400/20"
                                : "border-dark-600 bg-dark-800"
                            } ${active ? "ring-2 ring-green-400/30 ring-offset-1 ring-offset-transparent" : ""}`}>
                              {done
                                ? <Check className="w-3 h-3 text-green-400" />
                                : <CircleDot className="w-2.5 h-2.5 text-dark-600" />
                              }
                            </div>
                            <span className={`text-[9px] font-medium text-center leading-tight w-14 ${done ? "text-green-400" : "text-dark-600"}`}>
                              {s}
                            </span>
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 mb-4 mx-0.5 rounded-full transition-all ${i < step ? "bg-green-400/60" : "bg-dark-700"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Network + Phone hero row */}
            {(order.phone || order.network) && (
              <div className="px-5 py-4 border-b border-dark-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {netStyle && (
                    <div className={`w-9 h-9 rounded-xl ${netStyle.bg} border ${netStyle.border} flex items-center justify-center`}>
                      <Wifi className={`w-4 h-4 ${netStyle.color}`} />
                    </div>
                  )}
                  <div>
                    {order.network && <p className={`text-xs font-semibold ${netStyle?.color || "text-white"}`}>{netStyle?.label || order.network}</p>}
                    {order.phone && <p className="text-white font-bold text-lg leading-tight">{order.phone}</p>}
                  </div>
                </div>
                {order.phone && <CopyBtn text={order.phone} label="Phone number" />}
              </div>
            )}

            {/* Details grid */}
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              {order.plan_name && (
                <div className="bg-dark-800/40 rounded-xl p-3">
                  <p className="text-dark-500 text-[10px] font-medium uppercase tracking-wide mb-1">Plan</p>
                  <p className="text-white text-sm font-semibold">{cleanPlanName(order.plan_name)}</p>
                </div>
              )}
              {order.data_volume && (
                <div className="bg-dark-800/40 rounded-xl p-3">
                  <p className="text-dark-500 text-[10px] font-medium uppercase tracking-wide mb-1">Data</p>
                  <p className="text-white text-sm font-semibold">{order.data_volume}</p>
                </div>
              )}
              <div className="bg-dark-800/40 rounded-xl p-3">
                <p className="text-dark-500 text-[10px] font-medium uppercase tracking-wide mb-1">Validity</p>
                <p className="text-white text-sm font-semibold">90 days</p>
              </div>
              {order.amount > 0 && (
                <div className="bg-dark-800/40 rounded-xl p-3">
                  <p className="text-dark-500 text-[10px] font-medium uppercase tracking-wide mb-1">Amount Paid</p>
                  <p className="text-primary-400 text-sm font-bold">{formatCurrency(order.amount)}</p>
                </div>
              )}
              {order.purchase_date && (
                <div className="col-span-2 bg-dark-800/40 rounded-xl p-3">
                  <p className="text-dark-500 text-[10px] font-medium uppercase tracking-wide mb-1">Purchase Date</p>
                  <p className="text-white text-sm font-medium">
                    {new Date(order.purchase_date).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              )}
            </div>

            {/* Reference row */}
            <div className="mx-5 mb-4 bg-dark-800/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-dark-500 text-xs">Reference</span>
              <div className="flex items-center gap-1">
                <span className="text-dark-300 font-mono text-xs">{order.reference}</span>
                <CopyBtn text={order.reference} label="Reference" />
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2.5">
              <a
                href="https://wa.me/233558638899?text=Hi%2C+I+need+help+with+my+order"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2.5 rounded-xl border border-dark-700 text-dark-300 text-sm hover:bg-dark-800/50 hover:text-white transition-colors"
              >
                Need Help?
              </a>
              <button
                onClick={() => { setOrder(null); setReference(""); }}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-colors"
              >
                Track Another
              </button>
            </div>
          </div>
        )}

        {/* Empty hint */}
        {!order && !error && !loading && (
          <div className="flex flex-col items-center py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-dark-900/80 border border-dark-800 rounded-2xl flex items-center justify-center">
              <Package className="w-6 h-6 text-dark-600" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Enter your reference above to track your order</p>
              <p className="text-dark-600 text-xs mt-1">
                It starts with <span className="font-mono text-dark-400">GUEST-</span> and was shown after payment
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
