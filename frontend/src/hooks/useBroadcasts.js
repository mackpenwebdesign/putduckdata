import { useState, useEffect } from "react";
import api from "../utils/api.js";

const DISMISSED_KEY = "pdd_dismissed_broadcasts";

/**
 * Hook for admin broadcast popups.
 * Shows once per session — clears when the tab/browser is closed.
 */
export const useBroadcasts = (isGuest = false) => {
  const [broadcast, setBroadcast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      try {
        setLoading(true);
        const endpoint = isGuest
          ? "/broadcasts-active?guest=true"
          : "/broadcasts-active";
        const { data } = await api.get(endpoint);

        const latest = data?.broadcasts?.[0] || null;

        if (!latest) {
          setBroadcast(null);
          return;
        }

        // Show once per session — dismissed IDs live in sessionStorage
        const dismissed = JSON.parse(
          sessionStorage.getItem(DISMISSED_KEY) || "[]"
        );
        setBroadcast(dismissed.includes(latest.id) ? null : latest);
      } catch (err) {
        console.error("Broadcast fetch error:", err);
        setBroadcast(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBroadcasts();

    // Poll every 60s for new broadcasts
    const interval = setInterval(fetchBroadcasts, 60000);
    return () => clearInterval(interval);
  }, [isGuest]);

  const dismiss = (id) => {
    const dismissed = JSON.parse(
      sessionStorage.getItem(DISMISSED_KEY) || "[]"
    );
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    }
    setBroadcast(null);
  };

  return { broadcast, loading, dismiss };
};
