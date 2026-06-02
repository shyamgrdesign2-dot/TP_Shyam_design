"use client";

/**
 * ReferralPrintBlock — read-only renderer for a referral.
 *
 * Reused by the printable Rx document (VoiceRx / TypeRx), the TabRx
 * print/preview, and the past-visit Digital-Rx view. Accepts a RESOLVED
 * referral (`{ specialty, doctor, date, notes }`) and renders nothing when
 * empty.
 *
 * `format`:
 *   • "table"  — 3-column table: Doctor (specialty) | Referral Date | Notes
 *   • "inline" — single line: "Referral: Doctor (Specialty) (Referral Date: …
 *                | Referral Notes: …)" — heading + content on one line.
 *   • "list"   — "Referral" heading on its own line, then one bullet holding
 *                the doctor (specialty) (Referral Date: … | Referral Notes: …).
 */

import { ReferralIcon } from "./ReferralIcon";

function ReferralHeading() {
  return (
    <h3 className="flex items-center gap-[5px] text-[14px] font-semibold leading-[18px] text-tp-slate-900">
      <ReferralIcon size={14} color="var(--tp-slate-500)" variant="bulk" />
      Referred to
    </h3>
  );
}

/** Shared content spans: Doctor (Specialty) (Referral Date: … | Referral Notes: …). */
function ReferralLine({ r }) {
  const bracket = [
    r.date ? `Referral Date: ${r.date}` : null,
    r.notes ? `Referral Notes: ${r.notes}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
  return (
    <>
      {r.doctor ? <span className="font-medium text-tp-slate-900">{r.doctor}</span> : null}
      {r.specialty ? (
        <span className="text-tp-slate-500">{r.doctor ? " " : ""}({r.specialty})</span>
      ) : null}
      {bracket ? (
        <span className="text-tp-slate-500">{(r.doctor || r.specialty) ? " " : ""}({bracket})</span>
      ) : null}
    </>
  );
}

export function ReferralPrintBlock({ referral, className = "", format = "table" }) {
  const r = referral;
  if (!r || (!r.specialty && !r.doctor && !r.date && !r.notes)) return null;

  // ── Inline: heading + content on a single line ────────────────────────────
  if (format === "inline") {
    return (
      <section className={className}>
        <p className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px] text-[12px] leading-[16px] text-tp-slate-700">
          <span className="inline-flex items-center gap-[5px] font-semibold text-tp-slate-900">
            <ReferralIcon size={14} color="var(--tp-slate-500)" variant="bulk" />
            Referred to:
          </span>
          <span>
            <ReferralLine r={r} />
          </span>
        </p>
      </section>
    );
  }

  // ── List: heading on its own line, then one bullet ────────────────────────
  if (format === "list") {
    return (
      <section className={`flex flex-col gap-[4px] ${className}`}>
        <ReferralHeading />
        <ul className="m-0 flex list-disc flex-col gap-[4px] pl-[18px] marker:text-tp-slate-500">
          <li className="text-[12px] leading-[16px] text-tp-slate-700">
            <ReferralLine r={r} />
          </li>
        </ul>
      </section>
    );
  }

  // ── Table: Doctor (specialty) | Referral Date | Notes ─────────────────────
  return (
    <section className={`flex flex-col gap-[4px] ${className}`}>
      <ReferralHeading />
      <div className="overflow-hidden rounded-[6px] border border-tp-slate-200">
        <table className="w-full border-collapse text-[12px] leading-[16px]">
          <thead>
            <tr className="bg-tp-slate-50 text-tp-slate-500">
              <th className="px-[8px] py-[5px] text-left font-semibold">Doctor</th>
              <th className="px-[8px] py-[5px] text-left font-semibold">Referral Date</th>
              <th className="px-[8px] py-[5px] text-left font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-tp-slate-200 align-top text-tp-slate-700">
              <td className="px-[8px] py-[5px] w-[34%]">
                {r.doctor || r.specialty ? (
                  <div className="flex flex-col leading-[16px]">
                    {r.doctor ? (
                      <span className="font-medium text-tp-slate-900">{r.doctor}</span>
                    ) : null}
                    {r.specialty ? (
                      <span className="text-[11px] text-tp-slate-500">{r.specialty}</span>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-[8px] py-[5px] w-[22%] whitespace-nowrap">{r.date || "—"}</td>
              <td className="px-[8px] py-[5px]">{r.notes || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ReferralPrintBlock;
