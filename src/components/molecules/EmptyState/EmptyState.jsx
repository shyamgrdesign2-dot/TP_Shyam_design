"use client";

/**
 * EmptyState — Placeholder for empty content areas.
 * Styling: EmptyState.module.scss.
 */


import styles from "./EmptyState.module.scss";










export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
  style: styleProp
}) {
  const cls = [styles.root, className].filter(Boolean).join(" ");
  return (
    <div className={cls} style={styleProp}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>);

}

EmptyState.displayName = "EmptyState";
export default EmptyState;