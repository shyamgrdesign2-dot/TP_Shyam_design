import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { jwtDecode } from "jwt-decode";
import { getSlotsList, getTeleconsultSlotsList } from "../../addAppointment/service";
import { getQueueDoctorSlots } from "../../chikitsalay/service";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../../utils/constants";

export function getLoggedInDoctorId() {
  try {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    return jwtDecode(token)?.result?.user_id ?? null;
  } catch {
    return null;
  }
}

const toMinutes = (t) => {
  const m = moment(String(t || "").trim(), ["HH:mm:ss", "H:mm:ss", "HH:mm"], true);
  return m.isValid() ? m.hours() * 60 + m.minutes() : null;
};

function normalizeSlot(slot, dateISO) {
  const startMin = toMinutes(slot.start);
  const endMin = toMinutes(slot.end);
  const increment = slot?.availability?.increment || (endMin != null && startMin != null ? endMin - startMin : 15);
  const isPast = moment(`${dateISO} ${slot.start}`, "YYYY-MM-DD HH:mm:ss").isBefore(moment());
  return {
    ...slot,
    dateISO,
    startMin,
    endMin: endMin ?? (startMin != null ? startMin + increment : null),
    increment,
    isPast,
    label12: startMin != null ? moment(slot.start, "HH:mm:ss").format("h:mm A") : "",
  };
}

/* Queue Management's slot shape ({slotStartTime, slotEndTime, scheduleId,
   counterId}) is unrelated to TP's ({start, end, availability.increment}) —
   this maps it into the same chip shape normalizeSlot() produces, so the
   calendar/grid never has to know which backend a chip came from.
   counterId/scheduleId are kept on the chip (not just used to compute it)
   because a booking must send the counterId of the selected slot verbatim,
   never re-derive or infer one. */
function normalizeQueueSlot(slot, dateISO) {
  const startMin = toMinutes(slot.slotStartTime);
  const endMin = toMinutes(slot.slotEndTime);
  const increment = endMin != null && startMin != null ? endMin - startMin : 15;
  const isPast = moment(`${dateISO} ${slot.slotStartTime}`, "YYYY-MM-DD HH:mm").isBefore(moment());
  return {
    ...slot,
    start: slot.slotStartTime,
    end: slot.slotEndTime,
    dateISO,
    startMin,
    endMin: endMin ?? (startMin != null ? startMin + increment : null),
    increment,
    isPast,
    label12: startMin != null ? moment(slot.slotStartTime, "HH:mm").format("h:mm A") : "",
  };
}

/* A doctor's published availability for a given day does not change while the
   user flicks between Day, Week and Month, but the previous implementation
   refetched every visible day on every switch and committed nothing until all
   of them had landed. A week cost 14 requests and a second of blank grid.
   The cache is keyed by doctor+day and lives for the page session; a booking
   bumps `version`, which drops it so the grid re-reads the truth. */
const slotCache = new Map();
let cacheVersion = 0;
// "queue" and "dual" shapes differ for the same doctor+date, so they need
// distinct cache keys rather than colliding when the flag flips.
const cacheKey = (doctorId, dateISO, isQueueManagementEnabled) =>
  `${doctorId}|${dateISO}|${isQueueManagementEnabled ? "queue" : "dual"}`;

/* Availability is stable, "has this time passed" is not, so it is re-derived
   every time a cached day is handed out rather than frozen at fetch time.
   TP slots carry HH:mm:ss, queue-management slots carry HH:mm — both
   formats are tried since a cached day can be either shape. */
const withFreshPast = (slots) =>
  slots.map((s) => ({
    ...s,
    isPast: moment(`${s.dateISO} ${s.start}`, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"]).isBefore(moment()),
  }));

/**
 * Clinic and tele grids are independent templates (often different increments).
 * Each API row becomes its own chip with `bookMode` so the calendar can paint
 * every tele 5‑min slot and every clinic 15‑min slot on the timeline — not
 * tele-as-a-flag on clinic rows.
 */
async function loadDay(doctorId, dateISO) {
  const [clinicRes, teleRes] = await Promise.all([
    getSlotsList(doctorId, dateISO).catch(() => null),
    getTeleconsultSlotsList(doctorId, dateISO).catch(() => null),
  ]);

  const clinic = (clinicRes?.status ? clinicRes.slots || [] : []).map((s) => {
    const n = normalizeSlot(s, dateISO);
    return {
      ...n,
      bookMode: "in-clinic",
      chipId: `clinic-${s.start}`,
      /* Kept for drawer / filters that still ask "can this time do tele?" */
      teleAvailable: false,
      teleStart: null,
    };
  });

  const tele = (teleRes?.status ? teleRes.slots || [] : []).map((s) => {
    const n = normalizeSlot(s, dateISO);
    return {
      ...n,
      bookMode: "teleconsult",
      chipId: `tele-${s.start}`,
      teleAvailable: true,
      teleStart: s.start,
    };
  });

  return [...clinic, ...tele];
}

async function loadQueueDay(doctorId, dateISO) {
  const [clinicRes, videoRes] = await Promise.all([
    getQueueDoctorSlots(doctorId, dateISO, 0).catch(() => null),
    getQueueDoctorSlots(doctorId, dateISO, 2).catch(() => null),
  ]);

  const mapQueueSlots = (res, bookMode, appointmentType) => {
    const slots = res?.status && res.status < 400 ? res.slots || [] : [];
    return slots.map((s) => {
      const n = normalizeQueueSlot(s, dateISO);
      return {
        ...n,
        bookMode,
        appointmentType,
        chipId: `queue-${bookMode}-${s.slotStartTime}-${s.counterId}`,
        teleAvailable: bookMode === "teleconsult",
        teleStart: bookMode === "teleconsult" ? s.slotStartTime : null,
      };
    });
  };

  return [
    ...mapQueueSlots(clinicRes, "in-clinic", 0),
    ...mapQueueSlots(videoRes, "teleconsult", 2),
  ];
}

/**
 * Doctor availability for the calendar, via the same listSlots APIs the Add
 * Appointment flow uses. Fetches in-clinic AND teleconsultation availability
 * (pam_status_type_appointment=2) per visible day and returns both as separate
 * chip rows (bookMode in-clinic | teleconsult).
 *
 * Days already in the cache are returned on the first render, and the rest
 * are committed one at a time as they arrive, so the grid fills in column by
 * column instead of staying blank until the slowest request returns.
 * `pendingDates` is the set still in flight, which the grid shows as shimmer.
 */
export default function useDoctorSlots({
  dateISOs,
  enabled = true,
  version = 0,
  isQueueManagementEnabled = false,
}) {
  const [slotsByDate, setSlotsByDate] = useState({});
  const [pendingDates, setPendingDates] = useState([]);
  const seq = useRef(0);
  const datesKey = (dateISOs || []).join(",");

  const fetchAll = useCallback(async () => {
    const dates = datesKey ? datesKey.split(",") : [];
    const doctorId = getLoggedInDoctorId();
    if (!enabled || dates.length === 0 || !doctorId) {
      setSlotsByDate({});
      setPendingDates([]);
      return;
    }
    const mySeq = ++seq.current;

    // Whatever is already known renders immediately; only the gaps are fetched.
    const seeded = {};
    const missing = [];
    dates.forEach((d) => {
      const hit = slotCache.get(cacheKey(doctorId, d, isQueueManagementEnabled));
      if (hit) seeded[d] = withFreshPast(hit);
      else missing.push(d);
    });
    setSlotsByDate(seeded);
    setPendingDates(missing);
    if (missing.length === 0) return;

    await Promise.all(
      missing.map(async (d) => {
        let slots = [];
        try {
          slots = isQueueManagementEnabled
            ? await loadQueueDay(doctorId, d)
            : await loadDay(doctorId, d);
        } catch {
          slots = [];
        }
        slotCache.set(cacheKey(doctorId, d, isQueueManagementEnabled), slots);
        if (mySeq !== seq.current) return;
        // Commit per day: a column stops shimmering the moment it has data.
        setSlotsByDate((prev) => ({ ...prev, [d]: slots }));
        setPendingDates((prev) => prev.filter((x) => x !== d));
      })
    );
  }, [datesKey, enabled, isQueueManagementEnabled]);

  // A booking or cancellation invalidates the cache before the refetch, so a
  // stale day can never be served back from it.
  useEffect(() => {
    if (version !== cacheVersion) {
      cacheVersion = version;
      slotCache.clear();
    }
    fetchAll();
  }, [fetchAll, version]);

  const refetch = useCallback(() => {
    slotCache.clear();
    return fetchAll();
  }, [fetchAll]);

  const pendingSet = useMemo(() => new Set(pendingDates), [pendingDates]);

  return { slotsByDate, loading: pendingDates.length > 0, pendingDates: pendingSet, refetch };
}
