import { useState } from "react"
import { cn } from "../../dr-agent/utils"
import { useTouchDevice } from "../../dr-agent/hooks/use-touch-device"
import { CopilotIcon } from "../ui/CopilotIcon"

export function CopyIcon({ size = 14, onClick, className }) {
  const isTouch = useTouchDevice()
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      title="Copy"
      onClick={(e) => { e.stopPropagation(); _optionalChain([onClick, 'optionalCall', _ => _(e)]) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "flex-shrink-0 cursor-pointer transition-colors",
        hovered ? "text-tp-blue-600" : "text-tp-blue-500",
        className,
      )}
    >
      <CopilotIcon name="copy" size={size} variant={isTouch || hovered ? "bulk" : "linear"} />
    </button>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
