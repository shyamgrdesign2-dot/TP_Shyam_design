"use client";

/**
 * Input — Text input atom with TP token styling.
 * Styling: Input.module.scss (data-size / data-error / data-fullwidth selectors).
 */

import { forwardRef } from "react";
import styles from "./Input.module.scss";











export const Input = forwardRef(
  function Input(
  {
    size = "md",
    error = false,
    fullWidth = false,
    className = "",
    style: styleProp,
    ...props
  },
  ref)
  {
    const cls = [styles.input, className].filter(Boolean).join(" ");

    return (
      <input
        ref={ref}
        className={cls}
        style={styleProp}
        data-size={size}
        data-error={error || undefined}
        data-fullwidth={fullWidth || undefined}
        {...props} />);


  }
);

Input.displayName = "Input";
export default Input;