"use client";

/**
 * Popover — Floating content panel atom wrapping Radix Popover.
 * Styling: inline CSS using TP design tokens.
 */

import * as PopoverPrimitive from "@radix-ui/react-popover";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
  className = "",
  align = "center",
  side = "bottom",
  sideOffset = 6,
  style: styleProp,
  children,
  ...props
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        side={side}
        sideOffset={sideOffset}
        style={{
          zIndex: 100,
          minWidth: 200,
          background: "white",
          border: "1px solid var(--tp-slate-200)",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          padding: 8,
          outline: "none",
          ...styleProp,
        }}
        className={className}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

PopoverContent.displayName = "PopoverContent";
