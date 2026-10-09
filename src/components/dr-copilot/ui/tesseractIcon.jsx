import React from "react";
import { CopilotIcon } from "./CopilotIcon";

/**
 * A Tesseract icon shaped like an iconsax one.
 *
 * The ported Dr. Agent cards were written against iconsax: components with
 * `size`, a capitalised `variant`, `color` and `className`, sometimes passed
 * around as data (`icon: Flash`) and rendered later. Rewriting every call
 * site would have been forty files of churn for no visual gain, and the
 * data-driven ones cannot be rewritten as JSX at all. So each file swaps its
 * iconsax import for components built here, under the same names, and every
 * icon now comes from the Tesseract set the house rule requires.
 *
 * `asset` reaches a Tesseract CDN glyph that the library's name map does not
 * list (see CopilotIcon).
 */

const VARIANTS = {
  Bold: "bold",
  Bulk: "bulk",
  Linear: "linear",
  Outline: "linear",
  Broken: "linear",
  TwoTone: "linear",
};

export function tesseractIcon(name, asset) {
  function TesseractIcon({ size = 24, variant = "Linear", color = "currentColor", className, style }) {
    return (
      <CopilotIcon
        name={asset ? undefined : name}
        asset={asset}
        size={size}
        variant={VARIANTS[variant] || String(variant || "linear").toLowerCase()}
        color={color}
        className={className}
        style={style}
      />
    );
  }
  TesseractIcon.displayName = `TesseractIcon(${asset || name})`;
  return TesseractIcon;
}
