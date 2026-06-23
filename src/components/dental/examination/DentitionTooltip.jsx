import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { VISUAL_TYPE, getVisualType } from "../../../utils/dentalVisualTypes";
import { getZoneLabel, QUADRANT_LABELS } from "./types";
import tt from "./DentitionTooltip.module.scss";

/**
 * DentitionTooltip — camera-relative tooltip that stays fixed on
 * screen regardless of tooth rotation. Only the leader line updates.
 *
 * @param {{ tooth: object, archPose: object, findings: Array, diagnoses: Set|undefined, isImplant: boolean, allEntries: Array|undefined, toothNotes: object|undefined, treatmentHistoryDetails: object }} props
 */
function DentitionTooltip({
  tooth,
  archPose,
  findings = [],
  diagnoses,
  isImplant,
  allEntries = [],
  toothNotes = {},
  treatmentHistoryDetails = {},
}) {
  const tooltipRef = useRef(null);
  const connectorRef = useRef(null);
  const { camera, gl, size } = useThree();

  const violetAccent = {
    stroke: "#8B5CF6",
    badgeBg: "#8B5CF6",
    badgeText: "#ffffff",
  };

  const isMax = tooth.arch === "maxillary";

  // Anchor near the outer edge of the tooth rather than its center, then keep
  // a consistent visual gap in screen-space via dynamic transform.
  const tooltipAnchorWorld = useMemo(() => {
    if (!archPose) return new THREE.Vector3();
    return new THREE.Vector3(
      archPose.position[0],
      archPose.position[1] + (isMax ? 0.72 : -0.72),
      archPose.position[2]
    );
  }, [archPose, isMax]);

  // Responsive sizing for smaller canvases.
  const isCompact = size.width < 980;
  const isTiny = size.width < 760;
  const cardMinW = isTiny ? 200 : isCompact ? 220 : 240;
  const cardMaxW = isTiny ? 260 : isCompact ? 290 : 320;
  const cardPadding = isTiny ? "8px 10px" : "10px 13px";
  const titleSize = isTiny ? 12 : 13;
  const bodySize = isTiny ? 9 : 10;
  const sectionPad = isTiny ? "6px 8px" : "7px 9px";

  useFrame(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const connector = connectorRef.current;
    const canvasRect = gl.domElement.getBoundingClientRect();
    const projected = tooltipAnchorWorld.clone().project(camera);

    // Hide if clipped behind camera/frustum.
    if (projected.z < -1 || projected.z > 1) {
      el.style.opacity = "0";
      if (connector) connector.style.opacity = "0";
      return;
    }
    el.style.opacity = "1";
    if (connector) connector.style.opacity = "1";

    const anchorX = canvasRect.left + (projected.x * 0.5 + 0.5) * size.width;
    const anchorY = canvasRect.top + (-projected.y * 0.5 + 0.5) * size.height;

    const toothProjected = new THREE.Vector3(
      archPose.position[0],
      archPose.position[1],
      archPose.position[2]
    ).project(camera);
    const toothCenterX = canvasRect.left + (toothProjected.x * 0.5 + 0.5) * size.width;
    const toothCenterY = canvasRect.top + (-toothProjected.y * 0.5 + 0.5) * size.height;

    const gapPx = 30;
    const edgePad = 10;
    const rect = el.getBoundingClientRect();

    // Normalize placement behavior so empty cards choose sides like filled cards.
    const layoutW = Math.max(rect.width, isTiny ? 220 : 240);
    const layoutH = Math.max(rect.height, isTiny ? 150 : 170);
    const minX = canvasRect.left + edgePad;
    const maxX = canvasRect.right - edgePad - layoutW;
    const minY = canvasRect.top + edgePad;
    const maxY = canvasRect.bottom - edgePad - layoutH;

    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    const baseTopX = -layoutW / 2;
    const baseBottomX = -layoutW / 2;
    const baseRightY = -layoutH / 2;
    const baseLeftY = -layoutH / 2;

    // For side placements, nudge away from tooth center so cards don't sit over crown.
    const sideVerticalBias = isMax
      ? -Math.max(24, layoutH * 0.2)
      : Math.max(24, layoutH * 0.2);

    const topNaturalLeft = anchorX + baseTopX;
    const bottomNaturalLeft = anchorX + baseBottomX;
    const rightNaturalTop = anchorY + baseRightY;
    const leftNaturalTop = anchorY + baseLeftY;

    const topAdjX = clamp(topNaturalLeft, minX, maxX) - topNaturalLeft;
    const bottomAdjX = clamp(bottomNaturalLeft, minX, maxX) - bottomNaturalLeft;
    const rightAdjY = clamp(rightNaturalTop, minY, maxY) - rightNaturalTop;
    const leftAdjY = clamp(leftNaturalTop, minY, maxY) - leftNaturalTop;

    const sides = [
      {
        side: "top",
        fits: anchorY - gapPx - layoutH >= minY,
        free: anchorY - gapPx - layoutH - minY,
        x: baseTopX + topAdjX,
        y: -gapPx - layoutH,
        origin: "center bottom",
      },
      {
        side: "bottom",
        fits: anchorY + gapPx + layoutH <= canvasRect.bottom - edgePad,
        free: canvasRect.bottom - edgePad - (anchorY + gapPx + layoutH),
        x: baseBottomX + bottomAdjX,
        y: gapPx,
        origin: "center top",
      },
      {
        side: "right",
        fits: anchorX + gapPx + layoutW <= canvasRect.right - edgePad,
        free: canvasRect.right - edgePad - (anchorX + gapPx + layoutW),
        x: gapPx,
        y: baseRightY + rightAdjY + sideVerticalBias,
        origin: "left center",
      },
      {
        side: "left",
        fits: anchorX - gapPx - layoutW >= minX,
        free: anchorX - gapPx - layoutW - minX,
        x: -gapPx - layoutW,
        y: baseLeftY + leftAdjY + sideVerticalBias,
        origin: "right center",
      },
    ];

    const preferredOrder = isMax
      ? ["top", "right", "left", "bottom"]
      : ["bottom", "right", "left", "top"];

    const toothSafeRadius = isMax ? 72 : 50;
    const distToRect = (px, py, rx, ry, rw, rh) => {
      const dx = Math.max(rx - px, 0, px - (rx + rw));
      const dy = Math.max(ry - py, 0, py - (ry + rh));
      return Math.hypot(dx, dy);
    };

    const withSafety = sides.map((s) => {
      const rectLeft = anchorX + s.x;
      const rectTop = anchorY + s.y;
      const safety = distToRect(toothCenterX, toothCenterY, rectLeft, rectTop, layoutW, layoutH);
      const toothSafe = safety >= toothSafeRadius;
      return { ...s, safety, toothSafe };
    });

    const preferredPool = isMax
      ? withSafety.filter((s) => s.side !== "bottom")
      : withSafety;

    const fitOptions = preferredPool
      .filter((s) => s.fits && s.toothSafe)
      .sort((a, b) => {
        if (b.safety !== a.safety) return b.safety - a.safety;
        if (b.free !== a.free) return b.free - a.free;
        return preferredOrder.indexOf(a.side) - preferredOrder.indexOf(b.side);
      });

    const fallbackFits = preferredPool
      .filter((s) => s.fits)
      .sort((a, b) => b.free - a.free);

    const toothSafeAll = withSafety
      .filter((s) => s.toothSafe)
      .sort((a, b) => {
        if (b.safety !== a.safety) return b.safety - a.safety;
        return b.free - a.free;
      });

    const anyAll = withSafety.slice().sort((a, b) => b.free - a.free);
    const chosen = fitOptions[0] ?? fallbackFits[0] ?? toothSafeAll[0] ?? anyAll[0];

    el.style.transform = `translate(${chosen.x}px, ${chosen.y}px)`;
    el.style.transformOrigin = chosen.origin;

    if (connector) {
      const edgePoint = (() => {
        if (chosen.side === "top")
          return { x: chosen.x + rect.width / 2, y: chosen.y + rect.height };
        if (chosen.side === "bottom")
          return { x: chosen.x + rect.width / 2, y: chosen.y };
        if (chosen.side === "right")
          return { x: chosen.x, y: chosen.y + rect.height / 2 };
        return { x: chosen.x + rect.width, y: chosen.y + rect.height / 2 };
      })();
      const lenToEdge = Math.hypot(edgePoint.x, edgePoint.y);
      const ux = lenToEdge > 0.0001 ? edgePoint.x / lenToEdge : 0;
      const uy = lenToEdge > 0.0001 ? edgePoint.y / lenToEdge : -1;
      const extendBehind = 14;
      const targetX = edgePoint.x + ux * extendBehind;
      const targetY = edgePoint.y + uy * extendBehind;
      const len = Math.hypot(targetX, targetY);
      const angle = Math.atan2(targetY, targetX);
      connector.style.width = `${Math.max(18, len)}px`;
      connector.style.transform = `translateY(-50%) rotate(${angle}rad)`;
    }
  });

  const diagLabels = [];
  if (diagnoses) {
    for (const d of diagnoses) diagLabels.push(d);
  }
  if (isImplant && !diagLabels.some((d) => getVisualType(d) === VISUAL_TYPE.IMPLANT)) diagLabels.push("Implant");

  const toothEntries = useMemo(() => (allEntries ?? []).filter((e) => e.toothFdi === tooth.fdi), [allEntries, tooth.fdi]);
  const findingEntries = toothEntries.filter((e) => e.kind === "finding");
  const procedureEntries = toothEntries.filter((e) => e.kind === "procedure");
  const plannedEntries = toothEntries.filter((e) => e.kind === "planned");
  const symptomEntries = toothEntries.filter((e) => e.kind === "symptom");
  const noteText = toothNotes?.[tooth.fdi] ?? "";

  const treatmentHistory = useMemo(() => {
    const seen = new Set();
    const out = [];
    const add = (n) => {
      if (!n) return;
      const k = n.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(n);
    };
    diagLabels.forEach(add);
    Object.keys(treatmentHistoryDetails || {}).forEach(add);
    return out;
  }, [diagLabels, treatmentHistoryDetails]);

  const thMeta = (name) => {
    const d = treatmentHistoryDetails?.[name];
    if (!d) return "";
    const surfs = d.surfaces || [];
    const surfLabel = surfs.includes("whole")
      ? "Whole tooth"
      : surfs.map((z) => getZoneLabel(z, tooth.arch, tooth.position)).join(", ");
    const bits = [];
    if (surfLabel) bits.push(surfLabel);
    if ((d.since || "").trim()) bits.push(`since ${d.since.trim()}`);
    if ((d.note || "").trim()) bits.push(d.note.trim());
    return bits.join(" | ");
  };

  const procedureSummary = [...procedureEntries, ...plannedEntries, ...symptomEntries];

  const surfacesLabel = (surfs) => {
    const arr = surfs || [];
    if (arr.includes("whole")) return "Whole tooth";
    return arr.map((z) => getZoneLabel(z, tooth.arch, tooth.position)).join(", ");
  };

  const findingRows = useMemo(() => {
    const m = new Map();
    const ensure = (name) => {
      if (!m.has(name)) m.set(name, { surfaces: new Set(), since: "", note: "" });
      return m.get(name);
    };
    for (const f of findings) {
      if (!f?.type) continue;
      const r = ensure(f.type);
      if (f.zoneId) r.surfaces.add(f.zoneId);
    }
    for (const e of findingEntries) {
      const r = ensure(e.name);
      (e.surfaces || []).forEach((s) => r.surfaces.add(s));
      if (!r.since && e.since) r.since = e.since;
      if (!r.note && e.notes) r.note = e.notes;
    }
    return [...m.entries()].map(([name, r]) => {
      const bits = [];
      const surf = surfacesLabel([...r.surfaces]);
      if (surf) bits.push(surf);
      if ((r.since || "").trim()) bits.push(`since ${r.since.trim()}`);
      if ((r.note || "").trim()) bits.push(r.note.trim());
      return { name, meta: bits.join(" | ") };
    });
  }, [findings, findingEntries, tooth.arch, tooth.position]);

  const procedureRows = useMemo(() => {
    return procedureSummary.map((e) => {
      const bits = [];
      const surf = surfacesLabel(e.surfaces || []);
      if (surf) bits.push(surf);
      if (e.status) bits.push(e.status);
      if ((e.since || "").trim()) bits.push(`since ${e.since.trim()}`);
      if (e.plannedDate) bits.push(e.plannedDate);
      if ((e.notes || "").trim()) bits.push(e.notes.trim());
      return { id: e.id, name: e.name, meta: bits.join(" | ") };
    });
  }, [procedureSummary, tooth.arch, tooth.position]);

  const hasContent =
    treatmentHistory.length > 0 ||
    findingRows.length > 0 ||
    procedureRows.length > 0 ||
    noteText.length > 0;

  // Dynamic accent colours passed as CSS custom properties
  const accentVars = {
    "--tt-badge-bg": violetAccent.badgeBg,
    "--tt-badge-text": violetAccent.badgeText,
    "--tt-stroke": violetAccent.stroke,
  };

  return (
    <>
      <Html
        position={[tooltipAnchorWorld.x, tooltipAnchorWorld.y, tooltipAnchorWorld.z]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[500, 300]}
      >
        <div
          ref={connectorRef}
          className={tt.connector}
        />
        <div
          ref={tooltipRef}
          className={`${tt.tooltipCard} ${isCompact ? tt.isCompact : ""} ${isTiny ? tt.isTiny : ""}`}
          style={{ borderLeft: `3px solid ${violetAccent.stroke}`, ...accentVars }}
        >
          <div
            className={`${tt.tooltipHeader} ${hasContent ? tt.hasContent : ""}`}
          >
            <span
              className={tt.toothBadge}
            >
              T{tooth.fdi}
            </span>
            <span className={tt.toothLabel}>
              {QUADRANT_LABELS[tooth.quadrant]} {tooth.name}
            </span>
          </div>

          {treatmentHistory.length > 0 && (
            <div
              className={tt.section}
              style={{ marginBottom: (findingRows.length > 0 || procedureRows.length > 0 || noteText) ? "8px" : 0 }}
            >
              <div className={tt.sectionHeading}>Past Procedures</div>
              <div className={tt.findingsList}>
                {treatmentHistory.map((d) => {
                  const meta = thMeta(d);
                  return (
                    <div
                      key={d}
                      className={tt.findingRow}
                    >
                      <span className={tt.findingLabel}>{d}</span>
                      {meta ? (
                        <span className={tt.findingValue}> ({meta})</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {findingRows.length > 0 && (
            <div
              className={tt.section}
              style={{ marginBottom: (procedureRows.length > 0 || noteText) ? "8px" : 0 }}
            >
              <div className={tt.sectionHeading}>Findings</div>
              <div className={tt.findingsList}>
                {findingRows.map((r) => (
                  <div
                    key={r.name}
                    className={tt.findingRow}
                  >
                    <span className={tt.findingLabel}>{r.name}</span>
                    {r.meta ? (
                      <span className={tt.findingValue}> ({r.meta})</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {procedureRows.length > 0 && (
            <div
              className={tt.section}
              style={{ marginBottom: noteText ? "8px" : 0 }}
            >
              <div className={tt.sectionHeading}>Procedures</div>
              <div className={tt.findingsList}>
                {procedureRows.map((r) => (
                  <div
                    key={r.id}
                    className={tt.findingRow}
                  >
                    <span className={tt.findingLabel}>{r.name}</span>
                    {r.meta ? (
                      <span className={tt.findingValue}> ({r.meta})</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {noteText && (
            <div className={tt.section}>
              <div className={tt.sectionHeading}>Notes</div>
              <div className={tt.noteText}>
                “{noteText.length > (isTiny ? 64 : 80) ? noteText.slice(0, isTiny ? 64 : 80) + "…" : noteText}”
              </div>
            </div>
          )}

          {!hasContent && (
            <div className={tt.emptyHint}>
              Click on the tooth to start adding details
            </div>
          )}
        </div>
      </Html>
    </>
  );
}

export default DentitionTooltip;
