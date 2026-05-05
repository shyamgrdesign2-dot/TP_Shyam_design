"use client";

import { cn } from "@/src/hooks/utils";










export function RadioRow({ name, label, detail, checked = false, onChange, isLast }) {
  return (
    <label className={cn(
      "flex cursor-pointer items-center gap-[5px] py-[3px] text-[14px]"
    )}
    style={!isLast ? { borderBottom: "0.5px solid var(--tp-slate-50, #F8FAFC)" } : undefined}>
      
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-[14px] w-[14px] flex-shrink-0"
        style={{ accentColor: "var(--tp-blue-500)" }} />
      
      <span className="font-medium text-tp-slate-800">{label}</span>
      {detail &&
      <span className="ml-auto text-[12px] text-tp-slate-400">{detail}</span>
      }
    </label>);

}