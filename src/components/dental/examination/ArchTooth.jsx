import {
  memo,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import * as THREE from "three";
import { useGLTF, Html, Center } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  cloneSceneWithUniqueMaterials,
  injectShader,
  getDentalShaderVariantKey,
  ImplantScrew,
  prewarmDentalShaderProgram,
  PreparedStump,
  RootCanals,
  getDirsForTooth,
} from "./Tooth";
import { ASSETS } from "../../../assets";
import { VISUAL_TYPE, toVisualTypeSet } from "../../../utils/dentalVisualTypes";

const ArchTooth = memo(function ArchTooth({
  tooth,
  archPose,
  toothScale = 1,
  diagnoses,
  findings,
  treatmentHistoryTags,
  showTreatmentTags = true,
  isImplant,
  isHovered,
  isPinned,
  agentPulse = false,
  highlightActive = false,
  inHighlight = false,
  onHover,
  onClick,
  onPin,
  toothEntries = [],
  treatmentHistoryDetails = {},
  visualTypeMap,
}) {
  const { gl, camera } = useThree();
  const gltf = useGLTF(tooth.modelPath, "/draco/");
  const implantGltf = useGLTF(ASSETS.dental.models.implant, "/draco/");
  const groupRef = useRef(null); // Center ref (for bounding box)
  const outerGroupRef = useRef(null); // mirrorX group (parentGroup for diagnosis visuals)
  const meshRef = useRef(null);

  const resolvedVisualTypes = toVisualTypeSet(diagnoses ?? new Set(), visualTypeMap);
  const hasCrown = resolvedVisualTypes.has(VISUAL_TYPE.CROWN) || Boolean(treatmentHistoryDetails?.Crown);
  const hasRCT = resolvedVisualTypes.has(VISUAL_TYPE.RCT) || Boolean(treatmentHistoryDetails?.RCT);
  const hasBridge = resolvedVisualTypes.has(VISUAL_TYPE.BRIDGE) || Boolean(treatmentHistoryDetails?.Bridge);
  const hasDenture = resolvedVisualTypes.has(VISUAL_TYPE.DENTURE) || Boolean(treatmentHistoryDetails?.Denture);
  const hasImplant = isImplant || resolvedVisualTypes.has(VISUAL_TYPE.IMPLANT) || Boolean(treatmentHistoryDetails?.Implant);
  const isMissingOrExtraction =
    resolvedVisualTypes.has(VISUAL_TYPE.MISSING) ||
    Boolean(treatmentHistoryDetails?.Missing) ||
    Boolean(treatmentHistoryDetails?.Extraction);
  // Fresh clone on every mount — mount generation forces a new clone so that
  // switching tabs (Adult→Pedia→Adult) always starts with clean materials.
  const [mountGen] = useState(() => Math.random());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const clonedScene = useMemo(
    () => cloneSceneWithUniqueMaterials(gltf.scene),
    [gltf, mountGen],
  );
  // Implant placement state + tooth mesh ref for procedural implant
  const [implantPlacement, setImplantPlacement] = useState(null);
  // Mesh bounds + dirs for PreparedStump and RootCanals
  const [meshBoundsData, setMeshBoundsData] = useState(null);
  const [zoneDirs, setZoneDirs] = useState(null);
  const toothMeshRefLocal = useRef(null);
  const implantBB = useRef(null);
  const shaderRefs = useRef([]);
  const shaderInjectedRef = useRef(false);
  const zoneFindingsRef = useRef([0, 0, 0, 0, 0, 0, 0]);
  // Update findings ref whenever findings change — picked up next frame
  useEffect(() => {
    const order = [
      "occlusal",
      "buccal",
      "lingual",
      "mesial",
      "distal",
      "cervical",
      "root",
    ];

    zoneFindingsRef.current = order.map((z) =>
      findings.some((f) => f.zoneId === z) ||
      (toothEntries || []).some((e) => (e.kind === "planned" || e.kind === "procedure") && e.surfaces?.includes(z)) ||
      Object.values(treatmentHistoryDetails || {}).some((detail) => detail.surfaces?.includes(z))
        ? 1 : 0,
    );
  }, [findings, toothEntries, treatmentHistoryDetails]);
  const frameCount = useRef(0);
  // Push finding-tint uniform every frame
  useFrame(() => {
    if (groupRef.current && frameCount.current < 30) {
      groupRef.current.updateWorldMatrix(true, true);
      const bb = new THREE.Box3().setFromObject(groupRef.current);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      bb.getCenter(center);
      bb.getSize(size);
      let cervicalY, cejY, occlusalTop;
      if (tooth.arch === "maxillary") {
        cervicalY = bb.min.y + size.y * 0.42;
        cejY = bb.min.y + size.y * 0.5;
        const crownH = cervicalY - bb.min.y;
        occlusalTop = bb.min.y + crownH * 0.45;
      } else {
        cervicalY = bb.max.y - size.y * 0.42;
        cejY = bb.max.y - size.y * 0.5;
        const crownH = bb.max.y - cervicalY;
        occlusalTop = bb.max.y - crownH * 0.45;
      }
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
    const zf = zoneFindingsRef.current;
    for (const ref of shaderRefs.current) {
      const s = ref.shader;
      if (!s?.uniforms) continue;
      if (s.uniforms.uZoneHasFinding) {
        const arr = s.uniforms.uZoneHasFinding.value;
        arr[0] = zf[0];
        arr[1] = zf[1];
        arr[2] = zf[2];
        arr[3] = zf[3];
        arr[4] = zf[4];
        arr[5] = zf[5];
        arr[6] = zf[6];
      }
      if (s.uniforms.uIsImplant) s.uniforms.uIsImplant.value = hasImplant ? 1.0 : 0.0;
      if (s.uniforms.uIsMissing) s.uniforms.uIsMissing.value = isMissingOrExtraction ? 1.0 : 0.0;
      if (s.uniforms.uIsCrown) s.uniforms.uIsCrown.value = hasCrown ? 1.0 : 0.0;
      if (s.uniforms.uIsRCT) s.uniforms.uIsRCT.value = hasRCT ? 1.0 : 0.0;
      if (s.uniforms.uIsBridge) s.uniforms.uIsBridge.value = hasBridge ? 1.0 : 0.0;
      if (s.uniforms.uIsDenture) s.uniforms.uIsDenture.value = hasDenture ? 1.0 : 0.0;
    }
  });
  // Capture first mesh from cloned scene
  useMemo(() => {
    toothMeshRefLocal.current = null;
    clonedScene.traverse((obj) => {
      const m = obj;
      if (m.isMesh && !toothMeshRefLocal.current) {
        toothMeshRefLocal.current = m;
      }
    });
  }, [clonedScene]);
  // Effect 1: Shader Injection (triggered ONLY when clonedScene changes)
  useLayoutEffect(() => {
    frameCount.current = 0;
    shaderInjectedRef.current = false;
    shaderRefs.current = [];
    let cancelled = false;
    let rafOuter = 0;
    let rafInner = 0;
    const applyToCurrentScene = () => {
      if (cancelled) return false;
      if (shaderInjectedRef.current) return true;
      if (!groupRef.current) return false;
      groupRef.current.updateWorldMatrix(true, true);
      const bb = new THREE.Box3().setFromObject(groupRef.current);
      const sizeProbe = new THREE.Vector3();
      bb.getSize(sizeProbe);
      if (sizeProbe.lengthSq() < 1e-8) return false;
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      bb.getCenter(center);
      bb.getSize(size);
      let cervicalY, cejY, crownBottomY;
      if (tooth.arch === "maxillary") {
        cervicalY = bb.min.y + size.y * 0.42;
        cejY = bb.min.y + size.y * 0.5;
        crownBottomY = bb.min.y;
      } else {
        cervicalY = bb.max.y - size.y * 0.42;
        cejY = bb.max.y - size.y * 0.5;
        crownBottomY = bb.max.y;
      }
      const quadNum = parseInt(tooth.fdi[0]);
      const zoneYawRad =
        quadNum === 1 || quadNum === 4
          ? (-Math.PI * (tooth.position - 1)) / 14
          : (Math.PI * (tooth.position - 1)) / 14;
      // Collect materials and inject the same shader as single-tooth view.
      const materials = [];
      clonedScene.traverse((obj) => {
        const m = obj;
        if (m.isMesh && m.material) {
          if (Array.isArray(m.material)) materials.push(...m.material);
          else materials.push(m.material);
        }
      });
      if (materials.length === 0) return false;
      shaderRefs.current = [];
      for (const mat of materials) {
        shaderRefs.current.push(
          injectShader(
            mat,
            cervicalY,
            cejY,
            crownBottomY,
            center.x,
            center.z,
            tooth.arch,
            tooth.quadrant,
            zoneYawRad,
            tooth.fdi,
            hasImplant,
            isMissingOrExtraction,
            hasCrown,
            hasRCT,
            hasBridge,
            hasDenture,
          ),
        );
        mat.needsUpdate = true;
      }
      shaderInjectedRef.current = true;
      return true;
    };
    const runWithRetries = () => {
      if (applyToCurrentScene()) return;
      let raf = 0;
      let tries = 0;
      const maxTries = 120;
      const tick = () => {
        if (cancelled) return;
        if (applyToCurrentScene()) return;
        tries += 1;
        if (tries < maxTries) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    };
    const cancelRetry = runWithRetries();
    const lateRetry = window.setTimeout(() => {
      if (!shaderInjectedRef.current && !cancelled) {
        // One extra pass after layout stabilizes (tab/type transitions).
        applyToCurrentScene();
      }
    }, 1200);
    // Match Tooth.tsx timing model: defer to post-layout via double RAF.
    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => {
        if (!shaderInjectedRef.current && !cancelled) {
          applyToCurrentScene();
        }
      });
    });
    return () => {
      cancelled = true;
      cancelRetry?.();
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      window.clearTimeout(lateRetry);
    };
  }, [clonedScene, gl, camera]);

  // Effect 1b: Update material transparency in real-time when diagnoses change.
  // Effect 1 only runs when clonedScene mounts. When the user toggles RCT /
  // Crown on an already-rendered arch tooth the `transparent` flag needs to be
  // patched directly so Three.js alpha-blending is toggled without a full
  // shader recompile.
  useEffect(() => {
    const materials = [];
    clonedScene.traverse((obj) => {
      const m = obj;
      if (m.isMesh && m.material) {
        if (Array.isArray(m.material)) materials.push(...m.material);
        else materials.push(m.material);
      }
    });
    for (const mat of materials) {
      const needsTransparency = hasCrown || hasRCT;
      if (mat.transparent !== needsTransparency) {
        mat.transparent = needsTransparency;
        mat.needsUpdate = true;
      }
    }
  }, [clonedScene, hasCrown, hasRCT]);

  // Effect 2: Layout & State updates (annotations, PreparedStump, RootCanals, Implant placing)
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    frameCount.current = 0; // Trigger coordinate recalculations on frame state shift
    groupRef.current.updateWorldMatrix(true, true);
    const bb = new THREE.Box3().setFromObject(groupRef.current);
    const sizeProbe = new THREE.Vector3();
    bb.getSize(sizeProbe);
    if (sizeProbe.lengthSq() < 1e-8) return;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bb.getCenter(center);
    bb.getSize(size);
    let cervicalY;
    if (tooth.arch === "maxillary") {
      cervicalY = bb.min.y + size.y * 0.42;
    } else {
      cervicalY = bb.max.y - size.y * 0.42;
    }
    const quadNum = parseInt(tooth.fdi[0]);
    const zoneYawRad =
      quadNum === 1 || quadNum === 4
        ? (-Math.PI * (tooth.position - 1)) / 14
        : (Math.PI * (tooth.position - 1)) / 14;
    implantBB.current = bb;
    if (hasImplant) {
      const cervicalDiam = Math.max(size.x, size.z) * 0.75;
      setImplantPlacement({
        cervicalY,
        centerX: center.x,
        centerZ: center.z,
        cervicalDiam,
      });
    } else {
      setImplantPlacement(null);
    }
    // Compute mesh bounds in outerGroupRef local space for Crown/RCT visuals
    // This ensures PreparedStump + RootCanals render correctly regardless of arch position
    if (outerGroupRef.current) {
      outerGroupRef.current.updateMatrixWorld(true);
      const outerInv = new THREE.Matrix4()
        .copy(outerGroupRef.current.matrixWorld)
        .invert();
      const localCenter = center.clone().applyMatrix4(outerInv);
      const localBBmin = bb.min.clone().applyMatrix4(outerInv);
      const localBBmax = bb.max.clone().applyMatrix4(outerInv);
      const localBB = new THREE.Box3(
        new THREE.Vector3(
          Math.min(localBBmin.x, localBBmax.x),
          Math.min(localBBmin.y, localBBmax.y),
          Math.min(localBBmin.z, localBBmax.z),
        ),
        new THREE.Vector3(
          Math.max(localBBmin.x, localBBmax.x),
          Math.max(localBBmin.y, localBBmax.y),
          Math.max(localBBmin.z, localBBmax.z),
        ),
      );
      const localSize = new THREE.Vector3();
      localBB.getSize(localSize);
      const localCervPt = new THREE.Vector3(
        center.x,
        cervicalY,
        center.z,
      ).applyMatrix4(outerInv);
      setMeshBoundsData({
        center: localCenter,
        size: localSize,
        cervicalY: localCervPt.y,
        bb: localBB,
      });
      // Compute direction vectors in outerGroupRef local space
      const dirs = getDirsForTooth(tooth.fdi, tooth.quadrant, zoneYawRad);
      // Transform direction vectors to local space (rotation only, no translation)
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(outerInv);
      const transformDir = (d) =>
        d.clone().applyMatrix3(normalMatrix).normalize();
      setZoneDirs({
        buccal: transformDir(dirs.buccal),
        lingual: transformDir(dirs.lingual),
        mesial: transformDir(dirs.mesial),
        distal: transformDir(dirs.distal),
      });
    }
  }, [
    clonedScene,
    tooth,
    archPose,
    toothScale,
    hasImplant,
    isMissingOrExtraction,
    hasCrown,
    hasRCT,
    hasBridge,
    hasDenture,
    treatmentHistoryDetails,
  ]);
  // Hover glow + oral-region highlight/dim on state change (avoid per-frame
  // traversals across all teeth). Region highlight: teeth in the active oral
  // region glow teal; teeth outside it fade so the region stands out.
  useEffect(() => {
    if (!meshRef.current) return;
    const dim = highlightActive && !inHighlight;
    meshRef.current.traverse((obj) => {
      const m = obj;
      if (m.isMesh && m.material && !Array.isArray(m.material)) {
        const mat = m.material;
        if (mat.metalness > 0.5) return;
        if (isHovered) {
          mat.emissiveIntensity = 0.32;
          mat.emissive.set("#4a9eff");
        } else if (highlightActive && inHighlight) {
          mat.emissiveIntensity = 0.38;
          mat.emissive.set("#14b8a6");
        } else {
          mat.emissiveIntensity = 0;
          mat.emissive.set("#000000");
        }
        mat.transparent = true;
        mat.opacity = dim ? 0.22 : 1;
      }
    });
  }, [isHovered, highlightActive, inHighlight]);
  /** Two clear wobble cycles (~1s) when AI applies scan — strong enough to notice, then stops. */
  const pulseStartRef = useRef(null);
  const hadPulseRef = useRef(false);
  useFrame((state) => {
    if (!meshRef.current) return;
    const base = toothScale;
    if (!agentPulse) {
      pulseStartRef.current = null;
      hadPulseRef.current = false;
      meshRef.current.scale.setScalar(base);
      return;
    }
    if (!hadPulseRef.current) {
      pulseStartRef.current = state.clock.elapsedTime;
      hadPulseRef.current = true;
    }
    const t0 = pulseStartRef.current;
    if (t0 == null) {
      meshRef.current.scale.setScalar(base);
      return;
    }
    const elapsed = state.clock.elapsedTime - t0;
    const dur = 1.15;
    if (elapsed >= dur) {
      meshRef.current.scale.setScalar(base);
      return;
    }
    const t = elapsed / dur;
    /** Gentle envelope — subtle second beat, no harsh "rubber" bounce */
    const envelope = Math.pow(1 - t, 1.35);
    /** Two full sine cycles across [0, 1] → sin(4πt); amplitude kept low for polish */
    const wobble = envelope * 0.034 * Math.sin(t * Math.PI * 4);
    meshRef.current.scale.setScalar(base * (1 + wobble));
  });
  const handlePointerEnter = useCallback(
    (e) => {
      e.stopPropagation();
      onHover(tooth.fdi);
      document.body.style.cursor = "pointer";
    },
    [tooth.fdi, onHover],
  );
  const handlePointerLeave = useCallback(
    (e) => {
      e.stopPropagation();
      onHover(null);
      document.body.style.cursor = "default";
    },
    [onHover],
  );
  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      // On touch: first tap pins the tooltip, second tap navigates.
      // On mouse: click navigates immediately (hover already shows tooltip).
      const isTouch =
        e.pointerType === "touch" || e.nativeEvent?.pointerType === "touch";
      if (isTouch) {
        if (isPinned) {
          onPin(null);
          onClick(tooth);
        } else {
          onPin(tooth.fdi);
        }
      } else {
        onClick(tooth);
      }
    },
    [tooth, onClick, onPin, isPinned],
  );

  if (!archPose) return null;
  // Diagnosis labels for pill (only tooth-level primary diagnoses)
  const occlusalOffsetY = tooth.arch === "maxillary" ? -0.75 : 0.75;
  return (
    <group
      ref={meshRef}
      position={archPose.position}
      rotation={archPose.rotation}
    >
      <group ref={outerGroupRef} scale={tooth.mirrorX ? [-1, 1, 1] : [1, 1, 1]}>
        <Center ref={groupRef}>
          <primitive
            object={clonedScene}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onClick={handleClick}
          />
        </Center>
        {hasCrown && meshBoundsData && toothMeshRefLocal.current && (
          <PreparedStump
            toothMesh={toothMeshRefLocal.current}
            meshBounds={meshBoundsData}
            arch={tooth.arch}
            parentGroup={outerGroupRef.current}
          />
        )}

        {hasRCT && meshBoundsData && zoneDirs && (
          <RootCanals
            meshBounds={meshBoundsData}
            arch={tooth.arch}
            toothPosition={tooth.position}
            dirs={zoneDirs}
            toothFdi={tooth.fdi}
          />
        )}

        {hasImplant && implantPlacement && (
          <ImplantScrew
            placement={implantPlacement}
            arch={tooth.arch}
            implantScene={implantGltf.scene}
            toothMesh={toothMeshRefLocal.current}
            bb={implantBB.current}
            parentGroup={outerGroupRef.current}
          />
        )}
      </group>
      {treatmentHistoryTags.length > 0 && showTreatmentTags && (
        <Html
          position={[0, occlusalOffsetY, 0]}
          center={true}
          style={{
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
          zIndexRange={isHovered || isPinned ? [80, 40] : [30, 0]}
        >
          <div className="arch-history-row">
            {treatmentHistoryTags.map((d) => (
              <span
                key={d}
                className="arch-history-tag"
              >
                {d}
              </span>
            ))}
          </div>
        </Html>
      )}
    </group>
  );
});

export default ArchTooth;
