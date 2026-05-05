"use client";

/**
 * Snackbar — Dark-pill toast notification molecule.
 * Styling: Snackbar.module.scss (pill, icon, close button with CSS :hover).
 * Positioning + opacity/transform remain inline (driven by open state + anchor props).
 */

import { forwardRef, useEffect, useState, useCallback } from "react";
import styles from "./Snackbar.module.scss";

















/* ── Severity icons (inline SVG, no icon library dep) ── */

function SuccessIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 29.333C23.364 29.333 29.333 23.364 29.333 16S23.364 2.667 16 2.667 2.667 8.636 2.667 16 8.636 29.333 16 29.333Z" stroke="#19BB7A" strokeWidth="2.4" />
      <path d="M11.333 16l3.2 3.2 6.134-6.133" stroke="#19BB7A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

function InfoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="#60A5FA" strokeWidth="2" />
      <path d="M12 8v0m0 4v4" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
    </svg>);

}

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 9v4m0 4h.01" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

function ErrorIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="#F87171" strokeWidth="2" />
      <path d="M15 9l-6 6m0-6l6 6" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
    </svg>);

}

const SEVERITY_ICONS = {
  success: SuccessIcon,
  info: InfoIcon,
  warning: WarningIcon,
  error: ErrorIcon
};

/* ── Positioning (dynamic — stays inline) ── */

function getPositionStyles(
vertical,
horizontal)
{
  const base = {
    position: "fixed",
    zIndex: 1400,
    display: "flex",
    justifyContent:
    horizontal === "center" ? "center" : horizontal === "right" ? "flex-end" : "flex-start"
  };
  if (vertical === "top") {base.top = 24;} else {base.bottom = 24;}
  if (horizontal === "center") {
    base.left = "50%";
    base.transform = "translateX(-50%)";
  } else if (horizontal === "right") {
    base.right = 24;
  } else {
    base.left = 24;
  }
  return base;
}

export const Snackbar = forwardRef(
  function Snackbar(
  {
    open,
    message,
    severity = "success",
    autoHideDuration = 3000,
    onClose,
    anchorVertical = "top",
    anchorHorizontal = "center",
    className = "",
    style: styleProp
  },
  ref)
  {
    const [visible, setVisible] = useState(open);

    useEffect(() => {if (open) setVisible(true);}, [open]);

    const handleClose = useCallback(() => {
      setVisible(false);
      onClose?.();
    }, [onClose]);

    useEffect(() => {
      if (!open || autoHideDuration == null) return;
      const timer = setTimeout(handleClose, autoHideDuration);
      return () => clearTimeout(timer);
    }, [open, autoHideDuration, handleClose]);

    if (!visible && !open) return null;

    const IconComponent = SEVERITY_ICONS[severity];

    /* Slide direction based on anchor */
    const translateYOffset = anchorVertical === "top" ? "-12px" : "12px";
    const translateX = anchorHorizontal === "center" ? "translateX(-50%) " : "";

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        className={className}
        style={{
          ...getPositionStyles(anchorVertical, anchorHorizontal),
          opacity: open ? 1 : 0,
          transition: "opacity 200ms ease, transform 200ms ease",
          transform: open ?
          `${translateX}translateY(0)` :
          `${translateX}translateY(${translateYOffset})`,
          pointerEvents: open ? "auto" : "none",
          ...styleProp
        }}
        onTransitionEnd={() => {if (!open) setVisible(false);}}>
        
        <div className={styles.pill}>
          <span className={styles.icon}>
            <IconComponent />
          </span>
          <span>{message}</span>
          {onClose &&
          <button
            type="button"
            aria-label="Close notification"
            onClick={handleClose}
            className={styles.close}>
            
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          }
        </div>
      </div>);

  }
);

Snackbar.displayName = "Snackbar";
export default Snackbar;