"use client";

/**
 * Checkbox — Wraps Radix UI Checkbox with TP token styling.
 * Styling: Checkbox.module.scss (data-state="checked" / :hover / :focus-visible).
 */

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import styles from "./Checkbox.module.scss";






export const Checkbox = React.forwardRef(


  function Checkbox({ className = "", style, ...props }, ref) {
    const cls = [styles.root, className].filter(Boolean).join(" ");

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        className={cls}
        style={style}
        data-slot="checkbox"
        {...props}>
        
      <CheckboxPrimitive.Indicator className={styles.indicator}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round" />
            
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>);

  });

Checkbox.displayName = "Checkbox";
export default Checkbox;