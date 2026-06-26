/**
 * MiniToothCanvas — renders the actual <Tooth> component in a tiny R3F canvas.
 * Reuses the same shader pipeline as the single-tooth view so the thumbnail
 * exactly mirrors the doctor's current state (tooth-level diagnoses + surface
 * findings all tint in situ).
 */
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import { Tooth } from "./Tooth";
export function MiniToothCanvas({
  tooth,
  diagnoses,
  isImplant = false,
  findings = [],
  size = 44,
}) {
  const diag = diagnoses ?? new Set();
  return (
    <div
      style={{
        width: size,
        height: size,
        pointerEvents: "none",
        position: "relative",
      }}
    >
      <Canvas
        camera={{
          position: [0, -0.2, 5],
          fov: 30,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: 3,
          toneMappingExposure: 1.35,
          alpha: true,
        }}
        style={{
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 3]} intensity={0.8} />
        <directionalLight position={[-2, 1, -2]} intensity={0.3} />
        <Suspense fallback={null}>
          <Center>
            <group scale={0.9}>
              <Tooth
                compact={true}
                modelPath={tooth.modelPath}
                arch={tooth.arch}
                mirrorX={tooth.mirrorX}
                quadrant={tooth.quadrant}
                toothPosition={tooth.position}
                toothFdi={tooth.fdi}
                selectedZone={null}
                onSelectZone={() => {}}
                onHoverZone={() => {}}
                isImplant={isImplant}
                findings={findings}
                toothDiagnoses={diag}
                hideTags={true}
              />
            </group>
          </Center>
        </Suspense>
      </Canvas>
    </div>
  );
}
