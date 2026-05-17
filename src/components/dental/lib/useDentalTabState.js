import { useEffect, useState } from "react";

/** Persists the active dental module tab per patient across sessions. */
export function useDentalTabState(patientId) {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = window.localStorage.getItem(`dental.module.active-tab.${patientId}`);
      if (saved === "examination" || saved === "plan") return saved;
    } catch (_) {
      // ignore — SSR or private-browsing
    }
    return "examination";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(`dental.module.active-tab.${patientId}`, activeTab);
    } catch (_) {
      // ignore
    }
  }, [activeTab, patientId]);

  return [activeTab, setActiveTab];
}
