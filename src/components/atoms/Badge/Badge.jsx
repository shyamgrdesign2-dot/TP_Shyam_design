"use client";

/**
 * Badge — Status / count indicator atom.
 * Styling: Badge.module.scss (data-variant / data-color selectors).
 */


import styles from "./Badge.module.scss";












export function Badge({
  variant = "soft",
  color = "primary",
  children,
  className,
  style: styleProp
}) {
  if (variant === "dot") {
    const cls = [styles.dot, className].filter(Boolean).join(" ");
    return (
      <span
        className={cls}
        style={styleProp}
        data-color={color}
        aria-hidden />);


  }

  const cls = [styles.badge, className].filter(Boolean).join(" ");
  return (
    <span
      className={cls}
      style={styleProp}
      data-variant={variant}
      data-color={color}>
      
      {children}
    </span>);

}

Badge.displayName = "Badge";
export default Badge;