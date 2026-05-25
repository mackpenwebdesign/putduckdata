import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Banknote,
  ShoppingBag,
  Settings,
  BarChart3,
  Bell,
  X,
  Search,
  Power,
  Wallet,
  CheckCircle,
  Package,
  KeyRound,
  ClipboardList,
  MinusCircle,
  PlusCircle,
  Copy,
  Link2,
  Share2,
} from "lucide-react";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/Card";
import StatCard from "../../components/StatCard";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import useAuthStore from "../../stores/authStore";
import api from "../../utils/api";
import { formatCurrency, formatCompactNumber } from "../../utils/formatters";
import { toast } from "react-hot-toast";

// ─── Skeleton primitives ───────────────────────────────────────────────────────
const Shimmer = ({ className = "" }) => (
  <div
    className={`relative overflow-hidden bg-dark-800/50 rounded-xl ${className}`}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
  </div>
);

const AdminDashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <Shimmer className="h-9 w-56" />
        <Shimmer className="h-4 w-72" />
      </div>
      <Shimmer className="h-10 w-32 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-dark-900 border border-dark-800 rounded-2xl p-6 flex items-center gap-4"
        >
          <Shimmer className="w-14 h-14 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3.5 w-24" />
            <Shimmer className="h-8 w-32" />
            <Shimmer className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
    <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-4">
      <div className="space-y-1.5">
        <Shimmer className="h-5 w-44" />
        <Shimmer className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-primary-600/5 rounded-xl p-6 space-y-3">
            <div className="flex justify-between">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="w-5 h-5 rounded-md" />
            </div>
            <Shimmer className="h-9 w-28" />
            <Shimmer className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Shimmer className="w-6 h-6 rounded-lg" />
            <div className="space-y-1.5">
              <Shimmer className="h-4 w-32" />
              <Shimmer className="h-3 w-44" />
            </div>
          </div>
          <div className="space-y-3 pt-1">
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                className="flex items-center justify-between p-4 bg-primary-600/5 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Shimmer className="w-3 h-3 rounded-full" />
                  <Shimmer className="h-4 w-28" />
                </div>
                <Shimmer className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Shimmer className="w-6 h-6 rounded-lg" />
        <div className="space-y-1.5">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="h-3 w-56" />
        </div>
      </div>
      <Shimmer className="h-14 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Shimmer className="h-11 w-full rounded-lg" />
        <Shimmer className="h-11 w-full rounded-lg" />
        <Shimmer className="h-11 w-full rounded-lg md:col-span-2" />
      </div>
      <div className="flex gap-3">
        <Shimmer className="h-9 w-32 rounded-lg" />
        <Shimmer className="h-9 w-32 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-3.5 w-52" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="flex items-center justify-between p-3 bg-primary-600/5 rounded-xl"
              >
                <div className="space-y-1.5">
                  <Shimmer className="h-4 w-32" />
                  <Shimmer className="h-3 w-44" />
                </div>
                <Shimmer className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-4">
      <div className="space-y-1.5">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="h-3.5 w-52" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="p-5 bg-primary-600/5 rounded-xl border border-dark-700 space-y-2"
          >
            <Shimmer className="w-7 h-7 rounded-lg" />
            <Shimmer className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Share Link                                                         */
/* ------------------------------------------------------------------ */
const ShareBuyLink = () => {
  const guestUrl = `${window.location.origin}/buy`;
  const loginUrl = `${window.location.origin}/login`;
  const trackUrl = `${window.location.origin}/track-order`;
  const [copied, setCopied] = useState(null);
  const [open, setOpen] = useState(false);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const whatsappShare = () => {
    const msg = encodeURIComponent(
      `👋 Buy affordable data bundles on PutDuckData!\n\n⚡ Buy fast (no login): ${guestUrl}\n🔑 Login / Sign up: ${loginUrl}\n📦 Track Order: ${trackUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const links = [
    {
      key: "guest",
      label: "Guest Buy Link",
      desc: "No login required — pay directly via Paystack",
      url: guestUrl,
      highlight: true,
    },
    {
      key: "login",
      label: "Login / Sign Up",
      desc: "Customers with accounts buy from their dashboard",
      url: loginUrl,
    },
    {
      key: "track",
      label: "Order Tracking",
      desc: "Track an order by reference number",
      url: trackUrl,
    },
  ];

  return (
    <Card variant="default" padding="lg">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left"
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link2 className="w-6 h-6 text-primary-500" />
              <div>
                <CardTitle>Share Link</CardTitle>
                <CardDescription>
                  Send customers directly to buy or track their orders
                </CardDescription>
              </div>
            </div>
            <span className="text-dark-400 text-xs font-medium">
              {open ? "▲ Hide" : "▼ Show"}
            </span>
          </div>
        </CardHeader>
      </button>
      {open && (
      <CardContent>
        <div className="space-y-3">
          {links.map(({ key, label, desc, url, highlight }) => (
            <div key={key}>
              <p
                className={`text-xs font-medium mb-1.5 uppercase tracking-wide ${
                  highlight ? "text-primary-400" : "text-dark-400"
                }`}
              >
                {label}
              </p>
              <div className="flex items-center gap-2">
                <div
                  className={`flex-1 border rounded-xl px-3 py-2 text-xs font-mono truncate select-all ${
                    highlight
                      ? "bg-primary-600/8 border-primary-600/25 text-primary-400"
                      : "bg-dark-800/60 border-dark-700 text-dark-400"
                  }`}
                >
                  {url}
                </div>
                <button
                  onClick={() => copy(url, key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    copied === key
                      ? "bg-green-500/15 border-green-500/30 text-green-400"
                      : "bg-dark-800/60 border-dark-700 text-dark-300 hover:text-white hover:border-dark-500"
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied === key ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-dark-600 text-[11px] mt-1">{desc}</p>
            </div>
          ))}
          <button
            onClick={whatsappShare}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 hover:border-green-500/50 text-green-400 hover:text-green-300 rounded-xl text-sm font-semibold transition-all mt-1"
          >
            <Share2 className="w-4 h-4" />
            Share via WhatsApp
          </button>
        </div>
      </CardContent>
      )}
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Broadcast Modal                                                    */
/* ------------------------------------------------------------------ */
const BroadcastModal = ({ open, onClose }) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [targets, setTargets] = useState("all");
  const [sending, setSending] = useState(false);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setUrl("");
    setTargets("all");
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      const res = await api.post("/admin-broadcast", {
        title,
        message,
        url: url.trim() || null,
        targets,
      });
      const bd = res.data || res;
      toast.success(
        `Broadcast #${bd.id || "NEW"} sent for ${bd.targets || targets}`
      );
      resetForm();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm p-6 flex items-center justify-center">
      <div className="bg-dark-900 rounded-2xl border border-dark-800 max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-dark-900 p-6 border-b border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Broadcast</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-800 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
          />
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">
              Message
            </label>
            <textarea
              rows="5"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-32 p-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 resize-vertical"
              placeholder="Write message (HTML <a> tags supported)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">
              Targets
            </label>
            <select
              value={targets}
              onChange={(e) => setTargets(e.target.value)}
              className="w-full p-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users & Guests</option>
              <option value="users">Users Only</option>
              <option value="guests">Guests Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">
              URL (optional button)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500"
              placeholder="https://your-link.com"
            />
          </div>
        </div>
        <div className="p-6 border-t border-dark-800 bg-dark-900/50 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            variant="primary"
            onClick={handleSend}
            loading={sending}
            disabled={!title || !message}
          >
            Send Broadcast
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Fund Wallet Modal                                                  */
/* ------------------------------------------------------------------ */
const FundWalletModal = ({ open, onClose, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [operation, setOperation] = useState("credit");
  const [searching, setSearching] = useState(false);
  const [funding, setFunding] = useState(false);
  const { user: currentUser, refreshUser } = useAuthStore();

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setAmount("");
    setReason("");
    setOperation("credit");
  };

  useEffect(() => {
    if (!open) return;
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(
          `/admin-users-manage?search=${encodeURIComponent(searchQuery.trim())}`
        );
        const sd = res.data || res;
        setSearchResults(sd.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, open]);

  const handleFund = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setFunding(true);
    try {
      await api.post("/admin-fund-wallet", {
        user_id: selectedUser.id,
        amount: parsedAmount,
        reason: reason.trim(),
        operation,
      });
      toast.success(
        `${formatCurrency(parsedAmount)} ${
          operation === "deduct" ? "deducted from" : "funded to"
        } ${selectedUser.full_name}`
      );
      if (currentUser && selectedUser.id === currentUser.id) {
        await refreshUser();
      }
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.message || "Failed to fund wallet");
    } finally {
      setFunding(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-white">Fund User Wallet</h2>
          </div>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="w-full">
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Search User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="text"
                className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedUser(null);
                }}
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {searchResults.length > 0 && !selectedUser && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-dark-700 rounded-lg bg-dark-950">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-dark-800 transition-colors flex items-center justify-between"
                    onClick={() => {
                      setSelectedUser(u);
                      setSearchQuery(u.full_name);
                      setSearchResults([]);
                    }}
                  >
                    <div>
                      <p className="text-white text-sm font-medium">
                        {u.full_name}
                      </p>
                      <p className="text-dark-400 text-xs">{u.email}</p>
                    </div>
                    <Badge variant="default" size="sm">
                      Customer
                    </Badge>
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <div className="mt-2 flex items-center justify-between p-3 bg-primary-600/10 border border-primary-600/20 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">
                    {selectedUser.full_name}
                  </p>
                  <p className="text-dark-400 text-xs">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setSearchQuery("");
                  }}
                  className="text-dark-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Operation
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOperation("credit")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  operation === "credit"
                    ? "bg-green-600/10 border-green-600/30 text-green-400"
                    : "bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600"
                }`}
              >
                <PlusCircle className="w-4 h-4" /> Credit (Add)
              </button>
              <button
                type="button"
                onClick={() => setOperation("deduct")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  operation === "deduct"
                    ? "bg-red-600/10 border-red-600/30 text-red-400"
                    : "bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600"
                }`}
              >
                <MinusCircle className="w-4 h-4" /> Deduct
              </button>
            </div>
          </div>

          <Input
            label={`Amount (GH₵) - ${
              operation === "deduct" ? "Deduct" : "Credit"
            }`}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            icon={Banknote}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          {selectedUser && operation === "deduct" && (
            <p className="text-xs text-dark-500">
              Current balance:{" "}
              <span className="text-white font-medium">
                {formatCurrency(selectedUser.wallet_balance || 0)}
              </span>
            </p>
          )}

          <div className="w-full">
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Reason
            </label>
            <textarea
              rows={3}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all resize-none"
              placeholder={`Reason for ${
                operation === "deduct" ? "deduction" : "funding"
              } (optional)...`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-800">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={funding}
          >
            Cancel
          </Button>
          <Button
            variant={operation === "deduct" ? "danger" : "primary"}
            size="sm"
            onClick={handleFund}
            loading={funding}
          >
            <span className="flex items-center gap-2">
              {operation === "deduct" ? (
                <MinusCircle className="w-4 h-4" />
              ) : (
                <Wallet className="w-4 h-4" />
              )}
              {operation === "deduct" ? "Deduct from Wallet" : "Fund Wallet"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Admin Dashboard                                               */
/* ------------------------------------------------------------------ */
const AdminDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
  });

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [fundWalletOpen, setFundWalletOpen] = useState(false);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceStart, setMaintenanceStart] = useState("");
  const [maintenanceEnd, setMaintenanceEnd] = useState("");
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const fetchAdminAnalytics = async () => {
    try {
      const response = await api.get("/get-analytics?date=all");
      const d = response.data || response;
      setAnalytics({
        totalUsers: d.platform_stats?.total_users || 0,
        totalRevenue: d.platform_stats?.total_revenue || 0,
        totalTransactions:
          d.platform_stats?.total_successful_transactions || 0,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const res = await api.get("/admin-site-settings");
      const d = res.data || res;
      setMaintenanceMode(d.maintenance_mode === true);
      setMaintenanceMessage(d.message || "");
      const settings = d.settings || {};
      setMaintenanceStart(settings.maintenance_scheduled_start || "");
      setMaintenanceEnd(
        settings.maintenance_scheduled_end || d.scheduled_end || ""
      );
    } catch (error) {
      console.error("Error fetching site settings:", error);
    }
  };

  useEffect(() => {
    fetchAdminAnalytics();
    fetchSiteSettings();
  }, []);

  const saveMaintenanceSettings = async (overrides = {}) => {
    setSavingMaintenance(true);
    const payload = {
      settings: [
        {
          key: "maintenance_mode",
          value: overrides.maintenance_mode ?? maintenanceMode,
        },
        {
          key: "maintenance_message",
          value: overrides.maintenance_message ?? maintenanceMessage,
        },
        {
          key: "maintenance_scheduled_start",
          value: overrides.maintenance_start ?? maintenanceStart,
        },
        {
          key: "maintenance_scheduled_end",
          value: overrides.maintenance_end ?? maintenanceEnd,
        },
      ],
    };
    try {
      await api.put("/admin-site-settings", payload);
      toast.success("Maintenance settings updated");
      if (overrides.maintenance_mode !== undefined)
        setMaintenanceMode(overrides.maintenance_mode);
    } catch (err) {
      toast.error(err?.message || "Failed to update settings");
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleCloseSiteNow = () => {
    setMaintenanceMode(true);
    saveMaintenanceSettings({ maintenance_mode: true });
  };

  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className="space-y-6">
      <BroadcastModal
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
      />
      <FundWalletModal
        open={fundWalletOpen}
        onClose={() => setFundWalletOpen(false)}
        onSuccess={() => {
          fetchAdminAnalytics();
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-dark-400">
            Comprehensive system overview and management
          </p>
        </div>
        <button
          onClick={() => setBroadcastOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors self-start sm:self-auto"
        >
          <Bell className="w-4 h-4" /> Broadcast
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={formatCompactNumber(analytics.totalUsers)}
          icon={Users}
          variant="gradient"
          change="+12%"
          changeType="increase"
          description="vs last month"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics.totalRevenue, true)}
          icon={Banknote}
          variant="primary"
          change="+23%"
          changeType="increase"
          description="vs last month"
        />
        <StatCard
          title="Total Transactions"
          value={formatCompactNumber(analytics.totalTransactions)}
          icon={ShoppingBag}
          variant="default"
        />
      </div>

      {/* Maintenance Mode */}
      <Card variant="default" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Power className="w-6 h-6 text-red-500" />
            <div>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>
                Control site availability and schedule downtime
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-primary-600/5 rounded-xl">
              <div className="flex items-center gap-4">
                <span className="text-white font-medium">Maintenance Mode</span>
                <Badge
                  variant={maintenanceMode ? "danger" : "success"}
                  size="sm"
                >
                  {maintenanceMode ? "ACTIVE" : "OFF"}
                </Badge>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={maintenanceMode}
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 focus:ring-offset-dark-950 ${
                  maintenanceMode ? "bg-red-600" : "bg-dark-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    maintenanceMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  "We have closed for the day. See you tomorrow!",
                  "We are performing scheduled maintenance. We'll be back shortly!",
                  "System upgrade in progress. Please check back soon.",
                  "We're taking a short break. Back in a few hours!",
                  "Service temporarily unavailable due to high demand.",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMaintenanceMessage(preset)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      maintenanceMessage === preset
                        ? "bg-primary-600/20 border-primary-600/50 text-primary-400"
                        : "bg-dark-800/50 border-dark-700 text-dark-400 hover:text-white hover:border-dark-600"
                    }`}
                  >
                    {preset.length > 45
                      ? preset.substring(0, 45) + "..."
                      : preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Maintenance Message"
                  placeholder="We are performing scheduled maintenance..."
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Scheduled Start
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                  value={maintenanceStart}
                  onChange={(e) => setMaintenanceStart(e.target.value)}
                />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Scheduled End
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                  value={maintenanceEnd}
                  onChange={(e) => setMaintenanceEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                loading={savingMaintenance}
                onClick={() => saveMaintenanceSettings()}
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Save Settings
                </span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={savingMaintenance}
                onClick={handleCloseSiteNow}
              >
                <span className="flex items-center gap-2">
                  <Power className="w-4 h-4" /> Close Site Now
                </span>
              </Button>
              {maintenanceMode && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={savingMaintenance}
                  onClick={() => {
                    setMaintenanceMode(false);
                    saveMaintenanceSettings({ maintenance_mode: false });
                  }}
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Bring Site Online
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Link */}
      <ShareBuyLink />

      {/* Quick Actions */}
      <Card variant="gradient" padding="lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Administrative controls and tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Manage Users",
                icon: Users,
                color: "blue",
                path: "/dashboard/admin/users",
              },
              {
                label: "Order Tracking",
                icon: ClipboardList,
                color: "cyan",
                path: "/dashboard/admin/orders",
              },
              {
                label: "Manage Plans",
                icon: Package,
                color: "green",
                path: "/dashboard/admin/plans",
              },
              {
                label: "Transactions",
                icon: BarChart3,
                color: "purple",
                path: "/dashboard/transactions",
              },
            ].map(({ label, icon: Icon, color, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={`p-5 bg-primary-600/5 hover:bg-primary-600/10 rounded-xl transition-all border border-dark-700 hover:border-${color}-600/30 group`}
              >
                <Icon
                  className={`w-7 h-7 text-${color}-500 mb-2 group-hover:scale-110 transition-transform`}
                />
                <p className="text-white font-semibold text-sm">{label}</p>
              </button>
            ))}
            <button
              onClick={() => setFundWalletOpen(true)}
              className="p-5 bg-primary-600/5 hover:bg-primary-600/10 rounded-xl transition-all border border-dark-700 hover:border-primary-600/30 group"
            >
              <Wallet className="w-7 h-7 text-primary-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-white font-semibold text-sm">Fund / Deduct</p>
            </button>
            <button
              onClick={() => setBroadcastOpen(true)}
              className="p-5 bg-primary-600/5 hover:bg-primary-600/10 rounded-xl transition-all border border-dark-700 hover:border-yellow-600/30 group"
            >
              <Bell className="w-7 h-7 text-yellow-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-white font-semibold text-sm">Broadcast</p>
            </button>
            <button
              onClick={() => navigate("/dashboard/settings")}
              className="p-5 bg-primary-600/5 hover:bg-primary-600/10 rounded-xl transition-all border border-dark-700 hover:border-primary-600/30 group"
            >
              <Settings className="w-7 h-7 text-primary-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-white font-semibold text-sm">Settings</p>
            </button>
            <button
              onClick={() => navigate("/dashboard/admin/users")}
              className="p-5 bg-primary-600/5 hover:bg-primary-600/10 rounded-xl transition-all border border-dark-700 hover:border-red-600/30 group"
            >
              <KeyRound className="w-7 h-7 text-red-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-white font-semibold text-sm">Reset Password</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
