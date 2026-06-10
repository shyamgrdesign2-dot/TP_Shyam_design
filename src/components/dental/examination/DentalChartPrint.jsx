"use client";
// Print Dental Chart button + runner. Rendering is delegated to RxPreviewDocument
// so the printed sheet looks IDENTICAL to the on-screen Rx Preview drawer.
// Plain mode prints a blank odontogram on the letterhead; Historical mode prints
// the full Rx (clinical sections + tooth records + oral records + filled chart).

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TPTooltip, TPMedicalIcon } from "../tp-ui";
import { RxPreviewDocument } from "../tp-rxpad/RxPreviewDocument";
import { getComposedRxPreviewSnapshot } from "../tp-rxpad/rx-preview-composer";
import dcp from "./DentalChartPrint.module.scss";

// Print stylesheet: hide everything else and push each <article> from
// RxPreviewDocument onto its own A4 page so the printout matches the on-screen
// Rx Preview drawer 1:1.
const PRINT_STYLE = `
@media print {
  body > *:not(.dcp-print-root) { display: none !important; }
  .dcp-print-root { position: static !important; opacity: 1 !important; z-index: auto !important; width: 100% !important; pointer-events: auto !important; left: auto !important; top: auto !important; }
  .dcp-print-root > div { max-width: 100% !important; gap: 0 !important; }
  .dcp-print-root article { box-shadow: none !important; border-radius: 0 !important; aspect-ratio: auto !important; height: auto !important; min-height: 0 !important; break-after: page !important; page-break-after: always !important; overflow: visible !important; }
  .dcp-print-root article:last-child { break-after: auto !important; page-break-after: avoid !important; }
  @page { size: A4 portrait; margin: 10mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}`;

// Empty Rx snapshot shape — used by the "plain" mode so the printed page has
// only the dental chart (no historical/clinical sections) but still matches the
// Preview Rx letterhead + patient + footer pattern exactly.
function emptySnapshot(patientId) {
  return {
    patientId,
    updatedAt: new Date().toISOString(),
    symptoms: [], examinations: [], diagnoses: [], labInvestigations: [],
    medications: [], advice: [],
    vitals: [], labResults: [],
    dentalExamination: [],
  };
}

// Renders the Rx-preview document off-screen at A4 width and fires the system
// print dialog. The printed output mirrors the Preview Rx drawer; "historical"
// includes all dental + oral history sections above the chart, "plain" prints
// just the chart on the letterhead.
const BLANK_CHART = { updatedAt: 0, entries: [], toothDiagnoses: {}, findingsByTooth: {}, oralEntries: [], oralNotes: "" };

function PrintRunner({ patientId, mode, includePatient, onDone }) {
  useEffect(() => {
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    // Open the system print dialog as soon as the off-screen replica paints.
    const delay = mode === "historical" ? 400 : 80;
    const t = setTimeout(() => { try { window.print(); } catch {} }, delay);
    const fallback = setTimeout(onDone, 60000);
    return () => { clearTimeout(t); clearTimeout(fallback); window.removeEventListener("afterprint", after); };
  }, [onDone, mode]);
  // Historical: full Rx snapshot (clinical sections + dental + oral via chart store).
  // Plain: empty snapshot + blank chart override → only the letterhead + patient + odontogram.
  const isPlain = mode !== "historical";
  const snapshot = isPlain
    ? emptySnapshot(patientId)
    : (getComposedRxPreviewSnapshot(patientId) ?? emptySnapshot(patientId));
  const hidePatient = !includePatient;
  const settings = isPlain
    ? { view: "list", showDentalChart: true, chartOverride: BLANK_CHART, hideOral: true, hidePatient }
    : { view: "list", showDentalChart: true, hidePatient };
  return createPortal(
    <div className={`dcp-print-root ${dcp.printRoot}`}>
      <style>{PRINT_STYLE}</style>
      <RxPreviewDocument snapshot={snapshot} settings={settings} />
    </div>,
    document.body
  );
}

// Returns true if the patient has any chart data worth printing in "historical"
// mode — per-tooth diagnoses, treatment history entries, oral entries, or oral
// notes. Reads the same `dental.exam.chart.<patientId>` store the chart uses.
export function hasHistoricalData(patientId) {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(`dental.exam.chart.${patientId || "apt-1"}`);
    if (!raw) return false;
    const c = JSON.parse(raw) || {};
    if (Array.isArray(c.oralEntries) && c.oralEntries.length > 0) return true;
    if (typeof c.oralNotes === "string" && c.oralNotes.trim().length > 0) return true;
    if (Array.isArray(c.entries) && c.entries.length > 0) return true;
    if (c.toothDiagnoses && typeof c.toothDiagnoses === "object") {
      for (const v of Object.values(c.toothDiagnoses)) {
        if (Array.isArray(v) && v.length > 0) return true;
        if (v && typeof v === "object" && Object.keys(v).length > 0) return true;
      }
    }
    if (c.findingsByTooth && typeof c.findingsByTooth === "object") {
      for (const v of Object.values(c.findingsByTooth)) {
        if (Array.isArray(v) && v.length > 0) return true;
      }
    }
    if (c.treatmentHistoryByTooth && typeof c.treatmentHistoryByTooth === "object") {
      for (const v of Object.values(c.treatmentHistoryByTooth)) {
        if (v && typeof v === "object" && Object.keys(v).length > 0) return true;
      }
    }
    if (c.toothNotes && typeof c.toothNotes === "object") {
      for (const v of Object.values(c.toothNotes)) {
        if (typeof v === "string" && v.trim().length > 0) return true;
      }
    }
    if (Array.isArray(c.implantTeeth) && c.implantTeeth.length > 0) return true;
    return false;
  } catch { return false; }
}

export function DentalChartPrintButton({ patientId }) {
  const [open, setOpen] = useState(false);
  const [includePatient, setIncludePatient] = useState(true);
  const [printReq, setPrintReq] = useState(null);
  const [historicalAvailable, setHistoricalAvailable] = useState(false);
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    setHistoricalAvailable(hasHistoricalData(patientId));
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, patientId]);

  const choose = (mode) => {
    if (mode === "historical" && !historicalAvailable) return;
    setOpen(false);
    setPrintReq({ mode, includePatient });
  };

  const item = (icon, label, sub, mode, opts = {}) => {
    const { disabled = false, disabledReason = "" } = opts;
    const btn = (
      <button
        type="button"
        onClick={() => choose(mode)}
        disabled={disabled}
        className={dcp.menuItem}
      >
        <span className={dcp.menuItemIcon}>
          <TPMedicalIcon name={icon} variant="bulk" size={18} color="var(--tp-blue-500)" />
        </span>
        <span className={dcp.menuItemText}>
          <span className={dcp.menuItemLabel}>{label}</span>
          <span className={dcp.menuItemSub}>{sub}</span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={dcp.menuItemChevron}
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );

    if (disabled && disabledReason) {
      return (
        <TPTooltip title={disabledReason} arrow placement="left">
          <span className={dcp.tooltipWrap}>{btn}</span>
        </TPTooltip>
      );
    }
    return btn;
  };

  return (
    <div ref={rootRef} className={dcp.dropdownWrap}>
      {open && (
        <div className={dcp.dropdownPanel}>
          <div className={dcp.dropdownTitle}>Print</div>
          {item("tooth", "Plain dental chart", "Blank odontogram template", "plain")}
          {item("clipboard-activity", "Historical dental chart", "With recorded findings & history", "historical", { disabled: !historicalAvailable, disabledReason: "There is no historical data to print for this patient." })}
          <label className={dcp.includeLabel}>
            <input
              type="checkbox"
              checked={includePatient}
              onChange={(e) => setIncludePatient(e.target.checked)}
              className={dcp.checkboxInput}
            />
            <span className={dcp.includeLabelText}>Include patient information</span>
          </label>
        </div>
      )}
      <TPTooltip title="Print dental chart" arrow placement="top">
        <button type="button" aria-label="Print dental chart" onClick={() => setOpen((o) => !o)} className={dcp.printTriggerBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 9V3.5C6 3.22 6.22 3 6.5 3h11c.28 0 .5.22.5.5V9M6 18H4.5C3.67 18 3 17.33 3 16.5v-5C3 10.67 3.67 10 4.5 10h15c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5H18M7 15h10v5.5c0 .28-.22.5-.5.5h-9a.5.5 0 0 1-.5-.5V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </TPTooltip>
      {printReq && (
        <PrintRunner patientId={patientId} mode={printReq.mode} includePatient={printReq.includePatient} onDone={() => setPrintReq(null)} />
      )}
    </div>
  );
}
