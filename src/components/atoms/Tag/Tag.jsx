"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/src/hooks/utils";

/**
 * TPTag — TP-branded multi-variant tag/label component.
 * 7 color schemes, 4 intensity variants.
 */





const colorVariantStyles = {
  blue: {
    light: "bg-tp-blue-50 text-tp-blue-700 border-tp-blue-100",
    medium: "bg-tp-blue-100 text-tp-blue-800 border-tp-blue-200",
    filled: "bg-tp-blue-500 text-white border-tp-blue-500",
    outline: "bg-transparent text-tp-blue-600 border-tp-blue-300"
  },
  violet: {
    light: "bg-tp-violet-50 text-tp-violet-700 border-tp-violet-100",
    medium: "bg-tp-violet-100 text-tp-violet-800 border-tp-violet-200",
    filled: "bg-tp-violet-500 text-white border-tp-violet-500",
    outline: "bg-transparent text-tp-violet-600 border-tp-violet-300"
  },
  amber: {
    light: "bg-tp-amber-50 text-tp-amber-700 border-tp-amber-100",
    medium: "bg-tp-amber-100 text-tp-amber-800 border-tp-amber-200",
    filled: "bg-tp-amber-500 text-white border-tp-amber-500",
    outline: "bg-transparent text-tp-amber-600 border-tp-amber-300"
  },
  success: {
    light: "bg-tp-success-50 text-tp-success-700 border-tp-success-100",
    medium: "bg-tp-success-100 text-tp-success-800 border-tp-success-200",
    filled: "bg-tp-success-500 text-white border-tp-success-500",
    outline: "bg-transparent text-tp-success-600 border-tp-success-300"
  },
  error: {
    light: "bg-tp-error-50 text-tp-error-700 border-tp-error-100",
    medium: "bg-tp-error-100 text-tp-error-800 border-tp-error-200",
    filled: "bg-tp-error-500 text-white border-tp-error-500",
    outline: "bg-transparent text-tp-error-600 border-tp-error-300"
  },
  warning: {
    light: "bg-tp-warning-50 text-tp-warning-700 border-tp-warning-100",
    medium: "bg-tp-warning-100 text-tp-warning-800 border-tp-warning-200",
    filled: "bg-tp-warning-500 text-white border-tp-warning-500",
    outline: "bg-transparent text-tp-warning-600 border-tp-warning-300"
  },
  slate: {
    light: "bg-tp-slate-50 text-tp-slate-700 border-tp-slate-100",
    medium: "bg-tp-slate-100 text-tp-slate-800 border-tp-slate-200",
    filled: "bg-tp-slate-600 text-white border-tp-slate-600",
    outline: "bg-transparent text-tp-slate-600 border-tp-slate-300"
  }
};

const sizeStyles = {
  sm: "h-5 px-1.5 text-[10px] gap-1",
  md: "h-6 px-2 text-xs gap-1.5",
  lg: "h-7 px-2.5 text-xs gap-1.5"
};











export function TPTag({
  children,
  color = "blue",
  variant = "light",
  size = "md",
  icon,
  onRemove,
  className
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        colorVariantStyles[color][variant],
        sizeStyles[size],
        className
      )}>
      
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
      {onRemove &&
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Remove">
        
          <X size={size === "sm" ? 12 : 14} />
        </button>
      }
    </span>);

}