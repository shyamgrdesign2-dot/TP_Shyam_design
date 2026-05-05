"use client";

/**
 * Slot — clones a single React child element so a parent can inject
 * props (event handlers, ref, ARIA attrs) onto whatever the consumer
 * rendered. Replaces @radix-ui/react-slot.
 *
 * Usage:
 *   <Slot onClick={...} ref={...}>{children}</Slot>
 *   // children must be a single React element.
 *
 * Event handlers merge: parent handlers run AFTER child handlers, but
 * stop if the child called `e.preventDefault()`. Style and className
 * also merge (parent appends).
 */

import * as React from "react";

function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((r) => {
      if (!r) return;
      if (typeof r === "function") r(node);
      else r.current = node;
    });
  };
}

function chainHandler(parentHandler, childHandler) {
  if (!parentHandler) return childHandler;
  if (!childHandler) return parentHandler;
  return (event) => {
    childHandler(event);
    if (!event?.defaultPrevented) parentHandler(event);
  };
}

export const Slot = React.forwardRef(function Slot(
  { children, ...slotProps },
  forwardedRef,
) {
  if (!React.isValidElement(children)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Slot expects a single React element child.");
    }
    return null;
  }
  const childProps = children.props || {};
  const merged = { ...childProps };

  // Pull ref out of slotProps so it doesn't fall through the regular
  // prop loop (which would overwrite via the `slotValue !== undefined`
  // branch). All refs are merged below.
  const slotRef = slotProps.ref;

  for (const key of Object.keys(slotProps)) {
    if (key === "ref") continue;
    const slotValue = slotProps[key];
    const childValue = childProps[key];

    if (key === "style") {
      merged.style = { ...slotValue, ...childValue };
    } else if (key === "className") {
      merged.className = [slotValue, childValue].filter(Boolean).join(" ");
    } else if (/^on[A-Z]/.test(key)) {
      merged[key] = chainHandler(slotValue, childValue);
    } else if (slotValue !== undefined) {
      merged[key] = slotValue;
    }
  }

  // Always merge: forwardedRef (React.forwardRef parent), slotRef
  // (passed as a regular prop via Trigger handlers), and children.ref
  // (the consumer's own ref on the wrapped element). Any combination
  // present is composed.
  if (forwardedRef || slotRef || children.ref) {
    merged.ref = mergeRefs(forwardedRef, slotRef, children.ref);
  }

  return React.cloneElement(children, merged);
});

Slot.displayName = "Slot";
export default Slot;
