import {
  Suspense,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo } from
"react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Tooth, getFrontAzimuth, getDirsForTooth } from "./Tooth";
import DentitionView from "./DentitionView";
import { ToothSelector } from "./ToothSelector";
import { QuickSurfaceSelector } from "./QuickSurfaceSelector";
import {
  TEETH,
  PEDIATRIC_TEETH,
  QUADRANT_LABELS,
  getDefaultTreatmentSurfaces,
  TOOTH_DIAGNOSES,
  DIAGNOSES,
  ALL_ZONES } from
"./types";
import { DENTAL_AI_SCAN_APPLY_EVENT } from "../tp-rxpad/dental-ai/dental-ai-events";
import { applyDiagnosisSelection } from "./DiagnosisMatrix";
import "./dental-canvas.css";
import dc from "./DentalCanvas.module.scss";
import { LottieIcon } from "../LottieIcon";
import { INITIAL_TOOTH_STATE } from "../mock-data";
import { EXAM_CHART_STORAGE_PREFIX } from "../plan/exam-suggestions";
let findingIdCounter = 0;
const VALID_TOOTH_DIAG = new Set(TOOTH_DIAGNOSES);
const VALID_SURFACE_FINDING = new Set(DIAGNOSES);
// Stable empty collections so default values don't create new identity per render
// (which would cause downstream useEffect deps to re-fire and re-inject shaders)
const EMPTY_DIAG_SET = new Set();
const EMPTY_FINDINGS = [];
/** Single-row dentition scope toolbar (quadrants, arches, full). */
const DENTITION_SCOPE_BUTTONS = [
{
  id: "UR",
  label: "UR",
  title: "Upper right quadrant"
},
{
  id: "UL",
  label: "UL",
  title: "Upper left quadrant"
},
{
  id: "LR",
  label: "LR",
  title: "Lower right quadrant"
},
{
  id: "LL",
  label: "LL",
  title: "Lower left quadrant"
},
{
  id: "RIGHT_ARCH",
  label: "R arch",
  title: "Patient's right arch (UR + LR)"
},
{
  id: "LEFT_ARCH",
  label: "L arch",
  title: "Patient's left arch (UL + LL)"
},
{
  id: "UPPER_ARCH",
  label: "Maxillary",
  title: "Maxillary arch (UR + UL)"
},
{
  id: "LOWER_ARCH",
  label: "Mandibular",
  title: "Mandibular arch (LR + LL)"
},
{
  id: "FULL",
  label: "Full",
  title: "Full mouth — all teeth"
}];


const ARCH_SCOPE_IDS = new Set([
"RIGHT_ARCH",
"LEFT_ARCH",
"UPPER_ARCH",
"LOWER_ARCH"]
);
/** Agent / voice rows share the same clinical name often — give each applied row its own table key. */
function allocateTreatmentHistoryDetailKey(acc, preferredName) {
  const base = preferredName && String(preferredName).trim() || "Treatment";
  if (!acc[base]) return base;
  let i = 2;
  while (acc[`${base} (${i})`]) i += 1;
  return `${base} (${i})`;
}
/** Map radiology / voice surface text to chart zones for treatment-history rows. */
function zonesFromAgentHistorySurface(surfaceRaw, treatmentName) {
  const fallback = () => {
    const d = [...getDefaultTreatmentSurfaces(treatmentName)];
    return d.length ? d : ["whole"];
  };
  const raw = (surfaceRaw || "").trim();
  if (!raw || /whole/i.test(raw)) return fallback();
  const s = raw.toLowerCase();
  const pairs = [
  ["occlusal", "occlusal"],
  ["buccal", "buccal"],
  ["labial", "buccal"],
  ["lingual", "lingual"],
  ["palatal", "lingual"],
  ["mesial", "mesial"],
  ["distal", "distal"],
  ["cervical", "cervical"],
  ["incisal", "occlusal"],
  ["root", "root"]];


  for (const [needle, z] of pairs) {
    if (s.includes(needle)) {
      if (z === "whole" || ALL_ZONES.includes(z)) return [z];
      break;
    }
  }
  return fallback();
}
/** Short tags in header — align with scope toolbar labels. */
const SCOPE_HEADER_BADGE = {
  FULL: "FULL",
  UR: "UR",
  UL: "UL",
  LR: "LR",
  LL: "LL",
  RIGHT_ARCH: "R arch",
  LEFT_ARCH: "L arch",
  UPPER_ARCH: "Maxillary",
  LOWER_ARCH: "Mandibular"
};
const SCOPE_SELECTION_LABELS = {
  UR: "Upper Right Quadrant",
  UL: "Upper Left Quadrant",
  LR: "Lower Right Quadrant",
  LL: "Lower Left Quadrant",
  RIGHT_ARCH: "Right arch",
  LEFT_ARCH: "Left arch",
  UPPER_ARCH: "Maxillary arch",
  LOWER_ARCH: "Mandibular arch"
};
function dentitionScopeIsActive(scopeId, selectionScope) {
  if (scopeId === "FULL") return selectionScope.type === "full-mouth";
  if (ARCH_SCOPE_IDS.has(scopeId))
  return selectionScope.type === "arch" && selectionScope.id === scopeId;
  return selectionScope.type === "quadrant" && selectionScope.id === scopeId;
}
// ══════════════════════════════════════════════════════════════
// Camera Controller — animates between dentition and single-tooth views
// ══════════════════════════════════════════════════════════════
const DENTITION_CAMERA = {
  position: new THREE.Vector3(0, 2.5, 16.5),
  target: new THREE.Vector3(0, -0.9, -0.3),
  fov: 35
};
/** Same default radius as ZoneCameraRotator so “no surface picked” matches buccal framing. */
const SINGLE_TOOTH_ORBIT_RADIUS = 6.28;
/** Single-tooth orbit target; Y slightly above old -0.04 so the tooth sits higher in frame. */
const SINGLE_TOOTH_TARGET = new THREE.Vector3(0, 0.04, 0);
const SINGLE_TOOTH_FOV = 27;
/** UR/UL/LR/LL + R/L: much closer Z than Max/Man/Full (see groupedScopeZ). */
const QUADRANT_SIDE_SCOPE_EXTRA_ZOOM = 3.15;
function getSingleToothBuccalCamera(fdi, width, height) {
  const aspect = width / Math.max(1, height);
  const widthFactor = (width - 980) / 980;
  const widthAdjust = Math.max(-1.1, Math.min(1.1, -widthFactor * 1.5));
  const aspectPull =
  aspect < 0.7 ?
  2.0 :
  aspect < 0.9 ?
  1.15 :
  aspect < 1.1 ?
  0.6 :
  aspect < 1.4 ?
  0.22 :
  0;
  const radius = SINGLE_TOOTH_ORBIT_RADIUS + aspectPull + widthAdjust * 0.35;
  const frontAz = getFrontAzimuth(String(fdi)) ?? 0;
  const offset = new THREE.Vector3().setFromSpherical(
    new THREE.Spherical(radius, Math.PI / 2, frontAz)
  );
  return {
    position: new THREE.Vector3().copy(SINGLE_TOOTH_TARGET).add(offset),
    target: SINGLE_TOOTH_TARGET.clone(),
    fov: SINGLE_TOOTH_FOV
  };
}
function ZoneCameraRotator({
  zone,
  toothFdi,
  quadrant,
  arch,
  controlsRef,
  radius = 6.28
}) {
  const { camera } = useThree();
  const target = useRef(null);
  useEffect(() => {
    if (!zone) return;
    const frontAz = getFrontAzimuth(toothFdi) ?? 0;
    let az = frontAz;
    let pol = Math.PI / 2;
    const dirs = getDirsForTooth(toothFdi, quadrant, 0);
    if (zone === "buccal") {
      az = frontAz;
      pol = Math.PI / 2;
    }
    if (zone === "lingual") {
      az = frontAz + Math.PI;
      pol = Math.PI / 2;
    }
    if (zone === "mesial") {
      az = Math.atan2(dirs.mesial.x, dirs.mesial.z);
      pol = Math.PI / 2;
    }
    if (zone === "distal") {
      az = Math.atan2(dirs.distal.x, dirs.distal.z);
      pol = Math.PI / 2;
    }
    if (zone === "occlusal") {
      az = frontAz;
      pol = arch === "mandibular" ? 0.25 : Math.PI - 0.25;
    }
    if (zone === "cervical") {
      az = frontAz;
      pol = arch === "mandibular" ? Math.PI / 2.4 : Math.PI - Math.PI / 2.4;
    }
    if (zone === "root") {
      az = frontAz;
      pol = arch === "mandibular" ? Math.PI - 0.35 : 0.35;
    }
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      controlsRef.current.enableDamping = false;
    }
    target.current = new THREE.Spherical(radius, pol, az);
  }, [zone, toothFdi, quadrant, arch, radius, controlsRef]);
  useFrame(() => {
    if (!target.current || !controlsRef.current) return;
    const controls = controlsRef.current;
    const center = controls.target;
    // Current spherical around target
    const offset = new THREE.Vector3().subVectors(camera.position, center);
    const cur = new THREE.Spherical().setFromVector3(offset);
    const goal = target.current;
    // Lerp spherical angles
    const lerp = 0.12;
    cur.theta += shortestAngleDelta(cur.theta, goal.theta) * lerp;
    cur.phi += (goal.phi - cur.phi) * lerp;
    // Keep radius roughly constant
    cur.radius += (goal.radius - cur.radius) * lerp;
    const next = new THREE.Vector3().setFromSpherical(cur);
    camera.position.copy(next.add(center));
    controls.update();
    // Stop when close enough
    if (
    Math.abs(shortestAngleDelta(cur.theta, goal.theta)) < 0.005 &&
    Math.abs(cur.phi - goal.phi) < 0.005 &&
    Math.abs(cur.radius - goal.radius) < 0.01)
    {
      target.current = null;
      if (controls) {
        controls.enabled = true;
        controls.enableDamping = true;
      }
    }
  });
  return null;
}
function shortestAngleDelta(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function CameraController({
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
  // Canvas-aspect-responsive dentition z: the narrower the canvas, the further
  // back the camera pulls so the whole arch still fits without cropping.
  // Wider range so narrow panels never clip the teeth.
  const dentitionZ = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const widthFactor = (size.width - 980) / 980;
    // Wider canvas => zoom in a bit (lower Z), narrower => zoom out (higher Z)
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
  /** Extra Z + framing so UR/Full/… grouped views clear the bottom tooth-chart overlay and fit the arch. */
  const groupedScopeZ = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const widthFactor = (size.width - 980) / 980;
    const widthAdjust = Math.max(-1.6, Math.min(1.6, -widthFactor * 2.0));
    const zoomPad = 2.45;
    const groupedZoomBase = 1.15;
    const base = aspect < 0.8 ? 22 : aspect < 1.1 ? 19.6 : 17.6;
    let z;
    if (selectionScopeType === "full-mouth")
    z = base + (patientType === "mixed" ? 7.2 : 5.2) + widthAdjust + zoomPad;else
    if (selectionScopeType === "arch")
    z = base + (patientType === "mixed" ? 4.2 : 3.0) + widthAdjust + zoomPad;else

    z = base + (patientType === "mixed" ? 1.4 : 0.8) + widthAdjust + zoomPad;
    const isQuadrantOrSideArch =
    selectionScopeType === "quadrant" ||
    selectionScopeType === "arch" && (
    selectionScopeId === "RIGHT_ARCH" ||
    selectionScopeId === "LEFT_ARCH");
    const zoomTotal =
    groupedZoomBase + (
    isQuadrantOrSideArch ? QUADRANT_SIDE_SCOPE_EXTRA_ZOOM : 0);
    return z - zoomTotal;
  }, [
  size.width,
  size.height,
  patientType,
  selectionScopeType,
  selectionScopeId]
  );
  // Ctrl/Cmd + drag vertically nudges dentition framing (desktop).
  // iPad keeps native 2-finger panning through OrbitControls.
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
        controlsRef.current.dispatchEvent({
          type: "end"
        });
      }
      if (controlsRef.current && !animRef.current.active)
      controlsRef.current.enabled = true;
    };
    dom.addEventListener("pointerdown", onPointerDown, {
      passive: false
    });
    window.addEventListener("pointermove", onPointerMove, {
      passive: false
    });
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
      // Keep all dentition variants aligned to the canvas center-line vertically.
      const centeredY = 2.36;
      const centeredTargetY = -0.34;
      const dentitionFrameByType =
      patientType === "pediatric" ?
      {
        y: centeredY,
        targetY: centeredTargetY,
        z: dentitionZ - 2.05
      } :
      patientType === "mixed" ?
      {
        y: centeredY,
        targetY: centeredTargetY,
        z: dentitionZ + 0.9
      } :
      {
        y: centeredY,
        targetY: centeredTargetY,
        z: dentitionZ - 0.85
      };
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
      selectionScopeType === "arch" && (
      selectionScopeId === "RIGHT_ARCH" ||
      selectionScopeId === "LEFT_ARCH");
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
    return {
      cam: getSingleToothBuccalCamera(fdi, size.width, size.height)
    };
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
  size.height]
  );
  // Set initial camera position based on initial viewMode
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
  // React to canvas resize (e.g. draggable split) — both modes.
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
  controlsRef]
  );
  // Switching patient tabs should restore that tab's own view (or default),
  // rather than carrying over the previous tab's current camera transform.
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
  // Animate on dentition ↔ single-tooth, and when grouped scope id changes (UR→UL, Max→R, …).
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
    a.t += delta / 1.0; // 1.0 second transition — more pronounced zoom
    const t = Math.min(a.t, 1);
    // easeOutQuint — a stronger slowdown near the end gives the "settle into place" feel
    const ease = 1 - Math.pow(1 - t, 5);
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
// ══════════════════════════════════════════════════════════════
// App
// ══════════════════════════════════════════════════════════════
const EMPTY_DIAGNOSES = new Set();
const EMPTY_TREATMENTS = {};
const getTeethForPatientType = (type) =>
type === "adult" ?
TEETH :
type === "pediatric" ?
PEDIATRIC_TEETH :
[...TEETH, ...PEDIATRIC_TEETH];
const getDefaultFdiForPatientType = (type) =>
type === "adult" ? "26" : type === "pediatric" ? "64" : "26";
export function DentalCanvas({
  patientId,
  patientAge = 30,
  compact = false,
  onStateChange
}) {
  // Pull initial state for this patient from mock data
  const initialState = INITIAL_TOOTH_STATE[patientId];
  const initialToothDiagnoses = useMemo(() => {
    if (!initialState?.toothDiagnoses) return {};
    const out = {};
    for (const [fdi, diags] of Object.entries(initialState.toothDiagnoses)) {
      out[fdi] = new Set(diags);
    }
    return out;
  }, [initialState]);
  const initialImplants = useMemo(
    () => new Set(initialState?.implantTeeth ?? []),
    [initialState]
  );
  const initialFindings = useMemo(() => {
    if (!initialState?.findingsByTooth) return {};
    const out = {};
    for (const [fdi, list] of Object.entries(initialState.findingsByTooth)) {
      out[fdi] = list.map((f, i) => ({
        id: `seed-${fdi}-${i}`,
        zoneId: f.zoneId,
        type: f.type,
        notes: ""
      }));
    }
    return out;
  }, [initialState]);
  const [patientType, setPatientType] = useState(
    patientAge < 12 ? "pediatric" : "adult"
  );
  const activeTeeth = useMemo(
    () => getTeethForPatientType(patientType),
    [patientType]
  );
  const [viewMode, setViewMode] = useState("dentition");
  const [selectedTooth, setSelectedTooth] = useState(
    activeTeeth.find(
      (t) => t.fdi === getDefaultFdiForPatientType(patientType)
    ) ?? activeTeeth[0]
  );
  const [selectionScope, setSelectionScope] = useState({
    type: "tooth",
    id: "tooth",
    label: "",
    fdis: []
  });
  const hasHydratedFromStorage = useRef(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [, setHoveredZone] = useState(null);
  const [findingsByTooth, setFindingsByTooth] = useState(initialFindings);
  // Last 3D click point per zone (world space) — used as spot decal center for findings.
  // Keyed by "fdi-zoneId" so points are scoped to the correct tooth.
  const [zoneHitPoints, setZoneHitPoints] = useState({});
  const [zoneNotes, setZoneNotes] = useState({});
  const [implantTeeth, setImplantTeeth] = useState(initialImplants);
  const [toothDiagnoses, setToothDiagnoses] = useState(initialToothDiagnoses);
  const [toothNotes, setToothNotes] = useState({});
  const [allEntries, setAllEntries] = useState([]);
  const [treatmentHistoryDetailsByTooth, setTreatmentHistoryDetailsByTooth] =
  useState({});
  const [highlightZones, setHighlightZones] = useState([]);
  const [multiSelectZones, setMultiSelectZones] = useState(() => new Set());
  const [multiSelectActive, setMultiSelectActive] = useState(false);
  const [hoveredToothFdi, setHoveredToothFdi] = useState(null);
  const [dentitionVerticalNudgeByType, setDentitionVerticalNudgeByType] =
  useState({});
  const [dentitionCameraByType, setDentitionCameraByType] = useState({});
  const [hideExamineHint, setHideExamineHint] = useState(false);
  /** FDI set — teeth pulse briefly after Dr Agent / AI scan copy-to-chart */
  const [agentApplyPulseFdis, setAgentApplyPulseFdis] = useState(
    () => new Set()
  );
  const agentPulseClearTimerRef = useRef(null);
  const controlsRef = useRef(null);
  const dentitionVerticalNudge = dentitionVerticalNudgeByType[patientType] ?? 0;
  const dentitionCameraOverride = dentitionCameraByType[patientType];
  useEffect(() => {
    if (!selectionScope.fdis.length) {
      setSelectionScope({
        type: "tooth",
        id: selectedTooth.fdi,
        label: `${QUADRANT_LABELS[selectedTooth.quadrant]} ${selectedTooth.name}`,
        fdis: [selectedTooth.fdi]
      });
    }
  }, [selectionScope.fdis.length, selectedTooth]);
  useEffect(() => {
    if (typeof window === "undefined" || hasHydratedFromStorage.current) return;
    hasHydratedFromStorage.current = true;
    const raw = window.localStorage.getItem(`dental.canvas.state.${patientId}`);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      const nextType =
      saved.patientType === "adult" ||
      saved.patientType === "pediatric" ||
      saved.patientType === "mixed" ?
      saved.patientType :
      undefined;
      if (nextType) setPatientType(nextType);
      const source = getTeethForPatientType(nextType ?? patientType);
      const candidateFdi = saved.selectedToothFdi;
      const fallbackFdi = getDefaultFdiForPatientType(nextType ?? patientType);
      const tooth =
      source.find((t) => t.fdi === candidateFdi) ??
      source.find((t) => t.fdi === fallbackFdi) ??
      source[0];
      if (tooth) {
        setSelectedTooth(tooth);
        setSelectionScope({
          type: "tooth",
          id: tooth.fdi,
          label: `${QUADRANT_LABELS[tooth.quadrant]} ${tooth.name}`,
          fdis: [tooth.fdi]
        });
      }
      if (saved.selectionScope && saved.selectionScope.fdis?.length) {
        setSelectionScope(saved.selectionScope);
      }
      // NOTE: intentionally do NOT restore `viewMode` from localStorage.
      // Every fresh mount of the Dental Examination should boot into the
      // full dentition view; single-tooth mode is a transient drill-down
      // driven by user click within the session.
      if (saved.dentitionVerticalNudgeByType) {
        setDentitionVerticalNudgeByType(saved.dentitionVerticalNudgeByType);
      }
      if (saved.dentitionCameraByType) {
        setDentitionCameraByType(saved.dentitionCameraByType);
      }
    } catch {

      // ignore corrupted localStorage payload
    }}, [patientId, patientType]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hidden = window.localStorage.getItem(
      `dental.canvas.hintDismissed.${patientId}`
    );
    if (hidden === "1") setHideExamineHint(true);
  }, [patientId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      patientType,
      viewMode,
      selectedToothFdi: selectedTooth.fdi,
      selectionScope,
      dentitionVerticalNudgeByType,
      dentitionCameraByType
    };
    window.localStorage.setItem(
      `dental.canvas.state.${patientId}`,
      JSON.stringify(payload)
    );
  }, [
  patientId,
  patientType,
  viewMode,
  selectedTooth.fdi,
  selectionScope,
  dentitionVerticalNudgeByType,
  dentitionCameraByType]
  );
  // Persist examination clinical data so Treatment Plan "quick picks" stay in sync with the chart.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const entries = allEntries.
    filter((e) => e.kind === "procedure" || e.kind === "planned").
    map((e) => ({
      toothFdi: e.toothFdi,
      kind: e.kind,
      name: e.name,
      surfaces: [...(e.surfaces ?? [])]
    }));
    const findingsSerialized = Object.fromEntries(
      Object.entries(findingsByTooth).map(([fdi, list]) => [
      fdi,
      list.map((f) => ({
        zoneId: f.zoneId,
        type: f.type
      }))]
      )
    );
    const diagSerialized = Object.fromEntries(
      Object.entries(toothDiagnoses).map(([fdi, set]) => [fdi, [...set]])
    );
    try {
      window.localStorage.setItem(
        `${EXAM_CHART_STORAGE_PREFIX}${patientId}`,
        JSON.stringify({
          updatedAt: Date.now(),
          entries,
          toothDiagnoses: diagSerialized,
          findingsByTooth: findingsSerialized
        })
      );
      window.dispatchEvent(
        new CustomEvent("dental-exam-chart-updated", {
          detail: {
            patientId
          }
        })
      );
    } catch {

      // ignore quota / private mode
    }}, [patientId, allEntries, toothDiagnoses, findingsByTooth]);
  const handleDentitionVerticalNudgeChange = useCallback(
    (value) => {
      setDentitionVerticalNudgeByType((prev) => {
        const current = prev[patientType] ?? 0;
        const nextRaw = typeof value === "function" ? value(current) : value;
        const next = Math.max(-2.0, Math.min(2.0, nextRaw));
        if (Math.abs(next - current) < 0.0001) return prev;
        return {
          ...prev,
          [patientType]: next
        };
      });
    },
    [patientType]
  );
  const handleDentitionControlsEnd = useCallback(() => {
    if (viewMode !== "dentition" || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    const p = ctrl.object?.position;
    const t = ctrl.target;
    if (!p || !t) return;
    const pose = {
      position: [p.x, p.y, p.z],
      target: [t.x, t.y, t.z]
    };
    setDentitionCameraByType((prev) => ({
      ...prev,
      [patientType]: pose
    }));
  }, [patientType, viewMode]);
  useEffect(() => {
    if (hideExamineHint) return;
    const hasExamData =
    allEntries.length > 0 ||
    Object.values(findingsByTooth).some((items) => items.length > 0);
    if (!hasExamData) return;
    setHideExamineHint(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `dental.canvas.hintDismissed.${patientId}`,
        "1"
      );
    }
  }, [allEntries.length, findingsByTooth, hideExamineHint, patientId]);
  const currentToothDiagnoses = useMemo(
    () => toothDiagnoses[selectedTooth.fdi] || EMPTY_DIAGNOSES,
    [toothDiagnoses, selectedTooth.fdi]
  );
  const isImplant =
  currentToothDiagnoses.has("Implant") || implantTeeth.has(selectedTooth.fdi);
  const currentToothNotes = toothNotes[selectedTooth.fdi] || "";
  const currentTreatmentHistoryDetails = useMemo(() => {
    return (
      treatmentHistoryDetailsByTooth[selectedTooth.fdi] || EMPTY_TREATMENTS);

  }, [treatmentHistoryDetailsByTooth, selectedTooth.fdi]);
  // Implant toggle routes through the compatibility matrix (see toggleToothDiagnosis below).
  // The matrix sync-fires `setImplantTeeth` to keep the top-level set in step so the
  // ImplantScrew shader sees the same truth as the UI chips.
  const toggleImplant = useCallback(() => {
    // Forward-ref: toggleToothDiagnosis is declared below but captured at call time.
    // Using a deferred wrapper avoids use-before-declaration lint errors.
    toggleToothDiagnosisRef.current?.("Implant");
    setSelectedZone((prev) =>
    prev === "cervical" || prev === "root" ? null : prev
    );
  }, []);
  const toggleToothDiagnosisRef = useRef(null);
  const toggleToothDiagnosis = useCallback(
    (diagnosis) => {
      const fdi = selectedTooth.fdi;
      setToothDiagnoses((prev) => {
        const current = new Set(prev[fdi] || []);
        const next = applyDiagnosisSelection(current, diagnosis);
        // If Implant was removed by the matrix, also drop from implantTeeth set.
        if (current.has("Implant") && !next.has("Implant")) {
          setImplantTeeth((ip) => {
            const n = new Set(ip);
            n.delete(fdi);
            return n;
          });
        }
        // If Implant was added by the matrix (via click), mirror into implantTeeth.
        if (!current.has("Implant") && next.has("Implant")) {
          setImplantTeeth((ip) => {
            const n = new Set(ip);
            n.add(fdi);
            return n;
          });
        }
        return {
          ...prev,
          [fdi]: next
        };
      });
      // Tooth-level diagnosis changed → clear all surface findings for this tooth
      setFindingsByTooth((prev) => {
        const next = {
          ...prev
        };
        delete next[fdi];
        return next;
      });
      if (diagnosis === "Missing" || diagnosis === "Extraction") {
        setImplantTeeth((prev) => {
          const next = new Set(prev);
          next.delete(selectedTooth.fdi);
          return next;
        });
        setSelectedZone(null);
      }
    },
    [selectedTooth.fdi]
  );
  // Keep the deferred ref in sync so toggleImplant can route through the matrix.
  toggleToothDiagnosisRef.current = toggleToothDiagnosis;
  const updateToothNotes = useCallback(
    (notes) => {
      setToothNotes((prev) => ({
        ...prev,
        [selectedTooth.fdi]: notes
      }));
    },
    [selectedTooth.fdi]
  );
  const handleSelectTooth = useCallback((tooth) => {
    setSelectedTooth(tooth);
    setSelectionScope({
      type: "tooth",
      id: tooth.fdi,
      label: `${QUADRANT_LABELS[tooth.quadrant]} ${tooth.name}`,
      fdis: [tooth.fdi]
    });
    setSelectedZone(null);
    setViewMode("single-tooth");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      const detail = e.detail;
      if (!detail || detail.patientId !== patientId) return;
      const {
        teeth,
        focusFdi,
        openFullDentition,
        patientTypeHint,
        highlightFdis
      } = detail;
      if (!Array.isArray(teeth) || teeth.length === 0) return;
      const effectivePatientType =
      patientTypeHint === "adult" ||
      patientTypeHint === "pediatric" ||
      patientTypeHint === "mixed" ?
      patientTypeHint :
      patientType;
      if (
      patientTypeHint === "adult" ||
      patientTypeHint === "pediatric" ||
      patientTypeHint === "mixed")
      {
        setPatientType(patientTypeHint);
      }
      setToothDiagnoses((prev) => {
        const next = {
          ...prev
        };
        for (const t of teeth) {
          const fdi = String(t.fdi);
          const cur = new Set(next[fdi] || []);
          if (t.implant) cur.add("Implant");
          for (const d of t.diagnoses || []) {
            if (VALID_TOOTH_DIAG.has(d)) cur.add(d);
          }
          next[fdi] = cur;
        }
        return next;
      });
      setImplantTeeth((prev) => {
        const n = new Set(prev);
        for (const t of teeth) {
          if (t.implant) n.add(String(t.fdi));
        }
        return n;
      });
      setFindingsByTooth((prev) => {
        const next = {
          ...prev
        };
        for (const t of teeth) {
          const fdi = String(t.fdi);
          const list = [...(next[fdi] || [])];
          for (const f of t.findings || []) {
            const z = f.zoneId;
            const zoneId =
            z === "whole" || ALL_ZONES.includes(z) ? z : "occlusal";
            const type = VALID_SURFACE_FINDING.has(f.type) ?
            f.type :
            "Staining";
            const notes = (f.notes || "").trim();
            list.push({
              id: `finding-${++findingIdCounter}`,
              zoneId,
              type,
              notes: notes || "From AI scan"
            });
          }
          next[fdi] = list;
        }
        return next;
      });
      setTreatmentHistoryDetailsByTooth((prev) => {
        let next = prev;
        let changed = false;
        for (const t of teeth) {
          const fdi = String(t.fdi);
          const rows =
          t.treatmentHistoryRows && t.treatmentHistoryRows.length > 0 ?
          t.treatmentHistoryRows :
          (t.treatmentHistory || []).map((line) => ({
            name: line
          }));
          if (!rows.length) continue;
          if (!changed) {
            next = {
              ...prev
            };
            changed = true;
          }
          const cur = next[fdi] || {};
          const acc = {
            ...cur
          };
          for (const row of rows) {
            const baseName =
            row.name && String(row.name).trim() || "Treatment";
            const key = allocateTreatmentHistoryDetailKey(acc, baseName);
            const zones = zonesFromAgentHistorySurface(row.surface, baseName);
            const prevD = acc[key];
            const noteMerge = [prevD?.note, row.notes].
            filter(Boolean).
            join(", ").
            trim();
            acc[key] = {
              ...prevD,
              surfaces: zones.length ?
              zones :
              [...getDefaultTreatmentSurfaces(baseName)],
              since:
              row.since && String(row.since).trim() || prevD?.since || "",
              note: noteMerge || prevD?.note || ""
            };
          }
          next[fdi] = acc;
        }
        return changed ? next : prev;
      });
      setAllEntries((prev) => {
        const add = [];
        for (const t of teeth) {
          const fdi = String(t.fdi);
          for (const p of t.procedures || []) {
            const name = p.name && String(p.name).trim() || "";
            if (!name) continue;
            const noteBits = [
            p.surface && p.surface !== "—" ? p.surface : null,
            p.date,
            p.status,
            p.notes].
            filter(Boolean);
            add.push({
              id: `agent-proc-${fdi}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              toothFdi: fdi,
              kind: "procedure",
              name,
              surfaces: [...getDefaultTreatmentSurfaces(name)],
              notes: noteBits.length ? noteBits.join(" · ") : undefined
            });
          }
        }
        return add.length ? [...prev, ...add] : prev;
      });
      setToothNotes((prev) => {
        let next = prev;
        let changed = false;
        for (const t of teeth) {
          const note = t.scannerNotes?.trim();
          if (!note) continue;
          const fdi = String(t.fdi);
          const existing = (next[fdi] || "").trim();
          const merged = existing ? `${existing}\n${note}` : note;
          if (!changed) {
            next = {
              ...prev
            };
            changed = true;
          }
          next[fdi] = merged;
        }
        return changed ? next : prev;
      });
      const goFullDentition = openFullDentition !== false;
      if (goFullDentition) {
        const source = getTeethForPatientType(effectivePatientType);
        const allFdis = source.map((t) => t.fdi);
        if (allFdis.length > 0) {
          const representative =
          source.find((t) => t.fdi === allFdis[0]) ?? source[0];
          setSelectedTooth(representative);
          setSelectionScope({
            type: "full-mouth",
            id: "FULL",
            label: "Full mouth",
            fdis: allFdis
          });
          setSelectedZone(null);
          setViewMode("dentition");
        }
        const pulseList =
        highlightFdis && highlightFdis.length > 0 ?
        highlightFdis :
        teeth.map((t) => String(t.fdi));
        const pulseSet = new Set(pulseList.map((fdi) => String(fdi)));
        setAgentApplyPulseFdis(pulseSet);
        if (agentPulseClearTimerRef.current)
        window.clearTimeout(agentPulseClearTimerRef.current);
        agentPulseClearTimerRef.current = window.setTimeout(() => {
          setAgentApplyPulseFdis(new Set());
          agentPulseClearTimerRef.current = null;
        }, 1300);
      } else if (focusFdi) {
        const source = getTeethForPatientType(effectivePatientType);
        const tooth = source.find((x) => x.fdi === String(focusFdi));
        if (tooth) handleSelectTooth(tooth);
        const pulseList =
        highlightFdis && highlightFdis.length > 0 ?
        highlightFdis :
        [String(focusFdi)];
        const pulseSet = new Set(pulseList.map((fdi) => String(fdi)));
        setAgentApplyPulseFdis(pulseSet);
        if (agentPulseClearTimerRef.current)
        window.clearTimeout(agentPulseClearTimerRef.current);
        agentPulseClearTimerRef.current = window.setTimeout(() => {
          setAgentApplyPulseFdis(new Set());
          agentPulseClearTimerRef.current = null;
        }, 1300);
      }
    };
    window.addEventListener(DENTAL_AI_SCAN_APPLY_EVENT, handler);
    return () => {
      window.removeEventListener(DENTAL_AI_SCAN_APPLY_EVENT, handler);
      if (agentPulseClearTimerRef.current)
      window.clearTimeout(agentPulseClearTimerRef.current);
    };
  }, [patientId, patientType, handleSelectTooth]);
  const handleBackToDentition = useCallback(() => {
    setViewMode("dentition");
    setSelectionScope({
      type: "tooth",
      id: selectedTooth.fdi,
      label: `${QUADRANT_LABELS[selectedTooth.quadrant]} ${selectedTooth.name}`,
      fdis: [selectedTooth.fdi]
    });
    setSelectedZone(null);
    setHoveredZone(null);
  }, [selectedTooth]);
  const getScopeFdis = useCallback(
    (scope) => {
      const source = getTeethForPatientType(patientType);
      if (scope === "FULL") return source.map((t) => t.fdi);
      const quadrantMap = {
        UR: "upper-right",
        UL: "upper-left",
        LR: "lower-right",
        LL: "lower-left"
      };
      if (quadrantMap[scope])
      return source.
      filter((t) => t.quadrant === quadrantMap[scope]).
      map((t) => t.fdi);
      const archQuadrants = {
        RIGHT_ARCH: ["upper-right", "lower-right"],
        LEFT_ARCH: ["upper-left", "lower-left"],
        UPPER_ARCH: ["upper-right", "upper-left"],
        LOWER_ARCH: ["lower-right", "lower-left"]
      };
      const qs = archQuadrants[scope];
      if (qs)
      return source.filter((t) => qs.includes(t.quadrant)).map((t) => t.fdi);
      return [];
    },
    [patientType]
  );
  const handleSelectScope = useCallback(
    (scope) => {
      const fdis = getScopeFdis(scope);
      if (fdis.length === 0) return;
      const representative =
      activeTeeth.find((t) => t.fdi === fdis[0]) ?? activeTeeth[0];
      setSelectedTooth(representative);
      const scopeType =
      scope === "FULL" ?
      "full-mouth" :
      ARCH_SCOPE_IDS.has(scope) ?
      "arch" :
      "quadrant";
      setSelectionScope({
        type: scopeType,
        id: scope,
        label: scope === "FULL" ? "Full mouth" : SCOPE_SELECTION_LABELS[scope],
        fdis
      });
      setSelectedZone(null);
      setViewMode("single-tooth");
    },
    [activeTeeth, getScopeFdis]
  );
  // Tooth chart scope bar: same scope state as the dentition toolbar so the
  // 3D preview (grouped DentitionView) updates. Preserve the current tooth when
  // it already lies in the chosen scope; otherwise jump to the first tooth.
  const handleToothScopeJump = useCallback(
    (scope) => {
      const fdis = getScopeFdis(scope);
      if (fdis.length === 0) return;
      setSelectedTooth((prev) => {
        if (prev && fdis.includes(prev.fdi)) return prev;
        return activeTeeth.find((t) => t.fdi === fdis[0]) ?? prev;
      });
      setSelectionScope({
        type:
        scope === "FULL" ?
        "full-mouth" :
        ARCH_SCOPE_IDS.has(scope) ?
        "arch" :
        "quadrant",
        id: scope,
        label: scope === "FULL" ? "Full mouth" : SCOPE_SELECTION_LABELS[scope],
        fdis
      });
      setSelectedZone(null);
      setViewMode("single-tooth");
    },
    [activeTeeth, getScopeFdis]
  );
  const handlePatientTypeChange = useCallback((nextType) => {
    setPatientType(nextType);
    const nextTeeth = getTeethForPatientType(nextType);
    setSelectedTooth((prev) => {
      const nextSelected =
      nextTeeth.find((t) => t.fdi === prev.fdi) ??
      nextTeeth.find(
        (t) => t.fdi === getDefaultFdiForPatientType(nextType)
      ) ??
      nextTeeth[0];
      setSelectionScope({
        type: "tooth",
        id: nextSelected.fdi,
        label: `${QUADRANT_LABELS[nextSelected.quadrant]} ${nextSelected.name}`,
        fdis: [nextSelected.fdi]
      });
      return nextSelected;
    });
  }, []);
  const handleSelectZone = useCallback(
    (zone, hitPoint, opts) => {
      if (
      currentToothDiagnoses.has("Missing") ||
      currentToothDiagnoses.has("Extraction"))

      return;
      if (hitPoint) {
        const key = `${selectedTooth.fdi}-${zone}`;
        setZoneHitPoints((prev) => ({
          ...prev,
          [key]: hitPoint
        }));
      }
      if (opts?.multi) {
        // Always rotate camera to the clicked surface — even during multi-select
        setSelectedZone(zone);
        setMultiSelectZones((prev) => {
          const next = new Set(prev);
          if (zone !== "whole" && next.has("whole")) next.delete("whole");
          if (next.has(zone)) next.delete(zone);else
          next.add(zone);
          return next;
        });
        return;
      }
      setSelectedZone((prev) => prev === zone ? null : zone);
    },
    [currentToothDiagnoses, selectedTooth.fdi]
  );
  const handleToggleZoneMultiSelect = useCallback(
    (zone) => {
      // Always rotate the 3D camera to the picked surface — the 3D canvas
      // reacts to actions happening in the side panel (bi-directional link).
      setSelectedZone((prev) =>
      multiSelectActive ? zone : prev === zone ? null : zone
      );
      // Multi-select mode is gated by multiSelectActive (enabled only when a
      // surface cell in the Findings/Procedures table is active).
      if (!multiSelectActive) return;
      setMultiSelectZones((prev) => {
        if (zone === "whole") {
          return prev.has("whole") ? new Set() : new Set(["whole"]);
        }
        const next = new Set(prev);
        if (next.has("whole")) next.delete("whole");
        if (next.has(zone)) next.delete(zone);else
        next.add(zone);
        return next;
      });
    },
    [multiSelectActive]
  );
  const handleToggleZoneFromQuickSelector = useCallback(
    (zone) => {
      // Keep selector visible always, but only allow true multi-select
      // while a surfaces cell is actively editing.
      if (!multiSelectActive) {
        setMultiSelectZones((prev) => prev.size === 0 ? prev : new Set());
        setSelectedZone((prev) => prev === zone ? null : zone);
        return;
      }
      setSelectedZone(zone);
      setMultiSelectZones((prev) => {
        if (zone === "whole") {
          return prev.has("whole") ? new Set() : new Set(["whole"]);
        }
        const next = new Set(prev);
        if (next.has("whole")) next.delete("whole");
        if (next.has(zone)) next.delete(zone);else
        next.add(zone);
        return next;
      });
    },
    [multiSelectActive]
  );
  const handleClearMultiSelect = useCallback(() => {
    setMultiSelectZones((prev) => prev.size === 0 ? prev : new Set());
  }, []);
  const handleClearSelectedZone = useCallback(() => {
    setSelectedZone(null);
  }, []);
  const handleSetMultiSelectZones = useCallback((zones) => {
    setMultiSelectZones((prev) => {
      if (prev.size === zones.length && zones.every((zone) => prev.has(zone)))
      return prev;
      return new Set(zones);
    });
  }, []);
  const handleSetMultiSelectActive = useCallback((active) => {
    setMultiSelectActive(active);
  }, []);
  const handleSetHoveredTooth = useCallback((fdi) => {
    setHoveredToothFdi(fdi);
  }, []);
  const handleAddFinding = useCallback(
    (zoneId, type) => {
      const id = `finding-${++findingIdCounter}`;
      const fdi = selectedTooth.fdi;
      const hitPoint = zoneHitPoints[`${fdi}-${zoneId}`];
      setFindingsByTooth((prev) => {
        let list = [...(prev[fdi] || [])];
        if (type === "Normal") {
          list = list.filter((f) => f.zoneId !== zoneId);
        } else {
          list = list.filter(
            (f) => !(f.zoneId === zoneId && f.type === "Normal")
          );
        }
        list.push({
          id,
          zoneId,
          type,
          notes: "",
          hitPoint
        });
        return {
          ...prev,
          [fdi]: list
        };
      });
    },
    [zoneHitPoints, selectedTooth.fdi]
  );
  const handleRemoveFinding = useCallback(
    (id) => {
      const fdi = selectedTooth.fdi;
      setFindingsByTooth((prev) => {
        const list = (prev[fdi] || []).filter((f) => f.id !== id);
        return {
          ...prev,
          [fdi]: list
        };
      });
    },
    [selectedTooth.fdi]
  );
  // Current tooth's findings (derived, stable identity when empty)
  const findings = findingsByTooth[selectedTooth.fdi] || EMPTY_FINDINGS;
  const handleUpdateNotes = useCallback((zoneId, notes) => {
    setZoneNotes((prev) => ({
      ...prev,
      [zoneId]: notes
    }));
  }, []);
  // ── Entity-centric entries (findings + procedures) ──────────────
  let entryIdCounter = useRef(0).current;
  const handleAddEntry = useCallback(
    (partial) => {
      const fdi = selectedTooth.fdi;
      setAllEntries((prev) => [
      ...prev,
      {
        ...partial,
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        toothFdi: fdi
      }]
      );
    },
    [selectedTooth.fdi]
  );
  const handleUpdateEntry = useCallback((id, patch) => {
    setAllEntries((prev) =>
    prev.map((e) =>
    e.id === id ?
    {
      ...e,
      ...patch
    } :
    e
    )
    );
  }, []);
  const handleRemoveEntry = useCallback((id) => {
    setAllEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);
  const handleUpdateTreatmentHistoryDetail = useCallback(
    (name, patch) => {
      const fdi = selectedTooth.fdi;
      setTreatmentHistoryDetailsByTooth((prev) => {
        const currentToothDetails = prev[fdi] || {};
        const previous = currentToothDetails[name] || {
          surfaces: getDefaultTreatmentSurfaces(name)
        };
        return {
          ...prev,
          [fdi]: {
            ...currentToothDetails,
            [name]: {
              ...previous,
              ...patch
            }
          }
        };
      });
    },
    [selectedTooth.fdi]
  );
  const handleRemoveTreatmentHistoryDetail = useCallback(
    (name) => {
      const fdi = selectedTooth.fdi;
      setTreatmentHistoryDetailsByTooth((prev) => {
        const toothMap = prev[fdi];
        if (!toothMap || !toothMap[name]) return prev;
        const { [name]: _removed, ...rest } = toothMap;
        return {
          ...prev,
          [fdi]: rest
        };
      });
    },
    [selectedTooth.fdi]
  );
  const handleClearTreatmentHistoryDetails = useCallback(() => {
    const fdi = selectedTooth.fdi;
    setTreatmentHistoryDetailsByTooth((prev) => {
      if (!prev[fdi]) return prev;
      const next = {
        ...prev
      };
      delete next[fdi];
      return next;
    });
  }, [selectedTooth.fdi]);
  const handleSetHighlightZones = useCallback((zones) => {
    setHighlightZones(zones);
  }, []);
  const currentToothEntries = useMemo(
    () => allEntries.filter((e) => e.toothFdi === selectedTooth.fdi),
    [allEntries, selectedTooth.fdi]
  );
  // Emit state changes to parent (ExaminationTab) for the right-side panel
  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      viewMode,
      patientType,
      selectedTooth,
      selectedZone,
      findings,
      toothDiagnoses,
      implantTeeth,
      findingsByTooth,
      toothNotes,
      treatmentHistoryDetailsByTooth,
      agentApplyPulseFdis,
      currentToothDiagnoses,
      currentToothNotes,
      zoneNotes,
      isImplant,
      currentToothEntries,
      currentTreatmentHistoryDetails,
      allEntries,
      highlightZones,
      multiSelectZones,
      multiSelectActive,
      hoveredToothFdi,
      selectionScopeType: selectionScope.type,
      selectionScopeId: selectionScope.id,
      selectionScopeLabel: selectionScope.label,
      selectionScopeFdis: selectionScope.fdis,
      onToggleToothDiagnosis: toggleToothDiagnosis,
      onToggleImplant: toggleImplant,
      onAddFinding: handleAddFinding,
      onRemoveFinding: handleRemoveFinding,
      onUpdateNotes: handleUpdateNotes,
      onUpdateToothNotes: updateToothNotes,
      onBackToDentition: handleBackToDentition,
      onSelectTooth: handleSelectTooth,
      onSelectZone: handleSelectZone,
      onClearSelectedZone: handleClearSelectedZone,
      onAddEntry: handleAddEntry,
      onUpdateEntry: handleUpdateEntry,
      onRemoveEntry: handleRemoveEntry,
      onUpdateTreatmentHistoryDetail: handleUpdateTreatmentHistoryDetail,
      onRemoveTreatmentHistoryDetail: handleRemoveTreatmentHistoryDetail,
      onClearTreatmentHistoryDetails: handleClearTreatmentHistoryDetails,
      onSetHighlightZones: handleSetHighlightZones,
      onToggleZoneMultiSelect: handleToggleZoneMultiSelect,
      onSetMultiSelectZones: handleSetMultiSelectZones,
      onClearMultiSelect: handleClearMultiSelect,
      onSetMultiSelectActive: handleSetMultiSelectActive,
      onSetHoveredTooth: handleSetHoveredTooth
    });
  }, [
  viewMode,
  patientType,
  selectedTooth,
  selectedZone,
  findings,
  toothDiagnoses,
  implantTeeth,
  findingsByTooth,
  toothNotes,
  treatmentHistoryDetailsByTooth,
  agentApplyPulseFdis,
  currentToothDiagnoses,
  currentToothNotes,
  currentTreatmentHistoryDetails,
  zoneNotes,
  isImplant,
  onStateChange,
  currentToothEntries,
  allEntries,
  highlightZones,
  multiSelectZones,
  multiSelectActive,
  hoveredToothFdi,
  selectionScope,
  toggleToothDiagnosis,
  toggleImplant,
  handleAddFinding,
  handleRemoveFinding,
  handleUpdateNotes,
  updateToothNotes,
  handleBackToDentition,
  handleSelectTooth,
  handleSelectZone,
  handleClearSelectedZone,
  handleAddEntry,
  handleUpdateEntry,
  handleRemoveEntry,
  handleUpdateTreatmentHistoryDetail,
  handleRemoveTreatmentHistoryDetail,
  handleClearTreatmentHistoryDetails,
  handleSetHighlightZones,
  handleToggleZoneMultiSelect,
  handleSetMultiSelectZones,
  handleClearMultiSelect,
  handleSetMultiSelectActive,
  handleSetHoveredTooth]
  );
  const isDentitionView = viewMode === "dentition";
  const dentitionTitle =
  patientType === "adult" ?
  "Full Adult Dentition View" :
  patientType === "pediatric" ?
  "Full Pediatric Dentition View" :
  "Full Mixed Dentition View";
  return (
    <div
      className={`dental-canvas-root ${isDentitionView ? "dentition-mode" : ""} ${!isDentitionView ? "has-tooth-selector" : ""} ${compact ? "compact" : ""}`}>

      <div className="viewer">
        <div className="viewer-header">
          {isDentitionView ?
          <div className="tooth-name tooth-name--dentition">
              <span className="tooth-name-text">{dentitionTitle}</span>
            </div> :

          <div
            className="tooth-name"
            style={{
              paddingLeft: 6,
              gap: 3,
              cursor: "pointer"
            }}
            onClick={handleBackToDentition}
            title="Back to full dentition view"
            role="button">

              <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                flexShrink: 0
              }}>

                <path
                d="M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08"
                stroke="#1e293b"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="10"
                strokeWidth="2.2" />

              </svg>
              {selectionScope.type === "tooth" ?
            <>
                  {QUADRANT_LABELS[selectedTooth.quadrant]} {selectedTooth.name}
                  <span className="tooth-fdi">T{selectedTooth.fdi}</span>
                </> :

            <>
                  {selectionScope.type === "full-mouth" ?
              "Full Mouth View" :
              `${selectionScope.label} View`}
                  <span className="tooth-fdi">
                    {selectionScope.type === "full-mouth" ?
                "FULL" :
                SCOPE_HEADER_BADGE[selectionScope.id] ??
                selectionScope.id}
                  </span>
                </>}

            </div>}

        </div>
        {isDentitionView &&
        <div className={dc.patientTypeHost}>
            <div className={dc.patientTypeTrack}>
              <button
              type="button"
              onClick={() => handlePatientTypeChange("adult")}
              className={`${dc.patientTypeBtn} ${
                patientType === "adult" ? dc.patientTypeBtnActive : ""
              }`}>

                Adult
              </button>
              <button
              type="button"
              onClick={() => handlePatientTypeChange("pediatric")}
              className={`${dc.patientTypeBtn} ${
                patientType === "pediatric" ? dc.patientTypeBtnActive : ""
              }`}>

                Pediatric
              </button>
              <button
              type="button"
              onClick={() => handlePatientTypeChange("mixed")}
              className={`${dc.patientTypeBtn} ${
                patientType === "mixed" ? dc.patientTypeBtnActive : ""
              }`}>

                Mixed
              </button>
            </div>
          </div>}


        {isDentitionView &&
        <div className={dc.scopeHost}>
            <div
            className={dc.scopeTrack}
            role="toolbar"
            aria-label="Choose dentition scope">

              {DENTITION_SCOPE_BUTTONS.flatMap((btn, i, arr) => {
              const active = dentitionScopeIsActive(btn.id, selectionScope);
              const btnClass = isDentitionView ?
              dc.scopeBtn :
              dc.scopeBtnCompact;
              const button =
              <button
                type="button"
                title={btn.title}
                onClick={() => handleSelectScope(btn.id)}
                 className={`${btnClass} ${active ? dc.scopeBtnActive : ""}`}>

                    {btn.label}
                  </button>;


              if (i === arr.length - 1) return [button];
              return [
              button,
              <span className={dc.scopeDivider} aria-hidden={true} />];

            })}
            </div>
          </div>}


        {isDentitionView && !hideExamineHint &&
        <div
          style={{
            position: "absolute",
            bottom: "86px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            pointerEvents: "none",
            fontFamily: "Inter, sans-serif"
          }}>

            <LottieIcon name="arrow-up" size={24} color="#d5dde8" />
            <span
            style={{
              fontSize: "14px",
              color: "#b7c3d4",
              fontWeight: 500,
              opacity: 0.72,
              letterSpacing: "0.2px",
              whiteSpace: "nowrap"
            }}>

              Click any tooth to examine
            </span>
          </div>}


        {!isDentitionView &&
        <ToothSelector
          selectedTooth={selectedTooth}
          patientType={patientType}
          onSelectTooth={handleSelectTooth}
          toothDiagnoses={toothDiagnoses}
          viewMode={viewMode}
          onBackToDentition={handleBackToDentition}
          onSelectScope={handleToothScopeJump}
          selectionScope={selectionScope}
          getScopeFdis={getScopeFdis}
          findingsByTooth={findingsByTooth}
          implantTeeth={implantTeeth}
          allEntries={allEntries}
          toothNotes={toothNotes}
          surfaceSelector={
          <QuickSurfaceSelector
            selectedZones={
            multiSelectActive ?
            multiSelectZones :
            selectedZone ?
            new Set([selectedZone]) :
            new Set()}

            onToggleZone={handleToggleZoneFromQuickSelector}
            arch={selectedTooth.arch}
            toothPosition={selectedTooth.position}
            zonesWithFindings={new Set(findings.map((f) => f.zoneId))}
            disabled={
            currentToothDiagnoses.has("Missing") ||
            currentToothDiagnoses.has("Extraction")} />} />}






        <Canvas
          camera={{
            position: [0, 2.5, 13],
            fov: 35
          }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            toneMapping: 3,
            toneMappingExposure: 1.3,
            powerPreference: "high-performance"
          }}
          performance={{
            min: 0.5
          }}>

          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 5, 4]} intensity={1.0} />
          <directionalLight position={[-2, 3, -2]} intensity={0.4} />
          <directionalLight position={[0, -2, 1]} intensity={0.3} />
          <CameraController
            viewMode={viewMode}
            patientType={patientType}
            selectionScopeType={selectionScope.type}
            selectionScopeId={selectionScope.id}
            dentitionCameraOverride={dentitionCameraOverride}
            dentitionVerticalNudge={dentitionVerticalNudge}
            onDentitionVerticalNudgeChange={handleDentitionVerticalNudgeChange}
            controlsRef={controlsRef} />


          {!isDentitionView && selectionScope.type === "tooth" &&
          <ZoneCameraRotator
            zone={selectedZone}
            toothFdi={selectedTooth.fdi}
            quadrant={selectedTooth.quadrant}
            arch={selectedTooth.arch}
            controlsRef={controlsRef} />}



          <Suspense fallback={null}>
            {isDentitionView ?
            <DentitionView
              patientType={patientType}
              layoutMode="split"
              toothDiagnoses={toothDiagnoses}
              findingsByTooth={findingsByTooth}
              implantTeeth={implantTeeth}
              onSelectTooth={handleSelectTooth}
              onHoverTooth={setHoveredToothFdi}
              externalHoveredFdi={hoveredToothFdi}
              allEntries={allEntries}
              toothNotes={toothNotes}
              agentPulseFdis={agentApplyPulseFdis} /> :

            selectionScope.type !== "tooth" ?
            <DentitionView
              patientType={patientType}
              visibleFdis={selectionScope.fdis}
              disableSelection={true}
              layoutMode={
              selectionScope.type === "full-mouth" ? "natural" : "split"}

              toothDiagnoses={toothDiagnoses}
              findingsByTooth={findingsByTooth}
              implantTeeth={implantTeeth}
              onSelectTooth={handleSelectTooth}
              onHoverTooth={setHoveredToothFdi}
              externalHoveredFdi={hoveredToothFdi}
              allEntries={allEntries}
              toothNotes={toothNotes}
              agentPulseFdis={agentApplyPulseFdis} /> :


            <group position={[0, -0.17, 0]}>
                <Tooth
                selectedZone={selectedZone}
                onSelectZone={handleSelectZone}
                onClearSelectedZone={handleClearSelectedZone}
                onHoverZone={setHoveredZone}
                modelPath={selectedTooth.modelPath}
                arch={selectedTooth.arch}
                mirrorX={selectedTooth.mirrorX}
                quadrant={selectedTooth.quadrant}
                toothPosition={selectedTooth.position}
                toothFdi={selectedTooth.fdi}
                isImplant={isImplant}
                findings={findings}
                zoneNotes={zoneNotes}
                toothDiagnoses={currentToothDiagnoses}
                multiSelectZones={multiSelectZones}
                multiSelectActive={multiSelectActive}
                hideTags={true}
                treatmentHistoryDetails={currentTreatmentHistoryDetails}
                toothEntries={currentToothEntries.map((e) => ({
                  kind: e.kind,
                  name: e.name,
                  surfaces: e.surfaces
                }))} />

              </group>}

          </Suspense>
          <OrbitControls
            ref={controlsRef}
            onEnd={handleDentitionControlsEnd}
            enableDamping={true}
            dampingFactor={0.12}
            rotateSpeed={0.8}
            minDistance={
            isDentitionView ?
            6 :
            selectionScope.type === "tooth" ?
            2.05 :
            selectionScope.type === "quadrant" ||
            selectionScope.type === "arch" && (
            selectionScope.id === "RIGHT_ARCH" ||
            selectionScope.id === "LEFT_ARCH") ?
            3.5 :
            5}

            maxDistance={
            isDentitionView ?
            patientType === "mixed" ?
            28 :
            22 :
            selectionScope.type === "tooth" ?
            10.5 :
            selectionScope.type === "quadrant" ||
            selectionScope.type === "arch" && (
            selectionScope.id === "RIGHT_ARCH" ||
            selectionScope.id === "LEFT_ARCH") ?
            22 :
            30}

            enablePan={isDentitionView}
            touches={{
              ONE: 0,
              TWO: 2
            }} />

        </Canvas>
      </div>
    </div>);

}