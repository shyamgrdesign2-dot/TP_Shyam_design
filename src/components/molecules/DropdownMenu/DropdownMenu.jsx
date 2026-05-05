"use client";

/**
 * DropdownMenu — hand-rolled menu molecule (no Radix).
 *
 * API mirrors Radix UI DropdownMenu so callers don't change:
 *   <DropdownMenu open onOpenChange>
 *     <DropdownMenuTrigger asChild>...</DropdownMenuTrigger>
 *     <DropdownMenuContent align="end" side="bottom" sideOffset={6}>
 *       <DropdownMenuItem onClick={...}>One</DropdownMenuItem>
 *       <DropdownMenuSeparator />
 *       <DropdownMenuItem>Two</DropdownMenuItem>
 *     </DropdownMenuContent>
 *   </DropdownMenu>
 *
 * Behaviour:
 *   - Trigger click toggles. Item click closes (unless e.preventDefault).
 *   - ESC and click-outside close.
 *   - Arrow Up/Down move focus between items, Home/End jump.
 *   - role="menu" + role="menuitem" + aria-haspopup="menu".
 *
 * Sub-component stubs (Checkbox, Radio, Sub, Group, Label, Shortcut)
 * are kept as simple wrappers for API parity — they're exported by the
 * barrel but never consumed by product code today.
 */

import * as React from "react";
import { Slot } from "@/src/hooks/ui/Slot";
import { Portal } from "@/src/hooks/ui/Portal";
import { usePosition, useEscape, useClickOutside } from "@/src/hooks/ui/use-overlay";
import styles from "./DropdownMenu.module.scss";

const MenuContext = React.createContext(null);

export function DropdownMenu({ open: openProp, defaultOpen = false, onOpenChange, children }) {
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
  return <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>;
}

export function DropdownMenuTrigger({ asChild, children, ...props }) {
  const ctx = React.useContext(MenuContext);
  if (!ctx) return children;
  const handleClick = (e) => {
    props.onClick?.(e);
    if (e.defaultPrevented) return;
    ctx.setOpen(!ctx.open);
  };
  const handlerProps = {
    onClick: handleClick,
    "aria-haspopup": "menu",
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

export function DropdownMenuContent({
  className = "",
  align = "center",
  side = "bottom",
  sideOffset = 6,
  collisionPadding = 8,
  style,
  children,
  ...props
}) {
  const ctx = React.useContext(MenuContext);
  if (!ctx?.open) return null;
  return (
    <DropdownMenuContentInner
      ctx={ctx}
      align={align}
      side={side}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={className}
      style={style}
      {...props}>
      {children}
    </DropdownMenuContentInner>
  );
}

function DropdownMenuContentInner({
  ctx,
  align,
  side,
  sideOffset,
  collisionPadding,
  className,
  style,
  children,
  ...props
}) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    ctx.contentRef.current = ref.current;
    return () => {
      if (ctx.contentRef.current === ref.current) ctx.contentRef.current = null;
    };
  }, [ctx]);

  useEscape(() => {
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
  }, ctx.open);

  useClickOutside([ctx.triggerRef, ref], () => ctx.setOpen(false), ctx.open);

  // Initial focus: first non-disabled item.
  React.useEffect(() => {
    if (!ctx.open) return;
    const t = setTimeout(() => {
      const first = ref.current?.querySelector('[role="menuitem"]:not([data-disabled])');
      first?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [ctx.open]);

  const onKeyDown = (e) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    const items = Array.from(
      ref.current?.querySelectorAll('[role="menuitem"]:not([data-disabled])') || [],
    );
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    let next = idx;
    if (e.key === "ArrowDown") next = (idx + 1) % items.length;
    else if (e.key === "ArrowUp") next = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    e.preventDefault();
    items[next]?.focus();
  };

  const pos = usePosition({
    triggerRef: ctx.triggerRef,
    floatingRef: ref,
    open: ctx.open,
    side,
    align,
    sideOffset,
    collisionPadding,
  });

  const cls = [styles.panel, className].filter(Boolean).join(" ");

  return (
    <Portal>
      <div
        ref={ref}
        role="menu"
        data-state="open"
        data-side={pos.side}
        className={cls}
        onKeyDown={onKeyDown}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 100,
          outline: "none",
          ...style,
        }}
        {...props}>
        {children}
      </div>
    </Portal>
  );
}

export function DropdownMenuItem({
  className = "",
  style,
  disabled,
  onSelect,
  onClick,
  children,
  asChild,
  ...props
}) {
  const ctx = React.useContext(MenuContext);
  const cls = [styles.item, className].filter(Boolean).join(" ");

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    onSelect?.(e);
    if (!e.defaultPrevented) ctx?.setOpen(false);
  };

  const handlerProps = {
    role: "menuitem",
    tabIndex: -1,
    "data-disabled": disabled || undefined,
    "data-highlighted": undefined, // hover/focus via :hover + :focus in CSS
    onClick: handleClick,
    onMouseEnter: (e) => {
      props.onMouseEnter?.(e);
      // Move keyboard focus on hover so arrow keys feel right.
      if (e.currentTarget?.focus) e.currentTarget.focus();
    },
    className: cls,
    style,
  };

  if (asChild) return <Slot {...handlerProps}>{children}</Slot>;
  return (
    <div {...handlerProps} {...props}>
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className = "", style, ...props }) {
  const cls = [styles.separator, className].filter(Boolean).join(" ");
  return <div role="separator" className={cls} style={style} {...props} />;
}

export function DropdownMenuLabel({ className = "", style, ...props }) {
  const cls = [styles.label, className].filter(Boolean).join(" ");
  return <div className={cls} style={style} {...props} />;
}

export function DropdownMenuShortcut({ className = "", style, ...props }) {
  const cls = [styles.shortcut, className].filter(Boolean).join(" ");
  return <span className={cls} style={style} {...props} />;
}

/* ── Stubs for API parity (no consumer in product code) ── */
export const DropdownMenuGroup = ({ children }) => <div role="group">{children}</div>;
export const DropdownMenuPortal = ({ children }) => <>{children}</>;
export const DropdownMenuSub = ({ children }) => <>{children}</>;
export const DropdownMenuSubTrigger = DropdownMenuItem;
export const DropdownMenuSubContent = DropdownMenuContent;
export const DropdownMenuRadioGroup = ({ children }) => <div role="group">{children}</div>;
export const DropdownMenuCheckboxItem = ({ checked, children, ...props }) => (
  <DropdownMenuItem {...props}>
    <span className={styles.indicator} aria-hidden>
      {checked ? "✓" : ""}
    </span>
    {children}
  </DropdownMenuItem>
);
export const DropdownMenuRadioItem = ({ children, ...props }) => (
  <DropdownMenuItem {...props}>{children}</DropdownMenuItem>
);

DropdownMenu.displayName = "DropdownMenu";
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";
DropdownMenuContent.displayName = "DropdownMenuContent";
DropdownMenuItem.displayName = "DropdownMenuItem";
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
DropdownMenuLabel.displayName = "DropdownMenuLabel";
