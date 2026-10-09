import moment from "moment";

/**
 * In-clinic and teleconsultation slot grids are generated independently.
 * Some clinics publish tele on :00/:05/:10… and in-clinic on :01/:06/:11…
 * Exact start-string equality then marks every clinic slot as tele-unavailable
 * even when a tele slot is open one minute away (TP-2771).
 *
 * Tolerance stays tight so we only bridge that config offset — not a different
 * quarter-hour.
 */
export const TELE_SLOT_MATCH_TOLERANCE_MIN = 2;

export function slotStartToMinutes(start) {
  const m = moment(String(start || "").trim(), ["HH:mm:ss", "H:mm:ss", "HH:mm"], true);
  return m.isValid() ? m.hours() * 60 + m.minutes() : null;
}

/**
 * Nearest available tele slot for a clinic (or seed) start time, or null.
 * @param {string} clinicStart — HH:mm:ss (or HH:mm)
 * @param {Array<{ start: string, status?: string }>} teleSlots
 */
export function findMatchingTeleSlot(
  clinicStart,
  teleSlots,
  { toleranceMin = TELE_SLOT_MATCH_TOLERANCE_MIN } = {}
) {
  const clinicMin = slotStartToMinutes(clinicStart);
  if (clinicMin == null) return null;

  let best = null;
  let bestDelta = Infinity;
  (teleSlots || []).forEach((t) => {
    if (t?.status && t.status !== "available") return;
    const teleMin = slotStartToMinutes(t.start);
    if (teleMin == null) return;
    const delta = Math.abs(teleMin - clinicMin);
    if (delta <= toleranceMin && delta < bestDelta) {
      best = t;
      bestDelta = delta;
    }
  });
  return best;
}

export function isTeleAvailableForClinicStart(clinicStart, teleSlots, opts) {
  return Boolean(findMatchingTeleSlot(clinicStart, teleSlots, opts));
}
