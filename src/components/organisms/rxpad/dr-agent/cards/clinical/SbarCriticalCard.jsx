"use client";

import React from "react";
import { CardShell } from "../CardShell";
import { SectionTag, SECTION_TAG_ICON_MAP } from "../SectionTag";


import { highlightClinicalText } from "../../shared/highlightClinicalText";
import { formatWithHierarchy } from "../../shared/formatWithHierarchy";





const SEVERITY_STYLES = {
  critical: "bg-tp-error-50 text-tp-error-700 font-bold",
  high: "bg-tp-warning-50 text-tp-warning-700 font-semibold"
};

export function SbarCriticalCard({ data }) {
  return (
    <CardShell
      icon={<span />}
      tpIconName="stethoscope"
      title="Patient Summary"
      dataSources={["EMR Records"]}
      collapsible={false}>
      
      <div className="flex flex-col gap-[8px]">
        {/* Situation — violet-bordered narrative (consistent with GPSummaryCard) */}
        <div className="rounded-[8px] bg-tp-slate-50 border-l-[3px] border-tp-violet-300 px-3 py-2">
          <p className="text-[14px] italic leading-[1.7] text-tp-slate-500">
            &ldquo;{highlightClinicalText(data.situation)}&rdquo;
          </p>
        </div>

        {/* Current Symptoms — inline with SectionTag */}
        {data.activeProblems.length > 0 &&
        <div className="text-[14px] leading-[1.8] text-tp-slate-800">
            <SectionTag label="Current Symptoms" icon="clipboard-activity" />{" "}
            {data.activeProblems.map((p, i, arr) =>
          <React.Fragment key={i}>
                {formatWithHierarchy(p.trim(), "text-tp-slate-700", "text-tp-slate-400")}
                {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
              </React.Fragment>
          )}
          </div>
        }

        {/* Allergies — inline with SectionTag */}
        {data.allergies.length > 0 &&
        <div className="text-[14px] leading-[1.8]">
            <SectionTag label="Allergies" icon="shield-cross" />{" "}
            {data.allergies.map((a, i, arr) =>
          <React.Fragment key={i}>
                {formatWithHierarchy(a.trim(), "text-tp-slate-700", "text-tp-slate-400")}
                {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
              </React.Fragment>
          )}
          </div>
        }

        {/* Key Medications — inline with SectionTag, regular text */}
        {data.keyMeds.length > 0 &&
        <div className="text-[14px] leading-[1.8] text-tp-slate-800">
            <SectionTag label="Key Medications" icon={SECTION_TAG_ICON_MAP["Medications"]} />{" "}
            {data.keyMeds.slice(0, 8).map((m, i, arr) =>
          <React.Fragment key={i}>
                {formatWithHierarchy(m.trim(), "text-tp-slate-700", "text-tp-slate-400")}
                {i < arr.length - 1 && <span className="text-tp-slate-400">, </span>}
              </React.Fragment>
          )}
          </div>
        }

        {/* Recent ER Admissions removed — data not available in current system */}
      </div>
    </CardShell>);

}