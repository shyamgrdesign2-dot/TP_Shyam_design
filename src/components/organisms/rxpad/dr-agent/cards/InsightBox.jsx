"use client";

import { cn } from "@/src/hooks/utils";








const VARIANT_STYLES = {
  red: "bg-tp-error-50 text-tp-error-700",
  amber: "bg-tp-warning-50 text-tp-warning-700",
  purple: "bg-tp-violet-50 text-tp-violet-700",
  teal: "bg-[#E8F6F6] text-[#0E7E7E]"
};

export function InsightBox({ children, variant, className }) {
  return (
    <div className={cn(
      "mt-1 rounded-[6px] px-2 py-[5px] text-[14px] leading-[1.6]",
      VARIANT_STYLES[variant],
      className
    )}>
      <strong className="mr-1">Insight:</strong>
      {children}
    </div>);

}