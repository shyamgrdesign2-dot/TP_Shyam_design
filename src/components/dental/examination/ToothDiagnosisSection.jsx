/**
 * ToothDiagnosisSection.jsx
 * Contains the ImplantScrew 3D component — procedural implant geometry
 * that is rendered when a tooth has the Implant diagnosis.
 *
 * Exported constants: IMPLANT_TOP_Y, IMPLANT_TOP_DIAM, IMPLANT_CENTER_X, IMPLANT_CENTER_Z
 * Exported component: ImplantScrew
 */
import { useEffect, useMemo, memo } from "react";
import * as THREE from "three";

export const IMPLANT_TOP_Y = 0;
export const IMPLANT_TOP_DIAM = 1;
export const IMPLANT_CENTER_X = 0;
export const IMPLANT_CENTER_Z = 0;

// ══════════════════════════════════════════════════════════════
// Implant screw — procedural, matches each tooth's cervical cross-section
// ══════════════════════════════════════════════════════════════
// The screw's top profile is built from the tooth mesh vertices at cervical,
// so it fits exactly against the crown portion (which is kept via shader).
// Below cervical, the screw tapers to a pointed tip with thread ridges.

/**
 * @param {{ placement: object, arch: string, implantScene: object, toothMesh: object, bb: object, parentGroup: object }} props
 */
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
    const rootOverlapLocal = 0.1;
    const rootLimitLocal = isMax
      ? localCervicalY + rootOverlapLocal
      : localCervicalY - rootOverlapLocal;
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
        scale = 0.96;
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
    return { geo: srcGeo, cx, cz, localCervicalY, localCutY };
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
    const baseRadius =
      maxRadSq > 0 ? Math.sqrt(maxRadSq) : placement.cervicalDiam * 0.28;
    const maxRadiusAllowed = placement.cervicalDiam * 0.24;
    const radius = Math.min(baseRadius * 0.82, maxRadiusAllowed);
    // Build cylinder with helical screw threads
    const segs = 32;
    const rings = 40;
    const threads = 10;
    const threadDepth = radius * 0.09;
    const step = (Math.PI * 2) / segs;
    const verts = [], norms = [], idx = [];
    for (let r = 0; r <= rings; r++) {
      const t = r / rings;
      const y = isMax
        ? localCutY + t * screwLength
        : localCutY - t * screwLength;
      const tipTaper = t > 0.85 ? 1.0 - ((t - 0.85) / 0.15) * 0.35 : 1.0;
      for (let s = 0; s < segs; s++) {
        const a = s * step;
        const helixPhase = t * threads * Math.PI * 2 + a;
        const threadBump =
          t > 0.03 && t < 0.9
            ? Math.max(0, Math.sin(helixPhase)) * threadDepth
            : 0;
        const rad = (radius + threadBump) * tipTaper;
        verts.push(cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad);
        const nx = Math.cos(a), nz = Math.sin(a);
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
        const a = r * segs + s, b = r * segs + ns;
        const c = (r + 1) * segs + s, d = (r + 1) * segs + ns;
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
    const posAttr = geo.attributes.position;
    const cutEps = 0.015;
    const pts = [];
    for (let i = 0; i < posAttr.count; i++) {
      if (Math.abs(posAttr.getY(i) - localCutY) < cutEps) {
        pts.push({ x: posAttr.getX(i), z: posAttr.getZ(i) });
      }
    }
    if (pts.length < 3) return null;
    const segs = 32;
    const step = (Math.PI * 2) / segs;
    const radii = [];
    for (let s = 0; s < segs; s++) {
      const a = s * step;
      const dx = Math.cos(a), dz = Math.sin(a);
      let maxR = 0.01;
      for (const p of pts) {
        const proj = (p.x - cx) * dx + (p.z - cz) * dz;
        if (proj > maxR) maxR = proj;
      }
      radii.push(maxR);
    }
    const verts = [], norms = [], idx = [];
    const ny = isMax ? 1 : -1;
    verts.push(cx, localCutY, cz);
    norms.push(0, ny, 0);
    for (let s = 0; s < segs; s++) {
      const a = s * step;
      verts.push(
        cx + Math.cos(a) * radii[s],
        localCutY,
        cz + Math.sin(a) * radii[s],
      );
      norms.push(0, ny, 0);
    }
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
