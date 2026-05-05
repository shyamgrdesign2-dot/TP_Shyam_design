"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Copy } from "iconsax-reactjs";
import { cn } from "@/src/hooks/utils";
import { useTouchDevice } from "@/src/hooks/use-touch-device";








export function ActionableTooltip({
  children,
  label,
  onAction,
  className
}) {
  const isTouch = useTouchDevice();
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const [pos, setPos] = useState(




    null);

  /* ── Position calculation ──────────────────────────── */

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current || !tooltipRef.current) return;

    const triggerRect = wrapperRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const tooltipW = tooltipRect.width;
    const MARGIN = 8;
    const GAP = 6;

    // Default: center tooltip on trigger
    let left = triggerCenterX - tooltipW / 2;

    // Clamp to viewport edges
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - tooltipW - MARGIN));

    // Arrow should point at trigger center relative to tooltip left
    const arrowLeft = Math.max(10, Math.min(triggerCenterX - left, tooltipW - 10));

    // Show above (default) or below if insufficient room above
    let top;
    let arrowDir;

    if (triggerRect.top > tooltipRect.height + GAP + 10) {
      // Show above
      top = triggerRect.top - GAP - tooltipRect.height;
      arrowDir = "down";
    } else {
      // Show below
      top = triggerRect.bottom + GAP;
      arrowDir = "up";
    }

    setPos({ top, left, arrowDir, arrowLeft });
  }, []);

  // Reposition whenever tooltip is visible or content changes (copied state)
  useEffect(() => {
    if (!isVisible) {
      setPos(null);
      return;
    }
    // Run after the tooltip has been painted so we can measure its real size
    requestAnimationFrame(updatePosition);
  }, [isVisible, isCopied, updatePosition]);

  // Reposition on scroll (any ancestor) and window resize
  useEffect(() => {
    if (!isVisible) return;
    const reposition = () => requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isVisible, updatePosition]);

  /* ── Hover handlers ────────────────────────────────── */

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearHideTimeout();
    if (!isCopied) {
      setIsVisible(true);
    }
  }, [isCopied, clearHideTimeout]);

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      if (!isCopied) {
        setIsVisible(false);
      }
    }, 100);
  }, [isCopied]);

  const handleClick = useCallback(() => {
    onAction();
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
      setIsVisible(false);
    }, 1000);
  }, [onAction]);

  /* ── Touch: tap-to-toggle + outside-tap-to-close ─── */

  const handleTouchToggle = useCallback((e) => {
    if (!isTouch) return;
    e.stopPropagation();
    if (isCopied) return;
    setIsVisible((prev) => !prev);
  }, [isTouch, isCopied]);

  useEffect(() => {
    if (!isTouch || !isVisible) return;
    const handleOutsideTap = (e) => {
      if (
      wrapperRef.current && !wrapperRef.current.contains(e.target) &&
      tooltipRef.current && !tooltipRef.current.contains(e.target))
      {
        setIsVisible(false);
      }
    };
    document.addEventListener("touchstart", handleOutsideTap);
    return () => document.removeEventListener("touchstart", handleOutsideTap);
  }, [isTouch, isVisible]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  /* ── Tooltip portal ────────────────────────────────── */

  const tooltip =
  isVisible && typeof document !== "undefined" ?
  createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      className={cn(
        "fixed z-[9999]",
        "whitespace-nowrap rounded-[6px] bg-tp-slate-800 px-[8px] py-[5px]",
        "text-[12px] leading-[1.3] text-white",
        "cursor-pointer select-none",
        "shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      )}
      // Simple opacity fade — no translate/slide animation
      data-tooltip
      style={
      pos ?
      { top: pos.top, left: pos.left, opacity: 1, transition: "opacity 120ms ease-out" } :
      { top: -9999, left: -9999, opacity: 0 } // off-screen until measured
      }
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      onMouseEnter={clearHideTimeout}
      onMouseLeave={handleMouseLeave}>
      
            {/* Content */}
            <span className="flex items-center gap-[5px]">
              {isCopied ?
        <>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-medium">Filled!</span>
                </> :

        <>
                  <Copy size={14} variant="Bulk" className="flex-shrink-0 opacity-70" />
                  <span>
                    {(() => {
              // Touch: prefix with "Click to " (no hover, so the
              // user needs an explicit instruction). Desktop:
              // strip the prefix — the tooltip itself surfaced
              // on hover already implies the action.
              const stripped = label.replace(/^Click to\s+/i, "");
              const desktopLabel = stripped.charAt(0).toUpperCase() + stripped.slice(1);
              return isTouch ? `Click to ${stripped}` : desktopLabel;
            })()}
                  </span>
                </>
        }
            </span>

            {/* Arrow — positioned at trigger center */}
            {pos &&
      <span
        className={cn(
          "absolute",
          "w-0 h-0",
          "border-l-[5px] border-l-transparent",
          "border-r-[5px] border-r-transparent",
          pos.arrowDir === "down" ?
          "top-full border-t-[5px] border-t-tp-slate-800" :
          "bottom-full border-b-[5px] border-b-tp-slate-800"
        )}
        style={{ left: pos.arrowLeft, transform: "translateX(-50%)" }} />

      }
          </div>,
    document.body
  ) :
  null;

  return (
    <span
      ref={wrapperRef}
      className={cn("inline-flex items-center", className)}
      onMouseEnter={isTouch ? undefined : handleMouseEnter}
      onMouseLeave={isTouch ? undefined : handleMouseLeave}
      onTouchStart={handleTouchToggle}>
      
      {children}
      {tooltip}
    </span>);

}