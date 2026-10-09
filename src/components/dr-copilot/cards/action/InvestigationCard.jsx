import { useState, useCallback } from "react"
import { tesseractIcon } from "../../ui/tesseractIcon"
import { CardShell } from "../CardShell"
import { CheckboxRow } from "../CheckboxRow"

import { FooterCTA } from "../FooterCTA"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const ClipboardTick = tesseractIcon("clipboard-tick")

export function InvestigationCard({
  data,
  onCopy,
  onPillTap,
}) {
  const [selected, setSelected] = useState(() => {
    const init = {}
    data.items.forEach((item) => {
      init[item.name] = _nullishCoalesce(item.selected, () => ( false))
    })
    return init
  })

  const handleToggle = useCallback(
    (name, checked) => {
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
        _optionalChain([navigator, 'access', _ => _.clipboard, 'optionalAccess', _2 => _2.writeText, 'call', _3 => _3(names.join("\n"))])
      }}
      copyAllTooltip={selectedCount > 0 ? `Fill ${selectedCount} selected to RxPad` : "Fill all to RxPad"}
      dataSources={["AI-Generated"]}

      sidebarLink={
        selectedCount > 0 ? (
          <FooterCTA
            label={`Fill selected to RxPad (${selectedCount})`}
            onClick={() => _optionalChain([onCopy, 'optionalCall', _4 => _4(data.copyPayload)])}
            tone="secondary"
            iconLeft={<ClipboardTick size={14} variant="Linear" />}
          />
        ) : (
          <FooterCTA
            label="Fill all to RxPad"
            onClick={() => _optionalChain([onCopy, 'optionalCall', _5 => _5(data.copyPayload)])}
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
          checked={_nullishCoalesce(selected[item.name], () => ( false))}
          onChange={(checked) => handleToggle(item.name, checked)}
          isLast={i === data.items.length - 1}
        />
      ))}
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
