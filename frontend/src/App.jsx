import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { useState, useEffect, useRef, useCallback } from "react";

// Components
import LoadingScreen from "./components/LoadingScreen";
import Maintenance from "./pages/Maintenance";
import CookieConsent from "./components/CookieConsent";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PaymentVerify from "./pages/PaymentVerify";
import BuyPage from "./pages/BuyPage";
import TrackOrder from "./pages/TrackOrder";
import GuestLayout from "./pages/GuestLayout";
import Dashboard from "./pages/Dashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ResellerShop from "./pages/ResellerShop";
import GuestAFA from "./pages/GuestAFA";

// Store
import useAuthStore from "./stores/authStore";
import useThemeStore from "./stores/themeStore";
import useSiteSettingsStore from "./stores/siteSettingsStore";

// Utils
import api from "./utils/api";

// Hooks
import useVisitorTracking from "./hooks/useVisitorTracking";
import { useBroadcasts } from "./hooks/useBroadcasts.js";
import BroadcastModal from "./components/BroadcastModal.jsx";
import NotificationModal from "./components/NotificationModal.jsx";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { token } = useAuthStore();
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// ── Inner component so hooks can access the router context ────────────────────
const AppRoutes = ({ maintenance, adminPath }) => {
  useVisitorTracking();

  const { broadcast: userBroadcast, dismiss: dismissUser } =
    useBroadcasts(false);

  const handleUserDismiss = () => {
    if (userBroadcast) dismissUser(userBroadcast.id);
  };

  if (maintenance) {
    return (
      <>
        {userBroadcast && (
          <BroadcastModal notif={userBroadcast} onClose={handleUserDismiss} />
        )}

        <Routes>
          <Route path={adminPath} element={<Login />} />
          <Route path="/payment/verify" element={<PaymentVerify />} />
          <Route
            path="*"
            element={
              <Maintenance
                message={maintenance.message}
                scheduledEnd={maintenance.scheduledEnd}
              />
            }
          />
        </Routes>
      </>
    );
  }

  return (
    <>
      {userBroadcast && (
        <NotificationModal notif={userBroadcast} onClose={handleUserDismiss} />
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/buy" replace />} />
        <Route path="/home" element={<Landing />} />
        <Route
          path="/buy"
          element={
            <GuestLayout>
              <BuyPage />
            </GuestLayout>
          }
        />
        <Route
          path="/track-order"
          element={
            <GuestLayout>
              <TrackOrder />
            </GuestLayout>
          }
        />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        <Route path="/shop/:slug" element={<ResellerShop />} />
        <Route
          path="/guest-afa"
          element={
            <GuestLayout>
              <GuestAFA />
            </GuestLayout>
          }
        />
        <Route path="/payment/verify" element={<PaymentVerify />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
    </>
  );
};

// ── Root App component ────────────────────────────────────────────────────────
function App() {
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(null);
  const { user, token, logout } = useAuthStore();

  const isPaymentVerifyPage =
    window.location.pathname.includes("/payment/verify");

  const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
  const inactivityTimer = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (useAuthStore.getState().token) {
        useAuthStore.getState().logout();
        toast("Session expired due to inactivity. Please log in again.", {
          icon: "🔒",
          duration: 6000,
        });
      }
    }, INACTIVITY_TIMEOUT);
  }, [INACTIVITY_TIMEOUT]);

  useEffect(() => {
    if (isPaymentVerifyPage) return;

    if (!token) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      return;
    }

    resetInactivityTimer();
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, resetInactivityTimer));

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach((evt) =>
        window.removeEventListener(evt, resetInactivityTimer)
      );
    };
  }, [token, resetInactivityTimer, isPaymentVerifyPage]);

  useEffect(() => {
    useThemeStore.getState().initTheme();
  }, []);

  const checkMaintenance = async () => {
    try {
      const res = await api.get("/admin-site-settings");
      const d = res.data || res;
      if (d.maintenance_mode === true) {
        setMaintenance({
          message: d.message || null,
          scheduledEnd: d.scheduled_end || null,
        });
      } else {
        setMaintenance(null);
      }
      if (d.settings?.validity_label) {
        useSiteSettingsStore.getState().setValidityLabel(d.settings.validity_label);
      }
    } catch {
      // If the settings endpoint fails, continue normally
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(false);
      checkMaintenance();
    };
    init();

    const interval = setInterval(checkMaintenance, 15000);
    const onMaintenanceDetected = () => checkMaintenance();
    window.addEventListener("maintenance-detected", onMaintenanceDetected);

    return () => {
      clearInterval(interval);
      window.removeEventListener("maintenance-detected", onMaintenanceDetected);
    };
  }, []);

  const maintenanceNotified = useRef(false);

  useEffect(() => {
    if (isPaymentVerifyPage) return;
    if (maintenance && user && !user.is_admin) {
      if (!maintenanceNotified.current) {
        maintenanceNotified.current = true;
        toast.error(
          maintenance.message ||
            "Site is under maintenance. You have been logged out.",
          { duration: 6000 }
        );
      }
      logout();
    }
    if (!maintenance) {
      maintenanceNotified.current = false;
    }
  }, [maintenance, user, isPaymentVerifyPage]);

  // Swipe-to-dismiss toasts
  useEffect(() => {
    let startY = 0;
    let toastEl = null;
    const onStart = (e) => {
      toastEl = e.target.closest('[class*="go"]');
      if (toastEl) startY = e.touches[0].clientY;
    };
    const onEnd = (e) => {
      if (!toastEl) return;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dy) > 40) toast.dismiss();
      toastEl = null;
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  const adminPath = import.meta.env.VITE_ADMIN_PATH || "/sdh-backstage-2026";

  const toasterProps = {
    position: "top-center",
    containerStyle: { top: 16, left: 8, right: 8 },
    toastOptions: {
      duration: maintenance ? 5000 : 2500,
      style: {
        background: "#1e293b",
        color: "#fff",
        border: "1px solid #dc2626",
        maxWidth: "min(420px, calc(100vw - 1rem))",
        fontSize: "0.875rem",
        wordBreak: "break-word",
        cursor: "pointer",
        touchAction: "pan-y",
      },
      success: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
      error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
    },
  };

  return (
    <BrowserRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Toaster
        {...toasterProps}
        containerClassName="toast-swipe-container"
      />
      <AppRoutes
        maintenance={maintenance && !user?.is_admin ? maintenance : null}
        adminPath={adminPath}
      />
    </BrowserRouter>
  );
}

export default App;
