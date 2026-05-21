import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  RefreshCw,
} from "lucide-react";
import Button from "../components/Button";
import useAuthStore from "../stores/authStore";
import api from "../utils/api";
import { formatCurrency } from "../utils/formatters";

const PaymentVerify = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const isGuest =
    searchParams.get("guest") === "true" ||
    searchParams.get("type") === "guest_afa";
  const isAfa =
    searchParams.get("type") === "afa" ||
    searchParams.get("type") === "guest_afa";
  const { refreshUser, token } = useAuthStore();

  const [status, setStatus] = useState("verifying");
  const [paymentData, setPaymentData] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // ─── Give the auth store a moment to rehydrate from localStorage ───────────
  useEffect(() => {
    const t = setTimeout(() => setAuthReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  // ─── Auto-redirect after success (authenticated users only) ────────────────
  useEffect(() => {
    if (status !== "success" || isGuest) return;
    const dest = isAfa ? "/dashboard/afa/form" : "/dashboard/wallet";
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate(dest);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, isGuest, isAfa, navigate]);

  // ─── Shared helper: resolve a raw error to a human-readable string ─────────
  const resolveErrMsg = (err) =>
    err?.response?.data?.message || err?.data?.message || err?.message || "";

  // ─── Guest verification (extracted once, reused everywhere) ────────────────
  const runGuestVerify = useCallback(async () => {
    if (!reference) {
      setStatus("failed");
      return;
    }
    setStatus("verifying");
    try {
      const response = await api.get(
        `/payment-verify?reference=${encodeURIComponent(reference)}&guest=true`
      );
      const d = response.data ?? response;
      const msg = (d?.message || "").toLowerCase();

      if (d.status === "success" || d.status === "already_verified") {
        setStatus("success");
        setPaymentData(d);
      } else if (d.status === "pending" || msg.includes("pending")) {
        setStatus("pending");
      } else if (msg.includes("abandoned")) {
        setStatus("abandoned");
      } else if (d.status === "failed") {
        // "failed" from our verifier often just means Paystack hasn't
        // confirmed yet — treat as "not confirmed" rather than hard failure
        // so the user has a clear path to retry.
        setStatus("not_confirmed");
      } else {
        setStatus("not_confirmed");
      }
    } catch (err) {
      const errMsg = resolveErrMsg(err).toLowerCase();
      if (errMsg.includes("abandoned")) {
        setStatus("abandoned");
      } else if (errMsg.includes("pending")) {
        setStatus("pending");
      } else {
        // Network/server error — show a recoverable state, not a hard failure
        setStatus("not_confirmed");
      }
    }
  }, [reference]);

  // ─── Primary verification effect ───────────────────────────────────────────
  useEffect(() => {
    if (!authReady) return;

    if (!reference) {
      setStatus("failed");
      return;
    }

    if (isGuest) {
      runGuestVerify();
      return;
    }

    if (!token) {
      setStatus("no_auth");
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await api.get(
          `/payment-verify?reference=${encodeURIComponent(reference)}`
        );
        const d = response.data ?? response;
        const msg = (d?.message || "").toLowerCase();

        if (d.status === "success" || d.status === "already_verified") {
          setStatus("success");
          setPaymentData(d);
          refreshUser?.();
        } else if (d.status === "pending" || msg.includes("pending")) {
          setStatus("pending");
        } else if (msg.includes("abandoned")) {
          setStatus("abandoned");
        } else {
          // For authenticated users keep a strict failed state — their wallet
          // is NOT credited until we confirm success.
          setStatus("failed");
        }
      } catch (error) {
        const errMsg = resolveErrMsg(error).toLowerCase();
        if (errMsg.includes("abandoned")) {
          setStatus("abandoned");
        } else if (errMsg.includes("pending")) {
          setStatus("pending");
        } else {
          setStatus("failed");
        }
      }
    };

    verifyPayment();
  }, [reference, refreshUser, token, isGuest, authReady, runGuestVerify]);

  // ─── Receipt download ───────────────────────────────────────────────────────
  const downloadReceipt = () => {
    const lines = [
      "═══════════════════════════════════",
      "         DATA AGENT RECEIPT         ",
      "═══════════════════════════════════",
      "",
      `Date:       ${new Date().toLocaleString("en-GH", {
        dateStyle: "full",
        timeStyle: "short",
      })}`,
      `Reference:  ${reference || "N/A"}`,
      `Status:     ${status === "success" ? "Successful" : "Pending"}`,
      "",
      "───────────────────────────────────",
      "",
      ...(paymentData?.amount
        ? [`Amount: ${formatCurrency(paymentData.amount)}`]
        : []),
      ...(paymentData?.new_balance !== undefined
        ? [`New Balance: ${formatCurrency(paymentData.new_balance)}`]
        : []),
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
    a.download = `DataAgent_Receipt_${reference || "payment"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <Link to="/">
            <img
              src="/logo/logo.png"
              alt="PutDuckData"
              className="h-16 mx-auto mb-4"
            />
          </Link>
        </div>

        <div className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-8 shadow-xl text-center">
          {/* ── VERIFYING ── */}
          {status === "verifying" && (
            <>
              <div className="w-20 h-20 bg-primary-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Verifying Payment
              </h2>
              <p className="text-dark-400 text-sm">
                Please wait while we confirm your payment…
              </p>
            </>
          )}

          {/* ── SUCCESS ── */}
          {status === "success" && (
            <>
              <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Successful
              </h2>
              <p className="text-dark-400 text-sm mb-2">
                {isGuest
                  ? isAfa
                    ? "AFA registration submitted to admin. Processing within 24 h. Track with your reference."
                    : "Your data purchase is being processed. You will receive your data shortly."
                  : "Your wallet has been credited successfully."}
              </p>
              {!isGuest && countdown !== null && (
                <p className="text-primary-400 text-xs mb-4">
                  Redirecting to wallet in {countdown}s…
                </p>
              )}

              {paymentData && (
                <div className="bg-dark-800/50 rounded-xl p-5 mb-6 space-y-3">
                  {paymentData.amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">Amount:</span>
                      <span className="text-white font-bold text-lg">
                        {formatCurrency(paymentData.amount)}
                      </span>
                    </div>
                  )}
                  {paymentData.new_balance !== undefined && (
                    <div className="flex justify-between text-sm pt-3 border-t border-dark-700">
                      <span className="text-dark-400">New Balance:</span>
                      <span className="text-primary-400 font-bold">
                        {formatCurrency(paymentData.new_balance)}
                      </span>
                    </div>
                  )}
                  {reference && (
                    <div className="flex justify-between text-sm pt-3 border-t border-dark-700">
                      <span className="text-dark-400">Reference:</span>
                      <span className="text-dark-300 font-mono text-xs">
                        {reference}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  fullWidth
                  variant="outline"
                  onClick={downloadReceipt}
                  className="border-dark-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </Button>
                {isGuest ? (
                  <div className="flex flex-col gap-3">
                    <Button
                      fullWidth
                      onClick={() =>
                        navigate(
                          `/track-order${reference ? `?ref=${reference}` : ""}`
                        )
                      }
                      variant="outline"
                      className="border-dark-700"
                    >
                      Track My Order
                    </Button>
                    <Button fullWidth onClick={() => navigate("/buy")}>
                      Buy More Data
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => navigate("/dashboard/wallet")}
                    >
                      View Wallet
                    </Button>
                    <Button
                      fullWidth
                      onClick={() => navigate("/dashboard/buy-data")}
                    >
                      Buy Data
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── NO AUTH ── */}
          {status === "no_auth" && (
            <>
              <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Received
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                Your payment has been received. Log in to see your updated
                balance.
              </p>
              <div className="space-y-3">
                <Button
                  fullWidth
                  variant="outline"
                  onClick={downloadReceipt}
                  className="border-dark-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </Button>
                <Button fullWidth onClick={() => navigate("/login")}>
                  Log In to See Balance
                </Button>
              </div>
              <p className="text-dark-500 text-xs mt-4">
                Your wallet is credited automatically. If you don't see the
                credit after logging in, contact support.
              </p>
            </>
          )}

          {/* ── NOT CONFIRMED (guest "failed" — recoverable) ── */}
          {status === "not_confirmed" && (
            <>
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="w-10 h-10 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Confirming Your Payment
              </h2>
              <p className="text-dark-400 text-sm mb-2">
                Your payment is being processed on Paystack's end. If you
                approved the MoMo prompt, your money is safe — tap{" "}
                <span className="text-white font-medium">Check Again</span> in a
                few seconds to refresh the status.
              </p>
              {reference && (
                <p className="text-dark-500 text-xs mb-6">
                  Reference:{" "}
                  <span className="font-mono text-dark-300">{reference}</span>
                </p>
              )}

              <div className="space-y-3">
                {/* Primary: re-run our own verify endpoint */}
                <Button fullWidth onClick={runGuestVerify}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </Button>

                {/* Secondary: open Paystack's own transaction lookup */}
                {reference && (
                  <Button
                    fullWidth
                    variant="outline"
                    className="border-primary-600/40 text-primary-400 hover:bg-primary-600/10"
                    onClick={() =>
                      window.open(
                        `https://paystack.com/pay/verify/${reference}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    Verify on Paystack
                  </Button>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() =>
                      navigate(isGuest ? "/buy" : "/dashboard/wallet")
                    }
                  >
                    {isGuest ? "Try New Payment" : "Back to Wallet"}
                  </Button>
                  {isGuest && reference && (
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => navigate(`/track-order?ref=${reference}`)}
                    >
                      Track Order
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-dark-500 text-xs mt-4">
                Still stuck? Call support:{" "}
                <a
                  href="tel:0558638899"
                  className="text-primary-400 font-semibold"
                >
                  0558638899
                </a>
              </p>
            </>
          )}

          {/* ── HARD FAILED (no reference, or auth user confirmed failed) ── */}
          {status === "failed" && (
            <>
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {!reference ? "No Reference Found" : "Payment Failed"}
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                {!reference
                  ? "No payment reference was found in the link. Please try making a new payment."
                  : "This payment was not successful. No funds have been deducted. Please try again."}
              </p>
              <div className="space-y-3">
                <Button
                  fullWidth
                  onClick={() =>
                    navigate(isGuest ? "/buy" : "/dashboard/buy-data")
                  }
                >
                  Try Again
                </Button>
                {!isGuest && (
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => navigate("/dashboard/wallet")}
                  >
                    Back to Wallet
                  </Button>
                )}
              </div>
              <p className="text-dark-500 text-xs mt-4">
                Need help? Call support:{" "}
                <a
                  href="tel:0558638899"
                  className="text-primary-400 font-semibold"
                >
                  0558638899
                </a>
              </p>
            </>
          )}

          {/* ── ABANDONED ── */}
          {status === "abandoned" && (
            <>
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Not Completed
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                It looks like the Mobile Money prompt was not approved. No money
                was charged. Please try again and enter your OTP when prompted.
              </p>
              <div className="flex gap-3">
                <Button
                  fullWidth
                  onClick={() =>
                    navigate(isGuest ? "/buy" : "/dashboard/buy-data")
                  }
                >
                  Try Again
                </Button>
              </div>
              <p className="text-dark-500 text-xs mt-4">
                Need help? Call support:{" "}
                <a
                  href="tel:0558638899"
                  className="text-primary-400 font-semibold"
                >
                  0558638899
                </a>
              </p>
            </>
          )}

          {/* ── PENDING ── */}
          {status === "pending" && (
            <>
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Waiting for Payment
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                We're waiting for your Mobile Money approval. Please check your
                phone and enter the OTP to complete payment, then tap{" "}
                <span className="text-white font-medium">Check Again</span>.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={
                    isGuest ? runGuestVerify : () => window.location.reload()
                  }
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </Button>
                <Button
                  fullWidth
                  onClick={() =>
                    navigate(isGuest ? "/buy" : "/dashboard/buy-data")
                  }
                >
                  Start Over
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentVerify;
