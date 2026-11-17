/**
 * Procedures done during the stays this file covers.
 *
 * The Rx pad stores a surgery or procedure as name and notes. The inpatient
 * record keeps more beside it (tbl_inpatient_doctor_procedure: title, date,
 * time, anaesthetic type, notes), and an old hospital file states all of
 * these, so a procedure is stored with them as fields of their own:
 *
 *   name         the clean name: "Left hip bipolar hemiarthroplasty, cemented"
 *   type         Surgery (an operation, in theatre) | Procedure (anything
 *                else done to the patient: a catheter, traction, a tap)
 *   date, time   when it was done, as written
 *   anaesthesia  the anaesthetic type, as written ("Block + Spinal")
 *   notes        what else the page says that matters clinically (approach,
 *                size of catheter, what was drained)
 *
 * An operation before these stays is Medical History (Surgical History).
 * Staff names are never stored.
 */
import { isHistory } from "./medicalHistory";

// In reading order: the operation first.
export const PROC_TYPES = [
  { role: "surgery", type: "Surgery", title: "Surgery" },
  { role: "procedure", type: "Procedure", title: "Other procedures" },
];
export const PROC_TITLES = PROC_TYPES.map((item) => item.title);
export const PROC_TYPE_OPTIONS = PROC_TYPES.map((item) => item.type);

export const isProcedure = (finding) => finding.domain === "PROC" && !isHistory(finding);
export const procType = (finding) => PROC_TYPES.find((item) => item.role === finding.role) || PROC_TYPES[1];
export const procTitle = (finding) => procType(finding).title;
export const roleOfProcType = (type) => (PROC_TYPES.find((item) => item.type === type) || PROC_TYPES[1]).role;

// A tag is worth its line only when a file has both kinds. With one kind the
// section's own heading says enough.
export const procGroups = (items) => (new Set(items.map(procTitle)).size > 1 ? PROC_TITLES : [""]);
export const procGroupOf = (items) => (new Set(items.map(procTitle)).size > 1 ? procTitle : () => "");
