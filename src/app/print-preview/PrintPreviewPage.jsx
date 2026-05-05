"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { RxPreviewCard } from "@/src/components/organisms/rxpad/dr-agent/cards/action/RxPreviewCard";

import { RX_CONTEXT_OPTIONS } from "@/src/components/organisms/rxpad/dr-agent/constants";
import { TPButton as Button } from "@/src/components/atoms/Button/button-system";

/** Baseline structured Rx body — aligns with design-system rx_preview mock; patient name comes from queue context. */
const SAMPLE_RX_BODY = {
  date: "15 Apr'26",
  diagnoses: ["Viral Fever", "Conjunctivitis"],
  medications: ["Paracetamol 650mg SOS", "Moxifloxacin Eye Drops 0.5% QID"],
  investigations: ["CBC with ESR", "CRP"],
  advice: ["Rest for 2-3 days", "Fluids 2-3L/day"],
  followUp: "3 days"
};

function PrintPreviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");

  const data = useMemo(() => {
    const patient = RX_CONTEXT_OPTIONS.find((p) => p.id === patientId) ?? RX_CONTEXT_OPTIONS[0];
    return { patientName: patient.label, ...SAMPLE_RX_BODY };
  }, [patientId]);

  return (
    <div className="min-h-screen bg-tp-slate-100 print:bg-white">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-tp-slate-200 bg-white px-4 print:hidden">
        <Button
          variant="ghost"
          theme="neutral"
          size="md"
          leftIcon={<ArrowLeft size={18} />}
          onClick={() => router.back()}>
          
          Back
        </Button>
        <Button
          variant="outline"
          theme="primary"
          size="md"
          leftIcon={<Printer size={18} />}
          onClick={() => window.print()}>
          
          Print
        </Button>
      </header>

      <main className="mx-auto max-w-[560px] px-4 py-8 print:max-w-none print:px-6 print:py-4">
        <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-wide text-tp-slate-400 print:hidden">
          Print preview · A4-ready baseline
        </p>
        <div className="rounded-xl bg-white p-1 shadow-sm print:rounded-none print:p-0 print:shadow-none">
          <RxPreviewCard data={data} />
        </div>
      </main>
    </div>);

}

export function PrintPreviewPage() {
  return (
    <Suspense fallback={null}>
      <PrintPreviewInner />
    </Suspense>);

}