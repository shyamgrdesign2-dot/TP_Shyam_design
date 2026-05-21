import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { Html } from "@react-three/drei";
import {
  TEETH,
  PEDIATRIC_TEETH,
  ARCH_POSITIONS,
  PEDIATRIC_ARCH_POSITIONS,
} from "./types";
import ArchTooth from "./ArchTooth";
import DentitionTooltip from "./DentitionTooltip";

/**
 * ScopeHotspot — 3D-space overlay button for selecting a quadrant scope.
 *
 * @param {{ label: string, position: number[], onClick: function, emphasized?: boolean }} props
 */
const ScopeHotspot = memo(function ScopeHotspot({
  label,
  position,
  onClick,
  emphasized = false,
}) {
  return (
    <Html
      position={position}
      transform={true}
      occlude={true}
      zIndexRange={[220, 80]}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          cursor: "pointer",
          minWidth: emphasized ? 64 : 44,
          height: emphasized ? 30 : 28,
          borderRadius: emphasized ? 16 : 14,
          border: "1px solid rgba(255,255,255,0.42)",
          background: emphasized
            ? "rgba(30, 41, 59, 0.78)"
            : "rgba(15, 23, 42, 0.66)",
          color: "#f8fafc",
          fontSize: emphasized ? 12 : 11,
          fontWeight: 700,
          padding: "0 12px",
          boxShadow: "0 4px 14px rgba(2, 6, 23, 0.22)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          transition:
            "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.background = emphasized
            ? "rgba(15, 23, 42, 0.88)"
            : "rgba(30, 41, 59, 0.78)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(2, 6, 23, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.background = emphasized
            ? "rgba(30, 41, 59, 0.78)"
            : "rgba(15, 23, 42, 0.66)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(2, 6, 23, 0.22)";
        }}
      >
        {label}
      </button>
    </Html>
  );
});

/**
 * DentitionView — grid layout shell that arranges all arch teeth, scope
 * hotspots, guide lines, and the active tooltip.
 *
 * @param {{ patientType: string, visibleFdis: string[]|undefined, disableSelection?: boolean, layoutMode?: string, showGuides?: boolean, showScopeHotspots?: boolean, onSelectScope?: function, toothDiagnoses: object, findingsByTooth: object, implantTeeth: Set, onSelectTooth: function, onHoverTooth?: function, externalHoveredFdi?: string|null, allEntries?: Array, toothNotes?: object, agentPulseFdis?: Set, showTreatmentTags?: boolean }} props
 */
export default function DentitionView({
  patientType,
  visibleFdis,
  disableSelection = false,
  layoutMode = "split",
  showGuides = false,
  showScopeHotspots = false,
  onSelectScope,
  toothDiagnoses,
  findingsByTooth,
  implantTeeth,
  onSelectTooth,
  onHoverTooth,
  externalHoveredFdi,
  allEntries,
  toothNotes,
  agentPulseFdis,
  showTreatmentTags = true,
  treatmentHistoryDetailsByTooth = {},
}) {
  const USE_SPLIT_QUADRANT_EXPERIMENT = layoutMode === "split";
  const [hoveredTooth, setHoveredToothInternal] = useState(null);
  // Wrap setter to also notify parent.
  const setHoveredTooth = useCallback(
    (v) => {
      setHoveredToothInternal(v);
      onHoverTooth?.(v);
    },
    [onHoverTooth],
  );
  // Merge externally-driven hover (e.g. from summary card hover).
  const effectiveHovered = externalHoveredFdi ?? hoveredTooth;
  const [pinnedTooth, setPinnedTooth] = useState(null);
  // Clear pinned tooltip on background tap / ESC
  useEffect(() => {
    const onDoc = (e) => {
      // If click lands on the canvas but NOT on a tooth (no stopPropagation), clear pin.
      // We rely on the tooth's onClick having already fired and set pinnedTooth.
      // This timeout defers so the tooth's handler runs first.
      setTimeout(() => {
        const target = e.target;
        if (!target.closest("canvas")) setPinnedTooth(null);
      }, 0);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setPinnedTooth(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onDoc);
    };
  }, []);
  const activeFdi = effectiveHovered || pinnedTooth;
  const isPediatricOnly = patientType === "pediatric";
  const isMixed = patientType === "mixed";
  const activeTeeth = isMixed
    ? [...TEETH, ...PEDIATRIC_TEETH]
    : isPediatricOnly
      ? PEDIATRIC_TEETH
      : TEETH;
  const activePositions = useMemo(() => {
    if (isMixed) {
      const mixed = {};
      // Adult arches stay top/bottom. Pediatric arches sit in-between.
      const adultUpperYOffset = 2.25;
      const adultLowerYOffset = -1.9;
      const pedUpperYOffset = 0.2;
      const pedLowerYOffset = -0.15;
      for (const tooth of TEETH) {
        const base = ARCH_POSITIONS[tooth.fdi];
        if (!base) continue;
        const yShift =
          tooth.arch === "maxillary" ? adultUpperYOffset : adultLowerYOffset;
        const xShift = USE_SPLIT_QUADRANT_EXPERIMENT
          ? tooth.quadrant === "upper-left" || tooth.quadrant === "lower-left"
            ? 0.35
            : -0.35
          : 0;
        mixed[tooth.fdi] = {
          position: [
            base.position[0] + xShift,
            base.position[1] + yShift,
            base.position[2],
          ],

          rotation: base.rotation,
        };
      }
      for (const tooth of PEDIATRIC_TEETH) {
        const base = PEDIATRIC_ARCH_POSITIONS[tooth.fdi];
        if (!base) continue;
        const yShift =
          tooth.arch === "maxillary" ? pedUpperYOffset : pedLowerYOffset;
        const xShift = USE_SPLIT_QUADRANT_EXPERIMENT
          ? tooth.quadrant === "upper-left" || tooth.quadrant === "lower-left"
            ? 0.35
            : -0.35
          : 0;
        mixed[tooth.fdi] = {
          position: [
            base.position[0] + xShift,
            base.position[1] + yShift,
            base.position[2],
          ],

          rotation: base.rotation,
        };
      }
      return mixed;
    }
    const baseline = isPediatricOnly
      ? PEDIATRIC_ARCH_POSITIONS
      : ARCH_POSITIONS;
    if (!USE_SPLIT_QUADRANT_EXPERIMENT) return baseline;
    const split = {};
    for (const tooth of activeTeeth) {
      const base = baseline[tooth.fdi];
      if (!base) continue;
      const isUpper = tooth.arch === "maxillary";
      const isLeft =
        tooth.quadrant === "upper-left" || tooth.quadrant === "lower-left";
      split[tooth.fdi] = {
        position: [
          base.position[0] + (isLeft ? 0.5 : -0.5),
          base.position[1] + (isUpper ? 0.42 : -0.42),
          base.position[2],
        ],

        rotation: base.rotation,
      };
    }
    return split;
  }, [USE_SPLIT_QUADRANT_EXPERIMENT, activeTeeth, isMixed, isPediatricOnly]);
  const sceneScale = isPediatricOnly ? [0.85, 0.85, 0.85] : [1, 1, 1];
  const visibleTeeth = useMemo(
    () =>
      activeTeeth.filter(
        (tooth) => !visibleFdis || visibleFdis.includes(tooth.fdi),
      ),
    [activeTeeth, visibleFdis],
  );
  const contentCenter = useMemo(() => {
    if (visibleTeeth.length === 0) return [0, 0, 0];
    const sum = visibleTeeth.reduce(
      (acc, tooth) => {
        const pose = activePositions[tooth.fdi];
        if (!pose) return acc;
        return [
          acc[0] + pose.position[0],
          acc[1] + pose.position[1],
          acc[2] + pose.position[2],
        ];
      },
      [0, 0, 0],
    );
    return [
      sum[0] / visibleTeeth.length,
      sum[1] / visibleTeeth.length,
      sum[2] / visibleTeeth.length,
    ];
  }, [activePositions, visibleTeeth]);
  // Keep the dentition stack slightly lower so it aligns with the split drag-handle midpoint.
  // Shift the arch group upward so lower teeth don't overlap the scope bar
  // that sits at the bottom of the canvas (absolute bottom: 16px).
  const frameVerticalOffset = -0.85;
  const activeTooth = activeFdi
    ? activeTeeth.find((t) => t.fdi === activeFdi)
    : null;
  const guideSegments = useMemo(() => {
    if (!showGuides) return null;
    if (isMixed) {
      // Vertical center + separators between the 4 mixed rows.
      return new Float32Array([
        0, 3.2, -2.6, 0, -3.2, -2.6, -5.2, 1.15, -2.6, 5.2, 1.15, -2.6, -5.2,
        -0.4, -2.6, 5.2, -0.4, -2.6, -5.2, -2.05, -2.6, 5.2, -2.05, -2.6,
      ]);
    }
    return new Float32Array([
      0, 2.3, -2.6, 0, -2.3, -2.6, -5.2, 0, -2.6, 5.2, 0, -2.6,
    ]);
  }, [showGuides, isMixed]);
  return (
    <group
      scale={sceneScale}
      position={[
        -contentCenter[0],
        -contentCenter[1] + frameVerticalOffset,
        -contentCenter[2],
      ]}
    >
      {guideSegments && (
        <lineSegments renderOrder={1}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[guideSegments, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#94a3b8"
            transparent={true}
            opacity={0.35}
          />
        </lineSegments>
      )}

      {visibleTeeth.map((tooth) => {
        const isPrimaryTooth = ["5", "6", "7", "8"].includes(tooth.fdi[0]);
        const findings = findingsByTooth[tooth.fdi] || [];
        const historyDetails = treatmentHistoryDetailsByTooth?.[tooth.fdi] || {};
        const treatmentHistoryTags = Array.from(
          new Set([
            ...(toothDiagnoses[tooth.fdi]
              ? Array.from(toothDiagnoses[tooth.fdi])
              : []),
            ...(implantTeeth.has(tooth.fdi) ? ["Implant"] : []),
            ...Object.keys(historyDetails),
          ]),
        );
        return (
          <ArchTooth
            key={tooth.fdi}
            tooth={tooth}
            archPose={activePositions[tooth.fdi]}
            toothScale={isMixed && isPrimaryTooth ? 0.85 : 1}
            diagnoses={toothDiagnoses[tooth.fdi]}
            findings={findings}
            treatmentHistoryTags={treatmentHistoryTags}
            showTreatmentTags={showTreatmentTags}
            isImplant={implantTeeth.has(tooth.fdi)}
            isHovered={effectiveHovered === tooth.fdi}
            isPinned={pinnedTooth === tooth.fdi}
            agentPulse={Boolean(agentPulseFdis?.has?.(tooth.fdi))}
            onHover={setHoveredTooth}
            onClick={disableSelection ? () => {} : onSelectTooth}
            onPin={setPinnedTooth}
            treatmentHistoryDetails={historyDetails}
          />
        );
      })}
      {showScopeHotspots && onSelectScope && (
        <>
          <ScopeHotspot
            label="UR"
            position={[-3.2, 1.2, -2.8]}
            onClick={() => onSelectScope("UR")}
          />

          <ScopeHotspot
            label="UL"
            position={[3.2, 1.2, -2.8]}
            onClick={() => onSelectScope("UL")}
          />

          <ScopeHotspot
            label="LR"
            position={[-3.2, -1.2, -2.8]}
            onClick={() => onSelectScope("LR")}
          />

          <ScopeHotspot
            label="LL"
            position={[3.2, -1.2, -2.8]}
            onClick={() => onSelectScope("LL")}
          />

          <ScopeHotspot
            label="Full"
            position={[0, 0, -3.2]}
            onClick={() => onSelectScope("FULL")}
            emphasized={true}
          />
        </>
      )}

      {activeTooth && (
        <DentitionTooltip
          tooth={activeTooth}
          archPose={activePositions[activeTooth.fdi]}
          findings={findingsByTooth[activeTooth.fdi] || []}
          diagnoses={toothDiagnoses[activeTooth.fdi]}
          isImplant={implantTeeth.has(activeTooth.fdi)}
          allEntries={allEntries}
          toothNotes={toothNotes}
          treatmentHistoryDetails={treatmentHistoryDetailsByTooth?.[activeTooth.fdi] || {}}
        />
      )}
    </group>
  );
}
