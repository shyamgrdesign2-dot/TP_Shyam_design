import React from "react";
import styles from "./VideoThumb.module.css";

/**
 * The tutorial's thumbnail.
 *
 * This used to be `<img src="/demo-reports/logo512.png">`, an asset that does
 * not exist in `public/` — so both places that showed it rendered a broken
 * image and its alt text directly under the primary CTA. It is drawn here
 * instead of restored as a file: the repo lints against raster imports
 * (`scripts/check-no-raster-imports.js`), and a placeholder that is really a
 * play button does not need to be a bitmap.
 *
 * Deliberately NOT the AI hero gradient. That gradient marks the CTAs that
 * open the agent, and this sits immediately under one of them — competing with
 * "Start a correlation" for the same emphasis is what made the old block read
 * as a second action rather than as a footnote.
 */
export default function VideoThumb({ title = "How the Correlation Agent works" }) {
  return (
    <span className={styles.art}>
      <span className={styles.play} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
          <path d="M9 6.5v11l9-5.5-9-5.5z" fill="currentColor" />
        </svg>
      </span>
      <span className={styles.label}>{title}</span>
    </span>
  );
}
