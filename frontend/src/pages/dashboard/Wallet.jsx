import { useState } from "react";
import {
  Wallet as WalletIcon,
  Plus,
  Smartphone,
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  Clock,
  CheckCircle,
} from "lucide-react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import useAuthStore from "../../stores/authStore";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/formatters";
import { toast } from "react-hot-toast";

const Wallet = () => {
  const { user } = useAuthStore();
  const [amount, setAmount] = useState("");
  const [momoPhone, setMomoPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showBal, setShowBal] = useState(true);

  const handleFundWallet = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 10) {
      toast.error("Minimum funding amount is GH₵10");
      return;
    }
    if (!momoPhone || !/^0\d{9}$/.test(momoPhone)) {
      toast.error("Enter a valid 10-digit MoMo number (starts with 0)");
      return;
    }
    setLoading(true);
    try {
      await api.post("/momo-payment-submit", {
        amount: parseFloat(amount),
        phone_number: momoPhone,
        transaction_type: "wallet_fund",
      });
      setSubmitted(true);
      toast.success("MoMo request submitted! Admin will approve shortly.");
    } catch (error) {
      toast.error(error.error || "Failed to submit MoMo request");
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [10, 20, 50, 100, 200, 500];

  const amt = parseFloat(amount);
  const hasValidAmount = amount && amt >= 10;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Wallet</h1>
        <p className="text-dark-400 text-sm mt-0.5">
          Fund your account via Mobile Money
        </p>
      </div>

      {/* Balance Card */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-7"
        style={{
          background:
            "linear-gradient(135deg, #dc2626 0%, #b91c1c 55%, #991b1b 100%)",
        }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-14 -left-8 w-40 h-40 rounded-full bg-black/15" />
        <div className="absolute top-1/2 right-16 w-20 h-20 rounded-full bg-white/5 -translate-y-1/2" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                <WalletIcon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white/70 text-xs font-medium uppercase tracking-widest">
                Available Balance
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {showBal ? formatCurrency(user?.wallet_balance || 0) : "GH₵ ••••"}
            </h2>
            <p className="text-white/50 text-xs mt-1">PutDuckData Wallet</p>
          </div>
          <button
            onClick={() => setShowBal(!showBal)}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all"
          >
            {showBal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative z-10 flex items-center gap-4 mt-4 pt-4 border-t border-white/15">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-white/75 text-xs">Fast credit</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/30" />
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-green-300" />
            <span className="text-white/75 text-xs">Secure MoMo payment</span>
          </div>
        </div>
      </div>

      {/* Fund Form + How it Works */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* MoMo Form */}
        <div className="lg:col-span-3 bg-dark-900/80 border border-dark-800 rounded-2xl p-5 sm:p-6">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Request Submitted!</h3>
                <p className="text-dark-400 text-sm mt-1">
                  Your MoMo funding request of{" "}
                  <span className="text-primary-400 font-medium">{formatCurrency(parseFloat(amount))}</span>{" "}
                  has been sent. An admin will approve and credit your wallet shortly.
                </p>
              </div>
              <button
                onClick={() => { setSubmitted(false); setAmount(""); setMomoPhone(""); }}
                className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Fund via Mobile Money</h3>
                  <p className="text-dark-500 text-xs">MTN MoMo · Telecel Cash · AT Money</p>
                </div>
              </div>

              <form onSubmit={handleFundWallet} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Amount (GH₵)
                  </label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (min GH₵10)"
                    min="10"
                    step="0.01"
                    required
                  />
                </div>

                {/* Quick amounts */}
                <div>
                  <p className="text-xs text-dark-500 font-medium mb-2">Quick amounts</p>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(q.toString())}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          amount === q.toString()
                            ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-900/30"
                            : "bg-dark-800/40 border-dark-700/50 text-dark-300 hover:border-primary-600/40 hover:text-primary-400"
                        }`}
                      >
                        GH₵{q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Your MoMo Number
                  </label>
                  <Input
                    type="tel"
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="e.g. 0551234567"
                    maxLength={10}
                    required
                  />
                  <p className="text-dark-600 text-xs mt-1">
                    The number you'll send payment from
                  </p>
                </div>

                {hasValidAmount && (
                  <div className="bg-dark-800/40 border border-dark-700/40 rounded-xl px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-dark-400">Amount to credit</span>
                      <span className="text-white font-medium">{formatCurrency(amt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-dark-400">Transaction fee</span>
                      <span className="text-green-400">Free</span>
                    </div>
                    <div className="h-px bg-dark-700/50 my-0.5" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-dark-300 font-medium">You send via MoMo</span>
                      <span className="text-white font-bold">{formatCurrency(amt)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !hasValidAmount || !momoPhone}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm !text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                  style={{
                    background:
                      hasValidAmount && !loading
                        ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                        : undefined,
                    backgroundColor: !hasValidAmount || loading ? "#b91c1c" : undefined,
                    boxShadow:
                      hasValidAmount && !loading
                        ? "0 4px 20px rgba(194,65,12,0.35)"
                        : "none",
                  }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Submit MoMo Request
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* How it Works */}
        <div className="lg:col-span-2 bg-dark-900/80 border border-dark-800 rounded-2xl p-5 sm:p-6 flex flex-col">
          <h3 className="text-white font-semibold mb-5">How it works</h3>
          <div className="space-y-4 flex-1">
            {[
              {
                step: "1",
                title: "Enter Amount & Number",
                desc: "Choose amount and enter your MoMo number (min GH₵10)",
                color: "from-primary-600 to-primary-700",
              },
              {
                step: "2",
                title: "Send Payment",
                desc: "Send the exact amount to our MoMo number: 0322291381",
                color: "from-primary-700 to-primary-800",
              },
              {
                step: "3",
                title: "Wallet Credited",
                desc: "Admin confirms and your balance is updated instantly",
                color: "from-green-600 to-green-700",
              },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 bg-gradient-to-br ${s.color} rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-md`}
                >
                  {s.step}
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">{s.title}</h4>
                  <p className="text-dark-500 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-dark-800/50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-dark-400 text-xs">
              Approval usually within a few minutes during business hours
            </p>
          </div>
        </div>
      </div>

      {/* Accepted MoMo Networks */}
      <div>
        <h2 className="text-xs font-semibold text-dark-500 mb-3 uppercase tracking-widest">
          Accepted Networks
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "MTN MoMo", sub: "Mobile Money", color: "text-yellow-400", bg: "bg-yellow-500/8" },
            { label: "Telecel Cash", sub: "Mobile Money", color: "text-red-400", bg: "bg-red-500/8" },
            { label: "AT Money", sub: "AirtelTigo", color: "text-blue-400", bg: "bg-blue-500/8" },
          ].map((m, i) => (
            <div
              key={i}
              className="bg-dark-900/80 border border-dark-800 rounded-xl p-3.5 flex items-center gap-3"
            >
              <div className={`w-8 h-8 ${m.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Smartphone className={`w-4 h-4 ${m.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{m.label}</p>
                <p className="text-dark-500 text-[10px]">{m.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
