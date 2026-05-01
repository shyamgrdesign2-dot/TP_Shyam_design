"use client"

import { useState, useCallback } from "react"
import { safeClipboardWrite } from "@/lib/utils"
import { ClipboardTick } from "iconsax-reactjs"
import { CardShell } from "../CardShell"
import { CheckboxRow } from "../CheckboxRow"

import { FooterCTA } from "../FooterCTA"
import type { InvestigationItem } from "../../types"
import type { RxPadCopyPayload } from "@/components/tp-rxpad/rxpad-sync-context"

interface InvestigationCardProps {
  data: {
    title: string
    items: InvestigationItem[]
    copyPayload: RxPadCopyPayload
  }
  onCopy?: (payload: RxPadCopyPayload) => void
  onPillTap?: (label: string) => void
}

export function InvestigationCard({
  data,
  onCopy,
  onPillTap,
}: InvestigationCardProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    data.items.forEach((item) => {
      init[item.name] = item.selected ?? false
    })
    return init
  })

  const handleToggle = useCallback(
    (name: string, checked: boolean) => {
      setSelected((prev) => ({ ...prev, [name]: checked }))
    },
    []
  )

  const selectedCount = Object.values(selected).filter(Boolean).length
  const selectedNames = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k)

  return (
    <CardShell
      icon={<span />}
      tpIconName="Lab"
      title={`Investigations — ${data.title}`}
      copyAll={() => {
        // Copy only selected investigations (or all if none selected)
        const names = selectedCount > 0 ? selectedNames : data.items.map(i => i.name)
        safeClipboardWrite(names.join("\n"))
      }}
      copyAllTooltip={selectedCount > 0 ? `Fill ${selectedCount} selected to RxPad` : "Fill all to RxPad"}
      dataSources={["AI-Generated"]}

      sidebarLink={
        selectedCount > 0 ? (
          <FooterCTA
            label={`Fill selected to RxPad (${selectedCount})`}
            onClick={() => onCopy?.(data.copyPayload)}
            tone="secondary"
            iconLeft={<ClipboardTick size={14} variant="Linear" />}
          />
        ) : (
          <FooterCTA
            label="Fill all to RxPad"
            onClick={() => onCopy?.(data.copyPayload)}
            tone="secondary"
            iconLeft={<ClipboardTick size={14} variant="Linear" />}
          />
        )
      }
    >
      {data.items.map((item, i) => (
        <CheckboxRow
          key={item.name}
          label={item.name}
          rationale={item.rationale}
          checked={selected[item.name] ?? false}
          onChange={(checked) => handleToggle(item.name, checked)}
          isLast={i === data.items.length - 1}
        />
      ))}
    </CardShell>
  )
}
