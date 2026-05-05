"use client";

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/src/hooks/utils";






export const TPRxPadSearchInput = React.forwardRef(
  ({ className, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <Search
          size={16}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tp-slate-400" />
        
        <input
          ref={ref}
          {...props}
          className={cn(
            "h-[42px] w-full rounded-[10px] border border-tp-slate-300 bg-white pl-9 pr-3 text-[14px] font-['Inter',sans-serif] text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/20",
            className
          )} />
        
      </div>);

  }
);

TPRxPadSearchInput.displayName = "TPRxPadSearchInput";