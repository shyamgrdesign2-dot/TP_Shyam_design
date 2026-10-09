import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import * as THREE from "three";
import { useGLTF, Center, Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { ALL_ZONES } from "./types";
import { ASSETS } from "../../../assets";
import { Annotations } from "./Annotations";
import { ImplantScrew } from "./ImplantScrew";
import { RootCanals } from "./RootCanals";
import { PreparedStump } from "./PreparedStump";
import { BridgeGhostTooth, getAdjacentTeeth } from "./BridgeGhostTooth";
import {
  cloneSceneWithUniqueMaterials,
  collectZoneMaterials,
  getDirsForTooth,
  classifyHit,
  computeToothBounds,
} from "./tooth-geometry-utils";
import {
  injectShader,
  prewarmDentalShaderProgram,
  getDentalShaderVariantKey,
} from "./tooth-shader";
import { VISUAL_TYPE, toVisualTypeSet, getVisualType } from "../../../utils/dentalVisualTypes";

// Re-exports for ArchTooth, dental-camera-presets, ZoneCameraRotator — keep all
// existing import paths from ./Tooth valid after the split.
export { getFrontAzimuth } from "./tooth-camera";
export { cloneSceneWithUniqueMaterials, getDirsForTooth } from "./tooth-geometry-utils";
export { injectShader, getDentalShaderVariantKey, prewarmDentalShaderProgram } from "./tooth-shader";
export { ImplantScrew } from "./ImplantScrew";
export { RootCanals } from "./RootCanals";
export { PreparedStump } from "./PreparedStump";

const EMPTY_SET = new Set();

export function Tooth({
  selectedZone,
  onSelectZone,
  onClearSelectedZone,
  onHoverZone,
  modelPath = ASSETS.dental.models.tooth16,
  arch = "maxillary",
  mirrorX = false,
  quadrant,
  toothPosition = 6,
  toothFdi = "16",
  isImplant = false,
  findings = [],
  zoneNotes = {},
  toothDiagnoses = EMPTY_SET,
  toothVisualTypes,
  multiSelectZones,
  multiSelectActive = false,
  compact = false,
  hideTags = false,
  treatmentHistoryDetails = {},
  toothEntries,
}) {
  const resolvedVisualTypes = toothVisualTypes ?? toVisualTypeSet(toothDiagnoses);
  const gltf = useGLTF(modelPath, "/draco/");
  const implantGltf = useGLTF(ASSETS.dental.models.implant, "/draco/");
  const [mountGen] = useState(() => Math.random());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const clonedScene = useMemo(
    () => cloneSceneWithUniqueMaterials(gltf.scene),
    [gltf, mountGen],
  );
  const groupRef = useRef(null);
  const outerGroupRef = useRef(null);
  const toothMeshRef = useRef(null);
  const [toothMeshReady, setToothMeshReady] = useState(0);
  const shaderRefs = useRef([]);
  const [localHover, setLocalHover] = useState(null);
  const [implantPlacement, setImplantPlacement] = useState(null);
  const boundsData = useRef(null);
  const [annotationData, setAnnotationData] = useState(null);
  const [boundsReady, setBoundsReady] = useState(0);
  const { camera, gl } = useThree();

  const hasCrown = resolvedVisualTypes.has(VISUAL_TYPE.CROWN) || Boolean(treatmentHistoryDetails?.Crown);
  const hasRCT = resolvedVisualTypes.has(VISUAL_TYPE.RCT) || Boolean(treatmentHistoryDetails?.RCT);
  const hasBridge = resolvedVisualTypes.has(VISUAL_TYPE.BRIDGE) || Boolean(treatmentHistoryDetails?.Bridge);
  const hasDenture = resolvedVisualTypes.has(VISUAL_TYPE.DENTURE) || Boolean(treatmentHistoryDetails?.Denture);
  const hasImplant = isImplant || resolvedVisualTypes.has(VISUAL_TYPE.IMPLANT) || Boolean(treatmentHistoryDetails?.Implant);
  const isMissingOrExtraction =
    resolvedVisualTypes.has(VISUAL_TYPE.MISSING) ||
    Boolean(treatmentHistoryDetails?.Missing) ||
    Boolean(treatmentHistoryDetails?.Extraction);

  // Effect 1: Shader Injection (triggered ONLY when clonedScene changes)
  useLayoutEffect(() => {
    frameCount.current = 0;
    let cancelled = false;
    let rafOuter = 0;
    let rafInner = 0;
    const schedule = () => {
      rafOuter = requestAnimationFrame(() => {
        rafInner = requestAnimationFrame(() => {
          if (cancelled || !groupRef.current) return;
          groupRef.current.updateMatrixWorld(true);
          const materials = collectZoneMaterials(clonedScene);
          if (materials.length === 0) return;
          clonedScene.traverse((obj) => {
            const m = obj;
            if (m.isMesh && !toothMeshRef.current) {
              toothMeshRef.current = m;
            }
          });
          const { bb, center, size, cervicalY, cejY, occlusalTop, crownBottomY } =
            computeToothBounds(groupRef, arch);
          const zoneYawRad = 0;
          boundsData.current = {
            cervicalY, cejY, occlusalTop,
            centerX: center.x, centerZ: center.z,
            quadrant, zoneYawRad, bb, center, size,
          };
          setBoundsReady((v) => v + 1);
          shaderRefs.current = [];
          for (const mat of materials) {
            shaderRefs.current.push(
              injectShader(
                mat, cervicalY, cejY, crownBottomY,
                center.x, center.z, arch, quadrant, zoneYawRad, toothFdi,
                hasImplant, isMissingOrExtraction, hasCrown, hasRCT, hasBridge, hasDenture,
              ),
            );
          }

        });
      });
    };
    schedule();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
    };
  }, [clonedScene, gl, camera]);

  // Effect 2: Layout & Annotations state updates
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    frameCount.current = 0;
    groupRef.current.updateMatrixWorld(true);
    const { bb, center, size, cervicalY, cejY, occlusalTop } =
      computeToothBounds(groupRef, arch);
    const zoneYawRad = 0;
    boundsData.current = {
      cervicalY, cejY, occlusalTop,
      centerX: center.x, centerZ: center.z,
      quadrant, zoneYawRad, bb, center, size,
    };
    if (hasImplant) {
      const cervicalDiam = Math.max(size.x, size.z) * 0.75;
      setImplantPlacement({ cervicalY, centerX: center.x, centerZ: center.z, cervicalDiam });
    } else {
      setImplantPlacement(null);
    }
    if (toothMeshRef.current) {
      const meshBB = new THREE.Box3().setFromObject(toothMeshRef.current);
      const mCenter = new THREE.Vector3();
      const mSize = new THREE.Vector3();
      meshBB.getCenter(mCenter);
      meshBB.getSize(mSize);
      let mCervicalY, mOcclusalMidY;
      if (arch === "maxillary") {
        mCervicalY = meshBB.min.y + mSize.y * 0.42;
        const occlTop = meshBB.min.y + (mCervicalY - meshBB.min.y) * 0.45;
        mOcclusalMidY = (mCervicalY + occlTop) / 2;
      } else {
        mCervicalY = meshBB.max.y - mSize.y * 0.42;
        const occlTop = meshBB.max.y - (meshBB.max.y - mCervicalY) * 0.45;
        mOcclusalMidY = (mCervicalY + occlTop) / 2;
      }
      const dirs = getDirsForTooth(toothFdi, quadrant, zoneYawRad);
      const fx = mirrorX ? -1 : 1;
      const flipDir = (d) => new THREE.Vector3(d.x * fx, d.y, d.z).normalize();
      setAnnotationData({
        zoneDirs: {
          buccal: flipDir(dirs.buccal),
          lingual: flipDir(dirs.lingual),
          mesial: flipDir(dirs.mesial),
          distal: flipDir(dirs.distal),
        },
        meshBounds: {
          center: mCenter, size: mSize, cervicalY: mCervicalY,
          occlusalMidY: mOcclusalMidY, bb: meshBB,
        },
      });
    }
  }, [
    clonedScene, arch, quadrant, toothPosition, toothFdi, mirrorX, modelPath,
    hasImplant, isMissingOrExtraction, hasCrown, hasRCT, hasBridge, hasDenture,
    boundsReady, // re-run after rAF sets toothMeshRef.current so annotationData is never null
  ]);

  // Effect 3: Update material transparency in real-time when diagnoses change.
  // Effect 1 only runs when clonedScene mounts (new tooth). When the user
  // toggles RCT / Crown on an already-loaded tooth we must update the
  // material's `transparent` flag directly so Three.js alpha-blending is
  // enabled/disabled correctly without a full shader recompile.
  useEffect(() => {
    const materials = collectZoneMaterials(clonedScene);
    for (const mat of materials) {
      const needsTransparency = hasCrown || hasRCT;
      if (mat.transparent !== needsTransparency) {
        mat.transparent = needsTransparency;
        mat.needsUpdate = true;
      }
    }
  }, [clonedScene, hasCrown, hasRCT]);

  const zoneIndicesRef = useRef({ selected: -1, hovered: -1 });
  const zoneFindingsRef = useRef([0, 0, 0, 0, 0, 0, 0]);
  const wholeToothStateRef = useRef({ selected: false, marked: false });

  useEffect(() => {
    zoneIndicesRef.current.selected = selectedZone
      ? ALL_ZONES.indexOf(selectedZone) : -1;
  }, [selectedZone]);

  useEffect(() => {
    zoneIndicesRef.current.hovered = localHover
      ? ALL_ZONES.indexOf(localHover) : -1;
  }, [localHover]);

  useEffect(() => {
    zoneFindingsRef.current = ALL_ZONES.map((z) =>
      findings.some((f) => f.zoneId === z) ||
      (toothEntries || []).some((e) => (e.kind === "planned" || e.kind === "procedure") && e.surfaces?.includes(z)) ||
      Object.values(treatmentHistoryDetails || {}).some((detail) => detail.surfaces?.includes(z)) ||
      (multiSelectActive && (multiSelectZones?.has(z) ?? false))
        ? 1 : 0,
    );
  }, [findings, toothEntries, treatmentHistoryDetails, multiSelectZones, multiSelectActive]);

  useEffect(() => {
    wholeToothStateRef.current.selected =
      selectedZone === "whole" ||
      (multiSelectActive && (multiSelectZones?.has("whole") ?? false));
    wholeToothStateRef.current.marked = false;
  }, [multiSelectZones, selectedZone, toothEntries, treatmentHistoryDetails, multiSelectActive]);

  const frameCount = useRef(0);

  // Push zone uniforms every frame — guarantees highlighting even after shader recompile
  useFrame(() => {
    if (groupRef.current && frameCount.current < 30) {
      groupRef.current.updateWorldMatrix(true, true);
      const { cervicalY, cejY, occlusalTop, center } = computeToothBounds(groupRef, arch);
      for (const ref of shaderRefs.current) {
        const s = ref.shader;
        if (s?.uniforms) {
          if (s.uniforms.uCejY) s.uniforms.uCejY.value = cejY;
          if (s.uniforms.uCervicalY) s.uniforms.uCervicalY.value = cervicalY;
          if (s.uniforms.uOcclusalTop) s.uniforms.uOcclusalTop.value = occlusalTop;
          if (s.uniforms.uCenterX) s.uniforms.uCenterX.value = center.x;
          if (s.uniforms.uCenterZ) s.uniforms.uCenterZ.value = center.z;
        }
      }
      frameCount.current++;
    }
    const { selected, hovered } = zoneIndicesRef.current;
    const zf = zoneFindingsRef.current;
    for (const ref of shaderRefs.current) {
      const s = ref.shader;
      if (!s?.uniforms) continue;
      s.uniforms.selectedZone.value = selected;
      s.uniforms.hoveredZone.value = hovered;
      if (s.uniforms.uWholeToothSelected)
        s.uniforms.uWholeToothSelected.value = wholeToothStateRef.current.selected ? 1.0 : 0.0;
      if (s.uniforms.uWholeToothMarked)
        s.uniforms.uWholeToothMarked.value = wholeToothStateRef.current.marked ? 1.0 : 0.0;
      if (s.uniforms.uZoneHasFinding) {
        const arr = s.uniforms.uZoneHasFinding.value;
        arr[0] = zf[0]; arr[1] = zf[1]; arr[2] = zf[2]; arr[3] = zf[3];
        arr[4] = zf[4]; arr[5] = zf[5]; arr[6] = zf[6];
      }
      if (s.uniforms.uIsImplant) s.uniforms.uIsImplant.value = hasImplant ? 1.0 : 0.0;
      if (s.uniforms.uIsMissing) s.uniforms.uIsMissing.value = isMissingOrExtraction ? 1.0 : 0.0;
      if (s.uniforms.uIsCrown)   s.uniforms.uIsCrown.value   = hasCrown   ? 1.0 : 0.0;
      if (s.uniforms.uIsRCT)     s.uniforms.uIsRCT.value     = hasRCT     ? 1.0 : 0.0;
      if (s.uniforms.uIsBridge)  s.uniforms.uIsBridge.value  = hasBridge  ? 1.0 : 0.0;
      if (s.uniforms.uIsDenture) s.uniforms.uIsDenture.value = hasDenture ? 1.0 : 0.0;
    }
  });

  const getWorldNormal = useCallback((e) => {
    if (e.face) {
      const n = e.face.normal.clone();
      n.transformDirection(e.object.matrixWorld);
      return n;
    }
    return new THREE.Vector3(0, -1, 0);
  }, []);

  return (
    <group
      ref={outerGroupRef}
      scale={mirrorX ? [-1.0, 1.0, 1.0] : [1.0, 1.0, 1.0]}
    >
      <Center ref={groupRef}>
        <primitive
          object={clonedScene}
          onPointerMove={(e) => {
            e.stopPropagation();
            if (isMissingOrExtraction) {
              zoneIndicesRef.current.hovered = -1;
              setLocalHover(null);
              onHoverZone(null);
              document.body.style.cursor = "default";
              return;
            }
            if (!boundsData.current) return;
            const b = boundsData.current;
            const z = classifyHit(
              e.point, getWorldNormal(e),
              b.cervicalY, b.cejY, b.occlusalTop,
              b.centerX, b.centerZ, arch, b.quadrant, b.zoneYawRad, toothFdi,
            );
            if (hasImplant && z && (z === "cervical" || z === "root")) {
              zoneIndicesRef.current.hovered = -1;
              setLocalHover(null);
              onHoverZone(null);
              document.body.style.cursor = "default";
              return;
            }
            // Push to ref IMMEDIATELY so useFrame picks it up this frame, not after React commits
            zoneIndicesRef.current.hovered = z ? ALL_ZONES.indexOf(z) : -1;
            setLocalHover(z);
            onHoverZone(z);
            document.body.style.cursor = z ? "pointer" : "default";
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            zoneIndicesRef.current.hovered = -1;
            setLocalHover(null);
            onHoverZone(null);
            document.body.style.cursor = "default";
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isMissingOrExtraction) return;
            if (!boundsData.current) return;
            const b = boundsData.current;
            const z = classifyHit(
              e.point, getWorldNormal(e),
              b.cervicalY, b.cejY, b.occlusalTop,
              b.centerX, b.centerZ, arch, b.quadrant, b.zoneYawRad, toothFdi,
            );
            if (hasImplant && z && (z === "cervical" || z === "root")) return;
            // Multi-select only when a Findings/Procedures row is actively editing its surfaces.
            if (z)
              onSelectZone(z, [e.point.x, e.point.y, e.point.z], { multi: multiSelectActive });
          }}
        />
      </Center>

      {annotationData && !compact && (
        <Annotations
          toothMesh={toothMeshRef.current}
          findings={(() => {
            const synth = [];
            let id = 0;
            for (const [name, detail] of Object.entries(treatmentHistoryDetails)) {
              const surfaces = detail.surfaces ?? [];
              const labelParts = [name];
              if (detail.since?.trim()) labelParts.push(detail.since.trim());
              for (const z of surfaces) {
                synth.push({
                  id: `hist-${id++}`, zoneId: z,
                  type: `Hx: ${labelParts.join(" · ")}`, notes: detail.note ?? "",
                });
              }
            }
            for (const e of toothEntries ?? []) {
              const prefix =
                e.kind === "finding" ? "Fn" : e.kind === "planned" ? "Pr" : "Hx";
              const label = `${prefix}: ${e.name}`;
              for (const z of e.surfaces) {
                synth.push({ id: `ent-${id++}`, zoneId: z, type: label, notes: "" });
              }
            }
            return synth;
          })()}
          zoneNotes={zoneNotes}
          arch={arch}
          toothPosition={toothPosition}
          quadrant={quadrant}
          selectedZone={selectedZone}
          multiSelectZones={multiSelectZones}
          multiSelectActive={multiSelectActive}
          onSelectZone={onSelectZone}
          onClearSelectedZone={onClearSelectedZone}
          zoneDirs={annotationData.zoneDirs}
          meshBounds={annotationData.meshBounds}
        />
      )}

      {hasCrown && annotationData && toothMeshRef.current && (
        <PreparedStump
          toothMesh={toothMeshRef.current}
          meshBounds={{
            center: annotationData.meshBounds.center,
            size: annotationData.meshBounds.size,
            cervicalY: annotationData.meshBounds.cervicalY,
            bb: annotationData.meshBounds.bb,
          }}
          arch={arch}
          parentGroup={outerGroupRef.current}
        />
      )}

      {hasRCT && annotationData && (
        <RootCanals
          meshBounds={{
            center: annotationData.meshBounds.center,
            size: annotationData.meshBounds.size,
            cervicalY: annotationData.meshBounds.cervicalY,
            bb: annotationData.meshBounds.bb,
          }}
          arch={arch}
          toothPosition={toothPosition}
          dirs={annotationData.zoneDirs}
          toothFdi={toothFdi}
        />
      )}

      {hasImplant && implantPlacement && (
        <ImplantScrew
          placement={implantPlacement}
          arch={arch}
          implantScene={implantGltf.scene}
          toothMesh={toothMeshRef.current}
          bb={boundsData.current?.bb || null}
          parentGroup={outerGroupRef.current}
        />
      )}

      {hasBridge && boundsData.current && (() => {
        const adj = getAdjacentTeeth(toothFdi);
        return (
          <>
            {adj.mesial && (
              <BridgeGhostTooth
                toothDef={adj.mesial}
                side="mesial"
                currentBB={boundsData.current.bb}
                arch={arch}
                mirrorX={mirrorX}
              />
            )}
            {adj.distal && (
              <BridgeGhostTooth
                toothDef={adj.distal}
                side="distal"
                currentBB={boundsData.current.bb}
                arch={arch}
                mirrorX={mirrorX}
              />
            )}
          </>
        );
      })()}

      {(() => {
        // canonical frontend names still used for treatmentHistoryDetails key lookup
        const visualWholeTags = new Set([
          "Implant", "Missing", "Extraction", "RCT", "Crown", "Bridge", "Denture",
        ]);
        const wholeTags = [];
        if (toothDiagnoses) {
          for (const d of toothDiagnoses) {
            if (getVisualType(d) !== null) wholeTags.push(d);
          }
        }
        if (hasImplant && !wholeTags.some((d) => getVisualType(d) === VISUAL_TYPE.IMPLANT)) wholeTags.push("Implant");
        if (treatmentHistoryDetails) {
          for (const key of Object.keys(treatmentHistoryDetails)) {
            if (visualWholeTags.has(key) && !wholeTags.includes(key)) {
              wholeTags.push(key);
            }
          }
        }
        if (toothEntries) {
          for (const e of toothEntries) {
            if (e.surfaces?.includes("whole") && !wholeTags.includes(e.name)) {
              wholeTags.push(e.name);
            }
          }
        }
        if (hideTags || wholeTags.length === 0) return null;
        const occlusalOffsetY = arch === "maxillary" ? -0.72 : 0.72;
        return (
          <Html
            position={[0, occlusalOffsetY, 0]}
            center={true}
            transform={compact}
            sprite={compact}
            scale={compact ? 0.35 : 1}
            style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
            zIndexRange={[80, 40]}
          >
            <div style={{ display: "flex", alignItems: "center", gap: compact ? "2px" : "4px" }}>
              {wholeTags.map((tag) => (
                <span
                  style={{
                    fontSize: compact ? "18px" : "11px",
                    fontWeight: 600,
                    padding: compact ? "2px 6px" : "3px 8px",
                    borderRadius: "6px",
                    fontFamily: "Inter, sans-serif",
                    background: "rgba(107, 114, 128, 0.85)",
                    color: "#fff",
                    lineHeight: "1.3",
                    backdropFilter: "blur(4px)",
                    letterSpacing: "0.01em",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)",
                    maxWidth: compact ? "120px" : "auto",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </Html>
        );
      })()}
    </group>
  );
}
