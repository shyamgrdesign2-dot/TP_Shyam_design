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
    // Show annotation for EVERY zone that has a finding/note, PLUS the
    // currently-selected zone (even if empty) — so users get an immediate
    // visual confirmation of their selection.
    const set = new Set(
      Object.keys(zoneFindings).filter(
        (z) =>
          (zoneFindings[z]?.length ?? 0) > 0 ||
          (zoneNotes[z] && zoneNotes[z].trim()),
      ),
    );
    if (selectedZone) set.add(selectedZone);
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
  ]);
  if (annotationPoints.length === 0) return null;
  return (
    <group>
      {annotationPoints.map((point) => {
        const isExpanded = expandedAnnotation === point.id;
        const isSelected = selectedZone === point.zoneId;
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
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
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
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background:
                      isExpanded || isSelected
                        ? zoneColor
                        : "rgba(70, 70, 75, 0.65)",
                    color:
                      isExpanded || isSelected
                        ? "#fff"
                        : "rgba(255,255,255,0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    cursor: "pointer",
                    boxShadow:
                      isExpanded || isSelected
                        ? `0 0 0 2px rgba(255,255,255,0.5)`
                        : "0 1px 3px rgba(0,0,0,0.25)",
                    border: `1.5px solid ${isExpanded || isSelected ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)"}`,
                    transition: "all 0.2s ease",
                    zIndex: isExpanded ? 10 : 1,
                    letterSpacing: "-0.3px",
                  }}
                >
                  {abbr}
                </div>
                {isExpanded && (
                  <div
                    data-dental-annotation-ui="true"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      position: "absolute",
                      left: 24,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 20,
                    }}
                  >
                    <div
                      style={{
                        width: 55,
                        height: 0,
                        borderTop: "1.5px dashed rgba(100, 100, 110, 0.5)",
                        flexShrink: 0,
                      }}
                    />

                    <div
                      data-dental-annotation-ui="true"
                      style={{
                        minWidth: 150,
                        maxWidth: 200,
                        background: "rgba(0, 0, 0, 0.78)",
                        backdropFilter: "blur(14px)",
                        WebkitBackdropFilter: "blur(14px)",
                        borderRadius: 8,
                        padding: "10px 13px",
                        color: "#fff",
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
                        animation: "dentalCanvasAnnotFadeIn 0.15s ease-out",
                        borderLeft: `3px solid ${zoneColor}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          marginBottom: diagnoses.length > 0 ? 7 : 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          lineHeight: 1.3,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: zoneColor,
                            flexShrink: 0,
                          }}
                        />

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
                        const sectionLabelStyle = {
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                          color: "rgba(255,255,255,0.55)",
                          marginBottom: 3,
                        };
                        const tagRowStyle = {
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                        };
                        const tagStyle = {
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.12)",
                          color: "#ddd",
                          fontWeight: 500,
                          lineHeight: 1.4,
                        };
                        return (
                          <>
                            {historyList.length > 0 && (
                              <div
                                style={{
                                  marginBottom:
                                    findingsList.length > 0 ||
                                    proceduresList.length > 0 ||
                                    notes
                                      ? 7
                                      : 0,
                                }}
                              >
                                <div style={sectionLabelStyle}>
                                  Treatment History
                                </div>
                                <div style={tagRowStyle}>
                                  {historyList.map((d, i) => (
                                    <span style={tagStyle}>{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {findingsList.length > 0 && (
                              <div
                                style={{
                                  marginBottom:
                                    proceduresList.length > 0 || notes ? 7 : 0,
                                }}
                              >
                                <div style={sectionLabelStyle}>Findings</div>
                                <div style={tagRowStyle}>
                                  {findingsList.map((d, i) => (
                                    <span style={tagStyle}>{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {proceduresList.length > 0 && (
                              <div
                                style={{
                                  marginBottom: notes ? 7 : 0,
                                }}
                              >
                                <div style={sectionLabelStyle}>Procedures</div>
                                <div style={tagRowStyle}>
                                  {proceduresList.map((d, i) => (
                                    <span style={tagStyle}>{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      {notes.trim() && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#aaa",
                            lineHeight: 1.4,
                            borderTop: "1px solid rgba(255,255,255,0.1)",
                            paddingTop: 6,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
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
