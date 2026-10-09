"use client";

/**
 * VoiceBarProvider — global keyboard listener + state for the floating
 * dictation bar AND the VoiceRx Quick-Dictation indicator system.
 *
 * Trigger: DOUBLE-TAP SHIFT within 400ms. The two presses must both be the
 * Shift key without any other modifier in between.
 *
 * State surfaces:
 *   • Bar (existing)        — isOpen + open/close/route, modal dictation strip
 *   • Indicator (new)       — visible only when registerVoiceRxScope() is active
 *   • Tooltip (new)         — hover tooltip with two CTAs
 *   • After-dictation popup — when nothing was focused, show a 4-line preview
 *                             with Copy / Close / reverse progress bar
 *   • History (new)         — last 50 dictations, per-patient tagged
 *   • Input shimmer (new)   — bumps a counter so listeners can run a one-time
 *                             shimmer on the freshly-focused input
 *
 * The keyboard listener stays at the window level; every visible surface is a
 * sibling React component reading the same context.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/src/components/molecules/Toaster";
import { appendHistory, clearHistory as clearStoredHistory, loadHistory } from "./voice-bar-history-store";

const VoiceBarContext = createContext(null);

const DOUBLE_TAP_WINDOW_MS = 400;
const POPOVER_AUTO_CLOSE_MS = 12000;

export function VoiceBarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  // ── VoiceRx Quick-Dictation scope ────────────────────────────────────────
  // A counter — non-zero means at least one VoiceRxFlow is mounted, so the
  // indicator UI should be visible. Counting (rather than a boolean) handles
  // remounts without race conditions.
  const [scopeCount, setScopeCount] = useState(0);
  const registerScope = useCallback(() => {
    setScopeCount((n) => n + 1);
    return () => setScopeCount((n) => Math.max(0, n - 1));
  }, []);
  const isIndicatorVisible = scopeCount > 0;

  // ── Patient tag for history entries ──────────────────────────────────────
  const [patient, setPatientState] = useState(null); // { id, name } | null
  const setPatient = useCallback((p) => setPatientState(p ?? null), []);

  // ── Input shimmer ping (bumps a counter on focus of any input) ───────────
  const [shimmerTick, setShimmerTick] = useState(0);
  const [shimmerTarget, setShimmerTarget] = useState(null); // the focused element
  const pingShimmer = useCallback((el) => {
    setShimmerTarget(el ?? null);
    setShimmerTick((n) => n + 1);
  }, []);

  // ── History ──────────────────────────────────────────────────────────────
  const [history, setHistory] = useState([]);
  useEffect(() => {
    setHistory(loadHistory());
  }, []);
  const addHistoryEntry = useCallback((text) => {
    const next = appendHistory(text, patient);
    setHistory(next);
    return next;
  }, [patient]);
  const wipeHistory = useCallback(() => {
    const next = clearStoredHistory();
    setHistory(next);
  }, []);

  // ── History sidebar ──────────────────────────────────────────────────────
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const openHistory = useCallback(() => setIsHistoryOpen(true), []);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);

  // ── After-dictation popover ──────────────────────────────────────────────
  // Shown when dictation finishes and there was no focused input to route to.
  // Carries the text plus a deadline so the popover can render a reverse
  // progress bar without keeping ticking state in the provider.
  const [popover, setPopover] = useState(null); // { text, deadlineTs } | null
  const showPopover = useCallback((text) => {
    if (!text) return;
    setPopover({ text, deadlineTs: Date.now() + POPOVER_AUTO_CLOSE_MS });
  }, []);
  const hidePopover = useCallback(() => setPopover(null), []);

  // ── Captured focus (set when bar opens, used to route the transcript) ────
  const restoreFocusRef = useRef(null);

  const open = useCallback(() => {
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      restoreFocusRef.current = (active && active !== document.body) ? active : null;
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(({ restoreFocus = true } = {}) => {
    setIsOpen(false);
    if (restoreFocus && restoreFocusRef.current && typeof restoreFocusRef.current.focus === "function") {
      try { restoreFocusRef.current.focus(); } catch { /* ignore */ }
    }
    restoreFocusRef.current = null;
  }, []);

  // ── Global block on other voice surfaces while the bar is open ──────────
  // When Quick Dictator is up, every other AI-mic / Voice-AI button in the
  // app (marked with `data-voice-block`) is visually disabled and any click
  // on one is intercepted to surface a toast. The doctor can still scroll
  // and use everything else; only competing voice surfaces are off-limits.
  // Implementation:
  //   • Toggle `document.body.dataset.quickdictActive` so a CSS rule in
  //     globals.css can dim every [data-voice-block] in one place.
  //   • Attach a capture-phase pointerdown + click + keydown(Enter/Space)
  //     interceptor so the upstream button handlers never see the event.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isOpen) {
      delete document.body.dataset.quickdictActive;
      return;
    }
    document.body.dataset.quickdictActive = "true";

    let lastToastAt = 0;
    const bounce = (e) => {
      const blocker = e.target instanceof Element ? e.target.closest("[data-voice-block]") : null;
      if (!blocker) return;
      // Don't bounce clicks ON our own bar — VoiceBar lives outside the
      // data-voice-block tree, but be defensive in case of future additions.
      if (blocker.closest("[data-quickdictation-no-shimmer]")) return;
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastToastAt > 1200) {
        lastToastAt = now;
        toast.info?.("Quick Dictator is up — close it first to use this.")
          ?? toast.success("Quick Dictator is up — close it first to use this.");
      }
    };
    const onKey = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      bounce(e);
    };

    // Capture phase — we must intercept BEFORE the React onClick fires.
    document.addEventListener("pointerdown", bounce, true);
    document.addEventListener("click", bounce, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      delete document.body.dataset.quickdictActive;
      document.removeEventListener("pointerdown", bounce, true);
      document.removeEventListener("click", bounce, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [isOpen]);

  // ── Double-tap Shift listener (unchanged) ────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastShiftTs = 0;

    const onKeyDown = (e) => {
      // ── Bar OPEN ─────────────────────────────────────────────────────
      // Either Escape OR a single, unmodified Shift closes the bar
      // immediately. This works the same whether speech recognition is
      // running, paused in cancel-undo, or stuck in "no microphone access"
      // — we just discard and bail. Keyboard repeat is allowed for Esc
      // (no harm) but ignored for Shift so a held key doesn't slam-shut.
      if (isOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          lastShiftTs = 0;
          close({ restoreFocus: true });
          return;
        }
        if (e.key === "Shift" && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          lastShiftTs = 0;
          close({ restoreFocus: true });
          return;
        }
        return;
      }

      // ── Bar CLOSED — listen for the double-tap-Shift to open ─────────
      if (e.key !== "Shift") return;
      if (e.repeat) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const now = e.timeStamp || performance.now();
      if (now - lastShiftTs <= DOUBLE_TAP_WINDOW_MS) {
        lastShiftTs = 0;
        e.preventDefault();
        open();
        return;
      }
      lastShiftTs = now;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, open, close]);

  // ── Route the final transcript ───────────────────────────────────────────
  // Extended: every routed dictation gets logged to history with the active
  // patient tag. If there's no focused input, also pop the after-dictation
  // popover with the transcript so the doctor can copy or dismiss.
  const route = useCallback((text) => {
    const value = (text ?? "").trim();
    if (!value) return "empty";

    addHistoryEntry(value);

    const target = restoreFocusRef.current;
    // Broadcast a window-level "success" tick so the Quick-Dictator coach
    // mark (and any future surfaces) can react without growing more state
    // on the provider. Fired AFTER history has been appended, BEFORE the
    // text is routed — both branches below are considered a success.
    // We include the target element so the coach mark can suppress its
    // next re-fire on the same input (otherwise re-focusing for insert
    // immediately re-triggers the tip — visually noisy right after a
    // successful submit).
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tp-voicerx-dictation-success", {
        detail: { text: value, target },
      }));
    }

    const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    const isEditable = target && target.isContentEditable;

    if (isInput) {
      const start = target.selectionStart ?? target.value.length;
      const end   = target.selectionEnd   ?? target.value.length;
      const before = target.value.slice(0, start);
      const after  = target.value.slice(end);
      const sep = before && !/\s$/.test(before) ? " " : "";
      const next = `${before}${sep}${value}${after}`;
      const setter = Object.getOwnPropertyDescriptor(target.constructor.prototype, "value")?.set;
      setter ? setter.call(target, next) : (target.value = next);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      const caret = before.length + sep.length + value.length;
      target.setSelectionRange(caret, caret);
      target.focus();
      return "input";
    }

    if (isEditable && typeof document !== "undefined") {
      target.focus();
      try {
        document.execCommand("insertText", false, value);
        return "editable";
      } catch { /* fall through */ }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => { /* ignore */ });
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("voice-bar:no-target", { detail: { text: value } }));
    }
    // No target → show the after-dictation popover with the text preview.
    showPopover(value);
    return "clipboard";
  }, [addHistoryEntry, showPopover]);

  const value = useMemo(() => ({
    // bar
    isOpen, open, close, route,
    // indicator
    isIndicatorVisible, registerScope,
    // patient
    patient, setPatient,
    // shimmer
    shimmerTick, shimmerTarget, pingShimmer,
    // history
    history, addHistoryEntry, clearHistory: wipeHistory,
    isHistoryOpen, openHistory, closeHistory,
    // popover
    popover, showPopover, hidePopover,
  }), [
    isOpen, open, close, route,
    isIndicatorVisible, registerScope,
    patient, setPatient,
    shimmerTick, shimmerTarget, pingShimmer,
    history, addHistoryEntry, wipeHistory,
    isHistoryOpen, openHistory, closeHistory,
    popover, showPopover, hidePopover,
  ]);
  return <VoiceBarContext.Provider value={value}>{children}</VoiceBarContext.Provider>;
}

export function useVoiceBar() {
  const ctx = useContext(VoiceBarContext);
  if (!ctx) throw new Error("useVoiceBar must be used inside a VoiceBarProvider");
  return ctx;
}

/**
 * Page-scope hook: call from any organism (e.g. VoiceRxFlow) to make the
 * VoiceRx Quick-Dictation indicator visible while that organism is mounted.
 * Returns nothing; just side-effects the scope counter.
 */
export function useRegisterVoiceRxScope(patient) {
  const { registerScope, setPatient } = useVoiceBar();
  useEffect(() => registerScope(), [registerScope]);
  useEffect(() => {
    setPatient(patient ?? null);
    return () => setPatient(null);
  }, [patient?.id, patient?.name, setPatient]);
}
