"use client";

/**
 * RxExtrasContext — holds the structured Follow-up + Referral a doctor enters
 * from the blue sidebar in the handwriting flows (TabRx today; SnapRx /
 * SmartSync later), where there's no RxPad form to host them.
 *
 * The provider wraps the flow; the sidebar's Follow-ups / Referral content
 * panels read & write it, and the flow's print/preview renders it as a
 * structured block beneath the handwritten pages.
 *
 * `useRxExtras()` returns a safe no-op default when no provider is mounted, so
 * the same sidebar content components can be imported by VoiceRx/TypeRx
 * without crashing (those flows just never render the extra tabs).
 */

import { createContext, useContext, useMemo, useState } from "react";
import { EMPTY_REFERRAL, defaultReferral } from "./referral/referral-data";

const DEFAULT = {
  followUpDate: "",
  setFollowUpDate: () => {},
  referral: EMPTY_REFERRAL,
  setReferral: () => {},
};

const RxExtrasContext = createContext(DEFAULT);

export function RxExtrasProvider({ children }) {
  const [followUpDate, setFollowUpDate] = useState("");
  const [referral, setReferral] = useState(defaultReferral);

  const value = useMemo(
    () => ({ followUpDate, setFollowUpDate, referral, setReferral }),
    [followUpDate, referral]
  );

  return <RxExtrasContext.Provider value={value}>{children}</RxExtrasContext.Provider>;
}

export function useRxExtras() {
  return useContext(RxExtrasContext);
}
