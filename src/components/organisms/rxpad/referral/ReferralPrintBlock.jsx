"use client";

/**
 * ReferralPrintBlock — read-only renderer for a referral.
 *
 * Reused by the printable Rx document (VoiceRx / TypeRx), the TabRx
 * print/preview, and the past-visit Digital-Rx view. Accepts the id-based
 * referral value and resolves display labels itself. Renders nothing when the
 * referral is empty.
 */

import { ReferralIcon } from "./ReferralIcon";

/**
 * @param {object} referral - a RESOLVED referral `{ specialty, doctor,
 *   doctorMeta, date, notes }` (see `resolveReferral` in referral-data.js),
 *   or null/empty. Callers holding the id-based value should resolve first.
 */
export function ReferralPrintBlock({ referral, className = "" }) {
  const r = referral;
  if (!r || (!r.specialty && !r.doctor && !r.date && !r.notes)) return null;

  // In-line format: "Referral" heading, then a single line —
  //   Doctor name, specialty (referral date · notes)
  // The doctor + specialty read as the main piece; the date and notes sit in
  // the bracket, matching how the other Rx sections show their meta.
  const bracket = [r.date, r.notes].filter(Boolean).join(" · ");

  return (
    <section className={`flex flex-col gap-[2px] ${className}`}>
      <h3 className="flex items-center gap-[5px] text-[14px] font-semibold leading-[18px] text-tp-slate-900">
        <ReferralIcon size={14} color="var(--tp-slate-500)" variant="bulk" />
        Referral
      </h3>
      <p className="text-[12px] leading-[16px] text-tp-slate-700">
        {r.doctor ? (
          <span className="font-medium text-tp-slate-900">{r.doctor}</span>
        ) : null}
        {r.specialty ? (
          <span className="text-tp-slate-500">{r.doctor ? ", " : ""}{r.specialty}</span>
        ) : null}
        {bracket ? <span className="text-tp-slate-500">{(r.doctor || r.specialty) ? " " : ""}({bracket})</span> : null}
      </p>
    </section>
  );
}

export default ReferralPrintBlock;
