import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Wifi,
  Phone,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Zap,
  Clock,
  Star,
  ChevronRight,
  X,
  User,
  Mail,
  CreditCard,
  Smartphone,
  Copy,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../utils/api";
import { formatCurrency } from "../utils/formatters";

const NETWORKS = ["MTN", "TELECEL", "AIRTEL_TIGO"];

const NETWORK_META = {
  MTN: {
    label: "MTN",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    activeBg: "bg-yellow-500",
    dot: "bg-yellow-400",
  },
  TELECEL: {
    label: "Telecel",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    activeBg: "bg-red-500",
    dot: "bg-red-400",
  },
  AIRTEL_TIGO: {
    label: "AirtelTigo",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    activeBg: "bg-blue-500",
    dot: "bg-blue-400",
  },
};

const PlanCard = ({ plan, selected, onSelect, primaryColor }) => {
  const nm = NETWORK_META[plan.network] || NETWORK_META.MTN;
  return (
    <button
      onClick={() => onSelect(plan)}
      className={`relative rounded-2xl border p-4 text-left transition-all w-full ${
        selected
          ? "bg-dark-800 border-primary-500 shadow-lg shadow-primary-900/30"
          : "bg-dark-900/70 border-dark-800 hover:border-dark-600 hover:bg-dark-800/60"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-4 h-4 text-primary-400" />
        </div>
      )}
      <div
        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide mb-2.5 ${nm.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${nm.dot}`} />
        {nm.label}
      </div>
      <div className="text-white font-extrabold text-xl leading-none mb-1">
        {plan.data_volume}
      </div>
      <div className="flex items-center gap-1 text-dark-500 text-[11px] mb-3">
        <Clock className="w-3 h-3" />
        {plan.validity_days}d validity
      </div>
      <div className="text-base font-bold" style={{ color: primaryColor }}>
        {formatCurrency(plan.price)}
      </div>
    </button>
  );
};

export default function ResellerShop() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [plans, setPlans] = useState([]);
  const [momoSettings, setMomoSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState("MTN");
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Form fields
  const [recipientPhone, setRecipientPhone] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");

  // Payment method
  const [payMethod, setPayMethod] = useState("card"); // 'card' | 'momo'
  const [momoSenderPhone, setMomoSenderPhone] = useState("");

  // State
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null); // { reference, plan, amount, method }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(
          `/reseller-get-pricing?reseller_code=${slug}`
        );
        const d = res.data || res;
        setShop(d.reseller);
        setPlans(d.plans || []);
        setMomoSettings(d.momo || {});
      } catch (err) {
        const msg = err?.response?.data?.message;
        toast.error(msg || "Shop not found");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const filtered = plans.filter((p) => p.network === network);

  const formValid =
    recipientPhone.length === 10 &&
    buyerName.trim().length >= 2 &&
    buyerContact.trim().length >= 5;

  // ── Card payment (Paystack redirect) ──────────────────────────────────────
  const handleCardPay = async () => {
    if (!selectedPlan) return toast.error("Select a plan first");
    if (!formValid) return toast.error("Fill in all required fields");

    setBusy(true);
    try {
      const res = await api.post("/guest-purchase", {
        phone_number: recipientPhone,
        data_plan_id: selectedPlan.id,
        network: selectedPlan.network,
        amount: selectedPlan.price,
        reseller_code: slug,
        buyer_name: buyerName.trim(),
        buyer_contact: buyerContact.trim(),
      });
      const d = res.data || res;
      const authUrl = d.authorization_url;
      if (!authUrl) throw new Error("No payment URL returned");
      window.location.href = authUrl;
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Payment initialization failed. Try again."
      );
      setBusy(false);
    }
  };

  // ── MoMo submit to admin ──────────────────────────────────────────────────
  const handleMomoPay = async () => {
    if (!selectedPlan) return toast.error("Select a plan first");
    if (!formValid) return toast.error("Fill in all required fields");
    if (momoSenderPhone.length < 10)
      return toast.error("Enter your MoMo number");

    setBusy(true);
    try {
      const res = await api.post("/guest-afa-momo", {
        reseller_code: slug,
        buyer_name: buyerName.trim(),
        buyer_contact: buyerContact.trim(),
        recipient_phone: recipientPhone,
        network: selectedPlan.network,
        data_plan_id: selectedPlan.id,
        momo_sender_phone: momoSenderPhone,
      });
      const d = res.data || res;
      setSuccess({
        reference: d.reference,
        plan: selectedPlan.data_volume,
        amount: selectedPlan.price,
        method: "momo",
      });
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Order submission failed. Try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSuccess(null);
    setSelectedPlan(null);
    setRecipientPhone("");
    setBuyerName("");
    setBuyerContact("");
    setMomoSenderPhone("");
    setPayMethod("card");
  };

  const branding = shop?.branding;
  const primaryColor = branding?.primary_color || "#6366f1";
  const shopName = branding?.business_name || shop?.name || "Data Shop";
  const tagline = branding?.tagline || "Fast & affordable data bundles";
  const logoUrl = branding?.logo_url;
  const adminMomo = momoSettings?.momo_number || "—";
  const adminNetwork = momoSettings?.momo_network || "MTN";
  const adminName = momoSettings?.momo_account_name || "PutDuckData";

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-600/10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        </div>
        <p className="text-dark-500 text-sm">Loading shop…</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mb-2">
          <Wifi className="w-8 h-8 text-dark-600" />
        </div>
        <p className="text-white text-lg font-bold">Shop not found</p>
        <p className="text-dark-500 text-sm text-center">
          This shop link may be invalid or has been removed.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-2 px-5 py-2.5 rounded-xl bg-dark-800 text-dark-300 text-sm font-medium hover:bg-dark-700 transition-colors"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-4 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <div>
          <h2 className="text-white text-2xl font-bold mb-2">
            {success.method === "momo" ? "Order Submitted!" : "Order Placed!"}
          </h2>
          <p className="text-dark-400 text-sm leading-relaxed max-w-xs">
            {success.method === "momo"
              ? "Admin will confirm your MoMo payment and deliver your data shortly."
              : `Your ${success.plan} data bundle is on its way to ${recipientPhone}.`}
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4 w-full max-w-xs space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-dark-500">Plan</span>
            <span className="text-white font-semibold">{success.plan}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-500">Amount</span>
            <span className="text-green-400 font-bold">
              {formatCurrency(success.amount)}
            </span>
          </div>
          {success.reference && (
            <div className="pt-2 border-t border-dark-800 space-y-1">
              <p className="text-dark-500 text-[11px]">
                Reference (save this):
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-white font-mono text-xs break-all">
                  {success.reference}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(success.reference);
                    toast.success("Copied!");
                  }}
                  className="text-dark-500 hover:text-dark-300 flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {success.method === "momo" && (
          <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 max-w-xs text-left">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300/80 text-xs leading-relaxed">
              Your order is pending admin approval. Keep your reference number
              to track your order.
            </p>
          </div>
        )}

        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl text-white text-sm font-semibold transition-all"
          style={{ background: primaryColor }}
        >
          Buy Another
        </button>
        <p className="text-dark-700 text-xs">Powered by PutDuckData</p>
      </div>
    );
  }

  const nm = NETWORK_META[network];

  return (
    <div className="min-h-screen bg-dark-950 text-white pb-[380px] sm:pb-[340px]">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${primaryColor}, transparent 70%)`,
          }}
        />
        <div className="relative px-4 pt-8 pb-6 text-center max-w-lg mx-auto">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={shopName}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-xl"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
              style={{
                background: `${primaryColor}25`,
                border: `1px solid ${primaryColor}40`,
              }}
            >
              <Wifi className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-white mb-1">
            {shopName}
          </h1>
          <p className="text-dark-400 text-sm">{tagline}</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-[11px] text-dark-500">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              Instant delivery
            </div>
            <div className="w-px h-3 bg-dark-800" />
            <div className="flex items-center gap-1.5 text-[11px] text-dark-500">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              Secure payment
            </div>
            <div className="w-px h-3 bg-dark-800" />
            <div className="flex items-center gap-1.5 text-[11px] text-dark-500">
              <Star className="w-3.5 h-3.5 text-purple-400" />
              Trusted shop
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* ── Network selector ── */}
        <div className="flex gap-2">
          {NETWORKS.map((n) => {
            const m = NETWORK_META[n];
            const active = n === network;
            return (
              <button
                key={n}
                onClick={() => {
                  setNetwork(n);
                  setSelectedPlan(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  active
                    ? `${m.bg} ${m.border} ${m.color}`
                    : "bg-dark-900 border-dark-800 text-dark-500 hover:border-dark-700 hover:text-dark-300"
                }`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                    active ? m.dot : "bg-dark-700"
                  }`}
                />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* ── Plans grid ── */}
        {filtered.length === 0 ? (
          <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-12 text-center">
            <Wifi className="w-10 h-10 text-dark-700 mx-auto mb-3" />
            <p className="text-dark-400 text-sm font-medium">
              No plans for {nm.label}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filtered.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan?.id === plan.id}
                onSelect={(p) =>
                  setSelectedPlan(selectedPlan?.id === p.id ? null : p)
                }
                primaryColor={primaryColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Checkout bottom panel ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-dark-900/98 backdrop-blur-xl border-t border-dark-800 transition-all duration-300 ${
          selectedPlan ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {/* Plan summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${nm.bg}`}
              >
                <Wifi className={`w-3.5 h-3.5 ${nm.color}`} />
              </div>
              <div>
                <p className="text-white text-sm font-bold">
                  {selectedPlan?.data_volume} · {nm.label}
                </p>
                <p className="text-dark-500 text-[11px]">
                  {selectedPlan?.validity_days}d validity
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white font-bold">
                {formatCurrency(selectedPlan?.price)}
              </span>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-dark-600 hover:text-dark-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recipient phone */}
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="tel"
              placeholder="Recipient phone (e.g. 0241234567)"
              value={recipientPhone}
              onChange={(e) =>
                setRecipientPhone(
                  e.target.value.replace(/\D/g, "").slice(0, 10)
                )
              }
              className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50 placeholder-dark-600 transition-all"
            />
            {recipientPhone.length === 10 && (
              <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
            )}
          </div>

          {/* Buyer name + contact in one row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
              <input
                type="text"
                placeholder="Your name"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50 placeholder-dark-600 transition-all"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
              <input
                type="text"
                placeholder="Phone / email"
                value={buyerContact}
                onChange={(e) => setBuyerContact(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50 placeholder-dark-600 transition-all"
              />
            </div>
          </div>

          {/* Payment method tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPayMethod("card")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                payMethod === "card"
                  ? "bg-primary-600/15 border-primary-500/40 text-primary-400"
                  : "bg-dark-800/40 border-dark-700/50 text-dark-500 hover:text-dark-300"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Pay Online
            </button>
            <button
              onClick={() => setPayMethod("momo")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                payMethod === "momo"
                  ? "bg-green-600/10 border-green-500/30 text-green-400"
                  : "bg-dark-800/40 border-dark-700/50 text-dark-500 hover:text-dark-300"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Pay via MoMo
            </button>
          </div>

          {/* Card payment */}
          {payMethod === "card" && (
            <button
              onClick={handleCardPay}
              disabled={busy || !formValid}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: busy || !formValid ? "#374151" : primaryColor,
              }}
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Redirecting…
                </>
              ) : (
                <>
                  Pay {formatCurrency(selectedPlan?.price)} Online{" "}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* MoMo payment */}
          {payMethod === "momo" && (
            <div className="space-y-2.5">
              {/* Instructions */}
              <div className="bg-green-500/8 border border-green-500/20 rounded-xl px-3.5 py-3 space-y-1">
                <p className="text-green-400 text-[11px] font-bold uppercase tracking-wide">
                  Send MoMo payment to:
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">
                      {adminMomo} · {adminNetwork}
                    </p>
                    <p className="text-dark-400 text-[11px]">{adminName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-extrabold">
                      {formatCurrency(selectedPlan?.price)}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(adminMomo);
                        toast.success("Number copied!");
                      }}
                      className="text-dark-500 hover:text-dark-300 text-[10px] flex items-center gap-1 mt-0.5"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Sender phone */}
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type="tel"
                  placeholder="Your MoMo number (number you sent from)"
                  value={momoSenderPhone}
                  onChange={(e) =>
                    setMomoSenderPhone(
                      e.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/40 placeholder-dark-600 transition-all"
                />
                {momoSenderPhone.length === 10 && (
                  <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                )}
              </div>

              <button
                onClick={handleMomoPay}
                disabled={busy || !formValid || momoSenderPhone.length < 10}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" /> Submit MoMo Order
                  </>
                )}
              </button>
            </div>
          )}

          <p className="text-center text-dark-700 text-[10px]">
            Powered by PutDuckData · Secure & Instant
          </p>
        </div>
      </div>
    </div>
  );
}
