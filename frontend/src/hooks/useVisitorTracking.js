/**
 * useVisitorTracking
 *
 * Drop this hook into your App.jsx (or any top-level layout).
 * It fires once per page navigation and assigns a persistent
 * anonymous visitor_id via localStorage so we can count unique visitors.
 *
 * Usage:
 *   import useVisitorTracking from "./hooks/useVisitorTracking";
 *   // inside App or Layout component:
 *   useVisitorTracking();
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../utils/api";

const VISITOR_KEY = "pdd_visitor_id";

/** Generate a random ID and persist it in localStorage */
const getOrCreateVisitorId = () => {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
};

const useVisitorTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();

    // Fire-and-forget — never await, never throw to the UI
    api
      .post("/track-visit", {
        visitor_id: visitorId,
        page: location.pathname,
      })
      .catch(() => {
        // Silently ignore — tracking should never affect the user experience
      });
  }, [location.pathname]); // re-fires on every route change
};

export default useVisitorTracking;
