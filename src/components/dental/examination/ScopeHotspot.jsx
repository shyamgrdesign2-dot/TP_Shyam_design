import { Html } from "@react-three/drei";

function ScopeHotspot({ label, position, onClick, emphasized = false }) {
  return (
    <Html position={position} transform occlude zIndexRange={[220, 80]}>
      <button
        type="button"
        onClick={onClick}
        className={`scope-hotspot-btn${emphasized ? " scope-hotspot-btn--emphasized" : ""}`}
      >
        {label}
      </button>
    </Html>
  );
}

export default ScopeHotspot;
