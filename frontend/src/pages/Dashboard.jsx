import { useState, useEffect, useRef, useCallback } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  Wallet,
  ShoppingCart,
  History,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  BarChart3,
  Eye,
  EyeOff,
  Package,
  Bell,
  Wifi,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCheck,
  MessageSquare,
  HelpCircle,
  ClipboardList,
  Sun,
  Moon,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Activity,
  ExternalLink,
  Server,
  Megaphone,
  Smartphone,
  Sprout,
} from "lucide-react";
import { toast } from "react-hot-toast";
import useAuthStore from "../stores/authStore";
import useThemeStore from "../stores/themeStore";
import { formatCurrency } from "../utils/formatters";
import api from "../utils/api";
import NotificationModal from "../components/NotificationModal";

// Import actual dashboard pages
import WalletPage from "./dashboard/Wallet";
import BuyDataPage from "./dashboard/BuyData";
import TransactionsPage from "./dashboard/Transactions";
import AdminDashboard from "./dashboard/AdminDashboard";
import AdminPlans from "./dashboard/AdminPlans";
import AdminOrders from "./dashboard/AdminOrders";
import AdminUsers from "./dashboard/AdminUsers";
import AdminProvider from "./dashboard/AdminProvider";
import AdminManualQueue from "./dashboard/AdminManualQueue";
import Settings from "./dashboard/Settings";
import Report from "./dashboard/Report";
import AdminAnalytics from "../pages/AdminAnalytics";
import ResellerDashboard from "./dashboard/ResellerDashboard";
import AdminResellers from "./dashboard/AdminResellers";
import AdminBroadcasts from "./dashboard/AdminBroadcasts";
import AdminMomo from "./dashboard/AdminMomo";
import BuyAFA from "./dashboard/BuyAFA";
import AfaForm from "./dashboard/AfaForm";
import AdminAFAOrders from "./dashboard/AdminAFAOrders";

const AVATAR_SRCS = {
  dark: "/avatars/avatar-dark.svg",
  fair: "/avatars/avatar-fair.svg",
  "female-dark": "/avatars/avatar-female-dark.svg",
  "female-fair": "/avatars/avatar-female-fair.svg",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, refreshUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── FIX 1: define sidebarWidth ──
  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-60";

  const [avatarId, setAvatarId] = useState(
    () => localStorage.getItem("pdd_avatar") || "dark"
  );

  useEffect(() => {
    const onAvatarChange = () =>
      setAvatarId(localStorage.getItem("pdd_avatar") || "dark");
    window.addEventListener("pdd_avatar_changed", onAvatarChange);
    return () =>
      window.removeEventListener("pdd_avatar_changed", onAvatarChange);
  }, []);

  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem("showBalance");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const notifRef = useRef(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  const toggleBalance = () => {
    setShowBalance((prev) => {
      const next = !prev;
      localStorage.setItem("showBalance", JSON.stringify(next));
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get("/notifications-get?limit=15");
      const d = response.data || response;
      setNotifications(d.notifications || []);
      setUnreadCount(d.unread_count || 0);
    } catch {
      // Silently fail
    }
  }, []);

  // ─── Mark a single notification as read ───
  const markOneRead = useCallback(async (notif) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setSelectedNotif(notif);
    setShowNotifications(false);
    if (!notif.is_read) {
      try {
        await api.put("/notifications-mark-read", {
          notification_ids: [notif.id],
        });
      } catch {
        // Silently fail
      }
    }
  }, []);

  // ─── Mark all notifications as read ───
  const markAllRead = async () => {
    try {
      await api.put("/notifications-mark-read", { mark_all: true });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications");
    }
  };

  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      refreshUser();
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // ── Close sidebar on route change (mobile) ──
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target))
        setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── FIX 5: lock body scroll when mobile sidebar is open ──
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // ─── Navigation items ───
  const navItems = [
    {
      name: "Overview",
      path: "/dashboard",
      icon: LayoutDashboard,
      section: "main",
    },
    {
      name: "Wallet",
      path: "/dashboard/wallet",
      icon: Wallet,
      section: "main",
    },
    {
      name: "Buy Data",
      path: "/dashboard/buy-data",
      icon: Wifi,
      section: "main",
    },
    {
      name: "Transactions",
      path: "/dashboard/transactions",
      icon: History,
      section: "main",
    },
    {
      name: "AFA Registration",
      path: "/dashboard/afa",
      icon: Sprout,
      section: "afa",
    },
    ...(user?.is_admin
      ? [
          {
            name: "Admin Dashboard",
            path: "/dashboard/admin",
            icon: LayoutDashboard,
            section: "admin",
          },
          {
            name: "Analytics",
            path: "/dashboard/admin/analytics",
            icon: BarChart3,
            section: "admin",
          },
          {
            name: "Users",
            path: "/dashboard/admin/users",
            icon: Users,
            section: "admin",
          },
          {
            name: "Orders",
            path: "/dashboard/admin/orders",
            icon: ClipboardList,
            section: "admin",
          },
          {
            name: "Plans",
            path: "/dashboard/admin/plans",
            icon: Package,
            section: "admin",
          },
          {
            name: "Manual Queue",
            path: "/dashboard/admin/manual-queue",
            icon: ClipboardList,
            section: "admin",
          },
          {
            name: "Provider",
            path: "/dashboard/admin/provider",
            icon: Server,
            section: "admin",
          },
          {
            name: "Broadcasts",
            path: "/dashboard/admin/broadcasts",
            icon: Megaphone,
            section: "admin",
          },
          {
            name: "MoMo Queue",
            path: "/dashboard/admin/momo",
            icon: Smartphone,
            section: "admin",
          },
          {
            name: "AFA Orders",
            path: "/dashboard/admin/afa-orders",
            icon: Sprout,
            section: "admin",
          },
        ]
      : []),
    {
      name: "Settings",
      path: "/dashboard/settings",
      icon: SettingsIcon,
      section: "account",
    },
    {
      name: "Report",
      path: "/dashboard/report",
      icon: MessageSquare,
      section: "account",
    },
  ];

  const sections = [
    { key: "main", label: "Menu" },
    { key: "afa", label: "AFA" },
    ...(user?.is_admin ? [{ key: "admin", label: "Admin" }] : []),
    { key: "account", label: "Account" },
  ];

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    if (path === "/dashboard/admin")
      return location.pathname === "/dashboard/admin";
    return location.pathname.startsWith(path);
  };

  const getNotifStyle = (type) => {
    switch (type) {
      case "data_purchase_success":
        return "text-green-400 bg-green-500/10";
      case "wallet_funded":
        return "text-primary-400 bg-primary-500/10";
      case "broadcast":
        return "text-amber-400 bg-amber-500/10";
      default:
        return "text-dark-300 bg-dark-700/50";
    }
  };

  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* ─── Top Bar ─── */}
      <header className="bg-dark-900/95 backdrop-blur-md border-b border-dark-800/70 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left — hamburger + logo */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-dark-400 hover:text-white hover:bg-dark-800/80 rounded-xl transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center">
              <img
                src="/logo/logo.png"
                alt="PutDuckData"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Balance chip — desktop */}
            <div className="hidden sm:flex items-center gap-2 bg-dark-800/70 border border-dark-700/50 rounded-xl px-3 py-2">
              <Wallet className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
              <span className="text-white text-xs font-bold tabular-nums">
                {showBalance ? formatCurrency(user?.wallet_balance || 0) : "GH₵ ••••"}
              </span>
              <button
                onClick={toggleBalance}
                className="text-dark-600 hover:text-dark-300 transition-colors"
                aria-label="Toggle balance visibility"
              >
                {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Top Up */}
            <Link
              to="/dashboard/wallet"
              className="hidden sm:flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white rounded-xl px-3.5 py-2 text-xs font-bold transition-colors shadow-md shadow-primary-900/40"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Top Up
            </Link>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-dark-700/60 mx-1" />

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className="p-2 text-dark-400 hover:text-white hover:bg-dark-800/80 rounded-xl transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" weight="bold" /> : <Moon className="w-4.5 h-4.5" weight="bold" />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications(); }}
                className="relative p-2 text-dark-400 hover:text-white hover:bg-dark-800/80 rounded-xl transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-dark-900 border border-dark-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800/80">
                    <h3 className="text-white font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-dark-800/40">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 hover:bg-dark-800/40 transition-colors cursor-pointer ${!notif.is_read ? "bg-primary-600/[0.04]" : ""}`}
                          onClick={() => markOneRead(notif)}
                        >
                          <div className="flex gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${getNotifStyle(notif.type)}`}>
                              <Bell className="w-3 h-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-medium leading-snug">{notif.title}</p>
                              <p className="text-dark-500 text-[11px] mt-0.5 line-clamp-2">{notif.message}</p>
                              <p className="text-dark-600 text-[10px] mt-1">{timeAgo(notif.created_at)}</p>
                            </div>
                            {!notif.is_read && <div className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-10 text-center">
                        <Bell className="w-8 h-8 text-dark-700 mx-auto mb-2" />
                        <p className="text-dark-500 text-xs">No notifications yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-dark-800/80 transition-colors"
              >
                <img src={AVATAR_SRCS[avatarId]} alt="avatar" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
                <span className="hidden md:block text-white text-xs font-semibold max-w-[80px] truncate">
                  {user?.full_name?.split(" ")[0]}
                </span>
                <ChevronRight className="hidden md:block w-3 h-3 text-dark-500 rotate-90" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-dark-900 border border-dark-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-dark-800/80 bg-dark-800/30">
                    <p className="text-white text-sm font-semibold truncate">{user?.full_name}</p>
                    <p className="text-dark-500 text-[11px] truncate mt-0.5">{user?.email}</p>
                    <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary-600/15 text-primary-400">
                      {user?.is_admin ? "Admin" : user?.is_reseller ? "Reseller" : "Customer"}
                    </span>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/dashboard/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-dark-300 hover:bg-dark-800/60 hover:text-white text-xs transition-colors"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" /> Settings
                    </Link>
                  </div>
                  <div className="border-t border-dark-800/80 py-1">
                    <button
                      onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                      className="flex items-center gap-2.5 px-4 py-2.5 w-full text-left text-red-400 hover:bg-red-600/10 text-xs transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* ─── END Top Bar ─── */}

      <div className="flex flex-1 min-h-0">
        {/* ─── Sidebar ─── */}
        <aside
          className={`
            fixed lg:sticky top-16 left-0 z-30
            h-[calc(100vh-4rem)]
            ${sidebarWidth}
            bg-dark-900 border-r border-dark-800/50
            transform transition-all duration-200 ease-in-out
            flex flex-col
            overflow-y-auto overflow-x-hidden
            ${
              sidebarOpen
                ? "translate-x-0 shadow-2xl shadow-black/60"
                : "-translate-x-full lg:translate-x-0"
            }
          `}
        >
          {/* ── FIX 3: top padding added ── */}
          {/* User card */}
          {!sidebarCollapsed && (
            <div className="flex-shrink-0 px-3 pt-3 pb-2">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-dark-800/60 border border-dark-700/40">
                <div className="relative flex-shrink-0">
                  <img
                    src={AVATAR_SRCS[avatarId]}
                    alt="avatar"
                    className="w-9 h-9 rounded-xl object-cover shadow-md"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-dark-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate leading-tight">
                    {user?.full_name || "User"}
                  </p>
                  <span
                    className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-0.5
                    bg-primary-600/15 text-primary-400"
                  >
                    {user?.is_admin
                      ? "Admin"
                      : user?.is_reseller
                      ? "Partner"
                      : "Customer"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed avatar */}
          {sidebarCollapsed && (
            <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
              <div className="relative">
                <img
                  src={AVATAR_SRCS[avatarId]}
                  alt="avatar"
                  className="w-9 h-9 rounded-xl object-cover shadow-md"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-dark-900" />
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex-1 px-2.5 pt-1 pb-2 space-y-3">
            {sections.map((section) => {
              const items = navItems.filter((i) => i.section === section.key);
              if (items.length === 0) return null;
              return (
                <div key={section.key}>
                  {!sidebarCollapsed && (
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-dark-600 px-2.5 mb-1 mt-1">
                      {section.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isExt = item.path.startsWith("__ext__");
                      const href = isExt
                        ? item.path.replace("__ext__", "")
                        : null;
                      const active = !isExt && isActive(item.path);
                      const cls = `
                        group flex items-center gap-2.5 rounded-xl text-[13px] transition-all duration-150
                        ${
                          sidebarCollapsed
                            ? "justify-center px-2 py-2.5"
                            : "px-2.5 py-2"
                        }
                        ${
                          active
                            ? "bg-primary-600/15 text-white font-semibold"
                            : "text-dark-400 hover:bg-dark-800/50 hover:text-white"
                        }
                      `;
                      const inner = (
                        <>
                          <div
                            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all
                            ${
                              active
                                ? "bg-primary-600 shadow-md shadow-primary-900/40"
                                : "group-hover:bg-dark-700/60"
                            }`}
                          >
                            <Icon
                              className={`w-[15px] h-[15px] ${
                                active
                                  ? "text-white"
                                  : "text-dark-400 group-hover:text-dark-200"
                              }`}
                            />
                          </div>
                          {!sidebarCollapsed && (
                            <span className="truncate">{item.name}</span>
                          )}
                        </>
                      );
                      return isExt ? (
                        <a
                          key={item.name}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={item.name}
                          className={cls}
                        >
                          {inner}
                        </a>
                      ) : (
                        <Link
                          key={item.name}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          title={item.name}
                          className={cls}
                        >
                          {inner}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Bottom */}
          {!sidebarCollapsed && (
            <div className="flex-shrink-0 border-t border-dark-800/40 px-2.5 py-3 space-y-1">
              {/* WhatsApp Community */}
              <a
                href="https://whatsapp.com/channel/0029Vb8HjkU9RZAdH6tcMe3W"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] bg-green-500/8 border border-green-500/15 text-green-400 hover:bg-green-500/15 transition-colors group"
              >
                <div className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <span className="font-medium flex-1">Join Community</span>
                <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              </a>

              {/* Help */}
              <a
                href="https://wa.me/233322291381?text=Hi%20PutDuckData%20team%2C%20I%20need%20help"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] text-dark-500 hover:bg-dark-800/50 hover:text-dark-300 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-dark-800 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <span>Help &amp; Support</span>
              </a>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] text-dark-500 hover:bg-red-500/8 hover:text-red-400 transition-colors w-full text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-dark-800 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <span>Log Out</span>
              </button>

              <div className="px-2.5 pt-1">
                <p className="text-dark-700 text-[10px]">
                  PutDuckData v2.0
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* ── FIX 4: overlay z-index raised above sidebar ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[25] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ─── Main Content ─── */}
        <main className="flex-1 min-w-0 max-w-full bg-dark-950">
          <div className="p-4 sm:p-5 lg:p-6">
            <Routes>
              <Route index element={<DashboardOverview />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="buy-data" element={<BuyDataPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="settings" element={<Settings />} />
              <Route path="report" element={<Report />} />
              <Route path="reseller" element={<ResellerDashboard />} />
              <Route path="afa" element={<BuyAFA />} />
              <Route path="afa/form" element={<AfaForm />} />

              {/* Admin Routes with Guard */}
              <Route
                path="admin"
                element={
                  user?.is_admin ? (
                    <AdminDashboard />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/analytics"
                element={
                  user?.is_admin ? (
                    <AdminAnalytics />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/users"
                element={
                  user?.is_admin ? (
                    <AdminUsers />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/orders"
                element={
                  user?.is_admin ? (
                    <AdminOrders />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/plans"
                element={
                  user?.is_admin ? (
                    <AdminPlans />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/manual-queue"
                element={
                  user?.is_admin ? (
                    <AdminManualQueue />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/provider"
                element={
                  user?.is_admin ? (
                    <AdminProvider />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/resellers"
                element={
                  user?.is_admin ? (
                    <AdminResellers />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/broadcasts"
                element={
                  user?.is_admin ? (
                    <AdminBroadcasts />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/momo"
                element={
                  user?.is_admin ? (
                    <AdminMomo />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="admin/afa-orders"
                element={
                  user?.is_admin ? (
                    <AdminAFAOrders />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
            </Routes>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-dark-800/40 text-center">
              <p className="text-dark-600 text-[11px]">
                &copy; {new Date().getFullYear()} PutDuckData. All rights reserved.
              </p>
            </div>
          </div>
        </main>
      </div>

      {selectedNotif && (
        <NotificationModal
          notif={selectedNotif}
          onClose={() => setSelectedNotif(null)}
        />
      )}
    </div>
  );
};

// ─── Dashboard Overview ───
const DashboardOverview = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ spent: 0, funded: 0, count: 0 });
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txRes, allRes] = await Promise.all([
          api.get("/transactions-history?limit=6"),
          api.get("/transactions-history?limit=100"),
        ]);
        const recent = (txRes.data || txRes).transactions || [];
        const all = (allRes.data || allRes).transactions || [];
        setRecentTx(recent);
        let spent = 0,
          funded = 0,
          count = 0;
        all.forEach((tx) => {
          if (tx.status === "success" || tx.status === "completed") {
            count++;
            if (tx.type === "data_purchase")
              spent += parseFloat(tx.amount || 0);
            if (["wallet_fund", "admin_fund"].includes(tx.type))
              funded += parseFloat(tx.amount || 0);
          }
        });
        setStats({ spent, funded, count });
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const timeAgo = (d) => {
    if (!d) return "";
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const TX_TYPES = {
    data_purchase: {
      label: "Data Purchase",
      icon: Wifi,
      bg: "bg-primary-600/10",
      text: "text-primary-400",
    },
    wallet_fund: {
      label: "Wallet Funding",
      icon: ArrowDownLeft,
      bg: "bg-green-500/10",
      text: "text-green-400",
    },
    wallet_funding: {
      label: "Wallet Funding",
      icon: ArrowDownLeft,
      bg: "bg-green-500/10",
      text: "text-green-400",
    },
    admin_fund: {
      label: "Admin Credit",
      icon: ArrowDownLeft,
      bg: "bg-dark-700/60",
      text: "text-dark-300",
    },
  };
  const defaultTx = {
    label: "Transaction",
    icon: Activity,
    bg: "bg-dark-700/50",
    text: "text-dark-400",
  };

  const firstName = user?.full_name?.split(" ")[0] || "User";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const isAdmin = user?.is_admin;
  const isReseller = user?.is_reseller;

  const quickActions = [
    {
      label: "Fund Wallet",
      path: "/dashboard/wallet",
      icon: Wallet,
      iconBg: "bg-primary-600",
      desc: "Add balance",
    },
    {
      label: "Buy Data",
      path: "/dashboard/buy-data",
      icon: Wifi,
      iconBg: "bg-blue-600",
      desc: "All networks",
    },
    {
      label: "History",
      path: "/dashboard/transactions",
      icon: History,
      iconBg: "bg-amber-600",
      desc: "View all",
    },
    {
      label: "Settings",
      path: "/dashboard/settings",
      icon: SettingsIcon,
      iconBg: "bg-dark-600",
      desc: "Account",
    },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Hero — mobile: one merged card */}
      <div className="sm:hidden rounded-2xl overflow-hidden border border-dark-800/60">
        {/* Greeting section */}
        <div className="bg-dark-900/60 px-4 pt-4 pb-3">
          <p className="text-dark-500 text-[10px] font-medium mb-0.5">
            {new Date().toLocaleDateString("en-GH", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-white leading-tight">
                {greeting}, {firstName} 👋
              </h1>
              <p className="text-dark-400 text-xs mt-0.5 leading-snug">
                {isAdmin
                  ? "Full admin access — manage orders, users, and plans."
                  : isReseller
                  ? "Your partner dashboard is ready."
                  : "Affordable data for all networks, instantly."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              to="/dashboard/buy-data"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-colors"
            >
              <Wifi className="w-3 h-3" /> Buy Data
            </Link>
            <Link
              to="/dashboard/wallet"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-200 text-xs font-semibold transition-colors"
            >
              <ArrowUpRight className="w-3 h-3" /> Top Up
            </Link>
            {isAdmin && (
              <Link
                to="/dashboard/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/15 border border-amber-500/25 text-amber-400 text-xs font-semibold transition-colors"
              >
                <TrendingUp className="w-3 h-3" /> Admin Panel
              </Link>
            )}
          </div>
        </div>
        {/* Balance strip */}
        <div
          className="wallet-hero-card relative overflow-hidden px-4 py-3 flex items-center justify-between"
          style={{
            background:
              "linear-gradient(135deg, #dc2626 0%, #b91c1c 55%, #991b1b 100%)",
          }}
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-black/15" />
          <div className="relative">
            <p className="text-white/60 text-[9px] font-semibold uppercase tracking-widest mb-0.5">
              Wallet Balance
            </p>
            <p className="text-xl font-extrabold text-white tabular-nums leading-none">
              {formatCurrency(user?.wallet_balance || 0)}
            </p>
            <p className="text-white/40 text-[9px] mt-0.5">
              Available to spend
            </p>
          </div>
          <div className="relative flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/80 text-[10px] font-semibold">
                Active
              </span>
            </div>
            <span className="text-white/30 text-[9px]">PutDuckData</span>
          </div>
        </div>
      </div>

      {/* Hero — desktop: two cards side by side */}
      <div className="hidden sm:grid sm:grid-cols-5 gap-3">
        <div className="sm:col-span-3 bg-dark-900/60 border border-dark-800/60 rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div>
            <p className="text-dark-500 text-xs font-medium mb-0.5">
              {new Date().toLocaleDateString("en-GH", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="text-2xl font-extrabold text-white leading-tight">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-dark-400 text-sm mt-1 leading-snug">
              {isAdmin
                ? "Full admin access — manage orders, users, and plans."
                : isReseller
                ? "Your partner dashboard is ready."
                : "Affordable data for all networks, instantly."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              to="/dashboard/buy-data"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-colors shadow-sm shadow-primary-900/30"
            >
              <Wifi className="w-3.5 h-3.5" /> Buy Data
            </Link>
            <Link
              to="/dashboard/wallet"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-200 text-xs font-semibold transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Top Up
            </Link>
            {isAdmin && (
              <Link
                to="/dashboard/admin"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/25 text-amber-400 text-xs font-semibold transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Admin Panel
              </Link>
            )}
          </div>
        </div>
        <div
          className="wallet-hero-card sm:col-span-2 relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between min-h-[140px]"
          style={{
            background:
              "linear-gradient(135deg, #dc2626 0%, #b91c1c 55%, #991b1b 100%)",
          }}
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-black/15" />
          <div className="absolute top-1/2 right-12 w-16 h-16 rounded-full bg-white/5 -translate-y-1/2" />
          <div className="relative">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1.5">
              Wallet Balance
            </p>
            <p className="text-3xl font-extrabold text-white tabular-nums leading-none">
              {formatCurrency(user?.wallet_balance || 0)}
            </p>
            <p className="text-white/40 text-[11px] mt-1.5">
              Available to spend
            </p>
          </div>
          <div className="relative flex items-center justify-between mt-2">
            <span className="text-white/40 text-[10px] font-medium">
              PutDuckData
            </span>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/80 text-[10px] font-semibold">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          {
            label: "Total Funded",
            value: loading ? "—" : formatCurrency(stats.funded),
            icon: ArrowDownLeft,
            color: "text-green-400",
            bg: "bg-green-500/10",
            border: "border-green-500/15",
          },
          {
            label: "Data Spent",
            value: loading ? "—" : formatCurrency(stats.spent),
            icon: ShoppingCart,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/15",
          },
          {
            label: "Transactions",
            value: loading ? "—" : stats.count,
            icon: Activity,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/15",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-dark-900/60 border ${s.border} rounded-xl p-2.5 sm:p-4`}
          >
            <div className="flex items-start justify-between gap-1 mb-1.5 sm:mb-2">
              <span className="text-[8px] sm:text-[10px] text-dark-500 font-bold uppercase tracking-wider leading-tight">
                {s.label}
              </span>
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
              >
                <s.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${s.color}`} />
              </div>
            </div>
            <p className="text-sm sm:text-lg font-extrabold text-white tabular-nums truncate">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-bold text-dark-600 uppercase tracking-widest mb-2.5">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              to={a.path}
              className="group bg-dark-900/60 border border-dark-800/60 hover:border-dark-700/60 rounded-xl p-3.5 transition-all hover:bg-dark-800/40 hover:shadow-sm"
            >
              <div
                className={`w-9 h-9 ${a.iconBg} rounded-xl flex items-center justify-center mb-2.5 shadow-md group-hover:scale-105 transition-transform`}
              >
                <a.icon className="w-[17px] h-[17px] text-white" />
              </div>
              <p className="text-white text-xs font-bold">{a.label}</p>
              <p className="text-dark-600 text-[10px] mt-0.5">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold text-dark-600 uppercase tracking-widest">
            Recent Activity
          </p>
          <Link
            to="/dashboard/transactions"
            className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="bg-dark-900/60 border border-dark-800/60 rounded-2xl overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-dark-800/40 last:border-0"
              >
                <div className="w-9 h-9 bg-dark-800/60 rounded-xl animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-dark-800/60 rounded-md animate-pulse w-1/3" />
                  <div className="h-2.5 bg-dark-800/40 rounded-md animate-pulse w-1/4" />
                </div>
                <div className="h-4 bg-dark-800/60 rounded-md animate-pulse w-16" />
              </div>
            ))}
          </div>
        ) : recentTx.length > 0 ? (
          <div className="bg-dark-900/60 border border-dark-800/60 rounded-2xl overflow-hidden divide-y divide-dark-800/40">
            {recentTx.map((tx) => {
              const cfg = TX_TYPES[tx.type] || defaultTx;
              const Icon = cfg.icon;
              const isFund = [
                "wallet_fund",
                "admin_fund",
                "wallet_funding",
              ].includes(tx.type);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-dark-800/25 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {cfg.label}
                      </p>
                      <p className="text-dark-600 text-[11px]">
                        {timeAgo(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span
                      className={`font-bold text-sm tabular-nums ${
                        isFund ? "text-green-400" : "text-white"
                      }`}
                    >
                      {isFund ? "+" : "-"}
                      {formatCurrency(parseFloat(tx.amount || 0))}
                    </span>
                    <p
                      className={`text-[10px] mt-0.5 font-medium capitalize ${
                        tx.status === "success" || tx.status === "completed"
                          ? "text-green-500"
                          : tx.status === "failed"
                          ? "text-red-500"
                          : "text-amber-500"
                      }`}
                    >
                      {tx.status === "success" || tx.status === "completed"
                        ? "Delivered"
                        : tx.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-dark-900/60 border border-dark-800/60 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 bg-dark-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-dark-600" />
            </div>
            <p className="text-dark-400 text-sm font-semibold">
              No transactions yet
            </p>
            <p className="text-dark-600 text-xs mt-1">
              Start by funding your wallet
            </p>
            <Link
              to="/dashboard/wallet"
              className="inline-flex items-center gap-1.5 mt-4 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Wallet className="w-3.5 h-3.5" /> Fund Wallet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
