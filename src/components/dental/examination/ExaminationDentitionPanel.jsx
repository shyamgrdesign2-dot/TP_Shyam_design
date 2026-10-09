/**
 * ExaminationDentitionPanel — the dentition (whole-arch) summary view extracted
 * from ExaminationTab: Patient Dental Score gauge + per-tooth summary rows.
 * Clicking a summary row opens that tooth's single-tooth view.
 *
 * SummaryPill / SummaryPillSegmented / ScoreCard / ScoreTooltip / TooltipRow are
 * internal helpers used only by DentitionPanel.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InfoCircle } from "iconsax-reactjs";
import { VISUAL_TYPE, getVisualType } from "../../../utils/dentalVisualTypes";
import { QUADRANT_LABELS } from "./types";
import { getTeethForPatientType } from "./hooks/canvas-interaction-helpers";
import { ExpandIcon } from "./ui-icons";

import { TPMedicalIcon } from "../tp-ui";
import { uniquePartList } from "./examination-chip-helpers";
import { OralRecordsList } from "./ExaminationOralPanel";
import ui from "./ExaminationTab.ui.module.scss";
import { ASSETS } from "../../../assets";

// ──────────────────────────────────────────────────────────────
// Dentition panel: Patient Dental Score + per-tooth summary
// Clicking any summary row → opens that tooth's single view.
// ──────────────────────────────────────────────────────────────
export function DentitionPanel({ state, hasApiExaminationData = false }) {
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
      if (!e.diagnoses.some((d) => getVisualType(d) === VISUAL_TYPE.IMPLANT)) e.diagnoses.push("Implant");
    });
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
    const teeth = getTeethForPatientType(state.patientType);
    const tooth = teeth.find((t) => t.fdi === fdi);
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
                    const tooth = getTeethForPatientType(state?.patientType).find((t) => t.fdi === entry.fdi);
                    const toothName = tooth ?
                      `${QUADRANT_LABELS[tooth.quadrant]} ${tooth.name}` :
                      "";
                    // Determine thumbnail color by most-severe diagnosis
                    let crownColor = "#E8DDD5",
                      rootColor = "#C4AD97";
                    const entryVts = new Set(entry.diagnoses.map(getVisualType).filter(Boolean));
                    if (entryVts.has(VISUAL_TYPE.MISSING)) {
                      crownColor = "#d1d5db";
                      rootColor = "#d1d5db";
                    } else if (entryVts.has(VISUAL_TYPE.CROWN) || entryVts.has(VISUAL_TYPE.BRIDGE)) {
                      crownColor = "#d1d5db";
                      rootColor = "#C4AD97";
                    } else if (entryVts.has(VISUAL_TYPE.RCT)) {
                      crownColor = "#f87171";
                      rootColor = "#C4AD97";
                    } else if (entryVts.has(VISUAL_TYPE.IMPLANT)) {
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
                              <TPMedicalIcon
                                name="tooth"
                                variant="bulk"
                                size={32}
                                color={crownColor} />}
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
                    <div key={item.step} className={ui.stepRow}>
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
                  src={ASSETS.dental.tutorial}
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
          <React.Fragment key={p}>
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
