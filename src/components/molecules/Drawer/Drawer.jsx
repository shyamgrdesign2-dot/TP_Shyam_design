"use client";

/**
 * Drawer — Slide-out panel molecule.
 * Styling: Drawer.module.scss (data-side / data-size drive all panel geometry).
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import styles from "./Drawer.module.scss";




/* ── Root ── */







export function Drawer({ open, onOpenChange, children }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>);

}

export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

/* ── Content ── */









export function DrawerContent({
  side = "right",
  size = "md",
  children,
  className = "",
  style: styleProp
}) {
  const cls = [styles.content, className].filter(Boolean).join(" ");
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={styles.overlay} />
      <DialogPrimitive.Content
        className={cls}
        style={styleProp}
        data-side={side}
        data-size={size}>
        
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>);

}

/* ── Header ── */

export function DrawerHeader({
  className = "",
  style,
  children,
  ...props
}) {
  const cls = [styles.drawerHeader, className].filter(Boolean).join(" ");
  return <div className={cls} style={style} {...props}>{children}</div>;
}

/* ── Footer ── */

export function DrawerFooter({
  className = "",
  style,
  children,
  ...props
}) {
  const cls = [styles.drawerFooter, className].filter(Boolean).join(" ");
  return <div className={cls} style={style} {...props}>{children}</div>;
}

/* ── Title ── */

export function DrawerTitle({
  className = "",
  style,
  ...props
}) {
  const cls = [styles.drawerTitle, className].filter(Boolean).join(" ");
  return <DialogPrimitive.Title className={cls} style={style} {...props} />;
}

/* ── Description ── */

export function DrawerDescription({
  className = "",
  style,
  ...props
}) {
  const cls = [styles.drawerDescription, className].filter(Boolean).join(" ");
  return <DialogPrimitive.Description className={cls} style={style} {...props} />;
}

Drawer.displayName = "Drawer";