import React, { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import {
  Drawer,
  DrawerContent,
  Button,
  SegmentedControl,
  Dropdown,
  DatePicker,
  InputBox,
  Tabs,
  TabsList,
  TabsTrigger,
  Toast,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";

import ApiAppointments from "../../../api/services/ApiAppointments";
import * as ReceptionistApptApi from "../../../api/services/receptionistAppointmentApi";
import { addAppointment, bookTeleconsult, getSlotsList, getTeleconsultSlotsList } from "../../addAppointment/service";
import { bookQueueAppointment, rescheduleQueueAppointment, getQueueDoctorSlots } from "../../chikitsalay/service";
import { getLoggedInDoctorId } from "../data/useDoctorSlots";
import { findMatchingTeleSlot } from "../data/slotTeleMatch";
import AddPatientDrawer from "../../add-patient/AddPatientDrawer";
import styles from "./BookAppointmentDrawer.module.css";

// "Female" → "F" for the result line's primary differentiator.
const genderInitial = (g) => (g ? String(g).trim().charAt(0).toUpperCase() : "");

const toMin = (t) => {
  const m = moment(String(t || "").trim(), ["HH:mm:ss", "H:mm:ss", "HH:mm"], true);
  return m.isValid() ? m.hours() * 60 + m.minutes() : null;
};

// Day-part sections, same boundaries as the Add Appointment page.
/* One glyph per part of the day, each named with its CDN family so the six
   read as a progression from dark to light and back rather than the same
   cloud repeated four times. */
const DAY_PARTS = [
  { key: "MIDNIGHT", label: "Midnight", range: "12AM – 3AM", from: 0, to: 3, icon: "night-mode", iconFamily: "video" },
  { key: "EARLY_MORNING", label: "Early Morning", range: "3AM – 5AM", from: 3, to: 5, icon: "sun", iconFamily: "video" },
  { key: "MORNING", label: "Morning", range: "5AM – 12PM", from: 5, to: 12, icon: "sunrise", iconFamily: "nature" },
  { key: "AFTERNOON", label: "Afternoon", range: "12PM – 5PM", from: 12, to: 17, icon: "sun", iconFamily: "space2" },
  { key: "EVENING", label: "Evening", range: "5PM – 9PM", from: 17, to: 21, icon: "sunset-2", iconFamily: "booking" },
  { key: "NIGHT", label: "Night", range: "9PM – 12AM", from: 21, to: 24, icon: "cloudywithmoon", iconFamily: "nature" },
];

/* Consultation mode leads the drawer: it is the first real decision, and it
   filters the slots every field below depends on. Icons carry the meaning
   faster than the words do.

   Each mode names its glyph twice, because the icon library does not keep one
   name across cuts: the outline of a building is `building`, the filled one
   is `building-4`. Deriving the selected glyph from the unselected one would
   silently fetch a missing asset, so both are stated. */
const MODE_TABS = [
  {
    value: "in-clinic",
    label: "In-clinic",
    icon: { name: "building", family: "building", variant: "linear" },
    iconActive: { name: "building-4", family: "building", variant: "bulk" },
  },
  {
    value: "teleconsult",
    label: "Tele-Consultation",
    icon: { name: "video", family: "video-audio-image", variant: "linear" },
    iconActive: { name: "video", family: "video-audio-image", variant: "bulk" },
  },
];

const slotInPart = (slot, part) => {
  const hour = Math.floor((slot.startMin ?? 0) / 60);
  return hour >= part.from && hour < part.to;
};

/* The DS single-mode picker emits {mode, date, label}, not a bare Date, and
   the wrapper is truthy even when the date inside is null. */
const pickedDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v.date instanceof Date) return v.date;
  if (typeof v.date === "string") return new Date(v.date);
  return null;
};

/**
 * Tesseract-native replica of the Add Appointment confirm sidebar. Two entry
 * modes: with a preselected calendar `slot`, or slotless (e.g. Reschedule from
 * the table kebab) where the drawer itself offers Date + Time Slot pickers
 * fed by the same listSlots API. Books via POST /api/v1/appointment
 * (teleconsult bookings go through bookTeleconsult, appointment_type 2).
 */
export default function BookAppointmentDrawer({
  open,
  onOpenChange,
  slot,
  doctorName,
  onBooked,
  // Reschedule mode: prefill from the existing appointment; the drawer
  // moves it in place with one PUT. Mode, visit type, category and remarks
  // are locked — a move changes the slot, not those fields.
  initialPatient = null,
  initialCaseType = null,
  initialCategory = null,
  initialCategoryName = null,
  initialRemarks = "",
  initialDateISO = null,
  initialTime = null, // "HH:mm:ss" of the appointment being moved
  /* Where a dragged card was dropped. It seeds the pickers rather than
     replacing them: a drop is a proposal, and the doctor still confirms it
     in the same form they would have used from the row menu. */
  seedDateISO = null,
  seedStart = null,
  /* The appointment being moved. Present = the drawer moves it in place via
     PUT instead of booking a second one and cancelling the first. */
  rescheduleId = null,
  /* The mode the appointment (or the slot) is already in, so the switch opens
     on the answer rather than on "In-clinic" every time. */
  initialMode = "in-clinic",
  /* Calendar free-slot chips carry an explicit bookMode; locking keeps the
     doctor on the mode of the chip they tapped (clinic vs tele). */
  modeLocked = false,
  isReschedule = false,
  /** Override JWT doctor id (receptionist flow). */
  doctorId: doctorIdProp = null,
  /** Use receptionist auth on appointment API calls. */
  receptionistMode = false,
  isQueueManagementEnabled = false,
}) {
  const resolveDoctorId = () => {
    const raw = doctorIdProp ?? getLoggedInDoctorId();
    if (raw == null || raw === "") return raw;
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  };
  const fetchCaseTypes = () =>
    receptionistMode ? ReceptionistApptApi.getCaseTypes() : ApiAppointments.getCaseTypes();
  const fetchCategories = () =>
    receptionistMode ? ReceptionistApptApi.listCategories() : ApiAppointments.listCategories();
  const fetchSlots = (docId, date) =>
    receptionistMode ? ReceptionistApptApi.listSlots(docId, date) : getSlotsList(docId, date);
  const fetchTeleSlots = (docId, date) =>
    receptionistMode ? ReceptionistApptApi.listTeleSlots(docId, date) : getTeleconsultSlotsList(docId, date);
  const searchPatientsApi = (q) =>
    receptionistMode ? ReceptionistApptApi.searchPatients(q) : ApiAppointments.searchPatients(q, "");
  const rescheduleApi = (id, payload) =>
    receptionistMode
      ? ReceptionistApptApi.rescheduleAppointment(id, payload)
      : ApiAppointments.rescheduleAppointment(id, payload);
  const bookApi = (payload, isTele) =>
    receptionistMode
      ? isTele
        ? ReceptionistApptApi.bookTeleAppointment(payload)
        : ReceptionistApptApi.bookAppointment(payload)
      : isTele
      ? bookTeleconsult(payload)
      : addAppointment(payload);

  const [mode, setMode] = useState(initialMode);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState(null);
  const [caseTypes, setCaseTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [caseType, setCaseType] = useState(null);
  const [category, setCategory] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [booking, setBooking] = useState(false);
  const [teleSlotOk, setTeleSlotOk] = useState(true);
  const [teleMatchedStart, setTeleMatchedStart] = useState(null);
  const [toast, setToast] = useState(null);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  // Slotless mode: in-drawer date + time-slot selection.
  const [pickDate, setPickDate] = useState(null);
  const [pickStart, setPickStart] = useState(null);
  const [daySlots, setDaySlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [dayPart, setDayPart] = useState("MORNING");
  const searchSeq = useRef(0);
  const slotSeq = useRef(0);
  const searchInputRef = useRef(null);

  // Land the user straight in the patient field (no click needed); focusing
  // also opens the results panel with the Add New Patient action. Runs after
  // the Radix drawer's own focus management settles, and asserts the panel
  // state directly so the focus-trap race can't swallow it.
  useEffect(() => {
    if (open && !initialPatient) {
      const t = setTimeout(() => {
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }, 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, initialPatient]);

  const lockMode = isReschedule || modeLocked;
  const slotless = open && !slot;

  // Reset (or prefill, for reschedules) per opening.
  useEffect(() => {
    if (open) {
      /* A teleconsult appointment reopens on Tele-Consultation. Defaulting to
         In-clinic every time meant a video visit was silently re-booked as a
         clinic one unless the doctor noticed and switched back. */
      setMode(initialMode);
      setQuery("");
      setPatients([]);
      setPatient(initialPatient || null);
      setCaseType(initialCaseType != null && initialCaseType !== "" ? Number(initialCaseType) || initialCaseType : null);
      /* Category ids arrive as strings or numbers depending on the list API;
         the dropdown options use numeric pt_id. Coerce so "Derma" shows on
         reschedule instead of the empty placeholder. */
      setCategory(
        initialCategory != null && initialCategory !== ""
          ? Number(initialCategory) || initialCategory
          : null
      );
      setRemarks(initialRemarks || "");
      setTeleSlotOk(true);
      /* A reschedule opens on today with the appointment's own time already
         highlighted, so the common case (same time, moved to today) is a
         single confirm and any other choice is one click away. Arriving by
         drag lands on the slot the card was dropped on instead. */
      setPickDate(seedDateISO || moment().format("YYYY-MM-DD"));
      setPickStart(seedStart || null);
      setDaySlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefills only matter at open time
  }, [open, slot?.dateISO, slot?.start, seedDateISO, seedStart, initialMode]);

  // Visit types + categories (same sources as the legacy confirm form).
  useEffect(() => {
    if (!open) return;
    fetchCaseTypes()
      .then((res) => setCaseTypes(res?.status ? res.data?.case_type || [] : []))
      .catch(() => setCaseTypes([]));
    fetchCategories()
      .then((res) => {
        const list = res?.categories || res?.data?.categories || [];
        setCategories(list);
        /* Re-bind after options land: Dropdown only paints a label when the
           value exists in options, and the first paint often races the fetch. */
        if (initialCategory != null && initialCategory !== "") {
          const want = Number(initialCategory);
          const match = list.find(
            (c) => Number(c.pt_id) === want || String(c.pt_id) === String(initialCategory)
          );
          if (match) setCategory(match.pt_id);
        } else if (initialCategoryName) {
          const byName = list.find(
            (c) => String(c.pt_name || "").toLowerCase() === String(initialCategoryName).toLowerCase()
          );
          if (byName) setCategory(byName.pt_id);
        }
      })
      .catch(() => setCategories([]));
  }, [open, initialCategory, initialCategoryName]);

  /* Slotless mode: clinic and tele each contribute their own published
     timings (same dual-grid model as the calendar). The mode switch then
     shows the matching list — 5‑min tele chips when Tele is selected, etc. */
  useEffect(() => {
    if (!slotless || !pickDate) return;
    const doctorId = resolveDoctorId();
    const mySeq = ++slotSeq.current;
    setSlotsLoading(true);
    Promise.all([
      isQueueManagementEnabled && !receptionistMode
        ? getQueueDoctorSlots(doctorId, pickDate, 0).catch(() => null)
        : fetchSlots(doctorId, pickDate).catch(() => null),
      isQueueManagementEnabled && !receptionistMode
        ? getQueueDoctorSlots(doctorId, pickDate, 2).catch(() => null)
        : fetchTeleSlots(doctorId, pickDate).catch(() => null),
    ])
      .then(([clinicRes, teleRes]) => {
        if (mySeq !== slotSeq.current) return;
        const toChip = (s, bookMode) => {
          const startMin = toMin(s.start);
          const endMin = toMin(s.end);
          return {
            ...s,
            dateISO: pickDate,
            startMin,
            endMin: endMin ?? (startMin != null ? startMin + (s?.availability?.increment || 5) : null),
            increment: s?.availability?.increment || (startMin != null && endMin != null ? endMin - startMin : 15),
            bookMode,
            appointmentType: isQueueManagementEnabled ? (bookMode === "teleconsult" ? 2 : 0) : undefined,
            teleAvailable: bookMode === "teleconsult",
            teleStart: bookMode === "teleconsult" ? s.start : null,
            isPast: moment(`${pickDate} ${s.start}`, "YYYY-MM-DD HH:mm:ss").isBefore(moment()),
          };
        };
        const mapQueueRes = (res) =>
          (res?.status >= 200 && res.status < 300 ? res.slots || [] : []).map((s) => ({
            ...s,
            start: `${s.slotStartTime}:00`,
            end: `${s.slotEndTime}:00`,
            status: "available",
          }));
        const clinicSlots = isQueueManagementEnabled
          ? mapQueueRes(clinicRes)
          : clinicRes?.status
            ? clinicRes.slots || []
            : [];
        const teleSlots = isQueueManagementEnabled
          ? mapQueueRes(teleRes)
          : teleRes?.status
            ? teleRes.slots || []
            : [];
        const clinic = clinicSlots.map((s) => toChip(s, "in-clinic"));
        const tele = teleSlots.map((s) => toChip(s, "teleconsult"));
        const list = [...clinic, ...tele].map((s) => ({
          ...s,
          bookable: s.status === "available" && !s.isPast,
        }));
        setDaySlots(list);
        /* Keep the doctor's choice if it survives the new day; otherwise fall
           back to the appointment's own time, which is the one time we know
           suits both sides. Only then leave it unset. */
        let chosen = null;
        const openAt = (t) => list.some((s) => s.start === t && s.bookable);
        setPickStart((prev) => {
          if (openAt(prev)) chosen = prev;
          else if (initialTime && openAt(initialTime)) chosen = initialTime;
          return chosen;
        });
        /* Open on the part of the day the chosen slot lives in, so a card
           dropped at 6 PM lands on Evening with that chip already marked
           rather than on whichever part happened to have the first opening.
           With nothing chosen, fall back to the first part with room. */
        setDayPart((cur) => {
          const chosenSlot = chosen && list.find((s) => s.start === chosen && s.bookable);
          if (chosenSlot) {
            const owner = DAY_PARTS.find((p) => slotInPart(chosenSlot, p));
            if (owner) return owner.key;
          }
          const curPart = DAY_PARTS.find((p) => p.key === cur);
          /* Land on a part with something open, not merely a part with
             slots: every part has slots now. */
          if (curPart && list.some((s) => s.bookable && slotInPart(s, curPart))) return cur;
          return DAY_PARTS.find((p) => list.some((s) => s.bookable && slotInPart(s, p)))?.key || "MORNING";
        });
      })
      .finally(() => {
        if (mySeq === slotSeq.current) setSlotsLoading(false);
      });
  }, [slotless, pickDate, initialTime, isQueueManagementEnabled, receptionistMode, doctorIdProp]);

  const effectiveSlot = useMemo(() => {
    if (slot) return slot;
    if (!pickStart) return null;
    return (
      daySlots.find(
        (s) =>
          s.start === pickStart &&
          (s.bookMode === mode || (!s.bookMode && mode === "in-clinic"))
      ) || null
    );
  }, [slot, daySlots, pickStart, mode]);

  // Debounced patient search (500ms, like the legacy form).
  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (!q) {
      setPatients([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      const mySeq = ++searchSeq.current;
      setSearching(true);
      try {
        const res = await searchPatientsApi(q);
        if (mySeq === searchSeq.current) setPatients(res?.status ? res.data || [] : []);
      } catch {
        if (mySeq === searchSeq.current) setPatients([]);
      } finally {
        if (mySeq === searchSeq.current) setSearching(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [query, open]);

  // Edge case parity with the slot screen: a slot open for in-clinic is not
  // necessarily open for teleconsultation. Validate on mode switch, allowing
  // the 1–2 minute grid offset some clinics publish (TP-2771).
  useEffect(() => {
    let alive = true;
    if (!open || mode !== "teleconsult" || !effectiveSlot) return undefined;
    const doctorId = resolveDoctorId();
    const wantMin = toMin(effectiveSlot.teleStart || effectiveSlot.start);
    const validate =
      isQueueManagementEnabled && !receptionistMode
        ? getQueueDoctorSlots(doctorId, effectiveSlot.dateISO, 2).then((res) => {
            const slots = res?.status >= 200 && res.status < 300 ? res.slots || [] : [];
            return slots.find((s) => toMin(s.slotStartTime) === wantMin) || null;
          })
        : fetchTeleSlots(doctorId, effectiveSlot.dateISO).then((res) => {
            const teleSlots = res?.status ? res.slots || [] : [];
            return (
              (effectiveSlot.teleStart &&
                teleSlots.find((s) => s.start === effectiveSlot.teleStart && (!s.status || s.status === "available"))) ||
              findMatchingTeleSlot(effectiveSlot.start, teleSlots)
            );
          });
    validate
      .then((match) => {
        if (!alive) return;
        setTeleSlotOk(Boolean(match));
        setTeleMatchedStart((match?.start || match?.slotStartTime) ?? effectiveSlot.teleStart ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setTeleSlotOk(false);
        setTeleMatchedStart(null);
      });
    return () => {
      alive = false;
    };
  }, [mode, open, effectiveSlot, isQueueManagementEnabled, receptionistMode]);

  /* Where the appointment stands today. A reschedule is a move, and a move
     needs a "from" as much as a "to", so the drawer states it plainly rather
     than leaving the doctor to remember what they clicked. */
  const currentLine = useMemo(() => {
    if (!isReschedule || !initialDateISO) return null;
    const day = moment(initialDateISO, "YYYY-MM-DD", true);
    if (!day.isValid()) return null;
    const t = initialTime ? moment(initialTime, "HH:mm:ss", true) : null;
    return [t?.isValid() ? t.format("hh:mm A") : null, day.format("ddd, DD MMM YYYY")]
      .filter(Boolean)
      .join(" · ");
  }, [isReschedule, initialDateISO, initialTime]);

  const slotLine = useMemo(() => {
    if (!effectiveSlot) return null;
    const day = moment(effectiveSlot.dateISO, "YYYY-MM-DD");
    const isToday = day.isSame(moment(), "day");
    const time = moment(effectiveSlot.start, "HH:mm:ss").format("hh:mm A");
    return { time: `${time}${isToday ? " (Today)" : ""}`, date: day.format("Do MMM YYYY") };
  }, [effectiveSlot]);

  /* What is still missing, in the order the form asks for it. A dead grey
     button tells the doctor "no" without telling them why, which is the same
     dead end a disabled field is: the CTA stays live and answers instead. */
  const missing = () => {
    if (!effectiveSlot) return "Pick a time slot first.";
    if (isReschedule) {
      if (mode === "teleconsult" && !teleSlotOk)
        return "This slot is not open for teleconsultation. Pick another time.";
      return null;
    }
    if (!patient) return "Choose a patient, or add a new one, before booking.";
    if (!caseType) return "Pick a visit type so the appointment can be billed correctly.";
    if (mode === "teleconsult" && !teleSlotOk)
      return "This slot is not open for teleconsultation. Pick another time or switch to In-clinic.";
    return null;
  };
  const canBook = isReschedule
    ? !!(patient && effectiveSlot && (mode !== "teleconsult" || teleSlotOk))
    : !!(patient && caseType && effectiveSlot && (mode !== "teleconsult" || teleSlotOk));

  const book = async () => {
    if (booking) return;
    const gap = missing();
    if (gap) {
      setToast({ status: "warning", title: gap });
      return;
    }
    setBooking(true);
    try {
      const isTele = mode === "teleconsult";
      // Tele books against the matched tele grid start when clinic/tele
      // templates are offset by 1–2 minutes (TP-2771).
      const bookStartSrc = isTele
        ? teleMatchedStart || effectiveSlot.teleStart || effectiveSlot.start
        : effectiveSlot.start;
      const startM = moment(bookStartSrc, ["HH:mm:ss", "HH:mm"], true);
      const durationMin = effectiveSlot.increment || 5;
      const endM = startM.isValid()
        ? startM.clone().add(durationMin, "minutes")
        : moment(effectiveSlot.end, ["HH:mm:ss", "HH:mm"], true);

      let payload = {
        doctor_id: resolveDoctorId(),
        patient_unique_id: patient.patient_unique_id,
        pm_pid: patient.pm_pid,
        appointment_date: effectiveSlot.dateISO,
        appointment_start_time: startM.isValid() ? startM.format("HH:mm") : moment(effectiveSlot.start, "HH:mm:ss").format("HH:mm"),
        appointment_end_time: endM.isValid() ? endM.format("HH:mm") : moment(effectiveSlot.end, "HH:mm:ss").format("HH:mm"),
        appointment_duration: durationMin,
        toct_id: caseType,
      };
      if (category) payload.category_id = category;
      if (remarks.trim()) payload.appointment_remark = remarks.trim();

      /* Moving an existing appointment is an update, not a new booking. One
         PUT against its own id keeps the pam_id, the patient and the visit
         type intact. Visit type, category and remarks ride along so the
         backend does not drop them; the drawer locks those controls so a
         move cannot change them. Without pam_id there is nothing to PUT. */
      if (isReschedule) {
        if (!rescheduleId) {
          setToast({
            status: "error",
            title: "Could not move this appointment. It is missing an id, so try again from the list.",
          });
          return;
        }
        const movePayload = {
          doctor_id: payload.doctor_id,
          appointment_date: payload.appointment_date,
          appointment_start_time: payload.appointment_start_time,
          appointment_end_time: payload.appointment_end_time,
          appointment_duration: payload.appointment_duration,
        };
        if (payload.toct_id) movePayload.toct_id = payload.toct_id;
        if (payload.category_id) movePayload.category_id = payload.category_id;
        if (payload.appointment_remark) movePayload.appointment_remark = payload.appointment_remark;
        let res;
        if (isQueueManagementEnabled && !receptionistMode) {
          const queueRes = await rescheduleQueueAppointment({
            appointmentId: rescheduleId,
            doctorId: payload.doctor_id,
            date: effectiveSlot.dateISO,
            slotStartTime: effectiveSlot.slotStartTime,
            counterId: effectiveSlot.counterId,
            appointment_type: effectiveSlot.appointmentType,
          });
          const isSuccess = queueRes?.status >= 200 && queueRes.status < 300;
          res = { status: isSuccess, message: queueRes?.message };
        } else {
          res = await rescheduleApi(rescheduleId, movePayload);
        }
        if (res?.status === false) {
          setToast({
            status: "error",
            title: res?.message || "Could not move the appointment. Please try again.",
          });
          return;
        }
        setToast({
          status: "success",
          title: `${patient.pm_fullname || "The"} appointment moved to ${moment(
            effectiveSlot.start,
            "HH:mm:ss"
          ).format("hh:mm A")}, ${moment(effectiveSlot.dateISO, "YYYY-MM-DD").format("DD MMM")}.`,
        });
        onOpenChange(false);
        onBooked?.({ moved: true });
        return;
      }

      if (isTele) payload = { ...payload, patient_unique_id: String(payload.patient_unique_id) };
      let res;
      if (isQueueManagementEnabled && !receptionistMode) {
        const queueRes = await bookQueueAppointment({
          doctorId: payload.doctor_id,
          patient_unique_id: Number(payload.patient_unique_id),
          pm_pid: payload.pm_pid,
          date: effectiveSlot.dateISO,
          slotStartTime: effectiveSlot.slotStartTime,
          counterId: effectiveSlot.counterId,
          appointment_type: effectiveSlot.appointmentType,
          toct_id: payload.toct_id,
          category_id: payload.category_id,
          appointment_remark: payload.appointment_remark,
        });
        const isSuccess = queueRes?.status >= 200 && queueRes.status < 300;
        res = { status: isSuccess, message: queueRes?.message };
      } else {
        res = await bookApi(payload, isTele);
      }
      if (res?.status) {
        setToast({ status: "success", title: `${patient.pm_fullname || "Patient"}'s appointment booked successfully!` });
        onOpenChange(false);
        onBooked?.();
      } else {
        setToast({ status: "error", title: res?.message || "Could not book the appointment. Please try again." });
      }
    } catch (err) {
      /* A thrown request (network down, gateway error) used to end with the
         spinner stopping and nothing said, so the doctor could not tell a
         failed booking from a slow one. It is now always one of the two. */
      setToast({
        status: "error",
        title:
          err?.response?.data?.message ||
          (isReschedule
            ? "Could not reach the server. The appointment was not moved, so try again in a moment."
            : "Could not reach the server. The appointment was not booked, so try again in a moment."),
      });
    } finally {
      setBooking(false);
    }
  };

  const isTeleMode = mode === "teleconsult";
  /* The mode glyph and word, used both in the title and in the summary band
     once the mode is fixed. In-clinic wears the hospital glyph the calendar
     chips use, so the two surfaces name the same thing the same way. */
  const modeIcon = isTeleMode
    ? { name: "video", family: "video-audio-image", variant: "bulk" }
    : { name: "hospital", family: "building", variant: "bulk" };
  const modeWord = isTeleMode ? "Teleconsultation" : "In-clinic";
  /* When the slot fixes the mode, the heading names it: "Book In-clinic
     Appointment" / "Book Teleconsultation Appointment". No glyph beside it,
     the words carry the mode. */
  const drawerTitle = isReschedule
    ? "Reschedule Appointment"
    : modeLocked
    ? `Book ${modeWord} Appointment`
    : "Book Appointment";

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          side="right"
          width="min(900px, max(560px, 60vw))"
          /* The title names the task, the button names the commit. They were
             the other way round: a drawer headed "Confirm Appointment" with a
             "Book Appointment" button asks the doctor to confirm something
             before they have chosen it, and buries the irreversible step
             under the softest word on screen. */
          title={drawerTitle}
          action={
            <Button
              className={styles.bookCta}
              variant="solid"
              theme="primary"
              size="md"
              loading={booking}
              /* Live even when incomplete: pressing it names the one thing
                 that is missing rather than doing nothing. */
              data-incomplete={!canBook || undefined}
              onClick={book}
            >
              {isReschedule ? "Confirm Reschedule" : "Confirm Booking"}
            </Button>
          }
        >
          <div className={styles.form}>
            {/* The mode is a control only while it is still open. A picked slot
                (or a reschedule) fixes it, so the switch comes out and the mode
                is stated in the title and the summary band instead. When it is
                still a choice it stays a segmented control, not tabs: it
                switches a mode within one form, it does not navigate. */}
            {!lockMode && (
              <SegmentedControl
                className={styles.modeSwitch}
                size="md"
                variant="block"
                fullWidth
                value={mode}
                onValueChange={setMode}
                options={MODE_TABS.map((m) => ({
                  value: m.value,
                  label: m.label,
                  /* Filled when chosen, outlined when not: the mode you are in
                     reads at a glance without comparing two labels. */
                  icon: (() => {
                    const g = mode === m.value ? m.iconActive : m.icon;
                    return <TPLibraryIcon name={g.name} family={g.family} variant={g.variant} size={18} />;
                  })(),
                  disabled:
                    !slotless && m.value === "teleconsult" && effectiveSlot?.teleAvailable === false,
                }))}
              />
            )}
            {isReschedule && (
              <p className={styles.fieldHint}>
                Mode, visit type, category and remarks stay with this appointment. This
                drawer only moves the slot.
              </p>
            )}
            {!slotless && !modeLocked && effectiveSlot?.teleAvailable === false && (
              <p className={styles.fieldWarning}>
                <TPLibraryIcon name="info-circle" size={14} color="var(--tesseract-warning-600)" />
                Tele-Consultation is off for this slot: it is open for in-clinic visits only.
              </p>
            )}
            {!slotless && !modeLocked && mode === "teleconsult" && !teleSlotOk && (
              <p className={styles.fieldWarning}>
                <TPLibraryIcon name="info-circle" size={14} color="var(--tesseract-warning-600)" />
                This slot is not open for teleconsultation. Pick another slot or switch back to in-clinic.
              </p>
            )}
            {/* Context band, not a form field: it runs the full width of the
                drawer with square corners so it reads as part of the header
                rather than as the first thing to fill in. */}
            <div className={styles.summaryBand}>
              <div className={styles.summaryRow}>
                <TPLibraryIcon name="stethoscope" variant="bulk" family="health" size={18} color="var(--tesseract-slate-500)" />
                <span className={styles.summaryText}>{doctorName || "Doctor"}</span>
              </div>
              {isReschedule ? (
                currentLine && (
                  <div className={styles.summaryRow}>
                    <TPLibraryIcon name="clock" variant="bulk" size={18} color="var(--tesseract-slate-500)" />
                    <span className={styles.summaryLabel}>Currently booked for</span>
                    <span className={styles.summaryText}>{currentLine}</span>
                  </div>
                )
              ) : (
                (!slotless || effectiveSlot) &&
                slotLine && (
                  <div className={styles.summaryRow}>
                    <TPLibraryIcon name="clock" variant="bulk" size={18} color="var(--tesseract-slate-500)" />
                    {/* The mode rides on this same row as one more divider-parted
                        fact, rather than a line of its own: time, date, then how
                        the visit happens. */}
                    <span className={styles.summaryText}>
                      {slotLine.time}
                      <span className={styles.summaryDivider}>|</span>
                      {slotLine.date}
                      {lockMode && (
                        <>
                          <span className={styles.summaryDivider}>|</span>
                          <TPLibraryIcon
                            name={modeIcon.name}
                            variant={modeIcon.variant}
                            family={modeIcon.family}
                            size={15}
                            color="var(--tesseract-slate-500)"
                            style={{ verticalAlign: "-3px", marginRight: 4 }}
                          />
                          {modeWord}
                        </>
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
            {slotless && (
              /* The date and the slot are one answer asked in two controls,
                 so they sit under one heading inside one shell. Two headings
                 stacked made them read as unrelated questions and left the
                 picker looking like an afterthought under the date. */
              <div className={styles.field}>
                <p className={styles.fieldLabel}>
                  {isReschedule ? "New date & time slot" : "Date & time slot"}{" "}
                  <span className={styles.required}>*</span>
                </p>
                <div className={styles.whenGroup}>
                  <DatePicker
                    mode="single"
                    size="md"
                    fullWidth
                    commitMode="apply"
                    showFooter
                    value={pickDate ? moment(pickDate, "YYYY-MM-DD").toDate() : null}
                    onChange={(v) => {
                      const d = pickedDate(v);
                      if (d) setPickDate(moment(d).format("YYYY-MM-DD"));
                    }}
                    // A slot in the past can never be booked, and the clinic's
                    // published schedule does not run beyond a quarter out.
                    minDate={moment().startOf("day").toDate()}
                    maxDate={moment().add(90, "days").toDate()}
                    formatDate={(d) => {
                      const m = moment(d);
                      const rel = m.isSame(moment(), "day")
                        ? "Today"
                        : m.isSame(moment().add(1, "day"), "day")
                        ? "Tomorrow"
                        : m.format("ddd");
                      return `${rel}, ${m.format("DD MMM YYYY")}`;
                    }}
                    placeholder="Select a date"
                  />

                  {/* Day parts read as sections of one day, so they get the
                      same underline tab bar the page uses for its own
                      sections rather than a second, unrelated chip
                      language. */}
                  {(() => {
                    /* Show each mode's own published list. Tele is no longer
                       a flag on clinic rows — dual grids — so filter by
                       bookMode. */
                    const visible =
                      mode === "teleconsult"
                        ? daySlots.filter((s) => s.bookMode === "teleconsult")
                        : daySlots.filter((s) => s.bookMode !== "teleconsult");
                    const part = DAY_PARTS.find((p) => p.key === dayPart) || DAY_PARTS[2];
                    const list = visible.filter((s) => slotInPart(s, part));
                    const openHere = list.filter((s) => s.bookable).length;
                    const openToday = visible.filter((s) => s.bookable).length;
                    const teleWord = mode === "teleconsult" ? "teleconsultation " : "";
                    return (
                      <div className={styles.slotPicker}>
                        {/* The design system's tab bar, same as the page's:
                            the open-slot count rides along as its tag and a
                            part with nothing open is disabled outright. */}
                        <Tabs
                          value={dayPart}
                          onValueChange={setDayPart}
                          size="sm"
                          className={styles.partTabs}
                        >
                          <TabsList>
                            {DAY_PARTS.map((p) => {
                              /* The badge counts what can be booked, which is
                                 the only number worth a glance; a part with
                                 slots but none open is still a dead end. */
                              const count = visible.filter((s) => s.bookable && slotInPart(s, p)).length;
                              return (
                                <TabsTrigger
                                  key={p.key}
                                  value={p.key}
                                  disabled={count === 0}
                                  /* All six stay on the linear cut. The design
                                     system clones the active trigger's icon
                                     with variant="bulk", which swapped the
                                     chosen part to a filled glyph and broke
                                     the set; the wrapper absorbs that clone
                                     so the icon inside keeps what it was
                                     given. */
                                  leftIcon={
                                    <span className={styles.partIcon}>
                                      <TPLibraryIcon
                                        name={p.icon}
                                        family={p.iconFamily}
                                        variant="linear"
                                        size={16}
                                      />
                                    </span>
                                  }
                                  tag={count > 0 ? count : undefined}
                                  tagTone={dayPart === p.key ? "primary" : "neutral"}
                                >
                                  {p.label}
                                </TabsTrigger>
                              );
                            })}
                          </TabsList>
                        </Tabs>
                        <div className={styles.slotBody}>
                          <p className={styles.slotCount}>
                              {slotsLoading
                                ? "Loading available times…"
                                : openHere
                                ? `${openHere} of ${list.length} slot${
                                    list.length === 1 ? "" : "s"
                                  } open between ${part.range}`
                                : openToday
                                ? `Nothing open in the ${part.label.toLowerCase()}. Try another part of the day.`
                                : `No open ${teleWord}slots on this date. Pick another date.`}
                          </p>
                          {slotsLoading ? (
                            <div className={styles.slotGrid} aria-hidden="true">
                              {Array.from({ length: 8 }, (_, i) => (
                                <div key={i} className={styles.slotSkeleton} />
                              ))}
                            </div>
                          ) : (
                            list.length > 0 && (
                              <div className={styles.slotGrid}>
                                {list.map((s) => (
                                  <button
                                    key={`${s.bookMode || "clinic"}-${s.start}`}
                                    type="button"
                                    className={styles.slotChip}
                                    /* Shown so the day has a shape, but only
                                       the open ones can be chosen. */
                                    disabled={!s.bookable}
                                    data-taken={
                                      (!s.bookable && !s.isPast) || undefined
                                    }
                                    data-gone={(!s.bookable && s.isPast) || undefined}
                                    data-selected={pickStart === s.start || undefined}
                                    data-original={
                                      (isReschedule && initialTime === s.start && pickStart !== s.start) || undefined
                                    }
                                    title={
                                      s.isPast
                                        ? "That time has passed"
                                        : !s.bookable
                                        ? mode === "teleconsult" && s.status === "available"
                                          ? "Not open for teleconsultation"
                                          : "Already taken"
                                        : isReschedule && initialTime === s.start
                                        ? "The appointment's current time"
                                        : undefined
                                    }
                                    onClick={() => s.bookable && setPickStart(s.start)}
                                  >
                                    {/* A tick, not just a fill: the chosen
                                        slot says "chosen" rather than leaving
                                        the doctor to infer it from the one
                                        chip that is a different colour. */}
                                    {pickStart === s.start && (
                                      <TPLibraryIcon name="check-mark---tick" family="arrow2" size={14} />
                                    )}
                                    {moment(s.start, "HH:mm:ss").format("hh:mm A")}
                                  </button>
                                ))}
                              </div>
                            )
                          )}

                        </div>
                      </div>
                    );
                  })()}

                  {/* The choice, restated as its own card below the picker
                      rather than inside it. Blue, because it confirms the
                      blue chip above it, and outside the box so it reads as
                      the outcome of the picker instead of another line of
                      chrome within it.

                      The comma sits inside the same expression as the time: a
                      JSX newline between </strong> and the punctuation
                      renders as a space, which put a gap before it. */}
                  {effectiveSlot &&
                    (() => {
                      const fmtTime = (t) => moment(t, "HH:mm:ss").format("hh:mm A");
                      /* Short date, in brackets, riding with the time it
                         belongs to: "04:30 PM (12 Aug 26)". The full
                         "Wed 12 Aug 2026" spelled out twice made the line
                         longer than the sentence it was carrying, and the two
                         times were what needed comparing. */
                      const fmtDay = (d) => moment(d, "YYYY-MM-DD").format("DD MMM YY");
                      const toTime = fmtTime(effectiveSlot.start);
                      const toDay = fmtDay(pickDate);
                      const sameDay = initialDateISO === pickDate;
                      return (
                        <p className={styles.slotChosen}>
                          <TPLibraryIcon
                            name="clock"
                            variant="bulk"
                            family="time"
                            size={16}
                            color="var(--tesseract-violet-600)"
                          />
                          {/* One span, because the paragraph is a flex row
                              and every bare text node in it would otherwise
                              become its own flex item and inherit the gap,
                              which pushed the comma away from the time. */}
                          <span>
                            {isReschedule && initialTime ? (
                              /* A move has a from as well as a to. The date
                                 is stated once when it is not changing and on
                                 both halves when it is, so the thing that
                                 actually moved is the thing that repeats. */
                              sameDay ? (
                                <>
                                  Moving from <strong>{fmtTime(initialTime)}</strong> to{" "}
                                  <strong>{toTime}</strong>
                                  {` (${toDay})`}
                                </>
                              ) : (
                                <>
                                  Moving from <strong>{`${fmtTime(initialTime)} (${fmtDay(initialDateISO)})`}</strong>{" "}
                                  to <strong>{`${toTime} (${toDay})`}</strong>
                                </>
                              )
                            ) : (
                              <>
                                {isReschedule ? "Moving to" : "Booking"} <strong>{toTime}</strong>
                                {` (${toDay})`}
                              </>
                            )}
                          </span>
                        </p>
                      );
                    })()}

                  {/* No "Moving to ..." restatement here. The picker now opens
                      on the part of the day the chosen slot lives in with that
                      chip in its selected state, and the date sits in the
                      trigger directly above, so a sentence repeating both was
                      saying what the controls already show. */}
                </div>
              </div>
            )}

            <div className={styles.field}>
              {/* One short heading instead of a list of the three things
                  underneath it. The row already shows the name, the number
                  and the ID, each behind its own glyph, so spelling them out
                  again made the label longer than the answer. */}
              <p className={styles.fieldLabel}>
                Patient <span className={styles.required}>*</span>
              </p>
              {patient ? (
                /* The field does not change shape when it is answered: the
                   same shell now carries the identity instead of the search,
                   so the form keeps its rhythm and "Change" puts the input
                   back rather than opening something new. */
                <div className={styles.patientPicked} data-locked={isReschedule || undefined}>
                  <span className={styles.patientFact}>
                    <TPLibraryIcon name="user" variant="bulk" family="users" size={16} color="var(--tesseract-slate-500)" />
                    <span className={styles.patientName}>
                      {[patient.pm_salutation, patient.pm_fullname].filter(Boolean).join(" ")}
                    </span>
                  </span>
                  {patient.pm_contact_no && (
                    <>
                      <span className={styles.patientDivider} aria-hidden="true" />
                      <span className={styles.patientFact}>
                        <TPLibraryIcon name="call" variant="bulk" size={16} color="var(--tesseract-slate-500)" />
                        <span className={styles.patientMeta}>{patient.pm_contact_no}</span>
                      </span>
                    </>
                  )}
                  {patient.pm_pid && (
                    <>
                      <span className={styles.patientDivider} aria-hidden="true" />
                      <span className={styles.patientFact}>
                        <TPLibraryIcon name="personalcard" variant="bulk" size={16} color="var(--tesseract-slate-500)" />
                        <span className={styles.patientMeta}>{patient.pm_pid}</span>
                      </span>
                    </>
                  )}
                  {!isReschedule && (
                    <button type="button" className={styles.patientClear} onClick={() => setPatient(null)}>
                      <TPLibraryIcon name="edit" family="content-edit" size={16} color="var(--tesseract-blue-600)" />
                      Change
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.searchWrap}>
                  <InputBox
                    ref={searchInputRef}
                    fullWidth
                    leftIcon={<TPLibraryIcon name="search-normal" size={20} />}
                    placeholder="Search by Patient's Name, Phone number or Id"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                  />
                  {(searchFocused || query.trim()) && (
                    <div className={styles.results}>
                      {searching && <p className={styles.resultsHint}>Searching…</p>}
                      {!searching && query.trim() !== "" && patients.length === 0 && (
                        <p className={styles.resultsHint}>
                          No match for &ldquo;{query.trim()}&rdquo;. Check the spelling, or add them as a new
                          patient.
                        </p>
                      )}
                      {!searching && query.trim() === "" && (
                        <p className={styles.resultsHint}>Start typing to see matching patients here.</p>
                      )}
                      {!searching &&
                        patients.map((p) => (
                          <button
                            key={p.pm_pid}
                            type="button"
                            className={styles.resultRow}
                            onClick={() => {
                              setPatient(p);
                              setQuery("");
                            }}
                          >
                            <span className={styles.resultName}>
                              {[p.pm_salutation, p.pm_fullname].filter(Boolean).join(" ")}
                              {(p.pm_gender || p.ageYears != null) && (
                                <span className={styles.resultGenderAge}>
                                  ({[genderInitial(p.pm_gender), p.ageYears != null ? `${p.ageYears}y` : null]
                                    .filter(Boolean)
                                    .join(" | ")})
                                </span>
                              )}
                            </span>
                            <span className={styles.resultMeta}>
                              {p.pm_contact_no}
                              {p.pm_contact_no && p.pm_pid && (
                                <span className={styles.resultMetaDivider} aria-hidden="true" />
                              )}
                              {p.pm_pid}
                            </span>
                          </button>
                        ))}
                      {/* Sticky footer of the results panel: suggestions
                          scroll behind it, the action never moves. The
                          typed text is quoted, so the row reads as a
                          sentence about their words rather than running
                          the name into the surrounding copy. */}
                      {!searching && (
                        <button type="button" className={styles.addPatientRow} onClick={() => setAddPatientOpen(true)}>
                          <TPLibraryIcon name="add" family="essential" size={18} color="var(--tesseract-blue-500)" />
                          {query.trim() ? (
                            <span>
                              Add{" "}
                              <strong className={styles.addPatientQuery}>
                                &ldquo;{query.trim()}&rdquo;
                              </strong>{" "}
                              as a new patient
                            </span>
                          ) : (
                            <span>Add a new patient</span>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.fieldRow} data-locked={isReschedule || undefined}>
              <div className={styles.field}>
                <p className={styles.fieldLabel}>
                  Visit Type <span className={styles.required}>*</span>
                </p>
                <Dropdown
                  options={caseTypes.map((t) => ({ value: t.toct_id, label: t.toct_type }))}
                  value={caseType}
                  onChange={isReschedule ? undefined : setCaseType}
                  placeholder="Select Visit Type"
                  disabled={isReschedule}
                />
              </div>
              <div className={styles.field}>
                <p className={styles.fieldLabel}>Category</p>
                <Dropdown
                  options={categories.map((c) => ({ value: c.pt_id, label: c.pt_name }))}
                  value={category}
                  onChange={isReschedule ? undefined : (v) => setCategory(v != null ? Number(v) || v : null)}
                  placeholder="Select Category"
                  disabled={isReschedule}
                />
              </div>
            </div>

            {/* autoGrow renders the design system's own textarea, so the
                remark field keeps the same shell, focus ring and radius as
                every other field instead of being a bare textarea. */}
            <InputBox
              label="Remarks"
              placeholder="Write your remarks"
              value={remarks}
              onChange={isReschedule ? undefined : (e) => setRemarks(e.target.value)}
              disabled={isReschedule}
              autoGrow
              height={92}
              maxHeight={220}
              fullWidth
            />
          </div>
        </DrawerContent>
      </Drawer>
      {/* Tesseract add-patient sidebar (ported from the LIMS module); the
          created patient is auto-selected for the booking. */}
      {addPatientOpen && (
        <AddPatientDrawer
          open={addPatientOpen}
          /* Whatever was typed carries into the new record, so the doctor
             never types the same name twice. A run of digits is a phone
             number, not a name, so it lands in the right field. */
          initialName={/^\d{6,}$/.test(query.trim()) ? "" : query.trim()}
          initialContact={/^\d{6,}$/.test(query.trim()) ? query.trim() : ""}
          onClose={() => setAddPatientOpen(false)}
          onSaved={(created) => {
            setAddPatientOpen(false);
            if (created?.patient_unique_id || created?.pm_pid) {
              setPatient(created);
              setQuery("");
              setToast({ status: "success", title: `${created.pm_fullname || "Patient"} was added.` });
            } else if (created?.pm_fullname) {
              // No ids returned: re-search by name so the fresh record loads.
              setQuery(created.pm_fullname);
            }
          }}
        />
      )}

      {toast && (
        <div className="tpToastHost">
          <Toast status={toast.status} title={toast.title} dismissible duration={3000} onDismiss={() => setToast(null)} />
        </div>
      )}
    </>
  );
}
