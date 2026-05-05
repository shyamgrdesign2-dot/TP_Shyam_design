"use client";

import React from "react";
import { CardShell } from "../CardShell";
import { InlineDataRow } from "../InlineDataRow";
import { SectionSummaryBar } from "../SectionSummaryBar";







export function MedicalHistoryCard({ data, onSidebarNav }) {
  return (
    <CardShell
      icon={<span />}
      tpIconName="medical-record"
      title="Medical History"
      collapsible
      dataSources={["EMR Records"]}>
      
      <div className="flex flex-col gap-[8px]">
        {data.sections.map((section, i) => {
          // Join items as comma-separated string — InlineDataRow's compound renderer
          // splits by commas and applies renderWithColorHierarchy to each sub-item
          const values = section.items.length > 0 ?
          [{ key: "", value: section.items.join(", ") }] :
          [{ key: "", value: "Not recorded" }];

          return (
            <div key={i}>
              <SectionSummaryBar label={section.tag} icon={section.icon} />
              <div className="pl-[4px]">
                <InlineDataRow
                  tag=""
                  values={values}
                  onTagClick={() => onSidebarNav?.("history")}
                  source="existing" />
                
              </div>
            </div>);

        })}
      </div>

      {/* Insight */}
      {data.insight &&
      <div className="mt-[6px] rounded-[6px] bg-tp-slate-50 px-[8px] py-[5px]">
          <p className="text-[12px] italic leading-[1.5] text-tp-slate-500">{data.insight}</p>
        </div>
      }
    </CardShell>);

}