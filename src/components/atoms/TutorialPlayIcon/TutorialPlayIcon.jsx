"use client";

/**
 * TutorialPlayIcon — Custom concentric-circle play button icon
 * matching the Dr. Agent design system tutorial icon spec.
 *
 * Features:
 *   - Outer purple ring
 *   - Inner filled purple circle
 *   - White play triangle
 *
 * Default color: #8A4DBB
 */
export function TutorialPlayIcon({ size = 28, color = "#8A4DBB" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true">
      
      {/* Outer ring */}
      <circle
        cx="24"
        cy="24"
        r="21"
        stroke={color}
        strokeWidth="3.5"
        fill="none" />
      
      {/* Inner filled circle */}
      <circle
        cx="24"
        cy="24"
        r="15"
        fill={color} />
      
      {/* Play triangle */}
      <path
        d="M20.5 15L33 24L20.5 33V15Z"
        fill="white" />
      
    </svg>);

}