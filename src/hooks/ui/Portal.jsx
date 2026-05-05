"use client";

/**
 * Portal — renders children into document.body. Replaces
 * @radix-ui/react-*.Portal. Renders synchronously on the client (no
 * mount-state gate) so consumer's useLayoutEffect sees a real DOM
 * node on first run. SSR-safe (returns null on the server pass).
 */

import * as React from "react";
import { createPortal } from "react-dom";

export function Portal({ children, container }) {
  if (typeof document === "undefined") return null;
  const target = container || document.body;
  if (!target) return null;
  return createPortal(children, target);
}

export default Portal;
