import { cn } from "../../dr-agent/utils"

export function CheckboxRow({ label, rationale, checked = false, accentColor = "var(--tp-blue-500)", onChange, isLast }) {
  return (
    <label className={cn(
      "flex cursor-pointer items-center gap-[8px] py-[6px] text-[14px]",
    )}
    style={!isLast ? { borderBottom: "0.5px solid var(--tp-slate-50, #F8FAFC)" } : undefined}
    >
      <button
        type="button"
        onClick={() => _optionalChain([onChange, 'optionalCall', _ => _(!checked)])}
        className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-all"
        style={{
          borderColor: checked ? accentColor : "#CBD5E1",
          backgroundColor: checked ? accentColor : "transparent",
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className="font-medium text-tp-slate-800">{label}</span>
      {rationale && (
        <span className="ml-auto text-[12px] text-tp-slate-400">{rationale}</span>
      )}
    </label>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
