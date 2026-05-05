"use client";

import React from "react";
import { cn } from "@/src/hooks/utils";
import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";
import { SECTION_TAG_ICON_MAP } from "./SectionTag";














/**
 * Full-width section header row — canonical spec:
 * height 30px, icon 18px, label 14px semibold.
 * Default fill: TP Slate 100 at 70% opacity (`bg-tp-slate-100/70`); label/icon `text-tp-slate-500`.
 * Specialty: `bg-tp-violet-50` + `text-tp-violet-600`.
 * For inline subsection keys (Chronic:, BP:, Sx:, lab names), use **`SECTION_INLINE_SUBKEY_CLASS`** from `shared/sectionInlineKey.ts` — not on this bar.
 */
export function SectionSummaryBar({
  label,
  icon,
  iconSlot,
  variant = "default",
  trailing,
  className,
  marginBottom = true
}) {
  const resolvedName = icon ?? SECTION_TAG_ICON_MAP[label];
  const barBg = variant === "specialty" ? "bg-tp-violet-50" : "bg-tp-slate-100/70";
  const labelColor = variant === "specialty" ? "text-tp-violet-600" : "text-tp-slate-500";
  const iconColor = variant === "specialty" ?
  "var(--tp-violet-600, #7C3AED)" :
  "var(--tp-slate-500, #64748B)";

  return (
    <div
      className={cn(
        "group/section-header flex h-[30px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] px-2 py-[3px]",
        marginBottom && "mb-[4px]",
        barBg,
        className
      )}>
      
      {iconSlot ?? (resolvedName ?
      <TPMedicalIcon
        name={resolvedName}
        variant="bulk"
        size={18}
        color={iconColor}
        className="shrink-0" /> :

      null)}
      <span
        className={cn(
          "flex min-h-0 min-w-0 flex-1 items-center text-left text-[14px] font-semibold leading-none",
          labelColor
        )}>
        
        {label}
      </span>
      {trailing}
    </div>);

}