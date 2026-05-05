"use client";

/**
 * DropdownMenu — TP-branded dropdown menu molecule.
 * Styling: DropdownMenu.module.scss (data-highlighted / data-disabled drive all states).
 * No JS onMouseEnter/Leave — Radix data-highlighted handles hover + keyboard focus in CSS.
 */

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import styles from "./DropdownMenu.module.scss";

/* ── Root (Radix re-exports) ── */

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

/* ── Content ── */

export function DropdownMenuContent({
  className = "",
  sideOffset = 6,
  style,
  children,
  ...props
}) {
  const cls = [styles.panel, className].filter(Boolean).join(" ");
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content sideOffset={sideOffset} className={cls} style={style} {...props}>
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>);

}

/* ── Item ── */

export function DropdownMenuItem({
  className = "",
  style,
  ...props
}) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  return <DropdownMenuPrimitive.Item className={cls} style={style} {...props} />;
}

/* ── CheckboxItem ── */

export function DropdownMenuCheckboxItem({
  className = "",
  style,
  children,
  ...props
}) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  return (
    <DropdownMenuPrimitive.CheckboxItem className={cls} style={style} {...props}>
      <DropdownMenuPrimitive.ItemIndicator className={styles.indicator}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </DropdownMenuPrimitive.ItemIndicator>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>);

}

/* ── RadioItem ── */

export function DropdownMenuRadioItem({
  className = "",
  style,
  children,
  ...props
}) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  return (
    <DropdownMenuPrimitive.RadioItem className={cls} style={style} {...props}>
      <DropdownMenuPrimitive.ItemIndicator className={styles.indicator}>
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
          <circle cx="4" cy="4" r="4" fill="currentColor" />
        </svg>
      </DropdownMenuPrimitive.ItemIndicator>
      {children}
    </DropdownMenuPrimitive.RadioItem>);

}

/* ── Label ── */

export function DropdownMenuLabel({
  className = "",
  style,
  ...props
}) {
  const cls = [styles.label, className].filter(Boolean).join(" ");
  return <DropdownMenuPrimitive.Label className={cls} style={style} {...props} />;
}

/* ── Separator ── */

export function DropdownMenuSeparator({
  className = "",
  style,
  ...props
}) {
  const cls = [styles.separator, className].filter(Boolean).join(" ");
  return <DropdownMenuPrimitive.Separator className={cls} style={style} {...props} />;
}

/* ── SubTrigger ── */

export function DropdownMenuSubTrigger({
  className = "",
  style,
  children,
  ...props
}) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  return (
    <DropdownMenuPrimitive.SubTrigger className={cls} style={style} {...props}>
      {children}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.subChevron} aria-hidden>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </DropdownMenuPrimitive.SubTrigger>);

}

/* ── SubContent ── */

export function DropdownMenuSubContent({
  className = "",
  style,
  ...props
}) {
  const cls = [styles.panel, className].filter(Boolean).join(" ");
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent className={cls} style={style} {...props} />
    </DropdownMenuPrimitive.Portal>);

}

/* ── Shortcut ── */

export function DropdownMenuShortcut({
  className = "",
  style,
  ...props
}) {
  const cls = [styles.shortcut, className].filter(Boolean).join(" ");
  return <span className={cls} style={style} {...props} />;
}