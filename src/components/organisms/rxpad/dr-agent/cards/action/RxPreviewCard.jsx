"use client";

import React from "react";
import { CardShell } from "../CardShell";
import { FooterCTA, FooterCTAGroup } from "../FooterCTA";
import { SECTION_TAG_ICON_MAP } from "../SectionTag";
import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";
import { formatWithHierarchy } from "../../shared/formatWithHierarchy";
import { Printer, Share } from "iconsax-reactjs";







function Section({ label, items }) {
  if (items.length === 0) return null;
  const iconName = SECTION_TAG_ICON_MAP[label];
  return (
    <div className="mb-[6px]">
      {/* Full-width section header bar — matching Structured Transcript pattern */}
      <div className="flex items-center gap-[5px] rounded-[4px] bg-tp-slate-50 px-2 py-[3px] mb-[4px]">
        {iconName &&
        <TPMedicalIcon
          name={iconName}
          variant="bulk"
          size={12}
          color="var(--tp-slate-500, #64748B)" />

        }
        <span className="flex-1 text-[12px] font-medium text-tp-slate-600">
          {label}
        </span>
      </div>
      <ul className="flex flex-col gap-[2px] pl-1">
        {items.map((item, i) =>
        <li key={i} className="flex items-start gap-[6px] px-1 py-[2px] text-[14px] leading-[1.6] text-tp-slate-700">
            <span className="mt-[1px] flex-shrink-0 text-tp-slate-400">•</span>
            <span className="flex-1">{formatWithHierarchy(item)}</span>
          </li>
        )}
      </ul>
    </div>);

}

export function RxPreviewCard({ data, onPillTap }) {
  return (
    <CardShell
      icon={<span />}
      tpIconName="clipboard-activity"
      title="Prescription Preview"
      date={data.date}

      sidebarLink={
      <FooterCTAGroup>
          <FooterCTA label="Print prescription" tone="secondary" fullWidth iconLeft={<Printer size={14} variant="Linear" />} />
          <FooterCTA label="Share digitally" tone="secondary" fullWidth iconLeft={<Share size={14} variant="Linear" />} />
        </FooterCTAGroup>
      }>
      
      {/* Patient */}
      <div className="mb-[8px] rounded-[6px] bg-tp-slate-50 px-2.5 py-[4px] text-[14px]">
        <span className="font-medium text-tp-slate-600">Patient:</span>{" "}
        <span className="text-tp-slate-800">{data.patientName}</span>
      </div>

      <Section label="Diagnoses" items={data.diagnoses} />
      <Section label="Medications" items={data.medications} />
      <Section label="Investigations" items={data.investigations} />
      <Section label="Advice" items={data.advice} />

      {data.followUp &&
      <div>
          <div className="flex items-center gap-[5px] rounded-[4px] bg-tp-slate-50 px-2 py-[3px] mb-[4px]">
            <TPMedicalIcon
            name={SECTION_TAG_ICON_MAP["Follow-up"] ?? "medical-record"}
            variant="bulk"
            size={12}
            color="var(--tp-slate-500, #64748B)" />
          
            <span className="flex-1 text-[12px] font-medium text-tp-slate-600">
              Follow-up
            </span>
          </div>
          <p className="text-[14px] leading-[1.6] pl-[10px]">{formatWithHierarchy(data.followUp)}</p>
        </div>
      }
    </CardShell>);

}