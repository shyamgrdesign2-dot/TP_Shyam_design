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
  onHover,
  onClick,
  onPin,
  treatmentHistoryDetails = {},
}) {
  const { gl, camera } = useThree();
  const gltf = useGLTF(tooth.modelPath);
  const implantGltf = useGLTF("/models/implant.glb");
  const groupRef = useRef(null); // Center ref (for bounding box)
  const outerGroupRef = useRef(null); // mirrorX group (parentGroup for diagnosis visuals)
  const meshRef = useRef(null);

  const hasCrown = diagnoses?.has("Crown") || Boolean(treatmentHistoryDetails?.Crown);
  const hasRCT = diagnoses?.has("RCT") || Boolean(treatmentHistoryDetails?.RCT);
  const hasBridge = diagnoses?.has("Bridge") || Boolean(treatmentHistoryDetails?.Bridge);
  const hasDenture = diagnoses?.has("Denture") || Boolean(treatmentHistoryDetails?.Denture);
  const hasImplant = isImplant || diagnoses?.has("Implant") || Boolean(treatmentHistoryDetails?.Implant);
  const isMissingOrExtraction =
    diagnoses?.has("Missing") ||
    diagnoses?.has("Extraction") ||
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
      findings.some((f) => f.zoneId === z) ? 1 : 0,
    );
  }, [findings]);
  // Push finding-tint uniform every frame
  useFrame(() => {
    const zf = zoneFindingsRef.current;
    for (const ref of shaderRefs.current) {
      const s = ref.shader;
      if (!s?.uniforms?.uZoneHasFinding) continue;
      const arr = s.uniforms.uZoneHasFinding.value;
      arr[0] = zf[0];
      arr[1] = zf[1];
      arr[2] = zf[2];
      arr[3] = zf[3];
      arr[4] = zf[4];
      arr[5] = zf[5];
      arr[6] = zf[6];
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
  // After mount: compute bounding box and inject the SAME shader as single-tooth view
  // No guard ref — always re-inject when diagnosis flags change.
  // Uses requestAnimationFrame to wait for <Center> layout.
  useLayoutEffect(() => {
    shaderInjectedRef.current = false;
    shaderRefs.current = [];
    let cancelled = false;
    let rafOuter = 0;
    let rafInner = 0;
    const applyToCurrentScene = () => {
      if (cancelled) return false;
      if (shaderInjectedRef.current) return true;
      if (!groupRef.current) return false;
      // Walk UP the ancestor chain first so groupRef.matrixWorld reflects
      // the dentition parent-group offset (position: [-contentCenter, ...])
      // and the arch-pose outer group. On first mount inside a useLayoutEffect
      // the parent matrices are still identity (no frame has rendered yet),
      // so updateMatrixWorld(true) alone yields a LOCAL-space bbox which makes
      // uCejY/uCervicalY wildly wrong and the crown-root gradient saturates
      // into the root tint across every tooth.
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
      prewarmDentalShaderProgram({
        gl,
        camera,
        source: clonedScene,
        variantKey: getDentalShaderVariantKey({
          isImplant: hasImplant,
          isMissing: isMissingOrExtraction,
          isCrown: hasCrown,
          isRCT: hasRCT,
          isBridge: hasBridge,
          isDenture: hasDenture,
        }),
      });
      shaderInjectedRef.current = true;
      // Compute implant placement + store bb
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
  }, [
    clonedScene,
    tooth,
    hasImplant,
    isMissingOrExtraction,
    hasCrown,
    hasRCT,
    hasBridge,
    hasDenture,
    gl,
    camera,
    treatmentHistoryDetails,
  ]);
  // Hover glow on state change (avoid per-frame traversals across all teeth).
  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.traverse((obj) => {
      const m = obj;
      if (m.isMesh && m.material && !Array.isArray(m.material)) {
        const mat = m.material;
        if (mat.metalness > 0.5) return;
        if (isHovered) {
          mat.emissiveIntensity = 0.32;
          mat.emissive.set("#4a9eff");
        } else {
          mat.emissiveIntensity = 0;
          mat.emissive.set("#000000");
        }
      }
    });
  }, [isHovered]);
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            {treatmentHistoryTags.map((d) => (
              <span
                key={d}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: "4px",
                  fontFamily: "Inter, sans-serif",
                  background: "rgba(107, 114, 128, 0.78)",
                  color: "#fff",
                  lineHeight: "1.3",
                  backdropFilter: "blur(3px)",
                  letterSpacing: "0.01em",
                }}
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
