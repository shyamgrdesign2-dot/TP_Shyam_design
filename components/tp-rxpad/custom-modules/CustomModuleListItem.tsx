"use client"

import type { CustomModule } from "@/lib/customise-store"
import { ModuleIcon } from "./ModuleIcon"

interface CustomModuleListItemProps {
  module: CustomModule
  onAdd: () => void
  // Already-in-rxpad: hide CTA, show a passive "Added" pill instead.
  added: boolean
}

export function CustomModuleListItem({ module, onAdd, added }: CustomModuleListItemProps) {
  return (
    <div className="flex items-center gap-[12px] rounded-[12px] border border-tp-slate-200 bg-white px-[14px] py-[12px]">
      <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] bg-tp-violet-50">
        <ModuleIcon module={module} size={20} color="var(--tp-violet-500)" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-tp-slate-800">{module.name}</p>
        <p className="mt-[2px] truncate text-[12px] text-tp-slate-500">
          {module.fields.length} {module.fields.length === 1 ? "column" : "columns"}
          {": "}
          {module.fields.map((f) => f.label).join(", ")}
        </p>
      </div>
      {added ? (
        <span className="inline-flex h-[28px] items-center rounded-full bg-tp-success-50 px-[10px] text-[12px] font-semibold text-tp-success-600">
          On Rx Pad
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-[32px] items-center rounded-[8px] border border-tp-blue-300 bg-white px-[12px] text-[13px] font-semibold text-tp-blue-600 transition-colors hover:bg-tp-blue-50 active:scale-[0.98]"
        >
          + Add to Rx Pad
        </button>
      )}
    </div>
  )
}
