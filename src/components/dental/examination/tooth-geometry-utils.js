import * as THREE from "three";
import { getFrontAzimuth } from "./tooth-camera";

/** Deep-clone scene so each tooth owns materials (cached useGLTF shares one). */
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

export function collectZoneMaterials(root) {
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
 */
function surfaceDirsFromFrontAzimuth(frontAz, q) {
  const buccal = new THREE.Vector3(
    Math.sin(frontAz),
    0,
    Math.cos(frontAz),
  ).normalize();
  const lingual = buccal.clone().negate();
  const isRight = q === "upper-right" || q === "lower-right";
  const mx = isRight ? 1 : -1;
  const perp = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), buccal)
    .normalize();
  const mesial =
    perp.dot(new THREE.Vector3(mx, 0, 0)) > 0 ? perp : perp.clone().negate();
  const distal = mesial.clone().negate();
  return { buccal, lingual, mesial, distal };
}

function surfaceDirsForQuadrant(q, yawRad = 0) {
  // Inline the isPatientRightQuadrant logic to avoid circular import
  const isRight = q === "upper-right" || q === "lower-right";
  const mx = isRight ? 1 : -1;
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

export function classifyHit(
  point, faceNormal, cervicalY, cejY, occlusalTop,
  centerX, centerZ, arch, quadrant, zoneYawRad, toothFdi = "16",
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

/**
 * Compute anatomical Y-coordinates from a tooth group's bounding box.
 * Caller must update the group's world matrix before calling.
 */
export function computeToothBounds(groupRef, arch) {
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
  return { bb, center, size, cervicalY, cejY, occlusalTop, crownBottomY };
}
