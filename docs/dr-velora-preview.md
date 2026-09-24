# Dr.Velora frontend prototype

Development branch: `Dr-Velora` in `shyamgrdesign2-dot/TP_Shyam_design`.

## Run and review

Run `npm ci`, then `npm run dev`. Tesseract UI 1.1.0 is hosted on GitHub Packages; fresh installs and CI need an authorized `read:packages` token in the developer’s npm configuration. Never commit credentials. Open:

- `/rxpad/voice?patientId=apt-ramesh-ckd`
- `/patient-details?patientId=apt-ramesh-ckd`

Use the header search or Dr.Velora launcher. The panel expands to a modal or docks on the right. The original Doctor greeting and compact suggestion chips are preserved; the welcome composer sits below the chips with sync immediately above it; the privacy marker stays at the bottom. Rx pad VoiceRx opens the existing consultation-mode chooser. A single mounted panel preserves its thread and native voice state while changing presentation.

## Sample answers and evidence

Try Patient summary, Medications on record, Conditions on record, Advice on record, “Show lab results”, or “Show HbA1c trend”. The original `apt-*` design patients use deterministic fictional fixtures, without a backend request. The two approved numeric test IDs use the backend adapter described below. Answers use the selected patient’s display name for context and are explicitly marked Sample data. Values are fictional and do not describe that patient’s actual chart. Unsupported questions return the available sample topics.

Cards reuse the existing CardShell and demonstrate narrative citations, measurement/reference tables, prescription dose/schedule/duration, and a clickable trend. A citation opens the evidence drawer at its selected source. The evidence footer opens all sources. The Tesseract Drawer has one fixed header followed directly by numbered collapsible records. Each sample record displays a complete PDF (generated locally with pdf-lib and rendered by PDF.js), with a document title and date and yellow cited passages. The PDF has no fixed viewer header or footer; pages scroll within a vertically resizable region. The gray viewport has a normal vertical scrollbar and side padding only, with no top/bottom inset. A bottom-floating pill shows the current/total page count, previous/next-page buttons and a download action. Page selection follows scrolling and resizing; downloads use the same locally rendered PDF. One Record details footer expands to show document metadata; duplicate source text is omitted. Cards use a white-to-violet gradient header with a violet record number, a neutral PDF-viewer background and a white Record details footer. Both answer cards and the drawer use the exact Tesseract rounded/bulk/school-learning/note-2.svg evidence icon; the drawer icon stays neutral, with a blue record-count badge beside Evidence. The header carries the drawer’s only sync timestamp. Accordion arrows sit on the right. Clinician rows, format badges, visit ordinals and redundant tags are omitted. It has no fixed footer. Escape closes the evidence drawer without dismissing the parent panel.

## Backend handoff

Fixture contract: `src/components/organisms/rxpad/dr-agent/velora/fixtures.js`.

- `ui.schemaVersion`: `doctor-agent.ui.v1`
- `ui.root` and `ui.elements`: Response → ClinicalCard → Narrative / Measurements / Prescriptions / Trend.
- Measurement rows: label, value, unit, date, reference, flag, questionable, sourceRef.
- Prescription rows: name, dose, unit, date, schedule, duration, instructions, recordedText, unitDerived, sourceRef.
- Evidence records: source_ref, evidenceId, code, eventDate, text, Unicode code-point highlight offsets, visitOrdinal/visitTotal, doctorName, departmentName, chips, caseId, tableName.
- `corpus_updated_at` represents the last successful record-index sync. Replace the fixed sample timestamp with this value; do not substitute page-load time.

The preview renderer follows the Response children to its ClinicalCard and renders supported child blocks in their declared order. It covers these sample blocks; it is not a complete generic schema renderer. Production integration must map the authenticated patient’s own records, handle loading/empty/error/sync states, and validate the response. Existing VoiceRx behavior belongs to the design repository and is preserved; fixture answers stay local; live test answers come from the configured backend.

## Verification

Production build and browser smoke checks cover both routes, the original welcome with sync time, sample summary, citation selection, evidence dismissal, dock transition, and the VoiceRx mode chooser. Microphone recording was not started during smoke testing. Targeted lint has no errors; repository-wide lint contains pre-existing errors outside the changed files.

## Visual conventions

- The original greeting and four suggestions remain. Both chip labels and Tesseract CDN icons use the AI gradient; the whole panel shares one subtle animated wash.
- The header uses a neutral fixed lead, violet rotating topic, and quiet sync text inside the same field. The real Tesseract tooltip includes an arrow, full timestamp, corpus counts, and sample/coverage disclosure.
- Composer placeholder topics rotate until typing begins; sync remains below it, while the welcome privacy marker has a separate bottom anchor. Minimize uses the CDN inward arrows, close uses the bold close-square.
- Citations and source navigation are blue, metadata is violet, evidence surfaces are neutral. Medication schedules are plain `1-0-0-1` in morning/afternoon/evening/night order. Dose, timing, and duration have separate columns. Tables scroll within narrow panels.

## Live backend test patients

The supplied test IDs `10002026594130` and `10002020241797` use the actual PM Copilot API through `/api/velora/*`. No fixture answer is substituted on a live failure. The current page's older OPD panels remain design fixtures; only Dr.Velora is connected by this integration.

Configure these server-only settings in ignored `.env.local`:

```dotenv
VELORA_BACKEND_URL=https://pm-copilot-preprod.tatvacare.in
VELORA_TEST_PATIENT_IDS=10002026594130,10002020241797
VELORA_BACKEND_TOKEN_FILE=/absolute/path/to/current-token
```

Alternatively, provide `VELORA_BACKEND_TOKEN` as a server environment variable. Do not use `NEXT_PUBLIC_` for credentials. The token file is read for every request, so replacing an expired token does not require a restart.

Open `/patient-details?patientId=10002026594130&name=Test%20patient`. The server creates a patient-scoped conversation, forwards questions with the last confirmed request ID, and relays SSE activity. Loading continues until the validated final response. After an uncertain connection failure, the client checks the saved conversation without automatically replaying the question. Backend evidence IDs and source references remain separate and resolve to the same source record. Missing sync dates/counts remain unavailable.

Local verification: `npm run test:velora`, targeted ESLint, production build, and browser checks. Live access currently returns **401 for the saved token**; successful model output still needs validation after the token is refreshed. The preproduction `/ping` and `/health` endpoints returned 200. These checks do not establish access to either patient's corpus.

## Original document integration

The current Shyam search/evidence API supplies extracted text and visit identifiers, not original PDF or uploaded-file URLs. Live evidence therefore explicitly says “Original document unavailable” without a duplicate source-text section; it is never converted into an invented prescription. The authenticated source-document endpoint and its patient-bound authorization contract are still needed to display real Rx PDFs and uploaded medical/lab files. Sample PDFs are clearly marked fictional and use the selected design patient’s name/demographics; they do not represent originals retrieved from the backend. PDF.js and its worker are bundled locally, with no third-party document viewer.

Conversation answers show a compact sync timestamp on the right beneath each answer and feedback controls on the left. The Tesseract info tooltip describes the record snapshot used by that response. Sync is omitted from the conversation composer and evidence action row. Header and composer placeholders use regular-weight light neutral text with a soft violet carousel. VoiceRx hides the header Preview action; expand/minimise icons are 14px inside the original click targets.

The chat loading state uses neutral slate text, a document icon, spinner and skeleton. Progress labels wrap on narrow panels rather than truncating.

Evidence rows and record headers keep their background unchanged on hover; only the disclosure icon has a neutral hover highlight. Answer sync uses a bulk clock and linear info icon with a dark Tesseract tooltip aligned to the right.
