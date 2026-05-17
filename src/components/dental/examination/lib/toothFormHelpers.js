/**
 * toothFormHelpers.js
 * Pure helper functions for dental tooth geometry, zone classification,
 * and surface direction computation.
 * NO React, NO axios, NO redux imports.
 */
import * as THREE from "three";
import { isPatientRightQuadrant, TEETH } from "../types";

/**
 * Front-view camera azimuths per tooth FDI, from user-provided reference screenshots.
 * The camera azimuth when looking at the labial/buccal face = direction the front faces.
 * Null means use the default (buccal = -Z).
 */
export const FRONT_VIEWS = {
  // Upper Right (Quadrant 1) — anterior pol=80°, posterior pol=90°
  11: { az: 0, pol: 80 },
  12: { az: 0, pol: 80 },
  13: { az: -45, pol: 80 },
  14: { az: -70, pol: 90 },
  15: { az: -70, pol: 90 },
  16: { az: -70, pol: 90 },
  17: { az: -80, pol: 90 },
  18: { az: -70, pol: 90 },
  // Upper Left (Quadrant 2) — anterior pol=80°, posterior pol=90°
  21: { az: 0, pol: 80 },
  22: { az: 0, pol: 80 },
  23: { az: 45, pol: 80 },
  24: { az: 70, pol: 90 },
  25: { az: 70, pol: 90 },
  26: { az: 70, pol: 90 },
  27: { az: 80, pol: 90 },
  28: { az: 70, pol: 90 },
  // Lower Left (Quadrant 3) — all pol=90°
  31: { az: 20, pol: 90 },
  32: { az: 0, pol: 90 },
  33: { az: 30, pol: 90 },
  34: { az: 50, pol: 90 },
  35: { az: 50, pol: 90 },
  36: { az: 65, pol: 90 },
  37: { az: 90, pol: 90 },
  38: { az: 90, pol: 90 },
  // Lower Right (Quadrant 4) — all pol=90°
  41: { az: -20, pol: 90 },
  42: { az: 0, pol: 90 },
  43: { az: -30, pol: 90 },
  44: { az: -50, pol: 90 },
  45: { az: -50, pol: 90 },
  46: { az: -65, pol: 90 },
  47: { az: -90, pol: 90 },
  48: { az: -90, pol: 90 },
};

/** Convert degrees to radians for azimuth lookup */
export function getFrontAzimuth(fdi) {
  const v = FRONT_VIEWS[fdi];
  return v ? (v.az * Math.PI) / 180 : undefined;
}

export function getFrontPolar(fdi) {
  const v = FRONT_VIEWS[fdi];
  return v ? (v.pol * Math.PI) / 180 : Math.PI * 0.5;
}

export function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Rotate a horizontal (XZ) unit direction around world +Y (right-hand rule). */
export function rotateDirXZ(v, yawRad) {
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
 */
export function surfaceDirsFromFrontAzimuth(frontAz, q) {
  const buccal = new THREE.Vector3(
    Math.sin(frontAz),
    0,
    Math.cos(frontAz),
  ).normalize();
  const lingual = buccal.clone().negate();
  const mx = isPatientRightQuadrant(q) ? 1 : -1;
  const perp = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), buccal)
    .normalize();
  const mesial =
    perp.dot(new THREE.Vector3(mx, 0, 0)) > 0 ? perp : perp.clone().negate();
  const distal = mesial.clone().negate();
  return { buccal, lingual, mesial, distal };
}

export function surfaceDirsForQuadrant(q, yawRad = 0) {
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

export function zoneYawForTooth(positionInQuadrant, quadrant) {
  return 0; // No longer using generic yaw — using per-tooth front azimuths instead
}

export function crownSideFromNormalAndPoint(point, normal, centerX, centerZ, dirs) {
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

export function classifyHit(
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

/**
 * Returns the adjacent (mesial/distal) tooth definitions for a given FDI.
 * Pure function — no React or side effects.
 */
export function getAdjacentTeeth(fdi) {
  const quadDigit = parseInt(fdi[0]);
  const posDigit = parseInt(fdi[1]);
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
  return { mesial, distal };
}
