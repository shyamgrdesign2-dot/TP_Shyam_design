import { memo, useMemo, useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { useGLTF, Center } from "@react-three/drei";
import { TEETH } from "./types";
import { ASSETS } from "../../../assets";

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

export const BridgeGhostTooth = memo(function BridgeGhostTooth({
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

  useEffect(() => {
    if (!groupRef.current) return;
    const raf = requestAnimationFrame(() => {
      if (!groupRef.current) return;
      groupRef.current.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(groupRef.current);
      const size = new THREE.Vector3();
      bb.getSize(size);
      const cY =
        arch === "maxillary"
          ? bb.min.y + size.y * 0.42
          : bb.max.y - size.y * 0.42;
      setGhostCervicalY(cY);
      setGhostHalfWidth(size.x / 2);
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
            shader.uniforms.uCervicalY = { value: cY };
            shader.uniforms.uIsMax = { value: isMax ? 1.0 : 0.0 };
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
               if (uIsMax > 0.5) {
                 if (vWorldPosGhost.y > uCervicalY) discard;
               } else {
                 if (vWorldPosGhost.y < uCervicalY) discard;
               }
               float fres = pow(1.0 - max(0.0, dot(normalize(vNormalGhost), normalize(vViewDirGhost))), 2.2);
               gl_FragColor.a = clamp(gl_FragColor.a + fres * 0.28, 0.0, 0.68);
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

  const offset = useMemo(() => {
    const currentSize = new THREE.Vector3();
    currentBB.getSize(currentSize);
    const centralHalf = currentSize.x / 2;
    const ghostHalf = ghostHalfWidth ?? centralHalf;
    const spacing = centralHalf + ghostHalf - 0.12;
    const sign = side === "mesial" ? 1 : -1;
    const dirSign = mirrorX ? -sign : sign;
    return new THREE.Vector3(dirSign * spacing, 0, 0);
  }, [currentBB, side, mirrorX, ghostHalfWidth]);

  return (
    <group position={offset}>
      <Center ref={groupRef}>
        <primitive object={cloned} />
      </Center>
    </group>
  );
});

