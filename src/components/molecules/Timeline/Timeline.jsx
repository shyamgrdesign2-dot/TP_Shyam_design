"use client";

import * as React from "react";
import { cn } from "@/src/hooks/utils";

/**
 * TPTimeline — TP-branded activity timeline.
 * Vertical timeline with colored dots and connector lines.
 */



const dotColors = {
  blue: "bg-tp-blue-500",
  success: "bg-tp-success-500",
  error: "bg-tp-error-500",
  warning: "bg-tp-warning-500",
  slate: "bg-tp-slate-400",
  violet: "bg-tp-violet-500"
};














export function TPTimeline({ items, className }) {
  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item, idx) => {
        const color = item.color || "blue";
        const isLast = idx === items.length - 1;

        return (
          <div key={idx} className="flex gap-3">
            {/* Dot + line column */}
            <div className="flex flex-col items-center">
              {item.icon ?
              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                dotColors[color],
                "text-white"
              )}>
                  {item.icon}
                </div> :

              <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dotColors[color])} />
              }
              {!isLast &&
              <div className="mt-1 w-px flex-1 bg-tp-slate-200" style={{ minHeight: 20 }} />
              }
            </div>

            {/* Content */}
            <div className={cn("min-w-0 pb-6", isLast && "pb-0")}>
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-medium text-tp-slate-900">{item.title}</p>
                {item.timestamp &&
                <span className="shrink-0 text-xs text-tp-slate-400">
                    {item.timestamp}
                  </span>
                }
              </div>
              {item.description &&
              <p className="mt-0.5 text-sm text-tp-slate-500">{item.description}</p>
              }
            </div>
          </div>);

      })}
    </div>);

}