"use client";

import { useState } from "react";
import { cn, safeClipboardWrite } from "@/src/hooks/utils";
import { useTouchDevice } from "@/src/hooks/use-touch-device";
import { CardShell } from "../CardShell";
import { CopyIcon } from "../CopyIcon";
import { ActionableTooltip } from "../ActionableTooltip";

import { MessageQuestion } from "iconsax-reactjs";
import { SectionSummaryBar } from "../SectionSummaryBar";














/* ── section config ─────────────────────────────────── */












/** Parse medication string into name + frequency detail.
 *  "Telma 20mg 1-0-0-1" → { name: "Telma 20mg", detail: "1-0-0-1" }
 *  "Metsmall 500mg 1-0-0-0" → { name: "Metsmall 500mg", detail: "1-0-0-0" }
 *  "Paracetamol SOS" → { name: "Paracetamol", detail: "SOS" }
 */
function parseMedication(med) {
  // Pattern 1: Parenthesized detail — "Telma 20mg (Twice daily)" or "Telma 20mg (Twice daily | Before food)"
  const parenMatch = med.trim().match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), detail: parenMatch[2].trim() };
  }
  // Pattern 2: Frequency pattern (1-0-0-1) optionally followed by timing (BF, AF, etc.)
  const freqMatch = med.match(/\s+(\d+-\d+-\d+-\d+(?:\s+(?:BF|AF|BD|TDS|OD|SOS|HS))?)\s*$/i);
  if (freqMatch) {
    return { name: med.slice(0, freqMatch.index).trim(), detail: freqMatch[1].trim() };
  }
  // Pattern 3: Standalone timing code at end
  const timingMatch = med.match(/\s+(BF|AF|BD|TDS|OD|SOS|HS)\s*$/i);
  if (timingMatch) {
    return { name: med.slice(0, timingMatch.index).trim(), detail: timingMatch[1].trim() };
  }
  return { name: med };
}

/**
 * Parse a chronic condition / medical history string into name + detail.
 * Extracts duration, treatment context, and clinical details from raw text.
 *
 * "CKD Stage 5 on peritoneal dialysis since Jan 2024"
 *   → { name: "CKD Stage 5", detail: "peritoneal dialysis, since Jan 2024" }
 * "Type 2 Diabetes for 18 years — on insulin"
 *   → { name: "Type 2 Diabetes", detail: "18 years, on insulin" }
 * "Heart attack in 2021 — stent placed"
 *   → { name: "Heart attack", detail: "2021, stent placed" }
 * "High blood pressure — on medications"
 *   → { name: "High blood pressure", detail: "on medications" }
 * "Hypertension (3yr)"
 *   → { name: "Hypertension", detail: "3yr" }
 */
function parseCondition(raw) {
  const trimmed = raw.trim();

  // Pattern 1: Already has parenthesized detail — "Hypertension (3yr)"
  const parenMatch = trimmed.match(/^([^(]+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), detail: parenMatch[2].trim() };
  }

  // Pattern 2: Has em-dash separator — "Heart attack in 2021 — stent placed"
  const dashMatch = trimmed.match(/^(.+?)\s*[—–]\s*(.+)$/);
  if (dashMatch) {
    // Check if the left side also has "for/since/in" qualifier
    const leftParts = splitConditionQualifier(dashMatch[1].trim());
    const rightDetail = dashMatch[2].trim();
    if (leftParts.detail) {
      return { name: leftParts.name, detail: `${leftParts.detail}, ${rightDetail}` };
    }
    return { name: leftParts.name, detail: rightDetail };
  }

  // Pattern 3: Has "on/for/since/in" qualifier — "Type 2 Diabetes for 18 years"
  const qualParts = splitConditionQualifier(trimmed);
  if (qualParts.detail) {
    return qualParts;
  }

  return { name: trimmed };
}

/**
 * Split a condition string at qualifier words (on, for, since, in + year).
 * "CKD Stage 5 on peritoneal dialysis since Jan 2024"
 *   → { name: "CKD Stage 5", detail: "peritoneal dialysis, since Jan 2024" }
 * "Type 2 Diabetes for 18 years"
 *   → { name: "Type 2 Diabetes", detail: "18 years" }
 */
function splitConditionQualifier(text) {
  // Match "on [treatment]", "for [duration]", "since [date]", "in [year]"
  const qualMatch = text.match(
    /^(.+?)\s+(?:(on)\s+(.+?)(?:\s+(since|from)\s+(.+))?|(for)\s+(.+?)(?:\s+(on)\s+(.+))?|(since|from)\s+(.+)|(in)\s+(\d{4})\b(.*)?)$/i
  );

  if (!qualMatch) return { name: text };

  // Simplify: split at first "on", "for", "since", or "in [year]"
  const simpleMatch = text.match(/^(.+?)\s+(?:on|for|since|from)\s+(.+)$/i);
  if (simpleMatch) {
    const name = simpleMatch[1].trim();
    const rest = simpleMatch[2].trim();
    // Further split at "since" or "from" if present
    const sinceMatch = rest.match(/^(.+?)\s+(?:since|from)\s+(.+)$/i);
    if (sinceMatch) {
      return { name, detail: `${sinceMatch[1].trim()}, since ${sinceMatch[2].trim()}` };
    }
    return { name, detail: rest };
  }

  // "in 2021" pattern
  const inYearMatch = text.match(/^(.+?)\s+in\s+(\d{4})\s*(.*)$/i);
  if (inYearMatch) {
    const name = inYearMatch[1].trim();
    const detail = inYearMatch[3] ? `${inYearMatch[2]}, ${inYearMatch[3].trim()}` : inYearMatch[2];
    return { name, detail };
  }

  return { name: text };
}

const SECTION_DEFS = [
{
  id: "symptoms",
  tpIconName: "virus",
  title: "Symptoms Reported",
  copyTooltip: "Click to fill all symptoms to RxPad",
  copyDest: "symptoms",
  getItems: (d) =>
  d.symptoms?.map((s) => ({
    name: s.name,
    detail: [s.duration, s.severity, s.notes].filter(Boolean).join(", ")
  }))
},
{
  id: "medicalHistory",
  tpIconName: "clipboard-activity",
  title: "Medical History",
  copyTooltip: "Click to fill all medical history to RxPad",
  copyDest: "history",
  getItems: (d) => {
    const conditions = d.medicalHistory?.map((item) => parseCondition(item)) ?? [];
    const allergies = d.allergies?.map((a) => ({ name: `Allergy: ${a}` })) ?? [];
    const combined = [...conditions, ...allergies];
    return combined.length > 0 ? combined : undefined;
  }
},
{
  id: "currentMedications",
  tpIconName: "pill",
  title: "Current Medications",
  copyTooltip: "Click to fill all medications to RxPad",
  copyDest: "medications",
  getItems: (d) => d.currentMedications?.map((item) => parseMedication(item))
},
{
  id: "questionsToDoctor",
  tpIconName: "Diagnosis",
  title: "Questions to Doctor",
  copyTooltip: "Click to fill all questions to RxPad",
  copyDest: "notes",
  getItems: (d) => d.questionsToDoctor?.map((q) => ({ name: q }))
}];


/* ── helpers ────────────────────────────────────────── */

function formatItem(item) {
  return item.detail ? `${item.name} (${item.detail})` : item.name;
}

/**
 * Build a per-section RxPadCopyPayload from the patient-reported
 * card so the doctor can fill one row, one whole section, or
 * everything via the bottom "Copy all to RxPad" CTA — all routed
 * through the same `requestCopyToRxPad` channel as the Voice Rx
 * card.
 */
function buildPatientReportedPayload(
sectionId,
items)
{
  const labels = items.map(formatItem);
  const base = {
    sourceDateLabel: "Patient intake",
    targetSection: "rxpad"
  };
  switch (sectionId) {
    case "symptoms":
      return { ...base, symptoms: labels };
    case "medicalHistory":
      return { ...base, targetSection: "history", historyChangeSummaries: labels };
    case "currentMedications":{
        const meds = items.map((it) => ({
          medicine: it.name,
          unitPerDose: "",
          frequency: it.detail ?? "",
          when: "",
          duration: "",
          note: ""
        }));
        return { ...base, medications: meds };
      }
    case "questionsToDoctor":
      return { ...base, additionalNotes: labels.join("\n") };
    default:
      return { ...base, additionalNotes: labels.join("\n") };
  }
}

function buildPatientReportedAllPayload(
groups)
{
  const payload = {
    sourceDateLabel: "Patient intake",
    targetSection: "rxpad"
  };
  for (const g of groups) {
    const slice = buildPatientReportedPayload(g.id, g.items);
    Object.assign(payload, {
      ...payload,
      symptoms: [...(payload.symptoms ?? []), ...(slice.symptoms ?? [])],
      historyChangeSummaries: [
      ...(payload.historyChangeSummaries ?? []),
      ...(slice.historyChangeSummaries ?? [])],

      medications: [...(payload.medications ?? []), ...(slice.medications ?? [])],
      additionalNotes: [payload.additionalNotes, slice.additionalNotes].
      filter(Boolean).
      join("\n") || undefined
    });
  }
  // Trim empty arrays so the rxpad reducer doesn't insert empty rows.
  if (!payload.symptoms?.length) delete payload.symptoms;
  if (!payload.historyChangeSummaries?.length) delete payload.historyChangeSummaries;
  if (!payload.medications?.length) delete payload.medications;
  if (!payload.additionalNotes) delete payload.additionalNotes;
  return payload;
}

/* ── component ──────────────────────────────────────── */

export function PatientReportedCard({ data, onCopy, onPillTap, defaultCollapsed }) {
  const isTouch = useTouchDevice();
  const [copiedKey, setCopiedKey] = useState(null);

  /* Build all non-empty sections */
  const activeSections = SECTION_DEFS.map((def) => {
    const items = def.getItems(data);
    if (!items || items.length === 0) return null;
    return { ...def, items };
  }).filter(Boolean);



  if (activeSections.length === 0) return null;

  /* Per-item: write to clipboard AND push the row into the RxPad as
     its own RxPadCopyPayload slice. */
  const handleCopyItem = (
  sectionId,
  item,
  key) =>
  {
    safeClipboardWrite(formatItem(item));
    onCopy?.(buildPatientReportedPayload(sectionId, [item]));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleCopySection = (section) => {
    const text = section.items.map(formatItem).join("\n");
    safeClipboardWrite(text);
    onCopy?.(buildPatientReportedPayload(section.id, section.items));
    setCopiedKey(`section-${section.id}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleCopyAll = () => {
    const allText = activeSections.
    flatMap((s) => s.items.map(formatItem)).
    join("\n");
    safeClipboardWrite(allText);
    // Pass `{ bulk: true }` so the consumer (handleCopy in
    // useDrAgentPanel) routes this through runCopyWithAura with the
    // bulk-edge-aura branch — page-level edge shimmer only, no
    // per-section flashes.
    onCopy?.(buildPatientReportedAllPayload(activeSections.map((s) => ({ id: s.id, items: s.items }))), { bulk: true });
    setCopiedKey("all");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <CardShell
      icon={<span />}
      tpIconName="clipboard-activity"
      title="Reported by Patient"
      collapsible
      dataSources={["Patient Intake"]}
      defaultCollapsed={defaultCollapsed ?? false}>
      
      <div className="flex flex-col gap-[8px]">
        {/* Sections */}
        {activeSections.map((section) =>
        <div key={section.id}>
            {/* Section header bar with hover copy icon */}
            <SectionSummaryBar
            label={section.title}
            icon={section.id === "questionsToDoctor" ? undefined : section.tpIconName}
            iconSlot={
            section.id === "questionsToDoctor" ?
            <MessageQuestion size={18} variant="Bulk" color="var(--tp-slate-500, #64748B)" className="shrink-0" /> :
            undefined
            }
            trailing={
            <span className="transition-opacity opacity-100">
                  <ActionableTooltip
                label={section.copyTooltip}
                onAction={() => handleCopySection(section)}>
                
                    <CopyIcon
                  size={14}
                  copied={copiedKey === `section-${section.id}`}
                  onClick={() => handleCopySection(section)} />
                
                  </ActionableTooltip>
                </span>
            } />
          

            {/* Bullet list with per-item hover copy */}
            <ul className="mt-1 flex flex-col gap-[2px] pl-1">
              {section.items.map((item, idx) => {
              const itemKey = `${section.id}-${idx}`;
              const itemText = formatItem(item);
              return (
                <li
                  key={idx}
                  className="group/reported-item flex items-start gap-[6px] rounded-[4px] px-1 -mx-1 py-[2px] text-[14px] leading-[1.6] text-tp-slate-700 transition-colors hover:bg-tp-slate-50/80">
                  
                    <span
                      aria-hidden
                      className="mt-[8px] inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-tp-slate-500" />

                    {/* Touch: tap the row text to surface "Copy to Rx".
                       Desktop: keep the inline copy icon affordance. */}
                    {isTouch ?
                  <ActionableTooltip
                    label="Copy to Rx"
                    onAction={() => handleCopyItem(section.id, item, itemKey)}>

                        <span className="flex-1 cursor-pointer">
                          <span className="font-medium text-tp-slate-700">
                            {item.name}
                          </span>
                          {item.detail &&
                      <span className="ml-1 font-sans text-[14px] text-tp-slate-500">
                              ({item.detail})
                            </span>
                      }
                        </span>
                      </ActionableTooltip> :

                  <span className="flex-1">
                        <span className="font-medium text-tp-slate-700">
                          {item.name}
                        </span>
                        {item.detail &&
                    <span className="ml-1 font-sans text-[14px] text-tp-slate-500">
                            ({item.detail})
                          </span>
                    }
                      </span>
                  }
                    {!isTouch &&
                  <span className={cn("flex-shrink-0 transition-opacity", copiedKey === itemKey ? "opacity-100" : "opacity-0 group-hover/reported-item:opacity-100")}>
                        <ActionableTooltip
                      label={`Click to fill "${item.name}" to RxPad`}
                      onAction={() => handleCopyItem(section.id, item, itemKey)}>
                      
                          <CopyIcon
                        size={14}
                        copied={copiedKey === itemKey}
                        onClick={() => handleCopyItem(section.id, item, itemKey)} />
                      
                        </ActionableTooltip>
                      </span>
                  }
                  </li>);

            })}
            </ul>
          </div>
        )}

        {/* Footer CTA — single "Copy all to RxPad" button so the
            doctor can sync everything in one click. Sits inside the
            card body with a soft top divider so it reads as the card's
            own footer, not a third-party action. */}
        <div className="mt-[10px] border-t border-tp-slate-100 pt-[10px]">
          <button
            type="button"
            onClick={handleCopyAll}
            className={cn(
              "flex h-[36px] w-full items-center justify-center gap-[8px] rounded-[10px] border px-3 text-[14px] font-semibold transition-all active:scale-[0.99]",
              copiedKey === "all" ?
              "border-tp-success-300 bg-tp-success-50 text-tp-success-600" :
              "border-tp-blue-300 bg-white text-tp-blue-500 hover:bg-tp-blue-50"
            )}>
            
            {copiedKey === "all" ?
            <span className="vrx-filled-flash inline-flex items-center gap-[6px]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Filled in your Rx
              </span> :

            <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M16 12.9v4.2c0 3.5-1.4 4.9-4.9 4.9H6.9C3.4 22 2 20.6 2 17.1v-4.2C2 9.4 3.4 8 6.9 8h4.2c3.5 0 4.9 1.4 4.9 4.9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 6.9v4.2c0 3.5-1.4 4.9-4.9 4.9H16v-3.1C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2h4.2C20.6 2 22 3.4 22 6.9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copy all to RxPad
              </>
            }
          </button>
        </div>
      </div>
    </CardShell>);

}