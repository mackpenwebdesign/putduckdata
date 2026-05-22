import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Smartphone,
  Wifi,
  CheckCircle,
  Loader2,
  Wallet,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import useAuthStore from "../../stores/authStore";
import useSiteSettingsStore from "../../stores/siteSettingsStore";
import api from "../../utils/api";
import { formatCurrency, cleanPlanName } from "../../utils/formatters";
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

const NC = {
  MTN: {
    tab: "bg-yellow-500/10 border-yellow-500/40 text-yellow-400",
    tabOff:
      "border-dark-800 text-dark-400 hover:border-dark-700 hover:text-dark-200",
    step: "bg-yellow-500",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/40",
    accentText: "text-yellow-400",
    priceTxt: "text-yellow-500",
    buyBtn: "bg-yellow-500 hover:bg-yellow-400 text-dark-950",
    detBg: "bg-yellow-500/5 border-yellow-500/20",
    detCheck: "text-yellow-400",
    dot: "bg-yellow-400",
    ring: "ring-yellow-500/20",
  },
  TELECEL: {
    tab: "bg-red-500/10 border-red-500/40 text-red-400",
    tabOff:
      "border-dark-800 text-dark-400 hover:border-dark-700 hover:text-dark-200",
    step: "bg-red-500",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/40",
    accentText: "text-red-400",
    priceTxt: "text-red-500",
    buyBtn: "bg-red-500 hover:bg-red-400 text-white",
    detBg: "bg-red-500/5 border-red-500/20",
    detCheck: "text-red-400",
    dot: "bg-red-400",
    ring: "ring-red-500/20",
  },
  AIRTEL_TIGO: {
    tab: "bg-blue-500/10 border-blue-500/40 text-blue-400",
    tabOff:
      "border-dark-800 text-dark-400 hover:border-dark-700 hover:text-dark-200",
    step: "bg-blue-500",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/40",
    accentText: "text-blue-400",
    priceTxt: "text-blue-500",
    buyBtn: "bg-blue-500 hover:bg-blue-400 text-white",
    detBg: "bg-blue-500/5 border-blue-500/20",
    detCheck: "text-blue-400",
    dot: "bg-blue-400",
    ring: "ring-blue-500/20",
  },
};

const detectNetwork = (phone) => {
  if (!phone || phone.length < 3) return null;
  const prefix = phone.substring(0, 3);
  return NETWORKS.find((n) => n.prefixes.includes(prefix)) || null;
};

const BuyData = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, refreshUser, setUser } = useAuthStore();
  const { validityLabel } = useSiteSettingsStore();

  const [view, setView] = useState("browse");
  const [activeTab, setActiveTab] = useState("MTN");
  const [allPlans, setAllPlans] = useState({});
  const [fetchingPlans, setFetchingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [detectedNetwork, setDetectedNetwork] = useState(null);
  const [loading, setLoading] = useState(false);

  const nc = selectedNetwork ? NC[selectedNetwork.id] || NC.MTN : NC.MTN;
  const tabNc = NC[activeTab] || NC.MTN;
  const activeNetwork = NETWORKS.find((n) => n.id === activeTab);
  const activePlans = allPlans[activeTab] || [];
  const balance = user?.wallet_balance || 0;
  const isReseller = user?.is_reseller || false;

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
        // Invalid checkout, go back
        setView("browse");
      }
    } else {
      setView("browse");
      setSelectedPlan(null);
      setSelectedNetwork(null);
    }
  }, [searchParams, allPlans]);

  useEffect(() => {
    // Role-aware cache key so resellers don't see cached customer prices after login
    const cacheRole = isReseller ? "reseller" : "customer";
    const CACHE_KEY = `pdd_plans_cache_${cacheRole}`;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
            name: cleanPlanName(plan.plan_name),
            price: parseFloat(plan.price),
            validity: validityLabel,
            data: plan.data_volume,
            data_plan_id: plan.id,
          }));
        }
        setAllPlans(grouped);
        // Also clear the other role's cache to prevent stale data on role switch
        const otherRole = isReseller ? "customer" : "reseller";
        sessionStorage.removeItem(`pdd_plans_cache_${otherRole}`);
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
  }, [isReseller]);

  const handleSelectPlan = (plan, network) => {
    setSearchParams({
      view: "checkout",
      planId: plan.id.toString(),
      network: network.id,
    });
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
    if (balance < selectedPlan.price) {
      toast.error(
        `Insufficient balance! You need ${formatCurrency(
          selectedPlan.price - balance
        )} more.`,
        { duration: 5000 }
      );
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/data-purchase", {
        network: selectedNetwork.id,
        data_plan_id: selectedPlan.data_plan_id,
        phone_number: phoneNumber,
        amount: selectedPlan.price,
      });
      const d = res.data || res;
      if (d.new_balance !== undefined)
        setUser({ ...user, wallet_balance: d.new_balance });
      toast.success(
        d.status === "processing"
          ? `Your purchase is being processed. Check transactions for updates.`
          : `${selectedPlan.name} sent to ${phoneNumber}!`,
        { duration: 5000 }
      );
      setSearchParams({});
      setPhoneNumber(""); // Clear phone for next time
    } catch (error) {
      toast.error(
        error.error || error.message || "Purchase failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const phoneMatchesNetwork = detectedNetwork?.id === selectedNetwork?.id;
  const phoneComplete = /^0\d{9}$/.test(phoneNumber);
  const hasEnoughBalance = balance >= (selectedPlan?.price || 0);

  // ── Browse ──────────────────────────────────────────────────────────────────
  if (view === "browse") {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h1
            className="text-4xl sm:text-3xl text-white"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            Buy Data
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Purchase data bundles for any network in Ghana
          </p>
        </div>

        {balance < 1 ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/15 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">No balance</p>
                <p className="text-red-300/70 text-xs">
                  Top up to start buying data
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate("/dashboard/wallet")}>
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Top Up
            </Button>
          </div>
        ) : (
          <div className="bg-dark-900/80 border border-dark-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600/10 rounded-lg flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <p className="text-dark-500 text-[10px] uppercase tracking-wide">
                  Balance
                </p>
                <p className="text-white font-bold">
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/wallet")}
              className="border-dark-700 shrink-0"
            >
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Top Up
            </Button>
          </div>
        )}

        {/* Network tabs */}
        <div className="flex justify-center sm:justify-start gap-2">
          {NETWORKS.map((network) => {
            const c = NC[network.id];
            const isActive = activeTab === network.id;
            return (
              <button
                key={network.id}
                onClick={() => setActiveTab(network.id)}
                className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                  isActive ? c.tab : c.tabOff
                }`}
              >
                <img
                  src={network.logo}
                  alt={network.name}
                  className="h-5 object-contain"
                />
                <span className="hidden sm:inline">{network.name}</span>
              </button>
            );
          })}
        </div>

        {/* Plan list */}
        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
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
              <Loader2 className={`w-6 h-6 ${tabNc.accentText} animate-spin`} />
              <span className="ml-2 text-dark-400 text-sm">Loading plans…</span>
            </div>
          ) : activePlans.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-dark-400 text-sm">
                No plans available for {activeNetwork?.name}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-dark-800/60">
              {activePlans.map((plan) => {
                const affordable = balance >= plan.price;
                return (
                  <div
                    key={plan.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-dark-800/30 transition-colors"
                  >
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
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm leading-tight truncate">
                        {plan.name}
                      </p>
                      <p className="text-dark-500 text-xs mt-0.5">
                        {plan.validity}
                      </p>
                      {!affordable && balance > 0 && (
                        <p className="text-red-400 text-[10px] mt-0.5">
                          Need {formatCurrency(plan.price - balance)} more
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`text-base font-black ${tabNc.priceTxt}`}>
                          {formatCurrency(plan.price)}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          affordable
                            ? handleSelectPlan(plan, activeNetwork)
                            : navigate("/dashboard/wallet")
                        }
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                          affordable
                            ? `${tabNc.buyBtn} hover:scale-[1.03] active:scale-[0.98]`
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 hover:text-amber-300"
                        }`}
                      >
                        {affordable ? "Buy Now" : "Top Up"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Checkout ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate({ relative: "path", replace: true })}
        className="flex items-center gap-1.5 text-dark-400 hover:text-white transition-colors text-sm"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Plans
      </button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Checkout</h1>
        <p className="text-dark-400 text-sm mt-0.5">
          Enter the recipient number and confirm your order.
        </p>
      </div>

      {/* Balance */}
      <div
        className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
          hasEnoughBalance
            ? "bg-dark-900/80 border-dark-800"
            : "bg-red-500/10 border-red-500/20"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              hasEnoughBalance ? "bg-primary-600/10" : "bg-red-500/15"
            }`}
          >
            <Wallet
              className={`w-4 h-4 ${
                hasEnoughBalance ? "text-primary-500" : "text-red-400"
              }`}
            />
          </div>
          <div>
            <p className="text-dark-500 text-[10px] uppercase tracking-wide">
              Wallet Balance
            </p>
            <p
              className={`font-bold ${
                hasEnoughBalance ? "text-white" : "text-red-400"
              }`}
            >
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
        {!hasEnoughBalance && (
          <Button size="sm" onClick={() => navigate("/dashboard/wallet")}>
            Top Up
          </Button>
        )}
      </div>

      {/* Selected plan (read-only) */}
      <div
        className={`bg-dark-900/80 border rounded-2xl p-5 ring-1 ${nc.ring} ${nc.accentBorder}`}
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
            <p className="text-white font-bold text-sm">{selectedPlan.name}</p>
            <p className="text-dark-500 text-xs">{selectedPlan.validity}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-2xl font-black ${nc.priceTxt}`}>
              {formatCurrency(selectedPlan.price)}
            </p>
            <button
              onClick={() => navigate({ relative: "path", replace: true })}
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
          detectedNetwork ? nc.accentBorder : "border-dark-800"
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
        {detectedNetwork && (
          <div
            className={`flex items-center gap-3 mt-3 ${nc.detBg} border rounded-xl px-3 py-2.5`}
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
              {!phoneMatchesNetwork ? (
                <p className="text-red-400 text-[11px]">
                  This number is {detectedNetwork.name} — plan is for{" "}
                  {selectedNetwork?.name}
                </p>
              ) : (
                <p className="text-dark-500 text-[11px]">
                  Auto-detected from phone prefix
                </p>
              )}
            </div>
            {phoneMatchesNetwork ? (
              <CheckCircle className={`w-4 h-4 ${nc.detCheck} shrink-0`} />
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

      {/* Order summary + confirm */}
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
            <h3 className="text-white font-semibold text-sm">Order Summary</h3>
            <p className="text-dark-500 text-xs">
              Review and confirm your purchase
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
            disabled={
              !phoneComplete || !phoneMatchesNetwork || !hasEnoughBalance
            }
          >
            <Wifi className="w-4 h-4 mr-2" />
            Purchase for {formatCurrency(selectedPlan.price)}
          </Button>
          {!hasEnoughBalance && (
            <p className="text-red-400 text-xs text-center mt-2">
              Insufficient balance — need{" "}
              {formatCurrency(selectedPlan.price - balance)} more
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default BuyData;
