
import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "../../dr-agent/utils"
import { AiBrandSparkIcon, } from "../../dr-agent/shared/AiBrandSparkIcon"
import { useRxPadSync } from "../compat/rxpad-sync-context"

/**
 * Small AI spark icon button for sidebar section headers.
 * Clicking it opens Dr. Agent with a pre-filled contextual message.
 * Shows a portal-based styled tooltip (same pattern as ActionableTooltip)
 * that renders on document.body — never clipped by parent overflow.
 */
export function AiTriggerIcon({
  tooltip,
  signalLabel,
  sectionId,
  size = 14,
  as: Tag = "button",
  tone = "default",
  className,
}) {
  const { publishSignal } = useRxPadSync()
  const [showTooltip, setShowTooltip] = useState(false)
  const wrapperRef = useRef(null)
  const tooltipRef = useRef(null)
  const [pos, setPos] = useState(null)

  const handleClick = (e) => {
    e.stopPropagation()
    publishSignal({
      type: "ai_trigger",
      label: signalLabel,
      sectionId,
    })
  }

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current || !tooltipRef.current) return
    const triggerRect = wrapperRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const triggerCenterX = triggerRect.left + triggerRect.width / 2
    const tooltipW = tooltipRect.width
    const MARGIN = 8
    const GAP = 6

    let left = triggerCenterX - tooltipW / 2
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - tooltipW - MARGIN))
    const arrowLeft = Math.max(10, Math.min(triggerCenterX - left, tooltipW - 10))

    // Prefer below (avoid clipping above sidebar header)
    let top
    let arrowDir
    if (window.innerHeight - triggerRect.bottom > tooltipRect.height + GAP + 10) {
      top = triggerRect.bottom + GAP
      arrowDir = "up"
    } else {
      top = triggerRect.top - GAP - tooltipRect.height
      arrowDir = "down"
    }

    setPos({ top, left, arrowLeft, arrowDir })
  }, [])

  useEffect(() => {
    if (!showTooltip) { setPos(null); return }
    requestAnimationFrame(updatePosition)
  }, [showTooltip, updatePosition])

  const tooltipPortal =
    showTooltip && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[9999] rounded-[6px] bg-tp-slate-800 px-[10px] py-[6px] text-[14px] leading-[1.4] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] select-none"
            style={
              pos
                ? { top: pos.top, left: pos.left, maxWidth: 240, opacity: 1, transition: "opacity 120ms ease-out" }
                : { top: -9999, left: -9999, opacity: 0 }
            }
          >
            <span>{tooltip}</span>
            {pos && (
              <span
                className={cn(
                  "absolute w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent",
                  pos.arrowDir === "down"
                    ? "top-full border-t-[5px] border-t-tp-slate-800"
                    : "bottom-full border-b-[5px] border-b-tp-slate-800",
                )}
                style={{ left: pos.arrowLeft, transform: "translateX(-50%)" }}
              />
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip((v) => !v)}
    >
      <Tag
        type={Tag === "button" ? "button" : undefined}
        role={Tag === "span" ? "button" : undefined}
        tabIndex={Tag === "span" ? 0 : undefined}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center",
          "transition-all duration-150",
          "hover:scale-110 hover:shadow-sm",
          "cursor-pointer",
          className,
        )}
        style={{
          width: size + 8,
          height: size + 8,
        }}
      >
        {tone === "inverse" ? (
          <span
            className="inline-flex items-center justify-center rounded-[6px]"
            style={{
              width: size + 8,
              height: size + 8,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          >
            <AiBrandSparkIcon
              size={size}
              className="[filter:brightness(0)_invert(1)] opacity-95"
            />
          </span>
        ) : (
          <AiBrandSparkIcon size={size + 8} withBackground />
        )}
      </Tag>
      {tooltipPortal}
    </div>
  )
}
