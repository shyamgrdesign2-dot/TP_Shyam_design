"use client";

import React from "react";
import { CardShell } from "../CardShell";

import { SectionTag, SECTION_TAG_ICON_MAP } from "../SectionTag";
import { formatWithHierarchy } from "../../shared/formatWithHierarchy";
import { SECTION_INLINE_SUBKEY_CLASS } from "../../shared/sectionInlineKey";
import { FlagArrow } from "../../shared/FlagArrow";
import { cn } from "@/src/hooks/utils";









const FLAG_COLORS = {
  high: "text-tp-error-600 font-semibold",
  low: "text-tp-error-600 font-semibold",
  critical: "text-tp-error-700 font-bold",
  normal: "text-tp-slate-800"
};

export function PomrProblemCard({ data, onPillTap, onOpenDocument }) {
  // Build rich source entries for the donut tooltip
  const sourceEntries = React.useMemo(() => {
    // Use explicit sourceEntries from data if available
    if (data.sourceEntries && data.sourceEntries.length > 0) {
      return data.sourceEntries.map((entry) => ({
        label: entry.label,
        date: entry.date,
        type: entry.type,
        onClick: onOpenDocument ? () => onOpenDocument(entry.label) : undefined
      }));
    }
    // Fallback: derive from lab provenance
    const entries = [];
    const hasEmr = data.labs.some((l) => l.provenance === "emr" || !l.provenance);
    const hasAi = data.labs.some((l) => l.provenance === "ai_extracted");
    if (hasEmr) {
      entries.push({
        label: "EMR — Lab Results",
        type: "emr",
        onClick: onOpenDocument ? () => onOpenDocument("EMR — Lab Results") : undefined
      });
    }
    if (hasAi) {
      entries.push({
        label: "Uploaded Report (AI-Extracted)",
        type: "uploaded",
        onClick: onOpenDocument ? () => onOpenDocument("Uploaded Report (AI-Extracted)") : undefined
      });
    }
    if (entries.length === 0) {
      entries.push({ label: "EMR Records", type: "emr" });
    }
    return entries;
  }, [data.labs, data.sourceEntries, onOpenDocument]);

  return (
    <CardShell
      icon={<span />}
      tpIconName="clipboard-activity"
      title={data.problem}
      badge={{
        label: data.status,
        color: data.statusColor,
        bg: `${data.statusColor}14`
      }}
      dataSources={["EMR Records", "AI-Extracted"]}
      collapsible
      defaultCollapsed={false}>
      
      <div className="flex flex-col gap-[8px]">
        {/* Labs — inline with SectionTag (same line, like InlineDataRow pattern) */}
        {data.labs.length > 0 &&
        <div className="text-[14px] leading-[1.8] text-tp-slate-800">
            <SectionTag label="Key Labs" icon={SECTION_TAG_ICON_MAP["Key Labs"]} />{" "}
            {data.labs.map((lab, i) =>
          <span key={lab.name}>
                <span className={SECTION_INLINE_SUBKEY_CLASS}>{lab.name}:&nbsp;</span>
                <span className={cn("inline-flex items-center", FLAG_COLORS[lab.flag || "normal"])}>
                  {(lab.flag === "high" || lab.flag === "low" || lab.flag === "critical") && <FlagArrow flag={lab.flag} className="mr-[1px]" />}
                  {lab.value}
                  {lab.unit ? ` ${lab.unit}` : ""}
                </span>
                {i < data.labs.length - 1 &&
            <span className="mx-[6px] text-tp-slate-200">|</span>
            }
              </span>
          )}
          </div>
        }

        {/* Medications — inline with SectionTag, regular text (not tags) */}
        {data.meds.length > 0 &&
        <div className="text-[14px] leading-[1.8] text-tp-slate-800">
            <SectionTag label="Current Medications" icon={SECTION_TAG_ICON_MAP["Current Medications"]} />{" "}
            {data.meds.map((med, i) =>
          <React.Fragment key={i}>
                {i > 0 && <span className="text-tp-slate-400">, </span>}
                {formatWithHierarchy(med)}
              </React.Fragment>
          )}
          </div>
        }

        {/* Missing / Action Items — heading inside colored card */}
        {data.missingFields.length > 0 &&
        <div
          className="rounded-[6px] px-[8px] py-[6px]"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
          
            <div className="mb-[4px]">
              <SectionTag label="Missing / Action Items" icon="danger" />
            </div>
            <div className="flex flex-col gap-[3px]">
              {data.missingFields.map((mf, i) =>
            <div
              key={i}
              className="flex items-start gap-[6px] text-[14px]">
              
                  <span className="mt-[1px] flex-shrink-0 text-[14px] text-amber-500">{"\u25CF"}</span>
                  <div className="min-w-0">
                    <span className="font-medium text-tp-slate-700">{mf.field}</span>
                    <span className="text-tp-slate-400"> — {mf.reason}</span>
                  </div>
                </div>
            )}
            </div>
          </div>
        }
      </div>
    </CardShell>);

}