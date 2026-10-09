import React from "react"
import { cn } from "../../dr-agent/utils"
import { TPMedicalIcon } from "../compat/tp-ui"
import { SECTION_TAG_ICON_MAP } from "./SectionTag"

/**
 * Full-width section header row — canonical spec:
 * height 30px, icon 18px, label 14px semibold.
 * Default fill: TP Slate 100 at 70% opacity (subtle on white card bodies).
 * Use above block content; do not use as an inline chip (see SectionTag for tag+value rows).
 */
export function SectionSummaryBar({
  label,
  icon,
  iconSlot,
  variant = "default",
  trailing,
  className,
  marginBottom = true,
}) {
  const resolvedName = _nullishCoalesce(icon, () => ( SECTION_TAG_ICON_MAP[label]))
  const barBg = variant === "specialty" ? "bg-tp-violet-50" : "bg-tp-slate-100/70"
  const labelColor = variant === "specialty" ? "text-tp-violet-600" : "text-tp-slate-500"
  const iconColor = variant === "specialty"
    ? "var(--tp-violet-600, #7C3AED)"
    : "var(--tp-slate-500, #64748B)"

  return (
    <div
      className={cn(
        "group/section-header flex h-[30px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] px-2 py-[3px]",
        marginBottom && "mb-[4px]",
        barBg,
        className,
      )}
    >
      {_nullishCoalesce(iconSlot, () => ( (resolvedName ? (
        <TPMedicalIcon
          name={resolvedName}
          variant="bulk"
          size={18}
          color={iconColor}
          className="shrink-0"
        />
      ) : null)))}
      <span
        className={cn(
          "flex min-h-0 min-w-0 flex-1 items-center text-left text-[14px] font-semibold leading-none",
          labelColor,
        )}
      >
        {label}
      </span>
      {trailing}
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
