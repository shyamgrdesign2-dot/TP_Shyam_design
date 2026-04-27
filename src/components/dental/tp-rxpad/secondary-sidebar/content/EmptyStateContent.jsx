/**
 * Empty state content panel — shown when there are no records for a section.
 */
import React from "react";
import layout from "./sidebarContentLayout.module.scss";
export function EmptyStateContent({ sectionLabel }) {
  return (
    <div className={layout.emptyRoot}>
      <div className={layout.emptyIconWrap}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path
            d="M26.667 12H5.333A2.667 2.667 0 0 0 2.667 14.667v10.666A2.667 2.667 0 0 0 5.333 28h21.334a2.667 2.667 0 0 0 2.666-2.667V14.667A2.667 2.667 0 0 0 26.667 12Z"
            fill="var(--tp-slate-200)"
          />
          <path
            d="M10.667 12V9.333a5.333 5.333 0 0 1 10.666 0V12"
            stroke="var(--tp-blue-300)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="16" cy="20" r="2" fill="var(--tp-blue-300)" />
        </svg>
      </div>
      <div className={layout.emptyTextStack}>
        <p className={layout.emptyHeading}>No {sectionLabel} Records</p>
        <p className={layout.emptyBody}>
          No {sectionLabel.toLowerCase()} data has been recorded for this
          patient yet.
        </p>
      </div>
      <button type="button" className={layout.emptyCta}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 1v10M1 6h10"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Add {sectionLabel}
      </button>
    </div>
  );
}
