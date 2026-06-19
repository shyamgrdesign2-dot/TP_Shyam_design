import { useEffect, useState } from "react";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import { ChevronDown } from "lucide-react";
import { usePlanContext } from "./plan-context";
import { DrawerHeader, PLAN_DRAWER_PANEL_CLASS } from "./plan-shared";
import { genId } from "./plan-types";
import { useDirtyDrawerGuard } from "./use-dirty-drawer-guard";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import styles from "./AddSittingDrawer.module.scss";
const DOCTORS = ["Dr. Sheela B R", "Dr. Shyam GR", "Dr. Riya Kapoor"];
const VISIT_TYPES = ["Follow-up", "Procedure", "Emergency", "Review"];
function formatVisitDateTimeLabel(d) {
  const datePart = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}
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
function composeVisitDateTime(visitDate, visitTime) {
  if (!visitDate || !visitTime) return null;
  const [y, m, d] = visitDate.split("-").map((n) => Number(n));
  const [hh, mm] = visitTime.split(":").map((n) => Number(n));
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt;
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
export function AddSittingDrawer() {
  const { state, updateService, findService, findPlanForService, closeDrawer, showSnackbar } =
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
  const [doctor, setDoctor] = useState(DOCTORS[0]);
  const [visitType, setVisitType] = useState(VISIT_TYPES[0]);
  const [notes, setNotes] = useState("");
  const surfaceSummary = service?.surfaces?.length
    ? service.surfaces.map(formatSurfaceLabel).join(", ")
    : "All surfaces";
  const toothSummary =
    service?.toothFdi === "full-mouth"
      ? "Full Mouth"
      : service
        ? `T${service.toothFdi} — ${service.toothLabel}`
        : "—";
  const notesPreview = String(notes ?? "").trim()
    ? String(notes ?? "")
        .trim()
        .split("\n")[0]
        .trim()
    : "—";
  const resetForm = () => {
    const current = new Date();
    setVisitDate(toDateInputValue(current));
    setVisitTime(toTimeInputValue(current));
    setDoctor(DOCTORS[0]);
    setVisitType(VISIT_TYPES[0]);
    setNotes("");
  };
  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && editingSitting) {
      const parsed = parseSittingDateToInputParts(editingSitting);
      if (parsed) {
        setVisitDate(parsed.date);
        setVisitTime(parsed.time);
      }
      setDoctor(editingSitting.doctor);
      setVisitType(editingSitting.visitType ?? VISIT_TYPES[0]);
      setNotes(editingSitting.notes ?? "");
      return;
    }
    resetForm();
  }, [isOpen, isEdit, editingSitting]);
  const isDirty = (() => {
    if (!isOpen) return false;
    if (isEdit && editingSitting) {
      const parsed = parseSittingDateToInputParts(editingSitting);
      const origDate = parsed?.date ?? toDateInputValue(new Date());
      const origTime = parsed?.time ?? toTimeInputValue(new Date());
      return (
        visitDate !== origDate ||
        visitTime !== origTime ||
        doctor !== editingSitting.doctor ||
        visitType !== (editingSitting.visitType ?? VISIT_TYPES[0]) ||
        String(notes ?? "").trim() !== String(editingSitting.notes ?? "").trim()
      );
    }
    return (
      Boolean(String(notes ?? "").trim()) ||
      doctor !== DOCTORS[0] ||
      visitType !== VISIT_TYPES[0]
    );
  })();
  const guard = useDirtyDrawerGuard({
    isDirty,
    onClose: () => closeDrawer(),
  });
  const handleAdd = () => {
    if (!serviceId) return;
    const chosen = composeVisitDateTime(visitDate, visitTime) ?? new Date();
    const visitLabel = formatVisitDateTimeLabel(chosen);
    const chosenIso = chosen.toISOString();
    const plan = findPlanForService(serviceId);
    if (!plan) return;
    const currentService = findService(serviceId);
    const sittings = currentService?.sittings ?? [];
    if (isEdit && sittingId) {
      updateService(plan.id, serviceId, {
        sittings: sittings.map((s) =>
          s.id === sittingId
            ? { ...s, date: visitLabel, doctor, visitType, createdAt: chosenIso, notes: notes.trim() || undefined }
            : s
        ),
      });
    } else {
      updateService(plan.id, serviceId, {
        sittings: [
          ...sittings,
          { id: genId("sit"), date: visitLabel, doctor, visitType, createdAt: chosenIso, notes: notes.trim() || undefined },
        ],
      });
    }
    closeDrawer();
    resetForm();
    showSnackbar?.(
      isEdit
        ? "Quick visit record updated successfully."
        : "Quick visit record added successfully.",
    );
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
                className={styles.primaryButton}
              >
                {isEdit ? "Save visit" : "Add visit"}
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
                      {notesPreview}
                    </span>
                  </p>
                </div>
              </div>
            )}

            <div className={styles.gridCols2}>
              <div>
                <label className={styles.label}>Visit date</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div>
                <label className={styles.label}>Visit time</label>
                <input
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <div>
              <label className={styles.label}>Doctor</label>
              <div className={styles.inputWrapper}>
                <select
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  className={styles.select}
                >
                  {DOCTORS.map((d) => (
                    <option value={d}>{d}</option>
                  ))}
                </select>
                <span className={styles.inputIcon}>
                  <ChevronDown size={16} strokeWidth={2} />
                </span>
              </div>
            </div>
            <div>
              <label className={styles.label}>Visit type</label>
              <div className={styles.inputWrapper}>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  className={styles.select}
                >
                  {VISIT_TYPES.map((type) => (
                    <option value={type}>{type}</option>
                  ))}
                </select>
                <span className={styles.inputIcon}>
                  <ChevronDown size={16} strokeWidth={2} />
                </span>
              </div>
            </div>
            <div>
              <label className={styles.label}>Consultation notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Chairside findings, procedures done, follow-up for this visit…"
                rows={7}
                className={styles.textarea}
              />
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
