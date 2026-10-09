import React from "react"
import { tesseractIcon } from "../../ui/tesseractIcon"
import { cn } from "../../../dr-agent/utils"
import { CardShell } from "../CardShell"
import { highlightDates } from "../../velora/highlightDates"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Flash = tesseractIcon("flash")
const TickCircle = tesseractIcon("tick-circle")
const CloseCircle = tesseractIcon("close-circle")
const InfoCircle = tesseractIcon("info-circle")
const Clock = tesseractIcon("clock")
const Activity = tesseractIcon("activity")

const TONE_TOKENS

 = {
  neutral: {
    badgeBg: "var(--tp-slate-100)",
    badgeText: "var(--tp-slate-700)",
    stripe: "bg-tp-slate-300",
  },
  critical: {
    badgeBg: "var(--tp-error-50)",
    badgeText: "var(--tp-error-700)",
    stripe: "bg-tp-error-500",
  },
  warning: {
    badgeBg: "var(--tp-warning-50)",
    badgeText: "var(--tp-warning-700)",
    stripe: "bg-tp-warning-500",
  },
  info: {
    badgeBg: "var(--tp-blue-50)",
    badgeText: "var(--tp-blue-700)",
    stripe: "bg-tp-blue-500",
  },
  success: {
    badgeBg: "var(--tp-success-50)",
    badgeText: "var(--tp-success-700)",
    stripe: "bg-tp-success-500",
  },
}

const STEP_TOKENS

 = {
  done: {
    icon: <TickCircle size={12} variant="Bold" />,
    pill: "text-tp-success-700",
    pillBg: "bg-tp-success-50",
    label: "Done",
  },
  missing: {
    icon: <CloseCircle size={12} variant="Bold" />,
    pill: "text-tp-error-700",
    pillBg: "bg-tp-error-50",
    label: "Missing",
  },
  overdue: {
    icon: <Clock size={12} variant="Bold" />,
    pill: "text-tp-error-700",
    pillBg: "bg-tp-error-50",
    label: "Overdue",
  },
  due: {
    icon: <Clock size={12} variant="Bold" />,
    pill: "text-tp-warning-700",
    pillBg: "bg-tp-warning-50",
    label: "Due",
  },
  pending: {
    icon: <Activity size={12} variant="Linear" />,
    pill: "text-tp-slate-500",
    pillBg: "bg-tp-slate-100",
    label: "Pending",
  },
  info: {
    icon: <InfoCircle size={12} variant="Bulk" />,
    pill: "text-tp-blue-700",
    pillBg: "bg-tp-blue-50",
    label: "Note",
  },
}

/** Plain textual section heading — sentence case, no background, no uppercase. */
function SectionBar({ label, trailing }) {
  return (
    <div className="flex items-center justify-between gap-[6px] px-[2px]">
      <span className="text-[12px] font-semibold text-tp-slate-800 leading-tight">
        {label}
      </span>
      {trailing}
    </div>
  )
}

function BulletSection({ section }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <SectionBar
        label={section.label}
        trailing={<span className="text-[11px] text-tp-slate-400">{section.items.length}</span>}
      />
      <ul className="flex flex-col gap-[4px]">
        {section.items.map((it, i) => {
          const tone = _nullishCoalesce(it.badgeTone, () => ( "neutral"))
          const t = TONE_TOKENS[tone]
          return (
            <li
              key={i}
              className="relative overflow-hidden rounded-[8px] bg-white px-[10px] py-[6px] pl-[11px]"
              style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
            >
              <span className={cn("absolute inset-y-0 left-0 w-[3px]", t.stripe)} aria-hidden />
              <div className="flex items-start gap-[6px]">
                <span className="flex-1 text-[13px] text-tp-slate-700 leading-[1.5]">
                  {highlightDates(it.text)}
                </span>
                {it.badge && (
                  <span
                    className="shrink-0 rounded-full px-[6px] py-[1px] text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: t.badgeBg, color: t.badgeText }}
                  >
                    {it.badge}
                  </span>
                )}
              </div>
              {it.meta && (
                <p className="mt-[2px] text-[11px] text-tp-slate-500 leading-tight">
                  {highlightDates(it.meta)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StepsSection({ section }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <SectionBar
        label={section.label}
        trailing={<span className="text-[11px] text-tp-slate-400">{section.steps.length}</span>}
      />
      <ol className="flex flex-col gap-[4px]">
        {section.steps.map((s, i) => {
          const state = _nullishCoalesce(s.state, () => ( "info"))
          const t = STEP_TOKENS[state]
          return (
            <li
              key={i}
              className="flex items-start gap-[8px] rounded-[8px] bg-white px-[10px] py-[6px]"
              style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
            >
              <span className={cn("mt-[2px] shrink-0", t.pill)} aria-hidden>
                {t.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-[6px]">
                  <span className="flex-1 text-[13px] text-tp-slate-700 leading-[1.5]">
                    {highlightDates(s.text)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-[6px] py-[1px] text-[10px] font-semibold uppercase tracking-wide",
                      t.pillBg,
                      t.pill,
                    )}
                  >
                    {t.label}
                  </span>
                </div>
                {s.meta && (
                  <p className="mt-[2px] text-[11px] text-tp-slate-500 leading-tight">
                    {highlightDates(s.meta)}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function KeyValuesSection({ section }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <SectionBar label={section.label} />
      <div
        className="overflow-hidden rounded-[8px]"
        style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
      >
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {section.rows.map((r, i) => {
              const isLast = i === section.rows.length - 1
              return (
                <tr
                  key={i}
                  style={!isLast ? { borderBottom: "0.5px solid var(--tp-slate-50, #F8FAFC)" } : undefined}
                >
                  <td className="px-[8px] py-[5px] text-tp-slate-600 leading-tight">{r.key}</td>
                  <td
                    className={cn(
                      "px-[8px] py-[5px] text-right leading-tight",
                      r.emphasize ? "font-semibold text-tp-slate-900" : "font-medium text-tp-slate-800",
                    )}
                  >
                    {highlightDates(r.value)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TableSection({ section }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <SectionBar label={section.label} />
      <div
        className="overflow-hidden rounded-[8px]"
        style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
      >
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-tp-slate-50">
              <th className="px-[8px] py-[4px] text-left text-[10px] font-semibold uppercase tracking-wide text-tp-slate-500">
                {section.columns[0]}
              </th>
              <th className="px-[8px] py-[4px] text-right text-[10px] font-semibold uppercase tracking-wide text-tp-slate-500">
                {section.columns[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((r, i) => {
              const isLast = i === section.rows.length - 1
              return (
                <tr
                  key={i}
                  style={!isLast ? { borderBottom: "0.5px solid var(--tp-slate-50, #F8FAFC)" } : undefined}
                >
                  <td className="px-[8px] py-[5px] text-tp-slate-600 leading-tight">{r[0]}</td>
                  <td className="px-[8px] py-[5px] text-right font-medium text-tp-slate-800 leading-tight">
                    {highlightDates(r[1])}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ComparisonSection({ section }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <SectionBar label={section.label} />
      <div
        className="grid grid-cols-2 overflow-hidden rounded-[8px]"
        style={{ border: "1px solid var(--tp-slate-100, #F1F1F5)" }}
      >
        <div style={{ borderRight: "0.5px solid var(--tp-slate-100, #F1F1F5)" }}>
          <div className="bg-tp-slate-50 px-[8px] py-[4px] text-[10px] font-semibold uppercase tracking-wide text-tp-slate-500">
            {section.labelA}
          </div>
          <ul className="flex flex-col gap-[2px] px-[8px] py-[6px]">
            {section.itemsA.map((it, i) => (
              <li key={i} className="text-[12px] text-tp-slate-700 leading-[1.5]">
                · {highlightDates(it)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="bg-tp-slate-50 px-[8px] py-[4px] text-[10px] font-semibold uppercase tracking-wide text-tp-slate-500">
            {section.labelB}
          </div>
          <ul className="flex flex-col gap-[2px] px-[8px] py-[6px]">
            {section.itemsB.map((it, i) => (
              <li key={i} className="text-[12px] text-tp-slate-700 leading-[1.5]">
                · {highlightDates(it)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function NarrativeSection({ section }) {
  return (
    <div className="flex flex-col gap-[6px]">
      {section.label && <SectionBar label={section.label} />}
      <div className="flex flex-col gap-[4px] px-[2px]">
        {section.paragraphs.map((p, i) => (
          <p key={i} className="text-[13px] text-tp-slate-700 leading-[1.6]">
            {highlightDates(p)}
          </p>
        ))}
      </div>
    </div>
  )
}

function HighlightSection({ section }) {
  const t = TONE_TOKENS[section.tone]
  return (
    <div
      className="rounded-[8px] px-[10px] py-[8px]"
      style={{
        background: t.badgeBg,
        color: t.badgeText,
        borderLeft: `3px solid`,
        borderLeftColor:
          section.tone === "critical"
            ? "var(--tp-error-500)"
            : section.tone === "warning"
              ? "var(--tp-warning-500)"
              : section.tone === "success"
                ? "var(--tp-success-500)"
                : "var(--tp-blue-500)",
      }}
    >
      {section.label && (
        <p className="mb-[2px] text-[10px] font-semibold uppercase tracking-[0.06em] opacity-80">
          {section.label}
        </p>
      )}
      <p className="text-[13px] leading-[1.5]">{highlightDates(section.text)}</p>
    </div>
  )
}

function SectionSwitch({ section }) {
  switch (section.kind) {
    case "bullets":
      return <BulletSection section={section} />
    case "steps":
      return <StepsSection section={section} />
    case "key_values":
      return <KeyValuesSection section={section} />
    case "table":
      return <TableSection section={section} />
    case "comparison":
      return <ComparisonSection section={section} />
    case "narrative":
      return <NarrativeSection section={section} />
    case "highlight":
      return <HighlightSection section={section} />
  }
}

export function VeloraScenarioCard({
  data,
  onPillTap,
}

) {
  const badgeTone = data.badge ? TONE_TOKENS[data.badge.tone] : null
  return (
    <CardShell
      icon={<Flash size={15} variant="Bulk" />}
      title={data.title}
      badge={
        data.badge && badgeTone
          ? { label: data.badge.label, bg: badgeTone.badgeBg, color: badgeTone.badgeText }
          : undefined
      }
      collapsible={false}
    >
      <div className="flex flex-col gap-[12px]">
        {data.subtitle && (
          <p className="text-[13px] text-tp-slate-600 leading-[1.5]">{highlightDates(data.subtitle)}</p>
        )}

        {data.sections.map((s, i) => (
          <SectionSwitch key={i} section={s} />
        ))}

        {data.source && (
          <p className="mt-[2px] text-[11px] text-tp-slate-400 leading-tight">
            Source · {data.source}
          </p>
        )}

        {data.actions && data.actions.length > 0 && (
          <div
            className="flex gap-[8px] pt-[8px]"
            style={{ borderTop: "0.5px solid var(--tp-slate-100, #F1F1F5)" }}
          >
            {data.actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => a.message && _optionalChain([onPillTap, 'optionalCall', _ => _(a.message)])}
                className={cn(
                  "inline-flex flex-1 items-center justify-center rounded-[10px] px-[12px] py-[8px] text-[13px] font-semibold transition-colors",
                  a.kind === "primary"
                    ? "bg-tp-blue-500 text-white hover:bg-tp-blue-600 shadow-[0_1px_2px_rgba(75,74,213,0.2)]"
                    : a.kind === "destructive"
                      ? "border-[1px] border-tp-slate-200 bg-white text-tp-slate-700 hover:bg-tp-slate-50"
                      : "border-[1px] border-tp-slate-200 bg-white text-tp-slate-700 hover:bg-tp-slate-50",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
