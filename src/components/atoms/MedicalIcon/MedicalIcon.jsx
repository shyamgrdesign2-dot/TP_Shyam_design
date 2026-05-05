"use client";

import * as React from "react";

import {
  resolveTPMedicalIconName,
  tpMedicalIconRegistry } from


"./registry";









export function MedicalIcon({
  name,
  variant = "line",
  size = 24,
  color,
  alt,
  className,
  style,
  ...imgProps
}) {
  const resolvedName =
  typeof name === "string" ?
  resolveTPMedicalIconName(name) ?? (name in tpMedicalIconRegistry ? name : null) :
  name;

  if (!resolvedName) {
    if (process.env.NODE_ENV !== "production") {
      // Keep this warning in dev only to help discover missing icon tokens early.
      console.warn(`[TPMedicalIcon] Unknown icon token: "${String(name)}"`);
    }
    return null;
  }

  const iconRecord = tpMedicalIconRegistry[resolvedName];
  const src = iconRecord[variant] ?? iconRecord.line;
  const numericSize = typeof size === "number" ? `${size}px` : size;

  if (color) {
    const maskedStyle = {
      width: numericSize,
      height: numericSize,
      display: "inline-block",
      verticalAlign: "middle",
      backgroundColor: color,
      WebkitMaskImage: `url(${src})`,
      maskImage: `url(${src})`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
      ...style
    };

    return (
      <span
        role="img"
        aria-label={alt ?? resolvedName}
        className={className}
        style={maskedStyle} />);


  }

  return (
    <img
      {...imgProps}
      src={src}
      alt={alt ?? resolvedName}
      width={numericSize}
      height={numericSize}
      className={className}
      style={{ width: numericSize, height: numericSize, ...style }}
      loading={imgProps.loading ?? "lazy"}
      decoding={imgProps.decoding ?? "async"}
      draggable={imgProps.draggable ?? false} />);


}