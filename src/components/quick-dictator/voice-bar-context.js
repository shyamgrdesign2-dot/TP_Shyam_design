// Quick Dictator — global keyboard listener + dictation state machine.
//
// Public surface:
//   <VoiceBarProvider>   — context provider, installs the double-Shift
//                          listener while the bar is open. The rest of the
//                          page stays fully interactive (no page scrim, no
//                          click blocking), matching VoiceRx's behaviour.
//   useVoiceBar()        — { isOpen, open, close, route, openTutorial,
//                            closeTutorial, isTutorialOpen,
//                            shimmerTick, shimmerTarget, pingShimmer }

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { message } from "antd";

const VoiceBarContext = createContext(null);
const DOUBLE_TAP_WINDOW_MS = 400;

// TP design-system snackbars, reusing the app's existing antd-message styles
// (see allComponent.scss) plus TP CDN mask icons (see `.qd-ico*` in the CSS):
//   success → dark `.message-appointment` card with a green tick
//   error   → red `.error-red` card with a red danger icon
// Icon + text live in one flex row inside the content so they never stack.
export function qdToast(content, { type = "success", duration = 3 } = {}) {
  const isError = type === "error";
  const icon = React.createElement("span", {
    "aria-hidden": true,
    className: `qd-ico qd-ico-${isError ? "danger" : "check"}`,
    style: {
      width: 18,
      height: 18,
      flexShrink: 0,
      color: isError ? "#dc6069" : "#52c41a",
    },
  });
  // The success card's CSS only paints `div`s white; without an inline colour
  // here, the app's global `span` rule would re-tint the text dark. Error
  // toasts already force red via `.error-red div, span`, so we hand them the
  // colour they expect.
  const textColor = isError ? "#dc6069" : "#fff";
  return message.open({
    type: "",
    className: isError ? "error-red" : "message-appointment",
    content: React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: textColor,
        },
      },
      icon,
      React.createElement("span", { style: { color: textColor } }, content)
    ),
    duration,
  });
}

export function VoiceBarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [shimmerTick, setShimmerTick] = useState(0);
  const [shimmerTarget, setShimmerTarget] = useState(null);
  const pingShimmer = useCallback((el) => {
    setShimmerTarget(el ?? null);
    setShimmerTick((n) => n + 1);
  }, []);

  // The element that had focus right before the bar opened — we restore it
  // on accept so the dictated text lands in the right place.
  const restoreFocusRef = useRef(null);

  const open = useCallback(() => {
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      restoreFocusRef.current =
        active && active !== document.body ? active : null;
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(({ restoreFocus = true } = {}) => {
    setIsOpen(false);
    if (
      restoreFocus &&
      restoreFocusRef.current &&
      typeof restoreFocusRef.current.focus === "function"
    ) {
      try {
        restoreFocusRef.current.focus();
      } catch (_) {
        /* ignore */
      }
    }
    restoreFocusRef.current = null;
  }, []);

  const openTutorial = useCallback(() => setIsTutorialOpen(true), []);
  const closeTutorial = useCallback(() => setIsTutorialOpen(false), []);

  // ── Route the final transcript ──────────────────────────────────────────
  // Returns "input" | "editable" | "clipboard" | "empty" so the caller can
  // show the right toast. Dispatches `tp-voicerx-dictation-success` so the
  // coach mark can dampen itself for the post-submit re-focus.
  const route = useCallback((text) => {
    const value = (text ?? "").trim();
    if (!value) return "empty";

    const target = restoreFocusRef.current;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("tp-voicerx-dictation-success", {
          detail: { text: value, target },
        })
      );
    }

    const isInput =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement;
    const isEditable = target && target.isContentEditable;

    if (isInput) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const before = target.value.slice(0, start);
      const after = target.value.slice(end);
      const sep = before && !/\s$/.test(before) ? " " : "";
      const next = `${before}${sep}${value}${after}`;
      const setter = Object.getOwnPropertyDescriptor(
        target.constructor.prototype,
        "value"
      )?.set;
      if (setter) setter.call(target, next);
      else target.value = next;
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
      } catch (_) {
        /* fall through */
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    return "clipboard";
  }, []);

  // ── Double-tap Shift / single-Shift / Esc ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastShiftTs = 0;

    const onKeyDown = (e) => {
      if (isOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          lastShiftTs = 0;
          close({ restoreFocus: true });
          return;
        }
        if (
          e.key === "Shift" &&
          !e.repeat &&
          !e.altKey &&
          !e.ctrlKey &&
          !e.metaKey
        ) {
          e.preventDefault();
          lastShiftTs = 0;
          window.dispatchEvent(new CustomEvent("tp-quickdict-accept"));
          return;
        }
        return;
      }

      if (e.key !== "Shift") return;
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
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

  // ── Auto-shimmer ping on every qualifying text focus ───────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isShimmerSource = (el) => {
      if (!el || el.nodeType !== 1) return false;
      if (el.closest("[data-quickdict-no-shimmer]")) return false;
      const tag = el.tagName;
      if (tag === "INPUT") {
        const type = (el.getAttribute("type") || "text").toLowerCase();
        return ["text", "search", "url", "tel", "email", "password", "number", ""].includes(type);
      }
      if (tag === "TEXTAREA") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onFocusIn = (e) => {
      if (!isShimmerSource(e.target)) return;
      pingShimmer(e.target);
    };
    window.addEventListener("focusin", onFocusIn, true);
    return () => window.removeEventListener("focusin", onFocusIn, true);
  }, [pingShimmer]);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      route,
      isTutorialOpen,
      openTutorial,
      closeTutorial,
      shimmerTick,
      shimmerTarget,
      pingShimmer,
    }),
    [
      isOpen,
      open,
      close,
      route,
      isTutorialOpen,
      openTutorial,
      closeTutorial,
      shimmerTick,
      shimmerTarget,
      pingShimmer,
    ]
  );

  return (
    <VoiceBarContext.Provider value={value}>
      {children}
    </VoiceBarContext.Provider>
  );
}

export function useVoiceBar() {
  const ctx = useContext(VoiceBarContext);
  if (!ctx)
    throw new Error("useVoiceBar must be used inside a VoiceBarProvider");
  return ctx;
}
