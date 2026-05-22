import { create } from "zustand";

const useSiteSettingsStore = create((set) => ({
  validityLabel: "Non-Expiring",
  setValidityLabel: (label) => set({ validityLabel: label ?? "" }),
}));

export default useSiteSettingsStore;
