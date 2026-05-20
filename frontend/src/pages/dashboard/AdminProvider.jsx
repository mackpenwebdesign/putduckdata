import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle,
  ShieldCheck,
  ClipboardList,
  Loader2,
  Wallet,
} from "lucide-react";
import Button from "../../components/Button";
import api from "../../utils/api";
import { toast } from "react-hot-toast";

const AdminProvider = () => {
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [isManual, setIsManual] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balance, setBalance] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get("/admin-site-settings");
      const payload = res?.data ?? res;
      const rawProvider = payload?.settings?.data_provider;
      const provider = typeof rawProvider === "string"
        ? rawProvider.replace(/^"|"$/g, "")
        : rawProvider;
      setIsManual(provider === "manual");
    } catch {
      // keep current state
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggleManual = async () => {
    setToggling(true);
    const newProvider = isManual ? "1papi" : "manual";
    try {
      await api.put("/admin-site-settings", {
        settings: [{ key: "data_provider", value: newProvider }],
      });
      setIsManual(!isManual);
      toast.success(
        newProvider === "manual"
          ? "Manual mode enabled — orders will queue for manual fulfilment"
          : "Switched back to 1Papi — automatic delivery resumed"
      );
    } catch {
      toast.error("Failed to update provider setting");
    } finally {
      setToggling(false);
    }
  };

  const handleCheckBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await api.get("/admin-provider?action=balance");
      const result = res?.data ?? res;
      setBalance(result.balance ?? result);
      toast.success("Balance fetched");
    } catch (error) {
      toast.error(`Balance check failed: ${error.message || "Try again"}`);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const handleSyncPrices = useCallback(async () => {
    setSyncLoading(true);
    try {
      const res = await api.get("/admin-provider?action=sync");
      const result = res?.data ?? res;
      const updated = result.updated ?? 0;
      const matched = result.matched ?? 0;
      toast.success(
        `Sync complete — ${updated} price${updated !== 1 ? "s" : ""} updated, ${matched} plan${matched !== 1 ? "s" : ""} matched`
      );
      setLastSynced(new Date());
    } catch (error) {
      toast.error(`Sync failed: ${error.message || "Try again"}`);
    } finally {
      setSyncLoading(false);
    }
  }, []);

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Provider Settings
        </h1>
        <p className="text-dark-400 text-sm mt-0.5">
          Control how data orders are fulfilled
        </p>
      </div>

      {/* Active status banner */}
      <div className="flex items-center gap-3 bg-dark-900/80 border border-dark-800 rounded-xl px-4 py-3">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isManual ? "bg-yellow-400" : "bg-green-400"}`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isManual ? "bg-yellow-500" : "bg-green-500"}`} />
        </span>
        <div className="flex-1">
          <p className="text-dark-500 text-[11px] uppercase tracking-wide">Active Mode</p>
          <p className="text-white font-semibold text-sm">
            {isManual ? "Manual Fulfilment" : "1Papi — Automatic"}
          </p>
        </div>
      </div>

      {/* 1Papi card */}
      <div className={`rounded-2xl border p-5 transition-all ${!isManual ? "bg-primary-600/10 border-primary-600/40 ring-1 ring-primary-600/20" : "bg-dark-900/80 border-dark-800"}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${!isManual ? "bg-primary-600/15 border border-primary-600/20" : "bg-dark-800"}`}>
              <ShieldCheck className={`w-6 h-6 ${!isManual ? "text-primary-400" : "text-dark-500"}`} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">1Papi</h3>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mt-0.5 bg-green-500/10 text-green-400 border border-green-500/20">
                Automatic
              </span>
            </div>
          </div>
          {!isManual && (
            <div className="flex items-center gap-1.5 text-[11px] text-green-400 font-medium">
              <CheckCircle className="w-4 h-4" />
              Active
            </div>
          )}
        </div>

        {/* Balance + Sync buttons */}
        <div className="border-t border-dark-700/50 pt-4 space-y-2">
          <Button
            onClick={handleCheckBalance}
            loading={balanceLoading}
            variant="secondary"
            className="w-full justify-center"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {balanceLoading ? "Checking…" : "Check Balance"}
          </Button>
          {balance !== null && (
            <p className="text-xs text-center text-green-400 font-medium">
              {typeof balance === "object" ? JSON.stringify(balance) : String(balance)}
            </p>
          )}
          <Button
            onClick={handleSyncPrices}
            loading={syncLoading}
            className="w-full justify-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? "animate-spin" : ""}`} />
            {syncLoading ? "Syncing prices…" : "Sync Prices from 1Papi"}
          </Button>
          <p className="text-xs text-dark-500 mt-1 text-center">
            {lastSynced
              ? `Last synced: ${lastSynced.toLocaleTimeString()}`
              : "Pulls live cost prices from 1Papi and updates your plan rates"}
          </p>
        </div>
      </div>

      {/* Manual mode card */}
      <div className={`rounded-2xl border p-5 transition-all ${isManual ? "bg-yellow-500/5 border-yellow-500/30 ring-1 ring-yellow-500/20" : "bg-dark-900/80 border-dark-800"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isManual ? "bg-yellow-500/15 border border-yellow-500/20" : "bg-dark-800"}`}>
              <ClipboardList className={`w-6 h-6 ${isManual ? "text-yellow-400" : "text-dark-500"}`} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Manual Mode</h3>
              <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mt-0.5 border ${isManual ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-dark-700/50 text-dark-500 border-dark-700"}`}>
                {isManual ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={handleToggleManual}
            disabled={toggling}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-200 focus:outline-none ${isManual ? "bg-yellow-500" : "bg-dark-700"} ${toggling ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isManual ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>

        {isManual && (
          <div className="mt-4 flex items-start gap-2.5 bg-yellow-500/8 border border-yellow-500/15 rounded-xl px-3 py-2.5">
            <ShieldCheck className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-200/70 text-xs leading-relaxed">
              All new orders will be queued as <span className="font-semibold text-yellow-300">pending</span> — no API calls are made. Go to <span className="font-semibold text-yellow-300">Admin → Orders</span> to fulfil them manually.
            </p>
          </div>
        )}

        {!isManual && (
          <p className="text-dark-600 text-xs mt-3">
            Enable to pause automatic delivery and queue orders for manual fulfilment.
          </p>
        )}
      </div>

    </div>
  );
};

export default AdminProvider;
