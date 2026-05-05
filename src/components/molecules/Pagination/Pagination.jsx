"use client";

/**
 * Pagination — Page navigation molecule.
 *
 * Replaces MUI Pagination with pure HTML buttons.
 * Renders numbered page buttons + prev/next. TP-branded active state.
 * Styling: Pagination.module.scss (aria-current="page" drives active state).
 */

import { useMemo } from "react"; // CSSProperties kept for styleProp passthrough
import styles from "./Pagination.module.scss";
















/* ── Page range helper ── */

function getPageRange(count, page, siblings) {
  const totalNumbers = siblings * 2 + 3; // siblings + current + first + last
  const totalBlocks = totalNumbers + 2; // + 2 ellipsis

  if (count <= totalBlocks) {
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(page - siblings, 2);
  const rightSibling = Math.min(page + siblings, count - 1);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < count - 1;

  const pages = [1];

  if (showLeftEllipsis) pages.push("ellipsis");

  for (let i = leftSibling; i <= rightSibling; i++) {
    pages.push(i);
  }

  if (showRightEllipsis) pages.push("ellipsis");

  pages.push(count);
  return pages;
}

export function Pagination({
  count,
  page,
  onChange,
  siblingCount = 1,
  className = "",
  style: styleProp
}) {
  const pages = useMemo(() => getPageRange(count, page, siblingCount), [count, page, siblingCount]);

  if (count <= 1) return null;

  const navCls = [styles.nav, className].filter(Boolean).join(" ");

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={navCls}
      style={styleProp}>
      
      {/* Previous */}
      <button
        type="button"
        aria-label="Go to previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={styles.btn}>
        
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {/* Page buttons */}
      {pages.map((p, i) =>
      p === "ellipsis" ?
      <span
        key={`e${i}`}
        className={styles.ellipsis}
        aria-hidden>
        
            …
          </span> :

      <button
        key={p}
        type="button"
        aria-label={`Page ${p}`}
        aria-current={p === page ? "page" : undefined}
        onClick={() => onChange(p)}
        className={styles.btn}>
        
            {p}
          </button>

      )}

      {/* Next */}
      <button
        type="button"
        aria-label="Go to next page"
        disabled={page >= count}
        onClick={() => onChange(page + 1)}
        className={styles.btn}>
        
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </nav>);

}

Pagination.displayName = "Pagination";
export default Pagination;