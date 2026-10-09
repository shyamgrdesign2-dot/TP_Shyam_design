import { cn } from "../../dr-agent/utils"
import { tesseractIcon } from "../ui/tesseractIcon"
import { useTouchDevice } from "../../dr-agent/hooks/use-touch-device"
import { FlagArrow } from "../shared/FlagArrow"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Copy = tesseractIcon("copy")

export function DataRow({ label, unit, value, flag, refRange, isLast, onCopy, copyTooltip }) {
  const isTouch = useTouchDevice()
  const valueColor = flag === "high"
    ? "text-tp-error-600"
    : flag === "low"
      ? "text-tp-error-600"
      : "text-tp-slate-800"

  return (
    <div className={cn(
      "group/row flex items-center py-[3px]",
    )}
    style={!isLast ? { borderBottom: "0.5px solid var(--tp-slate-50, #F8FAFC)" } : undefined}
    >
      <div className="flex-1 text-[14px] text-tp-slate-500 leading-[1.4]">
        <span className="font-medium text-tp-slate-800">{label}</span>
        {unit && <span className="ml-1 text-[12px] text-tp-slate-400">({unit})</span>}
        {refRange && <span className="ml-1 text-[12px] text-tp-slate-200">{refRange}</span>}
      </div>
      <div className={cn("min-w-[40px] flex items-center justify-end gap-[2px] text-[14px] font-medium", valueColor)}>
        {flag && <FlagArrow flag={flag} />}
        {value}
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className={cn("ml-1 flex-shrink-0 transition-opacity text-tp-slate-600 hover:text-tp-slate-500", isTouch ? "opacity-70" : "opacity-0 group-hover/row:opacity-100")}
          title={_nullishCoalesce(copyTooltip, () => ( `Fill ${label}`))}
        >
          <Copy size={14} variant="Linear" className="text-tp-blue-500" />
        </button>
      )}
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
