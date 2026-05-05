"use client";

/**
 * Alert — Inline notification molecule.
 * Styling: Alert.module.scss (data-severity selectors).
 */


import styles from "./Alert.module.scss";












export function Alert({
  severity = "info",
  title,
  children,
  icon,
  className = "",
  style: styleProp
}) {
  const cls = [styles.alert, className].filter(Boolean).join(" ");

  return (
    <div role="alert" className={cls} style={styleProp} data-severity={severity}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        <div>{children}</div>
      </div>
    </div>);

}

Alert.displayName = "Alert";
export default Alert;