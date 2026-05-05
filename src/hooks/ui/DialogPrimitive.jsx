"use client";

/**
 * DialogPrimitive — internal headless modal/drawer primitive used by
 * Dialog, Drawer, ConfirmDialog. Replaces @radix-ui/react-dialog.
 *
 * Exports a Radix-compatible compound API:
 *   <Root open onOpenChange>
 *     <Trigger asChild>...</Trigger>
 *     <Portal>
 *       <Overlay />
 *       <Content>
 *         <Title /> <Description />
 *         <Close asChild>...</Close>
 *         ...
 *       </Content>
 *     </Portal>
 *   </Root>
 *
 * Behaviour:
 *   - Focus trap inside Content while open.
 *   - <body> scroll lock while open.
 *   - Escape closes (calls onOpenChange(false)).
 *   - Pointer-down on Overlay closes.
 *   - Restores focus to the previously focused element on close.
 */

import * as React from "react";
import { Slot } from "./Slot";
import { Portal as PortalImpl } from "./Portal";
import { useEscape, useScrollLock, useFocusTrap } from "./use-overlay";

const DialogContext = React.createContext(null);

export function Root({ open: openProp, defaultOpen = false, onOpenChange, children }) {
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

  const titleId = React.useId();
  const descId = React.useId();

  const ctx = React.useMemo(
    () => ({ open, setOpen, triggerRef, contentRef, titleId, descId }),
    [open, setOpen, titleId, descId],
  );

  return <DialogContext.Provider value={ctx}>{children}</DialogContext.Provider>;
}

export function Trigger({ asChild, children, ...props }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) return children;

  const handleClick = (e) => {
    props.onClick?.(e);
    if (e.defaultPrevented) return;
    ctx.setOpen(true);
  };

  const handlerProps = {
    onClick: handleClick,
    "aria-haspopup": "dialog",
    "aria-expanded": ctx.open,
    "data-state": ctx.open ? "open" : "closed",
    ref: ctx.triggerRef,
  };

  if (asChild) return <Slot {...handlerProps}>{children}</Slot>;
  return (
    <button type="button" {...handlerProps} {...props}>
      {children}
    </button>
  );
}

export function Close({ asChild, children, ...props }) {
  const ctx = React.useContext(DialogContext);
  const handleClick = (e) => {
    props.onClick?.(e);
    if (e.defaultPrevented) return;
    ctx?.setOpen(false);
  };
  if (asChild) return <Slot {...props} onClick={handleClick}>{children}</Slot>;
  return (
    <button type="button" {...props} onClick={handleClick}>
      {children}
    </button>
  );
}

export function Portal({ children }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx?.open) return null;
  return <PortalImpl>{children}</PortalImpl>;
}

export function Overlay({ className, style, onClick, ...props }) {
  const ctx = React.useContext(DialogContext);
  const handleClick = (e) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    ctx?.setOpen(false);
  };
  return (
    <div
      data-state={ctx?.open ? "open" : "closed"}
      onClick={handleClick}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        ...style,
      }}
      {...props} />
  );
}

export const Content = React.forwardRef(function Content(
  {
    className,
    style,
    children,
    onEscapeKeyDown,
    onInteractOutside,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  forwardedRef,
) {
  const ctx = React.useContext(DialogContext);
  const ref = React.useRef(null);

  // expose ref
  React.useImperativeHandle(forwardedRef, () => ref.current);
  React.useEffect(() => {
    ctx.contentRef.current = ref.current;
    return () => {
      if (ctx.contentRef.current === ref.current) ctx.contentRef.current = null;
    };
  }, [ctx]);

  useScrollLock(ctx.open);
  useFocusTrap(ref, ctx.open);
  useEscape((e) => {
    onEscapeKeyDown?.(e);
    if (!e.defaultPrevented) ctx.setOpen(false);
  }, ctx.open);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy ?? ctx.titleId}
      aria-describedby={ariaDescribedBy ?? ctx.descId}
      data-state={ctx.open ? "open" : "closed"}
      className={className}
      style={{ position: "fixed", zIndex: 51, ...style }}
      onClick={(e) => e.stopPropagation()}
      {...props}>
      {children}
    </div>
  );
});

export const Title = React.forwardRef(function Title(
  { className, style, children, ...props },
  ref,
) {
  const ctx = React.useContext(DialogContext);
  return (
    <h2 ref={ref} id={ctx?.titleId} className={className} style={style} {...props}>
      {children}
    </h2>
  );
});

export const Description = React.forwardRef(function Description(
  { className, style, children, ...props },
  ref,
) {
  const ctx = React.useContext(DialogContext);
  return (
    <p ref={ref} id={ctx?.descId} className={className} style={style} {...props}>
      {children}
    </p>
  );
});

Root.displayName = "DialogPrimitive.Root";
Trigger.displayName = "DialogPrimitive.Trigger";
Close.displayName = "DialogPrimitive.Close";
Portal.displayName = "DialogPrimitive.Portal";
Overlay.displayName = "DialogPrimitive.Overlay";
Content.displayName = "DialogPrimitive.Content";
Title.displayName = "DialogPrimitive.Title";
Description.displayName = "DialogPrimitive.Description";
