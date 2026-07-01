import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Danger } from "iconsax-reactjs";
import { X } from "lucide-react";
import styles from "./tp-confirm-dialog.module.scss";

import {
  trackConfirmDialogPrimary,
  trackConfirmDialogSecondary,
  trackConfirmDialogShown,
} from "../../../utils/dentalMoengage";

export function TPConfirmDialog({
  open,
  onOpenChange,
  title,
  warning,
  description,
  children,
  secondaryLabel = "Cancel",
  onSecondary,
  secondaryTone = "link",
  primaryLabel,
  onPrimary,
  primaryTone = "primary",
  primaryDisabled = false,
  analytics = null,
}) {
  const handleOpenChange = (nextOpen) => {
    if (nextOpen && analytics) {
      trackConfirmDialogShown(analytics);
    }
    onOpenChange?.(nextOpen);
  };

  const handleSecondary = (e) => {
    if (analytics) {
      trackConfirmDialogSecondary(analytics);
    }
    if (onSecondary) {
      onSecondary();
    }
  };
  const handlePrimary = (e) => {
    if (analytics) {
      trackConfirmDialogPrimary(analytics);
    }
    if (onPrimary) {
      onPrimary();
    }
  };

  const primaryBtnClass = `${styles.primaryBtn} ${
    primaryTone === "destructive" ? styles.destructive :
    primaryTone === "success" ? styles.success :
    primaryTone === "warning" ? styles.warning :
    styles.primary
  } ${primaryDisabled ? styles.disabled : ""}`;

  const secondaryBtnClass =
    secondaryTone === "muted" ? styles.secondaryBtnMuted : styles.secondaryBtnLink;

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={styles.overlay} />
        <AlertDialogPrimitive.Content className={`treatment-plan ${styles.content}`} aria-describedby={undefined}>
          <div className={styles.header}>
            <AlertDialogPrimitive.Title className={styles.title}>
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Cancel asChild={true}>
              <button
                type="button"
                aria-label="Close"
                className={styles.closeBtn}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </AlertDialogPrimitive.Cancel>
          </div>
          <div className={styles.divider} aria-hidden={true} />
          {(warning || description || children) && (
            <div className={styles.body}>
              {warning && (
                <div className={styles.warningCallout}>
                  <Danger
                    size={20}
                    variant="Linear"
                    className={styles.warningIcon}
                  />
                  <AlertDialogPrimitive.Description className={styles.warningText}>
                    {warning}
                  </AlertDialogPrimitive.Description>
                </div>
              )}

              {description && (
                <AlertDialogPrimitive.Description className={styles.description}>
                  {description}
                </AlertDialogPrimitive.Description>
              )}

              {children}
            </div>
          )}

          <div className={styles.footer}>
            <AlertDialogPrimitive.Cancel asChild={true}>
              <button
                type="button"
                onClick={handleSecondary}
                className={secondaryBtnClass}>
                {secondaryLabel}
              </button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild={true}>
              <button
                type="button"
                onClick={handlePrimary}
                disabled={primaryDisabled}
                className={primaryBtnClass}>
                {primaryLabel}
              </button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>);

}
