import { memo, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";

function computeRootTips(bb, center, size, cervicalY, arch, numRoots, toothPosition, mesialDir, buccalDir) {
  const isMax = arch === "maxillary";
  const rootEndY = isMax ? bb.max.y : bb.min.y;
  const rootDepth = Math.abs(rootEndY - cervicalY);
  const tipY = isMax
    ? cervicalY + rootDepth * 0.65
    : cervicalY - rootDepth * 0.65;
  const rootWidth = Math.min(size.x, size.z);
  const spreadBasis = rootWidth;
  const cx = center.x;
  const cz = center.z;
  if (numRoots === 1) {
    const tip = new THREE.Vector3(cx, tipY, cz);
    tip.addScaledVector(buccalDir, -spreadBasis * 0.02);
    return [tip];
  }
  if (numRoots === 2) {
    if (isMax && toothPosition === 4) {
      const buccalTip = new THREE.Vector3(cx, tipY, cz);
      buccalTip.addScaledVector(buccalDir, spreadBasis * 0.12);
      const palatalTip = new THREE.Vector3(cx, tipY, cz);
      palatalTip.addScaledVector(buccalDir, -spreadBasis * 0.12);
      return [buccalTip, palatalTip];
    } else {
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
    const mbTip = new THREE.Vector3(cx, tipY, cz);
    mbTip.addScaledVector(mesialDir, spreadBasis * 0.18);
    mbTip.addScaledVector(buccalDir, spreadBasis * 0.15);
    const dbTip = new THREE.Vector3(cx, tipY, cz);
    dbTip.addScaledVector(mesialDir, -spreadBasis * 0.15);
    dbTip.addScaledVector(buccalDir, spreadBasis * 0.15);
    const palatalTip = new THREE.Vector3(cx, tipY * 0.97 + cervicalY * 0.03, cz);
    palatalTip.addScaledVector(buccalDir, -spreadBasis * 0.22);
    return [mbTip, dbTip, palatalTip];
  }
  return [];
}

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
    const v = (y, m, b) => {
      const pos = new THREE.Vector3(cx, y, cz);
      if (m !== 0) pos.addScaledVector(dirs.mesial, m * spread);
      if (b !== 0) pos.addScaledVector(dirs.buccal, b * spread);
      return pos;
    };
    const paths = [];
    const pulpColor = new THREE.Color(0.9, 0.45, 0.4);
    const cColor = new THREE.Color(0.85, 0.25, 0.22);
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
    const rootTips = computeRootTips(
      bb, center, size, cervicalY, arch, numRoots, toothPosition,
      dirs.mesial, dirs.buccal,
    );
    const pulpRadius =
      rootConfig === "triple" ? 0.04 : rootConfig === "double" ? 0.035 : 0.03;
    const pulpChamber = new THREE.CatmullRomCurve3([
      v(pulpTopY, 0, 0),
      v(pulpY, 0, 0),
      v(pulpBottomY, 0, 0),
    ]);
    paths.push({ curve: pulpChamber, radius: pulpRadius, color: pulpColor, profile: 0 });
    const makeNervePath = (start, tip, seed) => {
      const pts = [start.clone()];
      const steps = 8;
      const dx = tip.x - start.x;
      const dy = tip.y - start.y;
      const dz = tip.z - start.z;
      const rootHalfWidth = Math.min(size.x, size.z) * 0.5;
      for (let s = 1; s <= steps; s++) {
        const t = s / (steps + 1);
        const bx = start.x + dx * t;
        const by = start.y + dy * t;
        const bz = start.z + dz * t;
        const envelope = Math.sin(t * Math.PI) * (1.0 - t * 0.6);
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
    const fdiSeed = parseInt(toothFdi, 10) || 16;
    const canalStartY = pulpBottomY;
    if (rootConfig === "single") {
      const canal = makeNervePath(v(canalStartY, 0, 0), rootTips[0], fdiSeed * 0.37);
      paths.push({ curve: canal, radius: 0.02, color: cColor, profile: 1 });
    } else if (rootConfig === "double") {
      for (let i = 0; i < 2; i++) {
        const canal = makeNervePath(v(canalStartY, 0, 0), rootTips[i], fdiSeed * 0.37 + (i + 1) * 2.1);
        paths.push({ curve: canal, radius: 0.016, color: cColor, profile: 1 });
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const canal = makeNervePath(v(canalStartY, 0, 0), rootTips[i], fdiSeed * 0.37 + (i + 1) * 3.3);
        paths.push({ curve: canal, radius: i === 2 ? 0.018 : 0.015, color: cColor, profile: 1 });
      }
    }
    return paths;
  }, [meshBounds, arch, toothPosition, dirs, toothFdi]);

  const onBeforeCompile = useCallback((shader, radius, profile) => {
    shader.uniforms.uBaseRadius = { value: radius };
    shader.uniforms.uProfile = { value: profile };
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
         taper = 1.0 - pow(uv.x, 2.5) * 0.4;
       } else {
         taper = mix(1.0, 0.02, pow(uv.x, 1.2));
         float wave = sin(uv.x * 12.0) * 0.06 + cos(uv.x * 20.0) * 0.03;
         taper += wave * taper;
       }
       transformed -= normal * uBaseRadius * (1.0 - taper);
      `,
    );
  }, []);

  const tubeGeometries = useMemo(
    () =>
      canals.map(
        (canal) =>
          new THREE.TubeGeometry(canal.curve, 48, canal.radius, 12, false),
      ),
    [canals],
  );

  useEffect(() => {
    return () => {
      tubeGeometries.forEach((g) => g.dispose());
    };
  }, [tubeGeometries]);

  return (
    <group>
      {canals.map((canal, i) => (
        <mesh key={i} geometry={tubeGeometries[i]}>
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
