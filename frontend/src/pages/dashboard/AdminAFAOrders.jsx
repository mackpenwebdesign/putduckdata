import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Sprout,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/formatters";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "ongoing", label: "Pending Form" },
  { key: "pending_form", label: "Awaiting Form" },
  { key: "completed", label: "Completed" },
];

const OrderCard = ({ order, onComplete }) => {
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);
  const [note, setNote] = useState("");
  const meta =
    typeof order.metadata === "string"
      ? JSON.parse(order.metadata)
      : order.metadata || {};
  const form = meta.afa_form || null;
  const delivery = meta.delivery_status;
  const isComplete = order.status === "completed";

  const handleComplete = async () => {
    setMarking(true);
    try {
      await api.post("/admin-afa-complete", {
        transaction_id: order.id,
        credentials_note: note,
      });
      toast.success("Order marked complete");
      onComplete();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark complete");
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold">
                {order.user_name || "Unknown"}
              </span>
              <span className="text-dark-500 text-xs">{order.user_email}</span>
              <span
                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                  isComplete
                    ? "bg-green-500/10 text-green-400"
                    : delivery === "ongoing"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-dark-700 text-dark-400"
                }`}
              >
                {isComplete
                  ? "Completed"
                  : delivery === "ongoing"
                  ? "Form Submitted"
                  : "Awaiting Form"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-dark-500">
              <span>
                Ref:{" "}
                <span className="text-dark-300 font-mono">
                  {order.reference}
                </span>
              </span>
              <span>{formatCurrency(order.amount)}</span>
              <span>
                {formatDistanceToNow(new Date(order.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {form && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-dark-800 text-dark-400 hover:text-white transition-colors"
              >
                Form{" "}
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
            {!isComplete && form && (
              <button
                onClick={handleComplete}
                disabled={marking}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {marking ? "Marking…" : "Mark Complete"}
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && form && (
        <div className="border-t border-dark-800 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            ["Full Name", form.full_name],
            ["Date of Birth", form.date_of_birth],
            ["Gender", form.gender],
            ["Phone", form.phone_number],
            ["Ghana Card", form.ghana_card_number],
            ["Region", form.region],
            ["Community", form.community || "—"],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-dark-500 mb-0.5">{label}</p>
              <p className="text-white font-medium">{val}</p>
            </div>
          ))}
        </div>
      )}

      {!isComplete && form && expanded && (
        <div className="border-t border-dark-800 px-4 pb-4 pt-3 space-y-2">
          <input
            className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-600/50 placeholder-dark-600"
            placeholder="Optional note to user (e.g. credentials sent via SMS)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

export default function AdminAFAOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/admin-afa-orders?status=${tab}&include_guest=true`
      );
      const d = res.data || res;
      setOrders(d.orders || []);
    } catch {
      toast.error("Failed to load AFA orders");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary-400" />
            AFA Orders
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Agriculture for All registration orders
          </p>
        </div>
        <button
          onClick={fetch}
          className="p-2 rounded-lg bg-dark-800/50 border border-dark-700/50 text-dark-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.key
                ? "bg-primary-600/15 text-primary-400 border border-primary-500/30"
                : "bg-dark-800/50 text-dark-400 hover:text-white border border-dark-700/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-dark-900/50 border border-dark-800 rounded-2xl">
          <Clock className="w-10 h-10 text-dark-700 mb-3" />
          <p className="text-dark-400 text-sm">No AFA orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onComplete={fetch} />
          ))}
        </div>
      )}

      {orders.length > 0 && (
        <p className="text-center text-dark-500 text-xs">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
