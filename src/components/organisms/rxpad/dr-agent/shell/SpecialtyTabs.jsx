"use client";

import React from "react";
import { cn } from "@/src/hooks/utils";

import { SPECIALTY_TABS } from "../constants";

// -----------------------------------------------------------------
// SpecialtyTabs -- compact inline pill bar for specialty switching
// Designed to sit alongside the patient chip on the same row.
// -----------------------------------------------------------------








export function SpecialtyTabs({
  availableTabs,
  activeTab,
  onTabChange,
  className
}) {
  // Only render tabs present in availableTabs, preserving SPECIALTY_TABS order
  const visibleTabs = SPECIALTY_TABS.filter((t) => availableTabs.includes(t.id));

  return (
    <div className={cn("flex items-center gap-[3px]", className)}>
      {visibleTabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex h-[22px] flex-shrink-0 items-center rounded-full px-[8px] text-[12px] font-medium leading-[1] transition-colors duration-150",
              !isActive && "bg-tp-slate-100 text-tp-slate-600 hover:bg-tp-slate-200"
            )}
            style={
            isActive ?
            { backgroundColor: tab.accentColor, color: "#fff" } :
            undefined
            }>
            
            {tab.label}
          </button>);

      })}
    </div>);

}