"use client";

/**
 * Accordion — hand-rolled disclosure molecule (no Radix).
 *
 * API mirrors Radix UI Accordion so callers don't change:
 *   <Accordion type="single" | "multiple" collapsible value | defaultValue onValueChange>
 *     <AccordionItem value="...">
 *       <AccordionTrigger>label</AccordionTrigger>
 *       <AccordionContent>body</AccordionContent>
 *     </AccordionItem>
 *   </Accordion>
 *
 * Each trigger sets `data-state="open|closed"` so existing styling
 * (the chevron rotate selector) keeps working.
 */

import * as React from "react";
import styles from "./Accordion.module.scss";

const AccordionContext = React.createContext(null);
const AccordionItemContext = React.createContext(null);

export function Accordion({
  type = "single",
  collapsible = false,
  value,
  defaultValue,
  onValueChange,
  className = "",
  style,
  children,
  ...props
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(
    defaultValue ?? (type === "multiple" ? [] : ""),
  );
  const current = isControlled ? value : internal;

  const setValue = React.useCallback(
    (next) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const toggle = React.useCallback(
    (itemValue) => {
      if (type === "multiple") {
        const list = Array.isArray(current) ? current : [];
        const next = list.includes(itemValue)
          ? list.filter((v) => v !== itemValue)
          : [...list, itemValue];
        setValue(next);
      } else {
        if (current === itemValue) {
          if (collapsible) setValue("");
        } else {
          setValue(itemValue);
        }
      }
    },
    [type, collapsible, current, setValue],
  );

  const isOpen = React.useCallback(
    (itemValue) =>
      type === "multiple"
        ? Array.isArray(current) && current.includes(itemValue)
        : current === itemValue,
    [type, current],
  );

  const ctx = React.useMemo(() => ({ toggle, isOpen }), [toggle, isOpen]);

  return (
    <AccordionContext.Provider value={ctx}>
      <div className={className} style={style} {...props}>{children}</div>
    </AccordionContext.Provider>
  );
}

export const AccordionItem = React.forwardRef(function AccordionItem(
  { value, className = "", style, children, ...props },
  ref,
) {
  const root = React.useContext(AccordionContext);
  const open = root?.isOpen(value) ?? false;
  const cls = [styles.item, className].filter(Boolean).join(" ");
  const itemCtx = React.useMemo(
    () => ({ value, open, toggle: () => root?.toggle(value) }),
    [value, open, root],
  );
  return (
    <AccordionItemContext.Provider value={itemCtx}>
      <div ref={ref} className={cls} style={style} data-state={open ? "open" : "closed"} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
});

export const AccordionTrigger = React.forwardRef(function AccordionTrigger(
  { className = "", style, children, onClick, ...props },
  ref,
) {
  const item = React.useContext(AccordionItemContext);
  const open = item?.open ?? false;
  const cls = [styles.trigger, className].filter(Boolean).join(" ");
  const handleClick = (e) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    item?.toggle();
  };
  return (
    <h3 style={{ margin: 0 }}>
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        className={cls}
        style={style}
        onClick={handleClick}
        {...props}>
        {children}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={styles.chevron}
          aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </h3>
  );
});

export const AccordionContent = React.forwardRef(function AccordionContent(
  { className = "", style, children, ...props },
  ref,
) {
  const item = React.useContext(AccordionItemContext);
  const open = item?.open ?? false;
  if (!open) return null;
  const cls = [styles.content, className].filter(Boolean).join(" ");
  return (
    <div ref={ref} role="region" data-state="open" className={cls} style={style} {...props}>
      <div className={styles.contentInner}>{children}</div>
    </div>
  );
});

Accordion.displayName = "Accordion";
AccordionItem.displayName = "AccordionItem";
AccordionTrigger.displayName = "AccordionTrigger";
AccordionContent.displayName = "AccordionContent";
