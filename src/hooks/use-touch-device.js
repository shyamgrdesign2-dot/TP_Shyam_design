import * as React from "react";

/**
 * Detects whether the current device is a touch-only device (e.g. iPad, mobile).
 * Uses `(hover: none) and (pointer: coarse)` media query.
 * Returns `true` for touch-only devices, `false` for devices with hover support.
 */
export function useTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(hover: none) and (pointer: coarse)");
    const onChange = () => setIsTouch(mql.matches);
    mql.addEventListener("change", onChange);
    setIsTouch(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTouch;
}