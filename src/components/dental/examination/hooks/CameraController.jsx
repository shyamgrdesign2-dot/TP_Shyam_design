import { useRef, useEffect, useMemo, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  DENTITION_CAMERA,
  QUADRANT_SIDE_SCOPE_EXTRA_ZOOM,
  getSingleToothBuccalCamera,
} from "./dental-camera-presets";

/**
 * R3F component (renders null).  Manages animated camera transitions between
 * the dentition view, grouped scope views, and single-tooth views.
 * Also handles Ctrl/Cmd+drag vertical nudge on desktop.
 *
 * @param {{ viewMode: string, patientType: string, selectionScopeType: string,
 *           selectionScopeId: string|null, dentitionCameraOverride: object|null,
 *           dentitionVerticalNudge: number,
 *           onDentitionVerticalNudgeChange: function,
 *           controlsRef: React.MutableRefObject }} props
 */
export function CameraController({
  viewMode,
  patientType,
  selectionScopeType = "tooth",
  selectionScopeId = null,
  dentitionCameraOverride,
  dentitionVerticalNudge,
  onDentitionVerticalNudgeChange,
  controlsRef
}) {
  const { camera, size } = useThree();
  const animRef = useRef({
    active: false,
    t: 0,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    startFov: 32,
    endFov: 32
  });

  const cameraLayoutKey = useMemo(() => {
    if (viewMode === "dentition") return "dentition";
    if (selectionScopeType === "tooth")
      return `single-tooth:${selectionScopeId ?? ""}`;
    return `grouped:${selectionScopeType}:${selectionScopeId ?? ""}`;
  }, [viewMode, selectionScopeType, selectionScopeId]);

  const prevLayoutKey = useRef(cameraLayoutKey);
  const prevPatientType = useRef(patientType);
  const initialized = useRef(false);

  // Canvas-aspect-responsive dentition z
  const dentitionZ = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const widthFactor = (size.width - 980) / 980;
    const widthAdjust = Math.max(-1.8, Math.min(1.8, -widthFactor * 2.2));
    const base = (() => {
      if (aspect < 0.6) return 30;
      if (aspect < 0.8) return 26;
      if (aspect < 1.0) return 22;
      if (aspect < 1.2) return 19;
      if (aspect < 1.5) return 17;
      return 16;
    })();
    if (patientType === "pediatric") return base - 4.2 + widthAdjust;
    if (patientType === "mixed") return base + 0.3 + widthAdjust;
    return base - 1.4 + widthAdjust;
  }, [size.width, size.height, patientType]);

  const groupedScopeZ = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const widthFactor = (size.width - 980) / 980;
    const widthAdjust = Math.max(-1.6, Math.min(1.6, -widthFactor * 2.0));
    const zoomPad = 2.45;
    const groupedZoomBase = 1.15;
    const base = aspect < 0.8 ? 22 : aspect < 1.1 ? 19.6 : 17.6;
    let z;
    if (selectionScopeType === "full-mouth")
      z = base + (patientType === "mixed" ? 7.2 : 5.2) + widthAdjust + zoomPad;
    else if (selectionScopeType === "arch")
      z = base + (patientType === "mixed" ? 4.2 : 3.0) + widthAdjust + zoomPad;
    else
      z = base + (patientType === "mixed" ? 1.4 : 0.8) + widthAdjust + zoomPad;
    const isQuadrantOrSideArch =
      selectionScopeType === "quadrant" ||
      (selectionScopeType === "arch" &&
        (selectionScopeId === "RIGHT_ARCH" ||
          selectionScopeId === "LEFT_ARCH"));
    const zoomTotal =
      groupedZoomBase + (isQuadrantOrSideArch ? QUADRANT_SIDE_SCOPE_EXTRA_ZOOM : 0);
    return z - zoomTotal;
  }, [
    size.width,
    size.height,
    patientType,
    selectionScopeType,
    selectionScopeId
  ]);

  // Ctrl/Cmd + drag vertically nudges dentition framing (desktop).
  useEffect(() => {
    if (!controlsRef.current?.domElement) return;
    const dom = controlsRef.current.domElement;
    let dragging = false;
    let lastY = 0;
    const clampNudge = (v) => Math.max(-2.0, Math.min(2.0, v));
    const onPointerDown = (e) => {
      if (viewMode !== "dentition") return;
      if (e.pointerType === "touch") return;
      if (!(e.ctrlKey || e.metaKey)) return;
      dragging = true;
      lastY = e.clientY;
      if (controlsRef.current) controlsRef.current.enabled = false;
      e.preventDefault();
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const dy = e.clientY - lastY;
      lastY = e.clientY;
      if (controlsRef.current) {
        controlsRef.current.object.position.y += dy * 0.01;
        controlsRef.current.target.y += dy * 0.01;
        controlsRef.current.update();
      }
      onDentitionVerticalNudgeChange((prev) => clampNudge(prev + dy * 0.01));
      e.preventDefault();
    };
    const stopDragging = () => {
      if (!dragging) return;
      dragging = false;
      if (controlsRef.current?.dispatchEvent) {
        controlsRef.current.dispatchEvent({ type: "end" });
      }
      if (controlsRef.current && !animRef.current.active)
        controlsRef.current.enabled = true;
    };
    dom.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [controlsRef, viewMode, onDentitionVerticalNudgeChange]);

  const getCameraPreset = useCallback(() => {
    if (viewMode === "dentition") {
      if (dentitionCameraOverride) {
        return {
          cam: {
            ...DENTITION_CAMERA,
            position: new THREE.Vector3(
              dentitionCameraOverride.position[0],
              dentitionCameraOverride.position[1],
              dentitionCameraOverride.position[2]
            ),
            target: new THREE.Vector3(
              dentitionCameraOverride.target[0],
              dentitionCameraOverride.target[1],
              dentitionCameraOverride.target[2]
            )
          }
        };
      }
      const centeredY = 2.36;
      const centeredTargetY = -0.34;
      const dentitionFrameByType =
        patientType === "pediatric"
          ? { y: centeredY, targetY: centeredTargetY, z: dentitionZ - 2.05 }
          : patientType === "mixed"
          ? { y: centeredY, targetY: centeredTargetY, z: dentitionZ + 0.9 }
          : { y: centeredY, targetY: centeredTargetY, z: dentitionZ - 0.85 };
      return {
        cam: {
          ...DENTITION_CAMERA,
          position: new THREE.Vector3(
            DENTITION_CAMERA.position.x,
            dentitionFrameByType.y + dentitionVerticalNudge,
            dentitionFrameByType.z
          ),
          target: new THREE.Vector3(
            DENTITION_CAMERA.target.x,
            dentitionFrameByType.targetY + dentitionVerticalNudge,
            DENTITION_CAMERA.target.z
          )
        }
      };
    }
    if (selectionScopeType !== "tooth") {
      const isNarrowGrouped =
        selectionScopeType === "quadrant" ||
        (selectionScopeType === "arch" &&
          (selectionScopeId === "RIGHT_ARCH" ||
            selectionScopeId === "LEFT_ARCH"));
      if (isNarrowGrouped) {
        return {
          cam: {
            position: new THREE.Vector3(0, 0.64, groupedScopeZ),
            target: new THREE.Vector3(0, -0.04, -0.35),
            fov: 30.5
          }
        };
      }
      return {
        cam: {
          position: new THREE.Vector3(0, 0.53, groupedScopeZ),
          target: new THREE.Vector3(0, -0.13, -0.35),
          fov: 34.5
        }
      };
    }
    const rawFdi = selectionScopeId != null ? String(selectionScopeId) : "";
    const fdi = /^\d{2}$/.test(rawFdi) ? rawFdi : "11";
    return { cam: getSingleToothBuccalCamera(fdi, size.width, size.height) };
  }, [
    viewMode,
    patientType,
    selectionScopeType,
    selectionScopeId,
    dentitionZ,
    groupedScopeZ,
    dentitionVerticalNudge,
    dentitionCameraOverride,
    size.width,
    size.height
  ]);

  // Set initial camera position
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const { cam } = getCameraPreset();
    camera.position.copy(cam.position);
    camera.position.z = cam.position.z;
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(cam.target);
      controlsRef.current.update();
    }
  }, [getCameraPreset]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to canvas resize
  useEffect(() => {
    if (animRef.current.active) return;
    const { cam } = getCameraPreset();
    if (viewMode !== "dentition" && selectionScopeType === "tooth") {
      camera.position.copy(cam.position);
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
      if (controlsRef.current) {
        controlsRef.current.target.copy(cam.target);
        controlsRef.current.update();
      }
    } else {
      camera.position.z = cam.position.z;
      camera.updateProjectionMatrix();
      if (controlsRef.current) controlsRef.current.update();
    }
  }, [
    dentitionZ,
    groupedScopeZ,
    viewMode,
    selectionScopeType,
    getCameraPreset,
    camera,
    controlsRef
  ]);

  // Restore camera when switching patient tabs
  useEffect(() => {
    if (viewMode !== "dentition") {
      prevPatientType.current = patientType;
      return;
    }
    if (prevPatientType.current === patientType) return;
    prevPatientType.current = patientType;
    const { cam } = getCameraPreset();
    camera.position.copy(cam.position);
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(cam.target);
      controlsRef.current.update();
    }
  }, [patientType, viewMode, getCameraPreset, camera, controlsRef]);

  // Animate on dentition ↔ single-tooth transitions
  useEffect(() => {
    if (prevLayoutKey.current === cameraLayoutKey) return;
    prevLayoutKey.current = cameraLayoutKey;
    const { cam: target } = getCameraPreset();
    const a = animRef.current;
    a.startPos.copy(camera.position);
    a.endPos.copy(target.position);
    a.startTarget.copy(controlsRef.current?.target || new THREE.Vector3());
    a.endTarget.copy(target.target);
    a.startFov = camera.fov;
    a.endFov = target.fov;
    a.t = 0;
    a.active = true;
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [cameraLayoutKey, getCameraPreset, camera, controlsRef]);

  useFrame((_, delta) => {
    const a = animRef.current;
    if (!a.active) return;
    a.t += delta / 1.0; // 1.0 second transition
    const t = Math.min(a.t, 1);
    const ease = 1 - Math.pow(1 - t, 5); // easeOutQuint
    camera.position.lerpVectors(a.startPos, a.endPos, ease);
    camera.fov = a.startFov + (a.endFov - a.startFov) * ease;
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(a.startTarget, a.endTarget, ease);
      controlsRef.current.update();
    }
    if (t >= 1) {
      a.active = false;
      if (controlsRef.current) controlsRef.current.enabled = true;
    }
  });

  return null;
}
