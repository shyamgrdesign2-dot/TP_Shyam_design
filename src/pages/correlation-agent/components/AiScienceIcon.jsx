import React from "react";

/**
 * The side-nav glyph for the Correlation Agent.
 *
 * Served from the same CDN as the rest of the icon set, masked so it inherits
 * the rail's colour the way MedicalMaskIcon does. The rail hands every custom
 * icon a `variant` of "linear" or "bulk", which is exactly the split the CDN
 * publishes, so active and inactive resolve to their own asset.
 */
const BASE = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded";

export default function AiScienceIcon({ size = 20, variant = "linear", color = "#ffffff" }) {
  const href = `${BASE}/${variant === "bulk" ? "bulk" : "linear"}/ai/ai-science.svg`;

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        /* The portal rule `body span { color: ... !important }` targets this
           span, so the colour is set here explicitly for currentColor to
           resolve, matching how .snv-medical-icon handles it. */
        color,
        backgroundColor: "currentColor",
        WebkitMaskImage: `url("${href}")`,
        maskImage: `url("${href}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}
