# Dr. Velora frontend prototype

Development branch: `Dr-Velora` in `shyamgrdesign2-dot/TP_Shyam_design`.

## Run and review

Run `npm ci`, then `npm run dev`. Open:

- `/rxpad/voice?patientId=apt-ramesh-ckd`
- `/patient-details?patientId=apt-ramesh-ckd`

Use the header search or Dr. Velora launcher. The panel expands to a modal or docks on the right. The original Doctor greeting and compact suggestion chips are preserved; the empty state adds one Last synced line. Rx pad VoiceRx opens the existing consultation-mode chooser. A single mounted panel preserves its thread and native voice state while changing presentation.

## Sample answers and evidence

Try Patient summary, Medications on record, Conditions on record, Advice on record, “Show lab results”, or “Show HbA1c trend”. The answers use deterministic fictional fixtures only, without a backend request. Every answer and evidence drawer identifies the separate fictional reference chart (Aarav Mehta); it does not describe the selected patient’s actual chart. Unsupported questions return the available sample topics.

Cards reuse the existing CardShell and demonstrate narrative citations, measurement/reference tables, prescription dose/schedule/duration, and a clickable trend. A citation opens the evidence drawer at its selected source. The evidence footer opens all sources. The drawer shows dates, visit numbers, clinician, exact source excerpts with highlighted passages, and source identifiers. Escape closes the evidence drawer without dismissing the parent panel.

## Backend handoff

Fixture contract: `src/components/organisms/rxpad/dr-agent/velora/fixtures.js`.

- `ui.schemaVersion`: `doctor-agent.ui.v1`
- `ui.root` and `ui.elements`: Response → ClinicalCard → Narrative / Measurements / Prescriptions / Trend.
- Measurement rows: label, value, unit, date, reference, flag, questionable, sourceRef.
- Prescription rows: name, dose, unit, date, schedule, duration, instructions, recordedText, unitDerived, sourceRef.
- Evidence records: source_ref, evidenceId, code, eventDate, text, Unicode code-point highlight offsets, visitOrdinal/visitTotal, doctorName, departmentName, chips, caseId, tableName.
- `corpus_updated_at` represents the last successful record-index sync. Replace the fixed sample timestamp with this value; do not substitute page-load time.

The preview renderer covers these sample blocks; it is not a complete generic schema renderer. Production integration must map the authenticated patient’s own records, handle loading/empty/error/sync states, and validate the response. Existing VoiceRx behavior belongs to the design repository and is preserved; the new record-answer path is entirely local.

## Verification

Production build and browser smoke checks cover both routes, the original welcome with sync time, sample summary, citation selection, evidence dismissal, dock transition, and the VoiceRx mode chooser. Microphone recording was not started during smoke testing. Targeted lint has no errors; repository-wide lint contains pre-existing errors outside the changed files.
