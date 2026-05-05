"use client";

/**
 * Slider — Range input atom with TP token styling.
 * Uses native <input type="range"> with CSS accent-color.
 */

export function Slider({
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  marks,
  valueLabelDisplay,
  color = "primary",
  className,
  style: styleProp,
}) {
  const accentColor = color === "error" ? "var(--tp-error-500)" :
    color === "success" ? "var(--tp-success-500)" :
    "var(--tp-blue-500)";

  return (
    <input
      type="range"
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={onChange ? (e) => onChange(e, Number(e.target.value)) : undefined}
      className={className}
      style={{
        width: "100%",
        accentColor,
        height: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        ...styleProp,
      }}
    />
  );
}

Slider.displayName = "Slider";
export default Slider;
