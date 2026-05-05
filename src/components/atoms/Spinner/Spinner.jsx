"use client";

/**
 * Spinner — Loading indicator atom.
 * Styling: Spinner.module.scss (animation + base).
 * Color is dynamic — passed as --spinner-color CSS custom property.
 */


import styles from "./Spinner.module.scss";













const SIZE_MAP = { sm: 16, md: 20, lg: 24 };

export function Spinner({
  size = "md",
  pixels,
  color = "var(--tp-blue-500, #4B4AD5)",
  className,
  label = "Loading"
}) {
  const px = pixels ?? SIZE_MAP[size];
  const cls = [styles.spinner, className].filter(Boolean).join(" ");

  return (
    <span
      role="status"
      aria-label={label}
      className={cls}
      style={{
        width: px,
        height: px,
        "--spinner-color": color
      }} />);


}

Spinner.displayName = "Spinner";
export default Spinner;