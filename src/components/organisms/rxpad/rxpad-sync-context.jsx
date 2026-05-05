"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
























































/** One batch of lines synced into a historical sidebar section (from RxPad or sidebar edits). */

















/** Input shape for {@link pushHistoricalUpdates}. */































































































const RxPadSyncContext = createContext({
  lastCopyRequest: null,
  lastSignal: null,
  requestCopyToRxPad: () => {},
  publishSignal: () => {},
  patientAllergies: [],
  setPatientAllergies: () => {},
  aiFillInProgress: false,
  setAiFillInProgress: () => {},
  voiceActive: false,
  copyAllAuraActive: false,
  flashCopyAllAura: () => {},
  copyOverlayActive: false,
  runCopyWithAura: () => {},
  setVoiceActive: () => {},
  activeVoiceModule: null,
  setActiveVoiceModule: () => {},
  micUnavailable: false,
  micUnavailableReason: null,
  setMicUnavailable: () => {},
  historicalUpdates: {},
  isHistoricalSectionUnseen: () => false,
  pushHistoricalUpdates: () => {},
  acknowledgeHistoricalSection: () => {},
  dismissHistoricalHighlights: () => {},
  removeHistoricalChunk: () => {},
  lastUndoRequest: null,
  requestUndoRxPadSync: () => {},
  removeHistoricalChunksBySourceCopyId: () => {},
  recordHistoricalSidebarEdit: () => {}
});

export function RxPadSyncProvider({ children }) {
  const [lastCopyRequest, setLastCopyRequest] = useState(null);
  const [lastSignal, setLastSignal] = useState(null);
  const [copySequence, setCopySequence] = useState(0);
  const [signalSequence, setSignalSequence] = useState(0);
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [aiFillInProgress, setAiFillInProgress] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [copyAllAuraActive, setCopyAllAuraActive] = useState(false);
  const copyAllAuraTimerRef = useRef(null);
  const flashCopyAllAura = useCallback(() => {
    setCopyAllAuraActive(true);
    if (copyAllAuraTimerRef.current) clearTimeout(copyAllAuraTimerRef.current);
    copyAllAuraTimerRef.current = setTimeout(() => setCopyAllAuraActive(false), 2000);
  }, []);
  const [copyOverlayActive, setCopyOverlayActive] = useState(false);
  const copyOverlayTimerRef = useRef(null);
  const [activeVoiceModule, setActiveVoiceModule] = useState(null);
  const [micUnavailable, setMicUnavailableRaw] = useState(false);
  const [micUnavailableReason, setMicUnavailableReason] = useState(null);
  const setMicUnavailable = useCallback((unavailable, reason) => {
    setMicUnavailableRaw(unavailable);
    setMicUnavailableReason(unavailable ? reason ?? "Microphone unavailable" : null);
  }, []);
  const [historicalUpdates, setHistoricalUpdates] = useState({});
  const [historicalUnseen, setHistoricalUnseen] = useState({});
  const [lastUndoRequest, setLastUndoRequest] = useState(null);
  const undoSeqRef = useRef(0);

  const isHistoricalSectionUnseen = useCallback(
    (id) => !!historicalUnseen[id],
    [historicalUnseen]
  );

  const pushHistoricalUpdates = useCallback((batch) => {
    const now = Date.now();
    setHistoricalUpdates((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(batch)) {
        const chunks = batch[k];
        if (!chunks?.length) continue;
        const add = chunks.map((c) => ({
          id: c.id,
          bullets: c.bullets,
          at: now,
          isFresh: true,
          sourceCopyId: c.sourceCopyId,
          undoPayload: c.undoPayload
        }));
        next[k] = [...(next[k] ?? []), ...add].slice(-24);
      }
      return next;
    });
    setHistoricalUnseen((prev) => {
      const n = { ...prev };
      for (const k of Object.keys(batch)) {
        if (batch[k]?.length) n[k] = true;
      }
      return n;
    });
  },
  []
  );

  const acknowledgeHistoricalSection = useCallback((id) => {
    setHistoricalUnseen((prev) => ({ ...prev, [id]: false }));
  }, []);

  const dismissHistoricalHighlights = useCallback((id) => {
    setHistoricalUpdates((prev) => ({
      ...prev,
      [id]: (prev[id] ?? []).map((c) => ({ ...c, isFresh: false }))
    }));
  }, []);

  const removeHistoricalChunk = useCallback((sectionId, chunkId) => {
    setHistoricalUpdates((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).filter((c) => c.id !== chunkId)
    }));
  }, []);

  const removeHistoricalChunksBySourceCopyId = useCallback((sourceCopyId) => {
    setHistoricalUpdates((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] ?? []).filter((c) => c.sourceCopyId !== sourceCopyId);
      }
      return next;
    });
  }, []);

  const requestUndoRxPadSync = useCallback((sourceCopyId, payload) => {
    undoSeqRef.current += 1;
    setLastUndoRequest({ id: undoSeqRef.current, sourceCopyId, payload });
  }, []);

  const recordHistoricalSidebarEdit = useCallback(
    (id, bullets) => {
      const trimmed = bullets.map((s) => s.trim()).filter(Boolean);
      if (!trimmed.length) return;
      pushHistoricalUpdates({
        [id]: [{ id: `sidebar-${Date.now()}`, bullets: trimmed }]
      });
    },
    [pushHistoricalUpdates]
  );

  const requestCopyToRxPad = useCallback((payload) => {
    setCopySequence((prev) => {
      const next = prev + 1;
      setLastCopyRequest({ id: next, payload });
      return next;
    });
  }, []);

  const runCopyWithAura = useCallback(
    (
    payload,
    opts) =>
    {
      // Edge-gradient-only treatment — no backdrop blur, no caption.
      // The aura fires for ~2s; the actual fill lands halfway through
      // so the doctor sees the gradient activate, then the data appear.
      // For BULK ("Copy all to RxPad") we also raise copyAllAuraActive
      // so per-module pulses are suppressed (the edge rim becomes the
      // single coordinated signal). For SINGLE-ITEM / per-section
      // copies we leave it false — RxPadFunctional then runs its
      // per-module flash + scroll-into-view as usual.
      const delayMs = opts?.delayMs ?? 2000;
      const bulk = !!opts?.bulk;
      setCopyOverlayActive(true);
      if (bulk) setCopyAllAuraActive(true);
      if (copyOverlayTimerRef.current) clearTimeout(copyOverlayTimerRef.current);
      if (copyAllAuraTimerRef.current) clearTimeout(copyAllAuraTimerRef.current);
      // Fire the actual fill at the midpoint so the gradient frames
      // the moment data lands.
      const fillAt = Math.max(200, Math.round(delayMs * 0.45));
      window.setTimeout(() => {
        const payloads = Array.isArray(payload) ? payload : [payload];
        for (const p of payloads) {
          setCopySequence((prev) => {
            const next = prev + 1;
            setLastCopyRequest({ id: next, payload: p });
            return next;
          });
        }
      }, fillAt);
      copyOverlayTimerRef.current = setTimeout(() => setCopyOverlayActive(false), delayMs);
      if (bulk) {
        copyAllAuraTimerRef.current = setTimeout(() => setCopyAllAuraActive(false), delayMs);
      }
    },
    []
  );

  const publishSignal = useCallback((signal) => {
    setSignalSequence((prev) => {
      const next = prev + 1;
      setLastSignal({ id: next, ...signal });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      lastCopyRequest,
      lastSignal,
      requestCopyToRxPad,
      publishSignal,
      patientAllergies,
      setPatientAllergies,
      aiFillInProgress,
      setAiFillInProgress,
      voiceActive,
      setVoiceActive,
      copyAllAuraActive,
      flashCopyAllAura,
      copyOverlayActive,
      runCopyWithAura,
      activeVoiceModule,
      setActiveVoiceModule,
      micUnavailable,
      micUnavailableReason,
      setMicUnavailable,
      historicalUpdates,
      isHistoricalSectionUnseen,
      pushHistoricalUpdates,
      acknowledgeHistoricalSection,
      dismissHistoricalHighlights,
      removeHistoricalChunk,
      lastUndoRequest,
      requestUndoRxPadSync,
      removeHistoricalChunksBySourceCopyId,
      recordHistoricalSidebarEdit
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
    lastCopyRequest,
    lastSignal,
    requestCopyToRxPad,
    publishSignal,
    patientAllergies,
    aiFillInProgress,
    voiceActive,
    copyAllAuraActive,
    flashCopyAllAura,
    copyOverlayActive,
    runCopyWithAura,
    activeVoiceModule,
    micUnavailable,
    micUnavailableReason,
    historicalUpdates,
    isHistoricalSectionUnseen,
    pushHistoricalUpdates,
    acknowledgeHistoricalSection,
    dismissHistoricalHighlights,
    removeHistoricalChunk,
    lastUndoRequest,
    requestUndoRxPadSync,
    removeHistoricalChunksBySourceCopyId,
    recordHistoricalSidebarEdit]

  );

  return <RxPadSyncContext.Provider value={value}>{children}</RxPadSyncContext.Provider>;
}

export function useRxPadSync() {
  return useContext(RxPadSyncContext);
}