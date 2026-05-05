"use client";

/**
 * Avatar — User/entity representation atom.
 *
 * Shows initials or an image. Falls back to initials if image fails to load.
 */

import { useState } from "react";


















const SIZE_MAP = { sm: 28, md: 36, lg: 44, xl: 56 };
const FONT_MAP = { sm: 10, md: 12, lg: 14, xl: 16 };

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = "md",
  pixels,
  className,
  style: styleProp
}) {
  const [imgError, setImgError] = useState(false);
  const px = pixels ?? SIZE_MAP[size];
  const fontSize = pixels ? Math.round(pixels * 0.36) : FONT_MAP[size];
  const showImage = src && !imgError;

  const containerStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: px,
    height: px,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "var(--tp-blue-200, #B5B4F2)",
    color: "var(--tp-blue-700, #2E2D96)",
    fontSize,
    fontWeight: 600,
    fontFamily: "Inter, sans-serif",
    ...styleProp
  };

  return (
    <span className={className} style={containerStyle} role="img" aria-label={name ?? "Avatar"}>
      {showImage ?
      <img
        src={src}
        alt={name ?? "Avatar"}
        onError={() => setImgError(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        loading="lazy"
        decoding="async"
        draggable={false} /> :


      getInitials(name)
      }
    </span>);

}

Avatar.displayName = "Avatar";
export default Avatar;