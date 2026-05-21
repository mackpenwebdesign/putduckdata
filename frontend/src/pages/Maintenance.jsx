import { useState, useEffect } from "react";
import {
  Wrench,
  Clock,
  Phone,
  MessageCircle,
  Shield,
  Activity,
  Database,
} from "lucide-react";

const Maintenance = ({ message, scheduledEnd }) => {
  const isClosedForDay =
    message?.toLowerCase()?.includes("closed") ||
    message?.toLowerCase()?.includes("close for");

  // Live countdown timer
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!scheduledEnd) return;
    const tick = () => {
      const diff = new Date(scheduledEnd) - new Date();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledEnd]);

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4 py-10 overflow-hidden relative">
      {/* Background decoration — fills the dark space on large screens */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large soft glows */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-yellow-500/[0.06] rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-[450px] h-[450px] bg-primary-600/[0.07] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-primary-500/[0.04] rounded-full blur-[100px]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating dots on large screens */}
        <div className="hidden lg:block absolute top-20 left-[15%] w-2 h-2 bg-yellow-500/20 rounded-full animate-pulse" />
        <div
          className="hidden lg:block absolute top-40 right-[20%] w-3 h-3 bg-primary-500/15 rounded-full animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="hidden lg:block absolute bottom-32 left-[25%] w-2.5 h-2.5 bg-primary-400/15 rounded-full animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="hidden lg:block absolute bottom-48 right-[15%] w-2 h-2 bg-yellow-400/20 rounded-full animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="hidden lg:block absolute top-1/2 left-[8%] w-1.5 h-1.5 bg-primary-400/20 rounded-full animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="hidden lg:block absolute top-1/3 right-[8%] w-2 h-2 bg-primary-400/15 rounded-full animate-pulse"
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* Main content — wider on large screens using two-column layout */}
      <div className="relative w-full max-w-3xl mx-auto">
        <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-center">
          {/* Left column — visible only on large screens */}
          <div className="hidden lg:flex lg:col-span-2 flex-col items-center gap-6">
            {/* Big wrench icon */}
            <div className="relative">
              <div
                className="absolute inset-0 w-36 h-36 rounded-full border border-yellow-500/10 animate-[spin_15s_linear_infinite] m-auto"
                style={{
                  top: "-18px",
                  left: "-18px",
                  right: "-18px",
                  bottom: "-18px",
                }}
              />
              <div className="w-28 h-28 rounded-3xl bg-yellow-500/10 border border-yellow-500/15 flex items-center justify-center">
                <Wrench className="w-14 h-14 text-yellow-400/80" />
              </div>
            </div>

            {/* Assurance cards stacked */}
            <div className="space-y-2.5 w-full">
              {[
                {
                  icon: Shield,
                  text: "Wallet balance is safe",
                  color: "text-primary-400",
                },
                {
                  icon: Activity,
                  text: "Pending orders will process",
                  color: "text-blue-400",
                },
                {
                  icon: Database,
                  text: "No data will be lost",
                  color: "text-primary-400",
                },
              ].map(({ icon: Icon, text, color }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
                >
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <span className="text-dark-300 text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right / main column */}
          <div className="lg:col-span-3 text-center lg:text-left space-y-5">
            {/* Mobile-only icon */}
            <div className="flex lg:hidden justify-center mb-2">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full border border-yellow-500/10 animate-[spin_12s_linear_infinite]" />
                <div className="w-18 h-18 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center p-4">
                  <Wrench className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500" />
              </span>
              <span className="text-yellow-400/80 text-sm font-medium tracking-wide uppercase">
                {isClosedForDay
                  ? "Closed for today"
                  : "Maintenance in progress"}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              {isClosedForDay
                ? "We'll Be\nBack Tomorrow"
                : "We'll Be\nBack Soon"}
            </h1>

            {/* Message */}
            <div className="bg-white/[0.04] backdrop-blur border border-white/[0.07] rounded-2xl p-5">
              <p className="text-dark-200 text-base leading-relaxed">
                {message ||
                  "We are currently performing scheduled maintenance. We'll be back shortly!"}
              </p>
            </div>

            {/* Countdown timer */}
            {timeLeft && (
              <div className="bg-white/[0.04] backdrop-blur border border-primary-600/20 rounded-2xl p-4">
                <p className="text-dark-500 text-xs font-medium uppercase tracking-wider mb-3 text-center lg:text-left">
                  Estimated time remaining
                </p>
                <div className="flex items-center justify-center lg:justify-start gap-3">
                  {[
                    { val: timeLeft.h, label: "Hours" },
                    { val: timeLeft.m, label: "Min" },
                    { val: timeLeft.s, label: "Sec" },
                  ].map(({ val, label }) => (
                    <div key={label} className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/[0.05] border border-white/[0.08] rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-bold text-white tabular-nums">
                          {String(val).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="text-dark-500 text-[10px] mt-1.5 uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled end (no countdown) */}
            {scheduledEnd && !timeLeft && (
              <div className="flex items-center gap-3 justify-center lg:justify-start bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <p className="text-dark-300 text-sm">
                  Expected back by{" "}
                  <span className="text-white font-semibold">
                    {new Date(scheduledEnd).toLocaleString()}
                  </span>
                </p>
              </div>
            )}

            {/* Mobile-only assurance pills */}
            <div className="flex lg:hidden flex-wrap items-center justify-center gap-2">
              {["Wallet is safe", "Orders will process", "No data lost"].map(
                (text) => (
                  <span
                    key={text}
                    className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3.5 py-1.5 text-xs text-dark-300"
                  >
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0" />
                    {text}
                  </span>
                )
              )}
            </div>

            {/* Contact */}
            <div className="pt-1 space-y-3">
              <p className="text-dark-600 text-xs font-medium uppercase tracking-wider">
                Need urgent help?
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5">
                <a
                  href="tel:0558638899"
                  className="group flex items-center justify-center gap-2.5 bg-white/[0.04] border border-white/[0.07] hover:border-primary-600/40 rounded-xl px-5 py-3 text-sm text-dark-400 hover:text-white transition-all"
                >
                  <Phone className="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" />
                  0558638899
                </a>
                <a
                  href="https://whatsapp.com/channel/0029Vb7aNEuIyPtaHYaiHx1m"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-2.5 bg-white/[0.04] border border-white/[0.07] hover:border-primary-600/40 rounded-xl px-5 py-3 text-sm text-dark-400 hover:text-white transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" />
                  WhatsApp Channel
                </a>
              </div>
            </div>

            {/* Footer */}
            <p className="text-dark-700 text-[10px] pt-2">
              PutDuckData &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
