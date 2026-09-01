import { useEffect, useState } from "react";
import { checkDuplicate } from "../../api/services/ApiCustomInvestigation";

const DEBOUNCE_MS = 400;

/**
 * Debounced wrapper around GET /custom-lab-tests/check-duplicate. This is a UX
 * aid only — the backend's create/update endpoints enforce both checks
 * independently regardless of what this returns (see backend contract §5-6).
 *
 * status: 'idle' (name empty / skipped) | 'checking' | 'clear' | 'warning'
 * (custom_duplicate — dismissible) | 'blocked' (global_master — not dismissible,
 * the caller must disable submit while this is active).
 */
export function useDuplicateCheck(name, { skip = false } = {}) {
  const [state, setState] = useState({ status: "idle", reason: null, existing: null });
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    setAcknowledged(false);
    const trimmed = name.trim();
    if (skip || !trimmed) {
      setState({ status: "idle", reason: null, existing: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, status: "checking" }));
    const timer = setTimeout(async () => {
      try {
        const res = await checkDuplicate(trimmed);
        if (cancelled) return;
        if (res?.blocked) {
          setState({ status: "blocked", reason: res.reason, existing: res.existing });
        } else if (res?.reason === "custom_duplicate") {
          setState({ status: "warning", reason: res.reason, existing: res.existing });
        } else {
          setState({ status: "clear", reason: null, existing: null });
        }
      } catch (error) {
        // Fail open — this is a UX aid; the real create/update call still
        // enforces the check server-side regardless.
        console.warn("checkDuplicate failed, proceeding without a hint:", error);
        if (!cancelled) setState({ status: "clear", reason: null, existing: null });
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, skip]);

  return { ...state, acknowledged, acknowledge: () => setAcknowledged(true) };
}
