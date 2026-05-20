import { useState } from "react";
import WhatsappHelpButton from "../components/WhatsappHelpButton";
import { Link, useLocation } from "react-router-dom";
import {
  Wifi,
  Search,
  Menu,
  X,
  HelpCircle,
  UserPlus,
  Sprout,
  LogIn,
} from "lucide-react";
import { Sun, Moon } from "@phosphor-icons/react";
import useThemeStore from "../stores/themeStore";
import { useBroadcasts } from "../hooks/useBroadcasts.js";
import BroadcastModal from "../components/BroadcastModal.jsx";

const GUEST_NAV = [
  { name: "Buy Data", path: "/buy", icon: Wifi },
  { name: "Track Order", path: "/track-order", icon: Search },
  { name: "Login", path: "/login", icon: LogIn },
];

const AFA_NAV = [
  {
    name: "AFA Registration",
    path: "/guest-afa",
    icon: Sprout,
  },
];
const GuestLayout = ({ children }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { broadcast: guestBroadcast, dismiss: dismissGuest } =
    useBroadcasts(true);

  const handleGuestDismiss = () => {
    if (guestBroadcast) dismissGuest(guestBroadcast.id);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div className="min-h-screen bg-dark-950">
        {/* ─── Top Bar ─── */}
        <header className="bg-dark-900/95 backdrop-blur-md border-b border-dark-800/70 sticky top-0 z-40">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Left */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-1.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              {/* Logo Group */}
              <Link to="/" className="flex items-center">
                <img
                  src="/logo/logo.png"
                  alt="PutDuckData"
                  className="h-12 sm:h-14 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                title={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" weight="bold" />
                ) : (
                  <Moon className="w-4 h-4" weight="bold" />
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-4rem)]">
          {/* ─── Sidebar ─── */}
          <aside
            className={`
              fixed lg:sticky top-16 left-0 z-30
              h-[calc(100vh-4rem)]
              w-[220px] bg-dark-900 border-r border-dark-800/50
              flex flex-col overflow-hidden
              transform transition-all duration-200
              ${
                sidebarOpen
                  ? "translate-x-0"
                  : "-translate-x-full lg:translate-x-0"
              }
            `}
          >
            {/* Guest badge */}
            <div className="flex-shrink-0 px-3 pt-3 pb-2">
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-dark-800/60 border border-dark-700/60">
                <div className="w-9 h-9 rounded-xl bg-dark-700/80 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4 text-dark-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold leading-tight">
                    Guest
                  </p>
                  <p className="text-dark-500 text-[10px] leading-tight">
                    No account needed
                  </p>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto px-2.5 pt-2 pb-2 space-y-3">
              {/* Main menu */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-dark-600 px-2 mb-1.5">
                  Menu
                </p>
                <div className="space-y-0.5">
                  {GUEST_NAV.map(({ name, path, icon: Icon }) => {
                    const active = isActive(path);
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all ${
                          active
                            ? "bg-primary-600/10 text-white font-semibold"
                            : "text-dark-400 hover:bg-dark-800/50 hover:text-dark-200"
                        }`}
                      >
                        <div className="relative">
                          {active && (
                            <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 bg-primary-500 rounded-r-full" />
                          )}
                          <Icon
                            className={`w-[18px] h-[18px] ${
                              active
                                ? "text-primary-400"
                                : "group-hover:text-dark-300"
                            }`}
                          />
                        </div>
                        <span className="truncate">{name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* AFA section */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-dark-600 px-2 mb-1.5">
                  AFA
                </p>
                <div className="space-y-0.5">
                  {AFA_NAV.map(({ name, path, icon: Icon }) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setSidebarOpen(false)}
                      className="group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all text-dark-400 hover:bg-dark-800/50 hover:text-dark-200"
                    >
                      <Icon className="w-[18px] h-[18px] text-primary-400" />
                      <span className="truncate">{name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            {/* Bottom */}
            <div className="flex-shrink-0 border-t border-dark-800/40 px-2.5 py-2 space-y-0.5">
              {/* FIXED: Added missing <a> opening tag below */}
              <a
                href="https://wa.me/233322291381?text=Hi%2C+I+need+help+with+my+order"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-dark-500 hover:bg-dark-800/50 hover:text-dark-300 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Help & Support</span>
              </a>

              <div className="px-2 pt-1">
                <p className="text-dark-700 text-[10px]">
                  PutDuckData v2.0
                </p>
              </div>
            </div>
          </aside>

          {/* ─── Main content ─── */}
          <main className="flex-1 min-w-0 bg-dark-950">{children}</main>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* WhatsApp Help Button */}
        <WhatsappHelpButton />
        {guestBroadcast && (
          <BroadcastModal notif={guestBroadcast} onClose={handleGuestDismiss} />
        )}
      </div>
    </>
  );
};

export default GuestLayout;
