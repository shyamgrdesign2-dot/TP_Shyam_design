// Quick Dictator coach mark.
// Auto-detects free-text inputs (single central `isCoachableInput`), shows
// a "tap ⇧ twice" tip above the field. Mode machine persists in
// localStorage: full → minimal (after first successful dictation) → off.

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
    const mode = ["full", "minimal", "dismissed"].includes(parsed?.mode)
      ? parsed.mode
      : "full";
    const minimalRemaining = Number.isFinite(parsed?.minimalRemaining)
      ? parsed.minimalRemaining
      : 2;
    return { mode, minimalRemaining };
  } catch (_) {
    return { ...DEFAULT_STATE };
  }
}
function writeState(next) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(next));
  } catch (_) {}
}

// Auto-detector — every free-text input in the page qualifies UNLESS it
// announces a popup (combobox/autocomplete) or carries the opt-out attr.
// Devs don't have to mark inputs individually; only exceptions need
// `data-quickdict-no-coach`.
function isCoachableInput(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.closest("[data-quickdict-no-shimmer]")) return false;
  if (el.closest("[data-quickdict-no-coach]")) return false;
  if (el.hasAttribute("aria-autocomplete")) return false;
  if (el.hasAttribute("aria-haspopup")) return false;
  if (el.closest("[role=combobox]")) return false;
  const tag = el.tagName;
  if (tag === "INPUT") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    return [
      "text",
      "search",
      "url",
      "tel",
      "email",
      "password",
      "number",
      "",
    ].includes(type);
  }
  if (tag === "TEXTAREA") return true;
  if (el.isContentEditable) return true;
  return false;
}

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
  let left = r.left;
  if (left + width > window.innerWidth - 16)
    left = window.innerWidth - width - 16;
  if (left < 16) left = 16;
  return { left, top, placement };
}

export function QuickDictateCoachMark() {
  const { shimmerTick, shimmerTarget, isOpen: isBarOpen, openTutorial } =
    useVoiceBar();

  const [stateTick, setStateTick] = useState(0);
  const stateRef = useRef(readState());
  const persist = useCallback((next) => {
    stateRef.current = next;
    writeState(next);
    setStateTick((n) => n + 1);
  }, []);

  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState("full");
  const [pos, setPos] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const cardRef = useRef(null);
  const anchorRef = useRef(null);
  const consumedRef = useRef(false);
  const recentDictationRef = useRef(new WeakMap());

  const dismissInstance = useCallback(() => {
    setOpen(false);
    setDontShowAgain(false);
  }, []);

  useEffect(() => {
    if (isBarOpen || !shimmerTick) return;
    const el = shimmerTarget;
    if (!isCoachableInput(el)) return;
    const { mode } = stateRef.current;
    if (mode === "dismissed") return;
    const lastDict = recentDictationRef.current.get(el);
    if (lastDict && Date.now() - lastDict < 3000) return;
    anchorRef.current = el;
    const width = mode === "full" ? FULL_WIDTH : MINIMAL_WIDTH;
    const estimatedH = mode === "full" ? 140 : 36;
    const p = computePos(el, width, estimatedH);
    if (!p) return;
    setVariant(mode);
    setDontShowAgain(false);
    setPos(p);
    consumedRef.current = false;
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shimmerTick, shimmerTarget, isBarOpen]);

  useEffect(() => {
    if (isBarOpen) setOpen(false);
  }, [isBarOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onSuccess = (e) => {
      const routedTarget = e?.detail?.target;
      if (routedTarget instanceof Element) {
        recentDictationRef.current.set(routedTarget, Date.now());
      }
      const cur = stateRef.current;
      if (cur.mode === "full") {
        persist({ mode: "minimal", minimalRemaining: 2 });
        setOpen(false);
      }
    };
    window.addEventListener("tp-voicerx-dictation-success", onSuccess);
    return () =>
      window.removeEventListener("tp-voicerx-dictation-success", onSuccess);
  }, [persist]);

  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const w = variant === "full" ? FULL_WIDTH : MINIMAL_WIDTH;
    const h = cardRef.current.getBoundingClientRect().height;
    const p = computePos(anchorRef.current, w, h);
    if (
      p &&
      (p.top !== pos?.top ||
        p.left !== pos?.left ||
        p.placement !== pos?.placement)
    ) {
      setPos(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variant]);

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

  const handleDismiss = useCallback(() => {
    if (variant === "minimal" && !consumedRef.current) {
      consumedRef.current = true;
      const cur = stateRef.current;
      const next = Math.max(0, cur.minimalRemaining - 1);
      if (next === 0) persist({ mode: "dismissed", minimalRemaining: 0 });
      else persist({ mode: "minimal", minimalRemaining: next });
    }
    dismissInstance();
  }, [variant, persist, dismissInstance]);

  useEffect(() => {
    if (!open) return;
    const ms =
      variant === "full" ? AUTO_DISMISS_FULL_MS : AUTO_DISMISS_MINIMAL_MS;
    const t = window.setTimeout(handleDismiss, ms);
    const onKey = (e) => {
      if (e.key === "Escape") handleDismiss();
    };
    const onClick = (e) => {
      if (!cardRef.current || cardRef.current.contains(e.target)) return;
      if (anchorRef.current && anchorRef.current === e.target) return;
      handleDismiss();
    };
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

  const handleGotIt = useCallback(() => {
    if (dontShowAgain) {
      persist({ mode: "dismissed", minimalRemaining: 0 });
    }
    dismissInstance();
  }, [dontShowAgain, persist, dismissInstance]);

  const handleMore = useCallback(() => {
    openTutorial();
    dismissInstance();
  }, [openTutorial, dismissInstance]);

  if (!open || !pos || typeof document === "undefined") return null;
  const isAbove = pos.placement === "above";

  if (variant === "minimal") {
    return createPortal(
      <div
        ref={cardRef}
        role="status"
        aria-label="Quick dictation tip"
        data-quickdict-no-shimmer="true"
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: MINIMAL_WIDTH,
          zIndex: 2147483647,
          background: "#0F172A",
          color: "#fff",
          borderRadius: 999,
          padding: "8px 12px",
          boxShadow:
            "0 10px 28px rgba(15,23,42,0.30), inset 0 0 0 1px rgba(255,255,255,0.06)",
          fontFamily: "Inter, sans-serif",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={miniKbd}>⇧</span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600 }}>+</span>
        <span style={miniKbd}>⇧</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
            flex: 1,
          }}
        >
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

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Quick dictation tip"
      data-quickdict-no-shimmer="true"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: FULL_WIDTH,
        zIndex: 2147483647,
        background: "#0F172A",
        color: "#fff",
        borderRadius: 12,
        padding: "12px 14px 10px",
        boxShadow:
          "0 18px 48px rgba(15,23,42,0.32), 0 2px 6px rgba(15,23,42,0.22), inset 0 0 0 1px rgba(255,255,255,0.06)",
        fontFamily: "Inter, sans-serif",
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
          background: "#0F172A",
          transform: "rotate(45deg)",
          borderTopLeftRadius: 2,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            marginRight: 6,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: "rgba(255,255,255,0.85)",
            textTransform: "uppercase",
          }}
        >
          Quick Dictator
        </span>
        <span style={kbdStyle}>⇧</span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600 }}>+</span>
        <span style={kbdStyle}>⇧</span>
      </div>
      <div
        style={{
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.86)",
        }}
      >
        <strong style={{ color: "#fff" }}>Tap Shift twice</strong> and start
        talking. Whatever you speak lands here exactly the way you said it,
        with clinical precision.{" "}
        <button
          type="button"
          onClick={handleMore}
          style={{
            display: "inline",
            padding: 0,
            background: "transparent",
            border: "none",
            color: "#fff",
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 2,
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            color: "rgba(255,255,255,0.78)",
            fontSize: 11,
            fontWeight: 500,
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.currentTarget.checked)}
            data-quickdict-no-coach="true"
            style={{ width: 14, height: 14, accentColor: "#3B82F6", cursor: "pointer" }}
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
            color: "#0F172A",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
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
  height: 18,
  borderRadius: 4,
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  fontFamily: "JetBrains Mono, SF Mono, monospace",
};
const miniKbd = {
  ...kbdStyle,
  padding: "1px 6px",
  minWidth: 18,
  height: 16,
  fontSize: 10,
};
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
