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

const STATE_KEY = "tp-voicerx-quickdict-coach-state-v5";
const DEFAULT_STATE = {
  dismissed: false,
  gotItCount: 0,
  successCount: 0,
  cancelCount: 0,
};
// The tip stops showing on ANY of these (whichever is hit first):
//   • "Don't show again" checked once
//   • "Got it" clicked DISMISS_THRESHOLD times
//   • DISMISS_THRESHOLD successful dictations (✓ in the bar)
//   • DISMISS_THRESHOLD cancellations (✕ in the bar)
// Click-away, Esc, and typing remain transient — they don't count.
const DISMISS_THRESHOLD = 3;

function shouldStopShowing(s) {
  return (
    s.dismissed ||
    s.gotItCount >= DISMISS_THRESHOLD ||
    s.successCount >= DISMISS_THRESHOLD ||
    s.cancelCount >= DISMISS_THRESHOLD
  );
}
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
      gotItCount: Number.isFinite(parsed?.gotItCount) ? parsed.gotItCount : 0,
      successCount: Number.isFinite(parsed?.successCount)
        ? parsed.successCount
        : 0,
      cancelCount: Number.isFinite(parsed?.cancelCount)
        ? parsed.cancelCount
        : 0,
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
    if (shouldStopShowing(stateRef.current)) return;
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

  // Tick the success / cancel counters when the bar reports either event.
  // Successful dictation also remembers the field for the 3s same-field
  // grace, then closes this instance immediately.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onSuccess = (e) => {
      const routedTarget = e?.detail?.target;
      if (routedTarget instanceof Element) {
        recentDictationRef.current.set(routedTarget, Date.now());
      }
      const cur = stateRef.current;
      persist({ ...cur, successCount: (cur.successCount || 0) + 1 });
      setOpen(false);
    };
    const onCancel = () => {
      const cur = stateRef.current;
      persist({ ...cur, cancelCount: (cur.cancelCount || 0) + 1 });
    };
    window.addEventListener("tp-voicerx-dictation-success", onSuccess);
    window.addEventListener("tp-voicerx-dictation-cancelled", onCancel);
    return () => {
      window.removeEventListener("tp-voicerx-dictation-success", onSuccess);
      window.removeEventListener("tp-voicerx-dictation-cancelled", onCancel);
    };
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

  // "Got it" ticks its own counter and also honours the checkbox.
  const handleGotIt = useCallback(() => {
    const cur = stateRef.current;
    persist({
      ...cur,
      dismissed: dontShowAgain || cur.dismissed,
      gotItCount: (cur.gotItCount || 0) + 1,
    });
    dismissInstance();
  }, [dontShowAgain, persist, dismissInstance]);

  const handleMore = useCallback(() => {
    openTutorial();
    dismissInstance();
  }, [openTutorial, dismissInstance]);

  if (!open || !pos || typeof document === "undefined") return null;
  const isAbove = pos.placement === "above";
  // The coach card is portalled to document.body, so its input-relative
  // coordinates must be runtime CSS variables. All static styling stays in
  // quick-dictator.css.
  const coachCardRef = (node) => {
    cardRef.current = node;
    if (!node) return;
    node.style.setProperty("--qd-coach-left", `${pos.left}px`);
    node.style.setProperty("--qd-coach-top", `${pos.top}px`);
    node.style.setProperty("--qd-coach-width", `${CARD_WIDTH}px`);
  };

  return createPortal(
    <div
      ref={coachCardRef}
      role="dialog"
      aria-label="Quick dictation tip"
      data-quickdict-no-shimmer="true"
      className={`qd-coach-card ${isAbove ? "qd-coach-card-above" : "qd-coach-card-below"}`}
    >
      <span aria-hidden="true" className="qd-coach-arrow" />
      <div className="qd-coach-kicker-row">
        <span className="qd-coach-kicker">
          Quick Dictator
        </span>
        <span className="qd-kbd">⇧</span>
        <span className="qd-key-plus">+</span>
        <span className="qd-kbd">⇧</span>
      </div>
      <div className="qd-coach-copy">
        <strong>Double-tap the Shift key</strong> and
        start talking. Your words land right here, exactly as you said them.{" "}
        <button
          type="button"
          onClick={handleMore}
          className="qd-link-button"
        >
          Know more
        </button>
      </div>
      <div className="qd-coach-actions">
        <label className="qd-coach-checkbox-label">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              setDontShowAgain(checked);
              // Persist immediately so it stays dismissed even if the doctor
              // just clicks into another field instead of pressing "Got it".
              // Unchecking means "show me again" — clear every auto-dismiss
              // channel, otherwise any threshold already hit would still
              // block the tip.
              if (checked) persist({ ...stateRef.current, dismissed: true });
              else
                persist({
                  dismissed: false,
                  gotItCount: 0,
                  successCount: 0,
                  cancelCount: 0,
                });
            }}
            data-quickdict-no-coach="true"
            className="qd-coach-checkbox"
          />
          Don't show again
        </label>
        <button
          type="button"
          onClick={handleGotIt}
          className="qd-coach-got-it"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}

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
    title: "Cancel anytime",
    body: "Press Esc or click ✕ to discard what you just said.",
  },
];

export function TutorialDrawer() {
  const { isTutorialOpen, closeTutorial } = useVoiceBar();

  return (
    <Drawer
      title={
        <span className="qd-tutorial-title">
          Quick Dictator
        </span>
      }
      placement="right"
      width={400}
      open={isTutorialOpen}
      onClose={closeTutorial}
      destroyOnClose={false}
      zIndex={2147483647}
      rootClassName="qd-tutorial-drawer"
      closeIcon={
        <span
          aria-hidden
          className="qd-ico qd-ico-close-square qd-tutorial-close-icon"
        />
      }
    >
      <div className="qd-tutorial-content">
        <h2 className="qd-tutorial-heading">
          Talk through your notes in four steps.
        </h2>

        <ol className="qd-tutorial-steps">
          {STEPS.map((step, idx) => {
            const isLast = idx === STEPS.length - 1;
            return (
              <li
                key={step.n}
                className="qd-tutorial-step"
              >
                <span aria-hidden="true" className="qd-tutorial-step-index-wrap">
                  <span className="qd-tutorial-step-index">
                    {step.n}
                  </span>
                  {!isLast && (
                    <span className="qd-tutorial-step-line" />
                  )}
                </span>
                <div className="qd-tutorial-step-copy">
                  <h3 className="qd-tutorial-step-title">
                    {step.title}
                  </h3>
                  <p className="qd-tutorial-step-body">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="qd-tutorial-try">
          <span className="qd-tutorial-shortcut">
            <span className="qd-kbd qd-kbd-big">⇧</span>
            <span className="qd-key-plus qd-key-plus-dark">
              +
            </span>
            <span className="qd-kbd qd-kbd-big">⇧</span>
          </span>
          <span className="qd-tutorial-try-text">
            Try it now. Focus a notes field and double-tap Shift.
          </span>
        </div>
      </div>
    </Drawer>
  );
}
