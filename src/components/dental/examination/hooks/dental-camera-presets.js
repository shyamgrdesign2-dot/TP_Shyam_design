import * as THREE from "three";
import { getFrontAzimuth } from "../Tooth";

// ── Camera preset constants ───────────────────────────────────────────────────
export const DENTITION_CAMERA = {
  position: new THREE.Vector3(0, 2.5, 16.5),
  target: new THREE.Vector3(0, -0.9, -0.3),
  fov: 35
};

/** Same default radius as ZoneCameraRotator so "no surface picked" matches buccal framing. */
export const SINGLE_TOOTH_ORBIT_RADIUS = 6.28;
/** Single-tooth orbit target; Y slightly above old -0.04 so the tooth sits higher in frame. */
export const SINGLE_TOOTH_TARGET = new THREE.Vector3(0, 0.04, 0);
export const SINGLE_TOOTH_FOV = 27;
/** UR/UL/LR/LL + R/L: much closer Z than Max/Man/Full (see groupedScopeZ). */
export const QUADRANT_SIDE_SCOPE_EXTRA_ZOOM = 3.15;

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Compute the shortest signed angle delta between two angles (radians).
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
export function shortestAngleDelta(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Compute the buccal camera preset for a single tooth.
 * @param {string} fdi
 * @param {number} width  Canvas pixel width
 * @param {number} height Canvas pixel height
 * @returns {{ position: THREE.Vector3, target: THREE.Vector3, fov: number }}
 */
export function getSingleToothBuccalCamera(fdi, width, height) {
  const aspect = width / Math.max(1, height);
  const widthFactor = (width - 980) / 980;
  const widthAdjust = Math.max(-1.1, Math.min(1.1, -widthFactor * 1.5));
  const aspectPull =
    aspect < 0.7
      ? 2.0
      : aspect < 0.9
      ? 1.15
      : aspect < 1.1
      ? 0.6
      : aspect < 1.4
      ? 0.22
      : 0;
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
