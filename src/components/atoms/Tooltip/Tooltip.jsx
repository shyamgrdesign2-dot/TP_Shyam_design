"use client";

/**
 * Tooltip — Wraps Radix UI Tooltip with TP styling.
 * Styling: Tooltip.module.scss (static dark-bg content box).
 */

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import styles from "./Tooltip.module.scss";










export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  collisionPadding = 8,
  delayDuration = 200,
  className,
}) {
  const contentCls = [styles.content, className].filter(Boolean).join(" ");

  // Radix needs a real box to compute the trigger's position. The
  // previous `<span style="display: contents">` wrapper had no
  // bounding box, so Radix fell back to anchoring at (0,0) and the
  // popover ended up floating near the top-left of the page. Wrap in
  // an `inline-flex` span (a proper box that doesn't add visual mass)
  // so `getBoundingClientRect()` returns the trigger element's rect.
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span style={{ display: "inline-flex" }}>{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            collisionPadding={collisionPadding}
            className={contentCls}>
            {content}
            <TooltipPrimitive.Arrow className={styles.arrow} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

Tooltip.displayName = "Tooltip";
export default Tooltip;

/* ── Radix sub-component surface ── */

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className = "",
  sideOffset = 6,
  children,
  ...props
}) {
  const cls = [styles.content, className].filter(Boolean).join(" ");

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content sideOffset={sideOffset} className={cls} {...props}>
        {children}
        <TooltipPrimitive.Arrow className={styles.arrow} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>);

}