"use client";

/**
 * Accordion — Collapsible content sections molecule.
 * Styling: Accordion.module.scss (.trigger[data-state="open"] .chevron rotates the arrow).
 */

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { forwardRef } from "react";
import styles from "./Accordion.module.scss";


export const Accordion = AccordionPrimitive.Root;

/* ── Item ── */






export const AccordionItem = forwardRef(
  function AccordionItem({ className = "", style, ...props }, ref) {
    const cls = [styles.item, className].filter(Boolean).join(" ");
    return <AccordionPrimitive.Item ref={ref} className={cls} style={style} {...props} />;
  }
);

/* ── Trigger ── */






export const AccordionTrigger = forwardRef(
  function AccordionTrigger({ className = "", style, children, ...props }, ref) {
    const cls = [styles.trigger, className].filter(Boolean).join(" ");
    return (
      <AccordionPrimitive.Header style={{ margin: 0 }}>
        <AccordionPrimitive.Trigger ref={ref} className={cls} style={style} {...props}>
          {children}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={styles.chevron}
            aria-hidden>
            
            <path d="m6 9 6 6 6-6" />
          </svg>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>);

  }
);

/* ── Content ── */






export const AccordionContent = forwardRef(
  function AccordionContent({ className = "", style, children, ...props }, ref) {
    const cls = [styles.content, className].filter(Boolean).join(" ");
    return (
      <AccordionPrimitive.Content ref={ref} className={cls} style={style} {...props}>
        <div className={styles.contentInner}>{children}</div>
      </AccordionPrimitive.Content>);

  }
);

Accordion.displayName = "Accordion";
AccordionItem.displayName = "AccordionItem";
AccordionTrigger.displayName = "AccordionTrigger";
AccordionContent.displayName = "AccordionContent";