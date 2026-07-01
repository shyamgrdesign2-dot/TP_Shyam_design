import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import styles from "./tooltip.module.scss";

const cx = (...classes) => classes.filter(Boolean).join(" ");
function TooltipProvider({ delayDuration = 0, ...props }) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props} />);


}
function Tooltip({ ...props }) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>);

}
function TooltipTrigger({ ...props }) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}
function TooltipContent({
  className,
  sideOffset = 4,
  arrowClassName,
  children,
  ...props
}) {
  // Default TP tooltip: white surface, no border, soft drop-shadow. The arrow
  // is an absolutely-positioned child, so we apply `filter: drop-shadow()` to the
  // *root* — that way the shadow traces the composite outline of body + arrow
  // without any seam. Consumers override the body via `className` and the arrow
  // tint via `arrowClassName`.
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cx("treatment-plan", styles.content, className)}
        {...props}>

        {children}
        <TooltipPrimitive.Arrow asChild={true}>
          <svg
            width={12}
            height={7}
            viewBox="0 0 12 7"
            aria-hidden={true}
            className={cx(styles.arrow, arrowClassName)}>

            <path
              d="M0 0H12L7.4 5.8C6.76 6.6 5.64 6.6 5 5.8L0 0Z"
              fill="currentColor" />

          </svg>
        </TooltipPrimitive.Arrow>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>);

}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
