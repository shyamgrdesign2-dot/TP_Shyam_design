/* Stands in for next/link. The portal is a react-router app, and every Dr. Agent
 * use of Link is an in-card CTA rather than a route transition, so a plain
 * anchor preserves the markup and styling the source expects. */
import React from "react";

export default function Link({ href, children, ...rest }) {
  return (
    <a href={href || "#"} {...rest}>
      {children}
    </a>
  );
}
