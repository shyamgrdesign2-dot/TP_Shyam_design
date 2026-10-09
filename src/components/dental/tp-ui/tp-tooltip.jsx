import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

export function TPTooltip({ title, children, arrow, placement, enterDelay, ...props }) {
  if (!title) return children;

  // Map MUI placements to Radix sides
  let side = "top";
  if (placement) {
    if (placement.startsWith("top")) side = "top";
    else if (placement.startsWith("bottom")) side = "bottom";
    else if (placement.startsWith("left")) side = "left";
    else if (placement.startsWith("right")) side = "right";
  }

  return (
    <Tooltip delayDuration={enterDelay ?? 0} {...props}>
      <TooltipTrigger asChild={true}>{children}</TooltipTrigger>
      <TooltipContent side={side}>
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

