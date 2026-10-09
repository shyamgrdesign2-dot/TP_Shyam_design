import { useState, useRef, useEffect, useCallback } from "react"
import { tesseractIcon } from "../ui/tesseractIcon"
import { cn } from "../../dr-agent/utils"
import { useTouchDevice } from "../../dr-agent/hooks/use-touch-device"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Copy = tesseractIcon("copy")

export function CopyTooltip({
  options,
  copyAllLabel = "Fill all",
  copyAllValue,
  iconSize = 10,
  className,
}) {
  const isTouch = useTouchDevice()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(null)
  const ref = useRef(null)

  // Close on outside click / tap
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target )) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("touchstart", handleClick)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("touchstart", handleClick)
    }
  }, [open])

  const handleCopy = useCallback(
    (value, label) => {
      _optionalChain([navigator, 'access', _ => _.clipboard, 'optionalAccess', _2 => _2.writeText, 'call', _3 => _3(value)])
      setCopied(label)
      setTimeout(() => {
        setCopied(null)
        setOpen(false)
      }, 800)
    },
    [],
  )

  // For single option, just copy directly without dropdown
  if (options.length <= 1) {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex items-center text-tp-blue-500 hover:text-tp-blue-600 transition-all cursor-pointer",
          className,
        )}
        onClick={() => handleCopy(copyAllValue, "all")}
        title={_optionalChain([options, 'access', _4 => _4[0], 'optionalAccess', _5 => _5.label]) ? `Fill ${options[0].label}` : "Fill"}
      >
        <Copy size={iconSize} variant="Linear" />
      </button>
    )
  }

  return (
    <div className={cn("relative inline-flex items-center", className)} ref={ref}>
      {/* Trigger icon */}
      <button
        type="button"
        className="inline-flex items-center text-tp-blue-500 hover:text-tp-blue-600 transition-all cursor-pointer"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={isTouch ? undefined : () => setOpen(true)}
        title="Fill options"
      >
        <Copy size={iconSize} variant={open ? "Bulk" : "Linear"} />
      </button>

      {/* Tooltip dropdown */}
      {open && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bottom-full mb-[6px] z-50",
            "min-w-[140px] max-w-[220px] rounded-[8px]",
            "border-[1px] border-tp-slate-200/60 bg-white py-[3px]",
            "shadow-[0_4px_16px_rgba(0,0,0,0.1)]",
          )}
          onMouseLeave={isTouch ? undefined : () => setOpen(false)}
        >
          {/* Individual options */}
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleCopy(opt.value, opt.label)}
              className={cn(
                "flex w-full items-center gap-[6px] px-[8px] py-[4px] text-left",
                "text-[12px] leading-[1.4] text-tp-slate-600",
                "transition-colors hover:bg-tp-slate-50 hover:text-tp-slate-800",
                copied === opt.label && "text-tp-success-600 bg-tp-success-50",
              )}
            >
              <Copy size={14} variant="Linear" className="flex-shrink-0 text-tp-blue-500" />
              <span className="truncate">{opt.label}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="my-[2px] h-px bg-tp-slate-100" />

          {/* Fill all */}
          <button
            type="button"
            onClick={() => handleCopy(copyAllValue, "all")}
            className={cn(
              "flex w-full items-center gap-[6px] px-[8px] py-[4px] text-left",
              "text-[12px] leading-[1.4] font-medium text-tp-slate-700",
              "transition-colors hover:bg-tp-blue-50 hover:text-tp-blue-600",
              copied === "all" && "text-tp-success-600 bg-tp-success-50",
            )}
          >
            <Copy size={14} variant="Bulk" className="flex-shrink-0 text-tp-blue-500" />
            <span>{copyAllLabel}</span>
          </button>
        </div>
      )}
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
