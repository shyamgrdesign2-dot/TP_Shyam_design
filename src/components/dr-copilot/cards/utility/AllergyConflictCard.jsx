import { useState } from "react"
import { CardShell } from "../CardShell"
import { tesseractIcon } from "../../ui/tesseractIcon"

import { FooterCTA } from "../FooterCTA"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const ShieldTick = tesseractIcon("shield-tick")

export function AllergyConflictCard({
  data,
  onOverride,
}) {
  const [overridden, setOverridden] = useState(false)

  const handleOverride = () => {
    setOverridden(true)
    _optionalChain([onOverride, 'optionalCall', _ => _()])
  }

  return (
    <CardShell
      icon={<span />}
      tpIconName="first-aid"
      title="Allergy Conflict"
      badge={{ label: "Danger", color: "#DC2626", bg: "#FEE2E2" }}
      sidebarLink={
        <FooterCTA
          label={overridden ? "Override applied" : "Override - I accept the risk"}
          onClick={handleOverride}
          disabled={overridden}
          tone="secondary"
          iconLeft={<ShieldTick size={14} variant="Linear" />}
        />
      }
    >
      {/* Drug → Allergen */}
      <div className="mb-2 text-[14px] font-semibold text-tp-error-700">
        {data.drug} → {data.allergen}
      </div>

      {/* Contraindicated label */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className="inline-flex rounded-[4px] bg-tp-error-100 px-1.5 py-[2px] text-[12px] font-semibold text-tp-error-700">
          Contraindicated
        </span>
      </div>

      {/* Alternative suggestion */}
      <div className="mt-1 rounded-[6px] bg-tp-slate-50 px-2 py-[5px] text-[14px] leading-[1.55] text-tp-slate-600">
        <strong className="text-tp-slate-800">
          Alternative:
        </strong>{" "}
        {data.alternative}
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
