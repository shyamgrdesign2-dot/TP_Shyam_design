"use client";

/**
 * Tabs — hand-rolled tab navigation molecule (no Radix).
 *
 * API mirrors Radix UI Tabs so callers don't change:
 *   <Tabs value | defaultValue, onValueChange>
 *     <TabsList>
 *       <TabsTrigger value="...">label</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="...">body</TabsContent>
 *   </Tabs>
 *
 * Each trigger sets `data-state="active|inactive"` so Tailwind /
 * SCSS selectors on the existing styling continue to work unchanged.
 *
 * Keyboard: Left/Right arrows move between triggers, Home/End jump to
 * first/last. Activation follows focus (Radix default `automatic`
 * activation mode).
 */

import * as React from "react";
import styles from "./Tabs.module.scss";

const TabsContext = React.createContext(null);

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className = "",
  children,
  ...props
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = isControlled ? value : internal;

  const setValue = React.useCallback(
    (next) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const ctx = React.useMemo(
    () => ({ value: current, setValue }),
    [current, setValue],
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={className} {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className = "", style, children, ...props }) {
  const cls = [styles.list, className].filter(Boolean).join(" ");
  const listRef = React.useRef(null);

  const onKeyDown = (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const triggers = Array.from(
      listRef.current?.querySelectorAll('[role="tab"]:not([disabled])') || [],
    );
    if (triggers.length === 0) return;
    const idx = triggers.indexOf(document.activeElement);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % triggers.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + triggers.length) % triggers.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = triggers.length - 1;
    if (next !== idx) {
      e.preventDefault();
      triggers[next].focus();
      triggers[next].click();
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cls}
      style={style}
      onKeyDown={onKeyDown}
      {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className = "",
  style,
  disabled,
  onClick,
  children,
  ...props
}) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx?.value === value;
  const cls = [styles.trigger, className].filter(Boolean).join(" ");

  const handleClick = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || disabled) return;
    ctx?.setValue(value);
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      data-state={isActive ? "active" : "inactive"}
      data-disabled={disabled || undefined}
      disabled={disabled}
      className={cls}
      style={style}
      onClick={handleClick}
      {...props}>
      {children}
    </button>
  );
}

export function TabsContent({ value, className = "", style, children, ...props }) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx?.value === value;
  if (!isActive) return null;
  const cls = [styles.content, className].filter(Boolean).join(" ");
  return (
    <div role="tabpanel" data-state="active" className={cls} style={style} {...props}>
      {children}
    </div>
  );
}

Tabs.displayName = "Tabs";
TabsList.displayName = "TabsList";
TabsTrigger.displayName = "TabsTrigger";
TabsContent.displayName = "TabsContent";
