"use client";

/**
 * Rx preview store — live in-memory snapshot of the current patient's
 * Rx body, with subscriber pub/sub so the Rx Preview sidebar and the
 * End Visit page re-render the moment any RxPad form changes.
 *
 * - Memory map: patientId → snapshot
 * - Subscribers fire on every publish so consumers via
 *   `useRxPreviewSnapshot(patientId)` stay live.
 * - localStorage backing kept as a side-effect so a refresh still
 *   shows the last preview state for the same patient.
 */

import { useEffect, useState } from "react";

const STORAGE_PREFIX = "tp-rx-preview:";

function getStorageKey(patientId) {
  return `${STORAGE_PREFIX}${patientId || "__patient__"}`;
}

const memory = new Map();
const subscribers = new Map(); // patientId → Set<fn>

function notify(patientId) {
  const set = subscribers.get(patientId);
  if (!set) return;
  const snap = memory.get(patientId) ?? null;
  set.forEach((fn) => {
    try {
      fn(snap);
    } catch {}
  });
}

export function saveRxPreviewSnapshot(patientId, snapshot) {
  memory.set(patientId, snapshot);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        getStorageKey(patientId),
        JSON.stringify(snapshot)
      );
    } catch {}
  }
  notify(patientId);
}

export function loadRxPreviewSnapshot(patientId) {
  if (memory.has(patientId)) return memory.get(patientId);
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(patientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    memory.set(patientId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function subscribeRxPreviewSnapshot(patientId, fn) {
  let set = subscribers.get(patientId);
  if (!set) {
    set = new Set();
    subscribers.set(patientId, set);
  }
  set.add(fn);
  return () => {
    const s = subscribers.get(patientId);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) subscribers.delete(patientId);
  };
}

/** React hook — returns the current snapshot for a patient and re-renders
 *  when it changes (live link from RxPad form → Rx preview).
 *
 *  Initial render returns `null` on both server and client so SSR markup
 *  matches client hydration. The localStorage-backed snapshot is read in
 *  a useEffect after mount.
 */
export function useRxPreviewSnapshot(patientId) {
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    setSnap(loadRxPreviewSnapshot(patientId));
    const unsub = subscribeRxPreviewSnapshot(patientId, (next) => setSnap(next));
    return unsub;
  }, [patientId]);
  return snap;
}
