import React from "react"
import { tesseractIcon } from "../../ui/tesseractIcon"

import { CardShell } from "../CardShell"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Calendar = tesseractIcon("calendar")
const People = tesseractIcon("people")
const TickCircle = tesseractIcon("tick-circle")
const Edit2 = tesseractIcon("edit2")
const Timer = tesseractIcon("timer")
const CloseCircle = tesseractIcon("close-circle")

const STAT_ICONS = {
  Queued: <People size={14} variant="Bulk" />,
  Finished: <TickCircle size={14} variant="Bulk" />,
  Drafts: <Edit2 size={14} variant="Bulk" />,
  Pending: <Timer size={14} variant="Bulk" />,
  Cancelled: <CloseCircle size={14} variant="Bulk" />,
  "P.Digitisation": <Timer size={14} variant="Bulk" />,
  "Follow-ups": <Calendar size={14} variant="Bulk" />,
}

export function WelcomeCard({ data, onPillTap }) {
  return (
    <CardShell
      icon={<Calendar size={14} variant="Bulk" />}
      title="Today's Clinic Overview"
      date={data.date}
    >
      {/* Clinic status line — non-repetitive, useful info */}
      {data.contextLine && (
        <p className="mb-[8px] text-[14px] text-tp-slate-500">
          {data.contextLine}
        </p>
      )}

      {/* Stats grid — 3 columns, neutral slate tones */}
      <div className="grid grid-cols-3 gap-[6px]">
        {data.stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => stat.tab && _optionalChain([onPillTap, 'optionalCall', _ => _(`Show ${stat.label.toLowerCase()}`)])}
            className="flex items-center gap-[6px] rounded-[8px] bg-tp-slate-50 px-[6px] py-[6px] text-left transition-colors hover:bg-tp-slate-100"
          >
            <div className="flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-[6px] bg-tp-slate-100 text-tp-slate-500">
              {_nullishCoalesce(STAT_ICONS[stat.label], () => ( <People size={14} variant="Bulk" />))}
            </div>
            <div className="min-w-0">
              <span className="block text-[14px] font-semibold leading-none text-tp-slate-700">
                {stat.value}
              </span>
              <span className="block text-[12px] font-medium leading-[1.4] text-tp-slate-400">
                {stat.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
