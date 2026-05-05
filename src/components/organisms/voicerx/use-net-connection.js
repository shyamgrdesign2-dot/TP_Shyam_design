"use client";

import { useEffect, useRef, useState } from "react";










const UNSTABLE_TYPES = new Set(["slow-2g", "2g"]);

/**
 * Network Information `downlink` / `effectiveType` is unreliable in devtools and
 * embedded preview browsers (e.g. false "slow" readings). Only treat explicit 2G
 * labels as slow — do not use downlink heuristics for UX-blocking state.
 */
export function useNetConnection() {
  const [online, setOnline] = useState(true);
  const [info, setInfo] = useState({});
  const offlineEventRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const nav = navigator;
    const refreshInfo = () => {
      const c = nav.connection;
      setInfo({ effectiveType: c?.effectiveType, downlink: c?.downlink });
    };
    const update = () => {
      refreshInfo();
      setOnline(nav.onLine);
    };

    const onOnline = () => {
      offlineEventRef.current = false;
      setOnline(true);
      refreshInfo();
    };
    const onOffline = () => {
      offlineEventRef.current = true;
      setOnline(false);
      refreshInfo();
    };

    update();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const conn = nav.connection;
    conn?.addEventListener?.("change", update);

    // Preview / embedded hosts may leave `navigator.onLine === false` without firing
    // `offline`. If we never observed a real `offline` event, assume connectivity OK.
    const recoverBogusOfflineId = window.setTimeout(() => {
      if (!offlineEventRef.current && typeof navigator !== "undefined" && !navigator.onLine) {
        setOnline(true);
      }
    }, 900);

    return () => {
      window.clearTimeout(recoverBogusOfflineId);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      conn?.removeEventListener?.("change", update);
    };
  }, []);

  const slowConnection = Boolean(info.effectiveType && UNSTABLE_TYPES.has(info.effectiveType));

  const unstable = !online || slowConnection;

  const mbps =
  typeof info.downlink === "number" && info.downlink > 0 ? `${info.downlink.toFixed(1)} Mbps` : "—";

  return { online, info, slowConnection, unstable, mbps };
}