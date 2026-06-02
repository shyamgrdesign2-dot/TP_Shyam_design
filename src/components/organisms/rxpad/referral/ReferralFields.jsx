"use client";

/**
 * ReferralFields — the shared referral input group.
 *
 * Used in two places so they stay consistent:
 *   • the "Referral" section of the RxPad form (VoiceRx / TypeRx)
 *   • the "Referral" tab in the blue sidebar (TabRx / handwriting flows)
 *
 * Layout: a single searchable Doctor combobox + the Referral date sit on one
 * line (they wrap to two lines automatically inside the narrow sidebar), with
 * Referral notes below. Specialty is shown as a tag inside the doctor options,
 * not as a separate field.
 *
 * Controlled: `value` is `{ doctorId, date, notes }`; `onChange` gets the next
 * value.
 */

import { DoctorSearchSelect } from "./DoctorSearchSelect";
import { EMPTY_REFERRAL } from "./referral-data";

const FIELD_CLASS =
  "h-[42px] w-full rounded-[10px] border border-tp-slate-300 bg-white px-3 py-2 text-[14px] font-['Inter',sans-serif] text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/20";

function FieldLabel({ children }) {
  return (
    <span className="text-[12px] font-medium font-['Inter',sans-serif] text-tp-slate-600">
      {children}
    </span>
  );
}

export function ReferralFields({ value = EMPTY_REFERRAL, onChange }) {
  const v = { ...EMPTY_REFERRAL, ...(value ?? {}) };
  const set = (patch) => onChange?.({ ...v, ...patch });

  return (
    <div className="flex flex-col gap-3">
      {/* Doctor + date — one line on wide layouts, stacks in the sidebar */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <FieldLabel>Doctor</FieldLabel>
          <DoctorSearchSelect
            value={v.doctorId}
            onChange={(doctorId) => set({ doctorId })}
          />
        </label>

        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <FieldLabel>Referral date</FieldLabel>
          <input
            type="date"
            value={v.date}
            data-empty={v.date ? "false" : "true"}
            onChange={(e) => set({ date: e.currentTarget.value })}
            // Open the native date picker on a click/focus anywhere in the
            // field, not only on the calendar icon.
            onClick={(e) => {
              try {
                e.currentTarget.showPicker?.();
              } catch {
                /* showPicker needs a user gesture; clicks qualify */
              }
            }}
            onFocus={(e) => {
              try {
                e.currentTarget.showPicker?.();
              } catch {
                /* noop */
              }
            }}
            className={`${FIELD_CLASS} tp-date-muted`}
            placeholder="Select referral date"
          />
        </label>
      </div>

      {/* Referral notes */}
      <label className="flex flex-col gap-1.5">
        <FieldLabel>Referral notes</FieldLabel>
        <textarea
          value={v.notes}
          onChange={(e) => set({ notes: e.currentTarget.value })}
          rows={3}
          className={`${FIELD_CLASS} h-auto resize-y`}
          placeholder="Reason for referral, clinical context, instructions…"
        />
      </label>
    </div>
  );
}

export default ReferralFields;
