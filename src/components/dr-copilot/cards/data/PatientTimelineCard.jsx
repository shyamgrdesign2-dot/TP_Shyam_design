import { CardShell } from "../CardShell"
import { SidebarLink } from "../SidebarLink"

const TYPE_CONFIG = {
  visit: { color: "var(--tp-violet-500, #8B5CF6)", bg: "var(--tp-violet-50, #F5F3FF)" },
  lab: { color: "var(--tp-slate-500, #64748B)", bg: "var(--tp-slate-100, #F1F5F9)" },
  procedure: { color: "var(--tp-violet-600, #7C3AED)", bg: "var(--tp-violet-100, #EDE9FE)" },
  admission: { color: "var(--tp-error-500, #EF4444)", bg: "var(--tp-error-50, #FEF2F2)" },
}

export function PatientTimelineCard({ data, onSidebarNav }) {
  return (
    <CardShell
      icon={<span />}
      tpIconName="medical-record"
      title={data.title}
      sidebarLink={<SidebarLink text="View all records" onClick={() => _optionalChain([onSidebarNav, 'optionalCall', _ => _("pastVisits")])} />}
    >
      {/* Vertical timeline */}
      <div className="relative pl-[20px]">
        {/* Vertical line */}
        <div
          className="absolute left-[6px] top-[4px] bottom-[4px] w-[1px]"
          style={{ backgroundColor: "var(--tp-slate-200, #E2E8F0)" }}
        />

        {data.events.map((event, i) => {
          const cfg = _nullishCoalesce(TYPE_CONFIG[event.type], () => ( TYPE_CONFIG.visit))
          return (
            <div
              key={i}
              className="relative mb-[10px] last:mb-0"
            >
              {/* Dot */}
              <div
                className="absolute left-[-17px] top-[4px] h-[8px] w-[8px] rounded-full border-[1.5px]"
                style={{ borderColor: cfg.color, backgroundColor: cfg.bg }}
              />

              {/* Content */}
              <div className="flex items-start gap-[8px]">
                <span className="w-[60px] flex-shrink-0 text-[14px] text-tp-slate-400">{event.date}</span>
                <div className="flex-1">
                  <span
                    className="mr-[4px] rounded-[3px] px-1 py-[0.5px] text-[12px] font-medium"
                    style={{ color: cfg.color, backgroundColor: cfg.bg }}
                  >
                    {event.type}
                  </span>
                  <span className="text-[14px] leading-[1.6] text-tp-slate-700">{event.summary}</span>
                </div>
              </div>
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
