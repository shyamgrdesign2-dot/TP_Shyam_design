// Quick Dictator coach mark.
// Auto-detects free-text inputs (single central `isCoachableInput`) and shows
// a "double-tap Shift" tip above the field. It keeps showing on every
// qualifying focus until the doctor either (a) ticks "Don't show again" or
// (b) completes 3 successful dictations — both persisted in localStorage.
//
// It must NOT pop on the programmatic re-focus the voice bar does when it
// closes (accept / cancel / Esc) — only a genuine user activation counts.

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Drawer } from "antd";
import { useVoiceBar } from "./voice-bar-context";

const STATE_KEY = "tp-voicerx-quickdict-coach-state-v3";
const DEFAULT_STATE = { dismissed: false, successes: 0 };
const SHOW_UNTIL_SUCCESSES = 3;
const AUTO_DISMISS_MS = 14000;
const CARD_WIDTH = 308;
const CARD_GAP = 12;
// Swallow shimmer pings for a beat after the bar closes, so the bar's
// focus-restore doesn't immediately re-open the coach mark.
const POST_CLOSE_MUTE_MS = 1000;

function readState() {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      dismissed: parsed?.dismissed === true,
      successes: Number.isFinite(parsed?.successes) ? parsed.successes : 0,
    };
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

  const [, setStateTick] = useState(0);
  const stateRef = useRef(readState());
  const persist = useCallback((next) => {
    stateRef.current = next;
    writeState(next);
    setStateTick((n) => n + 1);
  }, []);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const cardRef = useRef(null);
  const anchorRef = useRef(null);
  const recentDictationRef = useRef(new WeakMap());
  const muteShimmerUntilRef = useRef(0);
  const prevBarOpenRef = useRef(isBarOpen);

  const dismissInstance = useCallback(() => {
    setOpen(false);
    setDontShowAgain(false);
  }, []);

  // Hide while the bar is up, and mute shimmer pings briefly after it closes
  // so the bar's focus-restore doesn't re-trigger us (the cancel-then-tooltip
  // bug). This effect is declared *before* the shimmer effect so the mute
  // window is set before the post-close ping is evaluated.
  useEffect(() => {
    if (isBarOpen) {
      setOpen(false);
    } else if (prevBarOpenRef.current) {
      muteShimmerUntilRef.current = Date.now() + POST_CLOSE_MUTE_MS;
      setOpen(false);
    }
    prevBarOpenRef.current = isBarOpen;
  }, [isBarOpen]);

  useEffect(() => {
    if (isBarOpen || !shimmerTick) return;
    if (Date.now() < muteShimmerUntilRef.current) return;
    const el = shimmerTarget;
    if (!isCoachableInput(el)) return;
    const { dismissed, successes } = stateRef.current;
    if (dismissed || successes >= SHOW_UNTIL_SUCCESSES) return;
    const lastDict = recentDictationRef.current.get(el);
    if (lastDict && Date.now() - lastDict < 3000) return;
    anchorRef.current = el;
    const p = computePos(el, CARD_WIDTH, 140);
    if (!p) return;
    setDontShowAgain(false);
    setPos(p);
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shimmerTick, shimmerTarget, isBarOpen]);

  // Count successful dictations; stop showing once the doctor has clearly
  // got the hang of it (3 successes).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onSuccess = (e) => {
      const routedTarget = e?.detail?.target;
      if (routedTarget instanceof Element) {
        recentDictationRef.current.set(routedTarget, Date.now());
      }
      const cur = stateRef.current;
      const successes = (cur.successes || 0) + 1;
      const dismissed = cur.dismissed || successes >= SHOW_UNTIL_SUCCESSES;
      persist({ dismissed, successes });
      setOpen(false);
    };
    window.addEventListener("tp-voicerx-dictation-success", onSuccess);
    return () =>
      window.removeEventListener("tp-voicerx-dictation-success", onSuccess);
  }, [persist]);

  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const h = cardRef.current.getBoundingClientRect().height;
    const p = computePos(anchorRef.current, CARD_WIDTH, h);
    if (
      p &&
      (p.top !== pos?.top ||
        p.left !== pos?.left ||
        p.placement !== pos?.placement)
    ) {
      setPos(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const h = cardRef.current?.getBoundingClientRect().height || 0;
      const p = computePos(anchorRef.current, CARD_WIDTH, h);
      if (p) setPos(p);
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Auto-dismiss / Esc / click-away just hide this instance — they don't
  // permanently dismiss, so the tip can reappear on the next activation.
  const handleDismiss = useCallback(() => {
    dismissInstance();
  }, [dismissInstance]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(handleDismiss, AUTO_DISMISS_MS);
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
  }, [open]);

  const handleGotIt = useCallback(() => {
    if (dontShowAgain) {
      persist({ ...stateRef.current, dismissed: true });
    }
    dismissInstance();
  }, [dontShowAgain, persist, dismissInstance]);

  const handleMore = useCallback(() => {
    openTutorial();
    dismissInstance();
  }, [openTutorial, dismissInstance]);

  if (!open || !pos || typeof document === "undefined") return null;
  const isAbove = pos.placement === "above";

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
        width: CARD_WIDTH,
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
        <strong style={{ color: "#fff" }}>Double-tap the Shift key</strong> and
        start talking. Your words land right here, exactly as you said them.{" "}
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
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              setDontShowAgain(checked);
              // Persist immediately so it stays dismissed even if the doctor
              // just clicks into another field instead of pressing "Got it".
              // Unchecking means "show me again" — clear `dismissed` *and*
              // reset `successes`, otherwise the >=3 auto-dismiss would still
              // block the tip for power users.
              if (checked) persist({ ...stateRef.current, dismissed: true });
              else persist({ dismissed: false, successes: 0 });
            }}
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

// ── "Know more" tutorial drawer ──────────────────────────────────────────
// Opened from the coach mark's "Know more" link via openTutorial().
const STEPS = [
  {
    n: 1,
    title: "Double-tap Shift",
    body: "From any note field, tap ⇧ twice to open the dictation bar.",
  },
  {
    n: 2,
    title: "Just talk",
    body: "Speak naturally. We transcribe word-for-word, no AI editing.",
  },
  {
    n: 3,
    title: "Hit ✓ to insert",
    body: "Press ✓ or Enter. Your words drop straight into the field.",
  },
  {
    n: 4,
    title: "5 seconds to undo",
    body: "Click ✕ to cancel. You’ve got 5 seconds to undo.",
  },
];

export function TutorialDrawer() {
  const { isTutorialOpen, closeTutorial } = useVoiceBar();

  return (
    <Drawer
      title={
        <span
          style={{
            fontFamily: "Mulish, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#0F172A",
          }}
        >
          Quick Dictator
        </span>
      }
      placement="right"
      width={400}
      open={isTutorialOpen}
      onClose={closeTutorial}
      destroyOnClose={false}
      zIndex={2147483647}
      closeIcon={
        <span
          aria-hidden
          className="qd-ico qd-ico-close-square"
          style={{ width: 20, height: 20, color: "#334155" }}
        />
      }
      styles={{
        wrapper: {
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        },
        header: {
          minHeight: 60,
          height: 60,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #E2E8F0",
          boxSizing: "border-box",
        },
        body: {
          padding: "24px 20px",
        },
        content: {
          borderLeft: "1px solid #E2E8F0",
        },
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "Mulish, sans-serif",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
            color: "#0F172A",
          }}
        >
          Talk through your notes in four steps.
        </h2>

        <ol
          style={{
            display: "flex",
            flexDirection: "column",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {STEPS.map((step, idx) => {
            const isLast = idx === STEPS.length - 1;
            return (
              <li
                key={step.n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr",
                  gap: 14,
                  padding: "4px 0 16px",
                  alignItems: "flex-start",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    alignSelf: "stretch",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background:
                        "linear-gradient(135deg, #6938EF 0%, #4338CA 100%)",
                      color: "#fff",
                      boxShadow: "0 6px 14px -6px rgba(105,56,239,0.45)",
                      fontFamily: "JetBrains Mono, SF Mono, monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      flexShrink: 0,
                    }}
                  >
                    {step.n}
                  </span>
                  {!isLast && (
                    <span
                      style={{
                        flex: 1,
                        width: 2,
                        minHeight: 28,
                        marginTop: 6,
                        marginBottom: 6,
                        backgroundImage:
                          "linear-gradient(180deg, #CBD5E1 0%, #CBD5E1 50%, transparent 50%, transparent 100%)",
                        backgroundSize: "2px 8px",
                        backgroundRepeat: "repeat-y",
                      }}
                    />
                  )}
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    paddingTop: 4,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "Mulish, sans-serif",
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "-0.005em",
                      color: "#0F172A",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: "#475569",
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 16px",
            borderRadius: 12,
            background: "#F4EFFF",
            border: "1px solid #E0D4FF",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={kbdBig}>⇧</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>
              +
            </span>
            <span style={kbdBig}>⇧</span>
          </span>
          <span
            style={{
              fontSize: 12,
              lineHeight: 1.55,
              fontWeight: 600,
              color: "#2A1E5C",
            }}
          >
            Try it now. Focus a notes field and double-tap Shift.
          </span>
        </div>
      </div>
    </Drawer>
  );
}

const kbdBig = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 22,
  padding: "0 6px",
  borderRadius: 4,
  background: "#0F172A",
  color: "#fff",
  fontFamily: "JetBrains Mono, SF Mono, monospace",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
};
