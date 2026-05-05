"use client";

/**
 * Card — Container molecule with TP token styling.
 * Styling: Card.module.scss (data-padding / data-hoverable selectors).
 */

import { forwardRef } from "react";
import styles from "./Card.module.scss";








export const Card = forwardRef(
  function Card(
  { padding = "md", hoverable = false, className = "", children, style: styleProp, ...props },
  ref)
  {
    const cls = [styles.card, className].filter(Boolean).join(" ");
    return (
      <div
        ref={ref}
        className={cls}
        style={styleProp}
        data-padding={padding}
        data-hoverable={hoverable || undefined}
        {...props}>
        
        {children}
      </div>);

  }
);

Card.displayName = "Card";

// ── Sub-components ──






export function CardHeader({ children, className = "", style, ...props }) {
  const cls = [styles.header, className].filter(Boolean).join(" ");
  return <div className={cls} style={style} {...props}>{children}</div>;
}






export function CardContent({ children, className = "", style, ...props }) {
  const cls = [styles.content, className].filter(Boolean).join(" ");
  return <div className={cls} style={style} {...props}>{children}</div>;
}






export function CardFooter({ children, className = "", style, ...props }) {
  const cls = [styles.footer, className].filter(Boolean).join(" ");
  return <div className={cls} style={style} {...props}>{children}</div>;
}

export default Card;