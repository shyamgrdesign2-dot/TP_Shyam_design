import { tesseractIcon } from "../../ui/tesseractIcon"
import { CardShell } from "../CardShell"
import { FooterCTA } from "../FooterCTA"
import { cn } from "../../../dr-agent/utils"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const NotificationBing = tesseractIcon("notification-bing")

const STATUS_BADGE = {
  given: { label: "Given", color: "#22C55E", bg: "#F0FDF4" },
  due: { label: "Due", color: "#F59E0B", bg: "#FFFBEB" },
  overdue: { label: "Overdue", color: "#DC2626", bg: "#FEE2E2" },
}

export function VaccinationScheduleCard({ data, onSidebarNav, onPillTap }) {
  const copyAll = () => {
    const text = data.vaccines
      .map(v => `${v.patientName} | ${v.name} (${v.dose}) | ${v.dueDate} [${v.status}]`)
      .join("\n")
    navigator.clipboard.writeText(text)
  }

  return (
    <CardShell
      icon={<span />}
      tpIconName="injection"
      title={data.title}
      badge={
        data.overdueCount > 0
          ? { label: `${data.overdueCount} overdue`, color: "#DC2626", bg: "#FEE2E2" }
          : undefined
      }
      copyAll={copyAll}
      sidebarLink={
        <FooterCTA
          label="Send reminder to all"
          onClick={() => _optionalChain([onPillTap, 'optionalCall', _ => _("Send reminder to all")])}
          tone="secondary"
          iconLeft={<NotificationBing size={14} variant="Linear" />}
        />
      }
    >
      {/* Summary chips */}
      <div className="flex items-center gap-[6px] mb-[8px]">
        {data.overdueCount > 0 && (
          <span className="rounded-full px-2 py-[1px] text-[12px] font-medium" style={{ color: "#DC2626", backgroundColor: "#FEE2E2" }}>
            {data.overdueCount} overdue
          </span>
        )}
        <span className="rounded-full px-2 py-[1px] text-[12px] font-medium" style={{ color: "#F59E0B", backgroundColor: "#FFFBEB" }}>
          {data.dueCount} due
        </span>
        {data.givenCount > 0 && (
          <span className="rounded-full px-2 py-[1px] text-[12px] font-medium" style={{ color: "#22C55E", backgroundColor: "#F0FDF4" }}>
            {data.givenCount} given
          </span>
        )}
      </div>

      {/* Patient-wise vaccine list */}
      <div className="space-y-[1px] overflow-hidden rounded-[8px] border-[1px] border-tp-slate-100">
        {data.vaccines.map((vax, i) => {
          const badge = _nullishCoalesce(STATUS_BADGE[vax.status], () => ( STATUS_BADGE.due))
          return (
            <div
              key={`${vax.patientName}-${vax.name}-${i}`}
              className={cn(
                "flex items-center justify-between px-[8px] py-[6px]",
                i % 2 === 0 ? "bg-white" : "bg-tp-slate-50",
              )}
            >
              {/* Left: Patient + Vaccine info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[14px] font-medium text-tp-slate-800 truncate">
                    {vax.patientName}
                  </span>
                  <span
                    className="shrink-0 rounded-[4px] px-1.5 py-[1px] text-[12px] font-medium"
                    style={{ color: badge.color, backgroundColor: badge.bg }}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-[14px] text-tp-slate-500 truncate mt-[1px]">
                  {vax.name} · {vax.dose} · {vax.dueDate}
                </p>
              </div>

              {/* Right: Action button */}
              {vax.status !== "given" ? (
                <button
                  className="shrink-0 ml-2 rounded-[6px] border-[1px] border-tp-blue-200 bg-white px-2 py-[2px] text-[14px] font-medium text-tp-blue-600 hover:bg-tp-blue-50 transition-colors"
                  onClick={() => _optionalChain([onPillTap, 'optionalCall', _2 => _2(`Remind ${vax.patientName} ${vax.name}`)])}
                >
                  Remind
                </button>
              ) : (
                <span className="shrink-0 ml-2 text-[14px] text-tp-green-500 font-medium">✓ Done</span>
              )}
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
