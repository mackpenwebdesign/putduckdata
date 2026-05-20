import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Loader2,
  CheckCircle,
  ArrowLeft,
  Sprout,
  User,
  Phone,
  Calendar,
  Users,
  MapPin,
  CreditCard,
  Share2,
  Wifi,
  Wallet,
} from "lucide-react";
import api from "../../utils/api";
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

const Field = ({ label, icon: Icon, required, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-xs font-semibold text-dark-300">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  "w-full bg-dark-800 border border-dark-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50 placeholder-dark-600 transition-all";

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-dark-800/60 last:border-0">
    <span className="text-dark-500 text-xs flex-shrink-0">{label}</span>
    <span className="text-white text-xs font-semibold text-right break-all">
      {value || "—"}
    </span>
  </div>
);

const buildWhatsAppText = (f) => {
  const lines = [
    "*AFA Registration Details*",
    "━━━━━━━━━━━━━━━━━━━",
    `📛 *Name:* ${f.full_name}`,
    `🎂 *Date of Birth:* ${f.date_of_birth}`,
    `👤 *Gender:* ${f.gender}`,
    `📱 *Phone:* ${f.phone_number}`,
    `🪪 *Ghana Card:* ${f.ghana_card_number}`,
    `📍 *Region:* ${f.region}`,
    f.community ? `🏘️ *Community:* ${f.community}` : "",
    "━━━━━━━━━━━━━━━━━━━",
    "✅ Submitted via PutDuckData",
    "Dial *1848# to verify eligibility after processing.",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/?text=${encodeURIComponent(lines)}`;
};

export default function AfaForm() {
  const navigate = useNavigate();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // null = not done | object = submitted form data

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem("afa_pending_form");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      full_name: "",
      date_of_birth: "",
      gender: "",
      phone_number: "",
      ghana_card_number: "",
      region: "",
      community: "",
    };
  });

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get("/afa-registration");
        const d = res.data || res;
        if (
          d.status === "none" ||
          d.status === "pending" ||
          d.status === "failed"
        ) {
          toast.error("Please complete payment before filling the form.");
          navigate("/dashboard/afa");
          return;
        }
        if (d.status === "ongoing" || d.status === "delivered") {
          setDone(d.form_data || {});
        }
      } catch {
        toast.error("Could not verify payment status.");
        navigate("/dashboard/afa");
      } finally {
        setCheckingStatus(false);
      }
    };
    check();
  }, [navigate]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    const labels = {
      full_name: "Full Name",
      date_of_birth: "Date of Birth",
      gender: "Gender",
      phone_number: "Phone Number",
      ghana_card_number: "Ghana Card Number",
      region: "Region",
    };
    for (const [k, label] of Object.entries(labels)) {
      if (!(form[k] || "").trim()) return toast.error(`${label} is required`);
    }
    if (form.phone_number.replace(/\D/g, "").length < 10)
      return toast.error("Enter a valid 10-digit phone number");

    setSubmitting(true);
    try {
      await api.post("/afa-form-submit", form);
      localStorage.removeItem("afa_pending_form");
      toast.success("Registration submitted!");
      setDone(form);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Submission failed. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (done !== null) {
    const f = done;
    const hasData = f && f.full_name;
    return (
      <div className="max-w-lg mx-auto space-y-4 py-4">
        {/* Success banner */}
        <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-green-400 font-bold text-sm">
              AFA Form Submitted
            </p>
            <p className="text-dark-400 text-xs mt-0.5 leading-relaxed">
              Admin will process your registration and send credentials within
              24 hours. Dial{" "}
              <span className="text-white font-bold">*1848#</span> to verify
              eligibility after processing.
            </p>
          </div>
        </div>

        {/* WhatsApp share button — prominent */}
        {hasData && (
          <a
            href={buildWhatsAppText(f)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-colors shadow-lg shadow-green-900/30"
          >
            <Share2 className="w-4 h-4" /> Share Details on WhatsApp
          </a>
        )}

        {/* Submitted details */}
        {hasData && (
          <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-dark-800">
              <p className="text-white text-xs font-bold uppercase tracking-widest">
                Submitted Details
              </p>
            </div>
            <div className="px-4 py-2">
              <DetailRow label="Full Name" value={f.full_name} />
              <DetailRow label="Date of Birth" value={f.date_of_birth} />
              <DetailRow label="Gender" value={f.gender} />
              <DetailRow label="Phone Number" value={f.phone_number} />
              <DetailRow label="Ghana Card" value={f.ghana_card_number} />
              <DetailRow label="Region" value={f.region} />
              {f.community && (
                <DetailRow label="Community" value={f.community} />
              )}
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
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full py-2.5 rounded-xl border border-dark-700 text-dark-400 text-sm font-medium hover:text-white hover:border-dark-600 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard/afa")}
          className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary-400" />
            AFA Registration Form
          </h1>
          <p className="text-dark-400 text-xs mt-0.5">
            Fill in your personal details to complete registration
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { step: "1", label: "Paid", done: true },
          { step: "2", label: "Fill Form", active: true },
          { step: "3", label: "Receive", active: false },
        ].map(({ step, label, done: d, active }) => (
          <div
            key={step}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl border ${
              d
                ? "bg-green-500/10 border-green-500/30"
                : active
                ? "bg-primary-600/10 border-primary-500/30"
                : "bg-dark-900 border-dark-800"
            }`}
          >
            <span
              className={`text-lg font-bold ${
                d
                  ? "text-green-400"
                  : active
                  ? "text-primary-400"
                  : "text-dark-600"
              }`}
            >
              {d ? "✓" : step}
            </span>
            <span
              className={`text-xs font-medium ${
                d
                  ? "text-green-400"
                  : active
                  ? "text-primary-300"
                  : "text-dark-600"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 space-y-4">
        <Field label="Full Name" icon={User} required>
          <input
            className={inputCls}
            placeholder="As on Ghana Card"
            value={form.full_name}
            onChange={set("full_name")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth" icon={Calendar} required>
            <input
              type="date"
              className={inputCls}
              value={form.date_of_birth}
              onChange={set("date_of_birth")}
            />
          </Field>
          <Field label="Gender" icon={Users} required>
            <select
              className={inputCls}
              value={form.gender}
              onChange={set("gender")}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </Field>
        </div>

        <Field label="Phone Number" icon={Phone} required>
          <input
            className={inputCls}
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
        </Field>

        <Field label="Ghana Card Number" icon={CreditCard} required>
          <input
            className={inputCls}
            placeholder="GHA-XXXXXXXXX-X"
            value={form.ghana_card_number}
            onChange={set("ghana_card_number")}
          />
        </Field>

        <Field label="Region" icon={MapPin} required>
          <select
            className={inputCls}
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
        </Field>

        <Field label="Community / Town" icon={MapPin}>
          <input
            className={inputCls}
            placeholder="Enter your community (optional)"
            value={form.community}
            onChange={set("community")}
          />
        </Field>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-bold text-sm transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {submitting ? "Submitting…" : "Submit Registration"}
        </button>
      </div>

      <p className="text-center text-dark-600 text-xs">
        Your details are securely handled. Admin will process and send
        credentials to your phone/email within 24 hours.
      </p>
    </div>
  );
}
