/**
 * Medical Records content panel — matches Figma DetailedSectionView (Medical Records).
 * Shows filter chips and stacked record cards with document thumbnails.
 */
import Image from "next/image";
import React, { useState } from "react";
import { DocumentDownload, Edit2, Eye, Import, Printer, Trash } from "iconsax-reactjs";
import { MoreVertical } from "@/src/components/atoms/icons/lucide";
import { AiTriggerIcon } from "@/src/components/organisms/rxpad/dr-agent/shared/AiTriggerIcon";
import { HistoricalNewDataBanner } from "../HistoricalNewDataBanner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/src/components/molecules/DropdownMenu";
import { HoverTooltip } from "@/src/components/atoms/Tooltip";
import { Sidebar } from "@/src/components/molecules/Sidebar";
import { SidebarHeader } from "@/src/components/molecules/SidebarHeader";
import { toast } from "@/src/components/molecules/Toaster";

/** Filled rounded-square close glyph — same one every panel sidebar uses. */
function CloseSquareIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z"
        fill={color} />
    </svg>);
}

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
{ id: "edit", label: "Edit record", icon: Edit2 },
{ id: "download", label: "Download", icon: Import },
{ id: "delete", label: "Delete", icon: Trash }];


function RecordActionMenu({ onAction }) {
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
            <DropdownMenuItem
              key={action.id}
              className="gap-2 text-tp-slate-700"
              onSelect={(e) => { e.preventDefault?.(); onAction?.(action.id); }}>
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
  note,
  onAction
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onAction?.("view")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAction?.("view"); }
      }}
      className="group content-stretch flex flex-col items-start relative shrink-0 w-full overflow-hidden rounded-[10px] border border-tp-slate-100 bg-white cursor-pointer transition-shadow hover:shadow-[0_2px_12px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-blue-400">
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
        <div className="absolute left-[10px] top-[10px]" onClick={(e) => e.stopPropagation()}>
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
        <span className="absolute right-[10px] top-[10px]" onClick={(e) => e.stopPropagation()}>
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
              <p className="font-sans font-semibold leading-[20px] relative shrink-0 text-[14px]">{date}</p>
              <p className="font-sans font-normal leading-[20px] relative shrink-0 text-[14px] text-tp-slate-500">{label}</p>
            </div>
            <div className="flex items-center justify-center relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <RecordActionMenu onAction={onAction} />
            </div>
          </div>
        </div>
      </div>
    </div>);

}

// ─── Notes card (sidebar header strip above the document preview) ───────────
//
// Doctors often add a free-text note while uploading a record (e.g.
// findings, follow-up plan). The card surfaces that note prominently
// at the top of the sidebar in a soft grey container, and lets the
// doctor edit it inline. Re-keyed off `record.id` so opening another
// record always starts from that record's saved note.

function RecordNotesCard({ record, editTrigger = 0 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.note ?? "");

  // When the active record changes, reset the draft and exit edit mode.
  React.useEffect(() => {
    setDraft(record.note ?? "");
    setEditing(false);
  }, [record.id, record.note]);

  // editTrigger increments each time the top-strip Edit chip is
  // clicked — flip into edit mode every time so repeated clicks
  // re-open the editor after Save.
  const lastTriggerRef = React.useRef(editTrigger);
  React.useEffect(() => {
    if (editTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = editTrigger;
      if (editTrigger > 0) setEditing(true);
    }
  }, [editTrigger]);

  function handleSave() {
    // Demo: persist via toast — real wire-up would push back to the
    // record store. The card keeps the in-flight draft locally.
    toast.success("Notes saved");
    setEditing(false);
  }

  return (
    <section className="rounded-[12px] bg-tp-slate-100/80 p-[14px] ring-1 ring-tp-slate-200">
      {editing ? (
        <div className="mb-[8px] flex items-center justify-end gap-[8px]">
          <button
            type="button"
            onClick={() => { setDraft(record.note ?? ""); setEditing(false); }}
            className="font-sans text-[13px] font-medium text-tp-slate-500 hover:text-tp-slate-700">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-[28px] items-center justify-center rounded-[8px] bg-tp-blue-500 px-[12px] font-sans text-[13px] font-semibold text-white transition-colors hover:bg-tp-blue-600">
            Save
          </button>
        </div>
      ) : null}
      {editing ? (
        <textarea
          id="tp-record-notes-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          autoFocus
          placeholder="Add findings, recommendations, or follow-up plan…"
          className="w-full resize-y rounded-[10px] border border-tp-slate-200 bg-white px-[12px] py-[8px] font-sans text-[14px] leading-[20px] text-tp-slate-700 placeholder:text-tp-slate-400 focus:border-tp-blue-300 focus:outline-none focus:ring-2 focus:ring-tp-blue-100" />
      ) : (
        <p className="whitespace-pre-wrap font-sans text-[14px] leading-[20px] text-tp-slate-700">
          {draft || (
            <span className="italic text-tp-slate-400">No notes added yet — click Edit to write findings or follow-up plan.</span>
          )}
        </p>
      )}
    </section>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

// Image asset per record type — used both as the card thumbnail and
// as the full-size preview inside the View sidebar.
const RECORD_PREVIEW_BY_TYPE = {
  "pathology-img": imgImage,
  "prescription-img": imgEka111,
  "pdf": null, // pdf icon-only thumbnail; preview shows a placeholder
  "pathology-blank": imgImage,
};

const RECORDS = [
  { id: "rec-1", type: "pathology-img", label: "Pathology", date: "10 Aug'26", note: "Fasting glucose elevated at 180 mg/dL; HbA1c trending up to 8.2. Patient reports irregular metformin compliance over the last 3 weeks. Plan: reinforce adherence + repeat panel in 6 weeks." },
  { id: "rec-2", type: "prescription-img", label: "Prescription", date: "10 Aug'26", note: "Patient brought original handwritten Rx from previous OPD. Refilled metformin 500mg BD; added ramipril 2.5mg OD for borderline BP." },
  { id: "rec-3", type: "pdf", label: "Prescription", date: "10 Aug'26", note: "EMR export of last hospitalization discharge summary. Reconcile with current chart — confirm anti-diabetics list still active." },
  { id: "rec-4", type: "pathology-blank", label: "Pathology", date: "10 Aug'26", note: "Repeat pathology panel — values within reference range. No medication changes required at this visit." },
  { id: "rec-5", type: "pathology-img", label: "Pathology", date: "10 Aug'26", note: "Earlier lab copy attached for trend comparison. CBC, lipid panel, and LFTs all reviewed against today's reading." },
];

export function MedicalRecordsContent() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeRecord, setActiveRecord] = useState(null);
  // Bumped each time the top Edit chip is clicked; the notes card
  // listens on this counter and flips into edit mode regardless of
  // its previous state. Lets repeated Edit clicks re-open the editor
  // after Save without needing a per-record mode flag.
  const [editTrigger, setEditTrigger] = useState(0);

  const handleRecordAction = (record, action) => {
    if (action === "view") {
      setActiveRecord(record);
    } else if (action === "edit") {
      setActiveRecord(record);
      setEditTrigger((v) => v + 1);
    } else if (action === "download") {
      toast.success(`${record.label} download started`);
    } else if (action === "delete") {
      toast.success(`${record.label} (${record.date}) deleted`);
    }
  };

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
            {RECORDS.map((rec) => (
              <RecordCard
                key={rec.id}
                type={rec.type}
                label={rec.label}
                date={rec.date}
                note={rec.note}
                onAction={(action) => handleRecordAction(rec, action)} />
            ))}
          </div>
        </div>
      </div>

      {/* Record preview sidebar — shares the same chrome as Written Rx
          (Sidebar shell + SidebarHeader). Title carries date + record
          type. Trailing CTAs are icon-only chips: Download + Delete. */}
      <Sidebar
        open={Boolean(activeRecord)}
        onClose={() => setActiveRecord(null)}
        width="min(70vw, 880px)"
        panelClassName="min-w-[480px]"
        header={
          <SidebarHeader
            onClose={() => setActiveRecord(null)}
            closeAriaLabel="Close record preview"
            closeIcon={<CloseSquareIcon size={24} />}
            title={activeRecord ? `${activeRecord.label} (${activeRecord.date} · OPD)` : "Record"}
            actions={activeRecord ? (
              <>
                <button
                  type="button"
                  aria-label="Edit record"
                  onClick={() => {
                    setEditTrigger((v) => v + 1);
                    requestAnimationFrame(() => {
                      const ta = document.getElementById("tp-record-notes-textarea");
                      ta?.focus();
                    });
                  }}
                  className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-tp-slate-100 text-tp-slate-700 transition-colors hover:bg-tp-slate-200 active:scale-[0.96]">
                  <Edit2 color="currentColor" size={20} strokeWidth={1.5} variant="Linear" />
                </button>
                <button
                  type="button"
                  aria-label="Download record"
                  onClick={() => { toast.success(`${activeRecord.label} download started`); }}
                  className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-tp-slate-100 text-tp-slate-700 transition-colors hover:bg-tp-slate-200 active:scale-[0.96]">
                  <DocumentDownload color="currentColor" size={20} strokeWidth={1.5} variant="Linear" />
                </button>
                <button
                  type="button"
                  aria-label="Print record"
                  onClick={() => { toast.success(`Printing ${activeRecord.label}`); }}
                  className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-tp-slate-100 text-tp-slate-700 transition-colors hover:bg-tp-slate-200 active:scale-[0.96]">
                  <Printer color="currentColor" size={20} strokeWidth={1.5} variant="Linear" />
                </button>
                <button
                  type="button"
                  aria-label="Delete record"
                  onClick={() => {
                    toast.success(`${activeRecord.label} (${activeRecord.date}) deleted`);
                    setActiveRecord(null);
                  }}
                  className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-tp-error-50 text-tp-error-600 transition-colors hover:bg-tp-error-100 active:scale-[0.96]">
                  <Trash color="currentColor" size={20} strokeWidth={1.5} variant="Linear" />
                </button>
              </>
            ) : null}
          />
        }>
        <div className="flex-1 min-h-0 overflow-auto bg-tp-slate-50 p-4">
          <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
            {activeRecord ? (
              <RecordNotesCard
                record={activeRecord}
                editTrigger={editTrigger} />
            ) : null}
            {/* A4 sheet surface — same convention as the Written Rx
                preview drawer: rounded-[12px] white card with a 0.5px
                hairline top border + a 56px top breathing space so the
                document doesn't sit flush against the chrome above.
                Multi-page PDFs/images render their own scroll inside. */}
            <div
              className="w-full max-w-[820px] mx-auto overflow-hidden rounded-[12px] bg-white pt-[56px]"
              style={{ borderTop: "0.5px solid rgba(15,23,42,0.08)" }}>
              {activeRecord && RECORD_PREVIEW_BY_TYPE[activeRecord.type] ? (
                <Image
                  alt={activeRecord.label}
                  src={RECORD_PREVIEW_BY_TYPE[activeRecord.type]}
                  width={820}
                  height={1100}
                  className="w-full h-auto" />
              ) : activeRecord ? (
                <div className="flex w-full flex-col items-center justify-center gap-3 py-24 text-tp-slate-500">
                  <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                    <rect x="6" y="4" width="20" height="24" rx="2" fill="var(--tp-slate-300)" />
                    <rect x="9" y="9" width="14" height="2" rx="1" fill="white" />
                    <rect x="9" y="13" width="14" height="2" rx="1" fill="white" />
                    <rect x="9" y="17" width="8" height="2" rx="1" fill="white" />
                  </svg>
                  <p className="font-sans text-tp-slate-500 text-[14px]">{activeRecord.label} · {activeRecord.date}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Sidebar>
    </div>);

}