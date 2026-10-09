import React from "react";

import styles from "./AgentSpark.module.css";

/**
 * The Dr. Agent brand mark: the gradient background plate with the spark on
 * top. Same two assets and the same composition as AgentHeader, so every agent
 * surface in the product carries one identical mark.
 *
 * `animated` adds the slow rotation used on the VoiceRx empty state.
 */
export default function AgentSpark({ size = 24, sparkSize, animated = false, className = "" }) {
  const spark = sparkSize || Math.round(size * 0.58);

  return (
    <span
      className={`${styles.wrapper} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        className={styles.bg}
        src="/new-assets/icons/dr-agent/agent-bg.svg"
        alt=""
        draggable={false}
      />
      <img
        className={animated ? `${styles.spark} ${styles.rotate}` : styles.spark}
        src="/new-assets/icons/dr-agent/agent-spark.svg"
        alt=""
        draggable={false}
        style={{ width: spark, height: spark }}
      />
    </span>
  );
}
