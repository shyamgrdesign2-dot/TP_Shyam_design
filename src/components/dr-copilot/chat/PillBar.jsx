import { useState, useCallback } from "react"
import { cn } from "../../dr-agent/utils"

import { AI_PILL_BG, AI_PILL_BG_HOVER, AI_PILL_BORDER, AI_PILL_TEXT_GRADIENT } from "../constants"

const COOLDOWN_DEFAULT = 3000

export function PillBar({ pills, onTap, disabled = false, className }) {
  const [cooldowns, setCooldowns] = useState(new Set())
  const [hoveredId, setHoveredId] = useState(null)

  const handleTap = useCallback(
    (pill) => {
      if (disabled || cooldowns.has(pill.id)) return

      onTap(pill)

      const cooldownMs = _nullishCoalesce(pill.cooldownMs, () => ( COOLDOWN_DEFAULT))
      setCooldowns((prev) => new Set(prev).add(pill.id))

      setTimeout(() => {
        setCooldowns((prev) => {
          const next = new Set(prev)
          next.delete(pill.id)
          return next
        })
      }, cooldownMs)
    },
    [disabled, cooldowns, onTap],
  )

  const sorted = [...pills].sort((a, b) => a.priority - b.priority)

  return (
    <div
      className={cn(
        "flex items-center gap-[6px] overflow-x-auto px-[8px] scrollbar-hide",
        className,
      )}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {sorted.map((pill) => {
        const isOnCooldown = cooldowns.has(pill.id)
        const isDisabled = disabled || isOnCooldown
        const isHovered = hoveredId === pill.id

        /* All pills use the unified AI gradient style */
        return (
          <button
            key={pill.id}
            type="button"
            onClick={() => handleTap(pill)}
            onMouseEnter={() => setHoveredId(pill.id)}
            onMouseLeave={() => setHoveredId(null)}
            disabled={isDisabled}
            className={cn(
              "flex h-[26px] shrink-0 items-center rounded-full px-[14px] text-[14px] font-normal transition-all whitespace-nowrap",
              isDisabled && "opacity-50",
            )}
            style={{
              background: isHovered && !isDisabled ? AI_PILL_BG_HOVER : AI_PILL_BG,
              border: AI_PILL_BORDER,
            }}
          >
            <span
              style={{
                background: AI_PILL_TEXT_GRADIENT,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 400,
              }}
            >
              {pill.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
