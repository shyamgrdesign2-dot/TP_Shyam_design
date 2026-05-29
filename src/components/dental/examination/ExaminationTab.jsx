/**
 * ExaminationTab — side-by-side layout:
 *   Left: 3D dental canvas (SSR-safe dynamic import)
 *   Right: Context-aware panel —
 *     • Dentition view → Dental Score card + per-tooth examination summary
 *     • Single-tooth view → Tooth header (with Back arrow) + primary diagnosis
 *       section + surface examination section + general chip sections + Save footer
 *
 * Typography: 14px / 12px baseline; 10px only for tiny meta.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from
  "react";
import { createPortal } from "react-dom";
import {
  InfoCircle,
  Trash,
  Grid5,
  Ram,
  Eraser,
  Add,
  Calendar,
  SearchNormal1
} from
  "iconsax-reactjs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from
  "../ui/alert-dialog";
import { ExpandIcon } from "./ui-icons";
import { DentalCanvas } from "./DentalCanvas";
import {
  DIAGNOSES,
  TOOTH_DIAGNOSES,
  ZONE_INFO,
  ALL_ZONES,
  getZoneLabel,
  TEETH,
  PROCEDURE_CATALOG,
  QUADRANT_LABELS,
  getDefaultTreatmentSurfaces,
  ORAL_FINDINGS,
  ORAL_PROCEDURES,
  ORAL_POSITION_GROUPS,
  ORAL_POSITION_LABEL,
  oralPositionShort,
  reconcileOralPositions
} from "./types";
import { MiniToothCanvas } from "./MiniToothCanvas";
import { MiniScopeCanvas } from "./MiniScopeCanvas";
import { TPMedicalIcon, TPTooltip, TPCheckbox } from "../tp-ui";
import { saveDentalPreviewSnapshot } from "../tp-rxpad/rx-preview-store";
import { useDentalMasters } from "../../../hooks/useDentalMasters";
import { useDentalExamination } from "../lib/useDentalExamination";
import ex from "./ExaminationTab.module.scss";
import ui from "./ExaminationTab.ui.module.scss";
import { useBillingCatalog } from "../lib/useBillingCatalog";
import {
  getUniqueDentalBillItems,
  sortStringsForTypeahead
} from
  "../lib/billing-catalog";
import { AddDentalBillItemDrawer } from "../AddDentalBillItemDrawer";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
// Score weights per diagnosis/finding severity (out of 100).
const DIAG_WEIGHT = {
  Missing: 8,
  Implant: 2,
  RCT: 4,
  Crown: 2,
  Bridge: 3,
  Denture: 3
};
/** Accent colors per tooth-level diagnosis — makes each chip visually distinct */
const PRIMARY_DIAG_COLOR = {
  Implant: "#0891b2",
  // cyan
  Missing: "#dc2626",
  // red
  RCT: "#ea580c",
  // orange
  Crown: "#d4af37",
  // gold
  Bridge: "#a16207",
  // amber-brown
  Denture: "#ec4899",
  // pink
  Extraction: "#b91c1c",
  // dark red (similar to missing)
  "Composite Filling": "#f5f5f4",
  // off-white (filling material)
  Scaling: "#059669",
  // emerald
  Polishing: "#10b981",
  // green
  Veneer: "#e2e8f0",
  // light porcelain
  "Pulp Cap": "#f97316",
  // orange
  "Root Planing": "#0d9488",
  // teal
  "Fluoride Treatment": "#06b6d4" // cyan-light
};

const FINDING_WEIGHT = {
  "Cavity/Caries": 3,
  Crack: 2,
  Fracture: 4,
  Erosion: 2,
  Abrasion: 1,
  Attrition: 1,
  Staining: 0.5,
  Plaque: 0.5,
  Calculus: 1,
  "Restoration Defect": 2,
  NCCL: 1,
  Sensitivity: 1,
  Resorption: 3,
  Recession: 2,
  Normal: 0
};
function computeDentalScore(state) {
  if (!state)
    return {
      score: 100,
      rating: "Excellent",
      totalDeduction: 0,
      affectedTeeth: 0,
      breakdown: {
        diag: 0,
        findings: 0
      }
    };
  let diag = 0,
    findings = 0;
  const affected = new Set();
  for (const [fdi, diagSet] of Object.entries(state.toothDiagnoses)) {
    diagSet.forEach((d) => {
      diag += DIAG_WEIGHT[d] ?? 0;
      affected.add(fdi);
    });
  }
  state.implantTeeth.forEach((fdi) => {
    diag += DIAG_WEIGHT.Implant;
    affected.add(fdi);
  });
  for (const [fdi, findingsList] of Object.entries(state.findingsByTooth)) {
    findingsList.forEach((f) => {
      findings += FINDING_WEIGHT[f.type] ?? 0;
      affected.add(fdi);
    });
  }
  const totalDeduction = Math.min(100, Math.round(diag + findings));
  const score = Math.max(0, 100 - totalDeduction);
  const rating =
    score >= 90 ?
      "Excellent" :
      score >= 75 ?
        "Good" :
        score >= 60 ?
          "Fair" :
          score >= 40 ?
            "Needs attention" :
            "Poor";
  return {
    score,
    rating,
    totalDeduction,
    affectedTeeth: affected.size,
    breakdown: {
      diag: Math.round(diag),
      findings: Math.round(findings)
    }
  };
}
function toPreviewLine(title, metaParts) {
  return {
    title: title.trim(),
    metaParts: metaParts.map((part) => (part ?? "").trim()).filter(Boolean)
  };
}
function surfaceList(surfaces) {
  if (!surfaces.length) return "";
  return surfaces.
    map((surface) => ZONE_INFO[surface]?.label ?? surface).
    join(", ");
}
function toDentalPreviewSections(state) {
  const byTooth = new Map();
  const ensureTooth = (fdi) => {
    const existing = byTooth.get(fdi);
    if (existing) return existing;
    const tooth = TEETH.find((item) => item.fdi === fdi);
    const toothLabel = tooth ?
      `${QUADRANT_LABELS[tooth.quadrant]} ${tooth.name} (T${fdi})` :
      `Tooth (T${fdi})`;
    const next = {
      toothLabel,
      treatmentHistory: [],
      findings: [],
      procedures: []
    };
    byTooth.set(fdi, next);
    return next;
  };
  Object.entries(state.toothDiagnoses).forEach(([fdi, diagnoses]) => {
    if (!diagnoses.size) return;
    const block = ensureTooth(fdi);
    diagnoses.forEach((diagnosis) => {
      block.treatmentHistory.push(toPreviewLine(diagnosis, []));
    });
  });
  state.implantTeeth.forEach((fdi) => {
    const block = ensureTooth(fdi);
    const exists = block.treatmentHistory.some(
      (row) => row.title.toLowerCase() === "implant"
    );
    if (!exists) {
      block.treatmentHistory.push(toPreviewLine("Implant", []));
    }
  });
  Object.entries(state.findingsByTooth).forEach(([fdi, findings]) => {
    if (!findings.length) return;
    const block = ensureTooth(fdi);
    findings.forEach((finding) => {
      block.findings.push(
        toPreviewLine(finding.type, [
          ZONE_INFO[finding.zoneId]?.label,
          finding.notes]
        )
      );
    });
  });
  state.allEntries.forEach((entry) => {
    const block = ensureTooth(entry.toothFdi);
    const meta = [
      surfaceList(entry.surfaces),
      entry.since,
      entry.plannedDate,
      entry.status,
      entry.notes];


    if (entry.kind === "finding") {
      block.findings.push(toPreviewLine(entry.name, meta));
      return;
    }
    if (entry.kind === "procedure" || entry.kind === "planned") {
      block.procedures.push(toPreviewLine(entry.name, meta));
      return;
    }
    block.treatmentHistory.push(toPreviewLine(entry.name, meta));
  });
  return Array.from(byTooth.values()).filter(
    (section) =>
      section.treatmentHistory.length > 0 ||
      section.findings.length > 0 ||
      section.procedures.length > 0 ||
      Boolean(section.overallToothNote?.trim())
  );
}
export function ExaminationTab({ patientId, patientAge = 30 }) {
  const { syncState, toothState, version, loading, saveChart } = useDentalExamination(patientId);
  const [canvasState, setCanvasState] = useState(null);

  // Transform Redux state back to the structure DentalCanvas expects for initialization
  const initialCanvasData = useMemo(() => {
    if (!toothState || Object.keys(toothState).length === 0) return null;
    const out = {
      toothDiagnoses: {},
      implantTeeth: [],
      findingsByTooth: {},
      toothNotes: {},
      treatmentHistoryDetailsByTooth: {}
    };

    Object.entries(toothState).forEach(([fdi, data]) => {
      if (data.diagnoses) out.toothDiagnoses[fdi] = data.diagnoses;
      if (data.isImplant) out.implantTeeth.push(fdi);
      if (data.findings) out.findingsByTooth[fdi] = data.findings;
      if (data.notes) out.toothNotes[fdi] = data.notes;
      if (data.treatmentHistory) out.treatmentHistoryDetailsByTooth[fdi] = data.treatmentHistory;
    });
    return out;
  }, [toothState]);

  // Sync canvas state to Redux for global "End Visit" access
  useEffect(() => {
    if (!canvasState) return;

    const newToothState = {};

    // 1. Findings
    if (canvasState.findingsByTooth) {
      Object.entries(canvasState.findingsByTooth).forEach(([fdi, findings]) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].findings = findings;
      });
    }

    // 2. Diagnoses (Set -> Array for Redux)
    if (canvasState.toothDiagnoses) {
      Object.entries(canvasState.toothDiagnoses).forEach(([fdi, diags]) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].diagnoses = Array.from(diags);
      });
    }

    // 3. Implants
    if (canvasState.implantTeeth) {
      canvasState.implantTeeth.forEach((fdi) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].isImplant = true;
      });
    }

    // 4. Notes
    if (canvasState.toothNotes) {
      Object.entries(canvasState.toothNotes).forEach(([fdi, note]) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].notes = note;
      });
    }

    // 5. Treatment History
    if (canvasState.treatmentHistoryDetailsByTooth) {
      Object.entries(canvasState.treatmentHistoryDetailsByTooth).forEach(([fdi, history]) => {
        if (!newToothState[fdi]) newToothState[fdi] = {};
        newToothState[fdi].treatmentHistory = history;
      });
    }

    syncState({ toothState: newToothState, dentitionType: canvasState.patientType });
  }, [canvasState, syncState]);

  const isSingle = canvasState?.viewMode === "single-tooth";
  const isOral = canvasState?.viewMode === "oral";
  const containerRef = useRef(null);
  // Separate persisted widths for dentition vs single-tooth. Both draggable 40-60.
  // Defer localStorage read to useEffect so SSR + first client render match.
  // Default: dentition 35% (canvas takes 65%); single-tooth 65% content / 35% canvas.
  const [dentitionAsidePct, setDentitionAsidePct] = useState(35);
  const [singleAsidePct, setSingleAsidePct] = useState(65);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const defaultSingle = 65;
    setSingleAsidePct(defaultSingle);
    const d = parseFloat(
      window.localStorage.getItem("dental.aside.pct.dentition") ?? ""
    );
    if (Number.isFinite(d) && d >= 30 && d <= 40) setDentitionAsidePct(d);
    const s = parseFloat(
      window.localStorage.getItem("dental.aside.pct.single") ?? ""
    );
    if (Number.isFinite(s) && s >= 50 && s <= 70) setSingleAsidePct(s);
  }, []);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const x = e.clientX;
      const r = el.getBoundingClientRect();
      const [min, max] = isSingle ? [50, 70] : [30, 40];
      // Panel is on the RIGHT now → measure from right edge.
      const pct = Math.min(max, Math.max(min, (r.right - x) / r.width * 100));
      if (isSingle) setSingleAsidePct(pct); else
        setDentitionAsidePct(pct);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove, {
      passive: false
    });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, isSingle]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "dental.aside.pct.dentition",
        String(dentitionAsidePct)
      );
    }
  }, [dentitionAsidePct]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "dental.aside.pct.single",
        String(singleAsidePct)
      );
    }
  }, [singleAsidePct]);
  const asidePct = (isSingle || isOral) ? singleAsidePct : dentitionAsidePct;
  const canvasPct = 100 - asidePct;
  // version is set by fetchDentalExamination.fulfilled and reset to 0 on .pending.
  // It is NOT overwritten by syncWholeState (which only touches toothState), so it
  // reliably reflects whether the GET API returned saved examination data for this patient.
  const hasApiExaminationData = version > 0;
  const isGetStarted =
    !isSingle &&
    !isOral &&
    !!canvasState &&
    !hasApiExaminationData &&
    Object.values(canvasState.toothDiagnoses).every((s) => s.size === 0) &&
    canvasState.implantTeeth.size === 0 &&
    Object.values(canvasState.findingsByTooth).every((a) => a.length === 0) &&
    canvasState.allEntries.length === 0 &&
    !Object.values(canvasState.treatmentHistoryDetailsByTooth ?? {}).some(
      (d) => d && Object.keys(d).length > 0
    ) &&
    !Object.values(canvasState.toothNotes ?? {}).some(
      (n) => String(n ?? "").trim().length > 0
    );
  useEffect(() => {
    if (!canvasState) return;
    saveDentalPreviewSnapshot(patientId, {
      patientId,
      updatedAt: new Date().toISOString(),
      sections: toDentalPreviewSections(canvasState)
    });
  }, [canvasState, patientId]);
  const hideGetStarted = false;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
        Loading Dental Examination...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${ex.root} ${isGetStarted && !hideGetStarted ? ex.rootGap : ""
        }`}>

      <div
        className={ex.canvasShell}
        style={{
          width:
            isGetStarted && !hideGetStarted ?
              undefined :
              hideGetStarted ?
                "100%" :
                `${canvasPct}%`,
          minWidth: "320px",
          flex: isGetStarted ? "1" : "1 1 auto",
          transition: dragging ?
            "none" :
            "width 350ms ease-out, flex-basis 350ms ease-out"
        }}>

        <div
          className={ex.gridOverlay}
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15,23,42,0.025) 1px, transparent 1px)," +
              "linear-gradient(to bottom, rgba(15,23,42,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px"
          }} />


        <div
          className={ex.dotOverlay}
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(15,23,42,0.04) 0.6px, transparent 0.9px)",
            backgroundSize: "16px 16px"
          }} />


        <div
          className={ex.radialOverlay}
          style={{
            background:
              "radial-gradient(ellipse 55% 42% at 50% 38%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 55%, transparent 78%)"
          }} />


        <div className={ex.canvasInner}>
          <DentalCanvas
            patientId={patientId}
            patientAge={patientAge}
            initialData={initialCanvasData}
            onStateChange={setCanvasState} />

        </div>
      </div>
      {!isGetStarted && !hideGetStarted &&
        <button
          type="button"
          role="separator"
          aria-label="Resize panel"
          aria-orientation="vertical"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
          }}
          className={ex.resizeHandle}>

          <span className={ex.resizeHit} />
          <img
            src={"/assets/images/ui/drag-handle.svg"}
            alt=""
            draggable={false}
            className={ex.resizeIcon}
            style={{
              display: "block",
              width: "22px",
              height: "32px",
              maxWidth: "none",
              left: "-11px"
            }} />

        </button>}


      {!hideGetStarted &&
        <aside
          className={`${ex.aside} ${isGetStarted ? ex.asideStarted : ex.asideSplit
            }`}
          style={{
            width: isGetStarted ? "auto" : `${asidePct}%`,
            minWidth: isGetStarted ? undefined : (isSingle || isOral) ? "360px" : "320px",
            flex: isGetStarted ? "none" : "1 1 auto",
            transition: dragging ?
              "none" :
              "width 350ms ease-out, flex-basis 350ms ease-out"
          }}>

          <div
            className={ex.asideInner}
            style={{
              animation: (isSingle || isOral) ?
                "dentalCardExpand 380ms cubic-bezier(0.34, 1.2, 0.64, 1)" :
                "dentalCardCollapse 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              transformOrigin: "center top"
            }}>

            {isOral && canvasState ?
              <div className={ex.singleCol}>
                <div className={ex.singleCard}>
                  <OralExamPanel state={canvasState} />
                </div>
              </div> :
              isSingle && canvasState ?
              <div className={ex.singleCol}>
                <div className={ex.singleCard}>
                  <SingleToothPanel state={canvasState} onSave={saveChart} />
                </div>
              </div> :

              <div className={isGetStarted ? ex.scrollStarted : ex.scrollSplit}>
                <DentitionPanel state={canvasState} hasApiExaminationData={hasApiExaminationData} />
              </div>}

          </div>
          <style
            dangerouslySetInnerHTML={{
              __html: `
          @keyframes dentalCardExpand {
            0%   { opacity: 0; transform: scale(0.72) translateY(40px); }
            60%  { opacity: 1; }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes dentalCardCollapse {
            from { opacity: 0; transform: scale(1.04) translateY(-6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `
            }} />

        </aside>}

    </div>);

}
/** Truncate one chip segment; join with commas for tooth-record pills (Dr Agent + chart). */
const CHIP_SEGMENT_MAX = 22;
const CHIP_JOIN_MAX = 96;
function truncateChipSegment(s, max = CHIP_SEGMENT_MAX) {
  const t = String(s ?? "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}
function joinChipLabels(parts, maxTotal = CHIP_JOIN_MAX) {
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const seg = truncateChipSegment(p);
    if (!seg || seen.has(seg.toLowerCase())) continue;
    seen.add(seg.toLowerCase());
    out.push(seg);
  }
  let s = out.join(", ");
  if (s.length > maxTotal) s = `${s.slice(0, maxTotal - 1)}…`;
  return s;
}
/** Dedupe + trim part labels for dentition summary pills (full strings; truncation is CSS per segment). */
function uniquePartList(raw) {
  const seen = new Set();
  const out = [];
  for (const x of raw) {
    const t = String(x ?? "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
// ──────────────────────────────────────────────────────────────
// Dentition panel: Patient Dental Score + per-tooth summary
// Clicking any summary row → opens that tooth's single view.
// ──────────────────────────────────────────────────────────────
function DentitionPanel({ state, hasApiExaminationData = false }) {
  const summary = useMemo(() => {
    if (!state) return [];
    const map = new Map();
    const seed = (fdi) => {
      const ex = map.get(fdi);
      if (ex) return ex;
      const next = {
        fdi,
        diagnoses: [],
        findingsFullParts: [],
        procedureFullParts: []
      };
      map.set(fdi, next);
      return next;
    };
    for (const [fdi, diagSet] of Object.entries(state.toothDiagnoses)) {
      if (diagSet.size > 0) seed(fdi).diagnoses = [...diagSet];
    }
    state.implantTeeth.forEach((fdi) => {
      const e = seed(fdi);
      if (!e.diagnoses.includes("Implant")) e.diagnoses.push("Implant");
    });
    // Treatment history details (e.g. Crown stored without __dx__ marker from older saves)
    // must also surface in Tooth records, de-duped against toothDiagnoses entries.
    const historyByTooth = state.treatmentHistoryDetailsByTooth ?? {};
    for (const [fdi, histMap] of Object.entries(historyByTooth)) {
      if (!histMap || !Object.keys(histMap).length) continue;
      const row = seed(fdi);
      const existingLower = new Set(row.diagnoses.map((d) => d.toLowerCase()));
      for (const name of Object.keys(histMap)) {
        if (name && !existingLower.has(name.toLowerCase())) {
          row.diagnoses.push(name);
        }
      }
    }
    const findingsByTooth = state.findingsByTooth ?? {};
    for (const [fdi, list] of Object.entries(findingsByTooth)) {
      if (!list?.length) continue;
      const row = seed(fdi);
      for (const f of list) {
        const t = f.type?.trim();
        if (t) row.findingsFullParts.push(t);
      }
    }
    for (const e of state.allEntries) {
      const row = seed(e.toothFdi);
      if (e.kind === "finding") {
        const name = e.name?.trim();
        if (name) row.findingsFullParts.push(name);
      } else if (e.kind === "procedure" || e.kind === "planned") {
        const name = e.name?.trim();
        if (name) row.procedureFullParts.push(name);
      }
    }
    const notesByFdi = state.toothNotes ?? {};
    return Array.from(map.values()).
      map((e) => {
        const diagnosisParts = uniquePartList(e.diagnoses).sort((a, b) =>
          a.localeCompare(b)
        );
        const findingParts = uniquePartList(e.findingsFullParts);
        const procedureParts = uniquePartList(e.procedureFullParts);
        return {
          ...e,
          diagnosisParts,
          findingParts,
          procedureParts,
          findingsTitle: findingParts.length ?
            findingParts.join(", ") :
            undefined,
          procedureTitle: procedureParts.length ?
            procedureParts.join(", ") :
            undefined,
          historyTitle: diagnosisParts.length ?
            diagnosisParts.join(", ") :
            undefined
        };
      }).
      filter(
        (e) =>
          e.diagnosisParts.length > 0 ||
          e.findingParts.length > 0 ||
          e.procedureParts.length > 0 ||
          Boolean(notesByFdi[e.fdi]?.trim())
      ).
      sort((a, b) => a.fdi.localeCompare(b.fdi));
  }, [state]);
  const prevSummaryFdiRef = useRef(null);
  const isFirstSummaryRef = useRef(true);
  const [enterFdis, setEnterFdis] = useState(() => new Set());
  useEffect(() => {
    const curr = new Set(summary.map((s) => s.fdi));
    if (isFirstSummaryRef.current && curr.size > 0) {
      prevSummaryFdiRef.current = curr;
      isFirstSummaryRef.current = false;
      return;
    }
    const prev = prevSummaryFdiRef.current || new Set();
    const appeared = [...curr].filter((fdi) => !prev.has(fdi));
    prevSummaryFdiRef.current = curr;
    if (appeared.length === 0) return;
    setEnterFdis(new Set(appeared));
    const t = window.setTimeout(() => setEnterFdis(new Set()), 620);
    return () => window.clearTimeout(t);
  }, [summary]);
  const openTooth = (fdi) => {
    if (!state) return;
    const tooth = TEETH.find((t) => t.fdi === fdi);
    if (tooth) state.onSelectTooth(tooth);
  };
  const hasOral = Array.isArray(state?.oralEntries) && state.oralEntries.length > 0;
  return (
    <>
      {summary.length > 0 || hasOral ?
        <>
          {hasOral && <OralRecordsList state={state} />}
          {summary.length > 0 && (
            <>
              <div className={ui.recordsHeader}>
                <h3 className={ui.recordsTitle}>Tooth records</h3>
                <span className={ui.recordsBadge}>{summary.length}</span>
              </div>
              <div className={ui.recordsList}>
                {summary.length > 0 ? (
                  summary.map((entry) => {
                    const tooth = TEETH.find((t) => t.fdi === entry.fdi);
                    const toothName = tooth ?
                      `${QUADRANT_LABELS[tooth.quadrant]} ${tooth.name}` :
                      "";
                    // Determine thumbnail color by most-severe diagnosis
                    let crownColor = "#E8DDD5",
                      rootColor = "#C4AD97";
                    if (entry.diagnoses.includes("Missing")) {
                      crownColor = "#d1d5db";
                      rootColor = "#d1d5db";
                    } else if (
                      entry.diagnoses.includes("Crown") ||
                      entry.diagnoses.includes("Bridge")) {
                      crownColor = "#d1d5db";
                      rootColor = "#C4AD97";
                    } else if (entry.diagnoses.includes("RCT")) {
                      crownColor = "#f87171";
                      rootColor = "#C4AD97";
                    } else if (entry.diagnoses.includes("Implant")) {
                      crownColor = "#9ca3af";
                      rootColor = "#6B7280";
                    }
                    return (
                      <button
                        key={entry.fdi}
                        type="button"
                        onClick={() => openTooth(entry.fdi)}
                        onMouseEnter={() => state?.onSetHoveredTooth(entry.fdi)}
                        onMouseLeave={() => state?.onSetHoveredTooth(null)}
                        className={`${ui.toothRow} ${enterFdis.has(entry.fdi) ? ui.toothRowEnter : ""
                          } ${state?.agentApplyPulseFdis?.has(String(entry.fdi)) ?
                            ui.toothRowAgentPulse : ""
                          } ${state?.hoveredToothFdi === entry.fdi ? ui.toothRowActive : ""
                          }`}>

                        <div className={ui.toothRowHeader}>
                          <div className={ui.toothThumb}>
                            {tooth &&
                              <MiniToothCanvas
                                tooth={tooth}
                                size={52}
                                diagnoses={new Set(entry.diagnoses)}
                                isImplant={entry.diagnoses.includes("Implant")}
                                findings={state?.findingsByTooth?.[entry.fdi] ?? []} />}


                          </div>
                          <div className={ui.toothHeaderText}>
                            <span className={ui.toothName}>{toothName}</span>
                            <span className={ui.toothFdiBelow}>T{entry.fdi}</span>
                          </div>
                          <span className={ui.toothChevron} aria-hidden={true}>
                            <ExpandIcon size={17} />
                          </span>
                        </div>
                        <div className={ui.toothRowDivider} aria-hidden={true} />
                        <div className={ui.toothChips}>
                          {entry.diagnosisParts.length > 0 &&
                            <SummaryPillSegmented
                              icon="clipboard-activity"
                              parts={entry.diagnosisParts}
                              title={entry.historyTitle}
                              tone="violet" />}



                          {entry.findingParts.length > 0 &&
                            <SummaryPillSegmented
                              icon="diagnosis"
                              parts={entry.findingParts}
                              title={entry.findingsTitle}
                              tone="violet" />}



                          {entry.procedureParts.length > 0 &&
                            <SummaryPillSegmented
                              icon="surgical-scissors-02"
                              parts={entry.procedureParts}
                              title={entry.procedureTitle}
                              tone="violet" />}



                          {Boolean((state?.toothNotes ?? {})[entry.fdi]?.trim()) &&
                            <SummaryPill
                              icon="note-2"
                              label="Notes"
                              title={(state?.toothNotes ?? {})[entry.fdi]?.trim()}
                              tone="violet" />}


                        </div>
                      </button>);
                  })
                ) : (
                  <div className={ui.emptyPlaceholder}>
                    <p className={ui.emptyPlaceholderText}>
                      No active findings or procedures. Select a tooth from the 3D model to begin.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </> : (

      /* First-time user onboarding — polished educational panel */<div
            className={ui.onboardCol}>

            <div className={ui.onboardCard}>
              <div className={ui.onboardHead}>
                <div className={ui.onboardIcon}>
                  <TPMedicalIcon
                    name="health care"
                    variant="bulk"
                    size={18}
                    color="#ffffff" />

                </div>
                <div>
                  <h3 className={ui.onboardTitle}>Getting Started</h3>
                  <p className={ui.onboardSub}>4 quick steps — watch the video for details</p>
                </div>
              </div>
              <div className={ui.stepList}>
                {[
                  {
                    step: "1",
                    title: "Select tooth or Oral Exam",
                    desc: "Tap any tooth on the 3D model, or use the + Oral Examination CTA to start.",
                    icon: "tooth"
                  },
                  {
                    step: "2",
                    title: "Record findings",
                    desc: "Add past procedures, surface findings & planned procedures.",
                    icon: "diagnosis"
                  },
                  {
                    step: "3",
                    title: "Add notes",
                    desc: "Per-tooth notes or overall oral exam notes.",
                    icon: "surgical-scissors-02"
                  },
                  {
                    step: "4",
                    title: "Review & print",
                    desc: "Open Preview Rx or End Visit to print the chart.",
                    icon: "health-file-03"
                  }].
                  map((item, idx, arr) =>
                    <div className={ui.stepRow}>
                      <div className={ui.stepCol}>
                        <div className={ui.stepCircle}>
                          <TPMedicalIcon
                            name={item.icon}
                            variant="bulk"
                            size={16}
                            color="#8b5cf6" />

                        </div>
                      </div>
                      <div className={ui.stepCard}>
                        <div className={ui.stepCardInner}>
                          <p className={ui.stepCardTitle}>{item.title}</p>
                          <p className={ui.stepCardDesc}>{item.desc}</p>
                        </div>
                      </div>
                      {idx < arr.length - 1 &&
                        <div
                          className={ui.stepConnector}
                          style={{
                            left: 17,
                            top: "calc(50% + 17px)",
                            height: "calc(100% - 10px)",
                            width: 0,
                            borderLeft: "1.5px dashed #c4b5fd"
                          }} />}


                    </div>
                  )}
              </div>
              <div className={ui.tutorialWrap}>
                <img
                  src={"/assets/tutorial-dental-preview.png"}
                  alt="How Dental Works? \u2014 Watch tutorial"
                  className={ui.tutorialImg} />
                <div className={ui.tutorialOverlay} />
              </div>
            </div>
          </div>)}

    </>);

}
// ──────────────────────────────────────────────────────────────
// SummaryPill — compact chip with a TP medical icon + label
// ──────────────────────────────────────────────────────────────
function SummaryPill({ icon, label, tone, title }) {
  const tones = {
    violet: {
      pillTone: ui.pillViolet,
      colour: "var(--tp-violet-600)"
    },
    amber: {
      pillTone: ui.pillAmber,
      colour: "var(--tp-violet-700)"
    },
    blue: {
      pillTone: ui.pillBlue,
      colour: "var(--tp-blue-600)"
    },
    slate: {
      pillTone: ui.pillSlate,
      colour: "var(--tp-slate-600)"
    }
  };
  const t = tones[tone];
  const tip = title ?? label;
  return (
    <span className={`${ui.pill} ${t.pillTone}`} title={tip}>
      <TPMedicalIcon name={icon} variant="bulk" size={16} color={t.colour} />
      <span className={ui.pillLabelPlain}>{label}</span>
    </span>);

}
/** Tooth record chip: icon + each value truncated individually, separated by | (matches section icons). */
function SummaryPillSegmented({ icon, parts, tone, title }) {
  const tones = {
    violet: {
      pillTone: ui.pillViolet,
      colour: "var(--tp-violet-600)"
    },
    amber: {
      pillTone: ui.pillAmber,
      colour: "var(--tp-violet-700)"
    },
    blue: {
      pillTone: ui.pillBlue,
      colour: "var(--tp-blue-600)"
    },
    slate: {
      pillTone: ui.pillSlate,
      colour: "var(--tp-slate-600)"
    }
  };
  const t = tones[tone];
  const tip = title ?? parts.join(", ");
  if (!parts.length) return null;
  return (
    <span
      className={`${ui.pill} ${ui.pillSegmented} ${t.pillTone}`}
      title={tip}>
      <TPMedicalIcon
        name={icon}
        variant="bulk"
        size={16}
        color={t.colour}
        className={ui.pillIcon} />


      <span className={ui.pillSegments}>
        {parts.map((p, i) =>
          <React.Fragment>
            {i > 0 &&
              <span className={ui.pillSegmentSep} aria-hidden={true}>
                |
              </span>}


            <span className={ui.pillSegment} title={p}>
              {p}
            </span>
          </React.Fragment>
        )}
      </span>
    </span>);

}
// ──────────────────────────────────────────────────────────────
// ScoreCard — full-circle gauge w/ interior gradient disc + animated score
// ──────────────────────────────────────────────────────────────
function ScoreCard({ data, infoBtnRef, showFormula, setShowFormula }) {
  const { score, rating, affectedTeeth } = data;
  const zoneIdx =
    score >= 90 ? 4 : score >= 75 ? 3 : score >= 60 ? 2 : score >= 40 ? 1 : 0;
  // Original TP palette — red → orange → amber → violet → emerald.
  const colour = [
    {
      accent: "#EF4444",
      accentDark: "#B91C1C",
      tint: "#FFE4E6"
    },
    // Off Track — red
    {
      accent: "#F97316",
      accentDark: "#C2410C",
      tint: "#FFEDD5"
    },
    // Improving — orange
    {
      accent: "#F59E0B",
      accentDark: "#B45309",
      tint: "#FEF3C7"
    },
    // Good — amber
    {
      accent: "#8B5CF6",
      accentDark: "#6D28D9",
      tint: "#EDDFF7"
    },
    // Great — violet
    {
      accent: "#10B981",
      accentDark: "#047857",
      tint: "#D1FAE5"
    } // Superb — emerald
  ][zoneIdx];
  // Animate score from 0 → target on mount.
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  // Larger ring circumference for breathing space.
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const gapDeg = 28;
  const startA = 90 + gapDeg / 2;
  const sweepTotal = 360 - gapDeg;
  const progress = Math.max(0, Math.min(1, displayScore / 100));
  const endA = startA + sweepTotal * progress;
  const polar = (a, radius = r) => ({
    x: cx + radius * Math.cos(a * Math.PI / 180),
    y: cy + radius * Math.sin(a * Math.PI / 180)
  });
  const p0 = polar(startA);
  const pFull = polar(startA + sweepTotal);
  const pProg = polar(endA);
  const bgArc = `M ${p0.x} ${p0.y} A ${r} ${r} 0 1 1 ${pFull.x} ${pFull.y}`;
  const fgArc = `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${sweepTotal * progress > 180 ? 1 : 0} 1 ${pProg.x} ${pProg.y}`;
  const gid = `gauge-ring-${zoneIdx}`;
  const infoIconRef = useRef(null);
  const [iconAnchor, setIconAnchor] = useState(null);
  const openTooltip = () => {
    const r = infoIconRef.current?.getBoundingClientRect();
    if (!r) return;
    setIconAnchor({
      x: r.left + r.width / 2,
      y: r.bottom
    });
    setShowFormula(true);
  };
  const closeTooltip = () => {
    setShowFormula(false);
    setIconAnchor(null);
  };
  return (
    <div
      ref={infoBtnRef}
      className={ui.scoreCard}
      style={{
        background: `linear-gradient(140deg, ${colour.tint} 0%, ${colour.accent}2b 60%, ${colour.accent}4d 100%)`
      }}>

      <span
        className={ui.scoreRibbon}
        style={{
          background: "rgba(255,255,255,0.98)",
          color: colour.accentDark,
          borderBottomRightRadius: "14px",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)"
        }}>

        Dental score
      </span>
      {showFormula && iconAnchor &&
        <ScoreTooltip anchor={iconAnchor} data={data} />}


      <div className={ui.scoreSvgWrap}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colour.accent} stopOpacity="0.85" />
              <stop
                offset="100%"
                stopColor={colour.accentDark}
                stopOpacity="1" />

            </linearGradient>
          </defs>
          <path
            d={bgArc}
            stroke={colour.tint}
            strokeWidth={14}
            strokeLinecap="round"
            fill="none" />


          {progress > 0 &&
            <path
              d={fgArc}
              stroke={`url(#${gid})`}
              strokeWidth={14}
              strokeLinecap="round"
              fill="none" />}


        </svg>
        <div
          className={ui.scoreCenter}
          style={{
            gap: 4
          }}>

          <span
            className={ui.scoreHuge}
            style={{
              fontSize: 42,
              lineHeight: 1,
              color: colour.accentDark
            }}>

            {displayScore}
          </span>
          <span className={ui.scoreSub}>out of 100</span>
          <span
            ref={infoIconRef}
            onMouseEnter={openTooltip}
            onMouseLeave={closeTooltip}
            onClick={openTooltip}
            className={ui.scoreRatingBtn}
            style={{
              background: `linear-gradient(135deg, ${colour.tint} 0%, ${colour.accent}22 100%)`,
              color: colour.accentDark,
              border: `1px solid ${colour.accent}33`,
              letterSpacing: "0.6px"
            }}>

            {rating.toUpperCase()}
            <InfoCircle size={14} color="currentColor" variant="Linear" />
          </span>
        </div>
      </div>
    </div>);

}
function ScoreTooltip({ anchor, data }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  // Compact black tooltip, anchored below the info icon, arrow points up to icon.
  const TOOLTIP_W = 220;
  const TOOLTIP_H_ESTIMATE = 110;
  const pad = 12;
  const ARROW = 6;
  let placeBelow = true;
  let left = anchor.x - TOOLTIP_W / 2;
  let top = anchor.y + ARROW + 4;
  if (typeof window !== "undefined") {
    if (top + TOOLTIP_H_ESTIMATE + pad > window.innerHeight) {
      placeBelow = false;
      top = anchor.y - TOOLTIP_H_ESTIMATE - ARROW - 4;
    }
    if (left + TOOLTIP_W + pad > window.innerWidth)
      left = window.innerWidth - TOOLTIP_W - pad;
    if (left < pad) left = pad;
  }
  const arrowX =
    Math.max(12, Math.min(TOOLTIP_W - 12, anchor.x - left)) - ARROW;
  return createPortal(
    <div
      className={ui.tooltipRoot}
      style={{
        top,
        left
      }}>

      {placeBelow &&
        <div
          style={{
            position: "absolute",
            top: -ARROW,
            left: arrowX,
            width: 0,
            height: 0,
            borderLeft: `${ARROW}px solid transparent`,
            borderRight: `${ARROW}px solid transparent`,
            borderBottom: `${ARROW}px solid #0f172a`
          }} />}



      <div
        className={ui.tooltipPanel}
        style={{
          background: "#0f172a",
          color: "#ffffff"
        }}>

        <p className={ui.tooltipTitle}>How this is calculated</p>
        <p className={ui.tooltipLead}>
          Starts at 100, decreases with diagnoses & findings.
        </p>
        <div className={ui.tooltipStack}>
          <TooltipRow label="Diagnoses" value={data.breakdown.diag} />
          <TooltipRow label="Findings" value={data.breakdown.findings} />
        </div>
        <div className={ui.tooltipFooter}>
          <span className={ui.tooltipFooterMuted}>Total deducted</span>
          <span className={ui.tooltipFooterVal}>−{data.totalDeduction}</span>
        </div>
      </div>
      {!placeBelow &&
        <div
          style={{
            position: "absolute",
            bottom: -ARROW,
            left: arrowX,
            width: 0,
            height: 0,
            borderLeft: `${ARROW}px solid transparent`,
            borderRight: `${ARROW}px solid transparent`,
            borderTop: `${ARROW}px solid #0f172a`
          }} />}


    </div>,
    document.body
  );
}
function TooltipRow({ label, value }) {
  return (
    <div className={ui.tooltipRow}>
      <span className={ui.tooltipRowLabel}>{label}</span>
      <span className={ui.tooltipRowVal}>−{value}</span>
    </div>);

}
const ARCH_SCOPE_BADGE = {
  RIGHT_ARCH: "R arch",
  LEFT_ARCH: "L arch",
  UPPER_ARCH: "Maxillary",
  LOWER_ARCH: "Mandibular"
};
function SingleToothPanel({ state, onSave }) {
  const isGroupedScope =
    state.selectionScopeType === "quadrant" ||
    state.selectionScopeType === "full-mouth" ||
    state.selectionScopeType === "arch";
  const entityLabel = isGroupedScope ?
    state.selectionScopeLabel || "Selected Scope" :
    `${QUADRANT_LABELS[state.selectedTooth.quadrant]} ${state.selectedTooth.name}`;
  const entityBadge = isGroupedScope ?
    state.selectionScopeType === "full-mouth" ?
      "FULL" :
      state.selectionScopeType === "arch" ?
        ARCH_SCOPE_BADGE[state.selectionScopeId] ?? state.selectionScopeId :
        state.selectionScopeId || "Q" :
    `T${state.selectedTooth.fdi}`;
  const [activeSection, setActiveSection] = useState("procedures");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const tryBack = () => state.onBackToDentition();
  const sectionRefs = useRef({
    procedures: null,
    findings: null,
    planned: null,
    notes: null
  });
  const clearAllToothData = () => {
    // Clear all diagnoses
    state.currentToothDiagnoses.forEach((d) => state.onToggleToothDiagnosis(d));
    // Clear implant
    if (state.isImplant) state.onToggleImplant();
    // Clear treatment-history table rows (incl. Dr Agent / voice merges)
    state.onClearTreatmentHistoryDetails?.();
    // Clear all entries (findings, procedures, planned)
    state.currentToothEntries.forEach((e) => state.onRemoveEntry(e.id));
    // Clear notes
    state.onUpdateToothNotes("");
    setShowClearConfirm(false);
  };
  const treatmentDetailCount = Object.keys(
    state.currentTreatmentHistoryDetails ?? {}
  ).length;
  const hasAnyData =
    state.currentToothDiagnoses.size > 0 ||
    state.isImplant ||
    state.currentToothEntries.length > 0 ||
    state.currentToothNotes.trim().length > 0 ||
    treatmentDetailCount > 0;
  const findingCount = state.currentToothEntries.filter(
    (e) => e.kind === "finding"
  ).length;
  const procedureCount = state.currentToothEntries.filter(
    (e) => e.kind === "procedure"
  ).length;
  const plannedCount = state.currentToothEntries.filter(
    (e) => e.kind === "planned"
  ).length;
  const diagnosisCount =
    state.currentToothDiagnoses.size + (state.isImplant ? 1 : 0);
  // Dental charting sections — standard clinical workflow order
  const sections = [
    {
      id: "procedures",
      label: "Past Procedures",
      icon: "clipboard-activity",
      count: diagnosisCount + procedureCount
    },
    {
      id: "findings",
      label: "Findings",
      icon: "diagnosis",
      count: findingCount
    },
    {
      id: "planned",
      label: "Procedures",
      icon: "surgical-scissors-02",
      count: plannedCount
    },
    {
      id: "notes",
      label: isGroupedScope ? "Overall Group Notes" : "Overall Tooth Notes",
      icon: "note-2"
    }];


  const jumpTo = (id) => {
    // Toggle: collapse if already active, otherwise expand
    if (activeSection === id) {
      setActiveSection(null);
      return;
    }
    setActiveSection(id);
    // Delay scroll until the accordion has expanded so we scroll to the expanded height.
    requestAnimationFrame(() => {
      sectionRefs.current[id]?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  };
  return (
    <div className={ui.panelRoot}>
      <header className={ui.panelHeader}>
        <div className={ui.panelHeaderRow}>
          <div className={ui.panelHeaderLeft}>
            <div className={ui.panelThumb}>
              {isGroupedScope ?
                <MiniScopeCanvas
                  patientType={state.patientType ?? "adult"}
                  scopeType={
                    state.selectionScopeType === "full-mouth" ?
                      "full-mouth" :
                      state.selectionScopeType === "arch" ?
                        "arch" :
                        "quadrant"}

                  fdis={state.selectionScopeFdis ?? []}
                  toothDiagnoses={state.toothDiagnoses}
                  findingsByTooth={state.findingsByTooth}
                  implantTeeth={state.implantTeeth}
                  size={40} /> :


                <MiniToothCanvas
                  tooth={state.selectedTooth}
                  size={40}
                  diagnoses={state.currentToothDiagnoses}
                  isImplant={state.isImplant}
                  findings={state.findings} />}


            </div>
            <div className={ui.panelTitleBlock}>
              <div className={ui.panelTitleRow}>
                <h3 className={ui.panelTitle}>{entityLabel}</h3>
                <span className={ui.panelBadge}>{entityBadge}</span>
              </div>
            </div>
          </div>
          <div className={ui.panelHeaderActions}>
            <button type="button" className={ui.panelIconBtn} title="Template">
              <Grid5
                color="currentColor"
                size={16}
                strokeWidth={1.5}
                variant="Linear" />

            </button>
            <button type="button" className={ui.panelIconBtn} title="Save" onClick={onSave}>
              <Ram
                color="currentColor"
                size={16}
                strokeWidth={1.5}
                variant="Linear" />

            </button>
            <AlertDialog
              open={showClearConfirm}
              onOpenChange={setShowClearConfirm}>

              <AlertDialogTrigger asChild={true}>
                <button
                  type="button"
                  title="Clear all data for this tooth"
                  disabled={!hasAnyData}
                  className={ui.panelIconBtnDanger}>

                  <Eraser
                    color="currentColor"
                    size={16}
                    strokeWidth={1.5}
                    variant="Linear" />

                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className={ui.clearDialogContent}>
                <AlertDialogHeader>
                  <div className={ui.clearDialogTitleRow}>
                    <div className={ui.clearDialogIcon}>
                      <Trash color="#ef4444" size={18} variant="Bulk" />
                    </div>
                    <AlertDialogTitle className={ui.clearDialogTitle}>
                      Clear all data?
                    </AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className={ui.clearDialogDesc}>
                    This will remove all treatment history, findings,
                    procedures, and notes for{" "}
                    <span className={ui.clearDialogStrong}>
                      {entityLabel} ({entityBadge})
                    </span>
                    . This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={ui.clearDialogFooter}>
                  <AlertDialogCancel className={ui.clearDialogCancel}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAllToothData}
                    className={ui.clearDialogAction}>

                    Clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className={ui.panelDivider} />
            <button
              type="button"
              onClick={tryBack}
              className={ui.panelCloseBtn}
              title="Close panel">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 256 256">

                <rect width="256" height="256" fill="none" />
                <polyline
                  points="192 104 152 104 152 64"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16" />


                <line
                  x1="208"
                  y1="48"
                  x2="152"
                  y2="104"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16" />


                <polyline
                  points="64 152 104 152 104 192"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16" />


                <line
                  x1="48"
                  y1="208"
                  x2="104"
                  y2="152"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16" />


                <polyline
                  points="152 192 152 152 192 152"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16" />


                <line
                  x1="208"
                  y1="208"
                  x2="152"
                  y2="152"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16" />


                <polyline
                  points="104 64 104 104 64 104"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16" />


                <line
                  x1="48"
                  y1="48"
                  x2="104"
                  y2="104"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="16" />

              </svg>
            </button>
          </div>
        </div>
      </header>
      <div className={ui.panelBody}>
        <div
          ref={(el) => {
            sectionRefs.current.procedures = el;
          }}>

          <AccordionWrap
            open={activeSection === "procedures"}
            onExpand={() => jumpTo("procedures")}
            header={
              <SectionHeader
                title="Treatment History"
                count={diagnosisCount + procedureCount}
                medicalIcon="clipboard-activity"
                onTemplate={
                  activeSection === "procedures" ? () => { } : undefined}

                onSave={activeSection === "procedures" ? () => { } : undefined}
                onClear={
                  activeSection === "procedures" ?
                    () => {
                      state.currentToothDiagnoses.forEach((d) =>
                        state.onToggleToothDiagnosis(d)
                      );
                      if (state.isImplant) state.onToggleImplant();
                      state.currentToothEntries.
                        filter((e) => e.kind === "procedure").
                        forEach((e) => state.onRemoveEntry(e.id));
                      state.onClearTreatmentHistoryDetails?.();
                    } :
                    undefined}

                clearDisabled={
                  diagnosisCount === 0 &&
                  procedureCount === 0 &&
                  treatmentDetailCount === 0}

                chevron={activeSection === "procedures" ? "up" : "down"}
                onClick={() => jumpTo("procedures")}
                onChevronClick={() => jumpTo("procedures")} />}>



            <PrimaryDiagnosisBody state={state} />
          </AccordionWrap>
        </div>
        <div
          ref={(el) => {
            sectionRefs.current.findings = el;
          }}>

          <AccordionWrap
            open={activeSection === "findings"}
            onExpand={() => jumpTo("findings")}
            header={
              <SectionHeader
                title="Findings"
                count={findingCount}
                medicalIcon="diagnosis"
                onTemplate={activeSection === "findings" ? () => { } : undefined}
                onSave={activeSection === "findings" ? () => { } : undefined}
                onClear={
                  activeSection === "findings" ?
                    () => {
                      state.currentToothEntries.
                        filter((e) => e.kind === "finding").
                        forEach((e) => state.onRemoveEntry(e.id));
                    } :
                    undefined}

                clearDisabled={findingCount === 0}
                chevron={activeSection === "findings" ? "up" : "down"}
                onClick={() => jumpTo("findings")}
                onChevronClick={() => jumpTo("findings")} />}>



            <EntryTab state={state} kind="finding" />
          </AccordionWrap>
        </div>
        <div
          ref={(el) => {
            sectionRefs.current.planned = el;
          }}>

          <AccordionWrap
            open={activeSection === "planned"}
            onExpand={() => jumpTo("planned")}
            header={
              <SectionHeader
                title="Procedures"
                count={plannedCount}
                medicalIcon="surgical-scissors-02"
                onTemplate={activeSection === "planned" ? () => { } : undefined}
                onSave={activeSection === "planned" ? () => { } : undefined}
                onClear={
                  activeSection === "planned" ?
                    () => {
                      state.currentToothEntries.
                        filter((e) => e.kind === "planned").
                        forEach((e) => state.onRemoveEntry(e.id));
                    } :
                    undefined}

                clearDisabled={plannedCount === 0}
                chevron={activeSection === "planned" ? "up" : "down"}
                onClick={() => jumpTo("planned")}
                onChevronClick={() => jumpTo("planned")} />}>



            <EntryTab state={state} kind="planned" />
          </AccordionWrap>
        </div>
        <div
          ref={(el) => {
            sectionRefs.current.notes = el;
          }}>

          <AccordionWrap
            open={activeSection === "notes"}
            onExpand={() => jumpTo("notes")}
            header={
              <SectionHeader
                title={
                  isGroupedScope ? "Overall Group Notes" : "Overall Tooth Notes"}

                medicalIcon="note-2"
                onTemplate={activeSection === "notes" ? () => { } : undefined}
                onSave={activeSection === "notes" ? () => { } : undefined}
                onClear={
                  activeSection === "notes" ?
                    () => state.onUpdateToothNotes("") :
                    undefined}

                chevron={activeSection === "notes" ? "up" : "down"}
                onClick={() => jumpTo("notes")}
                onChevronClick={() => jumpTo("notes")} />}>



            <div className={ui.notesPad}>
              <textarea
                value={state.currentToothNotes}
                onChange={(e) => state.onUpdateToothNotes(e.target.value)}
                placeholder={
                  isGroupedScope ?
                    "General notes for this selected group…" :
                    "General notes for this tooth…"}

                className={ui.notesArea} />

            </div>
          </AccordionWrap>
        </div>
      </div>
    </div>);

}
// ──────────────────────────────────────────────────────────────
// AccordionWrap — rounded card with animated expand/collapse.
// Uses a measured height transition so content visibly slides open/shut.
// ──────────────────────────────────────────────────────────────
function AccordionWrap({ open, header, children, onExpand }) {
  return (
    <div
      className={`${ui.accordion} ${open ? ui.accordionOpen : ui.accordionClosed
        }`}
      onClick={open ? undefined : onExpand}>

      <div className={ui.accordionHeaderSlot}>{header}</div>
      <div
        className={ui.accordionGrid}
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          flex: open ? "1 1 0%" : "0 0 0px"
        }}>

        <div className={ui.accordionGridInner}>{children}</div>
      </div>
    </div>);

}
// ──────────────────────────────────────────────────────────────
// SectionHeader — TP medical icon + title + count + Template/Save/Clear
// Matches RxPad section header styling.
// ──────────────────────────────────────────────────────────────
function SectionHeader({
  title,
  count,
  medicalIcon,
  onTemplate,
  onSave,
  onClear,
  clearDisabled,
  onClick,
  chevron,
  onChevronClick
}) {
  const stop = (e) => e.stopPropagation();
  const titleWithCount =
    typeof count === "number" ? `${title} (${count})` : title;
  return (
    <header
      onClick={onClick}
      className={`${ui.secHead} ${onClick ? ui.secHeadClick : ""}`}>

      {medicalIcon &&
        <span className={ui.secIcon}>
          <TPMedicalIcon
            name={medicalIcon}
            variant="bulk"
            size={22}
            color="var(--tp-violet-500)" />

        </span>}


      <h4 className={ui.secTitle}>{titleWithCount}</h4>
      <div className={ui.secGrow} />
      <div className={ui.secActions} onClick={stop}>
        {onTemplate &&
          <button
            type="button"
            title="Templates"
            onClick={onTemplate}
            className={ui.secToolBtn}>

            <Grid5
              color="currentColor"
              size={16}
              strokeWidth={1.5}
              variant="Linear" />

          </button>}


        {onSave &&
          <button
            type="button"
            title="Save as template"
            onClick={onSave}
            className={ui.secToolBtn}>

            <Ram
              color="currentColor"
              size={16}
              strokeWidth={1.5}
              variant="Linear" />

          </button>}


        {onClear &&
          <button
            type="button"
            title="Clear"
            onClick={onClear}
            disabled={clearDisabled}
            className={ui.secToolBtn}>

            <Eraser
              color="currentColor"
              size={16}
              strokeWidth={1.5}
              variant="Linear" />

          </button>}


        {chevron &&
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChevronClick?.() ?? onClick?.();
            }}
            className={ui.secChevronBtn}>

            {chevron === "up" ?
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19.92 15.05L13.4 8.53c-.77-.77-2.03-.77-2.8 0l-6.52 6.52"
                  stroke="#334155"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10" />

              </svg> :

              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19.92 8.95L13.4 15.47c-.77.77-2.03.77-2.8 0L4.08 8.95"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10" />

              </svg>}

          </button>}

      </div>
    </header>);

}
// ──────────────────────────────────────────────────────────────
// EntryTab — shared builder + table for Findings and Procedures
// ──────────────────────────────────────────────────────────────
function EntryTab({ state, kind }) {
  const { activeSurfaceFindings, activeProcedures, activeSurfaces } = useDentalMasters();
  const [activeCell, setActiveCell] = useState(null);
  const [query, setQuery] = useState("");
  const { items: billingItems } = useBillingCatalog();
  const [plannedCustomOpen, setPlannedCustomOpen] = useState(false);
  const [plannedCustomInitial, setPlannedCustomInitial] = useState("");
  // Portal Dropdown Search States
  const [searchOpen, setSearchOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const searchInputRef = useRef(null);
  const searchPopoverRef = useRef(null);
  useEffect(() => {
    if (!searchOpen) {
      setPos(null);
      return;
    }
    const reposition = () => {
      const el = searchInputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: r.width
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [searchOpen, query]);
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target) &&
        searchPopoverRef.current &&
        !searchPopoverRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  const isMissing =
    state.currentToothDiagnoses.has("Missing") ||
    state.currentToothDiagnoses.has("Extraction");
  const isGroupedScope =
    state.selectionScopeType === "quadrant" ||
    state.selectionScopeType === "full-mouth" ||
    state.selectionScopeType === "arch";
  const groupedFindingCatalog = [
    "Generalized plaque accumulation",
    "Generalized gingival inflammation",
    "Quadrant-level calculus",
    "Generalized recession",
    "Generalized bleeding on probing",
    "Widespread sensitivity"];


  const groupedProcedureCatalog = [
    "Quadrant scaling and root planing",
    "Full-arch scaling and root planing",
    "Full-mouth scaling and polishing",
    "Oral prophylaxis",
    "Fluoride varnish (full arch)",
    "Desensitization therapy (quadrant)",
    "Periodontal maintenance"];


  const dentalProcedureNames = useMemo(() => {
    const unique = getUniqueDentalBillItems(billingItems);
    return sortStringsForTypeahead(
      unique.map((i) => i.name),
      ""
    );
  }, [billingItems]);
  const catalog =
    kind === "finding" ?
      isGroupedScope ?
        groupedFindingCatalog :
        activeSurfaceFindings :
      kind === "symptom" ?
        DENTAL_SYMPTOM_CATALOG :
        kind === "planned" ?
          dentalProcedureNames :
          kind === "procedure" ?
            isGroupedScope ?
              groupedProcedureCatalog :
              activeProcedures :
            activeProcedures;
  const entries = state.currentToothEntries.filter((e) => e.kind === kind);
  const activeSurfaceRowId =
    activeCell?.colKey === "surfaces" ? activeCell.rowId : null;
  const activeRow = entries.find((e) => e.id === activeSurfaceRowId) ?? null;
  const setCellActive = useCallback((rowId, colKey) => {
    setActiveCell({
      rowId,
      colKey
    });
  }, []);
  const clearCellActive = useCallback((rowId, colKey) => {
    window.setTimeout(() => {
      setActiveCell((current) =>
        current && current.rowId === rowId && current.colKey === colKey ?
          null :
          current
      );
    }, 80);
  }, []);
  const isCellActive = useCallback(
    (rowId, colKey) =>
      activeCell?.rowId === rowId && activeCell?.colKey === colKey,
    [activeCell]
  );
  // Push multiSelectZones → active row.
  useEffect(() => {
    if (!activeRow) return;
    const zonesFromCanvas = Array.from(state.multiSelectZones);
    const same =
      zonesFromCanvas.length === activeRow.surfaces.length &&
      zonesFromCanvas.every((z) => activeRow.surfaces.includes(z));
    if (!same)
      state.onUpdateEntry(activeRow.id, {
        surfaces: zonesFromCanvas
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.multiSelectZones, activeSurfaceRowId]);
  // Seed multiSelectZones when active row changes + toggle multi-select mode.
  useEffect(() => {
    if (!activeRow) {
      state.onClearMultiSelect();
      state.onSetMultiSelectActive(false);
      return;
    }
    state.onSetMultiSelectZones(activeRow.surfaces);
    state.onSetMultiSelectActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSurfaceRowId]);
  // Deactivate multi-select mode on unmount (switching tabs away).
  useEffect(
    () => () => {
      state.onSetMultiSelectActive(false);
    },
    []
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredCatalog = useMemo(() => {
    const q = query.toLowerCase().trim();
    const selected = new Set(entries.map((e) => e.name.toLowerCase()));
    const pool = q ?
      catalog.filter((c) => c.toLowerCase().includes(q)) :
      catalog;
    const filtered = pool.filter((c) => !selected.has(c.toLowerCase()));
    const sorted = sortStringsForTypeahead(filtered, query);
    return sorted.slice(0, 12);
  }, [query, catalog, entries]);
  const queryTrim = query.trim();
  const catalogHasExactName =
    queryTrim.length > 0 &&
    catalog.some((c) => c.toLowerCase() === queryTrim.toLowerCase());
  const quickSelectChips = useMemo(() => {
    const defaults =
      kind === "finding" ?
        isGroupedScope ?
          [
            "Generalized plaque accumulation",
            "Generalized gingival inflammation",
            "Quadrant-level calculus",
            "Widespread sensitivity"] :

          [
            "Cavity/Caries",
            "Crack",
            "Fracture",
            "Sensitivity",
            "Plaque",
            "Calculus"] :

        kind === "planned" ?
          dentalProcedureNames.slice(0, 8) :
          isGroupedScope ?
            [
              "Quadrant scaling and root planing",
              "Full-mouth scaling and polishing",
              "Oral prophylaxis",
              "Periodontal maintenance"] :

            [
              "RCT",
              "Restoration",
              "Extraction",
              "Scaling",
              "Polishing",
              "Crown Prep",
              "Implant Placement",
              "Veneer"];


    const selected = new Set(entries.map((e) => e.name.toLowerCase()));
    return defaults.filter(
      (name) => catalog.includes(name) && !selected.has(name.toLowerCase())
    );
  }, [catalog, entries, isGroupedScope, kind, dentalProcedureNames]);
  const pendingActivateRef = useRef(false);
  const prevCountRef = useRef(entries.length);
  useEffect(() => {
    if (pendingActivateRef.current && entries.length > prevCountRef.current) {
      const latest = entries[entries.length - 1];
      if (latest)
        setActiveCell({
          rowId: latest.id,
          colKey: "surfaces"
        });
      pendingActivateRef.current = false;
    }
    prevCountRef.current = entries.length;
  }, [entries.length, entries]);
  const addEntryFromName = (name) => {
    state.onClearMultiSelect();
    const surfaces = getDefaultTreatmentSurfaces(name);
    pendingActivateRef.current = true;
    state.onAddEntry({
      kind,
      name,
      surfaces,
      since: undefined,
      plannedDate: undefined,
      status:
        kind === "procedure" || kind === "planned" ? "planned" : undefined,
      notes: undefined
    });
    setQuery("");
  };
  if (isMissing) {
    return (
      <div className={ui.missingWrap}>
        <p className={ui.missingText}>
          Tooth marked as Missing — no surfaces to{" "}
          {kind === "finding" ? "examine" : "treat"}.
        </p>
      </div>);

  }
  const hasStatus = kind === "procedure" || kind === "planned";
  return (
    <>
      <div data-rx-module-root={true} className={ui.entryRoot}>
        {entries.length > 0 &&
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <colgroup>
                <col
                  style={{
                    width: 36,
                    minWidth: 36
                  }} />


                <col
                  style={{
                    minWidth: 150
                  }} />


                <col
                  style={{
                    width: 140,
                    minWidth: 120
                  }} />


                <col
                  style={{
                    width: 120,
                    minWidth: 110
                  }} />


                {hasStatus &&
                  <col
                    style={{
                      width: 120,
                      minWidth: 110
                    }} />}



                <col
                  style={{
                    minWidth: 120
                  }} />


                <col
                  style={{
                    width: 44,
                    minWidth: 44,
                    maxWidth: 44
                  }} />

              </colgroup>
              <thead>
                <tr className={ui.theadRow}>
                  <th className={ui.thCenter} />
                  <th className={ui.th}>NAME</th>
                  <th className={ui.th}>SURFACES</th>
                  <th className={ui.th}>
                    {kind === "finding" ? "SINCE" : "DATE"}
                  </th>
                  {hasStatus && <th className={ui.th}>STATUS</th>}
                  <th className={ui.th}>NOTE</th>
                  <th className={ui.thSticky} />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const isSurfaceActive = isCellActive(e.id, "surfaces");
                  const isDateActive = isCellActive(
                    e.id,
                    kind === "finding" || kind === "symptom" ? "since" : "date"
                  );
                  const isStatusActive = isCellActive(e.id, "status");
                  const isNoteActive = isCellActive(e.id, "note");
                  const activateSurfaceCell = () => {
                    setCellActive(e.id, "surfaces");
                    state.onSetMultiSelectZones(e.surfaces);
                    state.onSetMultiSelectActive(true);
                  };
                  return (
                    <tr
                      onMouseEnter={() => {
                        if (!isSurfaceActive)
                          state.onSetHighlightZones(e.surfaces);
                      }}
                      onMouseLeave={() => {
                        if (!isSurfaceActive) state.onSetHighlightZones([]);
                      }}
                      className={ui.tbodyRow}>

                      <td className={`${ui.td} ${ui.tdGrip}`}>
                        <span className={ui.gripIcon}>
                          <svg
                            width="8"
                            height="16"
                            viewBox="0 0 8 16"
                            fill="currentColor">

                            <circle cx="2" cy="3" r="1.2" />
                            <circle cx="2" cy="8" r="1.2" />
                            <circle cx="2" cy="13" r="1.2" />
                            <circle cx="6" cy="3" r="1.2" />
                            <circle cx="6" cy="8" r="1.2" />
                            <circle cx="6" cy="13" r="1.2" />
                          </svg>
                        </span>
                      </td>
                      <td
                        className={`${ui.td} ${ui.tdHover}`}
                        onClick={(ev) => ev.stopPropagation()}>

                        <EditableNameCell
                          value={e.name}
                          catalog={catalog}
                          onCommit={(v) => {
                            if (v.trim())
                              state.onUpdateEntry(e.id, {
                                name: v.trim()
                              });
                          }}
                          onFocusActivate={() => setCellActive(e.id, "name")} />

                      </td>
                      <td
                        className={`${ui.td} ${ui.tdRel} ${isSurfaceActive ? ui.tdActive : ui.tdHover
                          }`}
                        onClick={(ev) => ev.stopPropagation()}>

                        {isSurfaceActive ?
                          <span className={ui.cellFocusRing} /> :
                          null}
                        <SurfaceCellDropdown
                          entry={e}
                          arch={state.selectedTooth.arch}
                          toothPosition={state.selectedTooth.position}
                          mode={
                            kind === "finding" ?
                              "finding" :
                              kind === "symptom" ?
                                "symptom" :
                                "treatment"}

                          isActive={isSurfaceActive}
                          onActivate={activateSurfaceCell}
                          onDeactivate={() => {
                            if (state.selectedZone === "whole")
                              state.onClearSelectedZone();
                            clearCellActive(e.id, "surfaces");
                          }}
                          onToggleZone={state.onToggleZoneMultiSelect}
                          onHover={state.onSetHighlightZones}
                          multiSelectZones={state.multiSelectZones} />

                      </td>
                      <td
                        className={`${ui.td} ${ui.tdRel} ${isDateActive ? ui.tdActive : ui.tdHover
                          }`}
                        onClick={(ev) => ev.stopPropagation()}>

                        {isDateActive ?
                          <span className={ui.cellFocusRing} /> :
                          null}
                        {kind === "finding" || kind === "symptom" ?
                          <SinceDropdown
                            value={e.since ?? ""}
                            onChange={(v) =>
                              state.onUpdateEntry(e.id, {
                                since: v || undefined
                              })}

                            onFocusActivate={() => setCellActive(e.id, "since")}
                            onBlurDeactivate={() =>
                              clearCellActive(e.id, "since")} /> :



                          <div className={ui.dateCellInner}>
                            {!e.plannedDate &&
                              <div className={ui.datePlaceholderRow}>
                                <span className={ui.datePlaceholderText}>
                                  DD/MM/YYYY
                                </span>
                                <Calendar
                                  size={14}
                                  color="#94a3b8"
                                  variant="Linear" />

                              </div>}


                            <input
                              type="date"
                              value={e.plannedDate ?? ""}
                              onChange={(ev) =>
                                state.onUpdateEntry(e.id, {
                                  plannedDate: ev.target.value || undefined
                                })}

                              onFocus={() => setCellActive(e.id, "date")}
                              onBlur={() => clearCellActive(e.id, "date")}
                              className={`${ui.dateInput} ${e.plannedDate ?
                                  ui.dateInputFilled :
                                  ui.dateInputEmpty
                                }`} />

                          </div>}

                      </td>
                      {hasStatus &&
                        <td
                          className={`${ui.td} ${ui.tdRel} ${isStatusActive ? ui.tdActive : ""
                            }`}
                          onClick={(ev) => ev.stopPropagation()}>

                          {isStatusActive ?
                            <span className={ui.cellFocusRing} /> :
                            null}
                          <select
                            value={e.status ?? "planned"}
                            onChange={(ev) =>
                              state.onUpdateEntry(e.id, {
                                status: ev.target.value
                              })}

                            onFocus={() => setCellActive(e.id, "status")}
                            onBlur={() => clearCellActive(e.id, "status")}
                            className={ui.selectNative}>

                            <option value="planned">Planned</option>
                            <option value="in-progress">In progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>}


                      <td
                        className={`${ui.td} ${ui.tdRel} ${isNoteActive ? ui.tdActive : ui.tdHover
                          }`}
                        onClick={(ev) => ev.stopPropagation()}>

                        {isNoteActive ?
                          <span className={ui.cellFocusRing} /> :
                          null}
                        <input
                          type="text"
                          value={e.notes ?? ""}
                          onChange={(ev) =>
                            state.onUpdateEntry(e.id, {
                              notes: ev.target.value
                            })}

                          onFocus={() => setCellActive(e.id, "note")}
                          onBlur={() => clearCellActive(e.id, "note")}
                          placeholder="e.g. Monitor at next visit"
                          className={ui.noteInput} />

                      </td>
                      <td
                        className={ui.tdStickyAct}
                        onClick={(ev) => ev.stopPropagation()}>

                        <button
                          type="button"
                          onClick={() => {
                            if (activeSurfaceRowId === e.id)
                              setActiveCell(null);
                            state.onRemoveEntry(e.id);
                          }}
                          title="Remove"
                          className={ui.removeRowBtn}>

                          <Trash
                            size={14}
                            color="currentColor"
                            variant="Linear" />

                        </button>
                      </td>
                    </tr>);

                })}
              </tbody>
            </table>
          </div>}


        <div
          className={`${entries.length > 0 ? ui.searchBlock : ui.searchBlockFirst
            }`}>

          <div className={ui.searchRel}>
            <span className={ui.searchIconAbs}>
              <SearchNormal1 size={14} color="currentColor" variant="Linear" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && queryTrim) {
                  const match = catalog.find(
                    (c) => c.toLowerCase() === queryTrim.toLowerCase()
                  );
                  if (match) {
                    addEntryFromName(match);
                    setSearchOpen(false);
                  } else if (kind === "planned") {
                    setPlannedCustomInitial(queryTrim);
                    setPlannedCustomOpen(true);
                    setSearchOpen(false);
                  } else if (kind === "finding" && !catalogHasExactName) {
                    addEntryFromName(queryTrim);
                    setSearchOpen(false);
                  }
                }
              }}
              placeholder={
                kind === "finding" ?
                  isGroupedScope ?
                    "Search & Add Group Finding" :
                    "Search & Add Examination" :
                  kind === "symptom" ?
                    "Search & Add Symptom" :
                    kind === "planned" ?
                      isGroupedScope ?
                        "Search & Add Group Planned Procedure" :
                        "Search & Add Planned Procedure" :
                      isGroupedScope ?
                        "Search & Add Group Procedure" :
                        "Search & Add Procedure"}

              className={ui.searchInput} />


            {searchOpen &&
              pos &&
              typeof document !== "undefined" && (
                filteredCatalog.length > 0 || query.trim()) &&
              createPortal(
                <div
                  ref={searchPopoverRef}
                  className={ui.popover}
                  style={{
                    top: pos.top,
                    left: pos.left,
                    width: pos.width
                  }}>

                  {(kind === "planned" || kind === "procedure") && (
                    filteredCatalog.length > 0 || query.trim()) &&
                    <div className={ui.popoverSectionHeader}>
                      <p className={ui.popoverSectionTitle}>
                        {kind === "planned" ? "Dental service" : "Procedure"}
                      </p>
                    </div>}


                  {filteredCatalog.map((c) =>
                    <button
                      type="button"
                      onClick={() => addEntryFromName(c)}
                      className={ui.popoverItem}>

                      {c}
                    </button>
                  )}
                  {queryTrim && !catalogHasExactName &&
                    <button
                      className={ui.popoverAdd}
                      onClick={() => {
                        if (kind === "planned") {
                          setPlannedCustomInitial(query.trim());
                          setPlannedCustomOpen(true);
                          setSearchOpen(false);
                        } else {
                          addEntryFromName(query.trim());
                        }
                      }}>

                      {kind === "planned" ?
                        <span className={ui.popoverAddInner}>
                          <Add
                            size={16}
                            color="var(--tp-blue-600)"
                            variant="Bold" />


                          <span>
                            Add "{query.trim()}" as custom dental service
                          </span>
                        </span> :

                        <span className={ui.popoverAddInner}>
                          <Add
                            size={14}
                            color="currentColor"
                            variant="Linear" />
                          {" "}
                          Add "{query.trim()}"
                        </span>}

                    </button>}

                </div>,
                document.body
              )}
          </div>
          {query.length === 0 && quickSelectChips.length > 0 &&
            <div className={ui.chipRow}>
              {quickSelectChips.map((chip) =>
                <button
                  type="button"
                  onClick={() => addEntryFromName(chip)}
                  className={ui.chipBtn}>

                  {chip}
                </button>
              )}
            </div>}

        </div>
      </div>
      {kind === "planned" &&
        <AddDentalBillItemDrawer
          open={plannedCustomOpen}
          onOpenChange={setPlannedCustomOpen}
          initialName={plannedCustomInitial}
          onSaved={(item) => {
            addEntryFromName(item.name);
          }} />}


    </>);

}
// ──────────────────────────────────────────────────────────────
// SurfaceCellDropdown — in-cell dropdown with highlighted hint row
// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// EditableNameCell — click to turn a name cell into an input + catalog dropdown
// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// DiagnosisNameCell — editable diagnosis name w/ swap dropdown
// ──────────────────────────────────────────────────────────────
function DiagnosisNameCell({ name, color, activeRows, onSwap }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const reposition = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 200)
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);
  // Available diagnoses to swap to (exclude currently-active ones except self).
  const options = TOOTH_DIAGNOSES.filter(
    (d) => d === name || !activeRows.includes(d)
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);
  useEffect(() => {
    setHighlightIdx(0);
  }, [draft]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      setTimeout(() => {
        if (inputRef.current)
          inputRef.current.setSelectionRange(draft.length, draft.length);
      }, 0);
    }
  }, [editing, draft.length]);
  const filtered = useMemo(() => {
    const q = draft.toLowerCase().trim();
    if (!q) return options;
    return options.filter((c) => c.toLowerCase().includes(q));
  }, [draft, options]);
  const commit = (next) => {
    setEditing(false);
    setOpen(false);
    const trimmed = next.trim();
    if (trimmed && trimmed !== name) onSwap(trimmed); else
      setDraft(name);
  };
  // Suppress unused variable warning (color no longer rendered)
  void color;
  return (
    <div ref={wrapRef} className={ui.rel}>
      {!editing ?
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setOpen(true);
            setDraft(name);
          }}
          className={`${ui.diagToggleBtn} ${open ? ui.diagToggleOpen : ""}`}>

          <span className={ui.diagToggleLabel}>{name}</span>
        </button> :

        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const pick = filtered[highlightIdx];
              commit(pick ?? (draft.trim() || name));
            } else if (e.key === "Escape") {
              setEditing(false);
              setOpen(false);
              setDraft(name);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const totalItems =
                filtered.length + (
                  draft.trim().length > 0 &&
                    !options.some(
                      (o) => o.toLowerCase() === draft.trim().toLowerCase()
                    ) ?
                    1 :
                    0);
              setHighlightIdx((i) => Math.min(totalItems - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIdx((i) => Math.max(0, i - 1));
            }
          }}
          onBlur={() => { }}
          placeholder="Search & Add Diagnosis..."
          className={ui.nameComboInput} />}



      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            className={ui.portalList}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            {filtered.map((d, i) => {
              const isCurrent = d === name;
              const highlighted = i === highlightIdx;
              return (
                <li>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightIdx(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(d);
                    }}
                    className={`${ui.menuRowBtn} ${highlighted ? ui.menuRowBtnHi : ""
                      } ${isCurrent ? ui.menuRowStrong : ""
                      }`}>

                    <span className={ui.menuRowGrow}>{d}</span>
                    {isCurrent &&
                      <span className={ui.menuCurrentHint}>current</span>}

                  </button>
                </li>);

            })}
            {draft.trim().length > 0 &&
              !options.some(
                (o) => o.toLowerCase() === draft.trim().toLowerCase()
              ) &&
              <div className={ui.customAddMargin}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(draft.trim());
                  }}
                  onMouseEnter={() => setHighlightIdx(filtered.length)}
                  className={`${ui.customAddBtn} ${highlightIdx === filtered.length ? ui.customAddBtnHi : ""
                    }`}>

                  <Add size={12} color="currentColor" variant="Linear" />
                  Add custom: "{draft.trim()}"
                </button>
              </div>}

          </ul>,
          document.body
        )}
    </div>);

}
function EditableNameCell({ value, catalog, onCommit, onFocusActivate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  useEffect(() => {
    setHighlightIdx(0);
  }, [draft]);
  const filtered = useMemo(() => {
    const q = draft.toLowerCase().trim();
    if (!q) return catalog.slice(0, 8);
    return catalog.
      filter((c) => c.toLowerCase().includes(q) && c !== value).
      slice(0, 8);
  }, [draft, catalog, value]);
  const hasExactMatch = useMemo(
    () =>
      filtered.some((c) => c.toLowerCase() === draft.trim().toLowerCase()) ||
      catalog.some((c) => c.toLowerCase() === draft.trim().toLowerCase()),
    [filtered, catalog, draft]
  );
  const showCustom = draft.trim().length > 0 && !hasExactMatch;
  const totalItems = filtered.length + (showCustom ? 1 : 0);
  const commit = useCallback(
    (next) => {
      setEditing(false);
      setPos(null);
      const trimmed = next.trim();
      if (trimmed && trimmed !== value) onCommit(trimmed);
    },
    [value, onCommit]
  );
  useEffect(() => {
    if (!editing) return;
    const onDoc = (e) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target) &&
        listRef.current &&
        !listRef.current.contains(e.target)) {
        commit(draft);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [editing, draft, commit]);
  useEffect(() => {
    if (!editing) {
      setPos(null);
      return;
    }
    const reposition = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 200)
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [editing]);
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(totalItems - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (totalItems === 0 && !draft.trim()) return;
      if (totalItems === 0 && draft.trim()) commit(draft.trim()); else
        if (highlightIdx < filtered.length) commit(filtered[highlightIdx]); else
          commit(draft.trim()); // custom row
    } else if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
      setPos(null);
    }
  };
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setEditing(true);
          setDraft(value);
          onFocusActivate?.();
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={ui.editIdleBtn}>

        <span className={ui.editIdleLabel}>{value}</span>
      </button>);

  }
  return (
    <div ref={wrapRef} className={ui.rel}>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search..."
        className={ui.nameComboInput} />


      {(filtered.length > 0 || showCustom) &&
        typeof document !== "undefined" &&
        pos &&
        createPortal(
          <div
            ref={listRef}
            className={ui.portalListWide}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            <ul>
              {filtered.map((c, i) => {
                const highlighted = i === highlightIdx;
                return (
                  <li>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        commit(c);
                      }}
                      onMouseEnter={() => setHighlightIdx(i)}
                      className={`${ui.menuRowBtn} ${highlighted ? ui.menuRowBtnHi : ""
                        }`}>

                      {c}
                    </button>
                  </li>);

              })}
            </ul>
            {showCustom &&
              <div className={ui.customAddMargin}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(draft.trim());
                  }}
                  onMouseEnter={() => setHighlightIdx(filtered.length)}
                  className={`${ui.customAddBtn} ${highlightIdx === filtered.length ? ui.customAddBtnHi : ""
                    }`}>

                  <Add size={12} color="currentColor" variant="Linear" />
                  Add custom: "{draft.trim()}"
                </button>
              </div>}

          </div>,
          document.body
        )}
    </div>);

}
function SurfaceCellDropdown({
  entry,
  arch,
  toothPosition,
  isActive,
  mode,
  onActivate,
  onDeactivate,
  onToggleZone,
  onHover,
  multiSelectZones
}) {
  const { activeSurfaces } = useDentalMasters();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const wasActiveRef = useRef(false);
  // Auto-open when this row becomes active (user just clicked a search chip).
  useEffect(() => {
    if (isActive && !wasActiveRef.current) setOpen(true);
    if (!isActive) setOpen(false);
    wasActiveRef.current = isActive;
  }, [isActive]);
  // Compute portal position when opened / on scroll / resize.
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const reposition = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 240)
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const a = anchorRef.current,
        p = popoverRef.current;
      const t = e.target;
      if (
        t?.tagName === "CANVAS" ||
        t?.closest("[data-dental-annotation-ui='true']") ||
        t?.closest("[data-surface-selector-ui='true']"))

        return;
      if (a && !a.contains(t) && p && !p.contains(t)) {
        setOpen(false);
        onDeactivate?.();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onDeactivate]);
  // When the dropdown is open AND this is the active row, what the user sees
  // mirrors multiSelectZones. When NOT active, show the entry's saved surfaces.
  const shown = isActive ? Array.from(multiSelectZones) : entry.surfaces;
  // Whole tooth = array containing 'whole'
  const isWholeTooth = shown.includes("whole");
  const toggle = (z) => {
    if (!isActive) {
      onActivate();
      return;
    }
    onToggleZone(z);
  };
  const clickWholeTooth = () => {
    if (!isActive) onActivate();
    onToggleZone("whole");
  };
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            onDeactivate?.();
            return;
          }
          onActivate();
          setOpen(true);
        }}
        className={ui.surfaceTriggerBtn}>

        <span className={ui.surfaceTriggerText}>
          {shown.length === 0 ?
            <span className={ui.surfacePlaceholder}>Select surface</span> :
            isWholeTooth ?
              <span className={ui.surfaceInlineRow}>
                <span
                  className={ui.surfaceDot8}
                  style={{
                    background: ZONE_INFO.whole.color
                  }} />

                Whole tooth
              </span> :

              <SurfaceDots
                surfaces={shown}
                arch={arch}
                toothPosition={toothPosition} />}


        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s"
          }}>

          <path
            d="M1 1L5 5L9 1"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round" />

        </svg>
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className={ui.surfacePopover}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            <div className={ui.surfacePopoverPad}>
              <div className={ui.surfaceHint}>
                <InfoCircle
                  size={13}
                  color="var(--tp-amber-700)"
                  variant="Bold" />


                <span className={ui.surfaceHintText}>
                  Tap the <span className={ui.surfaceHintBold}>3D tooth</span>{" "}
                  to select surfaces, or pick from the list below
                </span>
              </div>
            </div>
            <ul className={ui.surfaceZoneList}>
              <li>
                <button
                  type="button"
                  onClick={clickWholeTooth}
                  className={ui.surfaceZoneBtn}>

                  <span
                    className={`${ui.surfaceCheck} ${isWholeTooth ? ui.surfaceCheckOn : ""
                      }`}>

                    {isWholeTooth &&
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5L4 7L8 3"
                          stroke="#fff"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round" />

                      </svg>}

                  </span>
                  <span
                    className={ui.surfaceDot8}
                    style={{
                      background: ZONE_INFO.whole.color
                    }} />


                  <span
                    className={`${ui.surfaceMenuLabel} ${ui.surfaceMenuStrong}`}>

                    Whole tooth
                  </span>
                </button>
              </li>
              <li className={ui.surfaceListRule} />
              {activeSurfaces.map((z) => {
                const checked = shown.includes(z);
                const label = getZoneLabel(z, arch, toothPosition);
                return (
                  <li>
                    <button
                      type="button"
                      onClick={() => toggle(z)}
                      onMouseEnter={() => onHover([z])}
                      onMouseLeave={() => onHover(shown)}
                      className={ui.surfaceZoneBtn}>

                      <span
                        className={`${ui.surfaceCheck} ${checked ? ui.surfaceCheckOn : ""
                          }`}>

                        {checked &&
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 10 10"
                            fill="none">

                            <path
                              d="M2 5L4 7L8 3"
                              stroke="#fff"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round" />

                          </svg>}

                      </span>
                      <span
                        className={ui.surfaceDot8}
                        style={{
                          background: ZONE_INFO[z].color
                        }} />


                      <span className={ui.surfaceMenuLabel}>{label}</span>
                    </button>
                  </li>);

              })}
            </ul>
          </div>,
          document.body
        )}
    </>);

}
function getDynamicSinceOptions(query) {
  const match = query.match(/\d+/);
  const n = match ? parseInt(match[0], 10) : 1;
  const plural = n > 1 ? "s" : "";
  return [
    `${n} hour${plural}`,
    `${n} day${plural}`,
    `${n} month${plural}`,
    `${n} year${plural}`];

}
function SinceDropdown({
  value,
  onChange,
  autoOpen,
  onFocusActivate,
  onBlurDeactivate
}) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  useEffect(() => {
    if (autoOpen && !value) setOpen(true);
  }, [autoOpen, value]);
  useEffect(() => {
    setInternalValue(value);
  }, [value]);
  const options = useMemo(() => {
    return internalValue && internalValue.match(/\d+/) ?
      getDynamicSinceOptions(internalValue) :
      ["1 hour", "1 day", "1 week", "1 year"];
  }, [internalValue]);
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const reposition = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 200)
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const a = anchorRef.current,
        p = popoverRef.current;
      const t = e.target;
      if (a && !a.contains(t) && p && !p.contains(t)) {
        setOpen(false);
        onBlurDeactivate?.();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onBlurDeactivate]);
  return (
    <>
      <div className={ui.sinceAnchor} ref={anchorRef}>
        <input
          type="text"
          value={internalValue}
          onFocus={() => {
            onFocusActivate?.();
            setOpen(true);
          }}
          onChange={(e) => {
            setInternalValue(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange(internalValue);
              setOpen(false);
            }
          }}
          placeholder="e.g. 5 days"
          className={ui.sinceInput} />


        <svg
          className={ui.sinceChevronAbs}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            flexShrink: 0
          }}>

          <path
            d="M1 1L5 5L9 1"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round" />

        </svg>
      </div>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            className={ui.sinceMenu}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            {options.map((opt) =>
              <button
                type="button"
                className={ui.popoverItem}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}>

                {opt}
              </button>
            )}
          </div>,
          document.body
        )}
    </>);

}
function SurfaceMultiSelect({
  selected,
  arch,
  toothPosition,
  onToggle,
  onHover
}) {
  const { activeSurfaces } = useDentalMasters();
  return (
    <div className={ui.zoneChipsRow}>
      {activeSurfaces.map((z) => {
        const isActive = selected.includes(z);
        const label = getZoneLabel(z, arch, toothPosition);
        const color = ZONE_INFO[z].color;
        return (
          <button
            type="button"
            onClick={() => onToggle(z)}
            onMouseEnter={() => onHover([z])}
            onMouseLeave={() => onHover(selected)}
            className={`${ui.zoneChip} ${isActive ? ui.zoneChipOn : ui.zoneChipOff
              }`}>

            <span
              className={ui.surfaceDot8}
              style={{
                background: color
              }} />


            {label}
          </button>);

      })}
    </div>);

}
function SurfaceDots({ surfaces, arch, toothPosition }) {
  if (surfaces.length === 0) {
    return <span className={ui.dotsWholePill}>Whole tooth</span>;
  }
  const abbr = (z) => {
    const label = getZoneLabel(z, arch, toothPosition);
    return label[0];
  };
  const shown = surfaces.slice(0, 4);
  const overflow = surfaces.length - shown.length;
  const overflowTitle =
    overflow > 0 ?
      surfaces.
        slice(4).
        map((z) => getZoneLabel(z, arch, toothPosition)).
        join(", ") :
      undefined;
  return (
    <div className={ui.dotsRow}>
      {shown.map((z) =>
        <span
          title={getZoneLabel(z, arch, toothPosition)}
          className={ui.dotsAbbr}
          style={{
            background: ZONE_INFO[z].color
          }}>

          {abbr(z)}
        </span>
      )}
      {overflow > 0 &&
        <span title={overflowTitle} className={ui.dotsMore}>
          +{overflow}
        </span>}

    </div>);

}
const DENTAL_SYMPTOM_CATALOG = [
  "Tooth pain",
  "Sensitivity to cold",
  "Sensitivity to hot",
  "Sensitivity to sweet",
  "Throbbing pain",
  "Pain on biting",
  "Swelling",
  "Bleeding gums",
  "Bad breath",
  "Loose tooth",
  "Discolouration",
  "Difficulty chewing",
  "Jaw pain",
  "Clicking sound",
  "Food impaction",
  "Spontaneous pain"];


let _symId = 0;
const getSymId = () => `sym-${++_symId}`;
function SymptomSurfacePicker({
  surfaces,
  arch,
  toothPosition,
  mode = "symptom",
  onChange
}) {
  const { activeSurfaces } = useDentalMasters();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const [pos, setPos] = useState(null);
  const selected = new Set(surfaces);
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 200)
    });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const a = anchorRef.current,
        p = popoverRef.current,
        t = e.target;
      if (a && !a.contains(t) && p && !p.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const toggle = (z) => {
    if (z === "whole") {
      onChange(selected.has(z) ? [] : ["whole"]);
      return;
    }
    if (selected.has("whole")) {
      onChange([z]);
      return;
    }
    onChange(
      selected.has(z) ? surfaces.filter((s) => s !== z) : [...surfaces, z]
    );
  };
  const optionsList = mode === "symptom" ? activeSurfaces : ["whole", ...activeSurfaces];
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${ui.symTrigger} ${open ? ui.symTriggerOpen : ""}`}>

        <span className={ui.surfaceTriggerText}>
          {surfaces.length === 0 ?
            <span className={ui.symMuted}>Select surface</span> :
            surfaces.includes("whole") ?
              <span className={ui.surfaceInlineRow}>
                <span
                  className={ui.surfaceDot8}
                  style={{
                    background: "#94a3b8"
                  }} />

                Whole tooth
              </span> :

              <SurfaceDots
                surfaces={surfaces.filter((z) => z !== "whole")}
                arch={arch}
                toothPosition={toothPosition} />}


        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s"
          }}>

          <path
            d="M1 1l4 4 4-4"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round" />

        </svg>
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className={ui.surfacePopover}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}>

            <ul className={ui.surfaceZoneList}>
              {optionsList.map((z) => {
                let checked = selected.has(z);
                let label = getZoneLabel(z, arch, toothPosition);
                let color = ZONE_INFO[z]?.color || "#888";
                if (z === "whole") {
                  label = "Whole Tooth";
                  color = "#64748b";
                  if (mode !== "treatment") {
                    checked = activeSurfaces.every((az) => selected.has(az));
                  }
                }
                return (
                  <li>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        toggle(z);
                      }}
                      className={ui.surfaceZoneBtn}>

                      <span
                        className={`${ui.surfaceCheck} ${checked ? ui.surfaceCheckOn : ""
                          }`}>

                        {checked &&
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 24 24"
                            fill="none">

                            <path
                              d="M6 12l4.5 4.5L18 7.5"
                              stroke="#fff"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round" />

                          </svg>}

                      </span>
                      <span
                        className={ui.surfaceDot8}
                        style={{
                          background: color
                        }} />


                      <span className={ui.surfaceMenuLabel}>{label}</span>
                    </button>
                  </li>);

              })}
            </ul>
          </div>,
          document.body
        )}
    </>);

}
function DentalSymptomsBody({ rows, onUpdateRows, state }) {
  const [query, setQuery] = useState("");
  const [activeRowId, setActiveRowId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchPopoverRef = useRef(null);
  useEffect(() => {
    if (!searchOpen) return;
    const onDoc = (e) => {
      const el = e.target;
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(el) &&
        searchPopoverRef.current &&
        !searchPopoverRef.current.contains(el)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [searchOpen]);
  const selectedNames = new Set(rows.map((r) => r.name.toLowerCase()));
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const pool = q ?
      DENTAL_SYMPTOM_CATALOG.filter((s) => s.toLowerCase().includes(q)) :
      DENTAL_SYMPTOM_CATALOG;
    return pool.filter((s) => !selectedNames.has(s.toLowerCase())).slice(0, 12);
  }, [query, selectedNames]);
  const symptomQueryTrim = query.trim();
  const symptomCatalogExact =
    symptomQueryTrim.length > 0 &&
    DENTAL_SYMPTOM_CATALOG.some(
      (s) => s.toLowerCase() === symptomQueryTrim.toLowerCase()
    );
  const symptomAlreadyAdded =
    symptomQueryTrim.length > 0 &&
    selectedNames.has(symptomQueryTrim.toLowerCase());
  const addSymptom = (name) => {
    onUpdateRows([
      ...rows,
      {
        id: getSymId(),
        name,
        surfaces: [],
        since: "",
        severity: "",
        note: ""
      }]
    );
    setQuery("");
    setSearchOpen(false);
  };
  const updateRow = (id, patch) => {
    onUpdateRows(
      rows.map((r) =>
        r.id === id ?
          {
            ...r,
            ...patch
          } :
          r
      )
    );
  };
  const removeRow = (id) => onUpdateRows(rows.filter((r) => r.id !== id));
  return (
    <div data-rx-module-root={true} className={ui.entryRoot}>
      {rows.length > 0 &&
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <colgroup>
              <col
                style={{
                  minWidth: 140
                }} />


              <col
                style={{
                  width: 140,
                  minWidth: 120
                }} />


              <col
                style={{
                  width: 100,
                  minWidth: 90
                }} />


              <col
                style={{
                  width: 140,
                  minWidth: 140
                }} />


              <col
                style={{
                  minWidth: 110
                }} />


              <col
                style={{
                  width: 44,
                  minWidth: 44,
                  maxWidth: 44
                }} />

            </colgroup>
            <thead>
              <tr className={ui.theadRow}>
                <th className={ui.thUpper}>NAME</th>
                <th className={ui.thUpper}>SURFACES</th>
                <th className={ui.thUpper}>SINCE</th>
                <th className={ui.thUpper}>SEVERITY</th>
                <th className={ui.thUpper}>NOTE</th>
                <th className={ui.thSticky} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isRowActive = activeRowId === r.id;
                return (
                  <tr
                    className={ui.tbodyRowInteractive}
                    onClick={() => setActiveRowId(isRowActive ? null : r.id)}>

                    <td className={ui.tdPlain}>
                      <span className={ui.symptomName}>{r.name}</span>
                    </td>
                    <td
                      className={ui.tdPlain}
                      onClick={(ev) => ev.stopPropagation()}>

                      <SymptomSurfacePicker
                        surfaces={r.surfaces}
                        arch={state.selectedTooth.arch}
                        toothPosition={state.selectedTooth.position}
                        onChange={(next) =>
                          updateRow(r.id, {
                            surfaces: next
                          })} />


                    </td>
                    <td className={ui.tdPlain}>
                      <input
                        type="text"
                        value={r.since}
                        onChange={(e) =>
                          updateRow(r.id, {
                            since: e.target.value
                          })}

                        placeholder="e.g. 5 days"
                        className={ui.symptomField} />

                    </td>
                    <td className={ui.tdPlain}>
                      <select
                        value={r.severity}
                        onChange={(e) =>
                          updateRow(r.id, {
                            severity: e.target.value
                          })}

                        className={`${ui.symptomSelect} ${r.severity ?
                            ui.symptomSelectFilled :
                            ui.symptomSelectEmpty
                          }`}>

                        <option value="" className={ui.optionMuted}>
                          e.g. Moderate
                        </option>
                        <option value="Mild">Mild</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe">Severe</option>
                      </select>
                    </td>
                    <td className={ui.tdPlain}>
                      <input
                        type="text"
                        value={r.note}
                        onChange={(e) =>
                          updateRow(r.id, {
                            note: e.target.value
                          })}

                        placeholder="e.g. Worsens at night"
                        className={ui.symptomField} />

                    </td>
                    <td className={ui.tdStickyAct}>
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          removeRow(r.id);
                        }}
                        title="Remove"
                        className={ui.removeRowBtn}>

                        <Trash
                          size={14}
                          color="currentColor"
                          variant="Linear" />

                      </button>
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>}


      <div className={ui.searchBlockTop}>
        <div className={ui.searchRel}>
          <span className={ui.searchIconAbs}>
            <SearchNormal1 size={14} color="currentColor" variant="Linear" />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && symptomQueryTrim && !symptomAlreadyAdded)
                addSymptom(symptomQueryTrim);
            }}
            placeholder="Search & Add Dental Symptom"
            className={ui.searchInput14} />


          {searchOpen && (filtered.length > 0 || symptomQueryTrim) &&
            <div ref={searchPopoverRef} className={ui.popoverBelow}>
              {filtered.map((s) =>
                <button
                  type="button"
                  onClick={() => addSymptom(s)}
                  className={ui.popoverItem}>

                  {s}
                </button>
              )}
              {symptomQueryTrim &&
                !symptomCatalogExact &&
                !symptomAlreadyAdded &&
                <button
                  type="button"
                  className={ui.popoverAdd}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addSymptom(symptomQueryTrim)}>

                  <span className={ui.popoverAddInner}>
                    <Add size={14} color="currentColor" variant="Linear" />{" "}
                    Add "{symptomQueryTrim}"
                  </span>
                </button>}

            </div>}

        </div>
      </div>
    </div>);

}
function PrimaryDiagnosisBody({ state }) {
  const { activeToothDiagnoses } = useDentalMasters();
  const [activeCell, setActiveCell] = useState(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchPopoverRef = useRef(null);
  const [pos, setPos] = useState(null);
  // Auto-close search popover on outside click
  useEffect(() => {
    if (!searchOpen) {
      setPos(null);
      return;
    }
    const onDoc = (e) => {
      const el = e.target;
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(el) &&
        searchPopoverRef.current &&
        !searchPopoverRef.current.contains(el)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [searchOpen]);
  // Active diagnoses as "rows"
  const activeRows = useMemo(() => {
    const list = [];
    state.currentToothDiagnoses.forEach((d) => list.push(d));
    if (state.isImplant && !list.includes("Implant")) list.push("Implant");
    return list;
  }, [state.currentToothDiagnoses, state.isImplant]);
  const displayRows = useMemo(() => {
    const detailMap = state.currentTreatmentHistoryDetails ?? {};
    const keys = Object.keys(detailMap);
    const orphans = keys.
      filter((k) => !activeRows.includes(k)).
      sort((a, b) => a.localeCompare(b));
    return [...activeRows, ...orphans];
  }, [activeRows, state.currentTreatmentHistoryDetails]);
  const filteredCatalog = useMemo(() => {
    const q = query.toLowerCase().trim();
    const activeSet = new Set(activeRows.map((r) => r.toLowerCase()));
    const pool = q ?
      activeToothDiagnoses.filter((c) => c.toLowerCase().includes(q)) :
      activeToothDiagnoses;
    return pool.filter((c) => !activeSet.has(c.toLowerCase())).slice(0, 12);
  }, [query, activeRows]);
  const queryTrim = query.trim();
  const catalogHasExactName =
    queryTrim.length > 0 &&
    activeToothDiagnoses.some((d) => d.toLowerCase() === queryTrim.toLowerCase());
  const alreadyHasTypedTreatmentLabel =
    queryTrim.length > 0 &&
    displayRows.some((r) => r.toLowerCase() === queryTrim.toLowerCase());
  useEffect(() => {
    if (!searchOpen) return;
    const el = searchInputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: r.left,
      width: r.width
    });
  }, [searchOpen, filteredCatalog, query]);
  // Track most recently added diagnosis so we can auto-open its Since dropdown.
  const [lastAddedName, setLastAddedName] = useState(null);
  const addDiagnosis = (name) => {
    if (name === "Implant") state.onToggleImplant(); else
      state.onToggleToothDiagnosis(name);
    const existing = state.currentTreatmentHistoryDetails[name];
    state.onUpdateTreatmentHistoryDetail(name, {
      surfaces: existing?.surfaces?.length ?
        existing.surfaces :
        getDefaultTreatmentSurfaces(name),
      since: existing?.since,
      note: existing?.note
    });
    setActiveCell({
      rowId: name,
      colKey: "surfaces"
    });
    setLastAddedName(name);
    setQuery("");
    setSearchOpen(false);
  };
  const removeRow = (name) => {
    const isDiagnosisRow = activeRows.includes(name);
    state.onRemoveTreatmentHistoryDetail?.(name);
    if (isDiagnosisRow) {
      if (name === "Implant") state.onToggleImplant(); else
        state.onToggleToothDiagnosis(name);
    }
    if (activeCell?.rowId === name) setActiveCell(null);
  };
  useEffect(() => {
    if (activeCell?.rowId && !displayRows.includes(activeCell.rowId))
      setActiveCell(null);
  }, [activeCell, displayRows]);
  const activeRowName =
    activeCell?.colKey === "surfaces" &&
      activeCell.rowId &&
      displayRows.includes(activeCell.rowId) ?
      activeCell.rowId :
      null;
  const activeRowSurfaces = activeRowName ?
    state.currentTreatmentHistoryDetails[activeRowName]?.surfaces ?? [] :
    [];
  const clearCellActive = useCallback((rowId, colKey) => {
    window.setTimeout(() => {
      setActiveCell((current) =>
        current && current.rowId === rowId && current.colKey === colKey ?
          null :
          current
      );
    }, 80);
  }, []);
  const isCellActive = useCallback(
    (rowId, colKey) =>
      activeCell?.rowId === rowId && activeCell?.colKey === colKey,
    [activeCell]
  );
  useEffect(() => {
    if (!activeRowName) {
      state.onClearMultiSelect();
      state.onSetMultiSelectActive(false);
      return;
    }
    state.onSetMultiSelectZones(activeRowSurfaces);
    state.onSetMultiSelectActive(true);
  }, [activeRowName]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!activeRowName) return;
    const zonesFromCanvas = Array.from(state.multiSelectZones);
    const same =
      zonesFromCanvas.length === activeRowSurfaces.length &&
      zonesFromCanvas.every((zone) => activeRowSurfaces.includes(zone));
    if (!same) {
      state.onUpdateTreatmentHistoryDetail(activeRowName, {
        surfaces: zonesFromCanvas
      });
    }
  }, [activeRowName, activeRowSurfaces, state.multiSelectZones]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      state.onSetMultiSelectActive(false);
    },
    []
  ); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div data-rx-module-root={true} className={ui.entryRoot}>
      {displayRows.length > 0 &&
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <colgroup>
              <col
                style={{
                  width: 36,
                  minWidth: 36
                }} />


              <col
                style={{
                  minWidth: 120
                }} />


              <col
                style={{
                  width: 140,
                  minWidth: 120
                }} />


              <col
                style={{
                  width: 140,
                  minWidth: 120
                }} />


              <col
                style={{
                  minWidth: 140
                }} />


              <col
                style={{
                  width: 44,
                  minWidth: 44,
                  maxWidth: 44
                }} />

            </colgroup>
            <thead>
              <tr className={ui.theadRow}>
                <th className={ui.thCenter} />
                <th className={ui.th}>NAME</th>
                <th className={ui.th}>SURFACES</th>
                <th className={ui.th}>SINCE</th>
                <th className={ui.th}>NOTE</th>
                <th className={ui.thSticky} />
              </tr>
            </thead>
            <tbody>
              {displayRows.map((name) => {
                const isOrphanHistoryRow = !activeRows.includes(name);
                const color = PRIMARY_DIAG_COLOR[name] ?? "#4b4ad5";
                const d = state.currentTreatmentHistoryDetails[name] ?? {
                  since: "",
                  note: "",
                  surfaces: []
                };
                const isSurfaceActive = isCellActive(name, "surfaces");
                const isSinceActive = isCellActive(name, "since");
                const isNoteActive = isCellActive(name, "note");
                const activateSurfaceCell = () => {
                  setActiveCell({
                    rowId: name,
                    colKey: "surfaces"
                  });
                  state.onSetMultiSelectZones(d.surfaces ?? []);
                  state.onSetMultiSelectActive(true);
                };
                return (
                  <tr
                    onMouseEnter={() => {
                      if (!isSurfaceActive)
                        state.onSetHighlightZones(d.surfaces ?? []);
                    }}
                    onMouseLeave={() => {
                      if (!isSurfaceActive) state.onSetHighlightZones([]);
                    }}
                    className={ui.tbodyRow}>

                    {isOrphanHistoryRow ?
                      <td
                        className={`${ui.td} ${ui.tdGrip}`}
                        aria-hidden={true} /> :


                      <td className={`${ui.td} ${ui.tdGrip}`}>
                        <span className={ui.gripIcon}>
                          <svg
                            width="8"
                            height="16"
                            viewBox="0 0 8 16"
                            fill="currentColor">

                            <circle cx="2" cy="3" r="1.2" />
                            <circle cx="2" cy="8" r="1.2" />
                            <circle cx="2" cy="13" r="1.2" />
                            <circle cx="6" cy="3" r="1.2" />
                            <circle cx="6" cy="8" r="1.2" />
                            <circle cx="6" cy="13" r="1.2" />
                          </svg>
                        </span>
                      </td>}


                    {isOrphanHistoryRow ?
                      <td className={ui.tdPlain}>
                        <span className={ui.symptomName}>{name}</span>
                      </td> :

                      <td className={ui.tdPlain}>
                        <DiagnosisNameCell
                          name={name}
                          color={color}
                          activeRows={activeRows}
                          onSwap={(next) => {
                            if (next === name) return;
                            const currentDetails =
                              state.currentTreatmentHistoryDetails[name];
                            const nextDetails =
                              state.currentTreatmentHistoryDetails[next];
                            // Remove current, add next
                            if (name === "Implant") state.onToggleImplant(); else
                              state.onToggleToothDiagnosis(name);
                            if (next === "Implant") state.onToggleImplant(); else
                              state.onToggleToothDiagnosis(next);
                            state.onUpdateTreatmentHistoryDetail(next, {
                              surfaces: nextDetails?.surfaces?.length ?
                                nextDetails.surfaces :
                                currentDetails?.surfaces ??
                                getDefaultTreatmentSurfaces(next),
                              since:
                                nextDetails?.since ?? currentDetails?.since,
                              note: nextDetails?.note ?? currentDetails?.note
                            });
                            if (activeCell?.rowId === name)
                              setActiveCell({
                                rowId: next,
                                colKey: activeCell.colKey
                              });
                          }} />

                      </td>}


                    <td
                      className={`${ui.td} ${ui.tdRel} ${isSurfaceActive ? ui.tdActive : ""
                        }`}
                      onClick={(ev) => ev.stopPropagation()}>

                      {isSurfaceActive ?
                        <span className={ui.cellFocusRing} /> :
                        null}
                      <SurfaceCellDropdown
                        entry={{
                          id: name,
                          toothFdi: state.selectedTooth.fdi,
                          kind: "procedure",
                          name,
                          surfaces: d.surfaces ?? []
                        }}
                        arch={state.selectedTooth.arch}
                        toothPosition={state.selectedTooth.position}
                        mode="treatment"
                        isActive={isSurfaceActive}
                        onActivate={activateSurfaceCell}
                        onDeactivate={() => {
                          if (state.selectedZone === "whole")
                            state.onClearSelectedZone();
                          clearCellActive(name, "surfaces");
                        }}
                        onToggleZone={state.onToggleZoneMultiSelect}
                        onHover={state.onSetHighlightZones}
                        multiSelectZones={state.multiSelectZones} />

                    </td>
                    <td
                      className={`${ui.td} ${ui.tdRel} ${isSinceActive ? ui.tdActive : ""
                        }`}>

                      {isSinceActive ?
                        <span className={ui.cellFocusRing} /> :
                        null}
                      <SinceDropdown
                        value={d.since ?? ""}
                        onChange={(v) =>
                          state.onUpdateTreatmentHistoryDetail(name, {
                            since: v
                          })}

                        autoOpen={lastAddedName === name}
                        onFocusActivate={() =>
                          setActiveCell({
                            rowId: name,
                            colKey: "since"
                          })}

                        onBlurDeactivate={() => clearCellActive(name, "since")} />

                    </td>
                    <td
                      className={`${ui.td} ${ui.tdRel} ${isNoteActive ? ui.tdActive : ui.tdHover
                        }`}>

                      {isNoteActive ?
                        <span className={ui.cellFocusRing} /> :
                        null}
                      <input
                        type="text"
                        value={d.note ?? ""}
                        onChange={(e) =>
                          state.onUpdateTreatmentHistoryDetail(name, {
                            note: e.target.value
                          })}

                        onFocus={() =>
                          setActiveCell({
                            rowId: name,
                            colKey: "note"
                          })}

                        onBlur={() => clearCellActive(name, "note")}
                        placeholder="e.g. Monitor at next visit"
                        className={ui.primaryNoteInput} />

                    </td>
                    <td className={ui.tdStickyAct}>
                      <button
                        type="button"
                        onClick={() => removeRow(name)}
                        title="Remove"
                        className={ui.removeRowBtn}>

                        <Trash
                          size={14}
                          color="currentColor"
                          variant="Linear" />

                      </button>
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>}


      <div className={ui.searchBlockTop}>
        <div className={ui.searchRel}>
          <span className={ui.searchIconAbs}>
            <SearchNormal1 size={14} color="currentColor" variant="Linear" />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !queryTrim) return;
              const match = activeToothDiagnoses.find(
                (d) => d.toLowerCase() === queryTrim.toLowerCase()
              );
              if (match) {
                addDiagnosis(match);
                return;
              }
              if (!alreadyHasTypedTreatmentLabel) addDiagnosis(queryTrim);
            }}
            placeholder="Search & Add Treatment History"
            className={ui.searchInput} />


          {searchOpen &&
            pos && (
              filteredCatalog.length > 0 || queryTrim) &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                ref={searchPopoverRef}
                className={ui.portalListPlain}
                style={{
                  top: pos.top,
                  left: pos.left,
                  width: pos.width
                }}>

                {filteredCatalog.map((c) =>
                  <button
                    type="button"
                    onClick={() => addDiagnosis(c)}
                    className={ui.popoverItem}>

                    {c}
                  </button>
                )}
                {queryTrim &&
                  !catalogHasExactName &&
                  !alreadyHasTypedTreatmentLabel &&
                  <button
                    type="button"
                    className={ui.popoverAdd}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addDiagnosis(queryTrim)}>

                    <span className={ui.popoverAddInner}>
                      <Add size={14} color="currentColor" variant="Linear" />{" "}
                      Add "{queryTrim}"
                    </span>
                  </button>}

              </div>,
              document.body
            )}
        </div>
        {query.length === 0 &&
          <div className={ui.diagQuickChips}>
            {[
              "Implant",
              "RCT",
              "Missing",
              "Crown",
              "Bridge",
              "Denture",
              "Extraction"].
              map((chip) => {
                if (activeRows.includes(chip)) return null;
                return (
                  <button
                    type="button"
                    onClick={() => addDiagnosis(chip)}
                    className={ui.chipBtn}>

                    {chip}
                  </button>);

              })}
          </div>}

      </div>
    </div>);

}

// ──────────────────────────────────────────────────────────────
// useStickyActionEdge — sticky action-column shadow toggle
// ──────────────────────────────────────────────────────────────
function useStickyActionEdge(depKey) {
  const wrapRef = useRef(null);
  const [showEdge, setShowEdge] = useState(false);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      setShowEdge(false);
      return;
    }
    const update = () => {
      const maxScroll = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
      const hasOverflow = wrap.scrollWidth > wrap.clientWidth + 1;
      setShowEdge(hasOverflow && wrap.scrollLeft < maxScroll - 0.5);
    };
    update();
    wrap.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(update);
      ro.observe(wrap);
      const t = wrap.querySelector("table");
      if (t) ro.observe(t);
    }
    return () => {
      wrap.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, [depKey]);
  return { wrapRef, showEdge };
}

// ──────────────────────────────────────────────────────────────
// OralPositionCell — multi-select dropdown for oral regions
// ──────────────────────────────────────────────────────────────
function OralPositionCell({ value = [], onChange, onHoverPreview }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [query, setQuery] = useState("");
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const searchRef = useRef(null);

  const scrollRef = useRef(null);
  const [scrollMetrics, setScrollMetrics] = useState({ thumbTop: 0, thumbH: 0, visible: false });

  const updateScrollMetrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setScrollMetrics((m) => (m.visible ? { thumbTop: 0, thumbH: 0, visible: false } : m));
      return;
    }
    const trackPad = 8;
    const trackH = clientHeight - trackPad * 2;
    const thumbH = Math.max(28, (clientHeight / scrollHeight) * trackH);
    const maxThumbTop = trackH - thumbH;
    const thumbTop = trackPad + ((scrollTop / Math.max(1, scrollHeight - clientHeight)) * maxThumbTop);
    setScrollMetrics({ thumbTop, thumbH, visible: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(updateScrollMetrics, 60);
    return () => clearTimeout(t);
  }, [open, query, updateScrollMetrics]);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(440, Math.max(r.width, 360));
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const left = Math.max(8, Math.min(r.left, vw - w - 8));
    setPos({ top: r.bottom + 4, left, width: w });
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    place();
    const t = setTimeout(() => searchRef.current?.focus(), 30);
    const onDoc = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const reposition = () => place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, place]);

  const sel = new Set(value);

  const toggle = (id) => {
    const arr = reconcileOralPositions(value, id);
    onChange(arr);
    onHoverPreview?.(arr);
  };

  const shownPills = value;
  const pillStyle = {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(164,97,216,0.14)",
    color: "#703A9E",
    whiteSpace: "nowrap",
    flexShrink: 0
  };

  const tooltipTitle = value.length === 0 ? "" : value.map((v) => ORAL_POSITION_LABEL[v] || v).join(", ");

  return (
    <>
      <TPTooltip title={tooltipTitle} arrow placement="top" enterDelay={250}>
        <button
          ref={btnRef}
          type="button"
          onClick={() => {
            const n = !open;
            setOpen(n);
            if (n) onHoverPreview?.(value);
          }}
          className={`${ui.surfaceTriggerBtn} ${open ? ui.surfaceTriggerActive : ""}`}>
          <span className={ui.surfaceTriggerText} style={{ minWidth: 0, flex: 1 }}>
            {value.length === 0 ? (
              <span className={ui.surfacePlaceholder}>Select area</span>
            ) : (
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, rowGap: 4, minWidth: 0 }}>
                {shownPills.map((v) => (
                  <span key={v} style={pillStyle}>
                    {oralPositionShort(v)}
                  </span>
                ))}
              </span>
            )}
          </span>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}>
            <path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </TPTooltip>

      {open && pos && typeof document !== "undefined" && createPortal(
        (() => {
          const q = query.trim().toLowerCase();
          const checkSvg = (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          );

          const renderRow = (it, caption) => {
            const on = sel.has(it.id);
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => toggle(it.id)}
                  onMouseEnter={() =>
                    onHoverPreview?.([
                      ...value.filter((v) => v !== it.id),
                      ...(sel.has(it.id) ? [] : [it.id])
                    ])
                  }
                  className={ui.surfaceZoneBtn}
                  style={{ padding: "8px 12px", gap: 10 }}>
                  <span className={`${ui.surfaceCheck} ${on ? ui.surfaceCheckOn : ""}`}>
                    {on && checkSvg}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.3, gap: 2 }}>
                    <span className={ui.surfaceMenuLabel} style={{ fontSize: 14, color: "#1e293b" }}>
                      {it.label}
                    </span>
                    {caption ? <span style={{ fontSize: 12, color: "#94a3b8" }}>{caption}</span> : null}
                  </span>
                </button>
              </li>
            );
          };

          const groupHead = (label) => (
            <div
              key={label}
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#64748b",
                padding: "8px 12px 4px"
              }}>
              {label}
            </div>
          );

          const filtered = ORAL_POSITION_GROUPS.map((g) => ({
            group: g.group,
            items: g.items.filter((it) => !q || it.label.toLowerCase().includes(q))
          })).filter((g) => g.items.length);

          return (
            <div
              ref={popRef}
              className={ui.surfacePopover}
              style={{ top: pos.top, left: pos.left, width: pos.width, display: "flex", flexDirection: "column", overflow: "hidden", position: "fixed" }}>
              <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", background: "#f8fafc" }}>
                  <SearchNormal1 size={16} color="#94a3b8" variant="Linear" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search sites, regions, surfaces…"
                    style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#334155" }}
                  />
                  {query ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery("");
                        searchRef.current?.focus();
                      }}
                      style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <div
                  ref={scrollRef}
                  onScroll={updateScrollMetrics}
                  className={ui.surfacePopoverScroll}
                  style={{ padding: "10px 4px", maxHeight: "min(460px, 60vh)" }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                      No matching areas
                    </div>
                  ) : q ? (
                    <ul className={ui.surfaceZoneList} style={{ maxHeight: "none", overflow: "visible" }}>
                      {filtered.flatMap((g) => g.items.map((it) => renderRow(it, g.group)))}
                    </ul>
                  ) : (
                    <div style={{ columnCount: 2, columnGap: 8 }}>
                      {filtered.map((g) => (
                        <div key={`grp-${g.group}`} style={{ breakInside: "avoid", display: "block", marginBottom: 10, paddingInline: 8 }}>
                          {groupHead(g.group)}
                          <ul className={ui.surfaceZoneList} style={{ maxHeight: "none", overflow: "visible" }}>
                            {g.items.map((it) => renderRow(it))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {scrollMetrics.visible && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 8,
                      bottom: 8,
                      right: 4,
                      width: 6,
                      background: "var(--tp-slate-100, #f1f5f9)",
                      borderRadius: 999,
                      pointerEvents: "none"
                    }}
                  />
                )}
                {scrollMetrics.visible && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: scrollMetrics.thumbTop,
                      height: scrollMetrics.thumbH,
                      right: 4,
                      width: 6,
                      background: "var(--tp-slate-500, #64748b)",
                      borderRadius: 999,
                      pointerEvents: "none",
                      transition: "top 60ms linear"
                    }}
                  />
                )}
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// OralTable — record/edit grid with quick-add chips for a given kind
// ──────────────────────────────────────────────────────────────
function OralTable({ state, kind, catalog, list }) {
  const { wrapRef, showEdge } = useStickyActionEdge(list.length);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const [customDrawerOpen, setCustomDrawerOpen] = useState(false);
  const [customDrawerInitial, setCustomDrawerInitial] = useState("");

  const inputRef = useRef(null);
  const popRef = useRef(null);

  const has = (name) => list.some((e) => e.name === name);
  const q = query.trim().toLowerCase();
  const available = catalog.filter((c) => !has(c));
  const quickChips = available.slice(0, 8);
  const matches = q ? available.filter((c) => c.toLowerCase().includes(q)).slice(0, 30) : [];
  const queryTrim = query.trim();

  const catalogExact = !!queryTrim && catalog.some((c) => c.toLowerCase() === q);
  const alreadyAdded = !!queryTrim && list.some((e) => e.name.toLowerCase() === q);
  const showAddCustom = !!queryTrim && !catalogExact && !alreadyAdded;

  const usesBillItemDrawer = kind === "procedure";
  const placeholder = kind === "finding"
    ? "Search & add oral finding"
    : kind === "past"
      ? "Search & add past procedure"
      : "Search & add oral procedure";

  const addAndClear = (name) => {
    if (name) state.onAddOralEntry(kind, name);
    setQuery("");
    setSearchOpen(false);
  };

  const onAddCustom = () => {
    if (!queryTrim) return;
    setSearchOpen(false);
    if (usesBillItemDrawer) {
      setCustomDrawerInitial(queryTrim);
      setCustomDrawerOpen(true);
    } else {
      addAndClear(queryTrim);
    }
  };

  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    place();
    const onDoc = (e) => {
      if (inputRef.current && inputRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setSearchOpen(false);
    };
    const rp = () => place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", rp, true);
    window.addEventListener("resize", rp);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", rp, true);
      window.removeEventListener("resize", rp);
    };
  }, [searchOpen, place]);

  const showDropdown = searchOpen && q.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 14px 12px" }}>
      {list.length > 0 && (
        <div ref={wrapRef} className={`${ui.tableWrap} ${showEdge ? ui.scrolledEdge : ""}`}>
          <table className={ui.table}>
            <colgroup>
              <col style={{ minWidth: 150 }} />
              <col style={{ width: 220, minWidth: 200 }} />
              <col style={{ width: 120, minWidth: 110 }} />
              <col style={{ minWidth: 130 }} />
              <col style={{ width: 44, minWidth: 44, maxWidth: 44 }} />
            </colgroup>
            <thead>
              <tr className={ui.theadRow}>
                <th className={ui.th}>NAME</th>
                <th className={ui.th}>AREA</th>
                <th className={ui.th}>SINCE</th>
                <th className={ui.th}>NOTE</th>
                <th className={ui.thSticky} />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className={ui.tbodyRow}>
                  <td className={ui.tdPlain}>
                    <span className={ui.symptomName}>{e.name}</span>
                  </td>
                  <td className={ui.tdPlain}>
                    <OralPositionCell
                      value={e.surfaces || []}
                      onChange={(arr) => state.onUpdateOralEntry(e.id, { surfaces: arr })}
                      onHoverPreview={(arr) => state.onSetOralHighlight?.(arr)}
                    />
                  </td>
                  <td className={ui.tdPlain}>
                    <SinceDropdown
                      value={e.since || ""}
                      onChange={(v) => state.onUpdateOralEntry(e.id, { since: v })}
                    />
                  </td>
                  <td className={ui.tdPlain}>
                    <input
                      type="text"
                      value={e.note || ""}
                      onChange={(ev) => state.onUpdateOralEntry(e.id, { note: ev.target.value })}
                      placeholder="Add note…"
                      className={ui.symptomField}
                    />
                  </td>
                  <td className={ui.tdStickyAct}>
                    <button
                      type="button"
                      onClick={() => state.onRemoveOralEntry(e.id)}
                      title="Remove"
                      className={ui.removeRowBtn}>
                      <Trash size={20} color="currentColor" strokeWidth={1.5} variant="Linear" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={ui.searchRel}>
        <span className={ui.searchIconAbs}>
          <SearchNormal1 size={14} color="currentColor" variant="Linear" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(ev) => {
            setQuery(ev.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && q) {
              const exact = catalog.find((c) => c.toLowerCase() === q);
              addAndClear(exact || query.trim());
            } else if (ev.key === "Escape") {
              setSearchOpen(false);
            }
          }}
          placeholder={placeholder}
          className={ui.searchInput}
        />
      </div>

      {showDropdown && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
            maxHeight: 260,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(2,6,23,0.22)",
            padding: 6
          }}>
          {matches.length > 0 ? (
            matches.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addAndClear(name)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "12.5px",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "#334155",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}>
                {name}
              </button>
            ))
          ) : (
            !showAddCustom && (
              <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 10px", fontFamily: "Inter, sans-serif" }}>
                No matches
              </div>
            )
          )}
          {showAddCustom && (
            <button
              type="button"
              className={ui.popoverAdd}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onAddCustom}>
              {usesBillItemDrawer ? (
                <span className={ui.popoverAddInner}>
                  <Add size={16} color="var(--tp-blue-600)" variant="Bold" />
                  <span>Add "{queryTrim}" as custom dental service</span>
                </span>
              ) : (
                <span className={ui.popoverAddInner}>
                  <Add size={14} color="currentColor" variant="Linear" /> Add "{queryTrim}"
                </span>
              )}
            </button>
          )}
        </div>,
        document.body
      )}

      {!showDropdown && quickChips.length > 0 && (
        <div className={ui.chipRow}>
          {quickChips.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addAndClear(name)}
              className={ui.chipBtn}>
              {name}
            </button>
          ))}
        </div>
      )}

      {usesBillItemDrawer && (
        <AddDentalBillItemDrawer
          open={customDrawerOpen}
          onOpenChange={setCustomDrawerOpen}
          initialName={customDrawerInitial}
          onSaved={(item) => {
            addAndClear(item.name);
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// OralExamPanel — sidebar accordions for Findings, Past work, etc.
// ──────────────────────────────────────────────────────────────
export function OralExamPanel({ state }) {
  const entries = Array.isArray(state.oralEntries) ? state.oralEntries : [];
  const pastProcedures = entries.filter((e) => e.kind === "past");
  const findings = entries.filter((e) => e.kind === "finding");
  const procedures = entries.filter((e) => e.kind === "procedure");
  const notes = state.oralNotes || "";
  const [activeSection, setActiveSection] = useState("past");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const hasAnyData = entries.length > 0 || notes.trim().length > 0;

  useEffect(() => () => {
    state.onSetOralHighlight?.([]);
  }, []);

  const jumpTo = (id) => {
    if (activeSection === id) setActiveSection(null);
    else setActiveSection(id);
  };

  const clearAll = () => {
    entries.forEach((e) => state.onRemoveOralEntry(e.id));
    state.onUpdateOralNotes?.("");
    setShowClearConfirm(false);
  };

  return (
    <div className={ui.panelRoot}>
      <header className={ui.panelHeader}>
        <div className={ui.panelHeaderRow}>
          <div className={ui.panelHeaderLeft} style={{ minWidth: 0, flex: 1 }}>
            <div className={ui.panelThumb} style={{ flexShrink: 0 }}>
              <MiniScopeCanvas
                patientType={state.patientType ?? "adult"}
                scopeType="full-mouth"
                fdis={state.selectionScopeFdis ?? []}
                toothDiagnoses={state.toothDiagnoses}
                findingsByTooth={state.findingsByTooth}
                implantTeeth={state.implantTeeth}
                size={40}
              />
            </div>
            <div className={ui.panelTitleBlock} style={{ minWidth: 0 }}>
              <div className={ui.panelTitleRow}>
                <h3 className={ui.panelTitle} style={{ overflow: "visible", maxWidth: "none" }}>
                  Oral Examination
                </h3>
              </div>
            </div>
          </div>
          <div className={ui.panelHeaderActions}>
            <button type="button" className={ui.panelIconBtn} title="Template">
              <Grid5 color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
            </button>
            <button type="button" className={ui.panelIconBtn} title="Save">
              <Ram color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
            </button>
            <button
              type="button"
              title="Clear all oral examination data"
              disabled={!hasAnyData}
              onClick={() => setShowClearConfirm(true)}
              className={ui.panelIconBtnDanger}>
              <Eraser color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
            </button>
            <TPConfirmDialog
              open={showClearConfirm}
              onOpenChange={setShowClearConfirm}
              title="Are you sure you want to clear oral examination?"
              warning="This will remove all oral findings, procedures, and notes from this visit. This action cannot be undone."
              secondaryLabel="Yes, Clear All"
              secondaryTone="destructive"
              onSecondary={clearAll}
              primaryLabel="No, Keep It"
            />
            <div className={ui.panelDivider} />
            <button
              type="button"
              onClick={() => state.onBackToDentition()}
              className={ui.panelCloseBtn}
              title="Close panel">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256">
                <rect width="256" height="256" fill="none" />
                <polyline points="192 104 152 104 152 64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <line x1="208" y1="48" x2="152" y2="104" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <polyline points="64 152 104 152 104 192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <line x1="48" y1="208" x2="104" y2="152" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <polyline points="152 192 152 152 192 152" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <line x1="208" y1="208" x2="152" y2="152" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <polyline points="104 64 104 104 64 104" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <line x1="48" y1="48" x2="104" y2="104" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <div className={ui.panelBody}>
        <AccordionWrap
          open={activeSection === "past"}
          fitContent
          onExpand={() => jumpTo("past")}
          header={
            <SectionHeader
              title="Past Procedures"
              count={pastProcedures.length}
              medicalIcon="clipboard-activity"
              onTemplate={activeSection === "past" ? () => {} : undefined}
              onSave={activeSection === "past" ? () => {} : undefined}
              onClear={
                activeSection === "past"
                  ? () => {
                      pastProcedures.forEach((e) => state.onRemoveOralEntry(e.id));
                    }
                  : undefined
              }
              clearDisabled={pastProcedures.length === 0}
              chevron={activeSection === "past" ? "up" : "down"}
              onClick={() => jumpTo("past")}
              onChevronClick={() => jumpTo("past")}
            />
          }>
          <OralTable state={state} kind="past" catalog={ORAL_PROCEDURES} list={pastProcedures} />
        </AccordionWrap>

        <AccordionWrap
          open={activeSection === "findings"}
          fitContent
          onExpand={() => jumpTo("findings")}
          header={
            <SectionHeader
              title="Findings"
              count={findings.length}
              medicalIcon="diagnosis"
              onTemplate={activeSection === "findings" ? () => {} : undefined}
              onSave={activeSection === "findings" ? () => {} : undefined}
              onClear={
                activeSection === "findings"
                  ? () => {
                      findings.forEach((e) => state.onRemoveOralEntry(e.id));
                    }
                  : undefined
              }
              clearDisabled={findings.length === 0}
              chevron={activeSection === "findings" ? "up" : "down"}
              onClick={() => jumpTo("findings")}
              onChevronClick={() => jumpTo("findings")}
            />
          }>
          <OralTable state={state} kind="finding" catalog={ORAL_FINDINGS} list={findings} />
        </AccordionWrap>

        <AccordionWrap
          open={activeSection === "procedures"}
          fitContent
          onExpand={() => jumpTo("procedures")}
          header={
            <SectionHeader
              title="Procedures"
              count={procedures.length}
              medicalIcon="surgical-scissors-02"
              onTemplate={activeSection === "procedures" ? () => {} : undefined}
              onSave={activeSection === "procedures" ? () => {} : undefined}
              onClear={
                activeSection === "procedures"
                  ? () => {
                      procedures.forEach((e) => state.onRemoveOralEntry(e.id));
                    }
                  : undefined
              }
              clearDisabled={procedures.length === 0}
              chevron={activeSection === "procedures" ? "up" : "down"}
              onClick={() => jumpTo("procedures")}
              onChevronClick={() => jumpTo("procedures")}
            />
          }>
          <OralTable state={state} kind="procedure" catalog={ORAL_PROCEDURES} list={procedures} />
        </AccordionWrap>

        <AccordionWrap
          open={activeSection === "notes"}
          fitContent
          onExpand={() => jumpTo("notes")}
          header={
            <SectionHeader
              title="Overall Notes"
              medicalIcon="note-2"
              onTemplate={activeSection === "notes" ? () => {} : undefined}
              onSave={activeSection === "notes" ? () => {} : undefined}
              onClear={activeSection === "notes" ? () => state.onUpdateOralNotes?.("") : undefined}
              chevron={activeSection === "notes" ? "up" : "down"}
              onClick={() => jumpTo("notes")}
              onChevronClick={() => jumpTo("notes")}
            />
          }>
          <div className={ui.notesPad}>
            <textarea
              value={notes}
              onChange={(e) => state.onUpdateOralNotes?.(e.target.value)}
              placeholder="General notes for the oral examination…"
              className={ui.notesArea}
            />
          </div>
        </AccordionWrap>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// OralRecordsList — summary card with counts & tags per section
// ──────────────────────────────────────────────────────────────
export function OralRecordsList({ state }) {
  const entries = Array.isArray(state?.oralEntries) ? state.oralEntries : [];
  if (entries.length === 0) return null;

  const pastProcs = entries.filter((e) => e.kind === "past").map((e) => e.name);
  const findings = entries.filter((e) => e.kind === "finding").map((e) => e.name);
  const procs = entries.filter((e) => e.kind === "procedure").map((e) => e.name);
  const overallNotes = (state?.oralNotes || "").trim();

  const itemTagStyle = {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 12,
    fontWeight: 600,
    color: "#703A9E",
    background: "rgba(164,97,216,0.16)",
    padding: "3px 8px",
    borderRadius: 6,
    lineHeight: 1.4,
    whiteSpace: "nowrap",
    cursor: "default"
  };

  const fire = (detail) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("oral-tags-filter", { detail }));
    }
  };

  const onCardEnter = () => fire({ all: true });
  const onCardLeave = () => {
    fire(null);
    state?.onSetOralHighlight?.([]);
  };
  const onCardClick = () => {
    fire(null);
    state?.onSetOralHighlight?.([]);
    state.onEnterOralExam?.();
  };

  const onItemEnter = (kind, name) => {
    const e = entries.find((x) => x.kind === kind && x.name === name);
    if (e) state?.onSetOralHighlight?.(e.surfaces || []);
    fire({ kind, name });
  };

  const onItemLeave = () => {
    state?.onSetOralHighlight?.([]);
    fire({ all: true });
  };

  const sectionRow = (icon, label, items, key, kind) =>
    items.length === 0 ? null : (
      <div
        key={key}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          padding: "12px 14px",
          borderRadius: 10,
          background: "#f8fafc",
          border: "1px solid #eef2f7"
        }}>
        <span
          style={{
            display: "inline-flex",
            height: 32,
            width: 32,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            background: "rgba(164,97,216,0.12)",
            flexShrink: 0
          }}>
          <TPMedicalIcon name={icon} variant="bulk" size={16} color="var(--tp-violet-600)" />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: 1, textAlign: "left" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "0.1px" }}>
            {label} <span style={{ fontWeight: 500, color: "#94a3b8" }}>({items.length})</span>
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {items.map((it, i) => (
              <span
                key={`${key}-${i}`}
                style={itemTagStyle}
                title={it}
                onMouseEnter={(ev) => {
                  ev.stopPropagation();
                  onItemEnter(kind, it);
                }}
                onMouseLeave={(ev) => {
                  ev.stopPropagation();
                  onItemLeave();
                }}>
                {it}
              </span>
            ))}
          </div>
        </div>
      </div>
    );

  const notesRow = !overallNotes ? null : (
    <div
      key="notes"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: 10,
        background: "#f8fafc",
        border: "1px solid #eef2f7"
      }}>
      <span
        style={{
          display: "inline-flex",
          height: 32,
          width: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "rgba(164,97,216,0.12)",
          flexShrink: 0
        }}>
        <TPMedicalIcon name="note-2" variant="bulk" size={16} color="var(--tp-violet-600)" />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1, textAlign: "left" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Oral Notes</span>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#475569",
            lineHeight: 1.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}
          title={overallNotes}>
          {overallNotes}
        </p>
      </div>
    </div>
  );

  return (
    <div className={ui.recordsList} style={{ marginTop: 4 }}>
      <button
        type="button"
        onMouseEnter={onCardEnter}
        onMouseLeave={onCardLeave}
        onClick={onCardClick}
        className={`${ui.toothRow}`}>
        <div className={ui.toothRowHeader}>
          <div className={ui.toothThumb}>
            <MiniScopeCanvas
              patientType="adult"
              scopeType="full-mouth"
              fdis={[]}
              toothDiagnoses={{}}
              findingsByTooth={{}}
              implantTeeth={new Set()}
              size={52}
            />
          </div>
          <div className={ui.toothHeaderText}>
            <span className={ui.toothName} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              Oral Examination
              <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", background: "rgba(100,116,139,0.16)", padding: "1px 8px", borderRadius: 999, lineHeight: 1.4 }}>
                {entries.length}
              </span>
            </span>
          </div>
          <span className={ui.toothChevron} aria-hidden="true">
            <ExpandIcon size={17} />
          </span>
        </div>
        <div className={ui.toothRowDivider} aria-hidden="true" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sectionRow("clipboard-activity", "Past Procedures", pastProcs, "past", "past")}
          {sectionRow("diagnosis", "Findings", findings, "fnd", "finding")}
          {sectionRow("surgical-scissors-02", "Procedures", procs, "proc", "procedure")}
          {notesRow}
        </div>
      </button>
    </div>
  );
}
