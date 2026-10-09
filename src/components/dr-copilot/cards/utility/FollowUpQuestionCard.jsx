import { useState, useCallback } from "react"
import { tesseractIcon } from "../../ui/tesseractIcon"
import { CardShell } from "../CardShell"
import { CheckboxRow } from "../CheckboxRow"
import { RadioRow } from "../RadioRow"
import { FooterCTA } from "../FooterCTA"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const TickCircle = tesseractIcon("tick-circle")

export function FollowUpQuestionCard({
  data,
  onSubmit,
}) {
  const [selected, setSelected] = useState

(() => {
    const init = {}
    data.options.forEach((opt) => {
      init[opt] = false
    })
    return init
  })

  const handleCheckboxToggle = useCallback(
    (option, checked) => {
      setSelected((prev) => ({ ...prev, [option]: checked }))
    },
    []
  )

  const handleRadioSelect = useCallback(
    (option) => {
      setSelected(() => {
        const next = {}
        data.options.forEach((opt) => {
          next[opt] = opt === option
        })
        return next
      })
    },
    [data.options]
  )

  const selectedOptions = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k)

  return (
    <CardShell
      icon={<span />}
      tpIconName="Diagnosis"
      title={data.question}
      sidebarLink={
        <FooterCTA
          label={`Submit${selectedOptions.length > 0 ? ` (${selectedOptions.length})` : ""}`}
          onClick={() => _optionalChain([onSubmit, 'optionalCall', _ => _(selectedOptions)])}
          disabled={selectedOptions.length === 0}
          tone="secondary"
          iconLeft={<TickCircle size={14} variant="Bold" />}
        />
      }
    >
      {data.multiSelect
        ? data.options.map((option, i) => (
            <CheckboxRow
              key={option}
              label={option}
              checked={_nullishCoalesce(selected[option], () => ( false))}
              onChange={(checked) =>
                handleCheckboxToggle(option, checked)
              }
              isLast={i === data.options.length - 1}
            />
          ))
        : data.options.map((option, i) => (
            <RadioRow
              key={option}
              name="follow-up-question"
              label={option}
              checked={_nullishCoalesce(selected[option], () => ( false))}
              onChange={() => handleRadioSelect(option)}
              isLast={i === data.options.length - 1}
            />
          ))}
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
