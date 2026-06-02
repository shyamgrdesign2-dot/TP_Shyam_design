"use client";

import { Building2 } from "@/src/components/atoms/icons/lucide";
import { Calendar2, Notepad2 } from "iconsax-reactjs";

import { RX_CONTEXT_OPTIONS } from "@/src/components/organisms/rxpad/dr-agent/constants";
import { ReferralPrintBlock } from "@/src/components/organisms/rxpad/referral/ReferralPrintBlock";


/**
 * A4-ratio Rx preview document used by the End Visit page and the Rx
 * Preview sidebar. Letterhead + patient details + section list body +
 * footer — single source of truth for how the printed Rx reads.
 *
 * Ported from the dental RxPreviewDocument (without dental-examination
 * sections since this codebase is a general EMR, not dental-specific).
 */

function formatDate(iso) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Meta({ parts }) {
  if (!parts.length) return null;
  return (
    <span className="text-tp-slate-500">
      {" "}(
      {parts.map((p, i) =>
      <span key={`${p}-${i}`}>
          {i > 0 ? <span className="text-tp-slate-400"> | </span> : null}
          {p}
        </span>
      )}
      )
    </span>);

}

function SectionList({ title, rows }) {
  if (!rows.length) return null;
  return (
    <section className="flex flex-col gap-[4px]">
      <h3 className="text-[14px] font-semibold leading-[18px] text-tp-slate-900">{title}</h3>
      <ul className="m-0 flex list-disc flex-col gap-[4px] pl-[18px] marker:text-tp-slate-500">
        {rows.map((row, i) =>
        <li key={`${title}-${i}`} className="text-[12px] leading-[16px] text-tp-slate-700">
            <span className="font-medium text-tp-slate-900">{row.title}</span>
            <Meta parts={row.metaParts} />
          </li>
        )}
      </ul>
    </section>);

}





export function RxPreviewDocument({ snapshot }) {
  const pid = snapshot?.patientId ?? RX_CONTEXT_OPTIONS[0].id;
  const patient = RX_CONTEXT_OPTIONS.find((p) => p.id === pid) ?? RX_CONTEXT_OPTIONS[0];
  const today = new Date().toISOString();

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-[20px]">
      <article
        className="flex w-full flex-col overflow-hidden rounded-[14px] bg-white p-[16px] shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
        style={{ aspectRatio: "210 / 297" }}>
        
        {/* ── Letterhead ─────────────────────────────────────── */}
        <header className="mb-[14px] rounded-[6px] bg-tp-slate-100/60 px-[10px] py-[8px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div className="flex items-start gap-[12px]">
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[8px] bg-tp-blue-50 text-tp-blue-600">
                <Building2 size={32} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[16px] font-semibold leading-[20px] text-tp-blue-700">TP Clinic</p>
                <p className="text-[12px] font-medium leading-[16px] text-tp-slate-700">
                  Dr. Umesh Aggarwal, MBBS, MD
                </p>
                <p className="text-[10px] leading-[14px] text-tp-slate-600">
                  Reg. ID: KMC-2342342 | +91 78945 61230
                </p>
                <p className="text-[10px] leading-[14px] text-tp-slate-600">
                  K9 Sardar Bungalow, Prahladnagar, Ahmedabad
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="h-px w-full bg-tp-slate-300" aria-hidden />

        {/* ── Patient details ─────────────────────────────────── */}
        <section className="py-[8px]">
          <div className="flex items-start justify-between gap-[24px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <p className="text-[12px] leading-[16px] text-tp-slate-700">
                <span className="font-semibold text-tp-slate-900">Patient Name:</span> {patient.label}
              </p>
              <p className="text-[12px] leading-[16px] text-tp-slate-700">
                <span className="font-semibold text-tp-slate-900">Age/Gender:</span> {patient.age} Years,{" "}
                {patient.gender === "M" ? "Male" : "Female"}
              </p>
              <p className="text-[12px] leading-[16px] text-tp-slate-700">
                <span className="font-semibold text-tp-slate-900">Address:</span> Prahladnagar, Ahmedabad
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-[2px] text-right">
              <p className="text-[12px] leading-[16px] text-tp-slate-700">
                <span className="font-semibold text-tp-slate-900">Patient ID:</span> {patient.id}
              </p>
              <p className="text-[12px] leading-[16px] text-tp-slate-700">
                <span className="font-semibold text-tp-slate-900">Date:</span>{" "}
                {formatDate(snapshot?.updatedAt ?? today)}
              </p>
            </div>
          </div>
        </section>

        <div className="h-px w-full bg-tp-slate-300" aria-hidden />

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          {!snapshot ?
          <div className="py-[20px]">
              <p className="text-[12px] leading-[16px] text-tp-slate-600">
                No Rx data available yet. Add details in the Rx pad to preview here.
              </p>
            </div> :

          <div className="flex flex-col gap-[10px] py-[8px]">
              <SectionList title="Vitals" rows={snapshot.vitals ?? []} />
              <SectionList title="Medical History" rows={snapshot.history ?? []} />
              <SectionList title="Lab Results" rows={snapshot.labResults ?? []} />
              <SectionList title="Gynec History" rows={snapshot.gynec ?? []} />
              <SectionList title="Obstetric History" rows={snapshot.obstetric ?? []} />
              <SectionList title="Vaccination" rows={snapshot.vaccines ?? []} />
              <SectionList title="Growth" rows={snapshot.growth ?? []} />
              <SectionList title="Ophthal" rows={snapshot.optal ?? []} />
              <SectionList title="Chief Complaints" rows={snapshot.symptoms ?? []} />
              <SectionList title="Examination" rows={snapshot.examinations ?? []} />
              <SectionList title="Diagnosis" rows={snapshot.diagnoses ?? []} />
              <SectionList title="Investigations" rows={snapshot.labInvestigations ?? []} />
              <SectionList title="Medication (Rx)" rows={snapshot.medications ?? []} />
              <SectionList title="Advice" rows={snapshot.advice ?? []} />
              <SectionList title="Surgery" rows={snapshot.surgeries ?? []} />
              {(snapshot.customModules ?? []).map((m) =>
            <SectionList key={m.id} title={m.title} rows={m.rows ?? []} />
            )}
              {snapshot.followUp || snapshot.followUpDate ?
            <section className="flex flex-col gap-[2px]">
                  <h3 className="flex items-center gap-[5px] text-[14px] font-semibold leading-[18px] text-tp-slate-900">
                    <Calendar2 size={14} color="var(--tp-slate-500)" variant="Bulk" />
                    Follow Up
                  </h3>
                  {snapshot.followUpDate ?
              <p className="text-[12px] leading-[16px] text-tp-slate-700">
                      <span className="font-medium text-tp-slate-900">Date: </span>
                      {snapshot.followUpDate}
                    </p> :
              null}
                  {snapshot.followUp ?
              <p className="text-[12px] leading-[16px] text-tp-slate-700">{snapshot.followUp}</p> :
              null}
                </section> :
            null}
              <ReferralPrintBlock referral={snapshot.referral} />
              {snapshot.additionalNotes ?
            <section className="flex flex-col gap-[2px]">
                  <h3 className="flex items-center gap-[5px] text-[14px] font-semibold leading-[18px] text-tp-slate-900">
                    <Notepad2 size={14} color="var(--tp-slate-500)" variant="Bulk" />
                    Additional Notes
                  </h3>
                  <p className="text-[12px] leading-[16px] text-tp-slate-700">{snapshot.additionalNotes}</p>
                </section> :
            null}
            </div>
          }
        </div>

        <div className="h-px w-full bg-tp-slate-300" aria-hidden />

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="pt-[10px]">
          <p className="text-right text-[10px] leading-[14px] text-tp-slate-500">
            support@tpclinic.com | www.tpclinic.com
          </p>
        </footer>
      </article>
    </div>);

}