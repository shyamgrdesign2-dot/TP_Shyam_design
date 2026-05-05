"use client";

/**
 * Breadcrumbs — Navigation breadcrumb trail molecule.
 *
 * Replaces MUI Breadcrumbs with pure HTML. Renders a <nav> with
 * <ol> for accessibility. Chevron separator between items.
 * Styling: Breadcrumbs.module.scss (aria-current="page" drives active item).
 */

import { Children } from "react";
import styles from "./Breadcrumbs.module.scss";























const defaultSeparator =
<svg
  width="14"
  height="14"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  aria-hidden>
  
    <path d="m9 18 6-6-6-6" />
  </svg>;


export function Breadcrumbs({
  children,
  separator = defaultSeparator,
  className = "",
  style: styleProp
}) {
  const items = Children.toArray(children);
  const navCls = [styles.nav, className].filter(Boolean).join(" ");

  return (
    <nav aria-label="Breadcrumb" className={navCls} style={styleProp}>
      <ol className={styles.list}>
        {items.map((item, i) =>
        <li key={i} className={styles.listItem}>
            {i > 0 &&
          <span aria-hidden className={styles.separator}>
                {separator}
              </span>
          }
            {item}
          </li>
        )}
      </ol>
    </nav>);

}

export function BreadcrumbItem({
  children,
  active = false,
  className = "",
  style: styleProp
}) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  return (
    <span
      className={cls}
      aria-current={active ? "page" : undefined}
      style={styleProp}>
      
      {children}
    </span>);

}

Breadcrumbs.displayName = "Breadcrumbs";
BreadcrumbItem.displayName = "BreadcrumbItem";
export default Breadcrumbs;