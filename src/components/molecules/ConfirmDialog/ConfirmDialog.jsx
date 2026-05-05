"use client";

/**
 * ConfirmDialog — "Are you sure?" modal molecule.
 *
 * Wraps Radix AlertDialog with TP structure:
 *   Header (title + close) → optional warning callout → body → footer (cancel + confirm)
 *
 * Composes: Button atom for footer actions.
 * Styling: ConfirmDialog.module.scss.
 */

import * as React from "react";
import * as DialogPrimitive from "@/src/hooks/ui/DialogPrimitive";
import { Button } from "@/src/components/atoms/Button";
import styles from "./ConfirmDialog.module.scss";

// AlertDialog-specific: same as DialogPrimitive but role=alertdialog and
// Action/Cancel are just semantic aliases for our Close + custom button.
const AlertDialogPrimitive = {
  Root: DialogPrimitive.Root,
  Portal: DialogPrimitive.Portal,
  Overlay: DialogPrimitive.Overlay,
  Content: React.forwardRef(function AlertContent(props, ref) {
    return <DialogPrimitive.Content ref={ref} role="alertdialog" {...props} />;
  }),
  Title: DialogPrimitive.Title,
  Description: DialogPrimitive.Description,
  Cancel: DialogPrimitive.Close,
  Action: DialogPrimitive.Close,
};























export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  warning,
  description,
  children,
  // ── Primary action (the destructive / confirming button on the right) ──
  // Accept both legacy (`confirmLabel`/`onConfirm`/`confirmTheme`) and the
  // canonical (`primaryLabel`/`onPrimary`/`primaryTone`) prop names so every
  // existing consumer keeps working.
  primaryLabel,
  onPrimary,
  primaryTone = "primary",
  primaryDisabled = false,
  confirmLabel,
  onConfirm,
  confirmTheme,
  confirmDisabled,
  // ── Secondary action ──
  secondaryLabel = "Cancel",
  onSecondary,
  cancelLabel,
  onCancel,
  // Tone for the secondary slot. Defaults to a quiet `link` button. When
  // a destructive flow puts the SAFE action on `primary*` and the
  // destructive option on `secondary*`, pass `"destructive"` so the
  // secondary slot reads in red text — clear "this is the dangerous
  // option" affordance without competing with the primary blue CTA.
  secondaryTone = "default",
}) {
  const _primaryLabel = primaryLabel ?? confirmLabel;
  const _onPrimary = onPrimary ?? onConfirm;
  const _primaryTone = confirmTheme ?? primaryTone;
  const _primaryDisabled = confirmDisabled ?? primaryDisabled;
  const _secondaryLabel = cancelLabel ?? secondaryLabel;
  const _onSecondary = onCancel ?? onSecondary;
  const _secondaryIsDestructive = secondaryTone === "destructive";
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={styles.overlay} />
        <AlertDialogPrimitive.Content
          data-voice-allow
          className={styles.content}>
          
          {/* Header */}
          <div className={styles.header}>
            <AlertDialogPrimitive.Title className={styles.title}>
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Cancel asChild>
              <button
                type="button"
                aria-label="Close"
                className={styles.closeBtn}>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            </AlertDialogPrimitive.Cancel>
          </div>

          {/* Divider */}
          <div className={styles.divider} aria-hidden />

          {/* Body */}
          {(warning || description || children) &&
          <div className={styles.body}>
              {warning &&
            <div className={styles.warning}>
                  <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className={styles.warningIcon}>
                
                    <path
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="var(--tp-warning-500, #F59E0B)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round" />
                
                  </svg>
                  <p className={styles.warningText}>{warning}</p>
                </div>
            }
              {description &&
            <AlertDialogPrimitive.Description className={styles.description}>
                  {description}
                </AlertDialogPrimitive.Description>
            }
              {children}
            </div>
          }

          {/* Footer */}
          <div className={styles.footer}>
            <AlertDialogPrimitive.Cancel asChild>
              <Button
                variant="link"
                theme={_secondaryIsDestructive ? "error" : "primary"}
                size="sm"
                onClick={(e) => {
                  if (_onSecondary) {
                    e.preventDefault();
                    _onSecondary();
                  }
                }}>

                {_secondaryLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button
                variant="solid"
                theme={_primaryTone}
                size="sm"
                disabled={_primaryDisabled}
                onClick={(e) => {
                  e.preventDefault();
                  if (!_primaryDisabled && typeof _onPrimary === "function") {
                    _onPrimary();
                  }
                }}>

                {_primaryLabel}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>);

}

ConfirmDialog.displayName = "ConfirmDialog";
export default ConfirmDialog;