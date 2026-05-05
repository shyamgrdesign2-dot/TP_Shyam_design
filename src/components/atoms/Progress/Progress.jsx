"use client";

/**
 * Progress — Linear progress indicator atom.
 * Styling: inline CSS using TP tokens (no external deps).
 */

export function Progress({
  value = 0,
  max = 100,
  variant = "determinate",
  color = "primary",
  height = 4,
  className,
  style: styleProp,
}) {
  const pct = variant === "indeterminate" ? undefined : Math.min(100, Math.max(0, (value / max) * 100));
  const trackColor = "var(--tp-slate-100)";
  const fillColor = color === "error" ? "var(--tp-error-500)" :
    color === "success" ? "var(--tp-success-500)" :
    color === "warning" ? "var(--tp-warning-500)" :
    "var(--tp-blue-500)";

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={pct}
      className={className}
      style={{
        width: "100%",
        height,
        borderRadius: height,
        backgroundColor: trackColor,
        overflow: "hidden",
        ...styleProp,
      }}
    >
      <div
        style={{
          height: "100%",
          backgroundColor: fillColor,
          borderRadius: height,
          width: variant === "indeterminate" ? "40%" : `${pct}%`,
          transition: variant === "indeterminate" ? "none" : "width 300ms ease",
          ...(variant === "indeterminate" ? { animation: "tp-progress-indeterminate 1.4s ease infinite" } : {}),
        }}
      />
    </div>
  );
}

Progress.displayName = "Progress";
export default Progress;
