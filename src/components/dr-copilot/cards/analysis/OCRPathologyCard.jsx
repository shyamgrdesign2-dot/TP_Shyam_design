import { useState } from "react"
import { CardShell } from "../CardShell"
import { cn } from "../../../dr-agent/utils"
import { FlagArrow } from "../../shared/FlagArrow"

export function OCRPathologyCard({ data, onPillTap, onCopy }) {
  const [showNormal, setShowNormal] = useState(false)

  const flaggedParams = data.parameters.filter((p) => p.flag)
  const normalParams = data.parameters.filter((p) => !p.flag)
  const visibleParams = showNormal ? data.parameters : flaggedParams

  return (
    <CardShell
      icon={<span />}
      tpIconName="Lab"
      title={data.title}
      badge={
        flaggedParams.length > 0
          ? { label: `${flaggedParams.length} flagged`, color: "#DC2626", bg: "#FEE2E2" }
          : undefined
      }
      copyAll={() =>
        _optionalChain([onCopy, 'optionalCall', _ => _({
          sourceDateLabel: "Today",
          targetSection: "labResults",
          labInvestigations: data.parameters.map((p) => `${p.name}: ${p.value}${p.refRange ? ` (ref: ${p.refRange})` : ""}`),
        })])
      }
      copyAllTooltip="Fill complete digitized report to Lab Results"
    >
      {/* Table — matching LabPanelCard format */}
      <div className="overflow-hidden rounded-[8px] border-[1px] border-tp-slate-100">
        {/* Header */}
        <div className="grid grid-cols-3 gap-[1px] bg-tp-slate-50 px-[8px] py-[4px] text-[14px] font-semibold text-tp-slate-500">
          <span>Parameter</span>
          <span>Value</span>
          <span>Ref Range</span>
        </div>
        {/* Rows */}
        {visibleParams.map((param, i) => (
          <div
            key={param.name}
            className={cn(
              "grid grid-cols-3 gap-[1px] px-[8px] py-[6px] text-[14px]",
              i % 2 === 0 ? "bg-white" : "bg-tp-slate-50",
            )}
          >
            <span className="font-medium text-tp-slate-700 truncate">{param.name}</span>
            <span className={cn(
              "flex items-center gap-[3px] font-medium",
              param.flag ? "text-tp-error-600" : "text-tp-slate-800",
            )}>
              {param.flag && <FlagArrow flag={param.flag} />}
              {param.value}
            </span>
            <span className="text-tp-slate-400">{_nullishCoalesce(param.refRange, () => ( "\u2014"))}</span>
          </div>
        ))}
      </div>

      {/* Normal toggle */}
      {data.normalCount > 0 && (
        <button
          type="button"
          onClick={() => setShowNormal(!showNormal)}
          className="mt-[6px] w-full text-center text-[14px] font-medium text-tp-blue-500 transition-colors hover:text-tp-blue-600"
        >
          {showNormal
            ? "\u2212 Hide normal values"
            : `+ ${data.normalCount} normal`}
        </button>
      )}
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
