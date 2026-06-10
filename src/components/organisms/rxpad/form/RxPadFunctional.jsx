"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar2, Notepad2 } from "iconsax-reactjs";
import { Plus } from "@/src/components/atoms/icons/lucide";
import { ReferralFields } from "@/src/components/organisms/rxpad/referral/ReferralFields";
import { ReferralIcon } from "@/src/components/organisms/rxpad/referral/ReferralIcon";
import { defaultReferral, resolveReferral } from "@/src/components/organisms/rxpad/referral/referral-data";

import {
  diagnosisSuggestions,
  examinationSuggestions,
  medicationSuggestions,
  symptomSuggestions } from
"../sections-sample-data";
import {


  useRxPadSync } from
"@/src/components/organisms/rxpad/rxpad-sync-context";

import { buildHistoricalUpdatesFromPayload } from "@/src/components/organisms/rxpad/historical-updates-from-payload";
import { AiTriggerChip } from "@/src/components/organisms/rxpad/dr-agent/shared/AiTriggerChip";
import { useV0Mode } from "@/src/components/organisms/rxpad/dr-agent/hooks/useV0Mode";
import { DEFAULT_SECTION_CONFIG } from "@/src/components/organisms/rxpad/RxCustomiseSidebar";
import { useCustomModules, useCustomModulesDrawer, useRxSectionConfig } from "@/src/components/organisms/rxpad/customise-context";
import { useModuleTemplateHandlers } from "@/src/components/organisms/rxpad/templates";
import { CUSTOM_MODULE_CAP } from "@/src/components/organisms/rxpad/customise-store";
import { saveRxPreviewSnapshot } from "@/src/components/organisms/rxpad/rx-preview-store";
import { PER_PATIENT_RXPAD_DATA, checkDrugInteraction, checkTableInteractions } from "./per-patient-rxpad-data";
import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";
import { Tooltip as TPTooltip } from "@/src/components/atoms/Tooltip";
import { toast as tpToast } from "@/src/components/molecules/Toaster";
import { RxPadSection as TPRxPadSection } from "@/src/components/organisms/rxpad/form/RxPadSection";
import { MedicationSearchRow } from "./MedicationSearchRow";
import { MedicationCellInventory } from "./MedicationCellInventory";

/* ── Types, constants, and utilities ── */

import {
  MEDICATION_WHEN_OPTIONS,
  ADVICE_SUGGESTIONS,
  LAB_INVESTIGATION_BASE_OPTIONS,
  SURGERY_SUGGESTIONS } from
"./rxpad-table-types";
import {
  getRowId,
  getSinceOptions,
  getMedicationUnitOptions,
  getFrequencyOptions,
  getDurationOptions,
  getSeedQuery,
  filterByQuery,
  getCatalogOptions,
  loadCustomRows } from
"./rxpad-table-utils";

/* ── Extracted sub-components ── */
import { EditableTableModule } from "./EditableTableModule";
import { VoiceRxModuleRecorder } from "@/src/components/organisms/voicerx/VoiceRxModuleRecorder";
import { VoiceRxSectionProcessing } from "./VoiceRxSectionProcessing";
import { CustomModuleTable } from "./CustomModuleTable";

// Re-export for consumers that import from this file



/* ── Medication allergy/interaction check helper ── */

/** Known drug-allergy keyword pairs: allergy keyword → matching drug substrings */
const DRUG_ALLERGY_MAP = {
  ibuprofen: ["ibuprofen", "brufen", "advil"],
  "sulfa drugs": ["sulfamethoxazole", "trimethoprim", "bactrim", "cotrimoxazole", "sulfa"],
  sulfa: ["sulfamethoxazole", "trimethoprim", "bactrim", "cotrimoxazole", "sulfa"],
  aspirin: ["aspirin", "disprin", "ecosprin"],
  penicillin: ["amoxicillin", "ampicillin", "penicillin", "augmentin"]
};







function checkMedicationAlerts(
medRows,
allergies)
{
  if (allergies.length === 0) return [];
  const alerts = [];
  const normalizedAllergies = allergies.map((a) => a.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase());

  for (const row of medRows) {
    const medName = (row.medicine ?? "").trim().toLowerCase();
    if (!medName) continue;

    for (let ai = 0; ai < normalizedAllergies.length; ai++) {
      const allergy = normalizedAllergies[ai];
      // Direct name match
      if (medName.includes(allergy) || allergy.includes(medName.split(" ")[0])) {
        alerts.push({ rowId: row.id, medName: row.medicine ?? "", allergen: allergies[ai] });
        break;
      }
      // Drug-allergy map match
      const mappedDrugs = DRUG_ALLERGY_MAP[allergy];
      if (mappedDrugs?.some((drug) => medName.includes(drug))) {
        alerts.push({ rowId: row.id, medName: row.medicine ?? "", allergen: allergies[ai] });
        break;
      }
    }
  }
  return alerts;
}

function tokenizeKeywords(input) {
  return input.
  toLowerCase().
  split(/[^a-z0-9]+/g).
  map((token) => token.trim()).
  filter((token) => token.length >= 3);
}

function bestMatchPercent(option, candidates) {
  const optionTokens = tokenizeKeywords(option);
  if (optionTokens.length === 0 || candidates.length === 0) return 0;

  let best = 0;
  for (const candidate of candidates) {
    const candidateTokens = tokenizeKeywords(candidate);
    if (candidateTokens.length === 0) continue;
    const overlap = candidateTokens.filter((token) => optionTokens.includes(token)).length;
    const score = Math.round(overlap / candidateTokens.length * 100);
    if (score > best) best = score;
  }
  return best;
}

function hasFilledPrimaryValue(rows, primaryKey) {
  return rows.some((row) => (row[primaryKey] ?? "").trim().length > 0);
}

export function RxPadFunctional({ patientId = "__patient__", sectionConfig }) {
  const { lastCopyRequest, publishSignal, patientAllergies, pushHistoricalUpdates, copyAllAuraActive } = useRxPadSync();
  const copyAllAuraActiveRef = useRef(copyAllAuraActive);
  useEffect(() => {copyAllAuraActiveRef.current = copyAllAuraActive;}, [copyAllAuraActive]);
  const { isV0Mode } = useV0Mode();

  // Per-module voice dictation — tracks which module currently owns the
  // inline recorder (only one active at a time). Clicking a module's mic
  // icon sets its id here; clicking again (or cancel/submit) clears it.
  // Full transcript-to-rows shaping arrives in the next phase; today's
  // cancel/submit both collapse the inline recorder back to the search row.
  const [voiceModuleId, setVoiceModuleId] = useState(null);

  // Grounding — row IDs whose primary "name" cell was filled by a copy
  // payload but hasn't been confirmed against the drug / lab DB yet.
  // Shared across modules (IDs are unique). Cleared per-row when the
  // doctor selects an option from the dropdown for that cell.
  const [ungroundedRowIds, setUngroundedRowIds] = useState(() => new Set());
  const groundRow = useCallback((rowId) => {
    setUngroundedRowIds((prev) => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }, []);
  const handleVoiceToggle = useCallback((moduleId) => {
    setVoiceModuleId((current) => {
      // If this module is already active, do nothing — the user must
      // use the recorder's Cancel CTA (which triggers a confirmation
      // popup). This prevents accidental stop on re-click.
      if (current === moduleId) return current;
      // If a different module is active, block — only one at a time.
      if (current != null) return current;
      return moduleId;
    });
  }, []);

  // Post-submit processing state — while the "AI is structuring" overlay
  // is visible the recorder is gone and the rows are not yet filled.
  const [voiceModuleProcessing, setVoiceModuleProcessing] = useState(


    null);
  const [voiceAddedCounts, setVoiceAddedCounts] = useState({});

  const handleVoiceSubmit = useCallback((moduleId, _transcript) => {
    // Module-specific mock transcripts — shown in the shiner processing
    // card while the "AI is structuring" overlay is visible. These match
    // the mock data that will be filled into each module.
    const MOCK_TRANSCRIPTS = {
      symptoms: "The patient presents with a moderate headache for the past three days, along with mild nausea for two days and a tightness sensation around the temples.",
      examinations: "Blood pressure is 140 by 90 mmHg, slightly elevated. Neurological examination is normal. ENT examination is also normal.",
      diagnosis: "Tension-type headache, confirmed, present for three days. Stage 1 hypertension, suspected, newly detected today.",
      medication: "I'm prescribing Paracetamol 500 mg to be taken as needed after food for five days, and Telmisartan 40 mg once daily after dinner for thirty days.",
      advice: "Avoid prolonged screen time. Maintain good posture while working at the desk. Follow up in one week if the symptoms persist.",
      lab: "Order a complete blood count, renal function test including KFT, and serum electrolytes to evaluate overall metabolic health.",
      surgery: "Schedule a fundoscopy examination to assess retinal health given the hypertension finding.",
      additionalNotes: "Patient is anxious about the elevated blood pressure reading. Explained that a single reading is not diagnostic. Reassured and advised home monitoring.",
      followUp: "Follow up in one week to recheck blood pressure and review lab results. If headache persists, consider referral to neurology."
    };
    const mockTranscript = MOCK_TRANSCRIPTS[moduleId] ?? _transcript;
    setVoiceModuleProcessing({ moduleId, transcript: mockTranscript });
    window.setTimeout(() => {
      // Module-specific mock data — always filled regardless of what
      // the user actually dictated (demo / POC behaviour).
      const MODULE_LABEL = {
        symptoms: "Symptoms",
        examinations: "Examination",
        diagnosis: "Diagnosis",
        medication: "Medications",
        advice: "Advice",
        lab: "Lab Investigations",
        surgery: "Procedures",
        additionalNotes: "Additional Notes",
        followUp: "Follow-up"
      };

      switch (moduleId) {
        case "symptoms":
          setSymptomRows((prev) => [
          ...prev,
          { id: getRowId("symptoms"), name: "Headache", since: "3 days", status: "Moderate", note: "" },
          { id: getRowId("symptoms"), name: "Mild nausea", since: "2 days", status: "Mild", note: "" },
          { id: getRowId("symptoms"), name: "Tightness around temples", since: "3 days", status: "Moderate", note: "" }]
          );
          break;
        case "examinations":
          setExaminationRows((prev) => [
          ...prev,
          { id: getRowId("exam"), name: "Blood pressure — 140/90 mmHg", note: "Slightly elevated" },
          { id: getRowId("exam"), name: "Neurological examination — Normal", note: "" },
          { id: getRowId("exam"), name: "ENT examination — Normal", note: "" }]
          );
          break;
        case "diagnosis":
          setDiagnosisRows((prev) => [
          ...prev,
          { id: getRowId("diagnosis"), name: "Tension-type headache", since: "3 days", status: "Confirmed", note: "" },
          { id: getRowId("diagnosis"), name: "Stage 1 Hypertension", since: "1 day", status: "Suspected", note: "New finding" }]
          );
          break;
        case "medication":{
            const newMedRows = [
            { id: getRowId("med"), medicine: "Paracetamol 500mg", unitPerDose: "1", frequency: "SOS", when: "After food", duration: "5 days", note: "" },
            { id: getRowId("med"), medicine: "Telmisartan 40mg", unitPerDose: "1", frequency: "0-0-1", when: "After dinner", duration: "30 days", note: "" }];

            setMedicationRows((prev) => [...prev, ...newMedRows]);
            setUngroundedRowIds((prev) => {
              const next = new Set(prev);
              for (const r of newMedRows) next.add(r.id);
              return next;
            });
            break;
          }
        case "advice":
          setAdviceRows((prev) => [
          ...prev,
          { id: getRowId("advice"), advice: "Avoid prolonged screen time", note: "" },
          { id: getRowId("advice"), advice: "Maintain good posture while working", note: "" },
          { id: getRowId("advice"), advice: "Follow-up in 1 week if symptoms persist", note: "" }]
          );
          break;
        case "lab":{
            const newLabRows = [
            { id: getRowId("lab"), investigation: "Complete Blood Count (CBC)", note: "" },
            { id: getRowId("lab"), investigation: "Renal Function Test (KFT)", note: "" },
            { id: getRowId("lab"), investigation: "Serum Electrolytes", note: "" }];

            setLabRows((prev) => [...prev, ...newLabRows]);
            setUngroundedRowIds((prev) => {
              const next = new Set(prev);
              for (const r of newLabRows) next.add(r.id);
              return next;
            });
            break;
          }
        case "surgery":
          setSurgeryRows((prev) => [
          ...prev,
          { id: getRowId("surgery"), name: "Fundoscopy", note: "" }]
          );
          break;
        case "additionalNotes":
          setAdditionalNotes((prev) => prev ? `${prev}\n${mockTranscript}` : mockTranscript);
          break;
        case "followUp":
          setFollowUpNotes((prev) => prev ? `${prev}\n${mockTranscript}` : mockTranscript);
          break;
      }

      setVoiceModuleProcessing(null);

      // Show toast instead of the inline badge
      const label = MODULE_LABEL[moduleId] ?? moduleId;
      tpToast.success(`${label} filled from voice dictation`);

      // Pulse the filled module and snap-scroll to it.
      window.requestAnimationFrame(() => {
        document.querySelectorAll(`[data-rxpad-module="${moduleId}"]`).forEach((el) => {
          el.classList.add("tp-module-just-filled");
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          window.setTimeout(() => el.classList.remove("tp-module-just-filled"), 2000);
        });
      });
    }, 3400);
  }, []);

  // When a module recorder is active we flip the global voice-lock marker
  // on <body>. The existing voice-lock CSS (defined in VoiceRxFlow) freezes
  // every other interactive surface on the page — other Rx modules, search
  // boxes, the "Start Consultation" button in the Dr. Agent panel, the
  // sidebar — and only elements carrying `data-voice-allow` (our recorder
  // card + the module header's mic toggle) stay clickable. This keeps the
  // flow sequential: one dictation at a time.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (voiceModuleId) {
      body.setAttribute("data-voice-lock", "on");
      body.setAttribute("data-voice-module-lock", voiceModuleId);
      return () => {
        body.removeAttribute("data-voice-lock");
        body.removeAttribute("data-voice-module-lock");
      };
    }
    return undefined;
  }, [voiceModuleId]);
  const lastHandledCopyId = useRef(0);
  const symptomInitRef = useRef(false);
  const medInitRef = useRef(false);
  const dxInitRef = useRef(false);
  const symptomCountRef = useRef(0);
  const medCountRef = useRef(0);
  const dxCountRef = useRef(0);

  // Per-patient initial data — first-time entry starts with EMPTY rows so
  // the clinician sees only the catalog suggestions, not a pre-filled table.
  // The seed arrays in PER_PATIENT_RXPAD_DATA stay on the module so other
  // call paths (demos, tests) can still opt into them, but the UI no longer
  // renders them by default. ddxSuggestions (used as AI chip tags inside
  // the search dropdown) are still sourced from the patient record.
  const patientData = PER_PATIENT_RXPAD_DATA[patientId] ?? PER_PATIENT_RXPAD_DATA["__patient__"];
  const ddxSuggestions = patientData.ddxSuggestions;

  const [symptomRows, setSymptomRows] = useState(() => []);
  const [examinationRows, setExaminationRows] = useState(() => []);
  const [diagnosisRows, setDiagnosisRows] = useState(() => []);
  const [medicationRows, setMedicationRows] = useState(() => []);
  const [adviceRows, setAdviceRows] = useState(() => []);
  const [labRows, setLabRows] = useState(() => []);
  const [surgeryRows, setSurgeryRows] = useState(() => []);

  const [additionalNotes, setAdditionalNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  // Referral — a fixed section below Follow-up. Specialty → Doctor (filtered)
  // → date → notes. No template / clear / voice (selection-based, not
  // dictation-friendly). Flows to the printed Rx only; never pushed to the
  // historical sidebar.
  const [referral, setReferral] = useState(defaultReferral);

  // Follow-up template handlers — same `useModuleTemplateHandlers`
  // hook the table-shaped modules (Symptoms, Medications, etc.) use,
  // adapted for the single-row date+notes shape so the doctor can save
  // a recurring follow-up instruction set ("2 weeks, monitor BP, …")
  // and reapply it on the next consultation.
  const followUpTemplateRows = useMemo(
    () => [{ date: followUpDate }],
    [followUpDate]
  );
  const applyFollowUpTemplate = useCallback((rows) => {
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (!r) return;
    if (typeof r.date === "string") setFollowUpDate(r.date);
  }, []);
  const followUpTemplateHandlers = useModuleTemplateHandlers(
    "followUp",
    "Follow-up",
    followUpTemplateRows,
    applyFollowUpTemplate
  );

  // Additional Notes — single free-text module, lives just below
  // Follow-up. Same Template / Save / Erase / Voice chrome as the
  // table modules but the body is a plain textarea (no search, no
  // table rows).
  const additionalNotesTemplateRows = useMemo(
    () => [{ notes: additionalNotes }],
    [additionalNotes]
  );
  const applyAdditionalNotesTemplate = useCallback((rows) => {
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (!r) return;
    if (typeof r.notes === "string") setAdditionalNotes(r.notes);
  }, []);
  const additionalNotesTemplateHandlers = useModuleTemplateHandlers(
    "additionalNotes",
    "Additional Notes",
    additionalNotesTemplateRows,
    applyAdditionalNotesTemplate
  );
  const additionalNotesHasContent = Boolean(additionalNotes.trim());
  const followUpHasContent = Boolean(followUpDate);

  // Hoisted above the publisher effect because the effect's dep array
  // references `customModules`. Re-used by the layout-config block below.
  const customModules = useCustomModules();

  // ── Live Rx-preview snapshot publisher ────────────────────────────
  // Re-compose and broadcast a snapshot every time any RxPad form
  // value changes — the Rx Preview sidebar and End Visit page subscribe
  // to this store and re-render in lockstep with the form. Custom-module
  // rows live in localStorage, so we additionally listen to the
  // "rxpad:custom-rows-changed" event dispatched by saveCustomRows().
  const [customRowsBumper, setCustomRowsBumper] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = (e) => {
      if (e?.detail?.patientId && e.detail.patientId !== patientId) return;
      setCustomRowsBumper((n) => n + 1);
    };
    window.addEventListener("rxpad:custom-rows-changed", onChange);
    return () => window.removeEventListener("rxpad:custom-rows-changed", onChange);
  }, [patientId]);

  useEffect(() => {
    const symptomItems = symptomRows.
    filter((r) => (r.name ?? "").trim()).
    map((r) => ({
      title: r.name.trim(),
      metaParts: [r.since, r.status, r.note].
      map((p) => (p ?? "").trim()).
      filter(Boolean)
    }));
    const examItems = examinationRows.
    filter((r) => (r.name ?? "").trim()).
    map((r) => ({
      title: r.name.trim(),
      metaParts: [r.note].map((p) => (p ?? "").trim()).filter(Boolean)
    }));
    const dxItems = diagnosisRows.
    filter((r) => (r.name ?? "").trim()).
    map((r) => ({
      title: r.name.trim(),
      metaParts: [r.since, r.status, r.note].
      map((p) => (p ?? "").trim()).
      filter(Boolean)
    }));
    const medItems = medicationRows.
    filter((r) => (r.medicine ?? "").trim()).
    map((r) => ({
      title: r.medicine.trim(),
      metaParts: [r.unitPerDose, r.frequency, r.when, r.duration, r.note].
      map((p) => (p ?? "").trim()).
      filter(Boolean)
    }));
    const adviceItems = adviceRows.
    filter((r) => (r.advice ?? "").trim()).
    map((r) => ({
      title: r.advice.trim(),
      metaParts: [r.note].map((p) => (p ?? "").trim()).filter(Boolean)
    }));
    const labItems = labRows.
    filter((r) => (r.investigation ?? "").trim()).
    map((r) => ({
      title: r.investigation.trim(),
      metaParts: [r.note].map((p) => (p ?? "").trim()).filter(Boolean)
    }));
    const surgeryItems = surgeryRows.
    filter((r) => (r.surgery ?? "").trim()).
    map((r) => ({
      title: r.surgery.trim(),
      metaParts: [r.note].map((p) => (p ?? "").trim()).filter(Boolean)
    }));

    const customSnapshots = (customModules ?? []).
    map((mod) => {
      const rows = loadCustomRows(patientId, mod.id) ?? [];
      const primaryKey = mod.fields?.[0]?.id;
      const items = rows.
      filter((r) => primaryKey && (r[primaryKey] ?? "").toString().trim()).
      map((r) => ({
        title: (r[primaryKey] ?? "").toString().trim(),
        metaParts: (mod.fields ?? []).
        slice(1).
        map((f) => (r[f.id] ?? "").toString().trim()).
        filter(Boolean)
      }));
      return { id: mod.id, title: mod.name, rows: items };
    }).
    filter((m) => m.rows.length);

    const snapshot = {
      patientId,
      updatedAt: new Date().toISOString(),
      symptoms: symptomItems,
      examinations: examItems,
      diagnoses: dxItems,
      medications: medItems,
      advice: adviceItems,
      labInvestigations: labItems,
      surgeries: surgeryItems,
      customModules: customSnapshots,
      followUp: followUpNotes ?? "",
      followUpDate: followUpDate ?? "",
      additionalNotes: additionalNotes ?? "",
      // Resolved labels (or null) so the print/preview can render directly.
      referral: resolveReferral(referral)
    };
    saveRxPreviewSnapshot(patientId, snapshot);
  }, [
  patientId,
  symptomRows,
  examinationRows,
  diagnosisRows,
  medicationRows,
  adviceRows,
  labRows,
  surgeryRows,
  followUpDate,
  followUpNotes,
  additionalNotes,
  referral,
  customModules,
  customRowsBumper]
  );

  useEffect(() => {
    if (!symptomInitRef.current) {
      symptomInitRef.current = true;
      symptomCountRef.current = symptomRows.length;
      return;
    }

    const currentCount = symptomRows.length;
    const previousCount = symptomCountRef.current;
    symptomCountRef.current = currentCount;
    if (currentCount <= previousCount) return;

    const latest = symptomRows[currentCount - 1]?.name?.trim();
    publishSignal({
      type: "symptoms_changed",
      label: latest || "Symptoms updated",
      count: currentCount
    });
  }, [symptomRows, publishSignal]);

  useEffect(() => {
    if (!medInitRef.current) {
      medInitRef.current = true;
      medCountRef.current = medicationRows.length;
      return;
    }

    const currentCount = medicationRows.length;
    const previousCount = medCountRef.current;
    medCountRef.current = currentCount;
    if (currentCount <= previousCount) return;

    const latest = medicationRows[currentCount - 1]?.medicine?.trim();
    publishSignal({
      type: "medications_changed",
      label: latest || "Medication updated",
      count: currentCount
    });
  }, [medicationRows, publishSignal]);

  useEffect(() => {
    if (!dxInitRef.current) {
      dxInitRef.current = true;
      dxCountRef.current = diagnosisRows.length;
      return;
    }

    const currentCount = diagnosisRows.length;
    const previousCount = dxCountRef.current;
    dxCountRef.current = currentCount;
    if (currentCount <= previousCount) return;

    const latest = diagnosisRows[currentCount - 1]?.name?.trim();
    publishSignal({
      type: "diagnosis_changed",
      label: latest || "Diagnosis updated",
      count: currentCount
    });
  }, [diagnosisRows, publishSignal]);

  /* Medication allergy alerts — recomputed when meds or allergies change */
  const medicationAlerts = useMemo(
    () => checkMedicationAlerts(medicationRows, patientAllergies),
    [medicationRows, patientAllergies]
  );

  /* Drug-drug interaction check for medication table */
  const tableInteractions = useMemo(
    () => checkTableInteractions(medicationRows),
    [medicationRows]
  );
  const interactionRowIds = useMemo(
    () => new Set(tableInteractions.map((t) => t.rowId)),
    [tableInteractions]
  );
  const hasFilledSymptoms = useMemo(
    () => hasFilledPrimaryValue(symptomRows, "name"),
    [symptomRows]
  );
  const hasFilledDiagnosis = useMemo(
    () => hasFilledPrimaryValue(diagnosisRows, "name"),
    [diagnosisRows]
  );
  const hasFilledMedication = useMemo(
    () => hasFilledPrimaryValue(medicationRows, "medicine"),
    [medicationRows]
  );
  const hasFilledAdvice = useMemo(
    () => hasFilledPrimaryValue(adviceRows, "advice"),
    [adviceRows]
  );

  /* Existing med names for search dropdown interaction check */
  const existingMedNames = useMemo(
    () => medicationRows.map((r) => (r.medicine ?? "").trim()).filter(Boolean),
    [medicationRows]
  );

  useEffect(() => {
    if (!lastCopyRequest || lastHandledCopyId.current === lastCopyRequest.id) return;
    lastHandledCopyId.current = lastCopyRequest.id;
    const payload = lastCopyRequest.payload;

    const sourceLabel = payload.sourceDateLabel ?? "Dr. Agent";

    function parseCopyString(str) {
      const match = str.match(/^(.+?)\s*\((.+)\)$/);
      if (!match) return { name: str.trim(), parts: [] };
      const detail = match[2];
      const parts = detail.includes("|")
        ? detail.split("|").map((s) => s.trim()).filter(Boolean)
        : detail.split(",").map((s) => s.trim()).filter(Boolean);
      return { name: match[1].trim(), parts };
    }

    const symptomsList = payload.symptoms ?? [];
    if (symptomsList.length) {
      setSymptomRows((prev) => [
      ...prev,
      ...symptomsList.map((item) => {
        const { name, parts } = parseCopyString(item);
        return { id: getRowId("symptoms"), name, since: parts[0] ?? "", status: parts[1] ?? "", note: parts[2] ?? "" };
      })]
      );
    }
    const examinationsList = payload.examinations ?? [];
    if (examinationsList.length) {
      setExaminationRows((prev) => [
      ...prev,
      ...examinationsList.map((item) => {
        const { name, parts } = parseCopyString(item);
        return { id: getRowId("exam"), name, note: parts[0] ?? "" };
      })]
      );
    }
    const diagnosesList = payload.diagnoses ?? [];
    if (diagnosesList.length) {
      setDiagnosisRows((prev) => [
      ...prev,
      ...diagnosesList.map((item) => {
        const { name, parts } = parseCopyString(item);
        return { id: getRowId("diagnosis"), name, since: parts[0] ?? "", status: parts[1] ?? "", note: parts[2] ?? "" };
      })]
      );
    }
    const medicationsList = payload.medications ?? [];
    if (medicationsList.length) {
      const newMedRows = medicationsList.map((item) => ({
        id: getRowId("med"),
        medicine: item.medicine,
        unitPerDose: item.unitPerDose,
        frequency: item.frequency,
        when: item.when,
        duration: item.duration,
        note: item.note || `From ${sourceLabel}`
      }));
      setMedicationRows((prev) => [...prev, ...newMedRows]);
      // Mark each new medicine row as ungrounded — the doctor needs
      // to pick a DB-backed option from the dropdown to confirm the
      // exact formulary entry before this row is treated as canonical.
      setUngroundedRowIds((prev) => {
        const next = new Set(prev);
        for (const r of newMedRows) next.add(r.id);
        return next;
      });
    }
    const labInvestigationsList = payload.labInvestigations ?? [];
    if (labInvestigationsList.length) {
      const newLabRows = labInvestigationsList.map((item) => ({
        id: getRowId("lab"),
        investigation: item,
        note: `From ${sourceLabel}`
      }));
      setLabRows((prev) => [...prev, ...newLabRows]);
      setUngroundedRowIds((prev) => {
        const next = new Set(prev);
        for (const r of newLabRows) next.add(r.id);
        return next;
      });
    }
    if (payload.advice) {
      // Accept three shapes:
      //   string                         → whole text goes to `advice`
      //   { name, notes }                → split across columns
      //   Array of strings/objects        → one row per entry
      const rawEntries = Array.isArray(payload.advice) ? payload.advice : [payload.advice];
      const newRows = rawEntries
        .map((entry) => {
          if (typeof entry === "object" && entry !== null) {
            const adviceText = entry.name ?? entry.label ?? "";
            const notesText = entry.notes ?? entry.detail ?? "";
            if (!adviceText && !notesText) return null;
            return {
              id: getRowId("advice"),
              advice: adviceText,
              note: notesText || `From ${sourceLabel}`
            };
          }
          const text = String(entry ?? "").trim();
          if (!text) return null;
          // Try to parse "Name (notes)" out of plain strings so even
          // legacy single-string callers populate the right columns.
          const m = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
          if (m) {
            return {
              id: getRowId("advice"),
              advice: m[1].trim(),
              note: m[2].trim()
            };
          }
          return {
            id: getRowId("advice"),
            advice: text,
            note: `From ${sourceLabel}`
          };
        })
        .filter(Boolean);
      if (newRows.length) {
        setAdviceRows((prev) => [...prev, ...newRows]);
      }
    }
    if (payload.followUpDate) {
      setFollowUpDate(payload.followUpDate);
    }
    if (payload.followUpNotes) {
      setFollowUpNotes(payload.followUpNotes);
    } else if (payload.targetSection === "followUp" && payload.additionalNotes) {
      setFollowUpNotes(payload.additionalNotes);
    } else if (payload.followUp) {
      setFollowUpNotes(payload.followUp);
    }
    if (payload.additionalNotes) {
      setAdditionalNotes(payload.additionalNotes);
    }

    const histBatch = buildHistoricalUpdatesFromPayload(payload);
    const histBatchKeys = Object.keys(histBatch);
    if (histBatchKeys.length) {
      const copyId = lastCopyRequest.id;
      const enriched = {};
      for (const key of histBatchKeys) {
        const arr = histBatch[key];
        if (!arr) continue;
        enriched[key] = arr.map((c) => ({
          ...c,
          sourceCopyId: copyId,
          undoPayload: payload
        }));
      }
      pushHistoricalUpdates(enriched);

      // Per-section copy (NOT a bulk Copy-all): pop the corresponding
      // sidebar tab open so the doctor lands on the section that just
      // received new content. Bobble + red dot get ~700ms to play
      // before the focus signal acknowledges and clears them.
      if (!copyAllAuraActiveRef.current && histBatchKeys.length === 1) {
        const targetNav = histBatchKeys[0];
        window.setTimeout(() => {
          publishSignal({ type: "section_focus", sectionId: targetNav });
        }, 700);
      }
    }

    // Brief AI-gradient pulse on each filled section — gives the
    // doctor a clear "this just got new data" visual confirmation
    // alongside the toast. Selectors map payload fields to the
    // RxPadFunctional module-data attributes used in the DOM tree.
    const filledModules = [];
    if (payload.symptoms?.length) filledModules.push("symptoms");
    if (payload.examinations?.length) filledModules.push("examinations");
    if (payload.diagnoses?.length) filledModules.push("diagnosis");
    if (payload.medications?.length) filledModules.push("medication");
    if (payload.advice) filledModules.push("advice");
    if (payload.labInvestigations?.length) filledModules.push("lab");
    if (payload.followUp || payload.followUpDate) filledModules.push("followUp");
    if (payload.additionalNotes) filledModules.push("additionalNotes");
    if (typeof window !== "undefined" && filledModules.length) {
      // When a "Copy all to RxPad" is firing the edge aura is doing
      // the work — skip the per-module pulses so the doctor sees one
      // single coordinated signal, not every section flashing at
      // once. Single-section / single-item copies still get the ring.
      const isBulkAura = copyAllAuraActiveRef.current;
      if (!isBulkAura) {
        const flashed = [];
        filledModules.forEach((key) => {
          document.querySelectorAll(`[data-rxpad-module="${key}"]`).forEach((el) => {
            el.classList.add("tp-module-just-filled");
            flashed.push(el);
          });
        });
        // Snap-scroll to the FIRST affected module so the doctor's eye
        // lands on the new data without searching for it.
        const firstTarget = flashed[0];
        if (firstTarget) {
          firstTarget.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        window.setTimeout(() => {
          flashed.forEach((el) => el.classList.remove("tp-module-just-filled"));
        }, 2000);
      }
    }

    tpToast.success(`Filled in your Rx from ${payload.sourceDateLabel}`);
  }, [lastCopyRequest, pushHistoricalUpdates, publishSignal]);

  // ── Consume pending copies from sessionStorage (homepage → RxPad navigation) ──
  const pendingCopyConsumedRef = useRef(false);
  useEffect(() => {
    if (pendingCopyConsumedRef.current) return;
    pendingCopyConsumedRef.current = true;
    try {
      const raw = sessionStorage.getItem("pendingRxPadCopy");
      if (!raw) return;
      sessionStorage.removeItem("pendingRxPadCopy");
      const payloads = JSON.parse(raw);
      for (const p of payloads) {
        if (p.symptoms && Array.isArray(p.symptoms)) {
          setSymptomRows((prev) => [...prev, ...p.symptoms.map((s) => ({ id: getRowId("symptoms"), name: s, since: "1 day", status: "Moderate", note: `From ${p.sourceDateLabel ?? "Dr. Agent"}` }))]);
        }
        if (p.examinations && Array.isArray(p.examinations)) {
          setExaminationRows((prev) => [...prev, ...p.examinations.map((s) => ({ id: getRowId("exam"), name: s, note: `From ${p.sourceDateLabel ?? "Dr. Agent"}` }))]);
        }
        if (p.diagnoses && Array.isArray(p.diagnoses)) {
          setDiagnosisRows((prev) => [...prev, ...p.diagnoses.map((s) => ({ id: getRowId("diagnosis"), name: s, since: "1 day", status: "Suspected", note: `From ${p.sourceDateLabel ?? "Dr. Agent"}` }))]);
        }
        if (p.labInvestigations && Array.isArray(p.labInvestigations)) {
          setLabRows((prev) => [...prev, ...p.labInvestigations.map((s) => ({ id: getRowId("lab"), investigation: s, note: `From ${p.sourceDateLabel ?? "Dr. Agent"}` }))]);
        }
        const label = typeof p.sourceDateLabel === "string" ? p.sourceDateLabel : "Dr. Agent";
        const pendingHist = {
          sourceDateLabel: label,
          symptoms: Array.isArray(p.symptoms) ? p.symptoms : undefined,
          examinations: Array.isArray(p.examinations) ? p.examinations : undefined,
          diagnoses: Array.isArray(p.diagnoses) ? p.diagnoses : undefined,
          labInvestigations: Array.isArray(p.labInvestigations) ? p.labInvestigations : undefined
        };
        const histFromPending = buildHistoricalUpdatesFromPayload(pendingHist);
        if (Object.keys(histFromPending).length) {
          pushHistoricalUpdates(histFromPending);
        }
      }
      if (payloads.length > 0) {
        tpToast.success("Pre-populated from Dr. Agent");
      }
    } catch {/* ignore parse errors */}
  }, [pushHistoricalUpdates]);

  function setFollowUpByOffset(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const iso = date.toISOString().slice(0, 10);
    setFollowUpDate(iso);
  }

  const symptomsColumns = useMemo(
    () => [
    {
      key: "name",
      label: "SYMPTOMS NAME",
      width: 275,
      minWidth: 220,
      maxWidth: 320,
      placeholder: "e.g. Fever",
      showDropdownToggle: false,
      getOptions: (query) => getCatalogOptions(symptomSuggestions, query)
    },
    {
      key: "since",
      label: "SINCE",
      width: 130,
      minWidth: 120,
      maxWidth: 140,
      placeholder: "e.g. 2 days",
      getOptions: (query, row) => getSinceOptions(getSeedQuery(query, row.since ?? "")),
      restrictToOptions: true
    },
    {
      key: "status",
      label: "STATUS",
      width: 150,
      minWidth: 135,
      maxWidth: 170,
      placeholder: "e.g. Moderate",
      getOptions: (query) => filterByQuery(["Severe", "Moderate", "Mild"], query),
      restrictToOptions: true
    },
    { key: "note", label: "NOTE", width: 180, minWidth: 140, maxWidth: 220, multiline: true, maxLines: 2, placeholder: "Notes" }],

    []
  );

  const examinationsColumns = useMemo(
    () => [
    {
      key: "name",
      label: "EXAMINATION NAME",
      width: 300,
      minWidth: 240,
      maxWidth: 360,
      placeholder: "e.g. Left knee tenderness",
      showDropdownToggle: false,
      getOptions: (query) => getCatalogOptions(examinationSuggestions, query)
    },
    { key: "note", label: "NOTE", width: 180, minWidth: 140, maxWidth: 220, multiline: true, maxLines: 2, placeholder: "Notes" }],

    []
  );

  const diagnosisColumns = useMemo(
    () => [
    {
      key: "name",
      label: "DIAGNOSIS NAME",
      width: 300,
      minWidth: 240,
      maxWidth: 360,
      placeholder: "e.g. Viral pharyngitis",
      showDropdownToggle: false,
      getOptions: (query) => getCatalogOptions(diagnosisSuggestions, query)
    },
    {
      key: "since",
      label: "SINCE",
      width: 130,
      minWidth: 120,
      maxWidth: 140,
      placeholder: "e.g. 2 days",
      getOptions: (query, row) => getSinceOptions(getSeedQuery(query, row.since ?? "")),
      restrictToOptions: true
    },
    {
      key: "status",
      label: "STATUS",
      width: 150,
      minWidth: 135,
      maxWidth: 170,
      placeholder: "e.g. Suspected",
      getOptions: (query) => filterByQuery(["Suspected", "Ruled Out", "Confirmed"], query),
      restrictToOptions: true
    },
    { key: "note", label: "NOTE", width: 180, minWidth: 140, maxWidth: 220, multiline: true, maxLines: 2, placeholder: "Notes" }],

    []
  );

  const medicationColumns = useMemo(
    () => [
    {
      key: "medicine",
      label: "MEDICINE NAME",
      width: 240,
      minWidth: 200,
      maxWidth: 300,
      multiline: true,
      maxLines: 2,
      placeholder: "e.g. Paracetamol 650mg",
      showDropdownToggle: false,
      getOptions: (query) => getCatalogOptions(medicationSuggestions, query)
    },
    {
      key: "unitPerDose",
      label: "UNIT PER DOSE",
      width: 140,
      minWidth: 120,
      maxWidth: 160,
      placeholder: "e.g. 1 tablet",
      getOptions: (query) => getMedicationUnitOptions(query),
      restrictToOptions: true
    },
    {
      key: "frequency",
      label: "FREQUENCY",
      width: 150,
      minWidth: 130,
      maxWidth: 170,
      placeholder: "e.g. 1-0-1",
      getOptions: (query) => getFrequencyOptions(query),
      restrictToOptions: true
    },
    {
      key: "when",
      label: "WHEN",
      width: 150,
      minWidth: 120,
      maxWidth: 180,
      placeholder: "e.g. After Food",
      getOptions: (query) => filterByQuery(MEDICATION_WHEN_OPTIONS, query),
      restrictToOptions: true
    },
    {
      key: "duration",
      label: "DURATION",
      width: 150,
      minWidth: 130,
      maxWidth: 190,
      placeholder: "e.g. 5 days",
      getOptions: (query, row) => getDurationOptions(getSeedQuery(query, row.duration ?? ""))
    },
    { key: "note", label: "NOTE", width: 190, minWidth: 150, maxWidth: 240, multiline: true, maxLines: 2, placeholder: "Notes" }],

    []
  );

  const adviceColumns = useMemo(
    () => [
    {
      key: "advice",
      label: "ADVICE NAME",
      width: 420,
      minWidth: 320,
      maxWidth: 560,
      multiline: true,
      maxLines: 3,
      placeholder: "e.g. Drink warm water",
      showDropdownToggle: false,
      getOptions: (query) => getCatalogOptions(ADVICE_SUGGESTIONS, query)
    },
    { key: "note", label: "NOTE", width: 220, minWidth: 160, maxWidth: 260, multiline: true, maxLines: 2, placeholder: "Notes" }],

    []
  );

  const labColumns = useMemo(
    () => [
    {
      key: "investigation",
      label: "INVESTIGATION NAME",
      width: 420,
      minWidth: 320,
      maxWidth: 560,
      multiline: true,
      maxLines: 2,
      placeholder: "e.g. Complete blood count",
      showDropdownToggle: false,
      getOptions: (query) => getCatalogOptions(LAB_INVESTIGATION_BASE_OPTIONS, query)
    },
    { key: "note", label: "NOTE", width: 220, minWidth: 160, maxWidth: 260, multiline: true, maxLines: 2, placeholder: "Notes" }],

    []
  );

  const surgeryColumns = useMemo(
    () => [
    {
      key: "surgery",
      label: "SURGERY NAME",
      width: 420,
      minWidth: 320,
      maxWidth: 560,
      multiline: true,
      maxLines: 2,
      placeholder: "e.g. Laparoscopic appendectomy",
      showDropdownToggle: false,
      getOptions: (query) => getCatalogOptions(SURGERY_SUGGESTIONS, query)
    },
    { key: "note", label: "NOTE", width: 220, minWidth: 160, maxWidth: 260, multiline: true, maxLines: 2, placeholder: "Notes" }],

    []
  );

  // Layout config — prefer the global customise store, fall back to the
  // prop (for backwards-compat with any caller still passing it directly)
  // and finally the static default.
  const rxConfigFromStore = useRxSectionConfig();
  const { openDrawer: openCustomModulesDrawer } = useCustomModulesDrawer();
  const liveConfig = sectionConfig ?? (rxConfigFromStore.length ? rxConfigFromStore : DEFAULT_SECTION_CONFIG);
  const activeSections = liveConfig.filter((s) => s.enabled);

  function renderSection(id) {
    if (typeof id === "string" && id.startsWith("custom:")) {
      const moduleId = id.slice("custom:".length);
      const moduleDef = customModules.find((m) => m.id === moduleId);
      if (!moduleDef) return null;
      // Use the full `custom:<id>` as the voice key so the per-module
      // recording state in `voiceModuleId` doesn't collide with built-in
      // module ids (`symptoms`, `examinations`, …).
      return (
        <CustomModuleTable
          key={id}
          patientId={patientId}
          moduleDef={moduleDef}
          onVoiceClick={() => handleVoiceToggle(id)}
          onVoiceClose={() => setVoiceModuleId(null)}
          voiceActive={voiceModuleId === id}
          onVoiceSubmit={(t) => handleVoiceSubmit(id, t)}
          voiceProcessingTranscript={
            voiceModuleProcessing?.moduleId === id
              ? voiceModuleProcessing.transcript
              : undefined
          } />);


    }
    switch (id) {
      case "symptoms":
        return (
          <EditableTableModule
            key="symptoms"
            id="symptoms"
            moduleDataAttr="symptoms"
            title="Symptoms"
            templateModuleId="symptoms"
            templateModuleName="Symptoms"
            icon={<TPMedicalIcon name="Virus" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={symptomsColumns}
            primaryKey="name"
            rows={symptomRows}
            onChangeRows={setSymptomRows}
            onVoiceClick={() => handleVoiceToggle("symptoms")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "symptoms"}
            onVoiceSubmit={(t) => handleVoiceSubmit("symptoms", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "symptoms" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["symptoms"]}
            searchPlaceholder="Search & Add Symptoms"
            searchSuggestions={symptomSuggestions}
            cannedChips={symptomSuggestions.slice(0, 12)}
            afterSearch={
            !isV0Mode && hasFilledSymptoms ?
            <AiTriggerChip
              label="Suggest DDX"
              signalLabel="Generate differential diagnosis based on current symptoms"
              sectionId="symptoms"
              onAfterClick={() => {
                setTimeout(() => {
                  document.querySelector('[data-rxpad-module="diagnosis"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
              }} /> :

            null
            } />);


      case "examinations":
        return (
          <EditableTableModule
            key="examinations"
            id="examinations"
            moduleDataAttr="examinations"
            title="Examinations"
            templateModuleId="examinations"
            templateModuleName="Examinations"
            icon={<TPMedicalIcon name="medical service" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={examinationsColumns}
            primaryKey="name"
            rows={examinationRows}
            onChangeRows={setExaminationRows}
            onVoiceClick={() => handleVoiceToggle("examinations")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "examinations"}
            onVoiceSubmit={(t) => handleVoiceSubmit("examinations", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "examinations" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["examinations"]}
            searchPlaceholder="Search & Add Examinations"
            searchSuggestions={examinationSuggestions}
            cannedChips={examinationSuggestions.slice(0, 12)} />);


      case "diagnosis":
        return (
          <EditableTableModule
            key="diagnosis"
            id="diagnosis"
            title="Diagnosis"
            templateModuleId="diagnosis"
            templateModuleName="Diagnosis"
            icon={<TPMedicalIcon name="Diagnosis" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={diagnosisColumns}
            primaryKey="name"
            rows={diagnosisRows}
            onChangeRows={setDiagnosisRows}
            onVoiceClick={() => handleVoiceToggle("diagnosis")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "diagnosis"}
            onVoiceSubmit={(t) => handleVoiceSubmit("diagnosis", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "diagnosis" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["diagnosis"]}
            searchPlaceholder="Search & Add Diagnosis"
            searchSuggestions={diagnosisSuggestions}
            cannedChips={diagnosisSuggestions.slice(0, 12)}
            moduleDataAttr="diagnosis"
            getOptionTag={(option) => {
              const score = bestMatchPercent(option, ddxSuggestions);
              if (score < 50) return null;
              return (
                <TPTooltip
                  title={`AI relevance: ${score}% match against differential diagnosis suggestions from symptoms.`}
                  placement="top"
                  arrow>
                  
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                    style={{
                      background: "linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.14) 50%, rgba(26,25,148,0.14) 100%)",
                      border: "1px solid rgba(103,58,172,0.15)",
                      color: "var(--tp-violet-700, #6D28D9)"
                    }}>
                    
                    DDx {score}% match
                  </span>
                </TPTooltip>);

            }}
            afterSearch={
            !isV0Mode && hasFilledDiagnosis ?
            <AiTriggerChip
              label="Suggest lab tests"
              signalLabel="Suggest lab investigations based on diagnosis"
              sectionId="diagnosis" /> :

            null
            } />);


      case "medication":
        return (
          <EditableTableModule
            key="medication"
            id="medication"
            moduleDataAttr="medication"
            title="Medication (Rx)"
            templateModuleId="medication"
            templateModuleName="Medication"
            icon={<TPMedicalIcon name="Tablets" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={medicationColumns}
            primaryKey="medicine"
            rows={medicationRows}
            onChangeRows={setMedicationRows}
            onVoiceClick={() => handleVoiceToggle("medication")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "medication"}
            onVoiceSubmit={(t) => handleVoiceSubmit("medication", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "medication" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["medication"]}
            searchPlaceholder="Search & Add Medication (Rx)"
            searchSuggestions={medicationSuggestions}
            getOptionTag={(option) => {
              const hit = checkDrugInteraction(option, existingMedNames);
              return hit ?
              <TPTooltip
                title={`Potential interaction with ${hit.interactsWith}. Review before prescribing.`}
                placement="top"
                arrow>
                
                  <span
                  className="shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                  style={{
                    background: "linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.14) 50%, rgba(26,25,148,0.14) 100%)",
                    border: "1px solid rgba(103,58,172,0.15)",
                    color: "var(--tp-violet-700, #6D28D9)"
                  }}>
                  
                    DDI match
                  </span>
                </TPTooltip> :
              null;
            }}
            highlightedRowIds={interactionRowIds}
            highlightedRowTooltips={Object.fromEntries(tableInteractions.map((t) => [t.rowId, `⚠ ${t.description} — interacts with ${t.interactsWith}`]))}
            groundedKey="medicine"
            ungroundedRowIds={ungroundedRowIds}
            onGroundRow={groundRow}
            // Inventory-aware dropdown row: surfaces MOG / VC source, stock
            // status, and an inline "Show alternatives" expansion for low /
            // out-of-stock items.
            renderSearchRow={MedicationSearchRow}
            // In-cell adornment: small stock chip + "Find alt." trigger that
            // opens a popover of in-stock alternatives anchored to the cell.
            renderCellOverlay={({ value, onSelect }) =>
              <MedicationCellInventory value={value} onSelect={onSelect} />
            }
            cannedChips={[
            "Paracetamol 650mg",
            "Amoxicillin 500mg",
            "Pantoprazole 40mg",
            "Cetirizine 10mg",
            "Ondansetron 4mg",
            "ORS Sachet",
            "Multivitamin",
            "Ibuprofen 400mg"]
            }
            afterSearch={
            !isV0Mode && hasFilledMedication ?
            <AiTriggerChip
              label="Check interactions"
              signalLabel="Check drug interactions for current medications"
              sectionId="medication" /> :

            null
            } />);


      case "advice":
        return (
          <EditableTableModule
            key="advice"
            id="advice"
            moduleDataAttr="advice"
            title="Advices"
            templateModuleId="advice"
            templateModuleName="Advices"
            icon={<TPMedicalIcon name="health care" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={adviceColumns}
            primaryKey="advice"
            rows={adviceRows}
            onChangeRows={setAdviceRows}
            onVoiceClick={() => handleVoiceToggle("advice")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "advice"}
            onVoiceSubmit={(t) => handleVoiceSubmit("advice", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "advice" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["advice"]}
            searchPlaceholder="Search & Add Advice"
            cannedChips={ADVICE_SUGGESTIONS}
            afterSearch={
            !isV0Mode && hasFilledAdvice ?
            <AiTriggerChip
              label="Translate advice"
              signalLabel="Translate advice to patient's language"
              sectionId="advice" /> :

            null
            } />);


      case "lab":
        return (
          <EditableTableModule
            key="lab"
            id="lab"
            moduleDataAttr="lab"
            title="Lab Investigation"
            templateModuleId="lab"
            templateModuleName="Lab Investigation"
            icon={<TPMedicalIcon name="Test Tube" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={labColumns}
            primaryKey="investigation"
            rows={labRows}
            onChangeRows={setLabRows}
            onVoiceClick={() => handleVoiceToggle("lab")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "lab"}
            onVoiceSubmit={(t) => handleVoiceSubmit("lab", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "lab" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["lab"]}
            searchPlaceholder="Search & Add Lab Investigation"
            cannedChips={LAB_INVESTIGATION_BASE_OPTIONS}
            groundedKey="investigation"
            ungroundedRowIds={ungroundedRowIds}
            onGroundRow={groundRow}
            getOptionTag={(option) => {
              const score = bestMatchPercent(
                option,
                diagnosisRows.map((row) => (row.name ?? "").trim()).filter(Boolean)
              );
              if (score < 40) return null;
              return (
                <TPTooltip
                  title={`AI relevance: ${score}% match with current diagnosis list.`}
                  placement="top"
                  arrow>
                  
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                    style={{
                      background: "linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.14) 50%, rgba(26,25,148,0.14) 100%)",
                      border: "1px solid rgba(103,58,172,0.15)",
                      color: "var(--tp-violet-700, #6D28D9)"
                    }}>
                    
                    Investigation {score}% match
                  </span>
                </TPTooltip>);

            }}
            afterSearch={
            !isV0Mode && hasFilledDiagnosis ?
            <AiTriggerChip
              label="Suggest investigations"
              signalLabel="Suggest lab investigations based on diagnosis"
              sectionId="lab" /> :

            null
            } />);


      case "surgery":
        return (
          <EditableTableModule
            key="surgery"
            id="surgery"
            title="Surgery"
            templateModuleId="surgery"
            templateModuleName="Surgery"
            icon={<TPMedicalIcon name="surgical-scissors-02" variant="bulk" size={24} color="var(--tp-violet-500)" />}
            columns={surgeryColumns}
            primaryKey="surgery"
            rows={surgeryRows}
            onChangeRows={setSurgeryRows}
            onVoiceClick={() => handleVoiceToggle("surgery")}
            onVoiceClose={() => setVoiceModuleId(null)}
            voiceActive={voiceModuleId === "surgery"}
            onVoiceSubmit={(t) => handleVoiceSubmit("surgery", t)}
            voiceProcessingTranscript={voiceModuleProcessing?.moduleId === "surgery" ? voiceModuleProcessing.transcript : undefined}
            voiceAddedCount={voiceAddedCounts["surgery"]}
            searchPlaceholder="Search & Add Surgery"
            cannedChips={SURGERY_SUGGESTIONS} />);


      default:
        return null;
    }
  }

  return (
    <div className="space-y-4 p-4 max-lg:p-3 [&_input]:[caret-color:var(--tp-blue-500)] [&_textarea]:[caret-color:var(--tp-blue-500)] [&_input]:[caret-width:2px] [&_textarea]:[caret-width:2px]">
      {activeSections.map((s) => renderSection(s.id))}

      {/* "Additional Notes" was retired as a standalone module — anything
           the doctor would have entered there now lives in the Follow-up
           textarea below. AI-extracted `additionalNotes` payload still
           flows in but is routed straight into `followUpNotes`. */}
      {/* Default order: Additional Notes first, Follow-up second.
           The doctor can reorder these in Customise settings. */}
      <div className="grid grid-cols-1 gap-4">
        {/* Additional Notes — always above Follow-up by default */}
        <TPRxPadSection
          title="Additional Notes"
          icon={<Notepad2 size={24} variant="Bulk" color="var(--tp-violet-500)" />}
          showHeaderActions
          moduleId="additionalNotes"
          onVoiceClick={() => handleVoiceToggle("additionalNotes")}
          voiceActive={voiceModuleId === "additionalNotes"}
          onTemplateClick={additionalNotesTemplateHandlers.onTemplateClick}
          onSaveClick={additionalNotesTemplateHandlers.onSaveClick}
          saveDisabled={!additionalNotesHasContent}
          onClearClick={() => setAdditionalNotes("")}
          clearDisabled={!additionalNotesHasContent}>

          {voiceModuleId === "additionalNotes" ?
            <VoiceRxModuleRecorder
              sectionLabel="Additional Notes"
              onCancel={() => setVoiceModuleId(null)}
              onSubmit={(transcript) => {
                setVoiceModuleId(null);
                handleVoiceSubmit("additionalNotes", transcript);
              }}
              radiusClassName="rounded-[14px]" /> :
            null}
          {voiceModuleProcessing?.moduleId === "additionalNotes" ?
            <VoiceRxSectionProcessing transcript={voiceModuleProcessing.transcript} sectionLabel="Additional Notes" /> :
            null}
          <div className={voiceModuleId === "additionalNotes" || voiceModuleProcessing?.moduleId === "additionalNotes" ? "hidden" : ""}>
            <textarea
              value={additionalNotes}
              onChange={(event) => setAdditionalNotes(event.currentTarget.value)}
              rows={4}
              className="w-full rounded-[10px] border border-tp-slate-300 bg-white px-3 py-2 text-[14px] font-['Inter',sans-serif] text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/20"
              placeholder="Add patient-specific notes, observations, or counselling points" />
          </div>
        </TPRxPadSection>

        <TPRxPadSection
          title="Follow-up"
          icon={<Calendar2 size={24} variant="Bulk" color="var(--tp-violet-500)" />}
          showHeaderActions
          onVoiceClick={() => handleVoiceToggle("followUp")}
          voiceActive={voiceModuleId === "followUp"}
          onTemplateClick={followUpTemplateHandlers.onTemplateClick}
          onSaveClick={followUpTemplateHandlers.onSaveClick}
          saveDisabled={!followUpHasContent}
          onClearClick={() => {
            setFollowUpDate("");
          }}
          clearDisabled={!followUpHasContent}>

          {voiceModuleId === "followUp" ?
          <VoiceRxModuleRecorder
            sectionLabel="Follow-up"
            onCancel={() => setVoiceModuleId(null)}
            onSubmit={(transcript) => {
              setVoiceModuleId(null);
              handleVoiceSubmit("followUp", transcript);
            }}
            radiusClassName="rounded-[14px]" /> :
          null}
          {voiceModuleProcessing?.moduleId === "followUp" ?
          <VoiceRxSectionProcessing transcript={voiceModuleProcessing.transcript} sectionLabel="Follow-up" /> :
          null}
          <div className={voiceModuleId === "followUp" || voiceModuleProcessing?.moduleId === "followUp" ? "hidden" : ""}>
          <div className="space-y-2">
            <input
                type="date"
                value={followUpDate}
                onChange={(event) => setFollowUpDate(event.currentTarget.value)}
                className="h-[42px] w-full rounded-[10px] border border-tp-slate-300 bg-white px-3 py-2 text-[14px] font-['Inter',sans-serif] text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-400 focus:border-tp-blue-500 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/20"
                placeholder="Select follow-up date" />

            <div className="flex flex-wrap gap-2">
              {[
                { label: "2 days", days: 2 },
                { label: "1 week", days: 7 },
                { label: "1 month", days: 30 },
                { label: "3 months", days: 90 }].
                map((quick) =>
                <button
                  key={quick.label}
                  type="button"
                  className="rounded-lg border border-tp-blue-200 bg-tp-blue-50 px-3 py-1.5 text-[14px] font-medium font-['Inter',sans-serif] text-tp-blue-600 hover:bg-tp-blue-100"
                  onClick={() => setFollowUpByOffset(quick.days)}>

                  {quick.label}
                </button>
                )}
            </div>
          </div>
          </div>
        </TPRxPadSection>

        {/* Referral — fixed section below Follow-up. Specialty → Doctor →
             date → notes. No template / clear / voice. Prints into the Rx. */}
        <TPRxPadSection
          title="Referral"
          icon={<ReferralIcon size={24} variant="bulk" color="var(--tp-violet-500)" />}
          showHeaderActions={false}
          moduleId="referral">

          <ReferralFields value={referral} onChange={setReferral} />
        </TPRxPadSection>
      </div>

      {/* Add Custom Module CTA — appears at the bottom of the RxPad body
           alongside the Follow-up section. Hidden once the doctor has hit
           the 15-module cap. Opens the same drawer as the in-sheet CTA. */}
      {customModules.length < CUSTOM_MODULE_CAP &&
      <button
        type="button"
        onClick={() => openCustomModulesDrawer()}
        className="flex w-full items-center justify-center gap-[8px] rounded-[14px] border-2 border-dashed border-tp-blue-300 bg-tp-blue-50/30 py-[14px] text-[14px] font-semibold text-tp-blue-500 transition-colors hover:bg-tp-blue-50 active:scale-[0.99]"
        aria-label="Add custom module"
        data-rxpad-add-custom>
        
          <Plus size={18} strokeWidth={2} aria-hidden />
          Add Custom Module
        </button>
      }

    </div>);

}