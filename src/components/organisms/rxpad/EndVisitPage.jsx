"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ArrowDown2,
  DocumentDownload,
  Edit2,
  LanguageSquare,
  Printer,
  ReceiptText,
  Setting2,
  User } from
"iconsax-reactjs";

import { ConfirmDialog as TPConfirmDialog } from "@/src/components/molecules/ConfirmDialog";
import { FlashSnackbar } from "@/src/components/molecules/FlashSnackbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/src/components/molecules/DropdownMenu";
import { RX_CONTEXT_OPTIONS } from "@/src/components/organisms/rxpad/dr-agent/constants";
import { useComposedRxPreviewSnapshot, formatRxSnapshotSummary } from "./rx-preview-composer";

import { RxPreviewDocument } from "./RxPreviewDocument";
import { cn } from "@/src/hooks/utils";

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam"];







function ActionTile({ label, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-[10px] border border-tp-blue-500 bg-white px-[16px] py-[8px] text-left transition-colors hover:bg-tp-blue-50/40">
      
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-[6px]">
          <span className="text-tp-blue-500">{icon}</span>
          <span className="text-[14px] font-semibold text-tp-blue-500">{label}</span>
        </div>
        <ChevronRight size={18} className="text-tp-blue-500" />
      </div>
    </button>);

}

function EndVisitInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams?.get("patientId") ?? RX_CONTEXT_OPTIONS[0].id;

  const buildRxResumeQuery = () => {
    const q = new URLSearchParams();
    q.set("patientId", patientId);
    for (const key of ["returnTo"]) {
      const v = searchParams?.get(key);
      if (v) q.set(key, v);
    }
    return q.toString();
  };

  const returnToList = () => {
    // Always land on the appointments queue with a success snackbar
    // — Done = "visit is complete". AppointmentSnackbars resolves the
    // patient name from `patientId` and surfaces the brand pill.
    const qs = new URLSearchParams();
    qs.set("snackbar", "visit-ended");
    if (patientId) qs.set("patientId", patientId);
    router.push(`/tp-appointment-screen?${qs.toString()}`);
  };

  const [language, setLanguage] = useState("English");
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const previewSnapshot = useComposedRxPreviewSnapshot(patientId);

  const patient = useMemo(() => {
    const p = RX_CONTEXT_OPTIONS.find((x) => x.id === patientId) ?? RX_CONTEXT_OPTIONS[0];
    return {
      name: p.label,
      gender: p.gender,
      age: `${p.age}y`
    };
  }, [patientId]);

  // Clicking the header back arrow OR the Edit Digital Rx tile both
  // open the same "Edit Digital Rx?" confirmation dialog. Going back
  // from this page means editing the Rx (you're leaving a completed
  // visit), so we always confirm before routing away.
  const handleEndVisitBack = () => {
    setIsEditConfirmOpen(true);
  };

  const handleConfirmEditRx = () => {
    setIsEditConfirmOpen(false);
    router.push(`/rxpad/voice?${buildRxResumeQuery()}`);
  };

  const downloadRx = () => {
    const summary = formatRxSnapshotSummary(previewSnapshot);
    const blob = new Blob([`Digital Rx\n\n${summary}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `digital-rx-${patient.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-tp-slate-100" data-tp-slide-in>
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="h-[62px] border-b border-tp-slate-100/70 bg-white pr-4 pl-0">
        <div className="mx-auto flex h-full w-full items-center justify-between">
          <div className="inline-flex h-full items-center">
            <button
              type="button"
              aria-label="Go back"
              onClick={handleEndVisitBack}
              className="relative flex h-[62px] w-[80px] shrink-0 items-center justify-center bg-white px-[16px] py-[20px] transition-colors hover:bg-tp-slate-50">
              
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[0_-0.25px_0_0] border-r-[0.5px] border-solid border-[#f1f1f5]" />
              
              <ChevronLeft color="#454551" size={24} strokeWidth={2} style={{ opacity: 0.7 }} />
            </button>
            <div className="inline-flex items-center gap-[6px] pl-[12px]">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-tp-slate-100">
                <User size={24} variant="Bulk" color="var(--tp-slate-600)" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-tp-slate-700">{patient.name}</p>
                <p className="text-[12px] text-tp-slate-600">
                  {patient.gender === "M" ? "Male" : "Female"} | {patient.age}
                </p>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-[14px]">
            <button
              type="button"
              className="inline-flex h-[42px] items-center gap-[6px] rounded-[10px] bg-tp-slate-100 px-[12px] text-tp-slate-700 transition-colors hover:bg-tp-slate-200/80">
              
              <Setting2 size={20} variant="Linear" />
              <span className="text-[14px] font-semibold">Print Settings</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-[42px] items-center gap-[6px] rounded-[10px] bg-tp-slate-100 px-[12px] text-tp-slate-700 transition-colors hover:bg-tp-slate-200/80">
                  
                  <LanguageSquare size={20} variant="Linear" />
                  <span className="text-[14px] font-semibold">{language}</span>
                  <ArrowDown2 size={18} variant="Linear" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[170px] rounded-[10px] border border-tp-slate-100/70 bg-white p-[4px]">
                
                {LANGUAGES.map((lang) =>
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className="rounded-[8px]">
                  
                    {lang}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={returnToList}
              className={cn(
                "inline-flex h-[42px] min-w-[100px] items-center justify-center rounded-[10px]",
                "bg-tp-blue-600 px-[12px] text-[14px] font-semibold text-white",
                "transition-colors hover:bg-tp-blue-700"
              )}>
              
              Done
            </button>
          </div>
        </div>
      </header>

      {/* ── Main: sidebar actions + preview document ─────────── */}
      <main className="flex h-[calc(100vh-62px)] w-full overflow-hidden">
        <aside className="w-[300px] shrink-0 bg-white p-[18px]">
          <div className="flex flex-col gap-[20px]">
            <ActionTile label="Create Bill" icon={<ReceiptText size={20} variant="Linear" />} />
            <ActionTile
              label="Print Digital Rx"
              icon={<Printer size={20} variant="Linear" />}
              onClick={() => window.print()} />
            
            <ActionTile
              label="Download Digital Rx"
              icon={<DocumentDownload size={20} variant="Linear" />}
              onClick={downloadRx} />
            
            <ActionTile
              label="Edit Digital Rx"
              icon={<Edit2 size={20} variant="Linear" />}
              onClick={() => setIsEditConfirmOpen(true)} />
            
          </div>
        </aside>
        <section className="relative flex-1 overflow-auto bg-tp-slate-100 p-[24px]">
          <RxPreviewDocument snapshot={previewSnapshot} />
        </section>
      </main>

      {/* Edit Rx confirmation — now on the shared TPConfirmDialog so it
           matches the dental TP design system (white surface, divider
           under header, amber warning chip, blue primary on the right,
           blue-link secondary on the left, slate-900 close X). */}
      <TPConfirmDialog
        open={isEditConfirmOpen}
        onOpenChange={setIsEditConfirmOpen}
        title="Are you sure you want to edit this?"
        warning="Going back reopens this visit for editing. You can save and end it again once you're done."
        primaryLabel="No, Stay Here"
        onPrimary={() => setIsEditConfirmOpen(false)}
        secondaryLabel="Yes, Edit Rx"
        secondaryTone="destructive"
        onSecondary={handleConfirmEditRx} />
      

      {/* Flash toasts — e.g. ?flash=rx-saved set by the caller that
           routed here surfaces "Your Rx has been saved" on arrival. */}
      <FlashSnackbar />
    </div>);

}

export function EndVisitPage() {
  return (
    <Suspense fallback={null}>
      <EndVisitInner />
    </Suspense>);

}