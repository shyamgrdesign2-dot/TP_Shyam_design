/**
 * Per-tab pill mapping for sidebar content panels.
 * Each sidebar tab gets 4–5 contextual pills at its bottom.
 * Pill taps switch to Dr.Agent panel and inject the pill label as a user message.
 *
 * IMPORTANT: Labels must match keywords in reply-engine.ts so that clicking
 * a pill produces an actual card response in the Dr. Agent panel.
 */









export const SIDEBAR_TAB_PILLS = {
  pastVisits: [
  { id: "pv-last", label: "Last visit details", icon: "spark" },
  { id: "pv-compare", label: "Compare with last visit", icon: "spark" },
  { id: "pv-summary", label: "Patient summary", icon: "spark" },
  { id: "pv-meds", label: "Protocol meds", icon: "spark" }],

  vitals: [
  { id: "vt-trends", label: "Vital trends", icon: "spark" },
  { id: "vt-spo2", label: "Review SpO\u2082", icon: "spark" },
  { id: "vt-bp", label: "BP needs attention", icon: "spark" },
  { id: "vt-compare", label: "Compare with last visit", icon: "spark" }],

  history: [
  { id: "hx-summary", label: "Patient summary", icon: "spark" },
  { id: "hx-allergies", label: "Allergy Alert", icon: "spark" },
  { id: "hx-meds", label: "Check interactions", icon: "spark" },
  { id: "hx-ddx", label: "Suggest DDX", icon: "spark" }],

  labResults: [
  { id: "lb-flagged", label: "Labs flagged", icon: "spark" },
  { id: "lb-trends", label: "HbA1c trend", icon: "spark" },
  { id: "lb-compare", label: "Lab comparison", icon: "spark" },
  { id: "lb-investigate", label: "Suggest investigations", icon: "spark" }],

  medicalRecords: [
  { id: "mr-summary", label: "Patient summary", icon: "spark" },
  { id: "mr-labs", label: "Labs flagged", icon: "spark" },
  { id: "mr-last", label: "Last visit details", icon: "spark" },
  { id: "mr-upload", label: "Upload document", icon: "spark" }],

  obstetric: [
  { id: "ob-summary", label: "Obstetric summary", icon: "spark" },
  { id: "ob-vitals", label: "Vital trends", icon: "spark" },
  { id: "ob-investigate", label: "Suggest investigations", icon: "spark" },
  { id: "ob-followup", label: "Plan follow-up", icon: "spark" }],

  gynec: [
  { id: "gn-summary", label: "Gynec summary", icon: "spark" },
  { id: "gn-labs", label: "Labs flagged", icon: "spark" },
  { id: "gn-investigate", label: "Suggest investigations", icon: "spark" },
  { id: "gn-followup", label: "Plan follow-up", icon: "spark" }],

  vaccine: [
  { id: "vc-growth", label: "Growth & vaccines", icon: "spark" },
  { id: "vc-summary", label: "Patient summary", icon: "spark" },
  { id: "vc-followup", label: "Plan follow-up", icon: "spark" },
  { id: "vc-advice", label: "Generate advice", icon: "spark" }],

  growth: [
  { id: "gr-summary", label: "Growth & vaccines", icon: "spark" },
  { id: "gr-vitals", label: "Vital trends", icon: "spark" },
  { id: "gr-advice", label: "Generate advice", icon: "spark" },
  { id: "gr-followup", label: "Plan follow-up", icon: "spark" }],

  personalNotes: [
  { id: "pn-summary", label: "Patient summary", icon: "spark" },
  { id: "pn-completeness", label: "Completeness check", icon: "spark" },
  { id: "pn-advice", label: "Generate advice", icon: "spark" },
  { id: "pn-translate", label: "Translate advice", icon: "spark" }]

};