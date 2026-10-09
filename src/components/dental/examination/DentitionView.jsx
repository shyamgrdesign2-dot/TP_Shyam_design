import { memo, useMemo, useState, useCallback, useEffect, Suspense } from "react";
import {
  TEETH,
  PEDIATRIC_TEETH,
  ARCH_POSITIONS,
  PEDIATRIC_ARCH_POSITIONS,
  isOralRegionPosition,
  ORAL_POSITION_LABEL,
} from "./types";
import ArchTooth from "./ArchTooth";
import DentitionTooltip from "./DentitionTooltip";
import OralRegionTag3D from "./OralRegionTag3D";
import ScopeHotspot from "./ScopeHotspot";

const GROUP_TAG_OFFSET = {
  FULL: [0, 0, 0], WHOLE: [0, 0, 0], GENERALIZED: [0, 0, 0],
  UPPER_ARCH: [0, 0.6, 0], LOWER_ARCH: [0, -0.6, 0],
  RIGHT_ARCH: [-0.6, 0, 0], LEFT_ARCH: [0.6, 0, 0],
  UR: [-0.8, 0.6, 0], UL: [0.8, 0.6, 0], LR: [-0.8, -0.6, 0], LL: [0.8, -0.6, 0],
};

const GROUP_TIP_SIDE = {
  FULL: 'below', WHOLE: 'below', GENERALIZED: 'below',
  UPPER_ARCH: 'above', LOWER_ARCH: 'below',
  RIGHT_ARCH: 'left', LEFT_ARCH: 'right',
  UR: 'above', UL: 'above',
  LR: 'below', LL: 'below',
};



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
  allEntries = [],
  toothNotes,
  agentPulseFdis,
  showTreatmentTags = true,
  treatmentHistoryDetailsByTooth = {},
  highlightFdis,
  oralEntries = [],
  oralForceShowAll = false,
  visualTypeMap,
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

  const [hoverOralFdis, setHoverOralFdis] = useState(null);
  const [oralFilter, setOralFilter] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFilter = (ev) => {
      setOralFilter(ev?.detail ?? null);
    };
    window.addEventListener("oral-tags-filter", onFilter);
    return () => window.removeEventListener("oral-tags-filter", onFilter);
  }, []);
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
  const activeTeeth = useMemo(() => {
    if (isMixed) {
      return [...TEETH, ...PEDIATRIC_TEETH];
    }
  
    if (isPediatricOnly) {
      return PEDIATRIC_TEETH;
    }
  
    return TEETH;
  }, [isMixed, isPediatricOnly]);
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

  const oralTagGroups = useMemo(() => {
    if (!oralEntries || oralEntries.length === 0) return [];
    const groups = {};
    oralEntries.forEach((e) => {
      const regionPos = (e.surfaces || []).find((p) => isOralRegionPosition(p) && !["WHOLE", "GENERALIZED", "FULL"].includes(p));
      const key = regionPos || "FULL";
      (groups[key] = groups[key] || []).push(e);
    });

    const quadOf = { UR: "upper-right", UL: "upper-left", LR: "lower-right", LL: "lower-left" };
    const archOf = {
      RIGHT_ARCH: ["upper-right", "lower-right"],
      LEFT_ARCH: ["upper-left", "lower-left"],
      UPPER_ARCH: ["upper-right", "upper-left"],
      LOWER_ARCH: ["lower-right", "lower-left"],
    };

    const fdisFor = (key) => {
      if (quadOf[key]) return visibleTeeth.filter((t) => t.quadrant === quadOf[key]).map((t) => t.fdi);
      if (archOf[key]) return visibleTeeth.filter((t) => archOf[key].includes(t.quadrant)).map((t) => t.fdi);
      return visibleTeeth.map((t) => t.fdi);
    };

    return Object.entries(groups).map(([key, list]) => {
      const fdis = fdisFor(key).filter((f) => activePositions[f]);
      if (fdis.length === 0) return null;
      const sum = fdis.reduce((a, f) => {
        const p = activePositions[f].position;
        return [a[0] + p[0], a[1] + p[1], a[2] + p[2]];
      }, [0, 0, 0]);
      const off = GROUP_TAG_OFFSET[key] || [0, 0, 0];
      return {
        key,
        list,
        fdis,
        label: ORAL_POSITION_LABEL[key] || key,
        position: [
          sum[0] / fdis.length + off[0],
          sum[1] / fdis.length + off[1],
          sum[2] / fdis.length + 0.6 + off[2]
        ]
      };
    }).filter(Boolean);
  }, [oralEntries, visibleTeeth, activePositions]);
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
        const toothEntries = allEntries.filter((e) => e.toothFdi === tooth.fdi);
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
          <Suspense key={tooth.fdi} fallback={null}>
            <ArchTooth
              key={tooth.fdi}
              tooth={tooth}
              archPose={activePositions[tooth.fdi]}
              toothScale={isMixed && isPrimaryTooth ? 0.85 : 1}
              diagnoses={toothDiagnoses[tooth.fdi]}
              findings={findings}
              toothEntries={toothEntries}
              treatmentHistoryTags={treatmentHistoryTags}
              showTreatmentTags={showTreatmentTags}
              isImplant={implantTeeth.has(tooth.fdi)}
              isHovered={effectiveHovered === tooth.fdi}
              isPinned={pinnedTooth === tooth.fdi}
              agentPulse={Boolean(agentPulseFdis?.has?.(tooth.fdi))}
              highlightActive={Boolean((hoverOralFdis || highlightFdis) && (hoverOralFdis || highlightFdis).size > 0)}
              inHighlight={Boolean((hoverOralFdis || highlightFdis) && (hoverOralFdis || highlightFdis).has(tooth.fdi))}
              onHover={setHoveredTooth}
              onClick={disableSelection ? () => {} : onSelectTooth}
              onPin={setPinnedTooth}
              treatmentHistoryDetails={historyDetails}
              visualTypeMap={visualTypeMap}
            />
          </Suspense>
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

      {oralTagGroups.map((g) => {
        let list = g.list;
        let hideTag = false;
        let forceFiltered = false;
        if (oralFilter) {
          if (oralFilter.all) {
            forceFiltered = true;
          } else if (oralFilter.kind) {
            list = g.list.filter((e) => e.kind === oralFilter.kind && (!oralFilter.name || e.name === oralFilter.name));
            if (list.length === 0) hideTag = true;
            else forceFiltered = true;
          }
        }
        return (
          <OralRegionTag3D
            key={g.key}
            position={g.position}
            list={list}
            label={g.label}
            hideTag={hideTag}
            tooltipSide={GROUP_TIP_SIDE[g.key] || "below"}
            forceShowAll={forceFiltered || oralForceShowAll}
            onHover={(on) => setHoverOralFdis(on ? new Set(g.fdis) : null)}
          />
        );
      })}
    </group>
  );
}


