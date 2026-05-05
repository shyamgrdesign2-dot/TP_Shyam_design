"use client";

/**
 * HoverTooltip — TP Design System tooltip for inline hover triggers.
 *
 * Anchors the popover to the trigger element's actual bounding rect via
 * `getBoundingClientRect()`. Reads the rect on every show + on every
 * scroll/resize while open, so the popover always sits exactly above
 * (or below) whatever the cursor is hovering on. No Radix Portal
 * rerouting, no `display: contents` weirdness — just `position: fixed`
 * over the trigger.
 *
 * API:
 *   <HoverTooltip content="Notes by Dr. Shyam" side="top">
 *     <button>...</button>
 *   </HoverTooltip>
 *
 *   - content     ReactNode shown inside the popover
 *   - side        "top" | "bottom" | "left" | "right"   (default "top")
 *   - align       "center" | "start" | "end"            (default "center")
 *   - offset      px between trigger and popover         (default 8)
 *   - delay       ms before show on hover                (default 200)
 *   - className   extra class on the popover surface
 *
 * The wrapper element renders as `inline-flex` so it has a real box
 * (`getBoundingClientRect()` returns the wrapped child's footprint
 * exactly). It does not add any visible padding or border.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import styles from "./Tooltip.module.scss";

export function HoverTooltip({
  content,
  children,
  side = "top",
  align = "center",
  offset = 8,
  delay = 200,
  className,
}) {
  const triggerRef = React.useRef(null);
  const showTimerRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);

  const computePos = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { rect: r };
  }, []);

  const show = React.useCallback(() => {
    if (showTimerRef.current != null) return;
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      const p = computePos();
      if (!p) return;
      setPos(p);
      setOpen(true);
    }, delay);
  }, [computePos, delay]);

  const hide = React.useCallback(() => {
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setOpen(false);
  }, []);

  // Re-measure on scroll / resize while open so the popover sticks to
  // the trigger if the page moves underneath.
  React.useEffect(() => {
    if (!open) return;
    const onChange = () => {
      const p = computePos();
      if (p) setPos(p);
    };
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [open, computePos]);

  React.useEffect(() => () => hide(), [hide]);

  // Compute popover position from rect + side + align.
  let style = null;
  if (pos) {
    const r = pos.rect;
    let top = 0;
    let left = 0;
    let transform = "";
    switch (side) {
      case "bottom":
        top = r.bottom + offset;
        if (align === "start") left = r.left;
        else if (align === "end") left = r.right;
        else {
          left = r.left + r.width / 2;
          transform = "translateX(-50%)";
        }
        if (align === "end") transform = "translateX(-100%)";
        break;
      case "left":
        left = r.left - offset;
        top = r.top + r.height / 2;
        transform = "translate(-100%, -50%)";
        break;
      case "right":
        left = r.right + offset;
        top = r.top + r.height / 2;
        transform = "translateY(-50%)";
        break;
      case "top":
      default:
        top = r.top - offset;
        if (align === "start") {
          left = r.left;
          transform = "translateY(-100%)";
        } else if (align === "end") {
          left = r.right;
          transform = "translate(-100%, -100%)";
        } else {
          left = r.left + r.width / 2;
          transform = "translate(-50%, -100%)";
        }
        break;
    }
    style = { position: "fixed", top, left, transform, zIndex: 250 };
  }

  const surfaceCls = [styles.content, className].filter(Boolean).join(" ");

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display: "inline-flex" }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}>
        {children}
      </span>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              style={{ ...style, pointerEvents: "none" }}
              className={surfaceCls}>
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

HoverTooltip.displayName = "HoverTooltip";
export default HoverTooltip;
