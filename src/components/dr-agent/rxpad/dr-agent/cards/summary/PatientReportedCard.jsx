import React, { useMemo, useState } from "react";
import { Copy, MessageQuestion } from "iconsax-reactjs";
import { cn, safeClipboardWrite } from "../../../../utils";
import { useTouchDevice } from "../../../../hooks/use-touch-device";
import { CardShell } from "../CardShell";
import { SectionSummaryBar } from "../SectionSummaryBar";
import { CopyIcon } from "../CopyIcon";
import { ActionableTooltip } from "../ActionableTooltip";
import {
  formatVitalDisplayForUi,
  normalizeVitalsAndBodyCompositionToRxRowFields,
  vitalScalarString,
} from "../../../../../../utils/symptomCollectorVitalsMerge";
import styles from "./PatientReportedCard.module.scss";

function cleanText(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  return text && text !== "null" && text !== "undefined" ? text : "";
}

function detailFrom(values) {
  return values.map(cleanText).filter(Boolean).join(", ");
}

function parseMedication(value) {
  if (value && typeof value === "object") {
    const name = cleanText(value.name || value.medicine || value.medicine_name || value.lineItem);
    const detail = detailFrom([
      value.dosage,
      value.frequency,
      value.schedule,
      value.when,
      value.duration,
      value.notes || value.note,
    ]);
    return { name, detail };
  }

  const text = cleanText(value);
  if (!text) return null;
  const parenMatch = text.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) return { name: parenMatch[1].trim(), detail: parenMatch[2].trim() };
  return { name: text };
}

function parseHistory(value) {
  if (value && typeof value === "object") {
    const name = cleanText(value.name || value.history_name || value.lineItem || value.notes);
    if (!name) return null;
    const detail = detailFrom([
      value.duration || value.since,
      value.status,
      value.relation,
      value.notes || value.note,
    ]);
    return {
      ...value,
      name,
      detail,
      type: value.type || "medical_history",
      duration: value.duration || value.since || "",
      since: value.since || value.duration || "",
      status: value.status || "",
      relation: value.relation || value.relationship || "",
      notes: value.notes || value.note || "",
      lineItem: value.lineItem || name,
    };
  }

  const text = cleanText(value);
  if (!text) return null;
  const parenMatch = text.match(/^([^(]+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return {
      name: parenMatch[1].trim(),
      detail: parenMatch[2].trim(),
      type: "medical_history",
      lineItem: parenMatch[1].trim(),
    };
  }
  return { name: text, type: "medical_history", lineItem: text };
}

function parseSymptom(value) {
  if (value && typeof value === "object") {
    const name = cleanText(value.name || value.symptom_name || value.lineItem);
    if (!name) return null;
    const detail = detailFrom([
      value.duration || value.since,
      value.severity,
      value.notes || value.note,
    ]);
    return {
      ...value,
      name,
      detail,
      duration: value.duration || value.since || "",
      since: value.since || value.duration || "",
      severity: value.severity || "",
      notes: value.notes || value.note || "",
      lineItem: value.lineItem || name,
    };
  }

  const text = cleanText(value);
  return text ? { name: text } : null;
}

function parseQuestion(value) {
  if (value && typeof value === "object") {
    const name = cleanText(value.question || value.name || value.notes || value.note || value.lineItem);
    return name ? { name } : null;
  }
  const text = cleanText(value);
  return text ? { name: text } : null;
}

const VITAL_LABELS = {
  temp: "Temperature",
  temperature: "Temperature",
  pres: "Pulse",
  pulse: "Pulse",
  resp_rate: "Respiratory rate",
  respiratoryRate: "Respiratory rate",
  blood_press: "Blood pressure",
  bloodPressure: "Blood pressure",
  systolic: "Systolic",
  diastolic: "Diastolic",
  spo2: "SpO2",
  general_rbs: "General RBS",
  randomBloodSugar: "Random blood sugar",
  generalRBS: "General RBS",
  height: "Height",
  weight: "Weight",
  ofc: "Head circumference",
  headCircumference: "Head circumference",
  waist_circumference: "Waist circumference",
  waistCircumference: "Waist circumference",
  bmi: "BMI",
  bmr: "BMR",
  bsa: "BSA",
  fib4: "FIB-4",
};

const VITAL_DISPLAY_ORDER = [
  "bloodPressure",
  "systolic",
  "diastolic",
  "pulse",
  "temperature",
  "respiratoryRate",
  "spo2",
  "height",
  "weight",
  "headCircumference",
  "waistCircumference",
  "bmi",
  "bmr",
  "bsa",
  "fib4",
  "randomBloodSugar",
  "generalRBS",
];

function parseVitals(data) {
  const source = data?.vitalsAndBodyComposition || data?.vitals_and_body_composition || data?.vitals;
  if (!source || typeof source !== "object") return [];

  const orderedKeys = [
    ...VITAL_DISPLAY_ORDER.filter((key) => Object.prototype.hasOwnProperty.call(source, key)),
    ...Object.keys(source).filter((key) => !VITAL_DISPLAY_ORDER.includes(key)),
  ];
  const seen = new Set();
  const hasCombinedBloodPressure = vitalScalarString(source.bloodPressure || source.blood_press) !== "";

  return orderedKeys.map((key) => {
    if (seen.has(key)) return null;
    seen.add(key);
    if (hasCombinedBloodPressure && (key === "systolic" || key === "diastolic")) return null;
    if (vitalScalarString(source[key]) === "") return null;
    const detail = formatVitalDisplayForUi(source[key]);
    if (!detail) return null;
    return {
      name: VITAL_LABELS[key] || key,
      detail,
      type: "vitals",
      sourceKey: key,
      sourceValue: source[key],
    };
  }).filter(Boolean);
}

function formatItem(item) {
  const label = item.displayName || item.name;
  if (item.type === "vitals") return item.detail ? `${label}: ${item.detail}` : label;
  return item.detail ? `${label} (${item.detail})` : label;
}

function buildSymptomRows(items) {
  return items.map((item) => ({
    name: item.name,
    symptom_name: item.symptom_name || item.name,
    duration: item.duration || item.since || "",
    since: item.since || item.duration || "",
    severity: item.severity || "",
    notes: item.notes || item.note || "",
    lineItem: item.lineItem || item.name,
  }));
}

function buildMedicalHistoryRows(items) {
  return items.map((item) => ({
    type: item.type || "medical_history",
    name: item.name,
    lineItem: item.lineItem || item.name,
    duration: item.duration || item.since || "",
    since: item.since || item.duration || "",
    status: item.status || "Active",
    relation: item.relation || item.relationship || "",
    relationship: item.relationship || item.relation || "",
    notes: item.notes || item.note || "",
    enable: item.enable,
    medication: item.medication,
    date: item.date,
    dateType: item.dateType,
  }));
}

function buildPatientReportedPayload(sectionId, items) {
  const labels = items.map(formatItem);
  const base = {
    sourceDateLabel: "Patient intake",
    targetSection: "rxpad",
  };

  switch (sectionId) {
    case "symptoms":
      return { ...base, symptoms: buildSymptomRows(items) };
    case "medicalHistory":
      return {
        ...base,
        sideNavSignalTarget: "history",
        sideNavSignalMode: "focused",
        medicalHistory: buildMedicalHistoryRows(items),
      };
    case "currentMedications":
      return {
        ...base,
        medications: items.map((item) => ({
          medicine: item.name,
          unitPerDose: "",
          frequency: item.detail || "",
          when: "",
          duration: "",
          note: "",
        })),
      };
    case "vitalsAndBodyComposition": {
      const rawVitals = items.reduce((acc, item) => {
        acc[item.sourceKey] = item.sourceValue;
        return acc;
      }, {});
      return {
        ...base,
        sideNavSignalTarget: "vitals",
        sideNavSignalMode: "focused",
        vitalsAndBodyComposition: normalizeVitalsAndBodyCompositionToRxRowFields(rawVitals),
      };
    }
    case "questionsToDoctor":
      return base;
    default:
      return { ...base, additionalNotes: labels.join("\n") };
  }
}

function buildPatientReportedAllPayload(groups) {
  const payload = {
    sourceDateLabel: "Patient intake",
    targetSection: "rxpad",
    skipVitalsSync: false,
  };

  groups.forEach((group) => {
    if (group.id === "questionsToDoctor") return;
    const next = buildPatientReportedPayload(group.id, group.items);
    payload.symptoms = [...(payload.symptoms || []), ...(next.symptoms || [])];
    payload.medicalHistory = [...(payload.medicalHistory || []), ...(next.medicalHistory || [])];
    payload.medications = [...(payload.medications || []), ...(next.medications || [])];
    payload.vitalsAndBodyComposition = {
      ...(payload.vitalsAndBodyComposition || {}),
      ...(next.vitalsAndBodyComposition || {}),
    };
    payload.additionalNotes = [payload.additionalNotes, next.additionalNotes]
      .filter(Boolean)
      .join("\n") || undefined;
  });

  if (!payload.symptoms?.length) delete payload.symptoms;
  if (!payload.medicalHistory?.length) delete payload.medicalHistory;
  if (!payload.medications?.length) delete payload.medications;
  if (!Object.keys(payload.vitalsAndBodyComposition || {}).length) delete payload.vitalsAndBodyComposition;
  if (!payload.additionalNotes) delete payload.additionalNotes;
  return payload;
}

const SECTION_DEFS = [
  {
    id: "symptoms",
    icon: "symptoms",
    title: "Symptoms Reported",
    copyTooltip: "Copy symptoms to RxPad",
    getItems: (data) => (data.symptoms || []).map(parseSymptom),
  },
  {
    id: "medicalHistory",
    icon: "medical-history",
    title: "Medical History",
    copyTooltip: "Copy medical history to RxPad",
    getItems: (data) => [
      ...(data.medicalHistory || []).map(parseHistory),
      ...(data.allergies || []).map(cleanText).filter(Boolean).map((item) => ({
        name: item,
        displayName: `Allergy: ${item}`,
        type: "allergies",
        status: "Active",
        lineItem: item,
      })),
    ],
  },
  {
    id: "vitalsAndBodyComposition",
    icon: "vitals",
    title: "Vitals & Body Composition",
    copyTooltip: "Copy vitals to RxPad",
    getItems: (data) => parseVitals(data),
  },
  {
    id: "currentMedications",
    icon: "medications",
    title: "Current Medications",
    copyTooltip: "Copy medications to RxPad",
    getItems: (data) => (data.currentMedications || []).map(parseMedication),
  },
  {
    id: "questionsToDoctor",
    title: "Questions to Doctor (read only)",
    copyTooltip: "",
    getItems: (data) => (data.questionsToDoctor || []).map(parseQuestion),
  },
];

export function PatientReportedCard({ data, onCopy, defaultCollapsed = false }) {
  const isTouch = useTouchDevice();
  const [copiedKey, setCopiedKey] = useState(null);

  const activeSections = useMemo(() => {
    return SECTION_DEFS.map((section) => {
      const items = section.getItems(data || {}).filter((item) => item && cleanText(item.name));
      return items.length ? { ...section, items } : null;
    }).filter(Boolean);
  }, [data]);

  if (!activeSections.length) return null;

  const markCopied = (key, delay = 1500) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), delay);
  };

  const handleCopyItem = (sectionId, item, key) => {
    safeClipboardWrite(formatItem(item));
    onCopy?.(buildPatientReportedPayload(sectionId, [item]));
    markCopied(key);
  };

  const handleCopySection = (section) => {
    safeClipboardWrite(section.items.map(formatItem).join("\n"));
    onCopy?.(buildPatientReportedPayload(section.id, section.items));
    markCopied(`section-${section.id}`);
  };

  const handleCopyAll = () => {
    safeClipboardWrite(activeSections.flatMap((section) => section.items.map(formatItem)).join("\n"));
    onCopy?.(
      buildPatientReportedAllPayload(activeSections.map((section) => ({
        id: section.id,
        items: section.items,
      }))),
      { bulk: true }
    );
    markCopied("all", 1800);
  };

  return (
    <CardShell
      icon={
        <span
          className={styles.headerIcon}
          style={{ "--reported-patient-icon-url": 'url("/new-assets/icons/medical/clipboard-activity--bulk.svg")' }}
          aria-hidden="true"
        />
      }
      title="Reported by Patient"
      collapsible
      dataSources={["Patient Intake"]}
      defaultCollapsed={defaultCollapsed}
    >
      <div className={styles.sections}>
        {activeSections.map((section) => (
          <div key={section.id} className={styles.section}>
            <SectionSummaryBar
              label={section.title}
              icon={section.icon}
              iconSlot={
                section.id === "questionsToDoctor" ? (
                  <MessageQuestion
                    size={18}
                    variant="Bulk"
                    color="var(--tp-slate-500, #64748b)"
                    aria-hidden="true"
                  />
                ) : undefined
              }
              trailing={
                section.id === "questionsToDoctor" ? null : (
                  <ActionableTooltip
                    label={section.copyTooltip}
                    onAction={() => handleCopySection(section)}
                  >
                    <CopyIcon
                      size={14}
                      copied={copiedKey === `section-${section.id}`}
                      onClick={() => handleCopySection(section)}
                    />
                  </ActionableTooltip>
                )
              }
            />

            <ul className={styles.itemList}>
              {section.items.map((item, index) => {
                const itemKey = `${section.id}-${index}`;
                const canCopyItem = section.id !== "questionsToDoctor";
                const content = (
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{item.displayName || item.name}</span>
                    {item.detail ? <span className={styles.itemDetail}>({item.detail})</span> : null}
                  </span>
                );

                return (
                  <li key={itemKey} className={styles.item}>
                    <span className={styles.bullet} aria-hidden="true" />
                    {isTouch && canCopyItem ? (
                      <ActionableTooltip
                        label="Copy to RxPad"
                        onAction={() => handleCopyItem(section.id, item, itemKey)}
                      >
                        {content}
                      </ActionableTooltip>
                    ) : content}
                    {!isTouch && canCopyItem ? (
                      <span className={cn(styles.itemCopy, copiedKey === itemKey && styles.itemCopyVisible)}>
                        <ActionableTooltip
                          label={`Copy "${item.name}" to RxPad`}
                          onAction={() => handleCopyItem(section.id, item, itemKey)}
                        >
                          <CopyIcon
                            size={14}
                            copied={copiedKey === itemKey}
                            onClick={() => handleCopyItem(section.id, item, itemKey)}
                          />
                        </ActionableTooltip>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className={styles.footer}>
          <button
            type="button"
            onClick={handleCopyAll}
            className={cn(styles.copyAllBtn, copiedKey === "all" && styles.copyAllBtnCopied)}
          >
            {copiedKey === "all" ? (
              "Filled in your Rx"
            ) : (
              <>
                <Copy size={15} variant="Linear" className={styles.copyAllIcon} aria-hidden="true" />
                Copy all to RxPad
              </>
            )}
          </button>
        </div>
      </div>
    </CardShell>
  );
}
