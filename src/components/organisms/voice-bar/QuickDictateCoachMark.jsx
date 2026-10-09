"use client";

/**
 * QuickDictateCoachMark — stateful teaching tooltip for Quick Dictation.
 *
 * Behaviour (mode machine, persisted to localStorage):
 *   • mode="full" + minimalRemaining=2  → default. Every qualifying input
 *       focus shows a full card: ⇧+⇧, copy, More link, "Don't show again"
 *       checkbox, "Got it" CTA.
 *   • Got it (checkbox UNCHECKED)       → keep mode="full". We are waiting
 *       for the doctor to successfully complete ONE dictation. The
 *       `tp-voicerx-dictation-success` window event flips the mode.
 *   • Got it (checkbox CHECKED)         → mode="dismissed", forever.
 *   • Successful dictation              → mode="minimal" (if currently full).
 *       Next focuses show a tiny chip; each shown chip decrements
 *       minimalRemaining. When it hits 0, mode flips to "dismissed".
 *   • mode="dismissed"                  → render nothing.
 *
 * Qualifying inputs:
 *   • <textarea>, plain <input> of text-bearing type, or contentEditable.
 *   • Skipped when the input is part of a combobox/autocomplete pattern
 *     (those already show their own dropdown — stacking a coach mark there
 *     fights with the listbox). Specifically:
 *       - has aria-autocomplete
 *       - has aria-haspopup
 *       - is inside [role=combobox]
 *       - opt-out via [data-quickdict-no-coach]
 *
 * Interactions:
 *   • Auto-dismisses after 14s (full) / 5s (minimal).
 *   • Escape and outside-click dismiss the current instance (no state
 *     change — "I just don't want to look at it right now").
 *   • Opens the history sidebar via context.openHistory() on "More" click —
 *     that sidebar already hosts the violet "How Quick Dictator works" info
 *     card, so the doctor lands on a real education surface.
 *   • Closes itself whenever the VoiceBar is open (the bar IS the teaching
 *     moment when it's on screen — no need to compete for attention).
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useVoiceBar } from "./voice-bar-context";

const STATE_KEY = "tp-voicerx-quickdict-coach-state-v2";
const DEFAULT_STATE = { mode: "full", minimalRemaining: 2 };
const AUTO_DISMISS_FULL_MS = 14000;
const AUTO_DISMISS_MINIMAL_MS = 5000;
const FULL_WIDTH = 308;
const MINIMAL_WIDTH = 224;
const CARD_GAP = 12;

function readState() {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    const mode = ["full", "minimal", "dismissed"].includes(parsed?.mode) ? parsed.mode : "full";
    const minimalRemaining = Number.isFinite(parsed?.minimalRemaining) ? parsed.minimalRemaining : 2;
    return { mode, minimalRemaining };
  } catch {
    return { ...DEFAULT_STATE };
  }
}
function writeState(next) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STATE_KEY, JSON.stringify(next)); }
  catch { /* ignore */ }
}

function isCoachableInput(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.closest("[data-quickdictation-no-shimmer]")) return false;
  if (el.closest("[data-quickdict-no-coach]")) return false;
  // Skip combobox / autocomplete patterns — they already host a popup
  // listbox; stacking a coach mark there fights with the suggestions.
  if (el.hasAttribute("aria-autocomplete")) return false;
  if (el.hasAttribute("aria-haspopup")) return false;
  if (el.closest("[role=combobox]")) return false;
  // RxPad module search inputs (Symptoms / Examinations / Diagnosis / etc.)
  // open their own suggestion dropdowns; the coach mark would fight with
  // the suggestion popup. They're tagged with data-rx-module-search.
  if (el.hasAttribute("data-rx-module-search")) return false;
  // Editable cells inside RxPad tables: skip ONLY when the cell carries
  // its own dropdown (data-rx-has-dropdown). Note-style cells — input or
  // textarea, no dropdown — are free text and qualify for the coach mark.
  if (el.hasAttribute("data-rx-has-dropdown")) return false;
  const tag = el.tagName;
  if (tag === "INPUT") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    return ["text", "search", "url", "tel", "email", "password", "number", ""].includes(type);
  }
  if (tag === "TEXTAREA") return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * Compute the card's TOP/LEFT given the anchor input.
 *
 * We always TRY to float the card above the input (the design intent —
 * the doctor's eye is in the input, looking up is natural). The card's
 * BOTTOM should sit at `r.top − gap`. Since CSS `top` positions the card's
 * TOP, we subtract the card height too. The caller passes in the
 * measured card height after first render (initial render uses a coarse
 * estimate so we don't have to flicker the first paint).
 *
 * If there isn't enough space above (input is high in the viewport), we
 * drop the card below the input instead.
 *
 * Horizontal: center the card on the input's center, clamped 16px in
 * from the viewport edges.
 */
/**
 * Compute the card's TOP/LEFT given the anchor input.
 *
 * Design intent: the card sits at the TOP-LEFT of the input — left-aligned
 * with the field's left edge (so the doctor's eye lands at the place the
 * cursor starts) and floating above the field by `CARD_GAP`. Falls back
 * below the input only when there isn't enough room above.
 */
function computePos(el, width, height) {
  if (!el || typeof window === "undefined") return null;
  const r = el.getBoundingClientRect();
  const cardH = height || 0;
  let placement = "above";
  let top = r.top - CARD_GAP - cardH;
  if (top < 16) {
    top = r.bottom + CARD_GAP;
    placement = "below";
  }
  // Left-align with the input's left edge, clamped to the viewport.
  let left = r.left;
  if (left + width > window.innerWidth - 16) left = window.innerWidth - width - 16;
  if (left < 16) left = 16;
  return { left, top, placement };
}

export function QuickDictateCoachMark() {
  const { shimmerTick, shimmerTarget, isIndicatorVisible, isOpen: isBarOpen, openHistory } = useVoiceBar();

  // Persisted mode + a tick we bump on every state write so the UI re-runs.
  const [stateTick, setStateTick] = useState(0);
  const stateRef = useRef(readState());
  const persist = useCallback((next) => {
    stateRef.current = next;
    writeState(next);
    setStateTick((n) => n + 1);
  }, []);

  // Per-instance UI state — anchor element, computed position, mode at the
  // moment of opening, and the "Don't show again" checkbox.
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState("full"); // "full" | "minimal"
  const [pos, setPos] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const cardRef = useRef(null);
  const anchorRef = useRef(null);
  // Each open of the card belongs to ONE display session — auto-timer,
  // outside-click, Escape, and the × button can all race to close it. We
  // only want the minimal-mode budget to drop by 1 per session, so we
  // latch a flag on first close and ignore the rest.
  const consumedRef = useRef(false);
  // After a successful dictation submit, the focused input is restored
  // and the focus shimmer pings again — without this gate, the coach mark
  // re-fires on top of the field the doctor JUST inserted text into,
  // which feels noisy. Per-element timestamp; the open effect rejects
  // any focus on that element within a short cooldown.
  const recentDictationRef = useRef(new WeakMap());

  // Close-only dismissal (no state change). Used for click-outside / Escape /
  // anchor-blur. The mode machine only advances on explicit decisions
  // (Got it, success event).
  const dismissInstance = useCallback(() => {
    setOpen(false);
    setDontShowAgain(false);
  }, []);

  // Open on every qualifying focus. The mode at the time of opening drives
  // which card we render. We do NOT advance state here — minimal countdowns
  // happen on close so a fast focus → focus doesn't burn through both shots.
  useEffect(() => {
    if (!isIndicatorVisible || isBarOpen || !shimmerTick) return;
    const el = shimmerTarget;
    if (!isCoachableInput(el)) return;
    const { mode } = stateRef.current;
    if (mode === "dismissed") return;
    // Cool-down: if this input just received a routed dictation, hide the
    // coach mark for a short window so the doctor isn't tipped immediately
    // after the very action the tip was teaching them to take.
    const lastDict = recentDictationRef.current.get(el);
    if (lastDict && Date.now() - lastDict < 3000) return;
    anchorRef.current = el;
    const width = mode === "full" ? FULL_WIDTH : MINIMAL_WIDTH;
    // Initial coarse estimate so the first paint doesn't flicker. The
    // useLayoutEffect below measures the real card height and adjusts.
    const estimatedH = mode === "full" ? 140 : 36;
    const p = computePos(el, width, estimatedH);
    if (!p) return;
    setVariant(mode);
    setDontShowAgain(false);
    setPos(p);
    consumedRef.current = false;
    setOpen(true);
    // Note: stateTick intentionally NOT in deps. We only want to (re)open on
    // a fresh focusin (shimmerTick bump). When persist() flips full→minimal,
    // the next focus event will pick up the new mode naturally — we don't
    // want the act of persisting to itself re-trigger an open.
  }, [shimmerTick, shimmerTarget, isIndicatorVisible, isBarOpen]);

  // Hide instantly when the voice bar opens — the bar IS the active
  // teaching moment, no need for the chip to share the screen.
  useEffect(() => {
    if (isBarOpen) setOpen(false);
  }, [isBarOpen]);

  // Track successful dictations. In FULL mode, the first success after the
  // doctor has seen the card promotes us to MINIMAL mode. In other modes
  // the event is a no-op for the coach.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onSuccess = (e) => {
      // Suppress the next coach-mark show on the input that JUST got the
      // routed dictation — otherwise restoring focus after submit pops the
      // tip back up.
      const routedTarget = e?.detail?.target;
      if (routedTarget instanceof Element) {
        recentDictationRef.current.set(routedTarget, Date.now());
      }
      const cur = stateRef.current;
      if (cur.mode === "full") {
        persist({ mode: "minimal", minimalRemaining: 2 });
        // Also close the currently-open card so the next focus picks up the
        // minimal variant.
        setOpen(false);
      }
    };
    window.addEventListener("tp-voicerx-dictation-success", onSuccess);
    return () => window.removeEventListener("tp-voicerx-dictation-success", onSuccess);
  }, [persist]);

  // After first paint, measure the actual card height and re-place so the
  // card's BOTTOM sits cleanly above the input (the estimate from the
  // open-effect was coarse; this is what makes it land precisely).
  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const w = variant === "full" ? FULL_WIDTH : MINIMAL_WIDTH;
    const h = cardRef.current.getBoundingClientRect().height;
    const p = computePos(anchorRef.current, w, h);
    if (p && (p.top !== pos?.top || p.left !== pos?.left || p.placement !== pos?.placement)) {
      setPos(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variant]);

  // Reposition on scroll / resize while open. Uses the live measured card
  // height (rather than the estimate) so the card tracks the input
  // accurately as the page moves.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const w = variant === "full" ? FULL_WIDTH : MINIMAL_WIDTH;
      const h = cardRef.current?.getBoundingClientRect().height || 0;
      const p = computePos(anchorRef.current, w, h);
      if (p) setPos(p);
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, variant]);

  // Auto-dismiss + Escape + outside-click + start-typing.
  // Minimal mode also decrements its budget on dismissal so a no-action
  // chip still consumes one of the two remaining showings.
  useEffect(() => {
    if (!open) return;
    const ms = variant === "full" ? AUTO_DISMISS_FULL_MS : AUTO_DISMISS_MINIMAL_MS;
    const t = window.setTimeout(handleDismiss, ms);
    const onKey = (e) => { if (e.key === "Escape") handleDismiss(); };
    const onClick = (e) => {
      if (!cardRef.current || cardRef.current.contains(e.target)) return;
      if (anchorRef.current && anchorRef.current === e.target) return;
      handleDismiss();
    };
    // The moment the doctor starts typing into the anchored input, get out
    // of the way. We listen for the FIRST character-bearing keydown — Shift,
    // Tab, arrow keys, the Quick-Dictation ⇧+⇧ shortcut, and modifier
    // combos all pass through without dismissing.
    const isTypingKey = (e) =>
      e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;
    const onAnchorKeyDown = (e) => {
      if (isTypingKey(e)) handleDismiss();
    };
    const anchor = anchorRef.current;
    anchor?.addEventListener("keydown", onAnchorKeyDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.clearTimeout(t);
      anchor?.removeEventListener("keydown", onAnchorKeyDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variant]);

  // Decrement the minimal-mode budget when a minimal chip closes (any path —
  // ×, Escape, outside click, auto-timer). FULL chips don't burn the budget;
  // they wait for an explicit decision.
  const handleDismiss = useCallback(() => {
    // Only the FIRST close in a given display session can consume the budget.
    if (variant === "minimal" && !consumedRef.current) {
      consumedRef.current = true;
      const cur = stateRef.current;
      const next = Math.max(0, cur.minimalRemaining - 1);
      if (next === 0) persist({ mode: "dismissed", minimalRemaining: 0 });
      else persist({ mode: "minimal", minimalRemaining: next });
    }
    dismissInstance();
  }, [variant, persist, dismissInstance]);

  const handleGotIt = useCallback(() => {
    if (dontShowAgain) {
      persist({ mode: "dismissed", minimalRemaining: 0 });
    }
    // Either way the card closes; if checkbox was UNCHECKED, we stay in
    // FULL mode and the next focus will show the card again — that's the
    // documented "keep showing until one successful dictation" path.
    dismissInstance();
  }, [dontShowAgain, persist, dismissInstance]);

  const handleMore = useCallback(() => {
    openHistory();
    dismissInstance();
  }, [openHistory, dismissInstance]);

  if (!open || !pos || typeof document === "undefined") return null;

  const isAbove = pos.placement === "above";

  if (variant === "minimal") {
    return createPortal(
      <div
        ref={cardRef}
        role="status"
        aria-label="Quick dictation tip"
        data-quickdictation-no-shimmer="true"
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: MINIMAL_WIDTH,
          zIndex: 200,
          background: "var(--tp-slate-900, #0F172A)",
          color: "#fff",
          borderRadius: 999,
          padding: "8px 12px",
          boxShadow: "0 10px 28px rgba(15,23,42,0.30), inset 0 0 0 1px rgba(255,255,255,0.06)",
          fontFamily: "Inter, var(--font-body), sans-serif",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={miniKbd}>⇧</span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600 }}>+</span>
        <span style={miniKbd}>⇧</span>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.005em", color: "rgba(255,255,255,0.92)", flex: 1 }}>
          Double-tap to dictate
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={miniCloseBtn}
        >
          ✕
        </button>
      </div>,
      document.body
    );
  }

  // ── Full mode ─────────────────────────────────────────────────────────────
  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Quick dictation tip"
      data-quickdictation-no-shimmer="true"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: FULL_WIDTH,
        zIndex: 200,
        background: "var(--tp-slate-900, #0F172A)",
        color: "#fff",
        borderRadius: 12,
        padding: "12px 14px 10px",
        boxShadow: "0 18px 48px rgba(15,23,42,0.32), 0 2px 6px rgba(15,23,42,0.22), inset 0 0 0 1px rgba(255,255,255,0.06)",
        fontFamily: "Inter, var(--font-body), sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 30,
          ...(isAbove ? { bottom: -6 } : { top: -6 }),
          width: 12,
          height: 12,
          background: "var(--tp-slate-900, #0F172A)",
          transform: "rotate(45deg)",
          borderTopLeftRadius: 2,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.16em",
          color: "rgba(255,255,255,0.92)",
          textTransform: "uppercase",
        }}>
          Quick Dictator
        </span>
        <span style={kbdStyle}>⇧</span>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700 }}>+</span>
        <span style={kbdStyle}>⇧</span>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "rgba(255,255,255,0.86)" }}>
        <strong style={{ color: "#fff" }}>Tap Shift twice</strong>{" "}
        and start talking. Whatever you speak lands here exactly the way you
        said it, with clinical precision.{" "}
        <button
          type="button"
          onClick={handleMore}
          style={{
            display: "inline",
            padding: 0,
            background: "transparent",
            border: "none",
            color: "#A78BFA",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 2,
            fontSize: "inherit",
          }}
        >
          Know more
        </button>
      </div>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginTop: 2,
      }}>
        <label style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          color: "rgba(255,255,255,0.78)",
          fontSize: 11,
          fontWeight: 500,
          userSelect: "none",
        }}>
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.currentTarget.checked)}
            data-quickdict-no-coach="true"
            style={{
              width: 14,
              height: 14,
              accentColor: "#A78BFA",
              cursor: "pointer",
            }}
          />
          Don't show again
        </label>
        <button
          type="button"
          onClick={handleGotIt}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 28,
            padding: "0 14px",
            borderRadius: 8,
            background: "#fff",
            color: "var(--tp-slate-900, #0F172A)",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "-0.005em",
          }}
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}

const kbdStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 7px",
  minWidth: 20,
  height: 20,
  borderRadius: 4,
  background: "rgba(255,255,255,0.20)",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  fontFamily: "JetBrains Mono, SF Mono, monospace",
  boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.10)",
};
const miniKbd = { ...kbdStyle, padding: "1px 6px", minWidth: 18, height: 16, fontSize: 10 };
const miniCloseBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: 999,
  background: "rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.85)",
  border: "none",
  cursor: "pointer",
  fontSize: 10,
};
