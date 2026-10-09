import { memo, useMemo, useEffect } from "react";
import * as THREE from "three";

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
    const cervBand = localStumpHeight * 0.3;
    let sumX = 0, sumZ = 0, count = 0;
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
        if (!allAtRoot) indices.push(i0, i1, i2);
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
