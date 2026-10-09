"use client";

/**
 * VoiceRxAfterDictationPopover — appears when a dictation finishes and the
 * doctor wasn't focused on any input. Shows up to ~4 lines of the transcript
 * (fading at the bottom edge), a Copy button, a Close button, and a reverse
 * progress bar that ticks down to the auto-dismiss deadline.
 *
 * Black background, white text and CTAs (per the design call — no light
 * colors anywhere in the active path).
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, CloseSquare } from "iconsax-reactjs";
import { toast } from "@/src/components/molecules/Toaster";
import { useVoiceBar } from "./voice-bar-context";
import styles from "./VoiceRxAfterDictationPopover.module.scss";

const POPOVER_W = 360;
const POPOVER_GAP = 14;
const PILL_EXPANDED_H = 36;

function computePosition(anchorRect) {
  if (!anchorRect) return { right: 28, bottom: 80 };
  const pillCenterX = (anchorRect.left + anchorRect.right) / 2;
  const right = Math.max(12, window.innerWidth - pillCenterX - POPOVER_W / 2);
  const bottom = (window.innerHeight - anchorRect.bottom) + PILL_EXPANDED_H + POPOVER_GAP;
  return { right, bottom };
}

export function VoiceRxAfterDictationPopover({ anchorRef }) {
  const { popover, hidePopover } = useVoiceBar();
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ right: 28, bottom: 60 });
  const [progressPct, setProgressPct] = useState(100);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  // Position the popover anchored to the indicator.
  useLayoutEffect(() => {
    if (!popover) return;
    const update = () => {
      const r = anchorRef?.current?.getBoundingClientRect?.();
      setPos(computePosition(r));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [popover, anchorRef]);

  // Drive the reverse progress bar. We deliberately recompute remaining
  // time off the deadline rather than tracking elapsed time — so resuming
  // from background tabs doesn't drift.
  const rafRef = useRef(null);
  useEffect(() => {
    if (!popover) {
      setProgressPct(100);
      setCopied(false);
      return;
    }
    const start = Date.now();
    const total = popover.deadlineTs - start;
    if (total <= 0) {
      setProgressPct(0);
      hidePopover();
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, popover.deadlineTs - Date.now());
      const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
      setProgressPct(pct);
      if (remaining <= 0) {
        hidePopover();
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [popover, hidePopover]);

  if (!mounted || !popover) return null;

  const onCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(popover.text);
        setCopied(true);
        toast.success("Copied dictation to clipboard");
      }
    } catch {
      toast.error("Couldn't copy dictation");
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-label="Dictation result — copy or close"
      data-quickdictation-no-shimmer="true"
      className={`${styles.root} ${popover ? styles.visible : ""}`}
      style={{ right: `${pos.right}px`, bottom: `${pos.bottom}px`, width: POPOVER_W }}
    >
      <div className={styles.head}>
        <span className={styles.title}>VoiceRx · Captured</span>
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Close"
          onClick={hidePopover}
        >
          <CloseSquare size={16} color="currentColor" variant="Linear" />
        </button>
      </div>

      <div className={styles.preview}>{popover.text}</div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.cta} ${styles.primary} ${copied ? styles.done : ""}`}
          onClick={onCopy}
        >
          <Copy size={14} color="currentColor" variant="Linear" />
          {copied ? "Copied to clipboard" : "Copy to clipboard"}
        </button>
        <button
          type="button"
          className={`${styles.cta} ${styles.secondary}`}
          onClick={hidePopover}
        >
          Close
        </button>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>
    </div>,
    document.body
  );
}
