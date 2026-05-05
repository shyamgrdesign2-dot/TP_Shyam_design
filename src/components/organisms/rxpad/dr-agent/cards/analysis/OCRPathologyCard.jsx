"use client";

import { useState } from "react";
import { CardShell } from "../CardShell";
import { cn } from "@/src/hooks/utils";
import { FlagArrow } from "../../shared/FlagArrow";















export function OCRPathologyCard({ data, onPillTap, onCopy }) {
  const [showNormal, setShowNormal] = useState(false);

  const flaggedParams = data.parameters.filter((p) => p.flag);
  const normalParams = data.parameters.filter((p) => !p.flag);
  const visibleParams = showNormal ? data.parameters : flaggedParams;

  return (
    <CardShell
      icon={<span />}
      tpIconName="Lab"
      title={data.title}
      badge={
      flaggedParams.length > 0 ?
      { label: `${flaggedParams.length} flagged`, color: "#DC2626", bg: "#FEE2E2" } :
      undefined
      }
      copyAll={() =>
      onCopy?.({
        sourceDateLabel: "Today",
        targetSection: "labResults",
        labInvestigations: data.parameters.map((p) => `${p.name}: ${p.value}${p.refRange ? ` (ref: ${p.refRange})` : ""}`)
      })
      }
      copyAllTooltip="Fill complete digitized report to Lab Results">
      
      {/* Table — matching LabPanelCard format */}
      <div className="overflow-hidden rounded-[8px] border border-tp-slate-100">
        {/* Header */}
        <div className="grid grid-cols-3 gap-[1px] bg-tp-slate-50 px-[8px] py-[4px] text-[14px] font-semibold text-tp-slate-500">
          <span>Parameter</span>
          <span>Value</span>
          <span>Ref Range</span>
        </div>
        {/* Rows */}
        {visibleParams.map((param, i) =>
        <div
          key={param.name}
          className={cn(
            "grid grid-cols-3 gap-[1px] px-[8px] py-[6px] text-[14px]",
            i % 2 === 0 ? "bg-white" : "bg-tp-slate-50"
          )}>
          
            <span className="font-medium text-tp-slate-700 truncate">{param.name}</span>
            <span className={cn(
            "flex items-center gap-[3px] font-medium",
            param.flag ? "text-tp-error-600" : "text-tp-slate-800"
          )}>
              {param.flag && <FlagArrow flag={param.flag} />}
              {param.value}
            </span>
            <span className="text-tp-slate-400">{param.refRange ?? "\u2014"}</span>
          </div>
        )}
      </div>

      {/* Normal toggle */}
      {data.normalCount > 0 &&
      <button
        type="button"
        onClick={() => setShowNormal(!showNormal)}
        className="mt-[6px] w-full text-center text-[14px] font-medium text-tp-blue-500 transition-colors hover:text-tp-blue-600">
        
          {showNormal ?
        "\u2212 Hide normal values" :
        `+ ${data.normalCount} normal`}
        </button>
      }
    </CardShell>);

}