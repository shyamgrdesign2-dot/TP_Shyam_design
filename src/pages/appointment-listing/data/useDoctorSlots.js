import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { jwtDecode } from "jwt-decode";
import { getSlotsList, getTeleconsultSlotsList } from "../../addAppointment/service";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../../utils/constants";
import { findMatchingTeleSlot } from "./slotTeleMatch";

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

/* A doctor's published availability for a given day does not change while the
   user flicks between Day, Week and Month, but the previous implementation
   refetched every visible day on every switch and committed nothing until all
   of them had landed. A week cost 14 requests and a second of blank grid.
   The cache is keyed by doctor+day and lives for the page session; a booking
   bumps `version`, which drops it so the grid re-reads the truth. */
const slotCache = new Map();
let cacheVersion = 0;
const cacheKey = (doctorId, dateISO) => `${doctorId}|${dateISO}`;

/* Availability is stable, "has this time passed" is not, so it is re-derived
   every time a cached day is handed out rather than frozen at fetch time. */
const withFreshPast = (slots) =>
  slots.map((s) => ({
    ...s,
    isPast: moment(`${s.dateISO} ${s.start}`, "YYYY-MM-DD HH:mm:ss").isBefore(moment()),
  }));

async function loadDay(doctorId, dateISO) {
  const [clinicRes, teleRes] = await Promise.all([
    getSlotsList(doctorId, dateISO).catch(() => null),
    getTeleconsultSlotsList(doctorId, dateISO).catch(() => null),
  ]);
  const teleSlots = teleRes?.status ? teleRes.slots || [] : [];
  return (clinicRes?.status ? clinicRes.slots || [] : []).map((s) => {
    const teleMatch = findMatchingTeleSlot(s.start, teleSlots);
    return {
      ...normalizeSlot(s, dateISO),
      teleAvailable: Boolean(teleMatch),
      // Book tele against the real tele start when grids are offset by 1–2 min.
      teleStart: teleMatch?.start || null,
    };
  });
}

/**
 * Doctor availability for the calendar, via the same listSlots API the Add
 * Appointment flow uses. Fetches in-clinic AND teleconsultation availability
 * (pam_status_type_appointment=2) per visible day for the logged-in doctor,
 * merging tele availability onto the in-clinic grid as `teleAvailable`.
 * Slot statuses pass through untouched: available | confirmed | unavailable
 * | leave, so every edge the slot screen handles is representable here.
 *
 * Days already in the cache are returned on the first render, and the rest
 * are committed one at a time as they arrive, so the grid fills in column by
 * column instead of staying blank until the slowest request returns.
 * `pendingDates` is the set still in flight, which the grid shows as shimmer.
 */
export default function useDoctorSlots({ dateISOs, enabled = true, version = 0 }) {
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
      const hit = slotCache.get(cacheKey(doctorId, d));
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
          slots = await loadDay(doctorId, d);
        } catch {
          slots = [];
        }
        slotCache.set(cacheKey(doctorId, d), slots);
        if (mySeq !== seq.current) return;
        // Commit per day: a column stops shimmering the moment it has data.
        setSlotsByDate((prev) => ({ ...prev, [d]: slots }));
        setPendingDates((prev) => prev.filter((x) => x !== d));
      })
    );
  }, [datesKey, enabled]);

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
