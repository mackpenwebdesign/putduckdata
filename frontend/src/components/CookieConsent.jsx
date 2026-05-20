import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Shield } from "lucide-react";

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      // Show after a short delay so it doesn't feel intrusive
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "accepted");
    localStorage.setItem("cookie_consent_date", new Date().toISOString());
    setShow(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookie_consent", "declined");
    localStorage.setItem("cookie_consent_date", new Date().toISOString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-2xl mx-auto bg-dark-900 border border-dark-700/80 rounded-2xl shadow-2xl shadow-black/40 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm mb-1">
              Cookie Notice
            </h3>
            <p className="text-dark-400 text-xs leading-relaxed mb-3">
              We use cookies and local storage to keep you logged in and improve
              your experience. By continuing to use PutDuckData, you agree
              to our{" "}
              <Link
                to="/privacy-policy"
                className="text-primary-500 hover:text-primary-400 underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={acceptCookies}
                className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Accept
              </button>
              <button
                onClick={declineCookies}
                className="bg-dark-800 hover:bg-dark-700 text-dark-300 text-xs font-medium px-4 py-2 rounded-lg border border-dark-700 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
          <button
            onClick={declineCookies}
            className="text-dark-500 hover:text-dark-300 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
