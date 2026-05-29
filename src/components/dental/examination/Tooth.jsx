import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import * as THREE from "three";
import { useGLTF, Center, Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { ZONE_INFO, ALL_ZONES, isPatientRightQuadrant, TEETH } from "./types";
import { Annotations } from "./Annotations";
/**
 * Front-view camera azimuths per tooth FDI, from user-provided reference screenshots.
 * The camera azimuth when looking at the labial/buccal face = direction the front faces.
 * Null means use the default (buccal = -Z).
 */
const FRONT_VIEWS = {
  // Upper Right (Quadrant 1) — anterior pol=80°, posterior pol=90°
  11: {
    az: 0,
    pol: 80,
  },
  12: {
    az: 0,
    pol: 80,
  },
  13: {
    az: -45,
    pol: 80,
  },
  14: {
    az: -70,
    pol: 90,
  },
  15: {
    az: -70,
    pol: 90,
  },
  16: {
    az: -70,
    pol: 90,
  },
  17: {
    az: -80,
    pol: 90,
  },
  18: {
    az: -70,
    pol: 90,
  },
  // Upper Left (Quadrant 2) — anterior pol=80°, posterior pol=90°
  21: {
    az: 0,
    pol: 80,
  },
  22: {
    az: 0,
    pol: 80,
  },
  23: {
    az: 45,
    pol: 80,
  },
  24: {
    az: 70,
    pol: 90,
  },
  25: {
    az: 70,
    pol: 90,
  },
  26: {
    az: 70,
    pol: 90,
  },
  27: {
    az: 80,
    pol: 90,
  },
  28: {
    az: 70,
    pol: 90,
  },
  // Lower Left (Quadrant 3) — all pol=90°
  31: {
    az: 20,
    pol: 90,
  },
  32: {
    az: 0,
    pol: 90,
  },
  33: {
    az: 30,
    pol: 90,
  },
  34: {
    az: 50,
    pol: 90,
  },
  35: {
    az: 50,
    pol: 90,
  },
  36: {
    az: 65,
    pol: 90,
  },
  37: {
    az: 90,
    pol: 90,
  },
  38: {
    az: 90,
    pol: 90,
  },
  // Lower Right (Quadrant 4) — all pol=90°
  41: {
    az: -20,
    pol: 90,
  },
  42: {
    az: 0,
    pol: 90,
  },
  43: {
    az: -30,
    pol: 90,
  },
  44: {
    az: -50,
    pol: 90,
  },
  45: {
    az: -50,
    pol: 90,
  },
  46: {
    az: -65,
    pol: 90,
  },
  47: {
    az: -90,
    pol: 90,
  },
  48: {
    az: -90,
    pol: 90,
  },
};
// Convert degrees to radians for azimuth lookup
export function getFrontAzimuth(fdi) {
  const v = FRONT_VIEWS[fdi];
  return v ? (v.az * Math.PI) / 180 : undefined;
}
function getFrontPolar(fdi) {
  const v = FRONT_VIEWS[fdi];
  return v ? (v.pol * Math.PI) / 180 : Math.PI * 0.5;
}
/**
 * Lightweight material tint used by the mini thumbnails (MiniToothCanvas).
 * Mirrors the color-tint blocks from the main shader (lines 526–620) but is
 * self-contained — no per-tooth geometry uniforms required.
 */
export function tintShader(material, flags = {}) {
  const mat = material;
  // Crown / Missing / Denture need transparency — mirror main tooth shader behaviour.
  if (
    flags.isCrown ||
    flags.isMissing ||
    flags.isDenture ||
    flags.isRCT ||
    flags.isBridge
  ) {
    mat.transparent = true;
    mat.depthWrite = false;
  }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uIsCrown = {
      value: flags.isCrown ? 1.0 : 0.0,
    };
    shader.uniforms.uIsRCT = {
      value: flags.isRCT ? 1.0 : 0.0,
    };
    shader.uniforms.uIsMissing = {
      value: flags.isMissing ? 1.0 : 0.0,
    };
    shader.uniforms.uIsImplant = {
      value: flags.isImplant ? 1.0 : 0.0,
    };
    shader.uniforms.uIsBridge = {
      value: flags.isBridge ? 1.0 : 0.0,
    };
    shader.uniforms.uIsDenture = {
      value: flags.isDenture ? 1.0 : 0.0,
    };
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
       uniform float uIsCrown;
       uniform float uIsRCT;
       uniform float uIsMissing;
       uniform float uIsImplant;
       uniform float uIsBridge;
       uniform float uIsDenture;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
       // Missing: red tint + alpha reduction
       if (uIsMissing > 0.5) {
         float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 redTint = vec3(lum * 0.95 + 0.15, lum * 0.75 + 0.05, lum * 0.72 + 0.03);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, redTint, 0.45);
         gl_FragColor.a *= 0.55;
       }
       // Crown: semi-transparent grayish porcelain
       if (uIsCrown > 0.5) {
         gl_FragColor.a = min(gl_FragColor.a, 0.72);
         vec3 crownGrayTint = vec3(0.85, 0.85, 0.87);
         float lumC = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 crownTinted = crownGrayTint * (lumC * 0.55 + 0.45);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, crownTinted, 0.55);
       }
       // RCT: desaturated warm
       if (uIsRCT > 0.5) {
         gl_FragColor.a *= 0.85;
         float lumR = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 rctTint = vec3(0.92, 0.90, 0.87) * (lumR * 0.7 + 0.3);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, rctTint, 0.45);
       }
       // Bridge: grayish prosthetic
       if (uIsBridge > 0.5) {
         vec3 bridgeTint = vec3(0.82, 0.83, 0.85);
         float lumB = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         gl_FragColor.rgb = mix(gl_FragColor.rgb, bridgeTint * (lumB * 0.6 + 0.5), 0.5);
       }
       // Denture: pink-hued translucent
       if (uIsDenture > 0.5) {
         vec3 dentureTint = vec3(0.96, 0.78, 0.80);
         float lumD = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         gl_FragColor.rgb = mix(gl_FragColor.rgb, dentureTint * (lumD * 0.6 + 0.5), 0.45);
         gl_FragColor.a *= 0.75;
       }
       // Implant: cool desaturated (preview-only; real implant uses separate mesh)
       if (uIsImplant > 0.5) {
         float lumI = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 greyTint = vec3(lumI * 0.85 + 0.18);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, greyTint, 0.4);
       }`,
    );
  };
  mat.needsUpdate = true;
}
/** Deep-clone scene so each tooth owns materials (cached useGLTF otherwise shares one material + one compiled shader). */
export function cloneSceneWithUniqueMaterials(scene) {
  const root = scene.clone(true);
  root.traverse((obj) => {
    const mesh = obj;
    if (!mesh.isMesh || !mesh.material) return;
    const mat = mesh.material;
    if (Array.isArray(mat)) mesh.material = mat.map((m) => m.clone());
    else mesh.material = mat.clone();
  });
  return root;
}
function disposeClonedScene(root) {
  root.traverse((obj) => {
    const mesh = obj;
    if (!mesh.isMesh) return;
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}
function collectZoneMaterials(root) {
  const out = [];
  const seen = new Set();
  root.traverse((obj) => {
    const mesh = obj;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (seen.has(m)) continue;
      seen.add(m);
      const std = m;
      const phy = m;
      if (std.isMeshStandardMaterial || phy.isMeshPhysicalMaterial) {
        out.push(m);
      }
    }
  });
  return out;
}
/** Rotate a horizontal (XZ) unit direction around world +Y (right-hand rule). */
function rotateDirXZ(v, yawRad) {
  if (yawRad === 0) return v.clone();
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  return new THREE.Vector3(
    v.x * c + v.z * s,
    v.y,
    -v.x * s + v.z * c,
  ).normalize();
}
/**
 * Compute zone direction vectors from a front-view azimuth.
 * The front-view azimuth is the camera theta (spherical) when looking at the labial/buccal face.
 * Camera at theta is at position (sin(theta), 0, cos(theta)) in XZ plane.
 * Buccal direction = outward normal of buccal face = toward the camera = (sin(az), 0, cos(az))
 */
function surfaceDirsFromFrontAzimuth(frontAz, q) {
  // Buccal/labial points toward the camera at the front view
  const buccal = new THREE.Vector3(
    Math.sin(frontAz),
    0,
    Math.cos(frontAz),
  ).normalize();
  // Lingual is opposite
  const lingual = buccal.clone().negate();
  // Mesial points toward midline — perpendicular to buccal, toward +X for right quadrant, -X for left
  const mx = isPatientRightQuadrant(q) ? 1 : -1;
  // Cross product of buccal with Y-up gives the perpendicular horizontal direction
  const perp = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), buccal)
    .normalize();
  // Choose the perpendicular that points in the mesial direction
  const mesial =
    perp.dot(new THREE.Vector3(mx, 0, 0)) > 0 ? perp : perp.clone().negate();
  const distal = mesial.clone().negate();
  return {
    buccal,
    lingual,
    mesial,
    distal,
  };
}
function surfaceDirsForQuadrant(q, yawRad = 0) {
  const mx = isPatientRightQuadrant(q) ? 1 : -1;
  const base = {
    mesial: new THREE.Vector3(mx, 0, 0),
    distal: new THREE.Vector3(-mx, 0, 0),
    buccal: new THREE.Vector3(0, 0, 1),
    lingual: new THREE.Vector3(0, 0, -1),
  };
  if (yawRad === 0) return base;
  return {
    mesial: rotateDirXZ(base.mesial, yawRad),
    distal: rotateDirXZ(base.distal, yawRad),
    buccal: rotateDirXZ(base.buccal, yawRad),
    lingual: rotateDirXZ(base.lingual, yawRad),
  };
}
/** Get the best surface directions for a tooth — uses calibrated front azimuth if available */
const _dirsCache = new Map();
export function getDirsForTooth(fdi, quadrant, yawRad) {
  const key = `${fdi}-${quadrant}-${yawRad}`;
  const cached = _dirsCache.get(key);
  if (cached) return cached;
  const frontAz = getFrontAzimuth(fdi);
  const result =
    frontAz !== undefined
      ? surfaceDirsFromFrontAzimuth(frontAz, quadrant)
      : surfaceDirsForQuadrant(quadrant, yawRad);
  _dirsCache.set(key, result);
  return result;
}
function zoneYawForTooth(positionInQuadrant, quadrant) {
  return 0; // No longer using generic yaw — using per-tooth front azimuths instead
}

function crownSideFromNormalAndPoint(point, normal, centerX, centerZ, dirs) {
  const nH = new THREE.Vector3(normal.x, 0, normal.z);
  const fromC = new THREE.Vector3(point.x - centerX, 0, point.z - centerZ);
  const guide =
    nH.length() > 0.18
      ? nH.normalize()
      : fromC.length() > 1e-5
        ? fromC.normalize()
        : dirs.lingual.clone();
  const scores = [
    ["mesial", guide.dot(dirs.mesial)],
    ["distal", guide.dot(dirs.distal)],
    ["buccal", guide.dot(dirs.buccal)],
    ["lingual", guide.dot(dirs.lingual)],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][0];
}
const ZONE_ORBIT = {
  occlusal: {
    azimuth: 0,
    polar: Math.PI * 0.88,
  },
  buccal: {
    azimuth: Math.PI,
    polar: Math.PI * 0.55,
  },
  lingual: {
    azimuth: 0,
    polar: Math.PI * 0.55,
  },
  mesial: {
    azimuth: Math.PI * 0.5,
    polar: Math.PI * 0.55,
  },
  distal: {
    azimuth: -Math.PI * 0.5,
    polar: Math.PI * 0.55,
  },
  cervical: {
    azimuth: Math.PI * 0.8,
    polar: Math.PI * 0.48,
  },
  root: {
    azimuth: Math.PI * 0.15,
    polar: Math.PI * 0.28,
  },
  whole: {
    azimuth: 0,
    polar: Math.PI * 0.5,
  },
};
function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
// ══════════════════════════════════════════════════════════════
// SHADER — per-fragment position-based zones
// Hard cuts, solid coverage, no gaps
// Uses both Y-position AND normal for occlusal (captures full chewing surface)
// ══════════════════════════════════════════════════════════════
// Pre-compute zone color vectors once (avoids allocating 7 Vector3s per material per frame)
const _cachedColorVecs = ALL_ZONES.map(
  (z) => new THREE.Vector3(...ZONE_INFO[z].colorVec),
);
const WHOLE_TOOTH_COLOR = new THREE.Vector3(...ZONE_INFO.whole.colorVec);
const _warmedShaderVariants = new Set();
export function getDentalShaderVariantKey(flags) {
  return [
    flags.isImplant ? "i1" : "i0",
    flags.isMissing ? "m1" : "m0",
    flags.isCrown ? "c1" : "c0",
    flags.isRCT ? "r1" : "r0",
    flags.isBridge ? "b1" : "b0",
    flags.isDenture ? "d1" : "d0",
  ].join("|");
}
export function prewarmDentalShaderProgram({ gl, camera, source, variantKey }) {
  if (_warmedShaderVariants.has(variantKey)) return;
  try {
    const warmupScene = new THREE.Scene();
    // Clone keeps material refs so we compile the same shader programs.
    const warmupRoot = source.clone(true);
    warmupScene.add(warmupRoot);
    gl.compile(warmupScene, camera);
    warmupScene.remove(warmupRoot);
    _warmedShaderVariants.add(variantKey);
  } catch {
    // Best-effort optimization only; normal render path remains valid.
  }
}
export function injectShader(
  material,
  cervicalY,
  cejY,
  crownBottomY,
  centerX,
  centerZ,
  arch,
  quadrant,
  zoneYawRad,
  toothFdi = "16",
  isImplant = false,
  isMissing = false,
  isCrown = false,
  isRCT = false,
  isBridge = false,
  isDenture = false /** Per-zone flags: true if that zone has a finding/note (light persistent tint) */,
  zonesWithFindings = [false, false, false, false, false, false, false],
) {
  const ref = {
    shader: null,
  };
  const mat = material;
  const colorVecs = _cachedColorVecs;
  const dirs = getDirsForTooth(toothFdi, quadrant, zoneYawRad);
  // Critical: ensure Three.js does not reuse a stale non-dental shader program
  // across tab/type switches. Without a dedicated key, onBeforeCompile can be
  // bypassed by program cache hits, causing missing dentition colors until remount.
  mat.customProgramCacheKey = () => "tp-dental-zone-shader-v1";
  mat.onBeforeCompile = (shader) => {
    ref.shader = shader;
    shader.uniforms.selectedZone = {
      value: -1,
    };
    shader.uniforms.hoveredZone = {
      value: -1,
    };
    shader.uniforms.zoneColors = {
      value: colorVecs,
    };
    shader.uniforms.uCejY = {
      value: cejY,
    };
    shader.uniforms.uCervicalY = {
      value: cervicalY,
    };
    const crownH = Math.abs(cervicalY - crownBottomY);
    const occlusalTop =
      arch === "maxillary"
        ? crownBottomY + crownH * 0.45
        : crownBottomY - crownH * 0.45;
    shader.uniforms.uOcclusalTop = {
      value: occlusalTop,
    };
    shader.uniforms.uCenterX = {
      value: centerX,
    };
    shader.uniforms.uCenterZ = {
      value: centerZ,
    };
    shader.uniforms.uYDir = {
      value: arch === "maxillary" ? 1.0 : -1.0,
    };
    shader.uniforms.uMesialDir = {
      value: dirs.mesial,
    };
    shader.uniforms.uDistalDir = {
      value: dirs.distal,
    };
    shader.uniforms.uBuccalDir = {
      value: dirs.buccal,
    };
    shader.uniforms.uLingualDir = {
      value: dirs.lingual,
    };
    shader.uniforms.uIsImplant = {
      value: isImplant ? 1.0 : 0.0,
    };
    shader.uniforms.uIsMissing = {
      value: isMissing ? 1.0 : 0.0,
    };
    shader.uniforms.uIsCrown = {
      value: isCrown ? 1.0 : 0.0,
    };
    shader.uniforms.uIsRCT = {
      value: isRCT ? 1.0 : 0.0,
    };
    shader.uniforms.uIsBridge = {
      value: isBridge ? 1.0 : 0.0,
    };
    shader.uniforms.uIsDenture = {
      value: isDenture ? 1.0 : 0.0,
    };
    shader.uniforms.uWholeToothSelected = {
      value: 0.0,
    };
    shader.uniforms.uWholeToothMarked = {
      value: 0.0,
    };
    shader.uniforms.uWholeToothColor = {
      value: WHOLE_TOOTH_COLOR,
    };
    const zf = new Array(7).fill(0);
    for (let i = 0; i < Math.min(zonesWithFindings.length, 7); i++)
      zf[i] = zonesWithFindings[i] ? 1 : 0;
    shader.uniforms.uZoneHasFinding = {
      value: zf,
    };
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
       varying vec3 vWorldPos;
       varying vec3 vWorldNorm;
       uniform int selectedZone;
       uniform int hoveredZone;
       uniform float uCejY;
       uniform float uCervicalY;
       uniform float uOcclusalTop;
       uniform float uCenterX;
       uniform float uCenterZ;
       uniform float uYDir;
       uniform vec3 uMesialDir;
       uniform vec3 uDistalDir;
       uniform vec3 uBuccalDir;
       uniform vec3 uLingualDir;
       uniform float uIsImplant;
       uniform float uIsMissing;
       uniform float uIsCrown;
       uniform float uIsRCT;
       uniform float uIsBridge;
       uniform float uIsDenture;
       uniform float uWholeToothSelected;
       uniform float uWholeToothMarked;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
       vWorldNorm = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

       // ── Compute zone in vertex shader for displacement ──
       float vy = vWorldPos.y;
       vec3 vwn = vWorldNorm;
       int vZone = -1;
       bool vIsRoot = (uYDir > 0.0) ? (vy >= uCejY) : (vy <= uCejY);
       bool vIsCervical = (uYDir > 0.0) ? (vy >= uCervicalY && vy < uCejY) : (vy <= uCervicalY && vy > uCejY);
       bool vIsOccY = (uYDir > 0.0) ? (vy < uOcclusalTop) : (vy > uOcclusalTop);
       bool vIsCrown = (uYDir > 0.0) ? (vy < uCervicalY) : (vy > uCervicalY);
       bool vIsOccN = (uYDir > 0.0) ? (vwn.y < -0.45) : (vwn.y > 0.45);

       if (vIsRoot) vZone = 6;
       else if (vIsCervical) vZone = 5;
       else if (vIsOccY || (vIsOccN && vIsCrown)) vZone = 0;
       else {
         vec3 vnH = vec3(vwn.x, 0.0, vwn.z);
         vec3 vFromC = vec3(vWorldPos.x - uCenterX, 0.0, vWorldPos.z - uCenterZ);
         float vLenH = length(vnH);
         float vLenC = length(vFromC);
         vec3 vGuide = vLenH > 0.18 ? normalize(vnH) : (vLenC > 1e-5 ? normalize(vFromC) : uLingualDir);
         float vdm = dot(vGuide, uMesialDir);
         float vdd = dot(vGuide, uDistalDir);
         float vdb = dot(vGuide, uBuccalDir);
         float vdl = dot(vGuide, uLingualDir);
         float vBest = vdm;
         vZone = 3;
         if (vdd > vBest) { vBest = vdd; vZone = 4; }
         if (vdb > vBest) { vBest = vdb; vZone = 1; }
         if (vdl > vBest) { vBest = vdl; vZone = 2; }
       }

       // ── Displacement: push outward along normal when zone is active ──
       float bulge = 0.0;
       if (uIsImplant > 0.5 && (vZone == 5 || vZone == 6)) bulge = 0.0;
       else if (uWholeToothSelected > 0.5) bulge = 0.008;
       else if (selectedZone == vZone) bulge = 0.012;
       else if (hoveredZone == vZone) bulge = 0.006;

       // Crown cap: extends past cervical into root, smooth bulge, no rim lip
       if (uIsCrown > 0.5) {
         // Extend 0.06 past cervical into root area
         float capEdge = (uYDir > 0.0) ? uCervicalY + 0.06 : uCervicalY - 0.06;
         bool inCapZone = (uYDir > 0.0) ? (vy <= capEdge) : (vy >= capEdge);
         if (inCapZone) {
           float crownDist;
           if (uYDir > 0.0) {
             crownDist = smoothstep(capEdge, capEdge - 0.03, vy);
           } else {
             crownDist = smoothstep(capEdge, capEdge + 0.03, vy);
           }
           // Smooth uniform bulge — no rim lip
           bulge += 0.09 * crownDist;
         }
       }
       // Bridge: thick porcelain shell with sharp bottom edge
       if (uIsBridge > 0.5 && vIsCrown) {
         float bridgeDist;
         if (uYDir > 0.0) {
           bridgeDist = smoothstep(uCervicalY, uCervicalY - 0.015, vy);
         } else {
           bridgeDist = smoothstep(uCervicalY, uCervicalY + 0.015, vy);
         }
         float rimProx;
         if (uYDir > 0.0) {
           rimProx = smoothstep(uCervicalY - 0.15, uCervicalY - 0.015, vy);
         } else {
           rimProx = smoothstep(uCervicalY + 0.15, uCervicalY + 0.015, vy);
         }
         bulge += (0.05 + 0.03 * rimProx) * bridgeDist;
       }

       transformed += normal * bulge;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
       varying vec3 vWorldPos;
       varying vec3 vWorldNorm;
       uniform int selectedZone;
       uniform int hoveredZone;
       uniform vec3 zoneColors[7];
       uniform float uCejY;
       uniform float uCervicalY;
       uniform float uOcclusalTop;
       uniform float uCenterX;
       uniform float uCenterZ;
       uniform float uYDir;
       uniform vec3 uMesialDir;
       uniform vec3 uDistalDir;
       uniform vec3 uBuccalDir;
       uniform vec3 uLingualDir;
       uniform float uIsImplant;
       uniform float uIsMissing;
       uniform float uIsCrown;
       uniform float uIsRCT;
       uniform float uIsBridge;
       uniform float uIsDenture;
       uniform float uWholeToothSelected;
       uniform float uWholeToothMarked;
       uniform vec3 uWholeToothColor;
       uniform int uZoneHasFinding[7];`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>

       // ── Implant mode: discard cervical + root fragments ──
       if (uIsImplant > 0.5) {
         if (uYDir > 0.0) {
           if (vWorldPos.y >= uCervicalY) discard;
         } else {
           if (vWorldPos.y <= uCervicalY) discard;
         }
       }

       // ══ TOOTH RENDERING — depth & shadow, no gloss ══
       vec3 N = normalize(vWorldNorm);
       vec3 V = normalize(cameraPosition - vWorldPos);

       // ── Crown-Root blend ──
       // For maxillary (uYDir>0): root is at high Y, crown at low Y
       //   cejBlend goes 0 (crown/bottom) → 1 (root/top)
       // For mandibular (uYDir<0): root is at low Y, crown at high Y
       //   Need cejBlend 0 (crown/top) → 1 (root/bottom)
       float cejBlend;
       if (uYDir > 0.0) {
         // Maxillary: crown at bottom, root at top
         cejBlend = smoothstep(uCervicalY - 0.02, uCejY + 0.01, vWorldPos.y);
       } else {
         // Mandibular: crown at TOP (high Y), root at BOTTOM (low Y)
         // So as Y decreases past cervical toward CEJ, we go into root
         cejBlend = 1.0 - smoothstep(uCejY - 0.01, uCervicalY + 0.02, vWorldPos.y);
       }

       // ── CROWN: off-white, matte ──
       vec3 crownColor = vec3(0.95, 0.93, 0.90);

       // ── ROOT: warm tan, gradient darker toward apex ──
       vec3 rootLight = vec3(0.85, 0.78, 0.67);
       vec3 rootDark = vec3(0.76, 0.66, 0.52);
       vec3 rootColor = mix(rootLight, rootDark, cejBlend * 0.4);

       vec3 baseColor = mix(crownColor, rootColor, cejBlend);

       // ── CERVICAL: gentle warm tint that blends smoothly into crown and root ──
       float cervicalMask;
       if (uYDir > 0.0) {
         // Wide smooth bell curve centered at the CEJ midpoint
         float mid = (uCervicalY + uCejY) * 0.5;
         float spread = abs(uCejY - uCervicalY) * 1.2;
         cervicalMask = exp(-pow((vWorldPos.y - mid) / spread, 2.0) * 3.0);
       } else {
         float mid = (uCervicalY + uCejY) * 0.5;
         float spread = abs(uCejY - uCervicalY) * 1.2;
         cervicalMask = exp(-pow((vWorldPos.y - mid) / spread, 2.0) * 3.0);
       }
       vec3 cervicalTint = vec3(0.88, 0.80, 0.68);
       baseColor = mix(baseColor, cervicalTint, cervicalMask * 0.35);

       // ── Depth shading: ONLY subtract shadows, keep base bright ──
       vec3 L = normalize(vec3(2.0, 4.0, 3.0));
       float NdotL = max(0.0, dot(N, L));
       // ── Apply tooth color tint ──
       // All diagnoses keep natural tooth color/texture
       {
         gl_FragColor.rgb = gl_FragColor.rgb * baseColor * 1.5;
         gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.0));
       }
       float y = vWorldPos.y;
       vec3 wn = normalize(vWorldNorm);
       int zone = -1;

       // uYDir: 1.0=maxillary (root > cej > cervical > crown > occlusal, going up)
       //       -1.0=mandibular (occlusal > crown > cervical > cej > root, going up)
       // Normalize to a common direction: multiply y comparisons by uYDir

       bool isRoot = (uYDir > 0.0) ? (y >= uCejY) : (y <= uCejY);
       bool isCervical = (uYDir > 0.0) ? (y >= uCervicalY && y < uCejY) : (y <= uCervicalY && y > uCejY);
       bool isOcclusalY = (uYDir > 0.0) ? (y < uOcclusalTop) : (y > uOcclusalTop);

       if (isRoot) {
         zone = 6;
       } else if (isCervical) {
         zone = 5;
       } else {
         // Occlusal: PURE Y-position only — no normal-based extension
         // This guarantees zero lateral zone leakage into occlusal
         bool isOcclusal = isOcclusalY;

         if (isOcclusal) {
           zone = 0;
         } else {
           vec3 nH = vec3(wn.x, 0.0, wn.z);
           vec3 fromC = vec3(vWorldPos.x - uCenterX, 0.0, vWorldPos.z - uCenterZ);
           float lenH = length(nH);
           float lenC = length(fromC);
           vec3 guide = lenH > 0.18 ? normalize(nH) : (lenC > 1e-5 ? normalize(fromC) : uLingualDir);
           float dm = dot(guide, uMesialDir);
           float dd = dot(guide, uDistalDir);
           float db = dot(guide, uBuccalDir);
           float dl = dot(guide, uLingualDir);
           float best = dm;
           zone = 3;
           if (dd > best) { best = dd; zone = 4; }
           if (db > best) { best = db; zone = 1; }
           if (dl > best) { best = dl; zone = 2; }
         }
       }

       if (zone >= 0 && zone < 7) {
         vec3 zc = zoneColors[zone];
         // Clamped luminance so front-lit bright pixels still get a saturated
         // tint (instead of washing out to light zone color). Minimum 0.55.
         float lumZ = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         float tintIntensity = clamp(lumZ * 0.45 + 0.55, 0.55, 1.0);
         vec3 tinted = zc * tintIntensity;
         // Boost tint mix ratios when tooth is rendered transparent (Crown/RCT/Bridge)
         float tBoost = (uIsCrown > 0.5 || uIsRCT > 0.5 || uIsBridge > 0.5) ? 0.22 : 0.0;
         if (selectedZone == zone) {
           gl_FragColor.rgb = mix(gl_FragColor.rgb, tinted, min(0.75 + tBoost, 0.95));
         } else if (hoveredZone == zone) {
           gl_FragColor.rgb = mix(gl_FragColor.rgb, tinted, min(0.45 + tBoost, 0.75));
         } else if (uZoneHasFinding[zone] > 0) {
           gl_FragColor.rgb = mix(gl_FragColor.rgb, tinted, min(0.28 + tBoost * 0.6, 0.55));
         }
       }

       if (uWholeToothSelected > 0.5 || uWholeToothMarked > 0.5) {
         float wholeMix = uWholeToothSelected > 0.5 ? 0.24 : 0.10;
         float wholeLum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 wholeTint = uWholeToothColor * clamp(wholeLum * 0.45 + 0.55, 0.55, 1.0);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, wholeTint, wholeMix);
       }

       // ══ TOOTH-LEVEL DIAGNOSIS VISUAL EFFECTS ══

       // Missing: keep texture visible with slight reddish tint, minimal X pattern
       if (uIsMissing > 0.5) {
         // Slight reddish tint while keeping texture detail visible
         float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 redTint = vec3(lum * 0.95 + 0.15, lum * 0.75 + 0.05, lum * 0.72 + 0.03);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, redTint, 0.45);
         gl_FragColor.a *= 0.55;

         // Ultra-minimal X-cross pattern — very few, very faint thin lines
         vec2 uv2 = vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y) * 3.0;
         float line1 = abs(fract(uv2.x + uv2.y) - 0.5);
         float line2 = abs(fract(uv2.x - uv2.y) - 0.5);
         float crossPattern = min(line1, line2);
         if (crossPattern < 0.018) {
           gl_FragColor.rgb *= 0.92;
         }
       }

       // Crown: transparent cap extending past cervical onto root, hard cut at bottom, closed top
       if (uIsCrown > 0.5) {
         // Crown extends 0.06 past cervical into root
         float crownEdge = (uYDir > 0.0) ? uCervicalY + 0.06 : uCervicalY - 0.06;
         bool crownCapArea = (uYDir > 0.0) ? (vWorldPos.y <= crownEdge) : (vWorldPos.y >= crownEdge);

         if (crownCapArea) {
           // Semi-transparent crown — tooth texture visible, stump visible inside
           gl_FragColor.a = 0.46;

           // Grayish tint on the crown outer shell (prosthetic look)
           vec3 crownGrayTint = vec3(0.85, 0.85, 0.87);
           float lumCrown = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
           vec3 crownTinted = crownGrayTint * (lumCrown * 0.55 + 0.45);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, crownTinted, 0.55);

           // Very subtle sparse grid pattern
           vec2 crownUV = vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y) * 8.0;
           float gridX = abs(fract(crownUV.x) - 0.5);
           float gridY = abs(fract(crownUV.y) - 0.5);
           float gridLine = min(gridX, gridY);
           if (gridLine < 0.025) {
             gl_FragColor.rgb *= 0.975;
           }

           // Fresnel: edges slightly more opaque
           float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.5);
           gl_FragColor.a += fresnel * 0.15;
           gl_FragColor.a = min(gl_FragColor.a, 0.72);

           // Hard cut line at the bottom edge — sharp dark line where crown meets root
           float edgeDist = (uYDir > 0.0)
             ? smoothstep(crownEdge - 0.006, crownEdge, vWorldPos.y)
             : smoothstep(crownEdge + 0.006, crownEdge, vWorldPos.y);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.40, 0.38, 0.35), edgeDist * 0.8);
           gl_FragColor.a = mix(gl_FragColor.a, 0.95, edgeDist);

           // Back face: opaque to close the crown (solid top, not hollow) — grayish-tinted
           if (!gl_FrontFacing) {
             float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
             gl_FragColor.rgb = vec3(0.85, 0.85, 0.87) * (lum * 0.3 + 0.7);
             gl_FragColor.a = 0.92;
           }
         }
       }

       // RCT: make tooth semi-transparent so the red root canals inside are clearly visible
       if (uIsRCT > 0.5) {
         gl_FragColor.a *= 0.68;
         // Slightly desaturate for a treated/devitalized look
         float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
         vec3 rctTint = vec3(0.92, 0.90, 0.87) * (lum * 0.7 + 0.3);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, rctTint, 0.35);
       }

       // Bridge: grayish prosthetic for crown, discard roots, dark sealed bottom
       if (uIsBridge > 0.5) {
         bool isRootArea = (uYDir > 0.0) ? (vWorldPos.y >= uCervicalY) : (vWorldPos.y <= uCervicalY);
         if (isRootArea) {
           discard;
         }
         if (gl_FrontFacing) {
           float lumBridge = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
           vec3 bridgeTint = vec3(0.82, 0.83, 0.85) * (lumBridge * 0.55 + 0.45);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, bridgeTint, 0.55);
         }
         // Back face = hollow interior retaining the inner tooth texture
         if (!gl_FrontFacing) {
           // Darken slightly to create depth/shadow for the hollow inside
           gl_FragColor.rgb *= 0.65;
         }
       }


       // Denture: pink acrylic tint on root, light artificial tint on crown — preserves texture
       if (uIsDenture > 0.5) {
         bool isRootArea = (uYDir > 0.0) ? (vWorldPos.y >= uCervicalY) : (vWorldPos.y <= uCervicalY);
         if (isRootArea) {
           float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
           vec3 acrylicPink = vec3(0.85, 0.55, 0.58) * (lum * 0.45 + 0.55);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, acrylicPink, 0.5);
         } else {
           float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
           vec3 artificialTint = vec3(0.96, 0.95, 0.93) * (lum * 0.4 + 0.6);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, artificialTint, 0.3);
         }
       }`,
    );
  };
  // Always reset material state before enabling diagnosis-specific flags.
  // Without this reset, tab/scope switches can leave stale transparent/double-sided
  // settings on materials and cause incorrect full-tooth tinting.
  mat.transparent = false;
  mat.opacity = 1;
  mat.depthWrite = true;
  mat.side = THREE.FrontSide;
  // Enable transparency for diagnoses that need it (Crown = slightly transparent crown portion only)
  if (isMissing || isRCT || isDenture || isCrown) {
    mat.transparent = true;
  }
  // DoubleSide only where shell/interior rendering is needed.
  if (isCrown || isBridge || isDenture) {
    mat.side = THREE.DoubleSide;
  }
  mat.needsUpdate = true;
  return ref;
}
function classifyHit(
  point,
  faceNormal,
  cervicalY,
  cejY,
  occlusalTop,
  centerX,
  centerZ,
  arch,
  quadrant,
  zoneYawRad,
  toothFdi = "16",
) {
  const isMax = arch === "maxillary";
  const isRoot = isMax ? point.y >= cejY : point.y <= cejY;
  const isCervical = isMax
    ? point.y >= cervicalY && point.y < cejY
    : point.y <= cervicalY && point.y > cejY;
  const isOcclusalY = isMax ? point.y < occlusalTop : point.y > occlusalTop;
  if (isRoot) return "root";
  if (isCervical) return "cervical";
  if (isOcclusalY) return "occlusal";
  const dirs = getDirsForTooth(toothFdi, quadrant, zoneYawRad);
  return crownSideFromNormalAndPoint(point, faceNormal, centerX, centerZ, dirs);
}
// ══════════════════════════════════════════════════════════════
// Implant screw — procedural, matches each tooth's cervical cross-section
// ══════════════════════════════════════════════════════════════
// The screw's top profile is built from the tooth mesh vertices at cervical,
// so it fits exactly against the crown portion (which is kept via shader).
// Below cervical, the screw tapers to a pointed tip with thread ridges.
export const IMPLANT_TOP_Y = 0;
export const IMPLANT_TOP_DIAM = 1;
export const IMPLANT_CENTER_X = 0;
export const IMPLANT_CENTER_Z = 0;
export const ImplantScrew = memo(function ImplantScrew({
  placement,
  arch,
  implantScene,
  toothMesh,
  bb,
  parentGroup,
}) {
  const isMax = arch === "maxillary";
  // ── Part A: Abutment Base (PreparedStump-like tooth-shaped platform) ──
  const abutmentGeo = useMemo(() => {
    if (!toothMesh?.geometry || !bb) return null;
    const { cervicalY, centerX, centerZ } = placement;
    const srcGeo = toothMesh.geometry.clone();
    // Use relative transform if parentGroup is available (dentition view),
    // otherwise fall back to world-space (single-tooth view)
    if (parentGroup) {
      const groupInverse = new THREE.Matrix4()
        .copy(parentGroup.matrixWorld)
        .invert();
      const relativeMatrix = new THREE.Matrix4().multiplyMatrices(
        groupInverse,
        toothMesh.matrixWorld,
      );
      srcGeo.applyMatrix4(relativeMatrix);
    } else {
      srcGeo.applyMatrix4(toothMesh.matrixWorld);
    }
    const posAttr = srcGeo.attributes.position;
    // Transform reference points to same space
    const groupInv = parentGroup
      ? new THREE.Matrix4().copy(parentGroup.matrixWorld).invert()
      : new THREE.Matrix4(); // identity for world-space
    const localCenter = new THREE.Vector3(centerX, cervicalY, centerZ);
    if (parentGroup) localCenter.applyMatrix4(groupInv);
    const localCervicalY = localCenter.y;
    const localBBmin = bb.min.clone();
    const localBBmax = bb.max.clone();
    if (parentGroup) {
      localBBmin.applyMatrix4(groupInv);
      localBBmax.applyMatrix4(groupInv);
    }
    const localCrownEnd = isMax
      ? Math.min(localBBmin.y, localBBmax.y)
      : Math.max(localBBmin.y, localBBmax.y);
    const localCrownHeight = Math.abs(localCervicalY - localCrownEnd);
    const localStumpHeight = localCrownHeight * 0.4; // fill crown shell to close hollow gap
    const localCutY = isMax
      ? localCervicalY - localStumpHeight
      : localCervicalY + localStumpHeight;
    // Compute centroid near cervical for scaling pivot
    const cervBand = localStumpHeight * 0.5;
    let sumX = 0,
      sumZ = 0,
      count = 0;
    for (let i = 0; i < posAttr.count; i++) {
      const vy = posAttr.getY(i);
      if (Math.abs(vy - localCervicalY) < cervBand) {
        sumX += posAttr.getX(i);
        sumZ += posAttr.getZ(i);
        count++;
      }
    }
    const cx = count > 0 ? sumX / count : localCenter.x;
    const cz = count > 0 ? sumZ / count : localCenter.z;
    // Root-side limit: the abutment extends from inside the crown (localCutY)
    // through cervicalY and slightly past into the root zone.
    // This overlap ensures no hollow gap between crown bottom and abutment top.
    const rootOverlapLocal = 0.1; // generous overlap past cervical into root
    const rootLimitLocal = isMax
      ? localCervicalY + rootOverlapLocal // past cervical into root (maxillary: root is above)
      : localCervicalY - rootOverlapLocal; // past cervical into root (mandibular: root is below)
    // Scale/taper vertices — same approach as PreparedStump
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      let t;
      if (isMax) {
        t = (localCervicalY - y) / localStumpHeight;
      } else {
        t = (y - localCervicalY) / localStumpHeight;
      }
      let scale;
      if (t <= 0) {
        scale = 0.96; // near-flush with tooth surface at cervical
      } else if (t <= 0.2) {
        const blend = t / 0.2;
        scale = 0.96 + (0.78 - 0.96) * blend;
      } else {
        const tc = Math.min((t - 0.2) / 0.8, 1);
        scale = 0.78 - tc * 0.25;
      }
      const nx = cx + (x - cx) * scale;
      const nz = cz + (z - cz) * scale;
      let ny = y;
      if (isMax && y < localCutY) ny = localCutY;
      if (!isMax && y > localCutY) ny = localCutY;
      if (isMax && y > rootLimitLocal) ny = rootLimitLocal;
      if (!isMax && y < rootLimitLocal) ny = rootLimitLocal;
      posAttr.setXYZ(i, nx, ny, nz);
    }
    posAttr.needsUpdate = true;
    // Remove degenerate root triangles
    const clampEps = 0.001;
    const indexAttr = srcGeo.index;
    if (indexAttr) {
      const indices = [];
      for (let f = 0; f < indexAttr.count; f += 3) {
        const i0 = indexAttr.getX(f);
        const i1 = indexAttr.getX(f + 1);
        const i2 = indexAttr.getX(f + 2);
        const y0 = posAttr.getY(i0);
        const y1 = posAttr.getY(i1);
        const y2 = posAttr.getY(i2);
        const allAtRoot =
          Math.abs(y0 - rootLimitLocal) < clampEps &&
          Math.abs(y1 - rootLimitLocal) < clampEps &&
          Math.abs(y2 - rootLimitLocal) < clampEps;
        if (!allAtRoot) {
          indices.push(i0, i1, i2);
        }
      }
      srcGeo.setIndex(indices);
    }
    srcGeo.computeVertexNormals();
    return {
      geo: srcGeo,
      cx,
      cz,
      localCervicalY,
      localCutY,
    };
  }, [toothMesh, bb, placement, arch, isMax, parentGroup]);
  // ── Part B: Cylindrical Screw Body with helical threads ──
  const screwData = useMemo(() => {
    if (!abutmentGeo || !bb) return null;
    const { localCutY, cx, cz } = abutmentGeo;
    const groupInv = parentGroup
      ? new THREE.Matrix4().copy(parentGroup.matrixWorld).invert()
      : new THREE.Matrix4();
    const localBBmin = bb.min.clone();
    const localBBmax = bb.max.clone();
    if (parentGroup) {
      localBBmin.applyMatrix4(groupInv);
      localBBmax.applyMatrix4(groupInv);
    }
    const localRootEnd = isMax
      ? Math.max(localBBmin.y, localBBmax.y)
      : Math.min(localBBmin.y, localBBmax.y);
    // Detect thin teeth (lower incisors T31/T32/T41/T42): cervicalDiam < 0.35.
    // Shorten screw length and tighten threads to keep geometry inside root.
    const isThinTooth = placement.cervicalDiam < 0.35;
    const lengthFactor = isThinTooth ? 0.78 : 0.92;
    const screwLength = Math.abs(localRootEnd - localCutY) * lengthFactor;
    // Measure the abutment base width at cutY to match the screw top
    const abutPos = abutmentGeo.geo.attributes.position;
    const cutEps = 0.02;
    let maxRadSq = 0;
    for (let i = 0; i < abutPos.count; i++) {
      const vy = abutPos.getY(i);
      if (Math.abs(vy - localCutY) < cutEps) {
        const dx = abutPos.getX(i) - cx;
        const dz = abutPos.getZ(i) - cz;
        const rSq = dx * dx + dz * dz;
        if (rSq > maxRadSq) maxRadSq = rSq;
      }
    }
    // Use abutment base radius (matched) or fallback. Clamp against cervicalDiam
    // so thin teeth cannot get oversized screws that leak outside the root.
    const baseRadius =
      maxRadSq > 0 ? Math.sqrt(maxRadSq) : placement.cervicalDiam * 0.28;
    const maxRadiusAllowed = placement.cervicalDiam * 0.24;
    const radius = Math.min(baseRadius * 0.82, maxRadiusAllowed);
    // Build cylinder with helical screw threads
    const segs = 32;
    const rings = 40; // more rings for visible threads
    const threads = 10; // thread cycles
    const threadDepth = radius * 0.09; // tighter thread bump (was 0.12) — less edge noise
    const step = (Math.PI * 2) / segs;
    const verts = [],
      norms = [],
      idx = [];
    for (let r = 0; r <= rings; r++) {
      const t = r / rings; // 0 = top, 1 = bottom
      const y = isMax
        ? localCutY + t * screwLength
        : localCutY - t * screwLength;
      // Slight taper at very tip for realism (last 15%)
      const tipTaper = t > 0.85 ? 1.0 - ((t - 0.85) / 0.15) * 0.35 : 1.0;
      for (let s = 0; s < segs; s++) {
        const a = s * step;
        // Helical thread: phase varies with both ring position AND angle
        const helixPhase = t * threads * Math.PI * 2 + a;
        const threadBump =
          t > 0.03 && t < 0.9
            ? Math.max(0, Math.sin(helixPhase)) * threadDepth
            : 0;
        const rad = (radius + threadBump) * tipTaper;
        verts.push(cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad);
        // Normal: radial outward + slight thread normal
        const nx = Math.cos(a),
          nz = Math.sin(a);
        norms.push(nx, 0, nz);
      }
    }
    // Top cap center
    const topI = verts.length / 3;
    verts.push(cx, localCutY, cz);
    norms.push(0, isMax ? -1 : 1, 0);
    // Bottom tip center
    const botI = verts.length / 3;
    const botY = isMax ? localCutY + screwLength : localCutY - screwLength;
    verts.push(cx, botY, cz);
    norms.push(0, isMax ? 1 : -1, 0);
    // Side quads
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segs; s++) {
        const ns = (s + 1) % segs;
        const a = r * segs + s,
          b = r * segs + ns;
        const c = (r + 1) * segs + s,
          d = (r + 1) * segs + ns;
        idx.push(a, b, c, b, d, c);
      }
    }
    // Top cap
    for (let s = 0; s < segs; s++) {
      const ns = (s + 1) % segs;
      isMax ? idx.push(topI, ns, s) : idx.push(topI, s, ns);
    }
    // Bottom cap
    const last = rings * segs;
    for (let s = 0; s < segs; s++) {
      const ns = (s + 1) % segs;
      isMax
        ? idx.push(botI, last + s, last + ns)
        : idx.push(botI, last + ns, last + s);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(norms, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }, [abutmentGeo, bb, placement, arch, isMax, parentGroup]);
  // Opaque metallic material — NO transparency
  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xb8c0c8,
        metalness: 0.75,
        roughness: 0.28,
        side: THREE.DoubleSide,
      }),
    [],
  );
  // Cap disc to close the bottom of the abutment (no hollow gap visible from below)
  const capGeo = useMemo(() => {
    if (!abutmentGeo) return null;
    const { localCutY, cx, cz, geo } = abutmentGeo;
    // Sample vertices at cutY to get the outline
    const posAttr = geo.attributes.position;
    const cutEps = 0.015;
    const pts = [];
    for (let i = 0; i < posAttr.count; i++) {
      if (Math.abs(posAttr.getY(i) - localCutY) < cutEps) {
        pts.push({
          x: posAttr.getX(i),
          z: posAttr.getZ(i),
        });
      }
    }
    if (pts.length < 3) return null;
    // Build a flat disc from radial profile
    const segs = 32;
    const step = (Math.PI * 2) / segs;
    const radii = [];
    for (let s = 0; s < segs; s++) {
      const a = s * step;
      const dx = Math.cos(a),
        dz = Math.sin(a);
      let maxR = 0.01;
      for (const p of pts) {
        const proj = (p.x - cx) * dx + (p.z - cz) * dz;
        if (proj > maxR) maxR = proj;
      }
      radii.push(maxR);
    }
    const verts = [];
    const norms = [];
    const idx = [];
    const ny = isMax ? 1 : -1;
    // Center vertex
    verts.push(cx, localCutY, cz);
    norms.push(0, ny, 0);
    // Perimeter vertices
    for (let s = 0; s < segs; s++) {
      const a = s * step;
      verts.push(
        cx + Math.cos(a) * radii[s],
        localCutY,
        cz + Math.sin(a) * radii[s],
      );
      norms.push(0, ny, 0);
    }
    // Fan triangles
    for (let s = 0; s < segs; s++) {
      const ns = (s + 1) % segs;
      isMax ? idx.push(0, s + 1, ns + 1) : idx.push(0, ns + 1, s + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(norms, 3));
    g.setIndex(idx);
    return g;
  }, [abutmentGeo, isMax]);
  // Cleanup
  useEffect(() => {
    return () => {
      abutmentGeo?.geo?.dispose();
      screwData?.dispose();
      capGeo?.dispose();
    };
  }, [abutmentGeo, screwData, capGeo]);
  if (!abutmentGeo || !screwData) return null;
  return (
    <group>
      <mesh geometry={abutmentGeo.geo} material={metalMat} />
      {capGeo && <mesh geometry={capGeo} material={metalMat} />}
      <mesh geometry={screwData} material={metalMat} />
    </group>
  );
});
// ══════════════════════════════════════════════════════════════
// Compute root tip positions from bounding box + dental anatomy
// This is reliable for ALL teeth regardless of mesh transform chains
// ══════════════════════════════════════════════════════════════
function computeRootTips(
  bb,
  center,
  size,
  cervicalY,
  arch,
  numRoots,
  toothPosition,
  mesialDir,
  buccalDir,
) {
  const isMax = arch === "maxillary";
  // Root tip Y: 65% of the way from cervical to the root end
  // Conservative to keep canals safely inside the mesh
  const rootEndY = isMax ? bb.max.y : bb.min.y;
  const rootDepth = Math.abs(rootEndY - cervicalY);
  const tipY = isMax
    ? cervicalY + rootDepth * 0.65
    : cervicalY - rootDepth * 0.65;
  // Use the SMALLER dimension at root level for spread basis
  // This prevents canals from escaping narrow roots (premolars, incisors)
  const rootWidth = Math.min(size.x, size.z);
  const spreadBasis = rootWidth;
  const cx = center.x;
  const cz = center.z;
  if (numRoots === 1) {
    // Single root: tip is at center, very slight lingual offset
    const tip = new THREE.Vector3(cx, tipY, cz);
    tip.addScaledVector(buccalDir, -spreadBasis * 0.02);
    return [tip];
  }
  if (numRoots === 2) {
    if (isMax && toothPosition === 4) {
      // Upper first premolar: buccal + palatal roots — conservative spread
      const buccalTip = new THREE.Vector3(cx, tipY, cz);
      buccalTip.addScaledVector(buccalDir, spreadBasis * 0.12);
      const palatalTip = new THREE.Vector3(cx, tipY, cz);
      palatalTip.addScaledVector(buccalDir, -spreadBasis * 0.12);
      return [buccalTip, palatalTip];
    } else {
      // Lower molars: mesial + distal roots
      const mesialTip = new THREE.Vector3(cx, tipY, cz);
      mesialTip.addScaledVector(mesialDir, spreadBasis * 0.18);
      mesialTip.addScaledVector(buccalDir, spreadBasis * 0.03);
      const distalTip = new THREE.Vector3(cx, tipY, cz);
      distalTip.addScaledVector(mesialDir, -spreadBasis * 0.18);
      distalTip.addScaledVector(buccalDir, spreadBasis * 0.03);
      return [mesialTip, distalTip];
    }
  }
  if (numRoots === 3) {
    // Upper molars: mesio-buccal, disto-buccal, palatal
    const mbTip = new THREE.Vector3(cx, tipY, cz);
    mbTip.addScaledVector(mesialDir, spreadBasis * 0.18);
    mbTip.addScaledVector(buccalDir, spreadBasis * 0.15);
    const dbTip = new THREE.Vector3(cx, tipY, cz);
    dbTip.addScaledVector(mesialDir, -spreadBasis * 0.15);
    dbTip.addScaledVector(buccalDir, spreadBasis * 0.15);
    // Palatal root — conservative spread
    const palatalTip = new THREE.Vector3(
      cx,
      tipY * 0.97 + cervicalY * 0.03,
      cz,
    );
    palatalTip.addScaledVector(buccalDir, -spreadBasis * 0.22);
    return [mbTip, dbTip, palatalTip];
  }
  return [];
}
// ══════════════════════════════════════════════════════════════
// RCT root canal 3D geometry — actual tubes inside transparent tooth
// ══════════════════════════════════════════════════════════════
export const RootCanals = memo(function RootCanals({
  meshBounds,
  arch,
  toothPosition = 6,
  dirs,
  toothFdi = "16",
}) {
  const canals = useMemo(() => {
    const { center, size, cervicalY, bb } = meshBounds;
    const isMax = arch === "maxillary";
    const isUpper = arch === "maxillary";
    // Pulp chamber sits inside the crown — merge point well inside crown, not at cervical
    // pulpBottomY = just above cervical line (where canals branch from)
    // pulpTopY = deep inside the crown (occlusal third)
    const pulpBottomY = isMax
      ? cervicalY - size.y * 0.02
      : cervicalY + size.y * 0.02;
    const pulpY = isMax ? cervicalY - size.y * 0.12 : cervicalY + size.y * 0.12;
    const pulpTopY = isMax
      ? bb.min.y + size.y * 0.22
      : bb.max.y - size.y * 0.22;
    const cx = center.x;
    const cz = center.z;
    const spread = Math.max(size.x, size.z) * 0.18;
    // Helper: create a point offset from center along mesial/buccal directions
    const v = (y, m, b) => {
      const pos = new THREE.Vector3(cx, y, cz);
      if (m !== 0) pos.addScaledVector(dirs.mesial, m * spread);
      if (b !== 0) pos.addScaledVector(dirs.buccal, b * spread);
      return pos;
    };
    const paths = [];
    // Pulp chamber color (pinkish-red, slightly lighter)
    const pulpColor = new THREE.Color(0.9, 0.45, 0.4);
    // Canal color (deeper red)
    const cColor = new THREE.Color(0.85, 0.25, 0.22);
    // Determine root count based on ACTUAL dental anatomy
    let rootConfig = "single";
    if (toothPosition <= 3) {
      rootConfig = "single";
    } else if (toothPosition === 4) {
      rootConfig = isUpper ? "double" : "single";
    } else if (toothPosition === 5) {
      rootConfig = "single";
    } else {
      rootConfig = isUpper ? "triple" : "double";
    }
    const numRoots =
      rootConfig === "triple" ? 3 : rootConfig === "double" ? 2 : 1;
    // Compute root tip positions from bounding box + dental anatomy
    const rootTips = computeRootTips(
      bb,
      center,
      size,
      cervicalY,
      arch,
      numRoots,
      toothPosition,
      dirs.mesial,
      dirs.buccal,
    );
    // Pulp chamber: compact area inside the crown where roots merge
    const pulpRadius =
      rootConfig === "triple" ? 0.04 : rootConfig === "double" ? 0.035 : 0.03;
    const pulpChamber = new THREE.CatmullRomCurve3([
      v(pulpTopY, 0, 0),
      v(pulpY, 0, 0),
      v(pulpBottomY, 0, 0),
    ]);
    paths.push({
      curve: pulpChamber,
      radius: pulpRadius,
      color: pulpColor,
      profile: 0,
    });
    // Helper: create a natural nerve-like path with very subtle curves
    // Wiggle is kept extremely small to prevent canals from escaping narrow roots
    const makeNervePath = (start, tip, seed) => {
      const pts = [start.clone()];
      const steps = 8;
      const dx = tip.x - start.x;
      const dy = tip.y - start.y;
      const dz = tip.z - start.z;
      // Use the smaller root dimension for safe wiggle bounds
      const rootHalfWidth = Math.min(size.x, size.z) * 0.5;
      for (let s = 1; s <= steps; s++) {
        const t = s / (steps + 1);
        const bx = start.x + dx * t;
        const by = start.y + dy * t;
        const bz = start.z + dz * t;
        // Very tight envelope — near zero at start/end, small in middle
        const envelope = Math.sin(t * Math.PI) * (1.0 - t * 0.6);
        // Wiggle proportional to root width, very conservative
        const wiggleScale = rootHalfWidth * 0.03 * envelope;
        const freq1 = 3.0 + seed * 0.8;
        const freq3 = 1.8 + seed * 0.5;
        const wx = Math.sin(seed * 2.1 + t * freq1) * wiggleScale;
        const wz = Math.cos(seed * 1.4 + t * freq3) * wiggleScale * 0.3;
        pts.push(new THREE.Vector3(bx + wx, by, bz + wz));
      }
      pts.push(tip.clone());
      return new THREE.CatmullRomCurve3(pts);
    };
    // Use FDI number as a unique seed for each tooth's canal patterns
    const fdiSeed = parseInt(toothFdi, 10) || 16;
    const canalStartY = pulpBottomY;
    if (rootConfig === "single") {
      const tip = rootTips[0];
      const canal = makeNervePath(v(canalStartY, 0, 0), tip, fdiSeed * 0.37);
      paths.push({
        curve: canal,
        radius: 0.02,
        color: cColor,
        profile: 1,
      });
    } else if (rootConfig === "double") {
      for (let i = 0; i < 2; i++) {
        const tip = rootTips[i];
        const canal = makeNervePath(
          v(canalStartY, 0, 0),
          tip,
          fdiSeed * 0.37 + (i + 1) * 2.1,
        );
        paths.push({
          curve: canal,
          radius: 0.016,
          color: cColor,
          profile: 1,
        });
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const tip = rootTips[i];
        const canal = makeNervePath(
          v(canalStartY, 0, 0),
          tip,
          fdiSeed * 0.37 + (i + 1) * 3.3,
        );
        const r = i === 2 ? 0.018 : 0.015;
        paths.push({
          curve: canal,
          radius: r,
          color: cColor,
          profile: 1,
        });
      }
    }
    return paths;
  }, [meshBounds, arch, toothPosition, dirs, toothFdi]);
  const onBeforeCompile = useCallback((shader, radius, profile) => {
    shader.uniforms.uBaseRadius = {
      value: radius,
    };
    shader.uniforms.uProfile = {
      value: profile,
    };
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
       uniform float uBaseRadius;
       uniform float uProfile;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       float taper;
       if (uProfile < 0.5) {
         // Pulp chamber: wide at the top, bulging slightly, dropping cleanly to meet root entries
         taper = 1.0 - pow(uv.x, 2.5) * 0.4;
       } else {
         // Root canals: curve naturally downwards, tapering smoothly to a fine point
         taper = mix(1.0, 0.02, pow(uv.x, 1.2));
         
         // Introduce extremely subtle organic curves so roots don't look like straight pipes
         float wave = sin(uv.x * 12.0) * 0.06 + cos(uv.x * 20.0) * 0.03;
         taper += wave * taper;
       }
       
       // Three.js TubeGeometry normals point directly outward from the tube curve.
       // Pull the vertex inwards along the normal.
       transformed -= normal * uBaseRadius * (1.0 - taper);
      `,
    );
  }, []);
  // Memoize tube geometries to avoid recreating on every render
  const tubeGeometries = useMemo(
    () =>
      canals.map(
        (canal) =>
          new THREE.TubeGeometry(canal.curve, 48, canal.radius, 12, false),
      ),
    [canals],
  );
  // Dispose old geometries on cleanup
  useEffect(() => {
    return () => {
      tubeGeometries.forEach((g) => g.dispose());
    };
  }, [tubeGeometries]);
  return (
    <group>
      {canals.map((canal, i) => (
        <mesh geometry={tubeGeometries[i]}>
          <meshStandardMaterial
            color={canal.color}
            emissive={canal.color}
            emissiveIntensity={0.3}
            roughness={0.35}
            metalness={0.0}
            transparent={false}
            side={THREE.DoubleSide}
            onBeforeCompile={(shader) =>
              onBeforeCompile(shader, canal.radius, canal.profile)
            }
          />
        </mesh>
      ))}
    </group>
  );
});
// ══════════════════════════════════════════════════════════════
// Prepared tooth stump — uses the ACTUAL tooth geometry scaled inward
// so the stump follows the exact tooth profile (not a generic cylinder).
// Vertices are pulled toward center XZ with progressive taper, and
// fragments above a cut height are discarded for the ground-down look.
// ══════════════════════════════════════════════════════════════
export const PreparedStump = memo(function PreparedStump({
  toothMesh,
  meshBounds,
  arch,
  parentGroup,
}) {
  const stumpGeo = useMemo(() => {
    if (!toothMesh?.geometry || !parentGroup) return null;
    const { center, cervicalY, bb } = meshBounds;
    const isMax = arch === "maxillary";
    // Transform geometry to the outer group's local space (not full world space)
    // This avoids the mirrorX double-application issue
    const srcGeo = toothMesh.geometry.clone();
    const groupInverse = new THREE.Matrix4()
      .copy(parentGroup.matrixWorld)
      .invert();
    const relativeMatrix = new THREE.Matrix4().multiplyMatrices(
      groupInverse,
      toothMesh.matrixWorld,
    );
    srcGeo.applyMatrix4(relativeMatrix);
    const posAttr = srcGeo.attributes.position;
    // Transform reference points to the same local space
    const localCenter = center.clone().applyMatrix4(groupInverse);
    const localCervPt = new THREE.Vector3(
      center.x,
      cervicalY,
      center.z,
    ).applyMatrix4(groupInverse);
    const localCervicalY = localCervPt.y;
    const localBBmin = bb.min.clone().applyMatrix4(groupInverse);
    const localBBmax = bb.max.clone().applyMatrix4(groupInverse);
    const localCrownEnd = isMax
      ? Math.min(localBBmin.y, localBBmax.y)
      : Math.max(localBBmin.y, localBBmax.y);
    const localCrownHeight = Math.abs(localCervicalY - localCrownEnd);
    const localStumpHeight = localCrownHeight * 0.38;
    const localCutY = isMax
      ? localCervicalY - localStumpHeight
      : localCervicalY + localStumpHeight;
    // Compute actual centroid of vertices near cervical for accurate scaling pivot
    const cervBand = localStumpHeight * 0.3;
    let sumX = 0,
      sumZ = 0,
      count = 0;
    for (let i = 0; i < posAttr.count; i++) {
      const vy = posAttr.getY(i);
      if (Math.abs(vy - localCervicalY) < cervBand) {
        sumX += posAttr.getX(i);
        sumZ += posAttr.getZ(i);
        count++;
      }
    }
    const cx = count > 0 ? sumX / count : localCenter.x;
    const cz = count > 0 ? sumZ / count : localCenter.z;
    const rootOverlapLocal = 0.06;
    const rootLimitLocal = isMax
      ? localCervicalY + rootOverlapLocal
      : localCervicalY - rootOverlapLocal;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      // t: 0 = cervical, 1 = cut plane, negative = in root zone
      let t;
      if (isMax) {
        t = (localCervicalY - y) / localStumpHeight;
      } else {
        t = (y - localCervicalY) / localStumpHeight;
      }
      let scale;
      if (t <= 0) {
        scale = 0.9;
      } else if (t <= 0.15) {
        const blend = t / 0.15;
        scale = 0.9 + (0.72 - 0.9) * blend;
      } else {
        const tc = Math.min((t - 0.15) / 0.85, 1);
        scale = 0.72 - tc * 0.27;
      }
      const nx = cx + (x - cx) * scale;
      const nz = cz + (z - cz) * scale;
      let ny = y;
      if (isMax && y < localCutY) ny = localCutY;
      if (!isMax && y > localCutY) ny = localCutY;
      if (isMax && y > rootLimitLocal) ny = rootLimitLocal;
      if (!isMax && y < rootLimitLocal) ny = rootLimitLocal;
      posAttr.setXYZ(i, nx, ny, nz);
    }
    posAttr.needsUpdate = true;
    // Remove only deep-root degenerate triangles (all 3 at rootLimit)
    // KEEP flat top triangles at cutY (solid top) and keep root overlap triangles
    const clampEps = 0.001;
    const indexAttr = srcGeo.index;
    if (indexAttr) {
      const indices = [];
      for (let f = 0; f < indexAttr.count; f += 3) {
        const i0 = indexAttr.getX(f);
        const i1 = indexAttr.getX(f + 1);
        const i2 = indexAttr.getX(f + 2);
        const y0 = posAttr.getY(i0);
        const y1 = posAttr.getY(i1);
        const y2 = posAttr.getY(i2);
        // Skip degenerate triangles clamped at rootLimit
        const allAtRoot =
          Math.abs(y0 - rootLimitLocal) < clampEps &&
          Math.abs(y1 - rootLimitLocal) < clampEps &&
          Math.abs(y2 - rootLimitLocal) < clampEps;
        if (!allAtRoot) {
          indices.push(i0, i1, i2);
        }
      }
      srcGeo.setIndex(indices);
    }
    srcGeo.computeVertexNormals();
    return srcGeo;
  }, [toothMesh, meshBounds, arch, parentGroup]);
  useEffect(() => {
    return () => {
      stumpGeo?.dispose();
    };
  }, [stumpGeo]);
  if (!stumpGeo) return null;
  return (
    <mesh geometry={stumpGeo}>
      <meshStandardMaterial
        color={new THREE.Color(0.98, 0.96, 0.9)}
        emissive={new THREE.Color(0.14, 0.12, 0.09)}
        roughness={0.45}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});
export function Tooth({
  selectedZone,
  onSelectZone,
  onClearSelectedZone,
  onHoverZone,
  modelPath = "/models/tooth_16.glb",
  arch = "maxillary",
  mirrorX = false,
  quadrant,
  toothPosition = 6,
  toothFdi = "16",
  isImplant = false,
  findings = [],
  zoneNotes = {},
  toothDiagnoses = new Set(),
  multiSelectZones,
  multiSelectActive = false,
  compact = false,
  hideTags = false,
  treatmentHistoryDetails = {},
  toothEntries,
}) {
  const gltf = useGLTF(modelPath, "/draco/");
  const implantGltf = useGLTF("/models/implant.glb", "/draco/");
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
  // Annotation positioning data (computed from mesh world-space bounds)
  const [annotationData, setAnnotationData] = useState(null);
  const [boundsReady, setBoundsReady] = useState(0);
  const { camera, gl } = useThree();

  const hasCrown = toothDiagnoses.has("Crown") || Boolean(treatmentHistoryDetails?.Crown);
  const hasRCT = toothDiagnoses.has("RCT") || Boolean(treatmentHistoryDetails?.RCT);
  const hasBridge = toothDiagnoses.has("Bridge") || Boolean(treatmentHistoryDetails?.Bridge);
  const hasDenture = toothDiagnoses.has("Denture") || Boolean(treatmentHistoryDetails?.Denture);
  const hasImplant = isImplant || toothDiagnoses.has("Implant") || Boolean(treatmentHistoryDetails?.Implant);
  const isMissingOrExtraction =
    toothDiagnoses.has("Missing") ||
    toothDiagnoses.has("Extraction") ||
    Boolean(treatmentHistoryDetails?.Missing) ||
    Boolean(treatmentHistoryDetails?.Extraction);

  useLayoutEffect(() => {
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
          // Capture first mesh for annotation raycasting
          clonedScene.traverse((obj) => {
            const m = obj;
            if (m.isMesh && !toothMeshRef.current) {
              toothMeshRef.current = m;
            }
          });
          const bb = new THREE.Box3().setFromObject(groupRef.current);
          const center = new THREE.Vector3();
          const size = new THREE.Vector3();
          bb.getCenter(center);
          bb.getSize(size);
          let cervicalY, cejY, occlusalTop, crownBottomY;
          if (arch === "maxillary") {
            cervicalY = bb.min.y + size.y * 0.42;
            cejY = bb.min.y + size.y * 0.5;
            const crownH = cervicalY - bb.min.y;
            occlusalTop = bb.min.y + crownH * 0.45;
            crownBottomY = bb.min.y;
          } else {
            cervicalY = bb.max.y - size.y * 0.42;
            cejY = bb.max.y - size.y * 0.5;
            const crownH = bb.max.y - cervicalY;
            occlusalTop = bb.max.y - crownH * 0.45;
            crownBottomY = bb.max.y;
          }
          const zoneYawRad = zoneYawForTooth(toothPosition, quadrant);
          boundsData.current = {
            cervicalY,
            cejY,
            occlusalTop,
            centerX: center.x,
            centerZ: center.z,
            quadrant,
            zoneYawRad,
            bb,
            center,
            size,
          };
          setBoundsReady((v) => v + 1);
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
                arch,
                quadrant,
                zoneYawRad,
                toothFdi,
                hasImplant,
                isMissingOrExtraction,
                hasCrown,
                hasRCT,
                hasBridge,
                hasDenture,
              ),
            );
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
          if (hasImplant) {
            // Scale implant to fit proportionally within the tooth
            const cervicalDiam = Math.max(size.x, size.z) * 0.75;
            setImplantPlacement({
              cervicalY,
              centerX: center.x,
              centerZ: center.z,
              cervicalDiam,
            });
          }
          // Compute annotation data after shader injection is complete
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
            // When mirrorX is active, the mesh world-space X is flipped.
            // Negate X component of direction vectors so raycasts hit the correct surface.
            const fx = mirrorX ? -1 : 1;
            const flipDir = (d) =>
              new THREE.Vector3(d.x * fx, d.y, d.z).normalize();
            setAnnotationData({
              zoneDirs: {
                buccal: flipDir(dirs.buccal),
                lingual: flipDir(dirs.lingual),
                mesial: flipDir(dirs.mesial),
                distal: flipDir(dirs.distal),
              },
              meshBounds: {
                center: mCenter,
                size: mSize,
                cervicalY: mCervicalY,
                occlusalMidY: mOcclusalMidY,
                bb: meshBB,
              },
            });
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
  }, [
    clonedScene,
    arch,
    quadrant,
    toothPosition,
    modelPath,
    hasImplant,
    isMissingOrExtraction,
    hasCrown,
    hasRCT,
    hasBridge,
    hasDenture,
    treatmentHistoryDetails,
  ]);
  // Store current zone indices + finding flags in a ref so useFrame always has latest values
  const zoneIndicesRef = useRef({
    selected: -1,
    hovered: -1,
  });
  const zoneFindingsRef = useRef([0, 0, 0, 0, 0, 0, 0]);
  const wholeToothStateRef = useRef({
    selected: false,
    marked: false,
  });
  useEffect(() => {
    zoneIndicesRef.current.selected = selectedZone
      ? ALL_ZONES.indexOf(selectedZone)
      : -1;
  }, [selectedZone]);
  useEffect(() => {
    zoneIndicesRef.current.hovered = localHover
      ? ALL_ZONES.indexOf(localHover)
      : -1;
  }, [localHover]);
  useEffect(() => {
    // Update the findings ref whenever findings or multi-select zones change — picked up next frame
    zoneFindingsRef.current = ALL_ZONES.map((z) =>
      findings.some((f) => f.zoneId === z) ||
      (multiSelectActive && (multiSelectZones?.has(z) ?? false))
        ? 1
        : 0,
    );
  }, [findings, multiSelectZones, multiSelectActive]);
  useEffect(() => {
    wholeToothStateRef.current.selected =
      selectedZone === "whole" ||
      (multiSelectActive && (multiSelectZones?.has("whole") ?? false));
    wholeToothStateRef.current.marked = false;
  }, [
    multiSelectZones,
    selectedZone,
    toothEntries,
    treatmentHistoryDetails,
    multiSelectActive,
  ]);
  // Push zone uniforms every frame — guarantees highlighting even after shader recompile
  useFrame(() => {
    const { selected, hovered } = zoneIndicesRef.current;
    const zf = zoneFindingsRef.current;
    for (const ref of shaderRefs.current) {
      const s = ref.shader;
      if (!s?.uniforms) continue;
      s.uniforms.selectedZone.value = selected;
      s.uniforms.hoveredZone.value = hovered;
      if (s.uniforms.uWholeToothSelected)
        s.uniforms.uWholeToothSelected.value = wholeToothStateRef.current
          .selected
          ? 1.0
          : 0.0;
      if (s.uniforms.uWholeToothMarked)
        s.uniforms.uWholeToothMarked.value = wholeToothStateRef.current.marked
          ? 1.0
          : 0.0;
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
              e.point,
              getWorldNormal(e),
              b.cervicalY,
              b.cejY,
              b.occlusalTop,
              b.centerX,
              b.centerZ,
              arch,
              b.quadrant,
              b.zoneYawRad,
              toothFdi,
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
            if (isMissingOrExtraction)
              return;
            if (!boundsData.current) return;
            const b = boundsData.current;
            const z = classifyHit(
              e.point,
              getWorldNormal(e),
              b.cervicalY,
              b.cejY,
              b.occlusalTop,
              b.centerX,
              b.centerZ,
              arch,
              b.quadrant,
              b.zoneYawRad,
              toothFdi,
            );
            if (hasImplant && z && (z === "cervical" || z === "root")) return;
            // Multi-select only when a Findings/Procedures row is actively editing its surfaces.
            // Otherwise: normal single-select (replaces prior selection).
            if (z)
              onSelectZone(z, [e.point.x, e.point.y, e.point.z], {
                multi: multiSelectActive,
              });
          }}
        />
      </Center>
      {annotationData && !compact && (
        <Annotations
          toothMesh={toothMeshRef.current}
          findings={(() => {
            // Synthesize per-surface "findings" from toothEntries so the existing
            // annotation tooltip surfaces multi-section labels (Dx:… / Fn:… / Pr:…).
            const synth = [];
            let id = 0;
            for (const [name, detail] of Object.entries(
              treatmentHistoryDetails,
            )) {
              const surfaces = detail.surfaces ?? [];
              const labelParts = [name];
              if (detail.since?.trim()) labelParts.push(detail.since.trim());
              for (const z of surfaces) {
                synth.push({
                  id: `hist-${id++}`,
                  zoneId: z,
                  type: `Hx: ${labelParts.join(" · ")}`,
                  notes: detail.note ?? "",
                });
              }
            }
            for (const e of toothEntries ?? []) {
              const prefix =
                e.kind === "finding"
                  ? "Fn"
                  : e.kind === "planned"
                    ? "Pr"
                    : "Hx";
              const label = `${prefix}: ${e.name}`;
              for (const z of e.surfaces) {
                synth.push({
                  id: `ent-${id++}`,
                  zoneId: z,
                  type: label,
                  notes: "",
                });
              }
            }
            return [...findings, ...synth];
          })()}
          zoneNotes={zoneNotes}
          arch={arch}
          toothPosition={toothPosition}
          quadrant={quadrant}
          selectedZone={selectedZone}
          onSelectZone={onSelectZone}
          onClearSelectedZone={onClearSelectedZone}
          zoneDirs={annotationData.zoneDirs}
          meshBounds={annotationData.meshBounds}
        />
      )}

      {hasCrown &&
        annotationData &&
        toothMeshRef.current && (
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

      {hasBridge &&
        boundsData.current &&
        (() => {
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
        const visualWholeTags = new Set([
          "Implant",
          "Missing",
          "Extraction",
          "RCT",
          "Crown",
          "Bridge",
          "Denture",
        ]);
        const wholeTags = [];
        if (toothDiagnoses) {
          for (const d of toothDiagnoses) {
            if (visualWholeTags.has(d)) wholeTags.push(d);
          }
        }
        if (hasImplant && !wholeTags.includes("Implant"))
          wholeTags.push("Implant");
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
            style={{
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
            zIndexRange={[80, 40]}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: compact ? "2px" : "4px",
              }}
            >
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
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)",
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
// ══════════════════════════════════════════════════════════════
// Bridge Adjacent Teeth — shows faded ghost teeth on either side
// of the current tooth in single-tooth view when Bridge diagnosis is active.
// ══════════════════════════════════════════════════════════════
function getAdjacentTeeth(fdi) {
  const quadDigit = parseInt(fdi[0]);
  const posDigit = parseInt(fdi[1]);
  // Mesial = toward midline (position decreases), Distal = away from midline (position increases)
  const mesialPos = posDigit - 1;
  const distalPos = posDigit + 1;
  const mesialFdi = mesialPos >= 1 ? `${quadDigit}${mesialPos}` : null;
  const distalFdi = distalPos <= 8 ? `${quadDigit}${distalPos}` : null;
  const mesial = mesialFdi
    ? TEETH.find((t) => t.fdi === mesialFdi) || null
    : null;
  const distal = distalFdi
    ? TEETH.find((t) => t.fdi === distalFdi) || null
    : null;
  return {
    mesial,
    distal,
  };
}
const BridgeGhostTooth = memo(function BridgeGhostTooth({
  toothDef,
  side,
  currentBB,
  arch,
  mirrorX,
}) {
  const gltf = useGLTF(toothDef.modelPath, "/draco/");
  const groupRef = useRef(null);
  const [ghostCervicalY, setGhostCervicalY] = useState(null);
  const [ghostHalfWidth, setGhostHalfWidth] = useState(null);
  const [mountGen] = useState(() => Math.random());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cloned = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
      const mesh = obj;
      if (!mesh.isMesh || !mesh.material) return;
      const mat = mesh.material;
      const prep = (m) => {
        const c = m.clone();
        c.transparent = true;
        c.opacity = 0.12;
        c.depthWrite = false;
        c.side = THREE.DoubleSide;
        const lum = c.color.r * 0.299 + c.color.g * 0.587 + c.color.b * 0.114;
        c.color.setRGB(lum * 0.55 + 0.22, lum * 0.55 + 0.22, lum * 0.55 + 0.22);
        return c;
      };
      if (Array.isArray(mat)) {
        mesh.material = mat.map(prep);
      } else {
        mesh.material = prep(mat);
      }
    });
    return root;
  }, [gltf, mountGen]);
  // After mount: compute ghost tooth's cervical Y, then inject crown-only clipping shader
  useEffect(() => {
    if (!groupRef.current) return;
    const raf = requestAnimationFrame(() => {
      if (!groupRef.current) return;
      groupRef.current.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(groupRef.current);
      const size = new THREE.Vector3();
      bb.getSize(size);
      // Cervical Y at 42% from crown tip (same as main tooth)
      const cY =
        arch === "maxillary"
          ? bb.min.y + size.y * 0.42
          : bb.max.y - size.y * 0.42;
      setGhostCervicalY(cY);
      // Record half-width so the parent can position us flush against the central tooth
      setGhostHalfWidth(size.x / 2);
      // Inject shader to discard root-side fragments (world-space Y)
      const isMax = arch === "maxillary";
      cloned.traverse((obj) => {
        const mesh = obj;
        if (!mesh.isMesh || !mesh.material) return;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const mat of mats) {
          const m = mat;
          m.onBeforeCompile = (shader) => {
            shader.uniforms.uCervicalY = {
              value: cY,
            };
            shader.uniforms.uIsMax = {
              value: isMax ? 1.0 : 0.0,
            };
            shader.vertexShader = shader.vertexShader.replace(
              "#include <common>",
              `#include <common>
               varying vec3 vWorldPosGhost;
               varying vec3 vNormalGhost;
               varying vec3 vViewDirGhost;`,
            );
            shader.vertexShader = shader.vertexShader.replace(
              "#include <worldpos_vertex>",
              `#include <worldpos_vertex>
               vec4 wp = modelMatrix * vec4(transformed, 1.0);
               vWorldPosGhost = wp.xyz;
               vNormalGhost = normalize(mat3(modelMatrix) * objectNormal);
               vViewDirGhost = normalize(cameraPosition - wp.xyz);`,
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <common>",
              `#include <common>
               uniform float uCervicalY;
               uniform float uIsMax;
               varying vec3 vWorldPosGhost;
               varying vec3 vNormalGhost;
               varying vec3 vViewDirGhost;`,
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <dithering_fragment>",
              `#include <dithering_fragment>
               // Discard root-side fragments (crown-only)
               if (uIsMax > 0.5) {
                 if (vWorldPosGhost.y > uCervicalY) discard;
               } else {
                 if (vWorldPosGhost.y < uCervicalY) discard;
               }
               // Halo effect: edges more opaque (fresnel), center remains see-through
               float fres = pow(1.0 - max(0.0, dot(normalize(vNormalGhost), normalize(vViewDirGhost))), 2.2);
               gl_FragColor.a = clamp(gl_FragColor.a + fres * 0.28, 0.0, 0.68);
               // Back face: darken slightly so the hollow inner layer is visible from top
               if (!gl_FrontFacing) {
                 gl_FragColor.rgb *= 0.55;
                 gl_FragColor.a = min(gl_FragColor.a + 0.15, 0.85);
               }`,
            );
          };
          m.needsUpdate = true;
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [cloned, arch]);
  // Compute offset — attach adjacent tooth directly to current tooth (crowns touching)
  // Both central and ghost are <Center>-ed at their own origin, so the gap-free
  // spacing is (centralHalfWidth + ghostHalfWidth) with a tiny overlap for seamlessness.
  const offset = useMemo(() => {
    const currentSize = new THREE.Vector3();
    currentBB.getSize(currentSize);
    const centralHalf = currentSize.x / 2;
    // Fallback to central half-width on first render before ghost is measured
    const ghostHalf = ghostHalfWidth ?? centralHalf;
    // Visible overlap so crowns MERGE on both sides with no gap
    const spacing = centralHalf + ghostHalf - 0.12;
    // Mesial = toward midline, Distal = away from midline
    const sign = side === "mesial" ? 1 : -1;
    const dirSign = mirrorX ? -sign : sign;
    return new THREE.Vector3(dirSign * spacing, 0, 0);
  }, [currentBB, side, mirrorX, ghostHalfWidth]);
  // All three bridge teeth should face the same direction as the central tooth (front view).
  // The outer parent group already applies the central tooth's mirrorX scale, so we do NOT
  // re-apply the ghost's own mirrorX here — that keeps all three visually aligned.
  return (
    <group position={offset}>
      <Center ref={groupRef}>
        <primitive object={cloned} />
      </Center>
    </group>
  );
});
// Preload all unique tooth models + implant for instant switching
const ALL_MODEL_PATHS = [
  "/models/tooth_11.glb",
  "/models/tooth_13.glb",
  "/models/tooth_14.glb",
  "/models/tooth_15.glb",
  "/models/tooth_16.glb",
  "/models/tooth_17.glb",
  "/models/tooth_18.glb",
  "/models/tooth_31.glb",
  "/models/tooth_32.glb",
  "/models/tooth_33.glb",
  "/models/tooth_34.glb",
  "/models/tooth_35.glb",
  "/models/tooth_36.glb",
  "/models/tooth_37.glb",
  "/models/tooth_38.glb",
  "/models/implant.glb",
];

ALL_MODEL_PATHS.forEach((p) => useGLTF.preload(p, "/draco/"));
