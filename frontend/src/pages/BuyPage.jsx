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
} from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import api from "../utils/api";
import { formatCurrency } from "../utils/formatters";
import { toast } from "react-hot-toast";

const NETWORKS = [
  {
    id: "MTN",
    name: "MTN",
    logo: "/images/MTN logo.png",
    prefixes: ["024", "025", "053", "054", "055", "059"],
  },
  {
    id: "TELECEL",
    name: "Telecel",
    logo: "/images/telecel.png",
    prefixes: ["020", "050"],
  },
  {
    id: "AIRTEL_TIGO",
    name: "AirtelTigo",
    logo: "/images/AirtelTigo.png",
    prefixes: ["026", "027", "056", "057"],
  },
];

const NETWORK_COLORS = {
  MTN: {
    tab: "bg-yellow-500/10 border-yellow-500/40 text-yellow-400",
    tabInactive:
      "border-dark-800 text-dark-400 hover:border-dark-700 hover:text-dark-200",
    step: "bg-yellow-500",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/40",
    accentText: "text-yellow-400",
    priceTxt: "text-yellow-500",
    badgeBg: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    checkColor: "text-yellow-500",
    buyBtn: "bg-yellow-500 hover:bg-yellow-400 text-dark-950",
    detectedBg: "bg-yellow-500/5 border-yellow-500/20",
    detectedCheck: "text-yellow-400",
    dot: "bg-yellow-400",
    ringBorder: "ring-yellow-500/20",
  },
  TELECEL: {
    tab: "bg-red-500/10 border-red-500/40 text-red-400",
    tabInactive:
      "border-dark-800 text-dark-400 hover:border-dark-700 hover:text-dark-200",
    step: "bg-red-500",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/40",
    accentText: "text-red-400",
    priceTxt: "text-red-500",
    badgeBg: "bg-red-500/15 text-red-400 border border-red-500/30",
    checkColor: "text-red-500",
    buyBtn: "bg-red-500 hover:bg-red-400 text-white",
    detectedBg: "bg-red-500/5 border-red-500/20",
    detectedCheck: "text-red-400",
    dot: "bg-red-400",
    ringBorder: "ring-red-500/20",
  },
  AIRTEL_TIGO: {
    tab: "bg-blue-500/10 border-blue-500/40 text-blue-400",
    tabInactive:
      "border-dark-800 text-dark-400 hover:border-dark-700 hover:text-dark-200",
    step: "bg-blue-500",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/40",
    accentText: "text-blue-400",
    priceTxt: "text-blue-500",
    badgeBg: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    checkColor: "text-blue-500",
    buyBtn: "bg-blue-500 hover:bg-blue-400 text-white",
    detectedBg: "bg-blue-500/5 border-blue-500/20",
    detectedCheck: "text-blue-400",
    dot: "bg-blue-400",
    ringBorder: "ring-blue-500/20",
  },
};

const detectNetwork = (phone) => {
  if (!phone || phone.length < 3) return null;
  const prefix = phone.substring(0, 3);
  return NETWORKS.find((n) => n.prefixes.includes(prefix)) || null;
};

const BuyPage = () => {
  // 'browse' → 'checkout'
  const [view, setView] = useState("browse");
  const [activeTab, setActiveTab] = useState("MTN");
  const [allPlans, setAllPlans] = useState({});
  const [fetchingPlans, setFetchingPlans] = useState(true);

  // checkout state
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [detectedNetwork, setDetectedNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const nc = selectedNetwork
    ? NETWORK_COLORS[selectedNetwork.id] || NETWORK_COLORS.MTN
    : NETWORK_COLORS.MTN;

  // Sync view with URL params
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
      } else {
        setView("browse");
      }
    } else {
      setView("browse");
      setSelectedPlan(null);
      setSelectedNetwork(null);
    }
  }, [searchParams, allPlans]);
  const tabNc = NETWORK_COLORS[activeTab] || NETWORK_COLORS.MTN;
  const activeNetwork = NETWORKS.find((n) => n.id === activeTab);
  const activePlans = allPlans[activeTab] || [];

  useEffect(() => {
    const CACHE_KEY = "pdd_guest_plans_cache";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // If a user token exists, the guest cache may contain reseller prices
    // from a previous session. Purge it so guests always see customer prices.
    if (localStorage.getItem("token")) {
      sessionStorage.removeItem(CACHE_KEY);
    }

    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setAllPlans(data);
          setFetchingPlans(false);
          return;
        }
      } catch {
        /* ignore corrupt cache */
      }
    }

    const fetchPlans = async () => {
      try {
        const response = await api.get("/data-plans");
        const d = response.data || response;
        const plansData = d.plans || {};
        const grouped = {};
        for (const [network, networkPlans] of Object.entries(plansData)) {
          if (!Array.isArray(networkPlans)) continue;
          grouped[network] = networkPlans.map((plan) => ({
            id: plan.id,
            name: plan.plan_name,
            price: parseFloat(plan.price),
            validity: `${plan.validity_days} day${
              plan.validity_days !== 1 ? "s" : ""
            }`,
            data: plan.data_volume,
            data_plan_id: plan.id,
          }));
        }
        setAllPlans(grouped);
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: grouped, ts: Date.now() })
        );
      } catch {
        toast.error("Failed to load data plans");
      } finally {
        setFetchingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan, network) => {
    setSearchParams({
      view: "checkout",
      planId: plan.id.toString(),
      network: network.id,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setPhoneNumber(value);
    setDetectedNetwork(detectNetwork(value));
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!phoneNumber || !/^0\d{9}$/.test(phoneNumber)) {
      toast.error(
        "Please enter a valid 10-digit Ghana phone number starting with 0"
      );
      return;
    }
    const phoneNetwork = detectNetwork(phoneNumber);
    if (!phoneNetwork) {
      toast.error("Unrecognized phone number prefix.");
      return;
    }
    if (phoneNetwork.id !== selectedNetwork.id) {
      toast.error(
        `This number belongs to ${phoneNetwork.name}, not ${selectedNetwork.name}.`
      );
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
          date: new Date().toLocaleString("en-GH", {
            dateStyle: "full",
            timeStyle: "short",
          }),
          status: d.status === "processing" ? "Processing" : "Successful",
        });
        toast.success("Purchase successful!");
        setSearchParams({}); // Clear on success
      }
    } catch (error) {
      toast.error(
        error.error || error.message || "Purchase failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewPurchase = () => {
    setReceipt(null);
    setSelectedPlan(null);
    setSelectedNetwork(null);
    setPhoneNumber("");
    setDetectedNetwork(null);
    setView("browse");
  };

  // ── Receipt screen ──────────────────────────────────────────────────────────
  if (receipt) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] p-4">
        <div className="w-full max-w-md">
          <ReceiptCard receipt={receipt} onClose={handleNewPurchase} />
        </div>
      </div>
    );
  }

  // ── Browse view ─────────────────────────────────────────────────────────────
  if (view === "browse") {
    return (
      <div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          {/* Page header */}
          <div className="mb-6 text-center sm:text-left">
            <h1
              className="text-4xl sm:text-3xl text-white mb-1"
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              Buy Data
            </h1>
            <p className="text-dark-400 text-sm mt-0.5">
              Choose a plan and pay securely
              <br />
              via Paystack — no account needed.
            </p>
          </div>

          {/* Network tabs */}
          <div className="flex justify-center sm:justify-start gap-2 mb-5">
            {NETWORKS.map((network) => {
              const c = NETWORK_COLORS[network.id];
              const isActive = activeTab === network.id;
              return (
                <button
                  key={network.id}
                  onClick={() => setActiveTab(network.id)}
                  className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                    isActive ? c.tab : c.tabInactive
                  }`}
                >
                  <img
                    src={network.logo}
                    alt={network.name}
                    className="h-5 object-contain mx-auto sm:mx-0"
                  />
                  <span className="hidden sm:inline">{network.name}</span>
                </button>
              );
            })}
          </div>

          {/* Plan list */}
          <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
            {/* Card header */}
            <div
              className={`flex items-center justify-between px-5 py-4 border-b border-dark-800/60 ${tabNc.accentBg}`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={activeNetwork?.logo}
                  alt={activeNetwork?.name}
                  className="h-8 object-contain"
                />
                <div>
                  <h2 className="text-white font-bold text-sm">
                    {activeNetwork?.name} Data Plans
                  </h2>
                  <p className="text-dark-500 text-xs">
                    Select a bundle to get started
                  </p>
                </div>
              </div>
              <div
                className={`w-2 h-2 rounded-full ${tabNc.dot} animate-pulse`}
              />
            </div>

            {fetchingPlans ? (
              <div className="flex items-center justify-center py-14">
                <Loader2
                  className={`w-6 h-6 ${tabNc.accentText} animate-spin`}
                />
                <span className="ml-2 text-dark-400 text-sm">
                  Loading plans…
                </span>
              </div>
            ) : activePlans.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-dark-400 text-sm">
                  No plans available for {activeNetwork?.name}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-dark-800/60">
                {activePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-dark-800/30 transition-colors"
                  >
                    {/* Data badge */}
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 px-1 ${tabNc.accentBg} border ${tabNc.accentBorder}`}
                    >
                      <span
                        className={`font-black leading-tight text-center break-all ${
                          plan.data.length > 4
                            ? "text-[10px]"
                            : plan.data.length > 2
                            ? "text-xs"
                            : "text-sm"
                        } ${tabNc.accentText}`}
                      >
                        {plan.data}
                      </span>
                    </div>

                    {/* Plan info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm leading-tight truncate">
                        {plan.name}
                      </p>
                      <p className="text-dark-500 text-xs mt-0.5">
                        {plan.validity}
                      </p>
                    </div>

                    {/* Price + buy */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className={`text-base font-black ${tabNc.priceTxt}`}>
                        {formatCurrency(plan.price)}
                      </p>
                      <button
                        onClick={() => handleSelectPlan(plan, activeNetwork)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tabNc.buyBtn} shadow-sm hover:scale-[1.03] active:scale-[0.98]`}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trust strip */}
          <div className="flex items-center justify-center gap-6 mt-6 py-3">
            {[
              {
                icon: <ShieldCheck className="w-3.5 h-3.5" />,
                label: "Secured by Paystack",
              },
              {
                icon: <CheckCircle className="w-3.5 h-3.5" />,
                label: "Fast Delivery",
              },
              { icon: <Wifi className="w-3.5 h-3.5" />, label: "All Networks" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-dark-500 text-[11px]"
              >
                <span className="text-primary-600">{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Checkout view ───────────────────────────────────────────────────────────
  const phoneMatchesNetwork = detectedNetwork?.id === selectedNetwork?.id;
  const phoneComplete = /^0\d{9}$/.test(phoneNumber);

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Back + heading */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1.5 text-dark-400 hover:text-white transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Plans
          </button>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Checkout
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Enter the recipient number and confirm your order.
          </p>
        </div>

        {/* Selected plan card (read-only) */}
        <div
          className={`bg-dark-900/80 border rounded-2xl p-5 ring-1 ${nc.ringBorder} ${nc.accentBorder}`}
        >
          <p className="text-dark-500 text-[11px] uppercase tracking-wider font-semibold mb-3">
            Selected Plan
          </p>
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 px-1 ${nc.accentBg} border ${nc.accentBorder}`}
            >
              <span
                className={`font-black leading-tight text-center break-all ${
                  selectedPlan.data.length > 4
                    ? "text-xs"
                    : selectedPlan.data.length > 2
                    ? "text-sm"
                    : "text-lg"
                } ${nc.accentText}`}
              >
                {selectedPlan.data}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <img
                  src={selectedNetwork?.logo}
                  alt={selectedNetwork?.name}
                  className="h-5 object-contain"
                />
                <span className={`text-xs font-bold ${nc.accentText}`}>
                  {selectedNetwork?.name}
                </span>
              </div>
              <p className="text-white font-bold text-sm">
                {selectedPlan.name}
              </p>
              <p className="text-dark-500 text-xs">{selectedPlan.validity}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-2xl font-black ${nc.priceTxt}`}>
                {formatCurrency(selectedPlan.price)}
              </p>
              <button
                onClick={() => setSearchParams({})}
                className="text-dark-500 hover:text-dark-300 text-[11px] transition-colors mt-0.5"
              >
                Change plan
              </button>
            </div>
          </div>
        </div>

        {/* Phone number */}
        <div
          className={`bg-dark-900/80 border rounded-2xl p-5 transition-colors ${
            detectedNetwork ? `${nc.accentBorder}` : "border-dark-800"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-7 h-7 ${nc.step} rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0`}
            >
              1
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                Recipient Phone Number
              </h3>
              <p className="text-dark-500 text-xs">
                The {selectedNetwork?.name} number to receive the data
              </p>
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

          {/* Network feedback */}
          {detectedNetwork && (
            <div
              className={`flex items-center gap-3 mt-3 ${nc.detectedBg} border rounded-xl px-3 py-2.5`}
            >
              <img
                src={detectedNetwork.logo}
                alt={detectedNetwork.name}
                className="h-7 object-contain"
              />
              <div className="flex-1">
                <p className={`font-semibold text-sm ${nc.accentText}`}>
                  {detectedNetwork.name} Detected
                </p>
                {!phoneMatchesNetwork && (
                  <p className="text-red-400 text-[11px]">
                    This number is {detectedNetwork.name} — your plan is for{" "}
                    {selectedNetwork?.name}
                  </p>
                )}
                {phoneMatchesNetwork && (
                  <p className="text-dark-500 text-[11px]">
                    Auto-detected from phone prefix
                  </p>
                )}
              </div>
              {phoneMatchesNetwork ? (
                <CheckCircle
                  className={`w-4 h-4 ${nc.detectedCheck} shrink-0`}
                />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
            </div>
          )}
          {!detectedNetwork && phoneNumber.length >= 3 && (
            <div className="flex items-center gap-2.5 mt-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <p className="text-yellow-300 text-xs">
                Unrecognized prefix. Please check the number.
              </p>
            </div>
          )}
          {phoneNumber.length > 0 && phoneNumber.length < 3 && (
            <p className="text-dark-500 text-[11px] mt-2">
              Type at least 3 digits to auto-detect network
            </p>
          )}
        </div>

        {/* Order summary + pay */}
        <div
          className={`bg-dark-900/80 border rounded-2xl p-5 ${nc.accentBorder}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-7 h-7 ${nc.step} rounded-lg flex items-center justify-center shrink-0`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                Order Summary
              </h3>
              <p className="text-dark-500 text-xs">
                Review and complete your purchase
              </p>
            </div>
          </div>

          <div className="bg-dark-800/40 rounded-xl p-4 space-y-2.5 text-sm mb-4">
            {[
              [
                "Recipient",
                phoneNumber || "—",
                phoneComplete ? "text-white" : "text-dark-600",
              ],
              ["Network", selectedNetwork?.name || "—", nc.accentText],
              ["Plan", selectedPlan.name, "text-white"],
              ["Data", selectedPlan.data, "text-white"],
              ["Validity", selectedPlan.validity, "text-white"],
            ].map(([label, val, valClass]) => (
              <div key={label} className="flex justify-between">
                <span className="text-dark-500">{label}</span>
                <span className={`font-medium ${valClass}`}>{val}</span>
              </div>
            ))}
            <div className="pt-2.5 border-t border-dark-700/50 flex justify-between items-center">
              <span className="text-white font-bold">Total</span>
              <span className={`text-xl font-bold ${nc.priceTxt}`}>
                {formatCurrency(selectedPlan.price)}
              </span>
            </div>
          </div>

          <form onSubmit={handlePurchase}>
            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="lg"
              disabled={!phoneComplete || !phoneMatchesNetwork}
            >
              <Wifi className="w-4 h-4 mr-2" />
              Pay {formatCurrency(selectedPlan.price)} with Paystack
            </Button>
            <p className="text-dark-600 text-[10px] text-center mt-3">
              Secured by Paystack. Your payment info is never stored.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── Receipt Card ──────────────────────────────────────────────────────────────
const ReceiptCard = ({ receipt, onClose }) => {
  const receiptRef = useRef(null);

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
      "",
      `Network:    ${receipt.network}`,
      `Plan:       ${receipt.plan}`,
      `Data:       ${receipt.data}`,
      `Validity:   ${receipt.validity}`,
      `Recipient:  ${receipt.phone}`,
      "",
      "───────────────────────────────────",
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
    <div
      ref={receiptRef}
      className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden"
    >
      <div className="bg-primary-600 px-6 py-5 text-center">
        <CheckCircle className="w-10 h-10 text-white mx-auto mb-2" />
        <h2 className="text-white font-bold text-xl">
          Purchase {receipt.status}
        </h2>
        <p className="text-white/70 text-sm mt-1">Your data is on its way</p>
      </div>

      <div className="px-6 py-5">
        <div className="text-center mb-4">
          <p className="text-dark-500 text-xs uppercase tracking-wider">
            Reference
          </p>
          <p className="text-white font-mono text-sm font-bold tracking-wider">
            {receipt.reference}
          </p>
        </div>

        <div className="bg-dark-800/50 rounded-xl p-4 space-y-2.5 text-sm">
          {[
            ["Date", receipt.date],
            ["Network", receipt.network],
            ["Plan", receipt.plan],
            ["Data", receipt.data],
            ["Validity", receipt.validity],
            ["Recipient", receipt.phone],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-dark-500">{label}</span>
              <span className="text-white font-medium">{val}</span>
            </div>
          ))}
          <div className="pt-2.5 border-t border-dark-700/50 flex justify-between">
            <span className="text-white font-bold">Amount Paid</span>
            <span className="text-xl font-bold text-primary-500">
              {formatCurrency(receipt.amount)}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-3">
        <Button
          fullWidth
          onClick={downloadReceipt}
          variant="outline"
          className="border-dark-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Receipt
        </Button>
        <Button fullWidth onClick={onClose}>
          Buy More Data
        </Button>
        <Link to="/" className="block text-center">
          <span className="text-dark-500 text-sm hover:text-primary-500 transition-colors">
            Back to Home
          </span>
        </Link>
      </div>
    </div>
  );
};

export default BuyPage;
