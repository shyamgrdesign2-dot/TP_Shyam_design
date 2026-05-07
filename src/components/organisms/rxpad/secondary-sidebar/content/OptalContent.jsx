/**
 * Ophthal History content panel — date-grouped exam entries with
 * 7 clinical sub-sections rendered through the standard `SectionCard`
 * primitive (same chrome as Obstetric / Vaccine / Gynec).
 *
 * Per visit:
 *   1. Visual Acuity Test       (OD / OS — UC distance, UC near, pinhole, C distance, C near)
 *   2. Subjective Refraction    (Undilated + Dilated, OD/OS rows)
 *   3. Lensmeter Values         (OD / OS rows)
 *   4. Glass Prescription       (OD / OS + PD)
 *   5. Intra Ocular Pressure    (OD / OS — NCT, GAT, CCT, CIOP)
 *   6. Slit Lamp Examination    (Lids/Lacrimal, Conjuctiva/Sclera, Cornea — each labelled)
 *   7. Fundus Examination       (Disc, Macula, Choroid)
 *
 * Typography matches Obstetric / Vaccine:
 *   • Section / sub-group title  → SectionCard built-in (slate-700 semibold)
 *   • Field label                → tp-slate-500 (NO bold) — recedes
 *   • Field value                → tp-slate-700, font-medium — pops
 *   • Inline separators inside parens → comma `, `
 *   • OD / OS prefix             → semibold slate-700 (acts as the row heading)
 *   • Bullet                     → grey dot pointer
 */

import React, { useState } from "react";
import { cn as clsx } from "@/src/hooks/utils";
import { ArrowSquareDown, ArrowSquareUp, Copy as CopyIcon, CopySuccess } from "iconsax-reactjs";
import { ActionButton, Bullet, useStickyHeaderState } from "../detail-shared";
import { tpSectionCardStyle } from "../tokens";
import { AiTriggerIcon } from "../../dr-agent/shared/AiTriggerIcon";
import { HistoricalNewDataBanner } from "../HistoricalNewDataBanner";
import { HoverTooltip } from "@/src/components/atoms/Tooltip";
import { toast } from "@/src/components/molecules/Toaster";

// ─── Mock data — shape the OD/OS payload that `optalEntries(history)` will yield ──
const OPTAL_ENTRIES = [
  {
    id: "op-27",
    dateLabel: "27 Jan'26",
    visualAcuity: {
      OD: { "UC Dist": "6/9", PH: "6/6", "C Dist": "6/6", "C Near": "N6" },
      OS: { "UC Dist": "6/12", PH: "6/9", "C Dist": "6/9", "C Near": "N8" },
    },
    iop: {
      OD: { NCT: "12 mmhg", GAT: "14 mmhg" },
      OS: { NCT: "13 mmhg", GAT: "15 mmhg" },
    },
    slitLamp: [
      { name: "Lids/Lacrimal Apparatus", OD: "Normal", OS: "Normal" },
      { name: "Cornea", OD: "Clear", OS: "Clear" },
    ],
    fundus: [{ name: "Disc", OD: "WNL", OS: "WNL" }],
  },
  {
    id: "op-15",
    dateLabel: "15 Jan'26",
    visualAcuity: {
      OD: { "UC Dist": "6/120", "UC Near": "N5", PH: "6/12", "C Dist": "6/9", "C Near": "N6" },
      OS: { "UC Dist": "6/120", "UC Near": "N5", PH: "6/12", "C Dist": "6/9", "C Near": "N6" },
    },
    autoRefraction: {
      Undilated: {
        OD: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
        OS: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      },
      Dilated: {
        OD: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
        OS: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      },
    },
    lensmeter: {
      OD: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      OS: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
    },
    glassPrescription: {
      OD: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      OS: { Sph: "+0.25", Cyl: "+1.25", Axis: "10°", "Add": "+1.75", Dist: "6/24", Near: "N6" },
      PD: "0.25",
    },
    iop: {
      OD: { NCT: "1 mmhg", GAT: "3 mmhg", CCT: "302µm", CIOP: "2 MmHg" },
      OS: { NCT: "1 mmhg", GAT: "3 mmhg", CCT: "302µm", CIOP: "2 MmHg" },
    },
    slitLamp: [
      { name: "Lids/Lacrimal Apparatus", OD: "Normal", OS: "Blepharitis" },
      { name: "Conjuctiva/Sclera", OD: "Congestion / Hyperemia", OS: "NIL", Remarks: "Moderate" },
      { name: "Cornea", OD: "Corneal Edema", OS: "NIL", Remarks: "Mild" },
    ],
    fundus: [
      { name: "Disc", OD: "Vitreous Floaters", OS: "Vitreous Floaters", Remarks: "Looking Dense In OD" },
      { name: "Macula", OD: "Macular Scar", OS: "NIL" },
      { name: "Choroid", OD: "Choroidal Nevus", OS: "NIL" },
    ],
  },
];

// ─── Dummy copy affordance ────────────────────────────────────────────────────
//
// Full click-state + tooltip + snackbar UX. The actual copy-to-RxPad
// wire-up will be added when the Ophthal module lands in production;
// for now this acts as a visual placeholder so the UX pattern is
// consistent with Past Visits.

function DummyCopyButton({
  hint = "Copy to RxPad",
  toastMsg = "Copied to RxPad",
  showOnHover = false,
  className,
}) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    if (copied) return;
    setCopied(true);
    toast.success(toastMsg);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const visibilityClass = showOnHover
    ? "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
    : "opacity-100";

  return (
    <HoverTooltip content={hint} side="top">
      <button
        type="button"
        aria-label={hint}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={clsx(
          "inline-flex h-6 w-6 items-center justify-center rounded-md transition-all",
          copied
            ? "bg-tp-success-50 text-tp-success-600"
            : "text-tp-blue-500 hover:bg-tp-blue-50 active:bg-tp-blue-100",
          visibilityClass,
          className
        )}>
        {copied ? (
          <CopySuccess size={14} color="var(--tp-success-600)" variant="Bulk" />
        ) : (
          <CopyIcon size={14} color="var(--tp-blue-500)" variant={hovered ? "Bulk" : "Linear"} />
        )}
      </button>
    </HoverTooltip>
  );
}

// ─── Section icons for each Ophthal sub-section ──────────────────────────────

const ICON_COLOR = "var(--tp-slate-500)";

function VisualAcuityIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <g clipPath="url(#optal-va)">
        <path d="M20.95 4.13C20.66 3.71 20.29 3.34 19.87 3.05C18.92 2.36 17.68 2 16.19 2H7.81C7.61 2 7.41 2.01 7.22 2.03C3.94 2.24 2 4.37 2 7.81V16.19C2 17.68 2.36 18.92 3.05 19.87C3.34 20.29 3.71 20.66 4.13 20.95C4.95 21.55 5.99 21.9 7.22 21.98C7.41 21.99 7.61 22 7.81 22H16.19C19.83 22 22 19.83 22 16.19V7.81C22 6.32 21.64 5.08 20.95 4.13ZM11.39 15.88H8.52C8.11 15.88 7.77 15.54 7.77 15.13C7.77 14.72 8.11 14.38 8.52 14.38H9.52V7.91H6.95C6.84 7.91 6.75 8 6.75 8.11V8.89C6.75 9.3 6.41 9.63 6 9.63C5.59 9.63 5.25 9.3 5.25 8.88V8.1C5.25 7.16 6.01 6.4 6.95 6.4H13.59C14.53 6.4 15.29 7.16 15.29 8.1V8.88C15.29 9.29 14.95 9.63 14.54 9.63C14.13 9.63 13.79 9.29 13.79 8.88V8.1C13.79 7.99 13.7 7.9 13.59 7.9H11.02V14.38H11.39C11.8 14.38 12.14 14.72 12.14 15.13C12.14 15.54 11.8 15.88 11.39 15.88ZM18.75 12.23C18.75 12.64 18.41 12.98 18 12.98C17.59 12.98 17.25 12.64 17.25 12.23V11.9H15.7V16.1H16.05C16.46 16.1 16.8 16.44 16.8 16.85C16.8 17.26 16.46 17.6 16.05 17.6H13.85C13.44 17.6 13.1 17.26 13.1 16.85C13.1 16.44 13.44 16.1 13.85 16.1H14.2V11.9H13.72C13.31 11.9 12.97 11.56 12.97 11.15C12.97 10.74 13.31 10.4 13.72 10.4H17.32C18.11 10.4 18.75 11.04 18.75 11.83V12.23Z" fill={ICON_COLOR} />
      </g>
      <defs><clipPath id="optal-va"><rect width="24" height="24" fill="white" /></clipPath></defs>
    </svg>
  );
}

function SubjectiveRefractionIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <g clipPath="url(#optal-sr)">
        <path d="M15.42 9.16C15.42 10.07 15.06 10.95 14.41 11.59C13.77 12.24 12.89 12.6 11.98 12.6C11.07 12.6 10.19 12.24 9.55 11.59C8.9 10.94 8.54 10.07 8.54 9.16V6.65C8.54 6.55 8.57 6.46 8.61 6.37C8.66 6.28 8.73 6.21 8.81 6.16C8.89 6.11 8.99 6.08 9.08 6.07C9.18 6.07 9.27 6.09 9.36 6.13L11.98 7.44L14.59 6.13C14.68 6.09 14.77 6.07 14.87 6.07C14.97 6.07 15.06 6.1 15.14 6.16C15.22 6.21 15.29 6.28 15.34 6.37C15.39 6.46 15.41 6.55 15.41 6.65V9.16H15.42Z" fill={ICON_COLOR} />
        <path d="M11.98 13.35C10.86 13.35 9.81 12.91 9.02 12.12C8.23 11.33 7.79 10.28 7.79 9.16V6.65C7.79 6.43 7.85 6.21 7.95 6.01C8.06 5.81 8.22 5.65 8.41 5.53C8.59 5.41 8.81 5.34 9.04 5.33C9.27 5.33 9.49 5.36 9.7 5.46L11.99 6.6L14.27 5.46C14.48 5.36 14.7 5.31 14.93 5.32C15.16 5.33 15.38 5.4 15.57 5.52C15.76 5.64 15.91 5.8 16.02 6C16.13 6.2 16.19 6.42 16.19 6.64V9.15C16.19 10.27 15.75 11.32 14.96 12.11C14.18 12.89 13.1 13.34 12 13.34L11.98 13.35ZM9.28 6.94V9.17C9.28 9.89 9.56 10.56 10.07 11.07C11.08 12.08 12.87 12.08 13.87 11.07C14.38 10.56 14.66 9.89 14.66 9.17V6.94L12.31 8.12C12.1 8.23 11.85 8.23 11.64 8.12L9.28 6.94Z" fill={ICON_COLOR} />
        <path d="M11.98 17.94C11.57 17.94 11.23 17.6 11.23 17.19V12.6C11.23 12.19 11.57 11.85 11.98 11.85C12.39 11.85 12.73 12.19 12.73 12.6V17.19C12.73 17.6 12.39 17.94 11.98 17.94Z" fill={ICON_COLOR} />
        <path d="M6.99 13.11C9.63 13.93 10.64 14.92 11.98 17.19H10.6C7 17.19 6.69 14.47 6.99 13.11Z" fill={ICON_COLOR} />
        <path opacity="0.5" d="M16.96 13.11C14.32 13.93 13.31 14.92 11.97 17.19H13.35C16.95 17.19 17.26 14.47 16.96 13.11Z" fill={ICON_COLOR} />
        <g opacity="0.4">
          <path d="M18.49 6.16C18.3 6.16 18.11 6.09 17.96 5.94C17.67 5.65 17.67 5.17 17.96 4.88L21.37 1.47C21.66 1.18 22.14 1.18 22.43 1.47C22.72 1.76 22.72 2.24 22.43 2.53L19.02 5.94C18.87 6.09 18.68 6.16 18.49 6.16Z" fill={ICON_COLOR} />
          <path d="M5.6 6.25C5.41 6.25 5.22 6.18 5.07 6.03L1.57 2.53C1.28 2.24 1.28 1.76 1.57 1.47C1.86 1.18 2.34 1.18 2.63 1.47L6.13 4.97C6.42 5.26 6.42 5.74 6.13 6.03C5.98 6.18 5.79 6.25 5.6 6.25Z" fill={ICON_COLOR} />
          <path d="M21.9 22.75C21.71 22.75 21.52 22.68 21.37 22.53L17.83 18.99C17.54 18.7 17.54 18.22 17.83 17.93C18.12 17.64 18.6 17.64 18.89 17.93L22.43 21.47C22.72 21.76 22.72 22.24 22.43 22.53C22.28 22.68 22.09 22.75 21.9 22.75Z" fill={ICON_COLOR} />
          <path d="M2.1 22.75C1.91 22.75 1.72 22.68 1.57 22.53C1.28 22.24 1.28 21.76 1.57 21.47L5.09 17.95C5.38 17.66 5.86 17.66 6.15 17.95C6.44 18.24 6.44 18.72 6.15 19.01L2.63 22.53C2.48 22.68 2.29 22.75 2.1 22.75Z" fill={ICON_COLOR} />
          <path d="M5.6 6.25H2.54C2.13 6.25 1.79 5.91 1.79 5.5C1.79 5.09 2.13 4.75 2.54 4.75H4.85V2.44C4.85 2.03 5.19 1.69 5.6 1.69C6.01 1.69 6.35 2.03 6.35 2.44V5.5C6.35 5.91 6.01 6.25 5.6 6.25Z" fill={ICON_COLOR} />
          <path d="M5.62 22.29C5.21 22.29 4.87 21.95 4.87 21.54V19.23H2.56C2.15 19.23 1.81 18.89 1.81 18.48C1.81 18.07 2.15 17.73 2.56 17.73H5.62C6.03 17.73 6.37 18.07 6.37 18.48V21.54C6.37 21.95 6.03 22.29 5.62 22.29Z" fill={ICON_COLOR} />
          <path d="M18.36 22.27C17.95 22.27 17.61 21.93 17.61 21.52V18.46C17.61 18.05 17.95 17.71 18.36 17.71H21.42C21.83 17.71 22.17 18.05 22.17 18.46C22.17 18.87 21.83 19.21 21.42 19.21H19.11V21.52C19.11 21.93 18.77 22.27 18.36 22.27Z" fill={ICON_COLOR} />
          <path d="M21.55 6.16H18.49C18.08 6.16 17.74 5.82 17.74 5.41V2.35C17.74 1.94 18.08 1.6 18.49 1.6C18.9 1.6 19.24 1.94 19.24 2.35V4.66H21.55C21.96 4.66 22.3 5 22.3 5.41C22.3 5.82 21.96 6.16 21.55 6.16Z" fill={ICON_COLOR} />
        </g>
      </g>
      <defs><clipPath id="optal-sr"><rect width="24" height="24" fill="white" /></clipPath></defs>
    </svg>
  );
}

function LensmeterIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <path d="M7.43 11.76C7.63 11.99 7.84 12.19 8.04 12.38L7.4 13.25C7.15 13.58 7.22 14.05 7.55 14.3C7.88 14.54 8.35 14.47 8.6 14.14L9.23 13.3C9.46 13.44 9.71 13.58 9.97 13.72C10.41 13.96 10.87 13.81 11.14 13.68C11.43 13.53 11.71 13.29 11.93 13.01C12.66 12.12 13.27 11.34 13.86 10.55C14.41 9.81 14.94 9.06 15.54 8.18C15.74 7.88 15.88 7.56 15.94 7.23C15.996 6.94 16.01 6.48 15.68 6.12C14.86 5.23 14.18 4.71 13.11 4.14C12.68 3.91 12.23 4.05 11.96 4.18C11.67 4.33 11.4 4.56 11.17 4.84C9.75 6.57 8.82 7.85 7.57 9.68C7.37 9.98 7.22 10.31 7.16 10.63C7.1 10.92 7.09 11.4 7.43 11.76Z" fill={ICON_COLOR} />
      <g opacity="0.35">
        <path d="M14.68 2.16C14.35 1.9 13.88 1.96 13.63 2.29C13.37 2.62 13.43 3.09 13.76 3.34L16.22 5.24C16.55 5.49 17.02 5.43 17.27 5.1C17.52 4.77 17.46 4.3 17.14 4.05L14.68 2.16Z" fill={ICON_COLOR} />
        <path d="M2.75 20.5C2.34 20.5 2 20.84 2 21.25C2 21.66 2.34 22 2.75 22H21.25C21.66 22 22 21.66 22 21.25C22 20.84 21.66 20.5 21.25 20.5H18.65C18.99 20.02 19.39 19.42 19.76 18.75C20.23 17.9 20.68 16.93 20.94 15.93C21.2 14.94 21.28 13.86 20.93 12.87C20.38 11.31 18.84 10.14 17.54 9.38C17.2 9.18 16.86 8.997 16.54 8.84L16.53 8.85C15.92 9.75 15.38 10.52 14.82 11.27C14.73 11.39 14.63 11.52 14.54 11.64C15.36 12.16 16.14 12.81 16.47 13.46C16.74 14 16.76 14.68 16.55 15.49C16.33 16.29 15.91 17.14 15.42 17.94C14.93 18.72 14.39 19.43 13.97 19.93C13.78 20.17 13.61 20.36 13.48 20.5H2.75Z" fill={ICON_COLOR} />
      </g>
      <path d="M4.81 17.89C4.39 17.89 4.06 18.22 4.06 18.64C4.06 19.05 4.39 19.39 4.81 19.39H8.92C9.33 19.39 9.67 19.05 9.67 18.64C9.67 18.22 9.33 17.89 8.92 17.89H4.81Z" fill={ICON_COLOR} />
    </svg>
  );
}

function GlassPrescriptionIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <g clipPath="url(#optal-gp)">
        <path d="M13.19 16.29H10.81V17.71H13.19V16.29Z" fill={ICON_COLOR} />
        <path d="M7.95 2.71C7.95 3.11 7.63 3.43 7.24 3.43H6.29C4.58 3.43 3.19 4.82 3.19 6.52V12.4C2.34 12.83 1.76 13.71 1.76 14.73V6.52C1.76 4.03 3.79 2 6.29 2H7.24C7.63 2 7.95 2.32 7.95 2.71Z" fill={ICON_COLOR} />
        <path d="M22.24 6.52V14.73C22.24 13.71 21.66 12.83 20.81 12.4V6.52C20.81 4.82 19.42 3.43 17.71 3.43H16.76C16.37 3.43 16.05 3.11 16.05 2.71C16.05 2.32 16.37 2 16.76 2H17.71C20.21 2 22.24 4.03 22.24 6.52Z" fill={ICON_COLOR} />
        <path opacity="0.4" d="M10.81 14.73V19.38C10.81 20.83 9.63 22 8.19 22H4.38C2.94 22 1.76 20.83 1.76 19.38V14.73C1.76 13.71 2.34 12.83 3.19 12.4C3.55 12.21 3.95 12.11 4.38 12.11H8.19C9.63 12.11 10.81 13.28 10.81 14.73Z" fill={ICON_COLOR} />
        <path opacity="0.4" d="M22.24 14.73V19.38C22.24 20.83 21.06 22 19.62 22H15.81C14.37 22 13.19 20.83 13.19 19.38V14.73C13.19 13.28 14.37 12.11 15.81 12.11H19.62C20.05 12.11 20.45 12.21 20.81 12.4C21.66 12.83 22.24 13.71 22.24 14.73Z" fill={ICON_COLOR} />
      </g>
      <defs><clipPath id="optal-gp"><rect width="24" height="24" fill="white" /></clipPath></defs>
    </svg>
  );
}

function IOPIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <g clipPath="url(#optal-iop)">
        <path opacity="0.4" d="M12 21.75C17.38 21.75 21.75 17.38 21.75 12C21.75 6.62 17.38 2.25 12 2.25C6.62 2.25 2.25 6.62 2.25 12C2.25 17.38 6.62 21.75 12 21.75Z" fill={ICON_COLOR} />
        <path d="M15.25 17.35C15.06 17.35 14.87 17.28 14.72 17.13C13.27 15.68 10.73 15.68 9.28 17.13C8.99 17.42 8.51 17.42 8.22 17.13C7.93 16.84 7.93 16.36 8.22 16.07C9.23 15.06 10.57 14.5 12 14.5C13.43 14.5 14.77 15.06 15.78 16.07C16.07 16.36 16.07 16.84 15.78 17.13C15.63 17.27 15.44 17.35 15.25 17.35Z" fill={ICON_COLOR} />
      </g>
      <defs><clipPath id="optal-iop"><rect width="24" height="24" fill="white" /></clipPath></defs>
    </svg>
  );
}

function SlitLampIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <g clipPath="url(#optal-sl)">
        <path d="M16.42 7.95C18.86 10.39 18.86 14.35 16.42 16.79C13.98 19.23 10.02 19.23 7.58 16.79C5.14 14.35 5.14 10.39 7.58 7.95C10.02 5.51 13.98 5.51 16.42 7.95Z" fill={ICON_COLOR} />
        <path opacity="0.4" d="M8.25 22.39C8.16 22.39 8.06 22.37 7.97 22.34C5.72 21.44 3.9 19.85 2.68 17.75C1.5 15.7 1.03 13.38 1.34 11.02C1.39 10.61 1.78 10.32 2.18 10.37C2.59 10.42 2.88 10.8 2.83 11.21C2.57 13.23 2.97 15.23 3.98 16.99C5.02 18.79 6.59 20.16 8.52 20.93C8.9 21.09 9.09 21.52 8.94 21.91C8.83 22.21 8.54 22.39 8.25 22.39Z" fill={ICON_COLOR} />
        <path opacity="0.4" d="M5.85 5.23C5.63 5.23 5.41 5.13 5.26 4.94C5 4.61 5.06 4.14 5.39 3.89C7.3 2.4 9.58 1.61 12 1.61C14.36 1.61 16.61 2.37 18.5 3.81C18.83 4.06 18.89 4.53 18.64 4.86C18.39 5.19 17.92 5.25 17.59 5C15.97 3.76 14.04 3.11 12 3.11C9.92 3.11 7.95 3.79 6.31 5.07C6.17 5.18 6.01 5.23 5.85 5.23Z" fill={ICON_COLOR} />
        <path opacity="0.4" d="M15.75 22.39C15.45 22.39 15.17 22.21 15.05 21.92C14.9 21.54 15.08 21.1 15.47 20.94C17.4 20.16 18.97 18.8 20.01 17C21.03 15.24 21.43 13.24 21.16 11.22C21.11 10.81 21.4 10.43 21.81 10.38C22.21 10.33 22.6 10.62 22.65 11.03C22.95 13.38 22.49 15.71 21.31 17.76C20.1 19.86 18.27 21.44 16.02 22.35C15.94 22.37 15.85 22.39 15.75 22.39Z" fill={ICON_COLOR} />
      </g>
      <defs><clipPath id="optal-sl"><rect width="24" height="24" fill="white" /></clipPath></defs>
    </svg>
  );
}

function FundusIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <g clipPath="url(#optal-fu)">
        <path d="M18.65 4.59C16.89 2.99 14.56 2.03 12 2.03C6.5 2.03 2.03 6.5 2.03 12C2.03 17.5 6.5 21.97 12 21.97C14.56 21.97 16.89 21.01 18.65 19.41C20.69 17.6 21.97 14.94 21.97 12C21.97 9.06 20.69 6.4 18.65 4.59ZM11.97 16.39C11.95 18.04 10.72 18.44 9.57 17.98C7.2 17.03 5.53 14.71 5.53 12C5.53 9.29 7.2 6.97 9.57 6.01C10.72 5.55 11.95 5.96 11.97 7.6V16.39Z" fill={ICON_COLOR} />
      </g>
      <defs><clipPath id="optal-fu"><rect width="24" height="24" fill="white" /></clipPath></defs>
    </svg>
  );
}

// ─── Reusable rendering helpers — all label tones aligned with Obstetric ─────

/**
 * Inline `(LABEL: value, LABEL: value)` rendering. Labels use the
 * muted slate-500 (NO bold) and values use slate-700 with `font-medium`,
 * matching the InlineLabelledRow pattern from Obstetric so the
 * cross-section typography is one consistent voice.
 */
function InlineFields({ fields }) {
  const entries = Object.entries(fields).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return null;
  return (
    <span className="text-tp-slate-700">
      <span> (</span>
      {entries.map(([label, value], i) => (
        <span key={label}>
          {i > 0 ? <span>, </span> : null}
          <span className="text-tp-slate-500">{label}: </span>
          <span className="font-medium text-tp-slate-700">{value}</span>
        </span>
      ))}
      <span>)</span>
    </span>
  );
}

/** OD / OS row — eye prefix dark/semibold, fields in inline brackets. */
function EyeRow({ eye, fields }) {
  const label = Object.entries(fields ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return (
    <div className="group flex items-start gap-[6px] -mr-[6px]">
      <Bullet />
      <p className="flex-1 min-w-0 text-[14px] leading-[22px] text-tp-slate-700">
        <span className="font-semibold text-tp-slate-700">{eye}</span>
        <InlineFields fields={fields} />
      </p>
      <div className="shrink-0 self-start">
        <DummyCopyButton
          hint={`Copy ${eye} reading to RxPad`}
          toastMsg={`${eye} (${label}) copied to RxPad`}
          showOnHover
        />
      </div>
    </div>
  );
}

/** Two-eye block (OD + OS) used by every "left/right reading" group. */
function EyeRows({ eyes }) {
  return (
    <div className="flex flex-col gap-[8px]">
      {eyes?.OD ? <EyeRow eye="OD" fields={eyes.OD} /> : null}
      {eyes?.OS ? <EyeRow eye="OS" fields={eyes.OS} /> : null}
    </div>
  );
}

/** Examination-style group (slit lamp / fundus) — one bullet per anatomical part. */
function ExamRows({ items }) {
  return (
    <div className="flex flex-col gap-[8px]">
      {items.map((entry) => {
        const { name, ...fields } = entry;
        const label = Object.entries(fields)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        return (
          <div key={name} className="group flex items-start gap-[6px] -mr-[6px]">
            <Bullet />
            <p className="flex-1 min-w-0 text-[14px] leading-[22px] text-tp-slate-700">
              <span className="font-semibold text-tp-slate-700">{name}</span>
              <InlineFields fields={fields} />
            </p>
            <div className="shrink-0 self-start">
              <DummyCopyButton
                hint={`Copy ${name} to RxPad`}
                toastMsg={`${name} (${label}) copied to RxPad`}
                showOnHover
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Plain group card used for each Ophthal sub-section. Deliberately
 * NON-sticky — the date header on the parent OptalDateCard is the
 * only sticky element so the sub-section titles (Visual Acuity Test,
 * Subjective Refraction, etc.) scroll under the date band instead of
 * overlapping it. Visual treatment matches a SectionCard at rest:
 * slate-100 title bar + white body + slate-200 hairline border.
 */
function GroupCard({ id, title, icon, children, sectionLabelLower }) {
  return (
    <div key={id} className="group relative shrink-0 w-full flex flex-col">
      <div className="flex h-[30px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] bg-tp-slate-100/70 px-2 py-[3px] mb-[8px]">
        {icon ?? null}
        <span className="flex min-h-0 min-w-0 flex-1 items-center text-left text-[14px] font-semibold leading-none text-tp-slate-500">
          {title}
        </span>
        <DummyCopyButton
          hint={`Copy ${title} to RxPad`}
          toastMsg={`${title} copied to RxPad`}
          showOnHover={false}
        />
        <AiTriggerIcon
          tooltip={`Summarize ${sectionLabelLower}`}
          signalLabel={`Summarize ${sectionLabelLower}`}
          sectionId="optal"
          size={12}
          as="span"
        />
      </div>
      <div className="px-[2px]">{children}</div>
    </div>
  );
}

// ─── Date card (collapsible — matches Growth / Past Visits) ──────────────────

function OptalDateCard({ entry, expanded, onToggle }) {
  const { headerRef, isStuck } = useStickyHeaderState();

  return (
    <div className="group/date-card relative shrink-0 w-full" style={tpSectionCardStyle}>
      <button
        ref={headerRef}
        type="button"
        onClick={onToggle}
        className={clsx(
          "group bg-tp-slate-100 sticky top-0 z-[2] shrink-0 w-full text-left",
          expanded
            ? isStuck
              ? "rounded-tl-none rounded-tr-none"
              : "rounded-tl-[10px] rounded-tr-[10px]"
            : "rounded-[10px]"
        )}>
        <div className="flex items-center justify-between px-[10px] py-[8px] w-full">
          <div className="flex items-center gap-1.5">
            <span className="font-['Inter',sans-serif] font-semibold text-tp-slate-700 text-[14px] tracking-[0.012px] whitespace-nowrap leading-[20px]">
              {entry.dateLabel}
            </span>
            <DummyCopyButton
              hint={`Copy all ${entry.dateLabel} findings to RxPad`}
              toastMsg={`${entry.dateLabel} ophthal findings copied to RxPad`}
              showOnHover={false}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="opacity-0 transition-opacity group-hover/date-card:opacity-100 inline-flex items-center gap-1">
              <AiTriggerIcon
                tooltip={`Summarize ${entry.dateLabel} ophthal exam`}
                signalLabel={`Summarize ${entry.dateLabel} ophthalmology exam`}
                sectionId="optal"
                size={12}
                as="span"
              />
            </span>
            <div className="relative shrink-0 size-[18px]">
              {expanded ? (
                <ArrowSquareUp color="var(--tp-slate-500)" size={18} strokeWidth={1.5} variant="Linear" />
              ) : (
                <ArrowSquareDown color="var(--tp-slate-500)" size={18} strokeWidth={1.5} variant="Linear" />
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="bg-white rounded-bl-[10px] rounded-br-[10px] w-full px-[10px] py-[10px] flex flex-col gap-[14px]">

          {/* 1. Visual Acuity Test */}
          {(entry.visualAcuity?.OD || entry.visualAcuity?.OS) ? (
            <GroupCard
              id={`${entry.id}-va`}
              title="Visual Acuity Test"
              icon={<VisualAcuityIcon />}
              sectionLabelLower="visual acuity">
              <EyeRows eyes={entry.visualAcuity} />
            </GroupCard>
          ) : null}

          {/* 2. Subjective Refraction (Undilated / Dilated) */}
          {entry.subjectiveRefraction ? (
            <GroupCard
              id={`${entry.id}-sr`}
              title="Subjective Refraction"
              icon={<SubjectiveRefractionIcon />}
              sectionLabelLower="subjective refraction">
              <div className="flex flex-col gap-[10px]">
                {entry.subjectiveRefraction.Undilated ? (
                  <div className="flex flex-col gap-[8px]">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tp-slate-500">
                      Undilated
                    </p>
                    <EyeRows eyes={entry.subjectiveRefraction.Undilated} />
                  </div>
                ) : null}
                {entry.subjectiveRefraction.Dilated ? (
                  <div className="flex flex-col gap-[8px]">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tp-slate-500">
                      Dilated
                    </p>
                    <EyeRows eyes={entry.subjectiveRefraction.Dilated} />
                  </div>
                ) : null}
              </div>
            </GroupCard>
          ) : null}

          {/* 3. Lensmeter Values */}
          {(entry.lensmeter?.OD || entry.lensmeter?.OS) ? (
            <GroupCard
              id={`${entry.id}-lm`}
              title="Lensmeter Values"
              icon={<LensmeterIcon />}
              sectionLabelLower="lensmeter values">
              <EyeRows eyes={entry.lensmeter} />
            </GroupCard>
          ) : null}

          {/* 4. Glass Prescription (+ optional PD) */}
          {entry.glassPrescription ? (
            <GroupCard
              id={`${entry.id}-gp`}
              title="Glass Prescription"
              icon={<GlassPrescriptionIcon />}
              sectionLabelLower="glass prescription">
              <div className="flex flex-col gap-[8px]">
                {entry.glassPrescription.OD ? <EyeRow eye="OD" fields={entry.glassPrescription.OD} /> : null}
                {entry.glassPrescription.OS ? <EyeRow eye="OS" fields={entry.glassPrescription.OS} /> : null}
                {entry.glassPrescription.PD ? (
                  <div className="flex items-start gap-[6px]">
                    <Bullet />
                    <p className="flex-1 min-w-0 text-[14px] leading-[22px] text-tp-slate-700">
                      <span className="font-semibold text-tp-slate-700">PD</span>
                      <span className="text-tp-slate-700"> ({entry.glassPrescription.PD})</span>
                    </p>
                  </div>
                ) : null}
              </div>
            </GroupCard>
          ) : null}

          {/* 5. Intra Ocular Pressure */}
          {(entry.iop?.OD || entry.iop?.OS) ? (
            <GroupCard
              id={`${entry.id}-iop`}
              title="Intra Ocular Pressure"
              icon={<IOPIcon />}
              sectionLabelLower="intra ocular pressure">
              <EyeRows eyes={entry.iop} />
            </GroupCard>
          ) : null}

          {/* 6. Slit Lamp Examination */}
          {entry.slitLamp?.length ? (
            <GroupCard
              id={`${entry.id}-sl`}
              title="Slit Lamp Examination"
              icon={<SlitLampIcon />}
              sectionLabelLower="slit lamp examination">
              <ExamRows items={entry.slitLamp} />
            </GroupCard>
          ) : null}

          {/* 7. Fundus Examination */}
          {entry.fundus?.length ? (
            <GroupCard
              id={`${entry.id}-fu`}
              title="Fundus Examination"
              icon={<FundusIcon />}
              sectionLabelLower="fundus examination">
              <ExamRows items={entry.fundus} />
            </GroupCard>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Public ──────────────────────────────────────────────────────────────────

export function OptalContent() {
  const [expandedId, setExpandedId] = useState(OPTAL_ENTRIES[0]?.id);

  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <ActionButton label="Add/Edit Details" icon="plus" sectionId="optal" />
      <HistoricalNewDataBanner activeId="optal" />
      <div
        className="flex-[1_0_0] min-h-px min-w-px overflow-y-auto relative w-full"
        data-sticky-scroll-root="true">
        <div className="content-stretch flex flex-col gap-[12px] items-center p-[12px] relative w-full">
          {OPTAL_ENTRIES.map((entry) => (
            <OptalDateCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId((prev) => (prev === entry.id ? null : entry.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
