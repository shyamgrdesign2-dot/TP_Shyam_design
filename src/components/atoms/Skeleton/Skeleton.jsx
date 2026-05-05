"use client";

/**
 * Skeleton — Loading placeholder atom.
 * Styling: Skeleton.module.scss (pulse animation + base bg).
 * Width / height / border-radius remain inline (fully dynamic per usage).
 */


import styles from "./Skeleton.module.scss";












export function Skeleton({
  variant = "text",
  width,
  height,
  radius,
  className,
  style: styleProp
}) {
  const defaultRadius = variant === "circular" ? "50%" :
  variant === "text" ? 4 :
  8;

  const dynamicStyle = {
    borderRadius: radius ?? defaultRadius,
    ...(variant === "text" ?
    { width: width ?? "100%", height: height ?? 14 } :
    variant === "circular" ?
    { width: width ?? 40, height: height ?? width ?? 40 } :
    { width: width ?? "100%", height: height ?? 40 }),
    ...styleProp
  };

  const cls = [styles.skeleton, className].filter(Boolean).join(" ");

  return <span className={cls} style={dynamicStyle} aria-hidden />;
}

Skeleton.displayName = "Skeleton";
export default Skeleton;