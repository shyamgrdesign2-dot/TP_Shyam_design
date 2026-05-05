"use client";

import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";



/**
 * HistoricalNewDataBanner — now a no-op.
 *
 * Previously this rendered the orange "Review & update from VoiceRx"
 * chip on top of each historical section (History, Vitals, Growth,
 * Vaccine, Ophthal, Gynec, Obstetric, Personal Notes, etc.). Per design
 * feedback we now rely solely on the unseen red dot indicator on the
 * nav rail to signal new voice-landed content; no in-panel banner.
 *
 * Kept as an exported component so every content-panel import still
 * resolves — it just renders nothing.
 */
export function HistoricalNewDataBanner(_props) {
  // Register with the sync context so consumers that depend on this
  // component being in the React tree keep working.
  useRxPadSync();
  return null;
}