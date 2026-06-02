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

  return (
    <section className={`flex flex-col gap-[2px] ${className}`}>
      <h3 className="flex items-center gap-[5px] text-[14px] font-semibold leading-[18px] text-tp-slate-900">
        <ReferralIcon size={14} color="var(--tp-slate-500)" variant="bulk" />
        Referral
      </h3>
      <div className="flex flex-col gap-[2px] text-[12px] leading-[16px] text-tp-slate-700">
        {r.doctor ? (
          <p>
            <span className="text-tp-slate-500">Referred to: </span>
            <span className="font-medium text-tp-slate-900">{r.doctor}</span>
            {r.specialty ? <span className="text-tp-slate-500"> ({r.specialty})</span> : null}
          </p>
        ) : r.specialty ? (
          <p>
            <span className="text-tp-slate-500">Specialty: </span>
            <span className="font-medium text-tp-slate-900">{r.specialty}</span>
          </p>
        ) : null}
        {r.doctorMeta ? <p className="text-tp-slate-500">{r.doctorMeta}</p> : null}
        {r.date ? (
          <p>
            <span className="text-tp-slate-500">Referral date: </span>
            {r.date}
          </p>
        ) : null}
        {r.notes ? (
          <p>
            <span className="text-tp-slate-500">Notes: </span>
            {r.notes}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default ReferralPrintBlock;
