"use client";

/**
 * WhisperBarProvider — global keyboard listener + state for the Whisper-style
 * floating dictation bar.
 *
 * Trigger: DOUBLE-TAP SHIFT within 400ms. The two presses must both be the
 * Shift key without any other modifier in between. Single Shift presses are
 * ignored so existing keyboard behavior (capitalisation, shortcuts) stays
 * intact.
 *
 * State lifecycle:
 *   closed → (double-shift) → open(recording) → (✓ / Enter) → routed to
 *   focused input OR clipboard → closed.
 *   Esc / X at any time closes without routing.
 *
 * Why a context: the bar is global (mounted once in root layout) so any
 * component can read its state without prop drilling, and the keyboard
 * listener stays at the window level — one global handler, not per-mount.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const WhisperBarContext = createContext(null);

const DOUBLE_TAP_WINDOW_MS = 400;

export function WhisperBarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  // Captured at the moment the bar opens — restored on Esc/X (so the
  // caret returns to the input the doctor was typing in).
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

  // ── Double-tap Shift listener ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastShiftTs = 0;

    const onKeyDown = (e) => {
      // Esc closes the bar without routing
      if (isOpen && e.key === "Escape") {
        e.preventDefault();
        close({ restoreFocus: true });
        return;
      }
      // Only react to Shift presses. Ignore repeats and any modifier combos.
      if (e.key !== "Shift") return;
      if (e.repeat) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const now = e.timeStamp || performance.now();
      if (now - lastShiftTs <= DOUBLE_TAP_WINDOW_MS) {
        lastShiftTs = 0;
        e.preventDefault();
        if (isOpen) close({ restoreFocus: true });
        else open();
        return;
      }
      lastShiftTs = now;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, open, close]);

  /**
   * Routes a final transcript to the right destination.
   *
   *   - If the focus we captured on open is an <input> / <textarea>: insert
   *     the transcript at the current selection range, preserving anything
   *     already typed (so dictation feels like fast typing).
   *   - If it's a contenteditable: insert via execCommand for the same
   *     effect.
   *   - Otherwise: copy to clipboard so the doctor can paste it anywhere,
   *     and fire a CustomEvent("whisper-bar:no-target") so callers can show
   *     a toast confirmation.
   *
   * Returns the routing kind so the bar can show the right success cue.
   */
  const route = useCallback((text) => {
    const value = (text ?? "").trim();
    if (!value) return "empty";

    const target = restoreFocusRef.current;
    const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    const isEditable = target && target.isContentEditable;

    if (isInput) {
      const start = target.selectionStart ?? target.value.length;
      const end   = target.selectionEnd   ?? target.value.length;
      const before = target.value.slice(0, start);
      const after  = target.value.slice(end);
      // Insert a space when stitching into mid-sentence text so words don't run together.
      const sep = before && !/\s$/.test(before) ? " " : "";
      const next = `${before}${sep}${value}${after}`;
      // Use the native setter so React-controlled inputs see the update.
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
      } catch { /* fall through to clipboard */ }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => { /* ignore */ });
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("whisper-bar:no-target", { detail: { text: value } }));
    }
    return "clipboard";
  }, []);

  const value = useMemo(() => ({ isOpen, open, close, route }), [isOpen, open, close, route]);
  return <WhisperBarContext.Provider value={value}>{children}</WhisperBarContext.Provider>;
}

export function useWhisperBar() {
  const ctx = useContext(WhisperBarContext);
  if (!ctx) throw new Error("useWhisperBar must be used inside a WhisperBarProvider");
  return ctx;
}
