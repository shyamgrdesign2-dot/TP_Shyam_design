import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { ZONE_INFO, getZoneLabel, QUADRANT_LABELS } from "./types";
import styles from "./DentitionTooltip.module.scss";

/**
 * DentitionTooltip — camera-relative tooltip that stays fixed on
 * screen regardless of tooth rotation. Only the leader line updates.
 *
 * @param {{ tooth: object, archPose: object, findings: Array, diagnoses: Set|undefined, isImplant: boolean, allEntries: Array|undefined, toothNotes: object|undefined }} props
 */
function DentitionTooltip({
  tooth,
  archPose,
  findings,
  diagnoses,
  isImplant,
  allEntries,
  toothNotes,
  treatmentHistoryDetails = {},
}) {
  const tooltipRef = useRef(null);
  const connectorRef = useRef(null);
  const { camera, gl, size } = useThree();
  // With the narrow side panel and wider 3D canvas, horizontal space on either
  // side of the arch is limited. Place tooltip ABOVE maxillary teeth and BELOW
  // mandibular teeth so it always lands in the whitespace outside the arch —
  // never behind a tooth.
  const isMax = tooth.arch === "maxillary";
  // Anchor near the outer edge of the tooth rather than its center, then keep
  // a consistent visual gap in screen-space via dynamic transform.
  const tooltipAnchorWorld = useMemo(() => {
    if (!archPose) return new THREE.Vector3();
    return new THREE.Vector3(
      archPose.position[0],
      archPose.position[1] + (isMax ? 0.72 : -0.72),
      archPose.position[2],
    );
  }, [archPose, isMax]);

  // Responsive sizing for smaller canvases.
  const isCompact = size.width < 980;
  const isTiny = size.width < 760;

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
      archPose.position[2],
    ).project(camera);
    const toothCenterX =
      canvasRect.left + (toothProjected.x * 0.5 + 0.5) * size.width;
    const toothCenterY =
      canvasRect.top + (-toothProjected.y * 0.5 + 0.5) * size.height;
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
      const safety = distToRect(
        toothCenterX,
        toothCenterY,
        rectLeft,
        rectTop,
        layoutW,
        layoutH,
      );
      const toothSafe = safety >= toothSafeRadius;
      return {
        ...s,
        safety,
        toothSafe,
      };
    });
    // Upper teeth should never pick "bottom" while a tooth-safe alternative exists.
    // This avoids cards sitting on top of the hovered upper crowns.
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
    // Fallback ladder:
    // 1) any fitting option in preferred pool
    // 2) tooth-safe option from all sides
    // 3) any option from all sides
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
    const chosen =
      fitOptions[0] ?? fallbackFits[0] ?? toothSafeAll[0] ?? anyAll[0];
    el.style.transform = `translate(${chosen.x}px, ${chosen.y}px)`;
    el.style.transformOrigin = chosen.origin;
    // Screen-space dashed connector that follows selected side and extends
    // slightly behind the tooltip edge for a visually continuous link.
    if (connector) {
      const edgePoint = (() => {
        if (chosen.side === "top")
          return {
            x: chosen.x + rect.width / 2,
            y: chosen.y + rect.height,
          };
        if (chosen.side === "bottom")
          return {
            x: chosen.x + rect.width / 2,
            y: chosen.y,
          };
        if (chosen.side === "right")
          return {
            x: chosen.x,
            y: chosen.y + rect.height / 2,
          };
        return {
          x: chosen.x + rect.width,
          y: chosen.y + rect.height / 2,
        };
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

  // Derive data for full overview sections.
  const diagLabels = [];
  if (diagnoses) {
    for (const d of diagnoses) diagLabels.push(d);
  }
  if (isImplant && !diagLabels.includes("Implant")) diagLabels.push("Implant");
  if (treatmentHistoryDetails) {
    Object.keys(treatmentHistoryDetails).forEach((key) => {
      if (!diagLabels.includes(key)) {
        diagLabels.push(key);
      }
    });
  }
  const toothEntries = useMemo(
    () => (allEntries ?? []).filter((e) => e.toothFdi === tooth.fdi),
    [allEntries, tooth.fdi],
  );
  const findingEntries = toothEntries.filter((e) => e.kind === "finding");
  const procedureEntries = toothEntries.filter((e) => e.kind === "procedure");
  const plannedEntries = toothEntries.filter((e) => e.kind === "planned");
  const symptomEntries = toothEntries.filter((e) => e.kind === "symptom");
  const noteText = toothNotes?.[tooth.fdi] ?? "";
  // Findings summary = legacy findings + entity-centric finding entries.
  const groupedFindings = useMemo(() => {
    const m = new Map();
    const push = (zoneId, label) => {
      const list = m.get(zoneId) || [];
      if (!list.includes(label)) list.push(label);
      m.set(zoneId, list);
    };
    for (const f of findings) push(f.zoneId, f.type);
    for (const entry of findingEntries) {
      const surfaces = entry.surfaces.length > 0 ? entry.surfaces : ["whole"];
      for (const surface of surfaces) push(surface, entry.name);
    }
    return Array.from(m.entries());
  }, [findings, findingEntries]);
  const treatmentHistory = [...diagLabels].filter(Boolean);
  const procedureSummary = [
    ...procedureEntries,
    ...plannedEntries,
    ...symptomEntries,
  ];

  // Has any content across all 4 sections?
  const hasContent =
    treatmentHistory.length > 0 ||
    groupedFindings.length > 0 ||
    procedureSummary.length > 0 ||
    noteText.length > 0;
  return (
    <>
      <Html
        position={[
          tooltipAnchorWorld.x,
          tooltipAnchorWorld.y,
          tooltipAnchorWorld.z,
        ]}
        style={{
          pointerEvents: "none",
        }}
        zIndexRange={[500, 300]}
      >
        <div
          ref={connectorRef}
          className={styles.connector}
        />

        <div
          ref={tooltipRef}
          className={`${styles.tooltipCard} ${isCompact ? styles.isCompact : ""} ${isTiny ? styles.isTiny : ""}`}
        >
          <div
            className={`${styles.tooltipHeader} ${hasContent ? styles.hasContent : ""}`}
          >
            <span className={styles.toothBadge}>
              T{tooth.fdi}
            </span>
            <span className={styles.toothLabel}>
              {QUADRANT_LABELS[tooth.quadrant]} {tooth.name}
            </span>
          </div>
          {treatmentHistory.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>Treatment History</div>
              <div className={styles.tagContainer}>
                {treatmentHistory.map((d) => (
                  <span key={d} className={styles.pillTag}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {groupedFindings.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>Findings</div>
              <div className={styles.findingsList}>
                {groupedFindings.map(([zid, types]) => {
                  const zc = ZONE_INFO[zid]?.color || "#888";
                  const zl =
                    zid === "whole"
                      ? "Whole Tooth"
                      : getZoneLabel(zid, tooth.arch, tooth.position);
                  return (
                    <div key={zid} className={styles.findingRow}>
                      <span
                        className={styles.findingDot}
                        style={{ background: zc }}
                      />

                      <span
                        className={styles.findingLabel}
                        style={{ color: zc }}
                      >
                        {zl}
                      </span>
                      <span className={styles.findingValue}>
                        {types.join(", ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {procedureSummary.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>Procedures</div>
              <div className={styles.tagContainer}>
                {procedureSummary.map((entry) => (
                  <span
                    key={entry.name}
                    className={`${styles.pillTag} ${
                      entry.kind === "planned"
                        ? styles.planned
                        : entry.kind === "symptom"
                          ? styles.symptom
                          : ""
                    }`}
                  >
                    {entry.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {noteText && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>Notes</div>
              <div className={styles.noteText}>
                "
                {noteText.length > (isTiny ? 64 : 80)
                  ? noteText.slice(0, isTiny ? 64 : 80) + "…"
                  : noteText}
                "
              </div>
            </div>
          )}

          {!hasContent && (
            <div className={styles.emptyHint}>
              Click on the tooth to start adding details
            </div>
          )}
        </div>
      </Html>
    </>
  );
}

export default DentitionTooltip;
