import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Loader2,
  CreditCard,
  Wallet,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Sprout,
  User,
  Phone,
  Calendar,
  Users,
  MapPin,
  FileText,
  Share2,
  Wifi,
} from "lucide-react";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/formatters";
import useAuthStore from "../../stores/authStore";
import { toast } from "react-hot-toast";

const REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Eastern",
  "Western",
  "Central",
  "Northern",
  "Upper East",
  "Upper West",
  "Volta",
  "Bono",
  "Bono East",
  "Ahafo",
  "Savannah",
  "North East",
  "Oti",
  "Western North",
];

const inp =
  "w-full bg-dark-800 border border-dark-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50 placeholder-dark-600 transition-all";

const STATUS_META = {
  paid_awaiting_form: {
    icon: FileText,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    title: "Payment done — fill your details",
    desc: "Your payment was received. Complete registration by filling your personal details.",
    action: "Fill Form",
    actionPath: "/dashboard/afa/form",
  },
  ongoing: {
    icon: Clock,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    title: "Registration in progress",
    desc: "Details submitted. Admin will process within 24 hours.",
  },
  delivered: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    title: "Registration complete",
    desc: "Your AFA registration has been processed. Dial *1848# to verify eligibility.",
  },
  pending: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    title: "Payment pending",
    desc: "Waiting for payment confirmation. This usually takes a few seconds.",
  },
};

export default function BuyAFA() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [status, setStatus] = useState(null);
  const [submittedForm, setSubmittedForm] = useState(null);
  const [price, setPrice] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("paystack");

  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    phone_number: "",
    ghana_card_number: "",
    region: "",
    community: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api
      .get("/afa-registration")
      .then((res) => {
        const d = res.data || res;
        setStatus(d.status);
        setPrice(d.price || 30);
        if (d.form_data) setSubmittedForm(d.form_data);
      })
      .catch(() => toast.error("Failed to load AFA status"))
      .finally(() => setLoading(false));
  }, []);

  const fee = Math.round(price * 0.04 * 100) / 100;
  const total =
    method === "paystack" ? Math.round((price + fee) * 100) / 100 : price;

  const validate = () => {
    const labels = {
      full_name: "Full Name",
      date_of_birth: "Date of Birth",
      gender: "Gender",
      phone_number: "Phone Number",
      ghana_card_number: "Ghana Card Number",
      region: "Region",
    };
    for (const [k, label] of Object.entries(labels)) {
      if (!(form[k] || "").trim()) {
        toast.error(`${label} is required`);
        return false;
      }
    }
    if (form.phone_number.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid 10-digit phone number");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      if (method === "wallet") {
        await api.post("/afa-registration", {
          payment_method: "wallet",
          form_data: form,
        });
        toast.success("Registration submitted!");
        setSubmittedForm(form);
        setStatus("ongoing");
      } else {
        // Save form to localStorage so AfaForm can submit it after Paystack return
        localStorage.setItem("afa_pending_form", JSON.stringify(form));
        const res = await api.post("/afa-registration", {
          payment_method: "paystack",
        });
        const d = res.data || res;
        window.location.href = d.authorization_url;
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed. Try again."
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );

  // Already has an active order
  if (status && status !== "none" && status !== "failed") {
    const s = STATUS_META[status];
    const Icon = s?.icon || CheckCircle;
    const f = submittedForm;
    const hasForm = f && f.full_name;

    const buildWA = (fd) => {
      const lines = [
        "*AFA Registration Details*",
        "━━━━━━━━━━━━━━━━━━━",
        `📛 *Name:* ${fd.full_name}`,
        `🎂 *Date of Birth:* ${fd.date_of_birth}`,
        `👤 *Gender:* ${fd.gender}`,
        `📱 *Phone:* ${fd.phone_number}`,
        `🪪 *Ghana Card:* ${fd.ghana_card_number}`,
        `📍 *Region:* ${fd.region}`,
        fd.community ? `🏘️ *Community:* ${fd.community}` : "",
        "━━━━━━━━━━━━━━━━━━━",
        "✅ Submitted via PutDuckData",
        "Dial *1848# to verify eligibility after processing.",
      ]
        .filter(Boolean)
        .join("\n");
      return `https://wa.me/?text=${encodeURIComponent(lines)}`;
    };

    return (
      <div className="max-w-lg mx-auto space-y-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center flex-shrink-0">
            <Sprout className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AFA Registration</h1>
            <p className="text-dark-400 text-xs">Agriculture for All</p>
          </div>
        </div>

        {/* Status card */}
        <div
          className={`border rounded-2xl p-4 flex gap-3 ${
            s?.bg || "bg-dark-800 border-dark-700"
          }`}
        >
          <Icon
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              s?.color || "text-white"
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${s?.color || "text-white"}`}>
              {s?.title}
            </p>
            <p className="text-dark-400 text-xs mt-0.5">{s?.desc}</p>
            {s?.actionPath && (
              <button
                onClick={() => navigate(s.actionPath)}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                {s.action} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* WhatsApp share — prominent */}
        {hasForm && (
          <a
            href={buildWA(f)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-colors shadow-lg shadow-green-900/30"
          >
            <Share2 className="w-4 h-4" /> Share Details on WhatsApp
          </a>
        )}

        {/* Submitted details */}
        {hasForm && (
          <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-dark-800">
              <p className="text-white text-xs font-bold uppercase tracking-widest">
                Submitted Details
              </p>
            </div>
            <div className="px-4 py-2 space-y-0">
              {[
                ["Full Name", f.full_name],
                ["Date of Birth", f.date_of_birth],
                ["Gender", f.gender],
                ["Phone", f.phone_number],
                ["Ghana Card", f.ghana_card_number],
                ["Region", f.region],
                f.community ? ["Community", f.community] : null,
              ]
                .filter(Boolean)
                .map(([label, val]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3 py-2 border-b border-dark-800/60 last:border-0"
                  >
                    <span className="text-dark-500 text-xs flex-shrink-0">
                      {label}
                    </span>
                    <span className="text-white text-xs font-semibold text-right break-all">
                      {val}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Dial code reminder */}
        <div className="bg-dark-900/60 border border-dark-800/60 rounded-xl px-4 py-3 text-center">
          <p className="text-dark-400 text-xs">
            After processing, verify eligibility by dialing
          </p>
          <p className="text-white font-extrabold text-lg mt-0.5">*1848#</p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/dashboard/buy-data"
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold transition-colors"
          >
            <Wifi className="w-4 h-4" /> Buy Data
          </Link>
          <Link
            to="/dashboard/wallet"
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-200 text-sm font-semibold transition-colors"
          >
            <Wallet className="w-4 h-4" /> Top Up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center flex-shrink-0">
          <Sprout className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">AFA Registration</h1>
          <p className="text-dark-400 text-xs">
            Agriculture for All — fill your details and pay to register
          </p>
        </div>
      </div>

      {/* Single merged card */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl divide-y divide-dark-800">
        {/* ── Credentials section ── */}
        <div className="p-5 space-y-4">
          <p className="text-white text-sm font-semibold">Personal Details</p>

          {/* Full name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <User className="w-3.5 h-3.5" />
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              className={inp}
              placeholder="As on Ghana Card"
              value={form.full_name}
              onChange={set("full_name")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
                <Calendar className="w-3.5 h-3.5" />
                Date of Birth <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                className={inp}
                value={form.date_of_birth}
                onChange={set("date_of_birth")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
                <Users className="w-3.5 h-3.5" />
                Gender <span className="text-red-400">*</span>
              </label>
              <select
                className={inp}
                value={form.gender}
                onChange={set("gender")}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <Phone className="w-3.5 h-3.5" />
              Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              className={inp}
              type="tel"
              placeholder="e.g. 0241234567"
              value={form.phone_number}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  phone_number: e.target.value.replace(/\D/g, "").slice(0, 10),
                }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <FileText className="w-3.5 h-3.5" />
              Ghana Card Number <span className="text-red-400">*</span>
            </label>
            <input
              className={inp}
              placeholder="GHA-XXXXXXXXX-X"
              value={form.ghana_card_number}
              onChange={set("ghana_card_number")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <MapPin className="w-3.5 h-3.5" />
              Region <span className="text-red-400">*</span>
            </label>
            <select
              className={inp}
              value={form.region}
              onChange={set("region")}
            >
              <option value="">Select region</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <MapPin className="w-3.5 h-3.5" />
              Community / Town
            </label>
            <input
              className={inp}
              placeholder="Optional"
              value={form.community}
              onChange={set("community")}
            />
          </div>
        </div>

        {/* ── Payment section ── */}
        <div className="p-5 space-y-4">
          <p className="text-white text-sm font-semibold">Payment</p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "paystack", label: "Pay Online", icon: CreditCard },
              { key: "wallet", label: "Wallet", icon: Wallet },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMethod(key)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                  method === key
                    ? "bg-primary-600/10 border-primary-500/40 text-primary-400"
                    : "bg-dark-800/50 border-dark-700 text-dark-400 hover:text-dark-200"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <div className="bg-dark-800/60 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">AFA Registration</span>
              <span className="text-white font-medium">
                {formatCurrency(price)}
              </span>
            </div>
            {method === "paystack" && (
              <div className="flex justify-between">
                <span className="text-dark-400">Processing fee (4%)</span>
                <span className="text-dark-300">+{formatCurrency(fee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-dark-700 pt-2 font-semibold">
              <span className="text-white">Total</span>
              <span className="text-primary-400">{formatCurrency(total)}</span>
            </div>
          </div>

          {method === "wallet" && (
            <div className="flex items-center gap-2 bg-dark-800/40 border border-dark-700/50 rounded-xl px-3 py-2.5 text-xs text-dark-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Balance:{" "}
              <span className="text-white font-medium ml-1">
                {formatCurrency(user?.wallet_balance || 0)}
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-bold text-sm transition-colors"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {busy
              ? "Processing…"
              : method === "wallet"
              ? `Pay & Submit — ${formatCurrency(total)}`
              : `Pay Online — ${formatCurrency(total)}`}
          </button>
        </div>
      </div>

      <p className="text-center text-dark-600 text-xs">
        Admin processes registrations within 24 hours after payment
        confirmation.
      </p>
    </div>
  );
}
