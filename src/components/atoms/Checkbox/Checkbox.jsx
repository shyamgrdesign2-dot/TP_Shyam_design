"use client";

/**
 * Checkbox — Tri-state checkbox atom (checked / unchecked / indeterminate).
 *
 * Hand-rolled (no Radix). Renders a <button role="checkbox"> + a hidden
 * native checkbox for form participation. Preserves the data-state
 * attribute the SCSS module selects on, so styling is unchanged.
 *
 * Props:
 *   checked / defaultChecked / onCheckedChange   — controlled or uncontrolled.
 *                                                  `checked` may be a boolean
 *                                                  or the literal string
 *                                                  "indeterminate".
 *   disabled, required, name, value
 */

import * as React from "react";
import styles from "./Checkbox.module.scss";

const isIndeterminate = (v) => v === "indeterminate";

export const Checkbox = React.forwardRef(function Checkbox(
  {
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
  const current = isControlled ? checked : internal;
  const checkedBool = isIndeterminate(current) ? false : Boolean(current);
  const stateAttr = isIndeterminate(current)
    ? "indeterminate"
    : checkedBool
      ? "checked"
      : "unchecked";

  const toggle = React.useCallback(
    (e) => {
      if (disabled) return;
      const next = isIndeterminate(current) ? true : !checkedBool;
      if (!isControlled) setInternal(next);
      onCheckedChange?.(next, e);
    },
    [disabled, current, checkedBool, isControlled, onCheckedChange],
  );

  const handleClick = (e) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    toggle(e);
  };

  const handleKeyDown = (e) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === " ") {
      e.preventDefault();
      toggle(e);
    }
  };

  const cls = [styles.root, className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isIndeterminate(current) ? "mixed" : checkedBool}
      aria-required={required || undefined}
      data-slot="checkbox"
      data-state={stateAttr}
      data-disabled={disabled || undefined}
      disabled={disabled}
      ref={ref}
      className={cls}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}>
      {(checkedBool || isIndeterminate(current)) && (
        <span className={styles.indicator}>
          {isIndeterminate(current) ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6H9.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6L5 8.5L9.5 3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round" />
            </svg>
          )}
        </span>
      )}
      {name ? (
        <input
          type="checkbox"
          aria-hidden="true"
          tabIndex={-1}
          name={name}
          value={value}
          checked={checkedBool}
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

Checkbox.displayName = "Checkbox";
export default Checkbox;
