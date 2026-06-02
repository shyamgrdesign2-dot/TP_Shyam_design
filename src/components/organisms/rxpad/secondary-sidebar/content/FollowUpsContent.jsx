"use client";

/**
 * Follow-ups panel — date selection for the handwriting flows (TabRx etc.),
 * where there's no RxPad form. The chosen date is held in RxExtrasContext and
 * printed as a structured block beneath the handwritten pages.
 */

import { useRxExtras } from "@/src/components/organisms/rxpad/rx-extras-context";

const FIELD_CLASS =
  "h-[42px] w-full rounded-[10px] border border-tp-slate-300 bg-white px-3 py-2 text-[14px] font-['Inter',sans-serif] text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/20";

const PRESETS = [
  { label: "2 days", days: 2 },
  { label: "1 week", days: 7 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
];

function toISODate(d) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function FollowUpsContent() {
  const { followUpDate, setFollowUpDate } = useRxExtras();

  const setByOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(toISODate(d));
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium font-['Inter',sans-serif] text-tp-slate-600">
          Follow-up date
        </span>
        <input
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.currentTarget.value)}
          className={FIELD_CLASS}
          placeholder="Select follow-up date"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((q) => (
          <button
            key={q.label}
            type="button"
            className="rounded-lg border border-tp-blue-200 bg-tp-blue-50 px-3 py-1.5 text-[14px] font-medium font-['Inter',sans-serif] text-tp-blue-600 hover:bg-tp-blue-100"
            onClick={() => setByOffset(q.days)}
          >
            {q.label}
          </button>
        ))}
      </div>

      <p className="text-[12px] leading-[16px] text-tp-slate-500">
        This follow-up date appears on the printed prescription.
      </p>
    </div>
  );
}

export default FollowUpsContent;
