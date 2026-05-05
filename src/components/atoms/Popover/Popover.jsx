"use client";

/**
 * Popover — hand-rolled floating panel atom (no Radix).
 *
 * API mirrors Radix UI Popover so callers don't change:
 *   <Popover open | defaultOpen, onOpenChange>
 *     <PopoverTrigger asChild><Button/></PopoverTrigger>
 *     <PopoverContent side="bottom" align="center" sideOffset={6}>...</PopoverContent>
 *   </Popover>
 *
 * Behaviour:
 *   - Toggles on trigger click; closes on Escape, click-outside, or
 *     when the trigger is clicked again.
 *   - Position via usePosition (collision-aware flip).
 *   - Renders into document.body via Portal.
 *   - role="dialog" on content + aria-expanded on trigger.
 */

import * as React from "react";
import { Slot } from "@/src/hooks/ui/Slot";
import { Portal } from "@/src/hooks/ui/Portal";
import { usePosition, useEscape, useClickOutside } from "@/src/hooks/ui/use-overlay";

const PopoverContext = React.createContext(null);

export function Popover({ open: openProp, defaultOpen = false, onOpenChange, children }) {
  const isControlled = openProp !== undefined;
  const [internal, setInternal] = React.useState(Boolean(defaultOpen));
  const open = isControlled ? Boolean(openProp) : internal;

  const setOpen = React.useCallback(
    (v) => {
      if (!isControlled) setInternal(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  const ctx = React.useMemo(
    () => ({ open, setOpen, triggerRef, contentRef }),
    [open, setOpen],
  );

  return <PopoverContext.Provider value={ctx}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ asChild, children, ...props }) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) return children;

  const handleClick = (e) => {
    props.onClick?.(e);
    if (e.defaultPrevented) return;
    ctx.setOpen(!ctx.open);
  };

  const handlerProps = {
    onClick: handleClick,
    "aria-expanded": ctx.open,
    "aria-haspopup": "dialog",
    "data-state": ctx.open ? "open" : "closed",
    ref: ctx.triggerRef,
  };

  if (asChild) {
    return <Slot {...handlerProps}>{children}</Slot>;
  }
  return (
    <button type="button" {...handlerProps} {...props}>
      {children}
    </button>
  );
}

// PopoverAnchor: lets a consumer anchor the popover to a different
// element than the trigger. Currently unused but supported for
// API parity with Radix.
export function PopoverAnchor({ children, ...props }) {
  const ctx = React.useContext(PopoverContext);
  return (
    <span
      ref={(node) => {
        if (ctx) ctx.triggerRef.current = node;
      }}
      style={{ display: "inline-flex" }}
      {...props}>
      {children}
    </span>
  );
}

export function PopoverContent({
  className = "",
  align = "center",
  side = "bottom",
  sideOffset = 6,
  collisionPadding = 8,
  style: styleProp,
  children,
  onPointerDownOutside,
  onEscapeKeyDown,
  ...props
}) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx || !ctx.open) return null;

  return (
    <PopoverContentInner
      ctx={ctx}
      side={side}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={className}
      style={styleProp}
      onPointerDownOutside={onPointerDownOutside}
      onEscapeKeyDown={onEscapeKeyDown}
      {...props}>
      {children}
    </PopoverContentInner>
  );
}

function PopoverContentInner({
  ctx,
  side,
  align,
  sideOffset,
  collisionPadding,
  className,
  style,
  children,
  onPointerDownOutside,
  onEscapeKeyDown,
  ...props
}) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    ctx.contentRef.current = ref.current;
    return () => {
      if (ctx.contentRef.current === ref.current) ctx.contentRef.current = null;
    };
  }, [ctx]);

  useClickOutside(
    [ctx.triggerRef, ref],
    (e) => {
      onPointerDownOutside?.(e);
      if (!e.defaultPrevented) ctx.setOpen(false);
    },
    ctx.open,
  );

  useEscape((e) => {
    onEscapeKeyDown?.(e);
    if (!e.defaultPrevented) ctx.setOpen(false);
  }, ctx.open);

  const pos = usePosition({
    triggerRef: ctx.triggerRef,
    floatingRef: ref,
    open: ctx.open,
    side,
    align,
    sideOffset,
    collisionPadding,
  });

  return (
    <Portal>
      <div
        ref={ref}
        role="dialog"
        data-state="open"
        data-side={pos.side}
        className={className}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 100,
          minWidth: 200,
          background: "white",
          border: "1px solid var(--tp-slate-200)",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          padding: 8,
          outline: "none",
          ...style,
        }}
        {...props}>
        {children}
      </div>
    </Portal>
  );
}

PopoverContent.displayName = "PopoverContent";
PopoverTrigger.displayName = "PopoverTrigger";
PopoverAnchor.displayName = "PopoverAnchor";
Popover.displayName = "Popover";
