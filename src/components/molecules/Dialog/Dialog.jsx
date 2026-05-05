"use client";

/**
 * Dialog — Modal dialog molecule wrapping Radix Dialog.
 * Styling: Dialog.module.scss (data-width drives panel size; close gets :hover).
 */

import * as React from "react";
import * as DialogPrimitive from "@/src/hooks/ui/DialogPrimitive";
import styles from "./Dialog.module.scss";












export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "default",
  className = ""
}) {
  const panelCls = [styles.panel, className].filter(Boolean).join(" ");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content className={panelCls} data-width={width}>
          {/* Header */}
          <div className={styles.header}>
            <DialogPrimitive.Title className={styles.title}>
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button type="button" aria-label="Close" className={styles.close}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className={styles.divider} aria-hidden />

          {/* Body */}
          {(description || children) &&
          <div className={styles.body}>
              {description &&
            <DialogPrimitive.Description className={styles.description}>
                  {description}
                </DialogPrimitive.Description>
            }
              {children}
            </div>
          }

          {/* Footer */}
          {footer && <div className={styles.footer}>{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>);

}

Dialog.displayName = "Dialog";
export default Dialog;

/* ── Radix sub-component surface ── */

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;
export const DialogOverlay = DialogPrimitive.Overlay;

export function DialogContent({
  className = "",
  style,
  children,
  ...props
}) {
  const cls = [styles.subPanel, className].filter(Boolean).join(" ");
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={styles.subOverlay} />
      <DialogPrimitive.Content className={cls} style={style} {...props}>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>);

}

export function DialogHeader({ className = "", style, ...props }) {
  const cls = [styles.subHeader, className].filter(Boolean).join(" ");
  return <div className={cls} style={style} {...props} />;
}

export function DialogFooter({ className = "", style, ...props }) {
  const cls = [styles.subFooter, className].filter(Boolean).join(" ");
  return <div className={cls} style={style} {...props} />;
}

export function DialogTitle({
  className = "",
  style,
  ...props
}) {
  const cls = [styles.subTitle, className].filter(Boolean).join(" ");
  return <DialogPrimitive.Title className={cls} style={style} {...props} />;
}

export function DialogDescription({
  className = "",
  style,
  ...props
}) {
  const cls = [styles.subDescription, className].filter(Boolean).join(" ");
  return <DialogPrimitive.Description className={cls} style={style} {...props} />;
}