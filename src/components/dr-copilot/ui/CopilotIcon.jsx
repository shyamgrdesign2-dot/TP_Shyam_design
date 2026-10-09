import React from "react";
import { ICON_BASE_DEFAULT, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";

/**
 * The only way icons enter Dr. Copilot.
 *
 * Two house rules, enforced here rather than remembered at each call site:
 * icons come from the Tesseract library (the CDN set, not hand-drawn paths or
 * a second icon package), and they are drawn in the bulk variant. Linear is
 * not used anywhere in this product, and a single hand-rolled SVG is all it
 * takes for a screen to stop looking like the rest of the app.
 *
 * `variant` defaults to bulk and should stay there; it is spelled out only
 * where the design system itself specifies otherwise (the close control is
 * bold, per the icon the design lead pointed at).
 *
 * `name` must be a real Tesseract token. Anything else renders nothing, which
 * is the loud kind of failure - a wrong icon that renders is far harder to
 * notice than one that does not.
 */
export function CopilotIcon({
  name,
  /* A Tesseract asset the library's name map does not list yet, given as its
     CDN path ("users/user"). Same set, same CDN, same mask rendering as
     TPLibraryIcon, so it is still the library's icon, reached directly. */
  asset,
  /* The library draws two families: "rounded" (everything else here) and
     "straight". Only used with `asset`, for a glyph that exists in one. */
  family = "rounded",
  size = 14,
  color = "currentColor",
  variant = "bulk",
  className,
  style,
}) {
  /* The library's "chevron-up" resolves to an arrow inside a circle, not
     the accordion chevron its name promises (chevron-down is the plain one).
     Every "up" is the plain chevron turned over, so open and closed read as
     the same control. */
  if (name === "chevron-up") {
    return (
      <CopilotIcon
        name="chevron-down"
        size={size}
        color={color}
        variant={variant}
        className={className}
        style={{ transform: "rotate(180deg)", ...style }}
      />
    );
  }
  if (asset) {
    const url = `${ICON_BASE_DEFAULT}/${family}/${variant}/${asset}.svg`;
    const mask = `url("${url}") center / contain no-repeat`;
    return (
      <span
        aria-hidden="true"
        data-tp-icon={`${asset}/${variant}`}
        className={className}
        style={{
          display: "inline-block",
          width: size,
          height: size,
          flexShrink: 0,
          backgroundColor: color,
          mask,
          WebkitMask: mask,
          ...style,
        }}
      />
    );
  }
  return (
    <TPLibraryIcon
      name={name}
      variant={variant}
      size={size}
      color={color}
      className={className}
      style={style}
    />
  );
}
