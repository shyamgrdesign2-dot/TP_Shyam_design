"use client";

import { AlertTriangle, HeartPulse, Scissors, Users } from "lucide-react";
import { CopyButton, CopySectionButton } from "./CopyButton";
import { PanelSubSection } from "./ExpandedPanel";

import { ALLERGY_SEVERITY_RULES } from "../sections-types";

/**
 * Medical History Panel
 * ─────────────────────
 * Displays comprehensive medical history organized into sub-sections.
 *
 * Display rules:
 *   - ALLERGIES section ALWAYS appears first and is open by default
 *   - Severe allergies: Red border, red text, bold — NEVER collapse this section
 *   - Drug allergies get a special warning icon
 *   - Chronic conditions: Show status badge (Active/Resolved/In Remission)
 *   - Active conditions are highlighted, Resolved are muted
 *   - Surgical history: Timeline-style with date and procedure
 *   - Family history: Grouped by relation
 *   - Social history: Key-value grid layout
 */

function AllergyCard({ allergy, onCopy }) {
  const rule = ALLERGY_SEVERITY_RULES[allergy.severity];

  return (
    <div className={`group/item flex items-start gap-2.5 rounded-lg border px-3 py-2 mb-2 last:mb-0 ${rule.style}`}>
      <AlertTriangle
        size={16}
        className={`shrink-0 mt-0.5 ${
        allergy.severity === "severe" ? "text-tp-error-500" : "text-tp-warning-500"}`
        } />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{allergy.allergen}</span>
          <span className={`
            rounded-full px-1.5 py-0.5 text-[10px] font-medium
            ${allergy.severity === "severe" ? "bg-tp-error-100 text-tp-error-700" :
          allergy.severity === "moderate" ? "bg-tp-warning-100 text-tp-warning-700" :
          "bg-tp-slate-100 text-tp-slate-600"}
          `}>
            {allergy.severity}
          </span>
          <span className="rounded-full bg-white/50 px-1.5 py-0.5 text-[10px] text-tp-slate-500">{allergy.type}</span>
        </div>
        <p className="mt-0.5 text-[12px] opacity-80">{allergy.reaction}</p>
        {allergy.reportedDate &&
        <p className="mt-0.5 text-[10px] opacity-60">Reported: {new Date(allergy.reportedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
        }
      </div>
      <CopyButton onCopy={onCopy} size={12} />
    </div>);

}

function ChronicConditionCard({ condition, onCopy }) {
  const statusStyles = {
    Active: "bg-tp-success-50 text-tp-success-600",
    Resolved: "bg-tp-slate-100 text-tp-slate-500",
    "In Remission": "bg-tp-blue-50 text-tp-blue-600"
  };

  return (
    <div className="group/item flex items-start gap-2.5 rounded-lg border border-tp-slate-200 bg-white px-3 py-2 mb-2 last:mb-0">
      <HeartPulse size={14} className="shrink-0 mt-0.5 text-tp-slate-400" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-tp-slate-800">{condition.condition}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusStyles[condition.status]}`}>
            {condition.status}
          </span>
        </div>
        <p className="text-[12px] text-tp-slate-500 mt-0.5">
          Since {new Date(condition.diagnosedDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
        </p>
        {condition.medications && condition.medications.length > 0 &&
        <p className="text-[12px] text-tp-slate-500 mt-0.5">Rx: {condition.medications.join(", ")}</p>
        }
        {condition.notes &&
        <p className="text-[12px] italic text-tp-slate-400 mt-0.5">{condition.notes}</p>
        }
      </div>
      <CopyButton onCopy={onCopy} size={12} />
    </div>);

}

function SurgicalCard({ surgery, onCopy }) {
  return (
    <div className="group/item flex items-start gap-2.5 rounded-lg border border-tp-slate-200 bg-white px-3 py-2 mb-2 last:mb-0">
      <Scissors size={14} className="shrink-0 mt-0.5 text-tp-slate-400" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-tp-slate-800">{surgery.procedure}</span>
        <p className="text-[12px] text-tp-slate-500 mt-0.5">
          {new Date(surgery.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          {surgery.hospital ? ` — ${surgery.hospital}` : ""}
        </p>
        {surgery.outcome &&
        <p className="text-[12px] text-tp-slate-400 mt-0.5">{surgery.outcome}</p>
        }
      </div>
      <CopyButton onCopy={onCopy} size={12} />
    </div>);

}

function FamilyHistoryCard({ entry, onCopy }) {
  return (
    <div className="group/item flex items-start gap-2.5 rounded-lg border border-tp-slate-200 bg-white px-3 py-2 mb-2 last:mb-0">
      <Users size={14} className="shrink-0 mt-0.5 text-tp-slate-400" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-tp-slate-800">{entry.condition}</span>
          <span className="rounded-full bg-tp-slate-100 px-1.5 py-0.5 text-[10px] text-tp-slate-500">{entry.relation}</span>
        </div>
        {entry.ageOfOnset &&
        <p className="text-[12px] text-tp-slate-500 mt-0.5">Onset: {entry.ageOfOnset}</p>
        }
        {entry.notes &&
        <p className="text-[12px] italic text-tp-slate-400 mt-0.5">{entry.notes}</p>
        }
      </div>
      <CopyButton onCopy={onCopy} size={12} />
    </div>);

}

export function HistoryPanel({
  history,
  onCopyToRxPad



}) {
  const source = "Medical History";

  return (
    <div className="space-y-1">
      {/* Allergies — ALWAYS first, ALWAYS open */}
      <PanelSubSection
        title="Allergies"
        count={history.allergies.length}
        defaultOpen={true}
        actions={
        <CopySectionButton
          label="Copy All"
          onCopy={() => onCopyToRxPad?.({
            target: "notes",
            items: history.allergies.map((a) => `⚠ ${a.allergen} (${a.type}, ${a.severity}): ${a.reaction}`),
            source
          })} />

        }>
        
        {history.allergies.length === 0 ?
        <p className="py-2 text-[12px] text-tp-success-600">No known allergies (NKA)</p> :

        history.allergies.map((a) =>
        <AllergyCard
          key={a.id}
          allergy={a}
          onCopy={() => onCopyToRxPad?.({
            target: "notes",
            items: [`⚠ ${a.allergen} (${a.type}, ${a.severity}): ${a.reaction}`],
            source
          })} />

        )
        }
      </PanelSubSection>

      {/* Chronic Conditions */}
      <PanelSubSection
        title="Chronic Conditions"
        count={history.chronicConditions.length}
        actions={
        <CopySectionButton
          label="Copy All"
          onCopy={() => onCopyToRxPad?.({
            target: "diagnosis",
            items: history.chronicConditions.map((c) => c.condition),
            source
          })} />

        }>
        
        {history.chronicConditions.map((c) =>
        <ChronicConditionCard
          key={c.id}
          condition={c}
          onCopy={() => onCopyToRxPad?.({ target: "diagnosis", items: [c.condition], source })} />

        )}
      </PanelSubSection>

      {/* Surgical History */}
      <PanelSubSection
        title="Surgical History"
        count={history.surgicalHistory.length}>
        
        {history.surgicalHistory.map((s) =>
        <SurgicalCard
          key={s.id}
          surgery={s}
          onCopy={() => onCopyToRxPad?.({
            target: "notes",
            items: [`${s.procedure} (${new Date(s.date).getFullYear()})`],
            source
          })} />

        )}
      </PanelSubSection>

      {/* Family History */}
      <PanelSubSection
        title="Family History"
        count={history.familyHistory.length}>
        
        {history.familyHistory.map((f) =>
        <FamilyHistoryCard
          key={f.id}
          entry={f}
          onCopy={() => onCopyToRxPad?.({
            target: "notes",
            items: [`Family: ${f.relation} — ${f.condition}`],
            source
          })} />

        )}
      </PanelSubSection>

      {/* Social History */}
      <PanelSubSection title="Social History">
        <div className="space-y-1.5 rounded-lg border border-tp-slate-200 bg-white p-3">
          <div className="flex justify-between text-xs">
            <span className="text-tp-slate-500">Smoking</span>
            <span className="font-medium text-tp-slate-800">{history.socialHistory.smoking.status}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-tp-slate-500">Alcohol</span>
            <span className="font-medium text-tp-slate-800">{history.socialHistory.alcohol.status}</span>
          </div>
          {history.socialHistory.occupation &&
          <div className="flex justify-between text-xs">
              <span className="text-tp-slate-500">Occupation</span>
              <span className="font-medium text-tp-slate-800">{history.socialHistory.occupation}</span>
            </div>
          }
          {history.socialHistory.exercise &&
          <div className="flex justify-between text-xs">
              <span className="text-tp-slate-500">Exercise</span>
              <span className="font-medium text-tp-slate-800">{history.socialHistory.exercise}</span>
            </div>
          }
          {history.socialHistory.diet &&
          <div className="flex justify-between text-xs">
              <span className="text-tp-slate-500">Diet</span>
              <span className="font-medium text-tp-slate-800">{history.socialHistory.diet}</span>
            </div>
          }
        </div>
      </PanelSubSection>
    </div>);

}