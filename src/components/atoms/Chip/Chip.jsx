"use client";

/**
 * TPChip — inline chip/tag rendered with TP token styling.
 * No external deps. Maps MUI Chip API (label, color, variant, onDelete).
 * @deprecated Prefer `@/src/components/atoms/Badge` or `@/src/components/tp-ui/tp-tag` in new code.
 */

const COLOR_MAP = {
  default: { bg: "var(--tp-slate-100)", text: "var(--tp-slate-700)", border: "var(--tp-slate-200)" },
  primary: { bg: "var(--tp-blue-50)", text: "var(--tp-blue-600)", border: "var(--tp-blue-200)" },
  success: { bg: "rgba(34,197,94,0.10)", text: "var(--tp-success-600)", border: "rgba(34,197,94,0.3)" },
  warning: { bg: "rgba(245,158,11,0.10)", text: "var(--tp-warning-600)", border: "rgba(245,158,11,0.3)" },
  error: { bg: "rgba(239,68,68,0.10)", text: "var(--tp-error-600)", border: "rgba(239,68,68,0.3)" },
};

export function TPChip({ label, color = "default", variant = "filled", onDelete, onClick, disabled, size, icon, className, style: styleProp }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.default;
  const isOutlined = variant === "outlined";

  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={disabled ? undefined : onClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        cursor: onClick ? "pointer" : "default",
        opacity: disabled ? 0.5 : 1,
        backgroundColor: isOutlined ? "transparent" : c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        userSelect: "none",
        ...styleProp,
      }}
    >
      {icon && <span style={{ display: "inline-flex", fontSize: 14 }}>{icon}</span>}
      {label}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(e); }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            marginLeft: 2,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "inherit",
            opacity: 0.7,
            fontSize: 12,
          }}
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
