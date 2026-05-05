"use client";

/**
 * Divider — Visual separator atom.
 */
















export function Divider({
  orientation = "horizontal",
  color = "var(--tp-slate-200, #E2E2EA)",
  spacing = 0,
  className,
  style: styleProp
}) {
  const isH = orientation === "horizontal";

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={className}
      style={{
        flexShrink: 0,
        backgroundColor: color,
        ...(isH ? {
          height: 1,
          width: "100%",
          marginTop: spacing,
          marginBottom: spacing
        } : {
          width: 1,
          alignSelf: "stretch",
          marginLeft: spacing,
          marginRight: spacing
        }),
        ...styleProp
      }} />);


}

Divider.displayName = "Divider";
export default Divider;