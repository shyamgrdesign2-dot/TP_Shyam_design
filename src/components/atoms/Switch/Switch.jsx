"use client";

/**
 * Switch — Toggle switch atom.
 *
 * Hand-rolled (no Radix). Renders a <button role="switch"> + a hidden
 * checkbox for native form participation. Preserves the same data-state
 * and data-size attributes the SCSS module selects on, so styling is
 * unchanged.
 *
 * Props:
 *   checked / defaultChecked / onCheckedChange  (controlled or uncontrolled)
 *   disabled, required, name, value             (form integration)
 *   size: "sm" | "md"
 */

import * as React from "react";
import styles from "./Switch.module.scss";

export const Switch = React.forwardRef(function Switch(
  {
    size = "md",
    checked,
    defaultChecked,
    onCheckedChange,
    disabled,
    required,
    name,
    value = "on",
    className = "",
    style,
    onClick,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(Boolean(defaultChecked));
  const isOn = isControlled ? Boolean(checked) : internal;

  const toggle = React.useCallback(
    (e) => {
      if (disabled) return;
      const next = !isOn;
      if (!isControlled) setInternal(next);
      onCheckedChange?.(next, e);
    },
    [disabled, isOn, isControlled, onCheckedChange],
  );

  const handleClick = (e) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    toggle(e);
  };

  const handleKeyDown = (e) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle(e);
    }
  };

  const cls = [styles.root, className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-required={required || undefined}
      data-slot="switch"
      data-state={isOn ? "checked" : "unchecked"}
      data-size={size}
      data-disabled={disabled || undefined}
      disabled={disabled}
      ref={ref}
      className={cls}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}>
      <span className={styles.thumb} />
      {name ? (
        <input
          type="checkbox"
          aria-hidden="true"
          tabIndex={-1}
          name={name}
          value={value}
          checked={isOn}
          required={required}
          disabled={disabled}
          onChange={() => {}}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            margin: 0,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </button>
  );
});

Switch.displayName = "Switch";
export default Switch;
