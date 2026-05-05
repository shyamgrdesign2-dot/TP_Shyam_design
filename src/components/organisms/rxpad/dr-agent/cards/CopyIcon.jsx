"use client";

import { useState } from "react";
import { Copy, CopySuccess } from "iconsax-reactjs";
import { cn } from "@/src/hooks/utils";









export function CopyIcon({ size = 14, onClick, className, copied = false }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {e.stopPropagation();onClick?.(e);}}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "flex-shrink-0 cursor-pointer transition-colors",
        copied ?
        "text-tp-success-600" :
        hovered ?
        "text-tp-blue-600" :
        "text-tp-blue-500",
        className
      )}>
      
      {copied ?
      <CopySuccess size={size} variant="Bulk" /> :

      <Copy size={size} variant={hovered ? "Bulk" : "Linear"} />
      }
    </button>);

}