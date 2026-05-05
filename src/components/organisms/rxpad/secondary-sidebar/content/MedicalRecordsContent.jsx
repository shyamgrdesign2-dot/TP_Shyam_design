/**
 * Medical Records content panel — matches Figma DetailedSectionView (Medical Records).
 * Shows filter chips and stacked record cards with document thumbnails.
 */
import Image from "next/image";
import React, { useState } from "react";
import { Eye, Import, Trash } from "iconsax-reactjs";
import { MoreVertical } from "lucide-react";
import { AiTriggerIcon } from "@/src/components/organisms/rxpad/dr-agent/shared/AiTriggerIcon";
import { HistoricalNewDataBanner } from "../HistoricalNewDataBanner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/src/components/molecules/DropdownMenu";
import { HoverTooltip } from "@/src/components/atoms/Tooltip";

const imgImage = "/assets/254812c5250025b09cfb4d7901db6be9343f3ff7.png";
const imgEka111 = "/assets/afc7c9e55f8624dd8cba9c2017f7a975fba9d2d2.png";
const img10Px = "/assets/d3845f2c9996392b9c624116f1a98744aa11f42e.png";

// ─── Add New Records button ───────────────────────────────────────────────────

function AddRecordsButton() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start p-[12px] relative shrink-0 w-full">
      <div aria-hidden="true" className="absolute border-tp-slate-100 border-b border-solid inset-0 pointer-events-none" />
      <div className="h-[36px] relative rounded-[10px] shrink-0 w-full cursor-pointer">
        <div aria-hidden="true" className="absolute border border-tp-blue-500 border-solid inset-0 pointer-events-none rounded-[10px]" />
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex gap-[4px] items-center justify-center px-[16px] py-px relative size-full">
            <div className="relative shrink-0 size-[24px]">
              <svg className="absolute block size-full" fill="none" viewBox="0 0 24 24">
                <path d="M6 12H18" stroke="var(--tp-blue-500)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                <path d="M12 18V6" stroke="var(--tp-blue-500)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="font-sans font-medium leading-[22px] not-italic relative shrink-0 text-tp-blue-500 text-[14px] text-center whitespace-nowrap">
              Add New Records
            </p>
          </div>
        </div>
      </div>
    </div>);

}

// ─── Filter chip ──────────────────────────────────────────────────────────────

const FILTERS = ["All", "Pathology", "Radiology", "Prescription", "Other"];


function FilterChip({ label, active, onClick }) {
  return (
    <div
      className={`content-stretch flex h-[28px] items-center justify-center px-[12px] py-[6px] relative rounded-[8px] shrink-0 cursor-pointer transition-colors ${
        active ? "bg-tp-blue-50" : "bg-white hover:bg-tp-slate-50"
      }`}
      onClick={onClick}>

      <div
        aria-hidden="true"
        className={`absolute border border-solid inset-0 pointer-events-none rounded-[8px] ${
          active ? "border-tp-blue-300" : "border-tp-slate-200"
        }`}
      />
      <p
        className={`font-sans leading-[20px] not-italic relative shrink-0 text-[14px] tracking-[0.1px] whitespace-nowrap ${
          active ? "font-semibold text-tp-blue-700" : "font-medium text-tp-slate-700"
        }`}>
        {label}
      </p>
    </div>);

}

// ─── Three-dots icon ─────────────────────────────────────────────────────────

function DotsIcon() {
  return (
    <div className="flex items-center justify-center relative shrink-0 size-[16px]">
      <MoreVertical color="var(--tp-slate-500)" size={16} strokeWidth={1.5} />
    </div>);

}

// ─── Report icon ──────────────────────────────────────────────────────────────
//
// Quick-notes affordance on each record card. The previous iconsax
// `Note` glyph rendered as a generic line-list; this custom document-
// with-folded-corner outline reads more clearly as a "report attached"
// cue and matches the design-system spec the user shared.

function ReportIcon({ size = 14, color = "var(--tp-slate-500)" }) {
  return (
    <div className="inline-flex size-[24px] items-center justify-center rounded-full bg-tp-slate-200/70">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true">
        <g clipPath="url(#tp-record-note-clip)">
          <path
            d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H14"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M22 10H18C15 10 14 9 14 6V2L22 10Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M7 13H13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 17H11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="tp-record-note-clip">
            <rect width="24" height="24" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

// Three-dot record actions. "Hide" was removed per spec — the doctor
// works with View / Download / Delete only. The trigger continues to
// use `MoreVertical` (kebab) as the affordance.
const RECORD_ACTIONS = [
{ id: "view", label: "View", icon: Eye },
{ id: "download", label: "Download", icon: Import },
{ id: "delete", label: "Delete", icon: Trash }];


function RecordActionMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center rounded-md p-1 hover:bg-tp-slate-100">
          <DotsIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[170px] rounded-[10px] border border-tp-slate-100">
        {RECORD_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem key={action.id} className="gap-2 text-tp-slate-700">
              <Icon color="currentColor" size={16} variant="Linear" />
              {action.label}
            </DropdownMenuItem>);

        })}
      </DropdownMenuContent>
    </DropdownMenu>);

}

// ─── Record card ─────────────────────────────────────────────────────────────



function RecordCard({
  type,
  label,
  date,
  note





}) {
  return (
    <div className="group content-stretch flex flex-col items-start relative shrink-0 w-full overflow-hidden rounded-[10px] border border-tp-slate-100 bg-white">
      {/* Thumbnail */}
      <div className="h-[82px] relative rounded-tl-[10px] rounded-tr-[10px] shrink-0 w-full overflow-clip">
        <div
          aria-hidden="true"
          className="absolute border-tp-slate-100 border-solid inset-0 pointer-events-none rounded-tl-[10px] rounded-tr-[10px]"
          style={{ borderWidth: "0.5px", borderBottomWidth: 0 }} />
        
        {type === "pathology-img" &&
        <div className="w-full h-full bg-tp-slate-50 relative overflow-hidden">
            <Image alt="pathology report" fill className="object-cover opacity-80 blur-[0.65px]" src={imgImage} />
          </div>
        }
        {type === "prescription-img" &&
        <div className="w-full h-full bg-tp-slate-50 relative overflow-hidden">
            <Image alt="prescription" fill className="object-cover" src={imgEka111} />
          </div>
        }
        {type === "pdf" &&
        <div className="w-full h-full bg-tp-slate-100 relative overflow-hidden flex items-center justify-center">
            <div className="flex flex-col items-center gap-[4px] opacity-60">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="6" y="4" width="20" height="24" rx="2" fill="var(--tp-slate-300)" />
                <rect x="9" y="9" width="14" height="2" rx="1" fill="white" />
                <rect x="9" y="13" width="14" height="2" rx="1" fill="white" />
                <rect x="9" y="17" width="8" height="2" rx="1" fill="white" />
              </svg>
              <p className="font-sans text-tp-slate-400 text-[7px] leading-[10px] whitespace-nowrap">
                20240121_190912.pdf
              </p>
            </div>
          </div>
        }
        {type === "pathology-blank" &&
        <div className="w-full h-full bg-tp-slate-50 relative overflow-hidden">
            <Image alt="pathology report" fill className="object-cover opacity-80 blur-[0.65px]" src={imgImage} />
          </div>
        }
        {/* AI summarize icon — top-left of thumbnail, always visible */}
        <div className="absolute left-[10px] top-[10px]">
          <AiTriggerIcon
            tooltip={`Summarize this ${label.toLowerCase()}`}
            signalLabel={`Summarize uploaded document: ${label} (${date})`}
            sectionId="medicalRecords" />
          
        </div>
        {/* Quick-note tooltip uses the TP-design-system `HoverTooltip`
             atom — anchored via `getBoundingClientRect()` so the
             popover lands directly above this icon, not at the
             top-bar (which was happening with the Radix Portal +
             stacking-context interaction). */}
        <span className="absolute right-[10px] top-[10px]">
          <HoverTooltip content={note} side="top" align="end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-0.5 hover:bg-white/60"
              aria-label="View upload note">
              <ReportIcon />
            </button>
          </HoverTooltip>
        </span>
      </div>
      {/* Label bar */}
      <div className="bg-tp-slate-200 relative rounded-bl-[10px] rounded-br-[10px] shrink-0 w-full">
        <div
          aria-hidden="true"
          className="absolute border border-tp-slate-100 border-solid inset-0 pointer-events-none rounded-bl-[10px] rounded-br-[10px]"
          style={{ borderWidth: "0.5px" }} />
        
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex items-center justify-between px-[12px] py-[6px] relative w-full">
            <div className="content-stretch flex flex-col items-start not-italic relative shrink-0 text-tp-slate-700 tracking-[0.1px] w-[103px]">
              <p className="font-sans font-semibold leading-[20px] relative shrink-0 text-[14px]">{label}</p>
              <p className="font-sans font-normal leading-[20px] relative shrink-0 text-[14px] text-tp-slate-500">{date}</p>
            </div>
            <div className="flex items-center justify-center relative shrink-0">
              <RecordActionMenu />
            </div>
          </div>
        </div>
      </div>
    </div>);

}

// ─── Public export ────────────────────────────────────────────────────────────

export function MedicalRecordsContent() {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="content-stretch flex flex-col items-start relative size-full">
      <AddRecordsButton />
      <HistoricalNewDataBanner activeId="medicalRecords" />
      {/* Filter chips */}
      <div className="bg-white content-start flex flex-wrap gap-[8px] items-start p-[12px] relative shrink-0 w-full">
        {FILTERS.map((f) =>
        <FilterChip key={f} label={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
        )}
      </div>
      {/* Record list */}
      <div className="flex-[1_0_0] min-h-px min-w-px relative w-full">
        <div className="overflow-x-clip overflow-y-auto size-full">
          <div className="content-stretch flex flex-col gap-[16px] items-start p-[12px] relative w-full">
            <RecordCard
              type="pathology-img"
              label="Pathology"
              date="10 Aug'26"
              note="Uploaded by Dr. Shyam: pathology panel from last follow-up." />
            
            <RecordCard
              type="prescription-img"
              label="Prescription"
              date="10 Aug'26"
              note="Scanned written prescription shared by patient at intake." />
            
            <RecordCard
              type="pdf"
              label="Prescription"
              date="10 Aug'26"
              note="Digitized PDF export generated from hospital EMR." />
            
            <RecordCard
              type="pathology-blank"
              label="Pathology"
              date="10 Aug'26"
              note="Follow-up pathology receipt uploaded by front desk." />
            
            <RecordCard
              type="pathology-img"
              label="Pathology"
              date="10 Aug'26"
              note="Previous lab copy attached for trend comparison." />
            
          </div>
        </div>
      </div>
    </div>);

}