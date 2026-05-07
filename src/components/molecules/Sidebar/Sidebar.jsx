"use client";

/**
 * Sidebar — shared sidebar / drawer shell. Wraps the four pieces every
 * sidebar across the app shares:
 *
 *   • Backdrop overlay (fades in/out, click-to-close)
 *   • Slide-in <aside> panel (right side, configurable width)
 *   • SidebarHeader strip (close + divider + title + tutorial + CTAs)
 *   • Scrollable body slot for caller content
 *
 *   <Sidebar
 *     open
 *     onClose={...}
 *     header={<SidebarHeader title="Rx Preview" closeIcon={...} ... />}
 *     width="640px"               // or "70vw"
 *   >
 *     <body content here />
 *   </Sidebar>
 *
 * The body is rendered inside a min-h-0 flex-1 overflow-y-auto wrapper
 * so the header stays sticky at the top and only the body scrolls.
 *
 * ── Stacking / z-index rule ──────────────────────────────────────────────
 * Every sidebar that opens must stack ABOVE any sidebar already open.
 * Use the `layer` prop to declare the stack depth:
 *
 *   layer 1 (default) — first sidebar opened directly from the main UI
 *     backdrop z-[160]  panel z-[161]
 *     e.g. RxCustomiseSidebar, TemplatesListSidebar, SaveTemplateSidebar
 *
 *   layer 2 — sidebar opened from *within* a layer-1 sidebar
 *     backdrop z-[162]  panel z-[163]
 *     e.g. CustomModulesDrawer (opened from RxCustomiseSidebar)
 *
 *   layer 3 — sidebar opened from *within* a layer-2 sidebar
 *     backdrop z-[164]  panel z-[165]
 *
 * Rule: never hardcode z-index in a sidebar component — pass `layer` here
 * instead.  CustomModulesDrawer rolls its own markup but mirrors the same
 * z-[162]/z-[163] values so the system stays consistent.
 *
 * Other fixed elements for reference:
 *   z-[130]  EditableTableModule dropdown portal
 *   z-[134]  VoiceRx bottom FAB
 *   z-[135]  Right secondary panel (VoiceRx / TypeRx)
 *   z-[200+] Tooltips, toasts
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Notes:
 *   – Animation: uses an internal `isVisible` state with a
 *     setTimeout(20) gate so the slide-in transition runs on mount.
 *   – Close on backdrop click is on by default — pass
 *     `closeOnOverlayClick={false}` to disable for blocking modals.
 */

import * as React from "react";
import { Portal } from "@/src/hooks/ui/Portal";

/** z-index pair [backdrop, panel] keyed by layer number. */
const LAYER_Z = {
  1: [160, 161],
  2: [162, 163],
  3: [164, 165],
};

export function Sidebar({
  open,
  onClose,
  header,
  children,
  width = "640px",
  side = "right",
  layer = 1,
  closeOnOverlayClick = true,
  className = "",
  panelClassName = "",
}) {
  const [isMounted, setIsMounted] = React.useState(open);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setIsMounted(true);
      const t = setTimeout(() => setIsVisible(true), 20);
      return () => clearTimeout(t);
    }
    setIsVisible(false);
    const t = setTimeout(() => setIsMounted(false), 320); // match transition duration
    return () => clearTimeout(t);
  }, [open]);

  if (!isMounted) return null;

  const [zBackdrop, zPanel] = LAYER_Z[layer] ?? LAYER_Z[1];

  const sideClass = side === "left" ? "left-0" : "right-0";
  const slideClass = isVisible
    ? "translate-x-0"
    : side === "left"
      ? "-translate-x-full"
      : "translate-x-full";
  const shadowClass =
    side === "left"
      ? "shadow-[12px_0_40px_rgba(15,23,42,0.22)]"
      : "shadow-[-12px_0_40px_rgba(15,23,42,0.22)]";

  return (
    <Portal>
      <div className={className}>
        {/* Backdrop */}
        <div
          aria-hidden="true"
          onClick={closeOnOverlayClick ? onClose : undefined}
          className={`fixed inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ${
            isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ zIndex: zBackdrop }}
        />

        {/* Slide-in panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-hidden={!isVisible}
          className={`fixed top-0 ${sideClass} flex h-full flex-col bg-white ${shadowClass} transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${slideClass} ${panelClassName}`}
          style={{ zIndex: zPanel, ...(width ? { width } : {}) }}>
          {header}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </aside>
      </div>
    </Portal>
  );
}

Sidebar.displayName = "Sidebar";
