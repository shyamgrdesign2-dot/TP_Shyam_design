"use client";

/**
 * Button — Unified TatvaPractice button atom.
 *
 * Styling: Button.module.scss (data-variant / data-theme / data-size / data-surface selectors).
 * No JS hover/focus state — all interaction handled in CSS.
 *
 * @see Button.module.scss — full variant × theme × state matrix
 * @see src/design-system/tokens/_colors.scss — token source of truth
 */

import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import styles from "./Button.module.scss";

// ── Types ──






























// ── Component ──

export const Button = forwardRef(
  function Button(
  {
    variant = "solid",
    theme = "primary",
    size = "md",
    surface = "light",
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    asChild = false,
    className = "",
    children,
    style: styleProp,
    ...props
  },
  ref)
  {
    const isDisabled = disabled || loading;
    const Comp = asChild ? Slot : "button";

    const cls = [styles.button, className].filter(Boolean).join(" ");

    const content = loading ?
    <span
      className={styles.spinner}
      data-size={size}
      aria-hidden /> :


    <>
        {leftIcon &&
      <span className={styles.icon} data-size={size} aria-hidden>
            {leftIcon}
          </span>
      }
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {children}
        </span>
        {rightIcon &&
      <span className={styles.icon} data-size={size} aria-hidden>
            {rightIcon}
          </span>
      }
      </>;


    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        disabled={isDisabled}
        className={cls}
        style={styleProp}
        data-variant={variant}
        data-theme={theme}
        data-size={size}
        data-surface={surface}
        data-loading={loading || undefined}
        {...props}>
        
        {content}
      </Comp>);

  }
);

Button.displayName = "Button";
export default Button;