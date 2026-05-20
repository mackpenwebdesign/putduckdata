import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Sprout,
  User,
  Phone,
  Calendar,
  Users,
  MapPin,
  FileText,
  Share2,
} from "lucide-react";
import api from "../utils/api";
import { formatCurrency } from "../utils/formatters";
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

export default function GuestAFA() {
  const [status, setStatus] = useState(null);
  const [submittedForm, setSubmittedForm] = useState(null);
  const [price, setPrice] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    phone_number: "",
    ghana_card_number: "",
    region: "",
    community: "",
  });

  const setField = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api
      .get("/guest-afa")
      .then((res) => {
        const d = res.data || res;
        setPrice(d.price || 30);
        if (d.status !== "none") {
          setStatus(d.status);
          if (d.form_data) setSubmittedForm(d.form_data);
        }
      })
      .catch(() => {
        // No status expected for new guest
      })
      .finally(() => setLoading(false));
  }, []);

  const fee = Math.round(price * 0.04 * 100) / 100;
  const total = Math.round((price + fee) * 100) / 100;

  const validate = () => {
    const labels = {
      full_name: "Full Name",
      phone_number: "Phone Number",
      ghana_card_number: "Ghana Card Number",
      region: "Region",
      date_of_birth: "Date of Birth",
      gender: "Gender",
    };
    for (const [k, label] of Object.entries(labels)) {
      if (!(form[k] || "").trim()) {
        toast.error(`${label} is required`);
        return false;
      }
    }
    if (form.phone_number.replace(/\D/g, "").length !== 10) {
      toast.error("Enter valid 10-digit phone (e.g. 0241234567)");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setBusy(true);
    try {
      localStorage.setItem("guest_afa_form", JSON.stringify(form));

      const res = await api.post("/guest-afa", {
        payment_method: "paystack",
        phone_number: form.phone_number,
        form_data: form,
      });
      const d = res.data || res;
      window.location.href = d.authorization_url;
    } catch (err) {
      toast.error(err?.error || err?.message || "Payment init failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (status && status !== "none" && status !== "failed") {
    const STATUS_META = {
      ongoing: {
        icon: Clock,
        color: "text-blue-400",
        title: "Submitted",
        desc: "Your details submitted. Admin processing within 24h.",
      },
      delivered: {
        icon: CheckCircle,
        color: "text-green-400",
        title: "Complete",
        desc: "Registration delivered. Dial *1848#.",
      },
      pending: {
        icon: Clock,
        color: "text-amber-400",
        title: "Payment Pending",
        desc: "Waiting Paystack confirmation.",
      },
    };
    const s = STATUS_META[status] || {};
    const Icon = s.icon || CheckCircle;
    const f = submittedForm;

    const buildWA = (fd) => {
      const lines = [
        "*GUEST AFA Registration*",
        `📛 ${fd.full_name}`,
        `📱 ${fd.phone_number}`,
        `🪪 ${fd.ghana_card_number}`,
        `📍 ${fd.region}`,
        fd.date_of_birth ? `🎂 ${fd.date_of_birth}` : "",
        fd.gender ? `👤 ${fd.gender}` : "",
        "━━━━━━━━━━━━━━━━━━━",
        "✅ Via PutDuckData (Guest)",
        "Dial *1848# after processing.",
      ]
        .filter(Boolean)
        .join("\n");
      return `https://wa.me/?text=${encodeURIComponent(lines)}`;
    };

    return (
      <div className="max-w-lg mx-auto space-y-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center">
            <Sprout className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AFA Registration</h1>
            <p className="text-dark-400 text-xs">Track by phone/ref</p>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border flex gap-3 bg-dark-800 border-dark-700 ${
            s.color ?? ""
          }`}
        >
          <Icon className={`w-5 h-5 mt-0.5 ${s.color ?? ""}`} />
          <div className="flex-1">
            <p className={`font-semibold text-sm ${s.color ?? ""}`}>
              {s.title}
            </p>
            <p className="text-dark-400 text-xs mt-0.5">{s.desc}</p>
          </div>
        </div>

        {f && (
          <a
            href={buildWA(f)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm shadow-lg transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share on WhatsApp
          </a>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/buy"
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold"
          >
            Buy Data
          </Link>
          <Link
            to="/track-order"
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800 text-dark-200 text-sm font-semibold"
          >
            Track Order
          </Link>
        </div>
      </div>
    );
  }

  // ── New registration form ────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-5 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center">
          <Sprout className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">
            Guest AFA Registration
          </h1>
          <p className="text-dark-400 text-xs">
            No signup needed - Paystack + submit
          </p>
        </div>
      </div>

      {/* ── Personal details ── */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 space-y-4">
        <p className="text-white text-sm font-semibold">Your Details</p>

        <div className="space-y-3">
          {/* Full name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <User className="w-3.5 h-3.5" /> Full Name *
            </label>
            <input
              className={inp}
              placeholder="As per Ghana Card"
              value={form.full_name}
              onChange={setField("full_name")}
            />
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
                <Calendar className="w-3.5 h-3.5" /> Date of Birth *
              </label>
              <input
                type="date"
                className={inp}
                value={form.date_of_birth}
                onChange={setField("date_of_birth")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
                <Users className="w-3.5 h-3.5" /> Gender *
              </label>
              <select
                className={inp}
                value={form.gender}
                onChange={setField("gender")}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <Phone className="w-3.5 h-3.5" /> Phone Number * (for tracking)
            </label>
            <input
              className={inp}
              type="tel"
              placeholder="0241234567"
              value={form.phone_number}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  phone_number: e.target.value.replace(/\D/g, "").slice(0, 10),
                }))
              }
            />
          </div>

          {/* Ghana Card */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <FileText className="w-3.5 h-3.5" /> Ghana Card *
            </label>
            <input
              className={inp}
              placeholder="GHA-XXXXXXXXX-X"
              value={form.ghana_card_number}
              onChange={setField("ghana_card_number")}
            />
          </div>

          {/* Region */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <MapPin className="w-3.5 h-3.5" /> Region *
            </label>
            <select
              className={inp}
              value={form.region}
              onChange={setField("region")}
            >
              <option value="">Select</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Community */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-dark-400">
              <MapPin className="w-3.5 h-3.5" /> Community (optional)
            </label>
            <input
              className={inp}
              placeholder="Your town/community"
              value={form.community}
              onChange={setField("community")}
            />
          </div>
        </div>
      </div>

      {/* ── Payment ── */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 space-y-4">
        <p className="text-white text-sm font-semibold">Paystack Payment</p>

        <div className="bg-dark-800/60 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-dark-400">Registration Fee</span>
            <span className="text-white font-medium">
              {formatCurrency(price)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark-400">Fee (4%)</span>
            <span className="text-dark-300">+{formatCurrency(fee)}</span>
          </div>
          <div className="flex justify-between border-t border-dark-700 pt-2 font-semibold">
            <span className="text-white">Total</span>
            <span className="text-primary-400">{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-bold text-sm shadow-lg transition-all"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {busy
            ? "Starting Payment…"
            : `Pay GH₵${total.toFixed(2)} – Secure Paystack`}
        </button>

        <div className="flex items-center gap-2 bg-dark-800/40 border border-dark-700/50 rounded-xl px-3 py-2.5 text-xs text-dark-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          No account needed. Complete payment → auto-submits form to admin.
        </div>
      </div>

      <p className="text-center text-dark-600 text-xs">
        *1848# to verify after admin processes (24h). Secure &amp; no signup
        required.
      </p>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dark-800/40">
        <Link
          to="/buy"
          className="flex items-center justify-center py-3 rounded-xl bg-dark-800 text-dark-200 text-sm"
        >
          Buy Data
        </Link>
        <Link
          to="/track-order"
          className="flex items-center justify-center py-3 rounded-xl bg-dark-800 text-dark-200 text-sm"
        >
          Track
        </Link>
      </div>
    </div>
  );
}
