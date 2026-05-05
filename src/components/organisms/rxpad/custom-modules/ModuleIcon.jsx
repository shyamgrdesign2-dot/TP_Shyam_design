"use client";

import { ModuleAtomIcon } from "./ModuleAtomIcon";









// Renders the auto-matched / overridden Iconsax SVG when available,
// falls back to the brand atom icon otherwise. The SVG string comes
// from the /api/iconsax-icon proxy and is sanitised at the source
// (Iconsax catalogue), so we render it via dangerouslySetInnerHTML.
// We force currentColor on the inner SVG so the surrounding text colour
// flows through.
export function ModuleIcon({ module, size = 22, color = "currentColor", className }) {
  const svg = module?.iconSvg;
  if (svg) {
    // Strip any hard-coded width/height/fill="white" the catalogue adds
    // so the icon inherits size + colour from its container.
    const normalised = svg.
    replace(/width="\d+(?:\.\d+)?"/g, `width="${size}"`).
    replace(/height="\d+(?:\.\d+)?"/g, `height="${size}"`).
    replace(/fill="white"/g, `fill="${color}"`);
    return (
      <span
        className={className}
        style={{ display: "inline-flex", color, width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: normalised }} />);


  }
  return <ModuleAtomIcon size={size} color={color} className={className} />;
}