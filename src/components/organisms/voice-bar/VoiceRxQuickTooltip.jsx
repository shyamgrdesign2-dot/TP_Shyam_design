"use client";

/**
 * VoiceRxQuickTooltip — hover/click tooltip for the indicator pill.
 *
 * Wispr-style: black background, white text, two CTAs ("Start dictation" /
 * "View history"). Mounts via portal so its z-stack is independent of the
 * indicator pill's stacking context, and positions itself relative to the
 * anchor (the indicator) using getBoundingClientRect().
 *
 * Educational copy ("Double-tap Shift…") so the doctor learns the shortcut
 * the first time they hover over the indicator.
 */

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Microphone2, Clock } from "iconsax-reactjs";
import { useVoiceBar } from "./voice-bar-context";
import styles from "./VoiceRxQuickTooltip.module.scss";

const TOOLTIP_W = 320;
const TOOLTIP_GAP = 14;
// The indicator pill's expanded height. We anchor the tooltip's bottom edge
// to (pill bottom + expanded height + gap) regardless of whether the pill is
// currently resting or expanded — otherwise the tooltip is positioned for
// the resting height (6 px) and the pill grows up under it on hover.
const PILL_EXPANDED_H = 36;

function computePosition(anchorRect) {
  if (!anchorRect) return { right: 28, bottom: 80 };
  // Pill is centered horizontally — center the tooltip on its midpoint, but
  // express it as `right` so the tooltip's transform-origin (bottom right)
  // keeps its arrow anchored to the pill.
  const pillCenterX = (anchorRect.left + anchorRect.right) / 2;
  const right = Math.max(12, window.innerWidth - pillCenterX - TOOLTIP_W / 2);
  // Anchor to the pill's BOTTOM edge (stable across resting/expanded) plus
  // the expanded height + gap so the tooltip never overlaps the expanded
  // chrome even if it was computed while the pill was still resting.
  const bottom = (window.innerHeight - anchorRect.bottom) + PILL_EXPANDED_H + TOOLTIP_GAP;
  return { right, bottom };
}

export function VoiceRxQuickTooltip({ anchorRef, visible, onClose, onStartDictation }) {
  const { openHistory } = useVoiceBar();
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ right: 28, bottom: 60 });

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!visible) return;
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
  }, [visible, anchorRef]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-label="VoiceRx quick dictation menu"
      data-quickdictation-no-shimmer="true"
      className={`${styles.root} ${visible ? styles.visible : ""}`}
      style={{ right: `${pos.right}px`, bottom: `${pos.bottom}px`, width: TOOLTIP_W }}
      onMouseLeave={onClose}
    >
      <div className={styles.arrow} aria-hidden="true" />

      <div className={styles.header}>
        <span className={styles.kbd}>⇧</span>
        <span className={styles.plus}>+</span>
        <span className={styles.kbd}>⇧</span>
      </div>

      <div className={styles.title}>Quick dictation</div>
      <div className={styles.sub}>
        Double-tap <b>Shift</b> anywhere to start. Press <b>Shift</b> again
        to finish — the text drops into your focused input, or copies to
        your clipboard.
      </div>

      <div className={styles.ctaRow}>
        <button
          type="button"
          className={`${styles.cta} ${styles.primary}`}
          onClick={() => onStartDictation?.()}
        >
          <Microphone2 size={14} color="currentColor" variant="Linear" />
          Start dictation
        </button>
        <button
          type="button"
          className={`${styles.cta} ${styles.secondary}`}
          onClick={() => { openHistory(); onClose?.(); }}
        >
          <Clock size={14} color="currentColor" variant="Linear" />
          History
        </button>
      </div>
    </div>,
    document.body
  );
}
