import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { Calendar2, Clock, Notepad2 } from "iconsax-reactjs";
import { ChevronDown } from "lucide-react";
import { createQvr, updateQvr } from "../../../redux/dentalQvrSlice";
import { listDoctor } from "../../../redux/bulkMessagesSlice";
import { toApiVisitType } from "../../../utils/dentalApiMappers";
import { usePlanContext } from "./plan-context";
import { DrawerHeader, PLAN_DRAWER_PANEL_CLASS } from "./plan-shared";
import { useDirtyDrawerGuard } from "./use-dirty-drawer-guard";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import styles from "./AddSittingDrawer.module.scss";
const DEFAULT_VISIT_TYPE = "FOLLOW_UP";
function toDateInputValue(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toTimeInputValue(d) {
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}
function parseSittingDateToInputParts(sitting) {
  if (sitting?.visitDate) {
    const time = sitting.visitTime
      ? String(sitting.visitTime).slice(0, 5)
      : toTimeInputValue(new Date());
    return {
      date: sitting.visitDate,
      time,
    };
  }
  const fromCreatedAt = sitting?.createdAt ? new Date(sitting.createdAt) : null;
  if (fromCreatedAt && Number.isFinite(fromCreatedAt.getTime())) {
    return {
      date: toDateInputValue(fromCreatedAt),
      time: toTimeInputValue(fromCreatedAt),
    };
  }
  const m =
    /^(\d{1,2})\s+(\w{3})\s+(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(
      String(sitting?.date ?? "").trim(),
    );
  if (!m) return null;
  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const month = monthMap[m[2]] ?? 0;
  const dd = Number(m[1]);
  const yy = Number(m[3]);
  const mins = Number(m[5]);
  let hh = Number(m[4]);
  const ampm = m[6].toUpperCase();
  if (ampm === "PM" && hh !== 12) hh += 12;
  if (ampm === "AM" && hh === 12) hh = 0;
  const d = new Date(yy, month, dd, hh, mins);
  return Number.isFinite(d.getTime())
    ? {
        date: toDateInputValue(d),
        time: toTimeInputValue(d),
      }
    : null;
}
function formatSurfaceLabel(surface) {
  return String(surface ?? "")
    .trim()
    .charAt(0)
    .toUpperCase()
    .concat(
      String(surface ?? "")
        .trim()
        .slice(1),
    );
}
function formatDateDisplay(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map((n) => Number(n));
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}
function formatTimeDisplay(time24) {
  if (!time24) return "";
  const [hh, mm] = time24.split(":").map((n) => Number(n));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "";
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
export function AddSittingDrawer() {
  const dispatch = useDispatch();
  const { userId, profile } = useSelector((state) => state.doctors);
  const { doctorList } = useSelector((state) => state.bulkMessages);
  const loggedInDoctorId = String(userId || profile?.doctor_unique_id || "");
  const doctorOptions = useMemo(
    () =>
      doctorList?.map((doctor) => ({
        value: String(doctor.um_id),
        label: doctor.um_name,
      })) ?? [],
    [doctorList],
  );
  const defaultDoctorId = loggedInDoctorId || doctorOptions[0]?.value || "";
  const { patientId, state, findService, findPlanForService, closeDrawer, showSnackbar, refetchPlans } =
    usePlanContext();
  const drawer = state.drawer;
  const isAdd = drawer.type === "add-sitting";
  const isEdit = drawer.type === "edit-sitting";
  const isOpen = isAdd || isEdit;
  const serviceId = isOpen ? drawer.serviceId : undefined;
  const sittingId = isEdit ? drawer.sittingId : undefined;
  const service = serviceId ? findService(serviceId) : undefined;
  const editingSitting = sittingId
    ? service?.sittings?.find((s) => s.id === sittingId)
    : undefined;
  const now = new Date();
  const [visitDate, setVisitDate] = useState(toDateInputValue(now));
  const [visitTime, setVisitTime] = useState(toTimeInputValue(now));
  const [selectedDoctor, setSelectedDoctor] = useState(defaultDoctorId);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedDoctorName =
    doctorOptions.find((doctor) => doctor.value === String(selectedDoctor))
      ?.label ?? "";
  const resolveDoctorId = (sitting) => {
    if (sitting?.doctorId) return String(sitting.doctorId);
    if (sitting?.doctor) {
      const match = doctorOptions.find((doctor) => doctor.label === sitting.doctor);
      if (match) return match.value;
    }
    return defaultDoctorId;
  };
  const surfaceSummary = service?.surfaces?.length
    ? service.surfaces.map(formatSurfaceLabel).join(", ")
    : "All surfaces";
  const toothSummary =
    service?.toothFdi === "full-mouth"
      ? "Full Mouth"
      : service
        ? `T${service.toothFdi} ${service.toothLabel}`
        : "—";
  const serviceNotesPreview = String(service?.notes ?? "").trim() || "—";
  const resetForm = () => {
    const current = new Date();
    setVisitDate(toDateInputValue(current));
    setVisitTime(toTimeInputValue(current));
    setSelectedDoctor(defaultDoctorId);
    setNotes("");
  };
  useEffect(() => {
    if (isOpen) {
      dispatch(listDoctor());
    }
  }, [dispatch, isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && editingSitting) {
      const parsed = parseSittingDateToInputParts(editingSitting);
      if (parsed) {
        setVisitDate(parsed.date);
        setVisitTime(parsed.time);
      }
      setSelectedDoctor(resolveDoctorId(editingSitting));
      setNotes(editingSitting.notes ?? "");
      return;
    }
    resetForm();
  }, [isOpen, isEdit, sittingId]);
  useEffect(() => {
    if (!isOpen || doctorOptions.length === 0) return;
    setSelectedDoctor((current) => {
      if (doctorOptions.some((doctor) => doctor.value === String(current))) {
        return current;
      }
      if (isEdit && editingSitting) {
        return resolveDoctorId(editingSitting);
      }
      return defaultDoctorId;
    });
  }, [isOpen, doctorOptions, defaultDoctorId, isEdit, editingSitting]);
  const isDirty = (() => {
    if (!isOpen) return false;
    if (isEdit && editingSitting) {
      const parsed = parseSittingDateToInputParts(editingSitting);
      const origDate = parsed?.date ?? toDateInputValue(new Date());
      const origTime = parsed?.time ?? toTimeInputValue(new Date());
      return (
        visitDate !== origDate ||
        visitTime !== origTime ||
        String(selectedDoctor) !== String(resolveDoctorId(editingSitting)) ||
        String(notes ?? "").trim() !== String(editingSitting.notes ?? "").trim()
      );
    }
    return (
      Boolean(String(notes ?? "").trim()) ||
      String(selectedDoctor) !== String(defaultDoctorId)
    );
  })();
  const guard = useDirtyDrawerGuard({
    isDirty,
    onClose: () => closeDrawer(),
  });
  const handleAdd = async () => {
    if (!serviceId || !patientId || saving) return;
    if (!selectedDoctor) {
      showSnackbar?.("Please select a doctor.");
      return;
    }
    const plan = findPlanForService(serviceId);
    if (!plan) return;

    const visitType = isEdit
      ? toApiVisitType(editingSitting?.visitType ?? DEFAULT_VISIT_TYPE)
      : DEFAULT_VISIT_TYPE;

    const payload = {
      visitDate,
      visitTime,
      doctorId: selectedDoctor,
      visitType,
      notes: notes.trim() || undefined,
      version: isEdit ? editingSitting?.version : undefined,
    };

    setSaving(true);
    try {
      if (isEdit && sittingId) {
        await dispatch(
          updateQvr({
            patientId,
            planId: plan.id,
            serviceId,
            qvrId: sittingId,
            data: payload,
            doctorName: selectedDoctorName,
          }),
        ).unwrap();
      } else {
        await dispatch(
          createQvr({
            patientId,
            planId: plan.id,
            serviceId,
            data: payload,
            doctorName: selectedDoctorName,
          }),
        ).unwrap();
      }
      await refetchPlans();
      closeDrawer();
      resetForm();
      showSnackbar?.(
        isEdit
          ? "Quick visit record updated successfully."
          : "Quick visit record added successfully.",
      );
    } catch (err) {
      const message =
        typeof err === "string"
          ? err
          : "Failed to save quick visit record. Please try again.";
      showSnackbar?.(message);
    } finally {
      setSaving(false);
    }
  };
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
        >
          <DrawerHeader
            title={isEdit ? "Edit visit" : "Record visit"}
            onClose={() => guard.attemptClose()}
            action={
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className={styles.primaryButton}
              >
                {saving ? "Saving…" : isEdit ? "Save visit" : "Add visit"}
              </button>
            }
          />

          <div className={styles.drawerBody}>
            {service && (
              <div className={styles.summaryBox}>
                <p className={styles.summaryTitle}>
                  {service.treatment}
                </p>
                <div className={styles.summaryList}>
                  <p className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      Tooth:
                    </span>
                    <span className={styles.summaryValue}>
                      {toothSummary}
                    </span>
                  </p>
                  <p className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      Surface:
                    </span>
                    <span className={styles.summaryValue}>
                      {surfaceSummary}
                    </span>
                  </p>
                  <p className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      Notes:
                    </span>
                    <span className={styles.summaryValueMuted}>
                      {serviceNotesPreview}
                    </span>
                  </p>
                </div>
              </div>
            )}

            <div className={styles.formCard}>
              <div className={styles.formCardHeader}>
                <Notepad2
                  size={18}
                  variant="Bulk"
                  className={styles.formCardIcon}
                />
                <h3 className={styles.formCardTitle}>Visit Record</h3>
              </div>

              <div className={styles.gridCols3}>
                <div>
                  <label className={styles.label}>Visit date</label>
                  <div className={styles.pickerInputWrapper}>
                    <span className={styles.pickerDisplay}>
                      {formatDateDisplay(visitDate)}
                    </span>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className={styles.pickerInput}
                    />
                    <span className={styles.inputIcon}>
                      <Calendar2 size={16} variant="Linear" />
                    </span>
                  </div>
                </div>
                <div>
                  <label className={styles.label}>Visit time</label>
                  <div className={styles.pickerInputWrapper}>
                    <span className={styles.pickerDisplay}>
                      {formatTimeDisplay(visitTime)}
                    </span>
                    <input
                      type="time"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className={styles.pickerInput}
                    />
                    <span className={styles.inputIcon}>
                      <Clock size={16} variant="Linear" />
                    </span>
                  </div>
                </div>
                <div>
                  <label className={styles.label}>Doctor</label>
                  <div className={styles.inputWrapper}>
                    <select
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      disabled={!doctorOptions.length}
                      className={styles.select}
                    >
                      {doctorOptions.length === 0 ? (
                        <option value="">No doctors available</option>
                      ) : (
                        doctorOptions.map((doctor) => (
                          <option key={doctor.value} value={doctor.value}>
                            {doctor.label}
                          </option>
                        ))
                      )}
                    </select>
                    <span className={styles.inputIcon}>
                      <ChevronDown size={16} strokeWidth={2} />
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.notesField}>
                <label className={styles.label}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Clinical notes, chairside findings, treatment details..."
                  rows={6}
                  className={styles.textarea}
                />
              </div>
            </div>
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
