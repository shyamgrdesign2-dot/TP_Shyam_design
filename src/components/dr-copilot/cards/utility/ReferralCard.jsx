import { CardShell } from "../CardShell"
import { SidebarLink } from "../SidebarLink"

export function ReferralCard({ data, onPillTap }) {
  const copyAll = () => {
    const text = data.items
      .map(r => `${r.doctorName} (${r.specialty}) · ${r.doctorPhone} · ${r.patientsReferred} patients · ${r.topReason}`)
      .join("\n")
    navigator.clipboard.writeText(text)
  }

  return (
    <CardShell
      icon={<span />}
      tpIconName="hospital"
      title={data.title}
      badge={
        { label: `${data.totalPatients} patients`, color: "#4B4AD5", bg: "#EEF2FF" }
      }
      copyAll={copyAll}
      sidebarLink={
        <SidebarLink
          text={`View all referrers (${data.totalReferrers})`}
          onClick={() => _optionalChain([onPillTap, 'optionalCall', _ => _("View all referrers")])}
        />
      }
    >
      {/* Referrer doctor summary */}
      <div className="space-y-[6px]">
        {data.items.map((item, i) => {
          return (
            <div
              key={`${item.doctorName}-${i}`}
              className="rounded-[8px] border-[1px] border-tp-slate-100 bg-white px-[8px] py-[6px]"
            >
              {/* Row 1: Doctor + specialty + action */}
              <div className="flex items-center justify-between mb-[3px]">
                <div className="flex items-center gap-[6px] min-w-0">
                  <span className="text-[14px] font-medium text-tp-slate-800 truncate">
                    {item.doctorName}
                  </span>
                  <span
                    className="shrink-0 rounded-[4px] px-1.5 py-[1px] text-[12px] font-medium"
                    style={{ color: "#4B4AD5", backgroundColor: "#EEF2FF" }}
                  >
                    {item.specialty}
                  </span>
                </div>
                <button
                  className="shrink-0 ml-2 rounded-[6px] border-[1px] border-tp-violet-200 bg-white px-2 py-[2px] text-[14px] font-medium text-tp-violet-600 hover:bg-tp-violet-50 transition-colors"
                  onClick={() => _optionalChain([onPillTap, 'optionalCall', _2 => _2(`Contact ${item.doctorName}`)])}
                >
                  Contact
                </button>
              </div>

              {/* Row 2: Phone + count */}
              <p className="text-[14px] text-tp-slate-600 truncate">
                {item.doctorPhone} · {item.patientsReferred} referred patient{item.patientsReferred > 1 ? "s" : ""}
              </p>

              {/* Row 3: Top reason */}
              <p className="text-[14px] text-tp-slate-400 truncate mt-[1px]">
                Top reason: {item.topReason}
              </p>
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
