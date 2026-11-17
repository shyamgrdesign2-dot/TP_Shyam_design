/**
 * The kinds of diagnosis a hospital file holds.
 *
 * The Rx pad stores a diagnosis as name, since, status, note and ICD code,
 * and the database also keeps a diagnosis type beside it
 * (tbl_casemanager_diagnosis.type, tbl_inpatient_discharge_diagnosis.tidd_type).
 * A paper file always says which kind a diagnosis is, by where it is written:
 *
 *   Final        what the stay concluded (discharge summary, final diagnosis)
 *   Secondary    also recorded for the stay: other problems found or treated
 *   Provisional  what was being considered on admission or during the stay
 *                (provisional, working or impression), before a conclusion
 *
 * The type is stored on the row and is the tag the diagnosis sits under on
 * screen. Whether a diagnosis is suspected or confirmed is its status, a
 * separate field: a provisional diagnosis may be written plainly, and a
 * secondary one with a question mark.
 */
import { isHistory } from "./medicalHistory";

// In reading order: the conclusion, what else was found, what was considered.
export const DX_TYPES = [
  { role: "final", type: "Final", title: "Final diagnosis" },
  { role: "secondary", type: "Secondary", title: "Secondary diagnosis" },
  { role: "working", type: "Provisional", title: "Provisional diagnosis" },
];
export const DX_TITLES = DX_TYPES.map((item) => item.title);
export const DX_TYPE_OPTIONS = DX_TYPES.map((item) => item.type);

// A long-standing condition is Medical History, not a diagnosis of this file.
export const isDiagnosis = (finding) => finding.domain === "DX" && !isHistory(finding);
export const dxType = (finding) => DX_TYPES.find((item) => item.role === finding.role) || DX_TYPES[1];
export const dxTitle = (finding) => dxType(finding).title;
export const roleOfDxType = (type) => (DX_TYPES.find((item) => item.type === type) || DX_TYPES[1]).role;
