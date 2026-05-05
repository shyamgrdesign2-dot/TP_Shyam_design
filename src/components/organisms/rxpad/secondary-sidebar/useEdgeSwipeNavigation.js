/**
 * useEdgeSwipeNavigation — turns a deliberate "push past the edge" gesture
 * into section navigation, while leaving normal in-content scrolling alone.
 *
 * Mental model (iOS-style overscroll-to-paginate):
 *   1. Normal scroll inside the panel always works — nothing fires.
 *   2. Once the scroll reaches the top or bottom edge, we wait a grace
 *      period (EDGE_SETTLE_MS) — this filters out scrolls that simply
 *      "hit" the edge at the end of a normal scroll.
 *   3. After the grace period, further sustained overscroll input in the
 *      same direction accumulates against a high threshold. Only when the
 *      user keeps pushing does navigation fire.
 *   4. Any scroll-away from the edge (or letting up) resets the accumulator.
 *
 * Touch is treated separately as an explicit swipe gesture (distance +
 * velocity thresholds) — a normal touch-scroll inside the panel never
 * triggers nav.
 */

import { useEffect, useRef } from "react";

// ─── Tunables ─────────────────────────────────────────────────────────────────

/** ms the user must dwell at the edge before any overscroll counts. */
const EDGE_SETTLE_MS = 220;
/** Accumulated wheel deltaY (px) past the edge required to fire nav. */
const WHEEL_OVERSCROLL_THRESHOLD = 480;
/** How long a wheel event "counts" before the accumulator decays. */
const WHEEL_IDLE_RESET_MS = 260;

/** Minimum touch swipe distance (px) to be considered a hard swipe. */
const TOUCH_DISTANCE_THRESHOLD = 110;
/** Minimum touch swipe velocity (px/ms) to be considered a hard swipe. */
const TOUCH_VELOCITY_THRESHOLD = 0.65;

/** Lockout after a successful nav fire. */
const COOLDOWN_MS = 800;

// ─── Types ────────────────────────────────────────────────────────────────────












// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAtTop(el) {return el.scrollTop <= 1;}
function isAtBottom(el) {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
}

function findScrollEl(container, selector) {
  const explicit = container.querySelector(selector);
  if (explicit) return explicit;
  const candidates = container.querySelectorAll("*");
  for (const el of candidates) {
    const overflowY = getComputedStyle(el).overflowY;
    if (
    (overflowY === "auto" || overflowY === "scroll") &&
    el.scrollHeight > el.clientHeight)
    return el;
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEdgeSwipeNavigation({
  containerRef,
  scrollSelector = "[data-sticky-scroll-root='true']",
  onNavigate,
  enabled = true,
  resetKey
}) {
  // Refs so the inner closures can read the latest values without rebinding.
  const lastFiredAt = useRef(0);
  // Wheel state
  const wheelAccumulator = useRef(0);
  const wheelDirection = useRef(null);
  const lastWheelAt = useRef(0);
  /**
   * When the user FIRST started pushing wheel-past-edge in the current
   * direction. Anchored to the first overscroll wheel event itself (not
   * to scroll-handler edge entry), so timing is robust to async scroll
   * event delivery and stale state from prior sections.
   */
  const overscrollStartAt = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    let detach = () => {};
    const rafId = requestAnimationFrame(() => {
      const el = findScrollEl(container, scrollSelector);
      if (el) attach(el);
    });

    function attach(el) {
      // Reset all state on attach.
      wheelAccumulator.current = 0;
      wheelDirection.current = null;
      overscrollStartAt.current = null;
      lastWheelAt.current = 0;

      const resetWheel = () => {
        wheelAccumulator.current = 0;
        wheelDirection.current = null;
        overscrollStartAt.current = null;
      };

      const fire = (dir) => {
        const now = performance.now();
        if (now - lastFiredAt.current < COOLDOWN_MS) return;
        lastFiredAt.current = now;
        resetWheel();
        onNavigate(dir);
      };

      // Watch scroll — any in-content scroll movement kills the
      // accumulator (user wants to scroll normally, not paginate).
      const onScroll = () => {
        const top = isAtTop(el);
        const bottom = isAtBottom(el);
        if (wheelDirection.current === "next" && !bottom ||
        wheelDirection.current === "prev" && !top) {
          resetWheel();
        }
      };

      // ─── Wheel: deliberate overscroll only ───────────────────────────────
      const onWheel = (event) => {
        const dy = event.deltaY;
        if (Math.abs(dy) < 4) return;

        const now = performance.now();
        const goingDown = dy > 0;
        const atTop = isAtTop(el);
        const atBottom = isAtBottom(el);

        const overscrolling = goingDown && atBottom || !goingDown && atTop;
        if (!overscrolling) {
          // Wheel that ISN'T past the edge — user scrolling normally.
          resetWheel();
          return;
        }

        const dir = goingDown ? "next" : "prev";

        // Direction change resets the attempt.
        if (wheelDirection.current !== dir) {
          wheelDirection.current = dir;
          wheelAccumulator.current = 0;
          overscrollStartAt.current = null;
        }

        // Idle gap → previous attempt is over, start a new one.
        if (lastWheelAt.current && now - lastWheelAt.current > WHEEL_IDLE_RESET_MS) {
          wheelAccumulator.current = 0;
          overscrollStartAt.current = null;
        }
        lastWheelAt.current = now;

        // Anchor the settle window to the FIRST overscroll wheel event in
        // this attempt. Subsequent wheel events are ignored until that
        // window has elapsed — this is what filters out wheel ticks that
        // are just the tail end of a normal scroll arriving at the edge.
        if (overscrollStartAt.current === null) {
          overscrollStartAt.current = now;
          return;
        }
        if (now - overscrollStartAt.current < EDGE_SETTLE_MS) {
          // Still inside the settle window — don't accumulate.
          return;
        }

        wheelAccumulator.current += Math.abs(dy);
        if (wheelAccumulator.current >= WHEEL_OVERSCROLL_THRESHOLD) fire(dir);
      };

      // ─── Touch: explicit hard swipe gesture ──────────────────────────────
      let touchStartY = 0;
      let touchStartTime = 0;
      let touchStartedAtTop = false;
      let touchStartedAtBottom = false;

      const onTouchStart = (event) => {
        const t = event.touches[0];
        if (!t) return;
        touchStartY = t.clientY;
        touchStartTime = performance.now();
        touchStartedAtTop = isAtTop(el);
        touchStartedAtBottom = isAtBottom(el);
      };

      const onTouchEnd = (event) => {
        const t = event.changedTouches[0];
        if (!t) return;
        const dy = touchStartY - t.clientY; // +ve = swipe up
        const dt = performance.now() - touchStartTime;
        if (dt <= 0) return;
        const velocity = Math.abs(dy) / dt;

        if (Math.abs(dy) < TOUCH_DISTANCE_THRESHOLD) return;
        if (velocity < TOUCH_VELOCITY_THRESHOLD) return;

        // Swipe up while bottom-pinned → next; swipe down while top-pinned → prev.
        // Require the gesture to begin AND end at the edge — cuts out
        // mid-content swipes that happen to end at an edge.
        if (dy > 0 && touchStartedAtBottom && isAtBottom(el)) fire("next");else
        if (dy < 0 && touchStartedAtTop && isAtTop(el)) fire("prev");
      };

      el.addEventListener("scroll", onScroll, { passive: true });
      el.addEventListener("wheel", onWheel, { passive: true });
      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchend", onTouchEnd, { passive: true });

      detach = () => {
        el.removeEventListener("scroll", onScroll);
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchend", onTouchEnd);
      };
    }

    return () => {
      cancelAnimationFrame(rafId);
      detach();
      wheelAccumulator.current = 0;
      wheelDirection.current = null;
      overscrollStartAt.current = null;
      lastWheelAt.current = 0;
    };
  }, [enabled, onNavigate, containerRef, scrollSelector, resetKey]);
}