import { useEffect, useState } from "react";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { Calendar2 } from "iconsax-reactjs";
import { usePlanContext } from "./plan-context";
import {
  DrawerHeader,
  buildConsultationRxUrl,
  PLAN_DRAWER_PANEL_CLASS,
} from "./plan-shared";
import { genId } from "./plan-types";
import { useDirtyDrawerGuard } from "./use-dirty-drawer-guard";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import styles from "./BookAppointmentDrawer.module.scss";
const DOCTORS = ["Dr. Sheela B R", "Dr. Shyam GR", "Dr. Riya Kapoor"];
const PATIENT_CATEGORIES = [
  {
    value: "new",
    label: "New Patient",
  },
  {
    value: "returning",
    label: "Returning Patient",
  },
  {
    value: "follow-up",
    label: "Follow-up",
  },
  {
    value: "referral",
    label: "Referral",
  },
];

const CASE_TYPES = [
  {
    value: "consultation",
    label: "Consultation",
  },
  {
    value: "procedure",
    label: "Procedure",
  },
  {
    value: "review",
    label: "Review / Check-up",
  },
  {
    value: "emergency",
    label: "Emergency",
  },
  {
    value: "follow-up",
    label: "Follow-up",
  },
];


// Mock functions to replace the deleted tp-appointment-screen module
const saveBookedAppointment = (data) => { console.log('Mock saveBookedAppointment', data); };
const updateBookedAppointment = (id, data) => { console.log('Mock updateBookedAppointment', id, data); };

function consultTimelinePreview(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "No summary captured yet.";
  const one =
    s
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)[0] ?? s;
  return one.length > 200 ? `${one.slice(0, 200)}…` : one;
}
export function BookAppointmentDrawer() {
  const {
    state,
    closeDrawer,
    findService,
    findPlanForService,
    updateService,
    patientId,
    embedInPatientShell,
    showSnackbar,
  } = usePlanContext();
  const drawer = state.drawer;
  const isOpen = drawer.type === "book-appointment";
  const serviceId = isOpen ? drawer.serviceId : undefined;
  const appointmentId = isOpen ? drawer.appointmentId : undefined;
  const service = serviceId ? findService(serviceId) : undefined;
  const plan = serviceId ? findPlanForService(serviceId) : undefined;
  const editingAppointment = appointmentId
    ? service?.appointments?.find((a) => a.id === appointmentId)
    : undefined;
  const linkedConsultationsForAppt =
    editingAppointment && service?.consultations?.length
      ? service.consultations.filter(
          (c) => c.appointmentId === editingAppointment.id,
        )
      : [];
  const [patientCategory, setPatientCategory] = useState("returning");
  const [caseType, setCaseType] = useState("consultation");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [doctor, setDoctor] = useState("");
  const [notes, setNotes] = useState("");
  const resetForm = () => {
    setPatientCategory("returning");
    setCaseType("consultation");
    setDate("");
    setTime("");
    setDoctor("");
    setNotes("");
  };
  useEffect(() => {
    if (!isOpen) return;
    if (editingAppointment) {
      setDate(editingAppointment.date);
      setTime(editingAppointment.time);
      setDoctor(editingAppointment.doctor);
      setNotes(editingAppointment.notes ?? "");
      setPatientCategory(editingAppointment.patientCategory ?? "returning");
      setCaseType(editingAppointment.caseType ?? "consultation");
      return;
    }
    resetForm();
  }, [isOpen, editingAppointment]);
  const isDirty = (() => {
    if (!isOpen) return false;
    if (editingAppointment) {
      return (
        date !== editingAppointment.date ||
        time !== editingAppointment.time ||
        doctor !== editingAppointment.doctor ||
        String(notes ?? "").trim() !==
          String(editingAppointment.notes ?? "").trim() ||
        patientCategory !==
          (editingAppointment.patientCategory ?? "returning") ||
        caseType !== (editingAppointment.caseType ?? "consultation")
      );
    }
    return Boolean(
      date ||
      time ||
      String(doctor).trim() ||
      String(notes).trim() ||
      patientCategory !== "returning" ||
      caseType !== "consultation",
    );
  })();
  const guard = useDirtyDrawerGuard({
    isDirty,
    onClose: () => closeDrawer(),
  });
  const handleBook = () => {
    if (!serviceId) return;
    const plan = findPlanForService(serviceId);
    const resolvedPatientId = plan?.patientId ?? patientId;
    const currentService = findService(serviceId);
    const appointments = currentService?.appointments ?? [];
    if (editingAppointment) {
      updateService(plan.id, serviceId, {
        appointments: appointments.map((a) =>
          a.id === editingAppointment.id
            ? { ...a, date, time, doctor, notes: notes.trim() || undefined, patientCategory, caseType, status: "scheduled", cancellationReason: undefined }
            : a
        ),
      });
      updateBookedAppointment(editingAppointment.id, {
        date,
        time,
        doctor,
        notes: notes.trim() || undefined,
      });
    } else {
      const newId = genId("appt");
      updateService(plan.id, serviceId, {
        appointments: [
          ...appointments,
          { id: newId, date, time, doctor, notes: notes.trim() || undefined, patientCategory, caseType, status: "scheduled" },
        ],
      });
      if (resolvedPatientId) {
        saveBookedAppointment({
          id: newId,
          patientId: resolvedPatientId,
          serviceId,
          serviceName: service?.treatment,
          toothLabel:
            service?.toothFdi === "full-mouth"
              ? "Full Mouth"
              : service
                ? `T${service.toothFdi} — ${service.toothLabel}`
                : undefined,
          date,
          time,
          doctor,
          notes: notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        });
      }
    }
    closeDrawer();
    resetForm();
    showSnackbar?.(
      editingAppointment
        ? "Appointment updated successfully."
        : "Appointment booked successfully.",
    );
  };
  const timeSlots = [
    "10:00 AM",
    "10:30 AM",
    "11:15 AM",
    "12:00 PM",
    "02:30 PM",
    "03:45 PM",
    "05:00 PM",
    "06:15 PM",
  ];

  return (
    <>
      <TPDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) guard.attemptClose();
        }}
      >
        <TPDrawerContent
          side="right"
          size="lg"
          className={`${PLAN_DRAWER_PANEL_CLASS} ${styles.drawerPanel}`}
          style={{
            background: "#F4F5F7",
          }}
        >
          <DrawerHeader
            title={
              editingAppointment ? "Reschedule Appointment" : "Book Appointment"
            }
            onClose={() => guard.attemptClose()}
            action={
              <button
                type="button"
                onClick={handleBook}
                disabled={!doctor || !date || !time}
                className={styles.primaryButton}
              >
                <Calendar2 size={16} variant="Linear" className={styles.primaryButtonIcon} />
                <span className={styles.primaryButtonLabel}>
                  {editingAppointment ? "Save" : "Book"}
                </span>
              </button>
            }
          />

          <div className={styles.noteBox}>
            <p className={styles.noteText}>
              Note: Use your main Book Appointment flow to reserve the slot in
              the live schedule. After the appointment is booked there, return
              to this same page (patient overview or Dental Treatment Plan) so
              the visit stays linked to this treatment line.
            </p>
          </div>
          <div
            className={styles.drawerBody}
            style={{
              background: "#F4F5F7",
            }}
          >
            {service && (
              <div className={styles.serviceInfoBox}>
                <p className={styles.serviceTitle}>
                  {service.treatment}
                </p>
                <p className={styles.serviceSubtitle}>
                  {service.toothFdi === "full-mouth"
                    ? "Full Mouth"
                    : `T${service.toothFdi} — ${service.toothLabel}`}
                </p>
              </div>
            )}

            {!service && (
              <div className={styles.emptyServiceBox}>
                <p className={styles.emptyServiceText}>
                  Open appointment booking module to schedule visits for this
                  patient.
                </p>
              </div>
            )}

            <div className={styles.twoColumnGrid}>
              <div>
                <label className={styles.label}>
                  Patient Category <span className={styles.requiredMark}>*</span>
                </label>
                <select
                  value={patientCategory}
                  onChange={(e) => setPatientCategory(e.target.value)}
                  className={styles.input}
                >
                  {PATIENT_CATEGORIES.map((c) => (
                    <option value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={styles.label}>
                  Case Type <span className={styles.requiredMark}>*</span>
                </label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className={styles.input}
                >
                  {CASE_TYPES.map((c) => (
                    <option value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={styles.label}>
                Doctor <span className={styles.requiredMark}>*</span>
              </label>
              <select
                value={doctor}
                onChange={(e) => {
                  setDoctor(e.target.value);
                  setTime("");
                }}
                className={styles.input}
              >
                <option value="" disabled={true}>
                  Select doctor
                </option>
                {DOCTORS.map((d) => (
                  <option value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.label}>
                Date <span className={styles.requiredMark}>*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime("");
                }}
                disabled={!doctor}
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.label}>
                Available Time Slots{" "}
                <span className={styles.requiredMark}>*</span>
              </label>
              {!doctor || !date ? (
                <div className={styles.timeSlotEmpty}>
                  <p className={styles.timeSlotEmptyText}>
                    Select doctor and date to view available time slots.
                  </p>
                </div>
              ) : (
                <div className={styles.timeSlotGrid}>
                  {timeSlots.map((slot) => (
                    <button
                      type="button"
                      onClick={() => setTime(slot)}
                      className={time === slot ? styles.timeSlotButtonActive : styles.timeSlotButton}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={styles.label}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className={styles.textarea}
              />
            </div>
            {editingAppointment && plan && service && patientId && (
              <div className={styles.rxBox}>
                <p className={styles.rxBoxTitle}>
                  Rx linked to this appointment
                </p>
                {linkedConsultationsForAppt.length === 0 ? (
                  <p className={styles.rxEmptyText}>
                    No Rx has been saved against this visit yet. Open RxPad
                    after the appointment to record the consultation.
                  </p>
                ) : (
                  <div className={styles.rxTimeline}>
                    {linkedConsultationsForAppt.map((c, idx) => {
                      const rxOpen = buildConsultationRxUrl(
                        patientId,
                        plan.id,
                        service.id,
                        c.appointmentId ?? editingAppointment.id,
                        embedInPatientShell,
                        service.treatment,
                      );
                      const endedShort = c.endedAt?.includes("T")
                        ? c.endedAt.slice(0, 16).replace("T", " · ")
                        : (c.endedAt ?? "");
                      return (
                        <div className={styles.rxItem}>
                          {idx !== linkedConsultationsForAppt.length - 1 && (
                            <span
                              className={styles.rxLine}
                              aria-hidden={true}
                            />
                          )}

                          <span
                            className={styles.rxDot}
                            aria-hidden={true}
                          />

                          <div className={styles.rxCard}>
                            {endedShort && (
                              <p className={styles.rxCardDate}>
                                Saved · {endedShort}
                              </p>
                            )}

                            <p className={styles.rxCardText}>
                              {consultTimelinePreview(c.summaryText)}
                            </p>
                            <button
                              type="button"
                              onClick={() => window.location.assign(rxOpen)}
                              className={styles.rxCardButton}
                            >
                              Open in RxPad
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </TPDrawerContent>
      </TPDrawer>
      <TPConfirmDialog
        open={guard.confirmOpen}
        onOpenChange={(open) => {
          if (!open) guard.cancelDiscard();
        }}
        title="Are you sure you want to go back?"
        warning="If you go back now, your changes will not be saved."
        secondaryLabel="Yes, Go Back"
        onSecondary={guard.confirmDiscard}
        primaryLabel="No, Stay"
        primaryTone="primary"
        onPrimary={guard.cancelDiscard}
      />
    </>
  );
}
