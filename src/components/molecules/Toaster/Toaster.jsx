"use client";

/**
 * Toaster — hand-rolled brand toast surface (no sonner).
 *
 * Mount once at the root layout. Subscribes to `toast-store` and
 * renders each active toast as a centered black pill at the top of
 * the viewport. Same visual spec as before (matches
 * VoiceRxSavingSnackbar):
 *   • Solid black pill (rgba(0,0,0,0.92))
 *   • White text, tight Inter
 *   • Horizontally centered at the top of the viewport
 *   • No border / no ring
 *
 * Public toast API (mirrors sonner):
 *   import { toast } from "@/src/components/molecules/Toaster";
 *   toast.success("…"); toast.error("…"); toast.message("…", { description });
 */

import * as React from "react";
import { Portal } from "@/src/hooks/ui/Portal";
import { subscribe, dismiss, toast } from "./toast-store";

export { toast } from "./toast-store";

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
          top: 16,
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
          <div
            key={t.id}
            role="status"
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: "auto",
              background: "rgba(0,0,0,0.92)",
              color: "#ffffff",
              borderRadius: 9999,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.2,
              maxWidth: "min(560px, calc(100vw - 32px))",
              boxShadow: "none",
              cursor: "pointer",
              transition: "opacity 180ms ease",
            }}>
            <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 500 }}>
              {t.title}
            </div>
            {t.description ? (
              <div
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 12,
                  marginTop: 2,
                }}>
                {t.description}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Portal>
  );
}
