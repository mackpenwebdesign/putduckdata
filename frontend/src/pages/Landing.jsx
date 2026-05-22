import { Link } from "react-router-dom";
import {
  Timer,
  ShieldCheck,
  Wallet,
  Users,
  CheckCircle,
  TrendUp,
  Trophy,
  Clock,
  Plus,
  Minus,
  CaretUp,
  CaretDown,
  List,
  X,
  WhatsappLogo,
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import Button from "../components/Button";
import api from "../utils/api";
import useThemeStore from "../stores/themeStore";
import useSiteSettingsStore from "../stores/siteSettingsStore";
import { cleanPlanName } from "../utils/formatters";

const NETWORK_CONFIG = {
  MTN: {
    label: "MTN",
    color: "yellow",
    accent: "bg-yellow-600/10",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    dot: "bg-yellow-400",
    bg: "bg-yellow-500/10",
    ring: "ring-yellow-500/30",
  },
  TELECEL: {
    label: "Telecel",
    color: "red",
    accent: "bg-red-600/10",
    text: "text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-400",
    bg: "bg-red-500/10",
    ring: "ring-red-500/30",
  },
  AIRTEL_TIGO: {
    label: "AirtelTigo",
    color: "blue",
    accent: "bg-blue-600/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/30",
  },
};

const BrowserSimulator = () => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStep((prev) => (prev + 1) % 5);
        setVisible(true);
      }, 300);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const STEP_URLS = [
    "putduckdata.com/buy",
    "putduckdata.com/buy#plans",
    "putduckdata.com/buy#checkout",
    "putduckdata.com/buy#payment",
    "putduckdata.com/buy#success",
  ];

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Ambient glow */}
      <div className="absolute -inset-4 bg-primary-600/8 rounded-3xl blur-3xl pointer-events-none" />

      {/* Floating badge top-right */}
      <div className="absolute -top-3 -right-2 z-20 flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        <span className="text-green-400 text-[10px] font-semibold">
          Live Platform
        </span>
      </div>

      {/* Floating badge bottom-left */}
      <div className="absolute -bottom-3 -left-2 z-20 flex items-center gap-2 bg-dark-800/90 border border-dark-700 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
        <div className="w-6 h-6 rounded-full bg-primary-600/20 flex items-center justify-center">
          <Timer className="w-3.5 h-3.5 text-primary-400" weight="fill" />
        </div>
        <div>
          <p className="text-white text-[10px] font-bold leading-none">
            0–5 mins
          </p>
          <p className="text-dark-400 text-[9px] leading-none mt-0.5">
            Fast delivery
          </p>
        </div>
      </div>

      {/* Browser window */}
      <div className="relative bg-dark-900 rounded-xl border border-dark-700/80 shadow-2xl overflow-hidden">
        {/* Browser chrome */}
        <div className="bg-dark-800/90 border-b border-dark-700/60 px-3 py-2.5 flex items-center gap-2.5">
          {/* Traffic lights */}
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          {/* Browser nav buttons */}
          <div className="flex gap-0.5 shrink-0">
            <div className="w-5 h-5 rounded flex items-center justify-center text-dark-600 text-xs">
              ‹
            </div>
            <div className="w-5 h-5 rounded flex items-center justify-center text-dark-600 text-xs">
              ›
            </div>
            <div className="w-5 h-5 rounded flex items-center justify-center text-dark-600 text-xs">
              ↻
            </div>
          </div>
          {/* URL bar */}
          <div className="flex-1 bg-dark-950/60 border border-dark-700/40 rounded-md px-2.5 py-1 flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span
              className="text-dark-400 text-[10px] font-mono truncate transition-all duration-300"
              style={{ opacity: visible ? 1 : 0 }}
            >
              {STEP_URLS[step]}
            </span>
          </div>
        </div>

        {/* App header bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-950/80 border-b border-dark-800/60">
          <img
            src="/logo/logo.png"
            alt=""
            className="w-8 h-8 object-contain shrink-0"
          />
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-dark-500 text-[10px]">Plans</span>
            <span className="text-dark-500 text-[10px]">How it works</span>
          </div>
          <div className="ml-2 px-2.5 py-1 bg-primary-600 rounded-md">
            <span className="text-white text-[10px] font-semibold">
              Buy Now
            </span>
          </div>
        </div>

        {/* Step content */}
        <div
          className="px-5 pt-4 pb-10"
          style={{
            minHeight: 320,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          {/* Step 0 — Select Network */}
          {step === 0 && (
            <div>
              <p className="text-dark-400 text-[9px] font-semibold uppercase tracking-wider mb-1">
                Step 1 of 3
              </p>
              <h3 className="text-white text-sm font-bold mb-4">
                Select Your Network
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-yellow-400 text-sm font-black">
                      M
                    </span>
                  </div>
                  <p className="text-yellow-400 text-[11px] font-bold">MTN</p>
                  <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" weight="fill" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-dark-800/50 border border-dark-700/40">
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                    <span className="text-red-400 text-sm font-black">T</span>
                  </div>
                  <p className="text-dark-300 text-[11px] font-bold">Telecel</p>
                  <div className="w-4 h-4 rounded-full border-2 border-dark-600" />
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-dark-800/50 border border-dark-700/40">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <span className="text-blue-400 text-sm font-black">A</span>
                  </div>
                  <p className="text-dark-300 text-[11px] font-bold">
                    AirtelTigo
                  </p>
                  <div className="w-4 h-4 rounded-full border-2 border-dark-600" />
                </div>
              </div>
              <button className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold">
                Continue →
              </button>
            </div>
          )}

          {/* Step 1 — Select Plan */}
          {step === 1 && (
            <div>
              <p className="text-dark-400 text-[9px] font-semibold uppercase tracking-wider mb-1">
                Step 2 of 3 · MTN
              </p>
              <h3 className="text-white text-sm font-bold mb-4">
                Choose a Plan
              </h3>
              <div className="space-y-2 mb-4">
                {[
                  {
                    gb: "1GB",
                    price: "GHS 5.00",
                    validity: "24 hrs",
                    active: false,
                  },
                  {
                    gb: "3GB",
                    price: "GHS 12.00",
                    validity: "7 days",
                    active: true,
                  },
                  {
                    gb: "5GB",
                    price: "GHS 18.00",
                    validity: "30 days",
                    active: false,
                  },
                  {
                    gb: "10GB",
                    price: "GHS 30.00",
                    validity: "30 days",
                    active: false,
                  },
                ].map(({ gb, price, validity, active }) => (
                  <div
                    key={gb}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                      active
                        ? "bg-primary-600/15 border-primary-500/40"
                        : "bg-dark-800/40 border-dark-700/30"
                    }`}
                  >
                    <div>
                      <span
                        className={`text-xs font-bold ${
                          active ? "text-primary-400" : "text-dark-200"
                        }`}
                      >
                        {gb}
                      </span>
                      <span className="text-dark-500 text-[10px] ml-2">
                        {validity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          active ? "text-white" : "text-dark-300"
                        }`}
                      >
                        {price}
                      </span>
                      {active && (
                        <span className="text-primary-500 text-[9px] font-semibold">
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold">
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 — Phone number */}
          {step === 2 && (
            <div>
              <p className="text-dark-400 text-[9px] font-semibold uppercase tracking-wider mb-1">
                Step 3 of 3
              </p>
              <h3 className="text-white text-sm font-bold mb-4">
                Delivery Details
              </h3>
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-dark-400 text-[10px] font-medium mb-1.5">
                    Phone Number
                  </p>
                  <div className="flex items-center gap-2 bg-dark-800/60 border border-dark-600 rounded-xl px-3 py-2.5">
                    <span className="text-dark-400 text-xs">+233</span>
                    <div className="w-px h-4 bg-dark-700" />
                    <span className="text-white text-xs font-medium tracking-wide flex-1">
                      0244 491 192
                    </span>
                    <div className="w-0.5 h-3.5 bg-primary-500 animate-pulse" />
                  </div>
                </div>
                <div className="bg-dark-800/40 border border-dark-700/40 rounded-xl p-3">
                  <p className="text-dark-400 text-[9px] uppercase tracking-wider mb-2">
                    Order Summary
                  </p>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-dark-400 text-[10px]">Network</span>
                    <span className="text-yellow-400 text-[10px] font-bold">
                      MTN
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-dark-400 text-[10px]">Plan</span>
                    <span className="text-dark-200 text-[10px]">
                      3GB · 7 days
                    </span>
                  </div>
                  <div className="h-px bg-dark-700 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-dark-200 text-xs font-semibold">
                      Total
                    </span>
                    <span className="text-white text-xs font-bold">
                      GHS 12.00
                    </span>
                  </div>
                </div>
              </div>
              <button className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold">
                Pay Now — GHS 12.00
              </button>
            </div>
          )}

          {/* Step 3 — Paystack */}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-dark-400 text-[9px]">Secured by</p>
                  <p className="text-primary-400 text-xs font-bold">Paystack</p>
                </div>
                <div className="bg-primary-600/15 border border-primary-600/30 rounded-lg px-3 py-1.5">
                  <p className="text-white text-sm font-bold">GHS 12.00</p>
                </div>
              </div>
              <p className="text-dark-400 text-[10px] mb-3">
                PutDuckData · MTN 3GB Data Bundle
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-600/10 border border-primary-600/30">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <span className="text-base">📱</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-bold">Mobile Money</p>
                    <p className="text-dark-400 text-[10px]">
                      MTN MoMo / Telecel Cash
                    </p>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3 h-3 text-white" weight="fill" />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/40 border border-dark-700/30">
                  <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                    <span className="text-base">💳</span>
                  </div>
                  <div>
                    <p className="text-dark-200 text-xs font-bold">
                      Debit / Credit Card
                    </p>
                    <p className="text-dark-500 text-[10px]">
                      Visa · Mastercard
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/40 border border-dark-700/30">
                  <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                    <span className="text-base">🏦</span>
                  </div>
                  <div>
                    <p className="text-dark-200 text-xs font-bold">
                      Bank Transfer
                    </p>
                    <p className="text-dark-500 text-[10px]">
                      Fast confirmation
                    </p>
                  </div>
                </div>
              </div>
              <button className="w-full py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold">
                Pay GHS 12.00 →
              </button>
            </div>
          )}

          {/* Step 4 — Success */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center pt-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mb-4">
                <CheckCircle className="w-9 h-9 text-green-400" weight="fill" />
              </div>
              <h3 className="text-white text-base font-bold mb-1">
                Data Delivered! 🎉
              </h3>
              <p className="text-dark-400 text-xs mb-5">
                3GB successfully sent to 0244 491 192
              </p>
              <div className="w-full bg-dark-800/50 border border-dark-700/40 rounded-xl p-3 mb-4 text-left">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-dark-500 text-xs">Reference</span>
                    <span className="text-dark-300 text-xs font-mono">
                      MDH-2025-0419
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-500 text-xs">Network</span>
                    <span className="text-yellow-400 text-xs font-bold">
                      MTN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-500 text-xs">Amount paid</span>
                    <span className="text-green-400 text-xs font-bold">
                      GHS 12.00
                    </span>
                  </div>
                </div>
              </div>
              <button className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold">
                Buy Again
              </button>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "w-4 h-1.5 bg-primary-500"
                  : "w-1.5 h-1.5 bg-dark-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const HERO_PHRASES = [
  "Fast Delivery.",
  "Best Prices.",
  "Zero Hassle.",
  "100% Secure.",
];

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState({});
  const [loadingPlans, setLoadingPlans] = useState(true);
  const { theme, toggleTheme } = useThemeStore();
  const { validityLabel } = useSiteSettingsStore();
  const [activeNetwork, setActiveNetwork] = useState("MTN");
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroVisible(false);
      setTimeout(() => {
        setHeroIdx((prev) => (prev + 1) % HERO_PHRASES.length);
        setHeroVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get("/data-plans");
        const d = res.data || res;
        setPlans(d.plans || {});
        // Set first available network as active
        const networks = Object.keys(d.plans || {});
        if (networks.length > 0 && !networks.includes(activeNetwork)) {
          setActiveNetwork(networks[0]);
        }
      } catch {
        // Silently fail - will show empty state
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-dark-950 relative overflow-hidden">
      <ScrollArrow />
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="border-b border-dark-800/50 bg-dark-950/95 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center space-x-2 -ml-1 lg:-ml-3">
              <img
                src="/logo/logo.png"
                alt="PutDuckData"
                className="h-12 sm:h-16"
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center space-x-1">
              <a
                href="#plans"
                className="relative text-dark-300 hover:text-white text-sm px-3 py-2 transition-colors after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:bg-primary-600 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
              >
                Plans
              </a>
              <a
                href="#features"
                className="relative text-dark-300 hover:text-white text-sm px-3 py-2 transition-colors after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:bg-primary-600 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="relative text-dark-300 hover:text-white text-sm px-3 py-2 transition-colors after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:bg-primary-600 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
              >
                How It Works
              </a>
              <a
                href="#faq"
                className="relative text-dark-300 hover:text-white text-sm px-3 py-2 transition-colors after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:bg-primary-600 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
              >
                FAQ
              </a>
              <div className="w-px h-6 bg-dark-800 mx-2"></div>
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
                title={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" weight="bold" />
                ) : (
                  <Moon className="w-4 h-4" weight="bold" />
                )}
              </button>
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-dark-700 hover:border-primary-600 hover:bg-primary-600/5"
                >
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary-600/50 text-primary-400 hover:border-primary-500 hover:bg-primary-600/10"
                >
                  Become a Partner
                </Button>
              </Link>
              <Link to="/buy">
                <Button variant="primary" size="sm">
                  Buy Now
                </Button>
              </Link>
            </div>

            {/* Mobile: theme toggle + hamburger */}
            <div className="sm:hidden flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" weight="bold" />
                ) : (
                  <Moon className="w-5 h-5" weight="bold" />
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-dark-300 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" weight="bold" />
                ) : (
                  <List className="w-6 h-6" weight="bold" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-dark-800 py-4 space-y-1">
              <a
                href="#plans"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-dark-300 hover:text-white px-4 py-3 rounded-xl hover:bg-dark-800/50 transition-colors text-sm font-medium"
              >
                Plans
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-dark-300 hover:text-white px-4 py-3 rounded-xl hover:bg-dark-800/50 transition-colors text-sm font-medium"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-dark-300 hover:text-white px-4 py-3 rounded-xl hover:bg-dark-800/50 transition-colors text-sm font-medium"
              >
                How It Works
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-dark-300 hover:text-white px-4 py-3 rounded-xl hover:bg-dark-800/50 transition-colors text-sm font-medium"
              >
                FAQ
              </a>
              <div className="pt-3 mt-2 border-t border-dark-800/50 flex flex-col gap-2 px-4">
                <div className="flex gap-3">
                  <Link
                    to="/login"
                    className="flex-1"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      className="border-dark-700"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link
                    to="/buy"
                    className="flex-1"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="primary" size="sm" fullWidth>
                      Buy Now
                    </Button>
                  </Link>
                </div>
                <Link
                  to="/register"
                  className="block"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    className="border-primary-600/50 text-primary-400 hover:border-primary-500 hover:bg-primary-600/10"
                  >
                    Become a Partner
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-8 pb-14 sm:pt-10 sm:pb-18 px-4 sm:px-6 lg:px-8">
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[500px] bg-primary-600/6 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary-600/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left — copy */}
            <div className="text-center lg:text-left order-1">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 bg-primary-600/10 border border-primary-600/20 rounded-full px-4 py-2 mb-6">
                <Trophy className="w-4 h-4 text-primary-500" weight="fill" />
                <span className="text-xs font-semibold text-primary-500 tracking-wide">
                  Deep blue: Main Brand
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-[1.1] tracking-tight">
                <span className="text-white">PutDuckData.</span>
                <br />
                <span
                  className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent inline-block transition-all duration-350"
                  style={{
                    opacity: heroVisible ? 1 : 0,
                    transform: heroVisible
                      ? "translateY(0)"
                      : "translateY(8px)",
                  }}
                >
                  {HERO_PHRASES[heroIdx]}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-dark-300 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Buy MTN, Telecel, and AirtelTigo data bundles in Ghana at the
                cheapest prices. Fast, secure — no account needed.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                <Link to="/buy">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto shadow-xl shadow-primary-600/30 hover:scale-[1.02] transition-all duration-200 px-8"
                  >
                    Buy Data Now
                  </Button>
                </Link>
                <a href="#plans">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-dark-700 hover:border-primary-600/60 hover:bg-primary-600/5 transition-all duration-200 px-8"
                  >
                    View Plans
                  </Button>
                </a>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {[
                  {
                    icon: <CheckCircle className="w-3.5 h-3.5" weight="fill" />,
                    label: "Fast Delivery",
                  },
                  {
                    icon: <CheckCircle className="w-3.5 h-3.5" weight="fill" />,
                    label: "Cheapest Prices",
                  },
                  {
                    icon: <CheckCircle className="w-3.5 h-3.5" weight="fill" />,
                    label: "24/7 Support",
                  },
                  {
                    icon: <CheckCircle className="w-3.5 h-3.5" weight="fill" />,
                    label: "100% Secure",
                  },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 bg-dark-900/60 border border-dark-800 rounded-full px-3 py-1.5 text-xs text-dark-200"
                  >
                    <span className="text-primary-500">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — browser simulator */}
            <div className="flex justify-center lg:justify-end order-2">
              <BrowserSimulator />
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { value: "3", label: "Networks" },
              { value: "0–5m", label: "Delivery" },
              { value: "24/7", label: "Support" },
              { value: "100%", label: "Secure" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="text-center p-4 bg-dark-900/50 border border-dark-800 rounded-2xl"
              >
                <div className="text-2xl font-bold text-primary-400 mb-0.5">
                  {value}
                </div>
                <div className="text-dark-500 text-xs font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Partners */}
      <div className="py-10 px-4 sm:px-6 lg:px-8 border-y border-dark-800/30 bg-dark-900/20">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-dark-500 text-xs font-semibold uppercase tracking-widest mb-6">
            Trusted Payment Partners
          </p>
          <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-8">
            <div className="flex items-center space-x-2 bg-dark-900/50 border border-dark-800 rounded-xl px-5 py-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-dark-300 text-sm font-semibold">
                Paystack
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-dark-900/50 border border-dark-800 rounded-xl px-5 py-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-dark-300 text-sm font-semibold">
                Mobile Money
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-dark-900/50 border border-dark-800 rounded-xl px-5 py-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-dark-300 text-sm font-semibold">
                Visa / Mastercard
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-dark-900/50 border border-dark-800 rounded-xl px-5 py-3">
              <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              <span className="text-dark-300 text-sm font-semibold">
                Bank Transfer
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <section
        id="features"
        className="relative py-24 px-4 sm:px-6 lg:px-8 bg-dark-950"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="h-px w-12 bg-primary-600/30"></div>
              <span className="text-sm font-bold text-primary-600 tracking-widest uppercase px-4">
                Platform Features
              </span>
              <div className="h-px w-12 bg-primary-600/30"></div>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Everything You Need to
              <br />
              <span className="text-primary-500">Grow Your Business</span>
            </h2>
            <p className="text-dark-300 text-xl max-w-3xl mx-auto leading-relaxed">
              Powerful tools and features designed for the best data buying
              experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Timer className="w-6 h-6" weight="fill" />}
              title="Fast Delivery"
              description="Timer-fast data delivery to any number on MTN, Telecel, and AirtelTigo networks"
            />
            <FeatureCard
              icon={<Wallet className="w-6 h-6" weight="fill" />}
              title="Secure Payments"
              description="Multiple payment options with bank-level security powered by Paystack"
            />
            <FeatureCard
              icon={<TrendUp className="w-6 h-6" weight="bold" />}
              title="Best Prices"
              description="Get the cheapest data prices in Ghana across all major networks"
            />
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6" weight="fill" />}
              title="Enterprise Security"
              description="Your data is protected with SSL encryption and advanced security protocols"
            />
          </div>

          {/* Additional Features Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative group">
              <div className="relative bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-8 hover:border-primary-600/50 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary-600" weight="fill" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Smart Dashboard
                    </h3>
                    <p className="text-dark-400 text-sm leading-relaxed">
                      Track your purchases, balance, and activity in real-time
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="relative bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-8 hover:border-primary-600/50 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary-600" weight="fill" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Transaction History
                    </h3>
                    <p className="text-dark-400 text-sm leading-relaxed">
                      Complete records of all your purchases and transactions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="relative bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-8 hover:border-primary-600/50 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Trophy
                      className="w-6 h-6 text-primary-600"
                      weight="fill"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      All Networks
                    </h3>
                    <p className="text-dark-400 text-sm leading-relaxed">
                      Buy data for MTN, Telecel, and AirtelTigo all in one place
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Data Plans */}
      <section id="plans" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="h-px w-8 bg-primary-600/50"></div>
              <span className="text-sm font-semibold text-primary-600 tracking-wider uppercase px-3">
                Live Prices
              </span>
              <div className="h-px w-8 bg-primary-600/50"></div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Data <span className="text-primary-600">Plans</span>
            </h2>
            <p className="text-dark-300 text-lg">
              Real-time prices across all networks. No account needed.
            </p>
          </div>

          {/* Network Tabs */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-8 flex-wrap">
            {Object.entries(NETWORK_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setActiveNetwork(key)}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  activeNetwork === key
                    ? `${cfg.bg} ${cfg.border} ${cfg.text} ring-1 ${cfg.ring}`
                    : "bg-dark-900/50 border-dark-800 text-dark-400 hover:text-white hover:border-dark-700"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Plan Cards */}
          {loadingPlans ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-dark-900/50 border border-dark-800 rounded-2xl p-6 animate-pulse"
                >
                  <div className="h-4 bg-dark-800 rounded w-2/3 mb-3"></div>
                  <div className="h-6 bg-dark-800 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-dark-800 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {plans[activeNetwork] && plans[activeNetwork].length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                  {plans[activeNetwork].slice(0, 6).map((plan) => {
                    const cfg = NETWORK_CONFIG[activeNetwork];
                    return (
                      <div
                        key={plan.id}
                        className={`bg-dark-900/50 border border-dark-800 rounded-2xl overflow-hidden hover:${cfg.border} transition-all duration-200 group`}
                      >
                        <div
                          className={`${cfg.accent} px-5 py-3 border-b border-dark-800`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`${cfg.text} font-bold text-sm`}>
                              {cfg.label}
                            </span>
                            <div
                              className={`w-6 h-6 ${cfg.bg} rounded-lg flex items-center justify-center`}
                            >
                              <div
                                className={`w-2 h-2 ${cfg.dot} rounded-full`}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="text-white font-bold text-lg mb-1">
                            {plan.data_volume}
                          </h3>
                          <p className="text-dark-400 text-xs mb-3">
                            {cleanPlanName(plan.plan_name)}{validityLabel ? ` · ${validityLabel}` : ""}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold text-xl">
                              GH₵{plan.price.toFixed(2)}
                            </span>
                            <Link
                              to="/buy"
                              className={`text-xs font-semibold ${cfg.text} ${cfg.bg} px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity`}
                            >
                              Buy Now
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-dark-400">
                    No plans available for{" "}
                    {NETWORK_CONFIG[activeNetwork]?.label || activeNetwork}{" "}
                    right now.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="text-center mt-10">
            <Link to="/buy">
              <Button size="lg" className="shadow-lg shadow-primary-600/20">
                Buy Data Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="h-px w-8 bg-primary-600/50"></div>
              <span className="text-sm font-semibold text-primary-600 tracking-wider uppercase px-3">
                Simple Process
              </span>
              <div className="h-px w-8 bg-primary-600/50"></div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It <span className="text-primary-600">Works</span>
            </h2>
            <p className="text-dark-300 text-lg">
              Get started in 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto mb-16 relative">
            {/* Horizontal connecting line - desktop */}
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-0.5 bg-primary-600/20"></div>
            {/* Vertical connecting line - mobile */}
            <div className="md:hidden absolute top-16 bottom-16 left-1/2 w-0.5 bg-primary-600/20 -translate-x-1/2"></div>

            <StepCard
              number="1"
              title="Choose a Plan"
              description="Select your network and pick the data bundle that suits you"
            />
            <StepCard
              number="2"
              title="Enter Phone Number"
              description="Type the phone number you want to receive the data on"
            />
            <StepCard
              number="3"
              title="Pay & Receive"
              description="Pay securely via Paystack and get your data delivered fastly"
            />
          </div>

          {/* Why Buy From Us */}
          <div className="relative bg-dark-900/80 border border-dark-800 rounded-3xl p-5 sm:p-8 md:p-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-600/3 rounded-full blur-3xl"></div>

            <div className="relative text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-primary-600/10 border border-primary-600/20 rounded-full px-5 py-2.5 mb-6">
                <TrendUp className="w-5 h-5 text-primary-600" weight="bold" />
                <span className="text-sm font-bold text-primary-600 tracking-wide">
                  \n Why PutDuckData?\n{" "}
                </span>
              </div>

              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                The Cheapest Data{" "}
                <span className="text-primary-500">In Ghana</span>
              </h3>
              <p className="text-dark-300 mb-8 text-lg leading-relaxed">
                We offer the most affordable data plans across all networks. No
                middlemen, no hidden charges - just pure savings on every
                purchase.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start space-x-4 text-left">
                  <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle
                      className="w-5 h-5 text-primary-600"
                      weight="fill"
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Lowest Prices
                    </h4>
                    <p className="text-dark-400 text-sm">
                      Get data at prices you won't find anywhere else
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 text-left">
                  <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle
                      className="w-5 h-5 text-primary-600"
                      weight="fill"
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Fast Delivery
                    </h4>
                    <p className="text-dark-400 text-sm">
                      Data delivered to your number within seconds
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 text-left">
                  <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle
                      className="w-5 h-5 text-primary-600"
                      weight="fill"
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      All Networks
                    </h4>
                    <p className="text-dark-400 text-sm">
                      MTN, Telecel, and AirtelTigo supported
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 text-left">
                  <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle
                      className="w-5 h-5 text-primary-600"
                      weight="fill"
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      24/7 Support
                    </h4>
                    <p className="text-dark-400 text-sm">
                      Our team is always available to help you
                    </p>
                  </div>
                </div>
              </div>
              <Link to="/buy">
                <Button
                  size="lg"
                  className="shadow-xl shadow-primary-600/30 hover:scale-105 transition-all duration-300"
                >
                  Buy Data Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="h-px w-8 bg-primary-600/50"></div>
              <span className="text-sm font-semibold text-primary-600 tracking-wider uppercase px-3">
                Why Choose Us
              </span>
              <div className="h-px w-8 bg-primary-600/50"></div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Choose <br className="sm:hidden" />
              <span className="text-primary-600">PutDuckData?</span>
            </h2>
            <p className="text-dark-300 text-lg">
              The most trusted data platform in Ghana
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-6 sm:p-8 hover:border-primary-600/50 hover:bg-dark-900/70 transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary-600 group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Secure Platform
                  </h3>
                  <p className="text-dark-400 text-sm leading-relaxed">
                    Bank-level security with encrypted transactions. Your data
                    and money are 100% safe with us.
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-6 sm:p-8 hover:border-primary-600/50 hover:bg-dark-900/70 transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary-600 group-hover:scale-110 transition-transform duration-300">
                  <Timer className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Fast Delivery
                  </h3>
                  <p className="text-dark-400 text-sm leading-relaxed">
                    Data is delivered to your number within seconds. No delays,
                    no hassles, just fast service.
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-6 sm:p-8 hover:border-primary-600/50 hover:bg-dark-900/70 transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary-600 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    24/7 Support
                  </h3>
                  <p className="text-dark-400 text-sm leading-relaxed">
                    Our support team is always available to help you. Get
                    assistance anytime, any day.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="h-px w-8 bg-primary-600/50"></div>
              <span className="text-sm font-semibold text-primary-600 tracking-wider uppercase px-3">
                FAQ
              </span>
              <div className="h-px w-8 bg-primary-600/50"></div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked{" "}
              <span className="text-primary-600">Questions</span>
            </h2>
            <p className="text-dark-300 text-lg">
              Everything you need to know about PutDuckData
            </p>
          </div>

          <div className="space-y-4">
            <FAQItem
              question="How does PutDuckData work?"
              PutDuckData
              DATA
              HUB
              allows
              you
              to
              buy
              affordable
              data
              bundles
            />
            <FAQItem
              question="How do I fund my wallet?"
              answer="You pay directly via Paystack (credit/debit cards, mobile money) when purchasing data. No wallet or account needed. Payment is secure and fast."
            />
            <FAQItem
              question="How long does data delivery take?"
              answer="Data delivery is typically fast. In rare cases, it may take up to 5 minutes. If you don't receive your data within this time, please contact our 24/7 support team."
            />
            <FAQItem
              question="Is my payment information secure?"
              answer="Absolutely! We use Paystack for payment processing, which employs bank-level encryption. We never store your card details. All transactions are secured with SSL/TLS encryption, and we implement multiple security layers to protect your data."
            />
            <FAQItem
              question="Can I get a refund?"
              answer="Refunds are only issued for failed data deliveries where data was not received. Refund requests must be submitted within 24 hours of the transaction. Refunds are processed to your wallet balance within 1-3 business days."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept credit cards, debit cards, and mobile money through Paystack for fast credit. All major card networks are supported including Visa, Mastercard, and Verve."
            />
          </div>
        </div>
      </section>

      {/* WhatsApp Community Banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-green-600/5 border border-green-500/20 rounded-2xl p-6 sm:p-10 overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/5 rounded-full blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <WhatsappLogo
                  className="w-9 h-9 text-green-400"
                  weight="fill"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  Join Our WhatsApp Community
                </h3>
                <p className="text-dark-300 text-sm leading-relaxed">
                  Get exclusive data deals, fast support, and connect with
                  thousands of users.
                </p>
              </div>
              <a
                href="https://whatsapp.com/channel/0029Vb7aNEuIyPtaHYaiHx1m"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 whitespace-nowrap">
                  Join Channel
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-dark-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            {/* Brand - centered on mobile */}
            <div className="md:col-span-2 text-center md:text-left">
              <img
                src="/logo/logo.png"
                alt="PutDuckData"
                className="h-20 sm:h-24 md:h-28 mb-2 mx-auto md:mx-0 lg:-ml-1"
              />
              <p className="text-dark-400 text-sm leading-relaxed mb-6 max-w-md mx-auto md:mx-0">
                Ghana's most trusted platform for buying affordable data bundles
                at the cheapest prices.
              </p>
              <div className="flex items-center justify-center md:justify-start space-x-4">
                <div className="flex items-center space-x-2 text-xs text-dark-500">
                  <ShieldCheck className="w-4 h-4" weight="fill" />
                  <span>Secure Platform</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-dark-500">
                  <Timer className="w-4 h-4" weight="fill" />
                  <span>Fast Delivery</span>
                </div>
              </div>
            </div>

            {/* Quick Links + Support - side by side on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-6 md:gap-0 md:contents">
              {/* Quick Links */}
              <div className="text-center md:text-left">
                <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                  Quick Links
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link
                      to="/buy"
                      className="text-dark-400 hover:text-primary-600 text-sm transition-colors"
                    >
                      Buy Data
                    </Link>
                  </li>
                  <li>
                    <a
                      href="#features"
                      className="text-dark-400 hover:text-primary-600 text-sm transition-colors"
                    >
                      Features
                    </a>
                  </li>
                  <li>
                    <a
                      href="#how-it-works"
                      className="text-dark-400 hover:text-primary-600 text-sm transition-colors"
                    >
                      How It Works
                    </a>
                  </li>
                </ul>
              </div>

              {/* Support */}
              <div className="text-center md:text-left">
                <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                  Support
                </h3>
                <ul className="space-y-3">
                  <li className="text-dark-400 text-sm">
                    24/7 Customer Service
                  </li>
                  <li>
                    <a
                      href="tel:0558638899"
                      className="text-dark-400 hover:text-primary-600 text-sm transition-colors"
                    >
                      0558638899
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://whatsapp.com/channel/0029Vb7aNEuIyPtaHYaiHx1m"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dark-400 hover:text-primary-600 text-sm transition-colors"
                    >
                      WhatsApp Channel
                    </a>
                  </li>
                  <li className="text-dark-400 text-sm">Accra, Ghana</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-dark-800/50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-dark-500 text-sm">
                &copy; 2026 PutDuckData. All rights reserved.
              </p>
              <div className="flex items-center space-x-6 text-sm text-dark-500">
                <Link
                  to="/privacy-policy"
                  className="hover:text-primary-600 transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms-of-service"
                  className="hover:text-primary-600 transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-dark-600 text-xs">
                &copy; {new Date().getFullYear()} PutDuckData. All rights
                reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="group relative bg-dark-900/60 backdrop-blur-sm border border-dark-800 rounded-2xl p-6 sm:p-8 hover:border-primary-600/50 transition-all duration-300 overflow-hidden">
    <div className="relative flex items-start space-x-4">
      <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary-600 group-hover:scale-110 transition-all duration-300">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary-600 transition-colors">
          {title}
        </h3>
        <p className="text-dark-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

const StepCard = ({ number, title, description }) => (
  <div className="relative text-center group">
    <div className="bg-dark-900/60 md:bg-transparent border border-dark-800/50 md:border-0 rounded-2xl p-6 md:p-0">
      <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-600/30 group-hover:scale-110 transition-all duration-300 relative z-10">
        <span className="text-2xl font-bold text-white">{number}</span>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-primary-600 transition-colors">
        {title}
      </h3>
      <p className="text-dark-400 leading-relaxed text-sm md:text-base">
        {description}
      </p>
    </div>
  </div>
);

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-xl overflow-hidden hover:border-dark-700 transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <h3 className="text-lg font-semibold text-white pr-4">{question}</h3>
        <div className="flex-shrink-0">
          {isOpen ? (
            <Minus className="w-5 h-5 text-primary-600" />
          ) : (
            <Plus className="w-5 h-5 text-primary-600" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-6 pb-6">
          <p className="text-dark-300 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

const ScrollArrow = () => {
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      setAtBottom(scrollTop + windowHeight >= docHeight - 100);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    if (atBottom) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg shadow-primary-600/30 flex items-center justify-center transition-all hover:scale-110"
      aria-label={atBottom ? "Scroll to top" : "Scroll to bottom"}
    >
      {atBottom ? (
        <CaretUp className="w-5 h-5" weight="bold" />
      ) : (
        <CaretDown className="w-5 h-5" weight="bold" />
      )}
    </button>
  );
};

export default Landing;
