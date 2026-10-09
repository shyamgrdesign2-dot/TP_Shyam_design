import { CardShell } from "../CardShell"
// InsightBox removed
import { ChatPillButton } from "../ActionRow"

export function FollowUpCard({ data, onSelect, onCopyToFollowUp }) {
  // Find recommended option for the insight box
  const recommended = data.options.find((o) => o.recommended)

  return (
    <CardShell
      icon={<span />}
      tpIconName="medical-record"
      title="Suggested Follow-Up"
      copyAll={
        recommended
          ? () => _optionalChain([onCopyToFollowUp, 'optionalCall', _ => _(recommended.days, recommended.label)])
          : undefined
      }
      copyAllTooltip="Fill follow-up to RxPad"
      dataSources={["AI-Generated"]}
    >
      {/* Context line */}
      <p className="mb-2 text-[14px] leading-[1.5] text-tp-slate-400">
        {data.context}
      </p>

      {/* Option pills */}
      <div className="flex flex-wrap gap-1.5">
        {data.options.map((option) => (
          <ChatPillButton
            key={option.days}
            label={option.label}
            onClick={() => _optionalChain([onSelect, 'optionalCall', _2 => _2(option.days)])}
          />
        ))}
      </div>

      {/* Insight removed — follow-up reasoning to be defined by backend logic */}
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
