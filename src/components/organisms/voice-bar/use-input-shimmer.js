"use client";

/**
 * useInputShimmer — global focusin listener that NUDGES the indicator pill
 * whenever the doctor focuses a text input inside the VoiceRx scope.
 *
 * Originally this added a shimmer class to the input itself; the design call
 * is now reversed — the input stays clean, and the bottom dictate pill is the
 * surface that briefly glows / shimmers to teach "you can also dictate here."
 *
 * Implementation:
 *   • A single window-level `focusin` listener (no per-input wiring).
 *   • Active only while the VoiceRx scope is mounted (isIndicatorVisible).
 *   • Ignores focus events that originate inside the Quick-Dictation chrome
 *     (the indicator, tooltip, popover, history sidebar, voice bar, …).
 *   • On a qualifying focus, pings a counter in context — the indicator
 *     component watches it and runs a one-shot CSS shimmer on its own pill.
 */

import { useEffect } from "react";
import { useVoiceBar } from "./voice-bar-context";

const SCOPE_OPT_OUT = "data-quickdictation-no-shimmer";

function isShimmerSource(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.closest(`[${SCOPE_OPT_OUT}]`)) return false;
  const tag = el.tagName;
  if (tag === "INPUT") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    return ["text", "search", "url", "tel", "email", "password", "number", ""].includes(type);
  }
  if (tag === "TEXTAREA") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useInputShimmer() {
  const { isIndicatorVisible, pingShimmer } = useVoiceBar();

  useEffect(() => {
    if (!isIndicatorVisible) return;
    if (typeof window === "undefined") return;

    const onFocusIn = (e) => {
      if (!isShimmerSource(e.target)) return;
      pingShimmer(e.target);
    };

    window.addEventListener("focusin", onFocusIn, true);
    return () => window.removeEventListener("focusin", onFocusIn, true);
  }, [isIndicatorVisible, pingShimmer]);
}
