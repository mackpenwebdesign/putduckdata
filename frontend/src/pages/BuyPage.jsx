import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Smartphone,
  Wifi,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Download,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import api from "../utils/api";
import { formatCurrency, cleanPlanName } from "../utils/formatters";
import { toast } from "react-hot-toast";

const NETWORKS = [
  { id: "MTN", name: "MTN", logo: "/images/MTN logo.png", prefixes: ["024", "025", "053", "054", "055", "059"] },
  { id: "TELECEL", name: "Telecel", logo: "/images/telecel.png", prefixes: ["020", "050"] },
  { id: "AIRTEL_TIGO", name: "AirtelTigo", logo: "/images/AirtelTigo.png", prefixes: ["026", "027", "056", "057"] },
];

const NC = {
  MTN: {
    gradient: "from-yellow-500/20 via-yellow-500/5 to-transparent",
    border: "border-yellow-500/30",
    activeBorder: "border-yellow-500/60",
    tab: "bg-yellow-500/10 border-yellow-500/40 text-yellow-400",
    tabInactive: "border-dark-700 text-dark-400 hover:border-dark-600 hover:text-white",
    accent: "text-yellow-400",
    price: "text-yellow-400",
    badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    btn: "bg-yellow-500 hover:bg-yellow-400 text-black",
    dot: "bg-yellow-400",
    ring: "ring-yellow-500/20",
    glow: "shadow-yellow-500/10",
    step: "bg-yellow-500",
    dataBg: "bg-yellow-500/10",
    detected: "bg-yellow-500/5 border-yellow-500/20",
    check: "text-yellow-400",
  },
  TELECEL: {
    gradient: "from-red-500/20 via-red-500/5 to-transparent",
    border: "border-red-500/30",
    activeBorder: "border-red-500/60",
    tab: "bg-red-500/10 border-red-500/40 text-red-400",
    tabInactive: "border-dark-700 text-dark-400 hover:border-dark-600 hover:text-white",
    accent: "text-red-400",
    price: "text-red-400",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
    btn: "bg-red-500 hover:bg-red-400 text-white",
    dot: "bg-red-400",
    ring: "ring-red-500/20",
    glow: "shadow-red-500/10",
    step: "bg-red-500",
    dataBg: "bg-red-500/10",
    detected: "bg-red-500/5 border-red-500/20",
    check: "text-red-400",
  },
  AIRTEL_TIGO: {
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    border: "border-blue-500/30",
    activeBorder: "border-blue-500/60",
    tab: "bg-blue-500/10 border-blue-500/40 text-blue-400",
    tabInactive: "border-dark-700 text-dark-400 hover:border-dark-600 hover:text-white",
    accent: "text-blue-400",
    price: "text-blue-400",
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    btn: "bg-blue-500 hover:bg-blue-400 text-white",
    dot: "bg-blue-400",
    ring: "ring-blue-500/20",
    glow: "shadow-blue-500/10",
    step: "bg-blue-500",
    dataBg: "bg-blue-500/10",
    detected: "bg-blue-500/5 border-blue-500/20",
    check: "text-blue-400",
  },
};

const detectNetwork = (phone) => {
  if (!phone || phone.length < 3) return null;
  const prefix = phone.substring(0, 3);
  return NETWORKS.find((n) => n.prefixes.includes(prefix)) || null;
};

// ── Plan Card ─────────────────────────────────────────────────────────────────
const PlanCard = ({ plan, network, nc, onSelect }) => (
  <button
    onClick={() => onSelect(plan, network)}
    className={`group relative w-full text-left bg-dark-900/80 border ${nc.border} rounded-2xl overflow-hidden hover:${nc.activeBorder} hover:shadow-xl ${nc.glow} transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0`}
  >
    {/* Top colour band */}
    <div className={`bg-gradient-to-br ${nc.gradient} px-4 pt-5 pb-4`}>
      <span className={`text-4xl font-black ${nc.accent} leading-none tracking-tight`}>
        {plan.data}
      </span>
      <p className="text-dark-500 text-[11px] mt-1 font-medium">{plan.validity}</p>
    </div>

    {/* Bottom section */}
    <div className="px-4 pb-4 pt-3 border-t border-dark-800/60">
      <p className="text-white/90 text-xs font-medium leading-snug mb-3 line-clamp-1">{plan.name}</p>
      <div className="flex items-center justify-between">
        <p className={`text-xl font-black ${nc.price}`}>{formatCurrency(plan.price)}</p>
        <div className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg ${nc.btn} opacity-0 group-hover:opacity-100 transition-opacity`}>
          Buy <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>

    {/* Subtle arrow indicator always visible */}
    <div className={`absolute top-3 right-3 w-6 h-6 rounded-full ${nc.dataBg} flex items-center justify-center`}>
      <ArrowRight className={`w-3 h-3 ${nc.accent}`} />
    </div>
  </button>
);

// ── Skeleton Card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-dark-900/50 border border-dark-800 rounded-2xl overflow-hidden animate-pulse">
    <div className="h-20 bg-dark-800/50" />
    <div className="px-4 pb-4 pt-3 space-y-2">
      <div className="h-3 bg-dark-800/50 rounded w-3/4" />
      <div className="h-6 bg-dark-800/50 rounded w-1/2" />
    </div>
  </div>
);

const BuyPage = () => {
  const [view, setView] = useState("browse");
  const [activeTab, setActiveTab] = useState("MTN");
  const [allPlans, setAllPlans] = useState({});
  const [fetchingPlans, setFetchingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [detectedNetwork, setDetectedNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const nc = selectedNetwork ? NC[selectedNetwork.id] : NC.MTN;
  const tabNc = NC[activeTab] || NC.MTN;
  const activeNetwork = NETWORKS.find((n) => n.id === activeTab);
  const activePlans = allPlans[activeTab] || [];

  useEffect(() => {
    const v = searchParams.get("view");
    if (v === "checkout") {
      const pid = searchParams.get("planId");
      const net = searchParams.get("network");
      const plan = allPlans[net]?.find((p) => p.id === parseInt(pid));
      if (plan) {
        setSelectedPlan(plan);
        setSelectedNetwork(NETWORKS.find((n) => n.id === net));
        setView("checkout");
      } else setView("browse");
    } else {
      setView("browse");
      setSelectedPlan(null);
      setSelectedNetwork(null);
    }
  }, [searchParams, allPlans]);

  useEffect(() => {
    const CACHE_KEY = "pdd_guest_plans_cache";
    const CACHE_TTL = 5 * 60 * 1000;
    if (localStorage.getItem("token")) sessionStorage.removeItem(CACHE_KEY);
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) { setAllPlans(data); setFetchingPlans(false); return; }
      } catch { /* ignore */ }
    }
    (async () => {
      try {
        const response = await api.get("/data-plans");
        const plansData = (response.data || response).plans || {};
        const grouped = {};
        for (const [network, networkPlans] of Object.entries(plansData)) {
          if (!Array.isArray(networkPlans)) continue;
          grouped[network] = networkPlans.map((plan) => ({
            id: plan.id,
            name: cleanPlanName(plan.plan_name),
            price: parseFloat(plan.price),
            validity: "90 days",
            data: plan.data_volume,
            data_plan_id: plan.id,
          }));
        }
        setAllPlans(grouped);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: grouped, ts: Date.now() }));
      } catch { toast.error("Failed to load data plans"); }
      finally { setFetchingPlans(false); }
    })();
  }, []);

  const handleSelectPlan = (plan, network) => {
    setSearchParams({ view: "checkout", planId: plan.id.toString(), network: network.id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setPhoneNumber(value);
    setDetectedNetwork(detectNetwork(value));
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!/^0\d{9}$/.test(phoneNumber)) { toast.error("Enter a valid 10-digit Ghana number starting with 0"); return; }
    const phoneNetwork = detectNetwork(phoneNumber);
    if (!phoneNetwork) { toast.error("Unrecognized phone number prefix."); return; }
    if (phoneNetwork.id !== selectedNetwork.id) {
      toast.error(`This number belongs to ${phoneNetwork.name}, not ${selectedNetwork.name}.`);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/guest-purchase", {
        network: selectedNetwork.id,
        data_plan_id: selectedPlan.data_plan_id,
        phone_number: phoneNumber,
        amount: selectedPlan.price,
      });
      const d = res.data || res;
      if (d.authorization_url) {
        window.location.href = d.authorization_url;
      } else if (d.status === "success" || d.status === "processing") {
        setReceipt({
          reference: d.reference || "N/A",
          network: selectedNetwork.name,
          plan: selectedPlan.name,
          data: selectedPlan.data,
          validity: selectedPlan.validity,
          phone: phoneNumber,
          amount: selectedPlan.price,
          date: new Date().toLocaleString("en-GH", { dateStyle: "full", timeStyle: "short" }),
          status: d.status === "processing" ? "Processing" : "Successful",
        });
        toast.success("Purchase successful!");
        setSearchParams({});
      }
    } catch (error) {
      toast.error(error.error || error.message || "Purchase failed. Please try again.");
    } finally { setLoading(false); }
  };

  if (receipt) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] p-4">
        <div className="w-full max-w-md">
          <ReceiptCard receipt={receipt} onClose={() => { setReceipt(null); setSelectedPlan(null); setSelectedNetwork(null); setPhoneNumber(""); setDetectedNetwork(null); setView("browse"); }} />
        </div>
      </div>
    );
  }

  // ── Browse view ───────────────────────────────────────────────────────────
  if (view === "browse") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-7">

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            Buy Data
          </h1>
          <p className="text-dark-400 text-sm">
            Pick a bundle, pay via Mobile Money — no account needed.
          </p>
        </div>

        {/* Network tabs */}
        <div className="flex gap-2 mb-6">
          {NETWORKS.map((network) => {
            const c = NC[network.id];
            const isActive = activeTab === network.id;
            return (
              <button
                key={network.id}
                onClick={() => setActiveTab(network.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all duration-150 ${isActive ? c.tab : c.tabInactive}`}
              >
                <img src={network.logo} alt={network.name} className="h-5 object-contain" />
                <span className="hidden sm:inline">{network.name}</span>
              </button>
            );
          })}
        </div>

        {/* Network header */}
        <div className="flex items-center gap-3 mb-4">
          <img src={activeNetwork?.logo} alt={activeNetwork?.name} className="h-7 object-contain" />
          <div className="flex-1">
            <h2 className="text-white font-bold text-sm">{activeNetwork?.name} Data Plans</h2>
            <p className="text-dark-600 text-xs">{activePlans.length} bundles available</p>
          </div>
          <span className={`relative flex h-2 w-2`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${tabNc.dot}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${tabNc.dot}`} />
          </span>
        </div>

        {/* Plan grid */}
        {fetchingPlans ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : activePlans.length === 0 ? (
          <div className="text-center py-16 bg-dark-900/50 border border-dark-800 rounded-2xl">
            <Wifi className="w-10 h-10 text-dark-700 mx-auto mb-3" />
            <p className="text-dark-400 text-sm">No plans available for {activeNetwork?.name}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} network={activeNetwork} nc={tabNc} onSelect={handleSelectPlan} />
            ))}
          </div>
        )}

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-5 mt-7 pt-5 border-t border-dark-800/40">
          {[
            { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Secured by Paystack" },
            { icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Fast Delivery" },
            { icon: <Wifi className="w-3.5 h-3.5" />, label: "All Networks" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-dark-600 text-[11px]">
              <span className="text-primary-600/70">{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Checkout view ─────────────────────────────────────────────────────────
  const phoneMatchesNetwork = detectedNetwork?.id === selectedNetwork?.id;
  const phoneComplete = /^0\d{9}$/.test(phoneNumber);

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 space-y-4">
      {/* Back */}
      <button
        onClick={() => setSearchParams({})}
        className="flex items-center gap-1.5 text-dark-400 hover:text-white text-sm transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Plans
      </button>

      {/* Selected plan summary strip */}
      <div className={`bg-dark-900/80 border ${nc.activeBorder} rounded-2xl p-4 ring-1 ${nc.ring}`}>
        <p className="text-dark-500 text-[10px] uppercase tracking-widest font-semibold mb-3">Selected Plan</p>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl ${nc.dataBg} border ${nc.border} flex flex-col items-center justify-center shrink-0`}>
            <span className={`font-black text-sm leading-tight ${nc.accent}`}>
              {selectedPlan?.data}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <img src={selectedNetwork?.logo} alt={selectedNetwork?.name} className="h-4 object-contain" />
              <span className={`text-[11px] font-bold ${nc.accent}`}>{selectedNetwork?.name}</span>
            </div>
            <p className="text-white font-semibold text-sm leading-snug">{selectedPlan?.name}</p>
            <p className="text-dark-500 text-xs">{selectedPlan?.validity}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-2xl font-black ${nc.price}`}>{formatCurrency(selectedPlan?.price)}</p>
            <button
              onClick={() => setSearchParams({})}
              className="text-dark-600 hover:text-primary-400 text-[11px] mt-0.5 transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Phone input */}
      <div className={`bg-dark-900/80 border rounded-2xl p-5 transition-colors ${detectedNetwork ? nc.border : "border-dark-800"}`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`w-6 h-6 ${nc.step} rounded-md flex items-center justify-center text-[11px] font-black text-white shrink-0`}>1</div>
          <div>
            <h3 className="text-white font-semibold text-sm">Recipient Number</h3>
            <p className="text-dark-500 text-xs">The {selectedNetwork?.name} number to receive data</p>
          </div>
        </div>

        <Input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="0XX XXX XXXX"
          icon={Smartphone}
          maxLength={10}
        />

        {detectedNetwork && (
          <div className={`flex items-center gap-3 mt-3 ${nc.detected} border rounded-xl px-3 py-2.5`}>
            <img src={detectedNetwork.logo} alt={detectedNetwork.name} className="h-6 object-contain" />
            <div className="flex-1">
              <p className={`font-semibold text-sm ${nc.accent}`}>{detectedNetwork.name} Detected</p>
              {!phoneMatchesNetwork && (
                <p className="text-red-400 text-[11px]">Number is {detectedNetwork.name} — plan is for {selectedNetwork?.name}</p>
              )}
            </div>
            {phoneMatchesNetwork
              ? <CheckCircle className={`w-4 h-4 ${nc.check} shrink-0`} />
              : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            }
          </div>
        )}
        {!detectedNetwork && phoneNumber.length >= 3 && (
          <div className="flex items-center gap-2.5 mt-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-yellow-300 text-xs">Unrecognized prefix. Check the number.</p>
          </div>
        )}
      </div>

      {/* Order summary + pay */}
      <div className={`bg-dark-900/80 border ${nc.border} rounded-2xl p-5`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`w-6 h-6 ${nc.step} rounded-md flex items-center justify-center shrink-0`}>
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Order Summary</h3>
            <p className="text-dark-500 text-xs">Review and confirm</p>
          </div>
        </div>

        <div className="bg-dark-800/40 rounded-xl divide-y divide-dark-700/40 text-sm mb-4 overflow-hidden">
          {[
            ["Recipient", phoneNumber || "—", phoneComplete ? "text-white" : "text-dark-600"],
            ["Network", selectedNetwork?.name || "—", nc.accent],
            ["Bundle", selectedPlan?.data, "text-white font-bold"],
            ["Validity", selectedPlan?.validity, "text-white"],
          ].map(([label, val, valClass]) => (
            <div key={label} className="flex justify-between px-4 py-2.5">
              <span className="text-dark-500">{label}</span>
              <span className={valClass}>{val}</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-4 py-3 bg-dark-800/40">
            <span className="text-white font-bold">Total</span>
            <span className={`text-xl font-black ${nc.price}`}>{formatCurrency(selectedPlan?.price)}</span>
          </div>
        </div>

        <form onSubmit={handlePurchase}>
          <button
            type="submit"
            disabled={loading || !phoneComplete || !phoneMatchesNetwork}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${nc.btn}`}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              : <><Wifi className="w-4 h-4" /> Pay {formatCurrency(selectedPlan?.price)} via MoMo</>
            }
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 mt-3">
          <ShieldCheck className="w-3 h-3 text-dark-600" />
          <p className="text-dark-600 text-[10px]">Secured by Paystack · Payment info never stored</p>
        </div>
      </div>
    </div>
  );
};

// ── Receipt Card ──────────────────────────────────────────────────────────────
const ReceiptCard = ({ receipt, onClose }) => {
  const downloadReceipt = () => {
    const lines = [
      "════════════════════════════════",
      "       PutDuckData RECEIPT       ",
      "════════════════════════════════",
      "",
      `Date:       ${receipt.date}`,
      `Reference:  ${receipt.reference}`,
      `Status:     ${receipt.status}`,
      "",
      "───────────────────────────────────",
      `Network:    ${receipt.network}`,
      `Plan:       ${receipt.plan}`,
      `Data:       ${receipt.data}`,
      `Validity:   ${receipt.validity}`,
      `Recipient:  ${receipt.phone}`,
      "",
      `Amount Paid: ${formatCurrency(receipt.amount)}`,
      "",
      "═══════════════════════════════════",
      "  Thank you for using PutDuckData!  ",
      "       https://putduckdata.com        ",
      "═══════════════════════════════════",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `putduckdata_Receipt_${receipt.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-white font-black text-xl">Purchase {receipt.status}</h2>
        <p className="text-white/70 text-sm mt-1">Your data bundle is on its way</p>
      </div>

      <div className="px-6 py-5">
        <div className="text-center mb-4 bg-dark-800/40 rounded-xl py-2.5 px-4">
          <p className="text-dark-500 text-[10px] uppercase tracking-wider mb-0.5">Reference</p>
          <p className="text-white font-mono text-sm font-bold tracking-wider">{receipt.reference}</p>
        </div>

        <div className="bg-dark-800/40 rounded-xl divide-y divide-dark-700/40 text-sm overflow-hidden">
          {[
            ["Date", receipt.date],
            ["Network", receipt.network],
            ["Data", receipt.data],
            ["Validity", receipt.validity],
            ["Recipient", receipt.phone],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between px-4 py-2.5">
              <span className="text-dark-500">{label}</span>
              <span className="text-white font-medium">{val}</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-4 py-3 bg-dark-800/40">
            <span className="text-white font-bold">Amount Paid</span>
            <span className="text-xl font-black text-primary-400">{formatCurrency(receipt.amount)}</span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-2.5">
        <Button fullWidth onClick={downloadReceipt} variant="outline" className="border-dark-700">
          <Download className="w-4 h-4 mr-2" /> Download Receipt
        </Button>
        <Button fullWidth onClick={onClose}>Buy More Data</Button>
        <Link to="/" className="block text-center text-dark-500 text-sm hover:text-primary-400 transition-colors mt-1">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default BuyPage;
