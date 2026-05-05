"use client";

/**
 * SessionHistoryDrawer — right-side TP drawer that surfaces every past
 * Dr.Agent session for the current chat. Two stacked views inside the
 * same drawer:
 *
 *   1. List view (default)  — chronological list of sessions, one row per
 *      session with date, time, mode, and a chevron. Selecting a row
 *      slides into:
 *
 *   2. Detail view          — single session split into tabs:
 *        - Transcript  (raw spoken text)
 *        - TPMR        (the structured clinical record extracted by AI)
 *        - Sections    (digital Rx sections — symptoms, exams, etc.)
 *      A back arrow returns to the list.
 *
 * The "card flip" feel is a horizontal slide between the two stacked
 * panes. Mock sessions are seeded here; replace `MOCK_SESSIONS` with the
 * real `historicalUpdates` payload (or a dedicated /sessions endpoint)
 * when the backend lands — the drawer's UI doesn't change.
 */

import { useState } from "react";
import { ArrowLeft2, ArrowRight2, CloseCircle, Microphone2, Note1, User } from "iconsax-reactjs";
import { cn } from "@/src/hooks/utils";
import {
  Drawer as TPDrawer,
  DrawerContent as TPDrawerContent } from
"@/src/components/molecules/Drawer";

// ─── Types ────────────────────────────────────────────────────────────────────
























// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SESSIONS = [
{
  id: "s-2026-10-12",
  dateLabel: "12 Oct'26",
  time: "10:30 AM",
  mode: "Conversation Mode",
  summary: "Follow-up for CKD G5 — pedal oedema worsening, fatigue.",
  transcript: [
  { speaker: "doctor", text: "How are you feeling since the last visit?" },
  { speaker: "patient", text: "Pedal oedema has come back this past week. Fatigue is also more." },
  { speaker: "doctor", text: "Any breathlessness or chest discomfort?" },
  { speaker: "patient", text: "Mild breathlessness on exertion. No chest pain." },
  { speaker: "doctor", text: "Okay, we'll review the diuretic dose and check labs." }],

  tpmr: [
  { title: "Subjective", bullets: ["Pedal oedema 1 week", "Fatigue 2 weeks", "Reduced appetite 1 week"] },
  { title: "Objective", bullets: ["BP 138/86", "Pulse 84", "SpO₂ 96%"] },
  { title: "Assessment", bullets: ["CKD G5 on PD — fluid overload likely"] },
  { title: "Plan", bullets: ["Increase Furosemide to 60mg", "Repeat KFT in 1 week", "Strict fluid log"] }],

  rxSections: [
  { title: "Symptoms", items: [
    { name: "Pedal oedema", detail: "1 week | Mild | Bilateral" },
    { name: "Fatigue", detail: "2 weeks | Moderate" }]
  },
  { title: "Medication (Rx)", items: [
    { name: "Furosemide 60mg", detail: "1 Tablet | 1-0-0 | Empty Stomach | 7 Days" }]
  }]

},
{
  id: "s-2026-10-10",
  dateLabel: "10 Oct'26",
  time: "2:15 PM",
  mode: "Conversation Mode",
  summary: "Follow-up — PD adequacy review.",
  transcript: [
  { speaker: "doctor", text: "How is the PD going? Any issues with the catheter site?" },
  { speaker: "patient", text: "No issues. Site is clean. Six exchanges a day as advised." },
  { speaker: "doctor", text: "Good. Let's continue same regimen and review labs next visit." }],

  tpmr: [
  { title: "Subjective", bullets: ["PD on schedule, no infections"] },
  { title: "Plan", bullets: ["Continue current PD regimen", "KFT + electrolytes next visit"] }],

  rxSections: []
},
{
  id: "s-2026-10-05",
  dateLabel: "05 Oct'26",
  time: "9:00 AM",
  mode: "Dictation Mode",
  summary: "Initial consult — CKD established, baseline workup.",
  transcript: [
  { speaker: "doctor", text: "76 year old male, known diabetic 18 years, hypertensive 12 years. Presents with fatigue, reduced appetite, mild pedal oedema. Started on Furosemide 40mg, Insulin Glargine 18U. Allergic to iodinated contrast and sulfonamides." }],

  tpmr: [
  { title: "Subjective", bullets: ["Fatigue, reduced appetite, pedal oedema"] },
  { title: "Objective", bullets: ["BP 142/88", "Cr 5.2 mg/dL", "eGFR 11"] },
  { title: "Assessment", bullets: ["CKD Stage 5"] },
  { title: "Plan", bullets: ["Initiate PD", "Strict glycemic control", "Avoid contrast"] }],

  rxSections: [
  { title: "Diagnosis", items: [
    { name: "CKD Stage 5", detail: "Confirmed | 5 years" },
    { name: "Type 2 Diabetes Mellitus", detail: "Confirmed | 18 years" }]
  }]

}];


/** Replace with real data hook when /sessions is wired. */
export function getMockSessions() {
  return MOCK_SESSIONS;
}

// ─── Component ────────────────────────────────────────────────────────────────












export function SessionHistoryDrawer({
  open,
  onOpenChange,
  sessions = MOCK_SESSIONS,
  patientName = "Ramesh Kumar",
  patientMeta = "Male · 76y"
}) {
  const [activeId, setActiveId] = useState(null);
  const [detailTab, setDetailTab] = useState("transcript");

  const active = activeId ? sessions.find((s) => s.id === activeId) ?? null : null;

  // Reset when the drawer is closed.
  function handleOpenChange(next) {
    onOpenChange(next);
    if (!next) {
      setActiveId(null);
      setDetailTab("transcript");
    }
  }

  return (
    <TPDrawer open={open} onOpenChange={handleOpenChange}>
      <TPDrawerContent
        side="right"
        size="md"
        className="flex flex-col gap-0 bg-tp-slate-50 p-0">
        
        {/* ── Header: close on LEFT, divider beneath, neutral white bar.
             Matches the TP preview-sidebar pattern. ─────────────────── */}
        <div className="flex shrink-0 items-center gap-2 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => active ? (setActiveId(null), setDetailTab("transcript")) : handleOpenChange(false)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-tp-slate-500 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900"
            aria-label={active ? "Back to session list" : "Close session history"}>
            
            {active ?
            <ArrowLeft2 size={18} variant="Linear" /> :
            <CloseCircle size={18} variant="Linear" />}
          </button>
          <h2 className="flex-1 truncate text-[16px] font-semibold text-tp-slate-900">
            {active ? `${active.dateLabel} · ${active.time}` : "Session history"}
          </h2>
        </div>
        <div className="h-px shrink-0 bg-tp-slate-100" />

        {/* ── Patient identity row — pinned beneath the divider so the
             doctor always knows whose history is on screen. ─────────── */}
        <div className="flex shrink-0 items-center gap-2 bg-white px-4 py-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tp-violet-50 text-tp-violet-500">
            <User size={16} variant="Bulk" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-semibold text-tp-slate-800">{patientName}</span>
            <span className="truncate text-[12px] text-tp-slate-500">{patientMeta}</span>
          </div>
        </div>
        <div className="h-px shrink-0 bg-tp-slate-100" />

        {/* Slide track — both panes mounted; transform decides which is visible.
             Mirrors the "flip card" feel without needing 3D transforms. */}
        <div className="relative flex-1 overflow-hidden bg-tp-slate-50">
          <div
            className="flex h-full w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: active ? "translateX(-50%)" : "translateX(0)" }}>
            
            {/* ── List pane ────────────────────────────────────────────── */}
            <div className="h-full w-1/2 shrink-0 overflow-y-auto px-4 py-4">
              <ul className="flex flex-col gap-2">
                {sessions.map((s) => {
                  const isConversation = s.mode === "Conversation Mode";
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(s.id)}
                        className="group flex w-full items-stretch gap-3 rounded-2xl border border-tp-slate-200/70 bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-[1px] hover:border-tp-violet-200 hover:shadow-[0_6px_18px_-10px_rgba(103,58,172,0.25)]">
                        
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            isConversation ? "bg-tp-violet-50 text-tp-violet-600" : "bg-tp-blue-50 text-tp-blue-600"
                          )}>
                          
                          {isConversation ?
                          <Microphone2 size={18} variant="Bulk" /> :
                          <Note1 size={18} variant="Bulk" />}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1 py-[1px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[14px] font-semibold text-tp-slate-900">
                              {s.dateLabel}
                            </span>
                            <span className="shrink-0 text-[12px] font-medium text-tp-slate-500">
                              {s.time}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "inline-flex w-fit items-center rounded-full px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wider",
                              isConversation ?
                              "bg-tp-violet-50 text-tp-violet-700" :
                              "bg-tp-blue-50 text-tp-blue-700"
                            )}>
                            
                            {s.mode.replace(" Mode", "")}
                          </span>
                          <span className="truncate text-[12px] leading-[16px] text-tp-slate-600">
                            {s.summary}
                          </span>
                        </div>
                        <ArrowRight2
                          size={14}
                          className="mt-1 shrink-0 self-start text-tp-slate-400 transition-transform group-hover:translate-x-[2px] group-hover:text-tp-violet-500" />
                        
                      </button>
                    </li>);

                })}
              </ul>
            </div>

            {/* ── Detail pane ─────────────────────────────────────────── */}
            <div className="h-full w-1/2 shrink-0 overflow-hidden">
              {active ?
              <div className="flex h-full flex-col">
                  {/* Tab strip */}
                  <div className="flex shrink-0 items-center gap-1 border-b border-tp-slate-300 px-4 pt-2">
                    {[
                  { id: "transcript", label: "Transcript" },
                  { id: "tpmr", label: "TPMR" },
                  { id: "sections", label: "Sections" }].
                  map((t) =>
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDetailTab(t.id)}
                    className={cn(
                      "relative px-3 py-2 text-[12px] font-medium transition-colors",
                      detailTab === t.id ?
                      "text-tp-blue-700" :
                      "text-tp-slate-500 hover:text-tp-slate-800"
                    )}>
                    
                        {t.label}
                        {detailTab === t.id ?
                    <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-tp-blue-600" /> :
                    null}
                      </button>
                  )}
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    {detailTab === "transcript" ?
                  <ul className="flex flex-col gap-2">
                        {active.transcript.map((line, i) =>
                    <li
                      key={i}
                      className={cn(
                        "max-w-[88%] rounded-2xl px-3 py-2 text-[14px] leading-[1.45]",
                        line.speaker === "doctor" ?
                        "self-start bg-tp-slate-50 text-tp-slate-800" :
                        "self-end bg-tp-blue-50 text-tp-blue-900"
                      )}
                      style={{ alignSelf: line.speaker === "doctor" ? "flex-start" : "flex-end" }}>
                      
                            <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-70">
                              {line.speaker}
                            </span>
                            <span>{line.text}</span>
                          </li>
                    )}
                      </ul> :
                  null}

                    {detailTab === "tpmr" ?
                  <div className="flex flex-col gap-3">
                        {active.tpmr.map((section) =>
                    <div key={section.title} className="rounded-xl border border-tp-slate-100 bg-white p-3">
                            <div className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500">
                              {section.title}
                            </div>
                            <ul className="mt-1 flex flex-col gap-1 pl-4 text-[14px] text-tp-slate-700 [&>li]:list-disc">
                              {section.bullets.map((b, i) => <li key={i}>{b}</li>)}
                            </ul>
                          </div>
                    )}
                      </div> :
                  null}

                    {detailTab === "sections" ?
                  active.rxSections.length === 0 ?
                  <div className="flex h-full items-center justify-center text-[14px] text-tp-slate-400">
                          No structured Rx sections were captured in this session.
                        </div> :

                  <div className="flex flex-col gap-3">
                          {active.rxSections.map((sec) =>
                    <div key={sec.title} className="rounded-xl border border-tp-slate-100 bg-white p-3">
                              <div className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500">
                                {sec.title}
                              </div>
                              <ul className="mt-1 flex flex-col gap-1 pl-4 text-[14px] text-tp-slate-700 [&>li]:list-disc">
                                {sec.items.map((item, i) =>
                        <li key={i}>
                                    <span className="font-medium">{item.name}</span>
                                    {item.detail ? <span className="ml-1 text-tp-slate-500">({item.detail})</span> : null}
                                  </li>
                        )}
                              </ul>
                            </div>
                    )}
                        </div> :

                  null}
                  </div>
                </div> :
              null}
            </div>
          </div>
        </div>
      </TPDrawerContent>
    </TPDrawer>);

}