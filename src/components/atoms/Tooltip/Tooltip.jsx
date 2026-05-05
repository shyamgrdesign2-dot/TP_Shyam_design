"use client";

/**
 * Tooltip — hand-rolled tooltip atom (no Radix).
 *
 * Two consumption styles, both supported (mirrors Radix UI Tooltip):
 *
 *   1. Simple wrapper:
 *      <Tooltip content="Save changes" side="bottom"><Button/></Tooltip>
 *
 *   2. Compound parts:
 *      <TooltipProvider delayDuration={200}>
 *        <Tooltip>
 *          <TooltipTrigger asChild><Button/></TooltipTrigger>
 *          <TooltipContent side="bottom" sideOffset={6}>Save changes</TooltipContent>
 *        </Tooltip>
 *      </TooltipProvider>
 *
 * Behaviour:
 *   - Opens on pointer enter / focus, closes on leave / blur / Escape.
 *   - Position via usePosition (collision-aware flip).
 *   - Renders into document.body via Portal.
 *   - role="tooltip" + aria-describedby on the trigger for a11y.
 */

import * as React from "react";
import { Slot } from "@/src/hooks/ui/Slot";
import { Portal } from "@/src/hooks/ui/Portal";
import { usePosition, useEscape } from "@/src/hooks/ui/use-overlay";
import styles from "./Tooltip.module.scss";

const ProviderContext = React.createContext({ delayDuration: 200 });
const TooltipContext = React.createContext(null);

let _id = 0;
const nextId = () => `tp-tt-${++_id}`;

export function TooltipProvider({ delayDuration = 200, children }) {
  const value = React.useMemo(() => ({ delayDuration }), [delayDuration]);
  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
}

/**
 * Tooltip — works in both modes:
 *   - With `content` prop (and/or `children` is a single element):
 *       wrapper mode — no provider needed.
 *   - With <TooltipTrigger>/<TooltipContent> children:
 *       compound mode — supplies hover/focus state to its parts.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  collisionPadding = 8,
  delayDuration,
  className,
  open: openProp,
  defaultOpen,
  onOpenChange,
}) {
  const provider = React.useContext(ProviderContext);
  const delay = delayDuration ?? provider.delayDuration ?? 200;

  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(Boolean(defaultOpen));
  const open = isControlled ? Boolean(openProp) : internalOpen;
  const setOpen = React.useCallback(
    (v) => {
      if (!isControlled) setInternalOpen(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = React.useRef(null);
  const floatingRef = React.useRef(null);
  const idRef = React.useRef(null);
  if (idRef.current === null) idRef.current = nextId();
  const id = idRef.current;

  const openTimer = React.useRef(0);
  const closeTimer = React.useRef(0);

  const cancelTimers = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  };
  const requestOpen = () => {
    cancelTimers();
    openTimer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const requestClose = () => {
    cancelTimers();
    closeTimer.current = window.setTimeout(() => setOpen(false), 60);
  };

  React.useEffect(() => () => cancelTimers(), []);

  useEscape(() => setOpen(false), open);

  // Compound mode: supply context to TooltipTrigger / TooltipContent.
  const ctxValue = React.useMemo(
    () => ({
      open,
      requestOpen,
      requestClose,
      triggerRef,
      floatingRef,
      id,
      side,
      align,
      sideOffset,
      collisionPadding,
      className,
    }),
    [open, id, side, align, sideOffset, collisionPadding, className],
  );

  // Wrapper mode: if `content` is set, render the simple form.
  if (content !== undefined) {
    const child = React.Children.only(children);
    return (
      <TooltipContext.Provider value={ctxValue}>
        <TooltipTrigger asChild>{child}</TooltipTrigger>
        {open ? (
          <TooltipContent side={side} align={align} sideOffset={sideOffset} className={className}>
            {content}
          </TooltipContent>
        ) : null}
      </TooltipContext.Provider>
    );
  }

  return <TooltipContext.Provider value={ctxValue}>{children}</TooltipContext.Provider>;
}

export function TooltipTrigger({ asChild, children, ...props }) {
  const ctx = React.useContext(TooltipContext);
  if (!ctx) return children;

  const handlers = {
    onPointerEnter: (e) => {
      props.onPointerEnter?.(e);
      ctx.requestOpen();
    },
    onPointerLeave: (e) => {
      props.onPointerLeave?.(e);
      ctx.requestClose();
    },
    onFocus: (e) => {
      props.onFocus?.(e);
      ctx.requestOpen();
    },
    onBlur: (e) => {
      props.onBlur?.(e);
      ctx.requestClose();
    },
    "aria-describedby": ctx.open ? ctx.id : undefined,
    ref: ctx.triggerRef,
  };

  if (asChild) {
    return <Slot {...handlers}>{children}</Slot>;
  }
  return (
    <span style={{ display: "inline-flex" }} {...handlers} {...props}>
      {children}
    </span>
  );
}

export function TooltipContent({
  className = "",
  side: sideProp,
  align: alignProp,
  sideOffset: sideOffsetProp,
  collisionPadding: collisionPaddingProp,
  style,
  children,
  ...props
}) {
  const ctx = React.useContext(TooltipContext);
  if (!ctx || !ctx.open) return null;

  return <TooltipContentInner
    ctx={ctx}
    side={sideProp}
    align={alignProp}
    sideOffset={sideOffsetProp}
    collisionPadding={collisionPaddingProp}
    className={className}
    style={style}
    {...props}>
    {children}
  </TooltipContentInner>;
}

function TooltipContentInner({
  ctx,
  side,
  align,
  sideOffset,
  collisionPadding,
  className,
  style,
  children,
  ...props
}) {
  const ref = React.useRef(null);

  // Wire ref to context so the position machinery can read it.
  React.useEffect(() => {
    ctx.floatingRef.current = ref.current;
    return () => {
      if (ctx.floatingRef.current === ref.current) ctx.floatingRef.current = null;
    };
  }, [ctx]);

  const pos = usePosition({
    triggerRef: ctx.triggerRef,
    floatingRef: ref,
    open: ctx.open,
    side: side ?? ctx.side,
    align: align ?? ctx.align,
    sideOffset: sideOffset ?? ctx.sideOffset,
    collisionPadding: collisionPadding ?? ctx.collisionPadding,
  });

  const cls = [styles.content, ctx.className, className].filter(Boolean).join(" ");

  return (
    <Portal>
      <div
        ref={ref}
        id={ctx.id}
        role="tooltip"
        data-state="open"
        data-side={pos.side}
        className={cls}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          pointerEvents: "none",
          ...style,
        }}
        {...props}>
        {children}
      </div>
    </Portal>
  );
}

Tooltip.displayName = "Tooltip";
TooltipProvider.displayName = "TooltipProvider";
TooltipTrigger.displayName = "TooltipTrigger";
TooltipContent.displayName = "TooltipContent";
export default Tooltip;
