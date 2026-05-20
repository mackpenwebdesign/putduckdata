import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Download } from "lucide-react";
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

  // Give the auth store a moment to rehydrate from localStorage before checking token
  useEffect(() => {
    const t = setTimeout(() => setAuthReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Auto-redirect after success
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

  useEffect(() => {
    // Wait until auth store has had a chance to rehydrate
    if (!authReady) return;

    if (!reference) {
      setStatus("failed");
      return;
    }

    if (isGuest) {
      const checkResult = (d) => {
        if (d.status === "success" || d.status === "already_verified") {
          setStatus("success");
          setPaymentData(d);
          return true;
        }
        if (d.status === "pending") {
          setStatus("pending");
          return true;
        }
        if (d.status === "failed") {
          setStatus("failed");
          return true;
        }
        // Fallback: check message text for edge cases
        const msg = d?.message || "";
        if (msg.includes("abandoned")) {
          setStatus("abandoned");
          return true;
        }
        if (msg.includes("pending")) {
          setStatus("pending");
          return true;
        }
        return false;
      };

      const verifyGuest = async () => {
        try {
          const response = await api.get(
            `/payment-verify?reference=${encodeURIComponent(
              reference
            )}&guest=true`
          );
          const d = response.data || response;
          if (!checkResult(d)) {
            setStatus("failed");
          }
        } catch (err) {
          // Check for abandonment in error response
          const errMsg = err?.message || err?.data?.message || "";
          if (errMsg.includes("abandoned")) {
            setStatus("abandoned");
            return;
          }
          if (errMsg.includes("pending")) {
            setStatus("pending");
            return;
          }
          // Don't fake success on error — show failed so user knows something went wrong
          console.error("Guest payment verification error:", err);
          setStatus("failed");
        }
      };
      verifyGuest();
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
        const d = response.data || response;
        if (d.status === "success" || d.status === "already_verified") {
          setStatus("success");
          setPaymentData(d);
          if (refreshUser) refreshUser();
        } else if (d.status === "pending") {
          setStatus("pending");
        } else {
          setStatus("failed");
        }
      } catch (error) {
        const errMsg = error?.message || "";
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
  }, [reference, refreshUser, token, isGuest, authReady]);

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
    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DataAgent_Receipt_${reference || "payment"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          {status === "verifying" && (
            <>
              <div className="w-20 h-20 bg-primary-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Verifying Payment
              </h2>
              <p className="text-dark-400 text-sm">
                Please wait while we confirm your payment...
              </p>
            </>
          )}

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
                    ? "AFA registration submitted to admin. Processing within 24h. Track with your reference."
                    : "Your data purchase is being processed. You will receive your data shortly."
                  : "Your wallet has been credited successfully."}
              </p>
              {!isGuest && countdown !== null && (
                <p className="text-primary-400 text-xs mb-4">
                  Redirecting to wallet in {countdown}s...
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

          {status === "failed" && (
            <>
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Failed
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                {!reference
                  ? "No payment reference found. Please try again."
                  : "We could not verify your payment. If money was deducted, please contact support."}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() =>
                    navigate(isGuest ? "/buy" : "/dashboard/wallet")
                  }
                >
                  {isGuest ? "Try Again" : "Back to Wallet"}
                </Button>
                <Button
                  fullWidth
                  onClick={() => navigate(isGuest ? "/" : "/dashboard")}
                >
                  {isGuest ? "Go Home" : "Go to Dashboard"}
                </Button>
              </div>
              <p className="text-dark-500 text-xs mt-4">
                Need help? Contact support:{" "}
                <a
                  href="tel:0322291381"
                  className="text-primary-600 font-semibold"
                >
                  0322291381
                </a>
              </p>
            </>
          )}

          {status === "abandoned" && (
            <>
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Not Completed
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                You did not complete the Mobile Money payment. Please try again
                and complete the OTP on your phone.
              </p>
              <div className="flex gap-3">
                <Button fullWidth onClick={() => navigate("/buy")}>
                  Try Again
                </Button>
              </div>
              <p className="text-dark-500 text-xs mt-4">
                Need help? Contact support:{" "}
                <a
                  href="tel:0322291381"
                  className="text-primary-600 font-semibold"
                >
                  0322291381
                </a>
              </p>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Still Pending
              </h2>
              <p className="text-dark-400 text-sm mb-6">
                Your payment is still pending. Please complete the Mobile Money
                payment on your phone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => window.location.reload()}
                >
                  Check Again
                </Button>
                <Button fullWidth onClick={() => navigate("/buy")}>
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
