/**
 * Medical Records content panel — matches Figma DetailedSectionView (Medical Records).
 * Shows filter chips and stacked record cards with document thumbnails.
 */
import React, { useState } from "react";
import { Eye, EyeSlash, Import, NoteText, Trash } from "iconsax-reactjs";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"../../../ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger } from
"../../../ui/tooltip";
import mr from "./MedicalRecordsContent.module.scss";
const imgImage = "/assets/254812c5250025b09cfb4d7901db6be9343f3ff7.png";
const imgEka111 = "/assets/afc7c9e55f8624dd8cba9c2017f7a975fba9d2d2.png";
// ─── Add New Records button ───────────────────────────────────────────────────
function AddRecordsButton() {
  return (
    <div className={mr.addBar}>
      <div aria-hidden="true" className={mr.addBarTopRule} />
      <div className={mr.addHit}>
        <div aria-hidden="true" className={mr.addOutline} />
        <div className={mr.addCenter}>
          <div className={mr.addInner}>
            <div className={mr.plusBox}>
              <svg className={mr.plusSvg} fill="none" viewBox="0 0 24 24">
                <path
                  d="M6 12H18"
                  stroke="var(--tp-blue-500)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5" />

                <path
                  d="M12 18V6"
                  stroke="var(--tp-blue-500)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5" />

              </svg>
            </div>
            <p className={mr.addLabel}>Add New Records</p>
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
      className={`${mr.filterChip} ${active ? mr.filterChipActive : mr.filterChipInactive}`}
      onClick={onClick}>

      <div
        aria-hidden="true"
        className={`${mr.filterChipBorder} ${active ? mr.filterChipBorderActive : ""}`} />

      <p className={mr.filterChipLabel}>{label}</p>
    </div>);

}
// ─── Three-dots icon ─────────────────────────────────────────────────────────
function DotsIcon() {
  return (
    <div className={mr.dotsWrap}>
      <MoreVertical color="var(--tp-slate-500)" size={16} strokeWidth={1.5} />
    </div>);

}
// ─── Report icon ──────────────────────────────────────────────────────────────
function ReportIcon() {
  return (
    <div className={mr.reportIconWrap}>
      <NoteText
        color="var(--tp-slate-500)"
        size={14}
        strokeWidth={1.5}
        variant="Linear" />

    </div>);

}
const RECORD_ACTIONS = [
{
  id: "view",
  label: "View",
  icon: Eye
},
{
  id: "download",
  label: "Download",
  icon: Import
},
{
  id: "hide",
  label: "Hide",
  icon: EyeSlash
},
{
  id: "delete",
  label: "Delete",
  icon: Trash
}];

function RecordActionMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <button type="button" className={mr.menuTrigger}>
          <DotsIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={mr.dropdownPanel}>
        {RECORD_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem className={mr.dropdownItem}>
              <Icon color="var(--tp-violet-500)" size={16} variant="Bulk" />
              {action.label}
            </DropdownMenuItem>);

        })}
      </DropdownMenuContent>
    </DropdownMenu>);

}
function RecordCard({ type, label, date, note }) {
  return (
    <div className={mr.recordCard}>
      <div className={mr.thumbShell}>
        <div aria-hidden="true" className={mr.thumbBorder} />
        {type === "pathology-img" &&
        <div className={mr.thumbFill}>
            <img
            alt="pathology report"
            className={`${mr.thumbImg} ${mr.thumbImgBlur}`}
            src={imgImage} />

          </div>}

        {type === "prescription-img" &&
        <div className={mr.thumbFill}>
            <img alt="prescription" className={mr.thumbImg} src={imgEka111} />
          </div>}

        {type === "pdf" &&
        <div className={mr.thumbPdfBg}>
            <div className={mr.pdfPlaceholderCol}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect
                x="6"
                y="4"
                width="20"
                height="24"
                rx="2"
                fill="var(--tp-slate-300)" />

                <rect x="9" y="9" width="14" height="2" rx="1" fill="white" />
                <rect x="9" y="13" width="14" height="2" rx="1" fill="white" />
                <rect x="9" y="17" width="8" height="2" rx="1" fill="white" />
              </svg>
              <p className={mr.pdfName}>20240121_190912.pdf</p>
            </div>
          </div>}

        {type === "pathology-blank" &&
        <div className={mr.thumbFill}>
            <img
            alt="pathology report"
            className={`${mr.thumbImg} ${mr.thumbImgBlur}`}
            src={imgImage} />

          </div>}

        <Tooltip>
          <TooltipTrigger asChild={true}>
            <button
              type="button"
              className={mr.noteBtn}
              aria-label="View upload note">

              <ReportIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4} className={mr.tooltipPanel}>
            {note}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className={mr.footerBar}>
        <div aria-hidden="true" className={mr.footerBorder} />
        <div className={mr.footerRow}>
          <div className={mr.footerInner}>
            <div className={mr.footerTextCol}>
              <p className={mr.footerTitle}>{label}</p>
              <p className={mr.footerDate}>{date}</p>
            </div>
            <div className={mr.menuCell}>
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
    <div className={mr.pageRoot}>
      <AddRecordsButton />
      <div className={mr.filterRow}>
        {FILTERS.map((f) =>
        <FilterChip
          label={f}
          active={activeFilter === f}
          onClick={() => setActiveFilter(f)} />

        )}
      </div>
      <div className={mr.scrollFlex}>
        <div className={mr.scrollInner}>
          <div className={mr.cardsStack}>
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