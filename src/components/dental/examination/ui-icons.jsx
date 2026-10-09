/**
 * Inline SVG icons for expand / minimize interactions.
 * Uses `currentColor` so the icon colour follows the parent's `color` CSS.
 */
export function ExpandIcon({ size = 16, color, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      style={{
        color,
        ...style,
      }}
    >
      <polyline
        points="160 48 208 48 208 96"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <line
        x1="152"
        y1="104"
        x2="208"
        y2="48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <polyline
        points="96 208 48 208 48 160"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <line
        x1="104"
        y1="152"
        x2="48"
        y2="208"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <polyline
        points="208 160 208 208 160 208"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <line
        x1="152"
        y1="152"
        x2="208"
        y2="208"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <polyline
        points="48 96 48 48 96 48"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <line
        x1="104"
        y1="104"
        x2="48"
        y2="48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
    </svg>
  );
}
export function MinimizeIcon({ size = 16, color }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      style={{
        color,
      }}
    >
      <polyline
        points="192 104 152 104 152 64"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <line
        x1="208"
        y1="48"
        x2="152"
        y2="104"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <polyline
        points="64 152 104 152 104 192"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <line
        x1="48"
        y1="208"
        x2="104"
        y2="152"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <polyline
        points="152 192 152 152 192 152"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <line
        x1="208"
        y1="208"
        x2="152"
        y2="152"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <polyline
        points="104 64 104 104 64 104"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />

      <line
        x1="48"
        y1="48"
        x2="104"
        y2="104"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
    </svg>
  );
}
