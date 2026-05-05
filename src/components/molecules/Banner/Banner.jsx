"use client";

/**
 * Banner — Full-width dismissible notification molecule.
 * Styling: Banner.module.scss (data-status / currentColor on icons).
 */

import { useState } from "react";
import styles from "./Banner.module.scss";














/* ── Inline SVG icons — all use stroke="currentColor" ── */

function InfoSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4m0-4h.01" />
    </svg>);

}

function SuccessSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>);

}

function WarningSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4m0 4h.01" />
    </svg>);

}

function ErrorSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4m0 4h.01" />
    </svg>);

}

const STATUS_ICONS = {
  info: InfoSvg,
  success: SuccessSvg,
  warning: WarningSvg,
  error: ErrorSvg
};

export function Banner({
  status = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  action,
  className = "",
  style: styleProp
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const IconComponent = STATUS_ICONS[status];
  const cls = [styles.banner, className].filter(Boolean).join(" ");

  return (
    <div role="alert" className={cls} style={styleProp} data-status={status}>
      <span className={styles.icon} data-status={status}>
        <IconComponent />
      </span>

      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        <div style={{ marginTop: title ? 2 : 0 }}>{children}</div>
      </div>

      {action && <div className={styles.action}>{action}</div>}

      {dismissible &&
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className={styles.dismiss}>
        
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6m0-6l6 6" />
          </svg>
        </button>
      }
    </div>);

}

Banner.displayName = "Banner";
export default Banner;