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
 * Notes:
 *   – Animation: uses an internal `isVisible` state with a
 *     setTimeout(20) gate so the slide-in transition runs on mount.
 *   – Close on backdrop click is on by default — pass
 *     `closeOnOverlayClick={false}` to disable for blocking modals.
 *   – z-index: backdrop 160, panel 161 (matches CustomModulesDrawer
 *     legacy z-stack so sibling toasts and dropdowns render above).
 */

import * as React from "react";
import { Portal } from "@/src/hooks/ui/Portal";

export function Sidebar({
  open,
  onClose,
  header,
  children,
  width = "640px",
  side = "right",
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
          className={`fixed inset-0 z-[160] bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ${
            isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        {/* Slide-in panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-hidden={!isVisible}
          className={`fixed top-0 ${sideClass} z-[161] flex h-full flex-col bg-white ${shadowClass} transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${slideClass} ${panelClassName}`}
          style={width ? { width } : undefined}>
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
