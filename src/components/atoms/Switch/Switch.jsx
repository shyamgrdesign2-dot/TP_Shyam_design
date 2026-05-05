"use client";

/**
 * Switch — Toggle switch atom wrapping Radix UI Switch.
 * Styling: Switch.module.scss (data-state="checked" / data-size selectors).
 */

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import styles from "./Switch.module.scss";







export const Switch = React.forwardRef(


  function Switch({ size = "md", className = "", style, ...props }, ref) {
    const cls = [styles.root, className].filter(Boolean).join(" ");

    return (
      <SwitchPrimitive.Root
        ref={ref}
        className={cls}
        style={style}
        data-slot="switch"
        data-size={size}
        {...props}>
        
      <SwitchPrimitive.Thumb className={styles.thumb} />
    </SwitchPrimitive.Root>);

  });

Switch.displayName = "Switch";
export default Switch;