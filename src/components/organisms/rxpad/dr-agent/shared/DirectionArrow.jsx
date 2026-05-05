"use client";

/**
 * SVG arrow for trend direction indicators (lab comparison, KPIs).
 * - up   → red   (worsening / increasing when bad)
 * - down → green (improving / decreasing when good)
 * - stable → gray (no significant change)
 *
 * Semantically different from FlagArrow: this shows *direction of change*,
 * not whether a single value is abnormal.
 */
export function DirectionArrow({
  direction


}) {
  if (direction === "up")
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="inline-block text-tp-error-500">
      
        <path d="M5 2L8 6H2L5 2Z" fill="currentColor" />
      </svg>);

  if (direction === "down")
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="inline-block text-tp-success-600">
      
        <path d="M5 8L2 4H8L5 8Z" fill="currentColor" />
      </svg>);

  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="inline-block text-tp-slate-400">
      
      <path
        d="M2 5H8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round" />
      
    </svg>);

}