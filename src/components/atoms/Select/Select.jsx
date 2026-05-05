"use client";

/**
 * Select — Native select wrapper with TP styling.
 *
 * For simple selects. Complex dropdowns should use the Radix-based
 * DropdownMenu molecule instead.
 */

import { forwardRef } from "react";

















const SIZE_MAP = {
  sm: { height: 36, fontSize: 12, px: 10 },
  md: { height: 42, fontSize: 14, px: 12 },
  lg: { height: 48, fontSize: 14, px: 16 }
};

export const Select = forwardRef(
  function Select(
  {
    size = "md",
    error = false,
    fullWidth = false,
    placeholder,
    className = "",
    style: styleProp,
    children,
    ...props
  },
  ref)
  {
    const dims = SIZE_MAP[size];

    const selectStyle = {
      height: dims.height,
      padding: `0 ${dims.px + 20}px 0 ${dims.px}px`,
      fontSize: dims.fontSize,
      fontFamily: "Inter, var(--font-sans), sans-serif",
      fontWeight: 400,
      lineHeight: 1.43,
      color: "var(--tp-slate-900, #171725)",
      backgroundColor: "var(--tp-slate-0, #FFFFFF)",
      border: `1px solid ${error ? "var(--tp-error-500, #E11D48)" : "var(--tp-slate-200, #E2E2EA)"}`,
      borderRadius: 8,
      outline: "none",
      cursor: "pointer",
      transition: "border-color 150ms ease, box-shadow 150ms ease",
      width: fullWidth ? "100%" : undefined,
      appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23717179' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: `right ${dims.px}px center`,
      backgroundSize: 16,
      ...styleProp
    };

    return (
      <select
        ref={ref}
        className={className}
        style={selectStyle}
        data-size={size}
        data-error={error || undefined}
        {...props}>
        
        {placeholder &&
        <option value="" disabled>
            {placeholder}
          </option>
        }
        {children}
      </select>);

  }
);

Select.displayName = "Select";
export default Select;