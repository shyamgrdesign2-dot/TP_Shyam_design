import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getFrontAzimuth, getDirsForTooth } from "../Tooth";
import { shortestAngleDelta } from "./dental-camera-presets";

/**
 * R3F component (renders null).  When `zone` changes it smoothly orbits the
 * camera to the correct anatomical face of the selected tooth.
 *
 * @param {{ zone: string|null, toothFdi: string, quadrant: string,
 *           arch: string, controlsRef: React.MutableRefObject, radius?: number }} props
 */
export function ZoneCameraRotator({
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
    const offset = new THREE.Vector3().subVectors(camera.position, center);
    const cur = new THREE.Spherical().setFromVector3(offset);
    const goal = target.current;
    const lerp = 0.12;
    cur.theta += shortestAngleDelta(cur.theta, goal.theta) * lerp;
    cur.phi += (goal.phi - cur.phi) * lerp;
    cur.radius += (goal.radius - cur.radius) * lerp;
    const next = new THREE.Vector3().setFromSpherical(cur);
    camera.position.copy(next.add(center));
    controls.update();
    if (
      Math.abs(shortestAngleDelta(cur.theta, goal.theta)) < 0.005 &&
      Math.abs(cur.phi - goal.phi) < 0.005 &&
      Math.abs(cur.radius - goal.radius) < 0.01
    ) {
      target.current = null;
      if (controls) {
        controls.enabled = true;
        controls.enableDamping = true;
      }
    }
  });

  return null;
}
