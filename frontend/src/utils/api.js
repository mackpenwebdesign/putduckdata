import axios from "axios";

// VITE_API_URL should be your Vercel backend URL, e.g. https://datamart-api.vercel.app
// Leave unset (or set to /api) for same-origin / proxy setups
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Public endpoints that should NEVER send an auth token
// (prevents logged-in users from seeing reseller prices on public pages)
const PUBLIC_ENDPOINTS = [
  "data-plans",
  "guest-purchase",
  "guest-order-track",
  "track-visit",
  "health",
  "guest-afa",
  "guest-afa-complete",
];

// Request interceptor - add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const isPublic = PUBLIC_ENDPOINTS.some((ep) => config.url.includes(ep));
    if (token && !isPublic && !config.url.includes("broadcasts-active")) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect on payment verify page (user returning from Paystack)
      const isPaymentVerify =
        window.location.pathname.includes("/payment/verify");
      if (!isPaymentVerify) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    // Handle 503 maintenance mode - broadcast event so App.jsx can react immediately
    if (error.response?.status === 503) {
      window.dispatchEvent(new CustomEvent("maintenance-detected"));
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;
