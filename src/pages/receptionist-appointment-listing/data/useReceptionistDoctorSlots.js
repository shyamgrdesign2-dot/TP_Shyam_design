import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { listSlots, listTeleSlots } from "../../../api/services/receptionistAppointmentApi";

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

const slotCache = new Map();
let cacheVersion = 0;
const cacheKey = (doctorId, dateISO) => `${doctorId}|${dateISO}|dual`;

const withFreshPast = (slots) =>
  slots.map((s) => ({
    ...s,
    isPast: moment(`${s.dateISO} ${s.start}`, "YYYY-MM-DD HH:mm:ss").isBefore(moment()),
  }));

async function loadDay(doctorId, dateISO) {
  const [clinicRes, teleRes] = await Promise.all([
    listSlots(doctorId, dateISO).catch(() => null),
    listTeleSlots(doctorId, dateISO).catch(() => null),
  ]);

  const clinic = (clinicRes?.status ? clinicRes.slots || [] : []).map((s) => {
    const n = normalizeSlot(s, dateISO);
    return {
      ...n,
      bookMode: "in-clinic",
      chipId: `clinic-${s.start}`,
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

/**
 * Doctor availability for receptionist calendar — uses selected doctor id
 * and receptionist auth on slot API calls.
 */
export default function useReceptionistDoctorSlots({ doctorId, dateISOs, enabled = true, version = 0 }) {
  const [slotsByDate, setSlotsByDate] = useState({});
  const [pendingDates, setPendingDates] = useState([]);
  const seq = useRef(0);
  const datesKey = (dateISOs || []).join(",");

  const fetchAll = useCallback(async () => {
    const dates = datesKey ? datesKey.split(",") : [];
    if (!enabled || dates.length === 0 || !doctorId) {
      setSlotsByDate({});
      setPendingDates([]);
      return;
    }
    const mySeq = ++seq.current;

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
        setSlotsByDate((prev) => ({ ...prev, [d]: slots }));
        setPendingDates((prev) => prev.filter((x) => x !== d));
      })
    );
  }, [datesKey, enabled, doctorId]);

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
