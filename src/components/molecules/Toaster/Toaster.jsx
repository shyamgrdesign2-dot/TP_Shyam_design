"use client";

/**
 * Toaster — hand-rolled brand toast surface (no sonner).
 *
 * Mount once at the root layout. Subscribes to `toast-store` and
 * renders each active toast as a centered black pill at the top of
 * the viewport.
 *
 * Behaviour (locked by design):
 *   • Solid black pill (rgba(0,0,0,0.92))
 *   • White Inter, 14px, single line (truncates with ellipsis past ~520px)
 *   • Leading icon: tone-coloured circle (success → green, error →
 *     red, warning → amber, default/info → slate)
 *   • Trailing close (×) glyph — dismissible before the auto-hide
 *     timer
 *   • Horizontally centred at the top of the viewport (top: 24px)
 *   • Slides DOWN from above on enter, slides BACK UP on exit
 *
 * Public toast API:
 *   import { toast } from "@/src/components/molecules/Toaster";
 *   toast.success("Saved");
 *   toast.error("Couldn't copy");
 *   toast.message("Microphone switched to iPhone");
 */

import * as React from "react";
import { Portal } from "@/src/hooks/ui/Portal";
import { subscribe, dismiss } from "./toast-store";

export { toast } from "./toast-store";

const ENTER_DELAY_MS = 20;
const EXIT_DURATION_MS = 220;

const TONE_COLOR = {
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#60a5fa",
  default: "rgba(255,255,255,0.85)",
};

function ToneIcon({ type }) {
  const color = TONE_COLOR[type] ?? TONE_COLOR.default;
  if (type === "success") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="8" fill={color} />
        <path d="M4.5 8.4 6.8 10.6 11.5 5.6" stroke="#0b3a18" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="8" fill={color} />
        <path d="M5.5 5.5 10.5 10.5 M10.5 5.5 5.5 10.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "warning") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="8" fill={color} />
        <path d="M8 4.5v4 M8 11v.5" stroke="#3a2a06" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}

function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4 12 12 M12 4 4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ToastItem({ item }) {
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setEntered(true), ENTER_DELAY_MS);
    return () => clearTimeout(t);
  }, []);
  const visible = entered && !item.leaving;

  return (
    <div
      role="status"
      style={{
        pointerEvents: "auto",
        background: "rgba(0,0,0,0.92)",
        color: "#ffffff",
        borderRadius: 9999,
        padding: "8px 10px 8px 12px",
        fontFamily: "Inter, sans-serif",
        lineHeight: 1.2,
        maxWidth: "min(560px, calc(100vw - 32px))",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-12px)",
        transition: `opacity ${EXIT_DURATION_MS}ms ease, transform ${EXIT_DURATION_MS}ms ease`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
      {item.type && item.type !== "default" ? (
        <span style={{ display: "inline-flex", flexShrink: 0 }}>
          <ToneIcon type={item.type} />
        </span>
      ) : null}
      <span
        style={{
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
          flex: 1,
        }}>
        {item.title}
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={(e) => {
          e.stopPropagation();
          dismiss(item.id);
        }}
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          padding: 0,
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          borderRadius: 9999,
          transition: "color 120ms ease, background 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#ffffff";
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(255,255,255,0.7)";
          e.currentTarget.style.background = "transparent";
        }}>
        <CloseGlyph />
      </button>
    </div>
  );
}

export function Toaster() {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => subscribe(setItems), []);
  if (!items.length) return null;
  return (
    <Portal>
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          top: 24,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          zIndex: 9999,
          pointerEvents: "none",
        }}>
        {items.map((t) => (
          <ToastItem key={t.id} item={t} />
        ))}
      </div>
    </Portal>
  );
}
