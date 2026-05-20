import { create } from "zustand";
import api from "../utils/api";

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem("user")) || null,
  token: localStorage.getItem("token") || null,
  loading: false,
  error: null,

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },

  setToken: (token) => {
    localStorage.setItem("token", token);
    set({ token });
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/auth-register", data);
      // Response is already unwrapped by interceptor
      const { user, token } = response.data || response;
      get().setUser(user);
      get().setToken(token);
      set({ loading: false });
      return { success: true, user, token };
    } catch (error) {
      set({ loading: false, error: error.message || "Registration failed" });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/auth-login", { email, password });
      // Response is already unwrapped by interceptor
      const { user, token } = response.data || response;
      get().setUser(user);
      get().setToken(token);
      set({ loading: false });
      return { success: true, user, token };
    } catch (error) {
      set({ loading: false, error: error.message || "Login failed" });
      throw error;
    }
  },

  clearAllStorage: () => {
    // Remove all known localStorage keys
    const localKeys = ["user", "token", "pdd_avatar", "showBalance"];
    localKeys.forEach((k) => localStorage.removeItem(k));
    // Remove all known sessionStorage keys
    const sessionKeys = [
      "pdd_plans_cache",
      "pdd_plans_cache_reseller",
      "pdd_plans_cache_customer",
      "pdd_guest_plans_cache",
    ];
    sessionKeys.forEach((k) => sessionStorage.removeItem(k));
  },

  logout: async () => {
    try {
      await api.post("/auth-logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    get().clearAllStorage();
    set({ user: null, token: null });
  },

  refreshUser: async () => {
    try {
      const response = await api.get("/auth-verify");
      const d = response.data || response;
      if (d.user) {
        get().setUser(d.user);
      }
    } catch (error) {
      console.error("Refresh user error:", error);
      // Only logout on 401, not on network errors
      if (error.status === 401 || error.statusCode === 401) {
        get().logout();
      }
    }
  },
}));

export default useAuthStore;
