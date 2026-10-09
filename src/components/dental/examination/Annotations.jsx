import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { ZONE_INFO, getZoneLabel, getZoneAbbr } from "./types";
export function Annotations({
  toothMesh,
  findings,
  zoneNotes,
  arch,
  toothPosition,
  quadrant,
  selectedZone,
  multiSelectZones,
  multiSelectActive,
  onSelectZone,
  onClearSelectedZone,
  zoneDirs,
  meshBounds,
}) {
  const [expandedAnnotation, setExpandedAnnotation] = useState(null);
  const [occludedAnnotations, setOccludedAnnotations] = useState({});
  const prevFindingsRef = useRef("");
  // Smart auto-expand: show tooltip when user selects a zone that has findings,
  // or when a new finding is added to the currently selected zone
  useEffect(() => {
    if (!selectedZone) {
      setExpandedAnnotation(null);
      return;
    }
    const zoneHasFindings = findings.some((f) => f.zoneId === selectedZone);
    const zoneHasNotes = zoneNotes[selectedZone]?.trim();
    const annotId = `annot-${selectedZone}`;
    // Build a fingerprint of current findings for this zone
    const currentFingerprint = findings
      .filter((f) => f.zoneId === selectedZone)
      .map((f) => f.id)
      .sort()
      .join(",");
    // Auto-expand the tooltip on EVERY zone selection (even if the zone has
    // no findings yet) — user immediately sees which surface is selected.
    // When findings are added later, the fingerprint changes and we re-expand
    // to reflect the new content.
    setExpandedAnnotation(annotId);
    // Suppress unused-var warnings (reserved for potential conditional logic)
    void zoneHasFindings;
    void zoneHasNotes;
    prevFindingsRef.current = currentFingerprint;
  }, [findings, selectedZone, zoneNotes]);
  useEffect(() => {
    if (!expandedAnnotation) return;
    const handlePointerDown = (e) => {
      const target = e.target;
      if (target?.closest('[data-dental-annotation-ui="true"]')) return;
      setExpandedAnnotation(null);
      if (selectedZone === "whole") onClearSelectedZone?.();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [expandedAnnotation, onClearSelectedZone, selectedZone]);
  const handleOcclude = useCallback((pointId, hidden) => {
    setOccludedAnnotations((prev) => {
      if (prev[pointId] === hidden) return prev;
      return {
        ...prev,
        [pointId]: hidden,
      };
    });
  }, []);
  const zoneFindings = useMemo(() => {
    const grouped = {};
    for (const f of findings) {
      if (!grouped[f.zoneId]) grouped[f.zoneId] = [];
      grouped[f.zoneId].push(f);
    }
    return grouped;
  }, [findings]);
  const annotationPoints = useMemo(() => {
    if (!toothMesh || !zoneDirs || !meshBounds) return [];
    const raycaster = new THREE.Raycaster();
    const { center, size, cervicalY, occlusalMidY, bb } = meshBounds;
    const points = [];
    const set = new Set(Object.keys(zoneFindings));
    if (selectedZone) set.add(selectedZone);
    if (multiSelectActive && multiSelectZones) {
      for (const z of multiSelectZones) set.add(z);
    }
    const zonesWithData = Array.from(set);
    for (const zoneId of zonesWithData) {
      const zoneFindingsList = zoneFindings[zoneId] || [];
      let outwardDir;
      let rayY;
      switch (zoneId) {
        case "whole":
          outwardDir = new THREE.Vector3(0, 1, 0);
          rayY = bb.max.y + size.y * 0.18;
          points.push({
            id: `annot-${zoneId}`,
            zoneId,
            position: new THREE.Vector3(center.x, rayY, center.z),
            normal: outwardDir,
            findings: zoneFindingsList,
          });
          continue;
        case "occlusal":
          outwardDir = new THREE.Vector3(0, arch === "maxillary" ? -1 : 1, 0);
          rayY = arch === "maxillary" ? bb.min.y - 1 : bb.max.y + 1;
          break;
        case "buccal":
          outwardDir = zoneDirs.buccal?.clone() || new THREE.Vector3(0, 0, 1);
          rayY = occlusalMidY;
          break;
        case "lingual":
          outwardDir = zoneDirs.lingual?.clone() || new THREE.Vector3(0, 0, -1);
          rayY = occlusalMidY;
          break;
        case "mesial":
          outwardDir = zoneDirs.mesial?.clone() || new THREE.Vector3(1, 0, 0);
          rayY = occlusalMidY;
          break;
        case "distal":
          outwardDir = zoneDirs.distal?.clone() || new THREE.Vector3(-1, 0, 0);
          rayY = occlusalMidY;
          break;
        case "cervical":
          outwardDir = zoneDirs.buccal?.clone() || new THREE.Vector3(0, 0, 1);
          rayY = cervicalY;
          break;
        case "root":
          outwardDir = zoneDirs.buccal?.clone() || new THREE.Vector3(0, 0, 1);
          rayY =
            arch === "maxillary"
              ? bb.max.y - size.y * 0.15
              : bb.min.y + size.y * 0.15;
          break;
        default:
          continue;
      }
      const inwardDir = outwardDir.clone().negate().normalize();
      const rayOrigin = new THREE.Vector3(
        center.x + outwardDir.x * 2,
        rayY,
        center.z + outwardDir.z * 2,
      );
      if (zoneId === "occlusal") {
        rayOrigin.set(center.x, rayY, center.z);
      }
      raycaster.set(rayOrigin, inwardDir);
      const hits = raycaster.intersectObject(toothMesh, false);
      let position;
      let normal;
      if (hits.length > 0) {
        const hitNormal = hits[0].face
          ? hits[0].face.normal
              .clone()
              .transformDirection(toothMesh.matrixWorld)
              .normalize()
          : outwardDir;
        position = hits[0].point
          .clone()
          .add(hitNormal.clone().multiplyScalar(0.02));
        normal = hitNormal;
      } else {
        position = new THREE.Vector3(
          center.x + outwardDir.x * size.x * 0.4,
          rayY,
          center.z + outwardDir.z * size.z * 0.4,
        );
        normal = outwardDir;
      }
      points.push({
        id: `annot-${zoneId}`,
        zoneId,
        position,
        normal,
        findings: zoneFindingsList,
      });
    }
    return points;
  }, [
    toothMesh,
    zoneFindings,
    zoneNotes,
    zoneDirs,
    meshBounds,
    arch,
    selectedZone,
    multiSelectZones,
    multiSelectActive,
  ]);
  if (annotationPoints.length === 0) return null;
  return (
    <group>
      {annotationPoints.map((point) => {
        const isExpanded = expandedAnnotation === point.id;
        const isSelected = selectedZone === point.zoneId ||
          (multiSelectActive && (multiSelectZones?.has(point.zoneId) ?? false));
        const isOccluded = occludedAnnotations[point.id] || false;
        // Keep selected/expanded annotation UI visible even if occlusion says hidden.
        // Root/cervical points often sit close to geometry and can be falsely marked occluded.
        const suppressByOcclusion = isOccluded && !isSelected && !isExpanded;
        const zoneColor = ZONE_INFO[point.zoneId]?.color || "#666";
        const zoneLabel = getZoneLabel(point.zoneId, arch, toothPosition);
        const diagnoses = point.findings.map((f) => f.type);
        const notes =
          zoneNotes[point.zoneId] ||
          point.findings
            .map((f) => f.notes?.trim())
            .filter(Boolean)
            .join(" · ");
        const abbr = getZoneAbbr(point.zoneId, arch, toothPosition);
        const baseOpacity = suppressByOcclusion ? 0.15 : isSelected ? 1 : 0.75;
        return (
          <group position={point.position}>
            <Html
              center={true}
              occlude={!isSelected && !isExpanded}
              onOcclude={(hidden) => handleOcclude(point.id, hidden)}
              style={{
                pointerEvents: suppressByOcclusion ? "none" : "auto",
                userSelect: "none",
                opacity: baseOpacity,
                transition: "opacity 0.15s ease",
              }}
              zIndexRange={[100, 0]}
            >
              <div
                data-dental-annotation-ui="true"
                className="annot-wrap"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isExpanded) {
                      setExpandedAnnotation(null);
                    } else {
                      setExpandedAnnotation(point.id);
                      onSelectZone(point.zoneId);
                    }
                  }}
                  className={`annot-badge${isExpanded ? " annot-badge--expanded" : ""}`}
                  style={{
                    "--annot-zone-color": zoneColor,
                    "--annot-badge-bg": isExpanded || isSelected ? zoneColor : "rgba(70, 70, 75, 0.65)",
                    "--annot-badge-color": isExpanded || isSelected ? "#fff" : "rgba(255,255,255,0.9)",
                    "--annot-badge-shadow": isExpanded || isSelected ? `0 0 0 2px rgba(255,255,255,0.5)` : "0 1px 3px rgba(0,0,0,0.25)",
                    "--annot-badge-border": `1.5px solid ${isExpanded || isSelected ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)"}`,
                  }}
                >
                  {abbr}
                </div>
                {isExpanded && (
                  <div
                    data-dental-annotation-ui="true"
                    className="annot-expanded"
                  >
                    <div className="annot-connector" />

                    <div
                      data-dental-annotation-ui="true"
                      className="annot-panel"
                      style={{ "--annot-zone-color": zoneColor }}
                    >
                      <div
                        className={`annot-panel-header${diagnoses.length > 0 ? " annot-panel-header--with-content" : ""}`}
                      >
                        <span className="annot-zone-dot" />
                        {zoneLabel}
                      </div>
                      {(() => {
                        const historyList = diagnoses
                          .filter(
                            (d) => d.startsWith("Hx:") || d.startsWith("Dx:"),
                          )
                          .map((d) => d.slice(3).trim());
                        const findingsList = diagnoses
                          .filter(
                            (d) =>
                              d.startsWith("Fn:") ||
                              (!d.startsWith("Pr:") &&
                                !d.startsWith("Dx:") &&
                                !d.startsWith("Hx:")),
                          )
                          .map((d) =>
                            d.startsWith("Fn:") ? d.slice(3).trim() : d,
                          );
                        const proceduresList = diagnoses
                          .filter((d) => d.startsWith("Pr:"))
                          .map((d) => d.slice(3).trim());
                        return (
                          <>
                            {historyList.length > 0 && (
                              <div
                                className={`annot-sec${findingsList.length > 0 || proceduresList.length > 0 || notes ? " annot-sec--spaced" : ""}`}
                              >
                                <div className="annot-sec-label">Treatment History</div>
                                <div className="annot-tag-row">
                                  {historyList.map((d, i) => (
                                    <span key={i} className="annot-tag">{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {findingsList.length > 0 && (
                              <div
                                className={`annot-sec${proceduresList.length > 0 || notes ? " annot-sec--spaced" : ""}`}
                              >
                                <div className="annot-sec-label">Findings</div>
                                <div className="annot-tag-row">
                                  {findingsList.map((d, i) => (
                                    <span key={i} className="annot-tag">{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {proceduresList.length > 0 && (
                              <div
                                className={`annot-sec${notes ? " annot-sec--spaced" : ""}`}
                              >
                                <div className="annot-sec-label">Procedures</div>
                                <div className="annot-tag-row">
                                  {proceduresList.map((d, i) => (
                                    <span key={i} className="annot-tag">{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      {notes.trim() && (
                        <div className="annot-notes">
                          {notes.trim()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
