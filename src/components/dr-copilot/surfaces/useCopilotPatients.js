import { useMemo } from "react";
import { useSelector } from "react-redux";

/**
 * Patient options for the Dr. Copilot patient selector.
 *
 * Built from the appointments already in the redux store, so the names are
 * the people actually in today's queue.
 *
 * There is deliberately no demo fallback. When the store is empty the list is
 * empty, and CopilotDock folds in the patient on screen by itself - an
 * invented name beside a real chart is worse than no list at all.
 */

function ageFromDob(dob) {
  if (!dob) return undefined;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : undefined;
}

function normaliseGender(raw) {
  const g = String(raw || "").trim().toUpperCase();
  if (g.startsWith("M")) return "M";
  if (g.startsWith("F")) return "F";
  return undefined;
}

export function useCopilotPatients() {
  const appointments = useSelector((state) =>
    state && state.records ? state.records.appointmentsData : null
  );

  return useMemo(() => {
    if (!Array.isArray(appointments) || appointments.length === 0) {
      return [];
    }

    const seen = new Set();
    const options = [];

    for (const row of appointments) {
      if (!row) continue;
      const label = row.pm_fullname || row.patient_name || row.pm_first_name;
      if (!label) continue;

      const id = String(row.patient_unique_id || row.pm_pid || row.pm_id || label);
      if (seen.has(id)) continue;
      seen.add(id);

      const gender = normaliseGender(row.pm_gender);
      const age = ageFromDob(row.dob);
      const meta = [gender && age != null ? `${gender}, ${age}y` : gender, row.slot || row.scheduled_time]
        .filter(Boolean)
        .join(" · ");

      options.push({
        id,
        label,
        meta: meta || undefined,
        kind: "patient",
        isToday: true,
        gender,
        age,
      });
    }

    return options;
  }, [appointments]);
}
