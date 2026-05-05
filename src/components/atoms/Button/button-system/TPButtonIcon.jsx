"use client";



/**
 * Wrapper to prevent icon layout breaks across CTAs, inputs, nav, etc.
 * Ensures flex-shrink-0 and consistent sizing.
 */
export function TPButtonIcon({
  children,
  size,
  className




}) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center [&_svg]:shrink-0 [&_svg]:stroke-current [&_svg]:fill-none ${className ?? ""}`}
      style={{ ...(size ? { width: size, height: size } : {}), color: "inherit" }}
      aria-hidden>
      
      {children}
    </span>);

}