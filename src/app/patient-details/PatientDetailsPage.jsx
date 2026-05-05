"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Add,
  ArrowDown2,
  ArrowLeft2,
  ArrowRight2,
  Buildings2,
  Calendar2,
  CallCalling,
  Card,
  DocumentText,
  DocumentUpload,
  Edit2,
  Hospital,
  MedalStar,
  Note1,
  Printer,
  ReceiptText,
  Refresh2,
  User } from
"iconsax-reactjs";
import { MoreVertical } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/src/components/molecules/DropdownMenu";
import { Tooltip as TooltipRoot, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/atoms/Tooltip";

// Local alias — the page uses TooltipPrimitive.Root from the old
// Radix import surface; map it onto our hand-rolled Tooltip root.
const TooltipPrimitive = { Root: TooltipRoot };
import { ClinicalTable as TPClinicalTable } from "@/src/components/molecules/ClinicalTable";
import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";
import { TPButton as Button, TPSplitButton } from "@/src/components/atoms/Button/button-system";
import { AppointmentBanner } from "@/src/components/molecules/AppointmentBanner";
// DrAgentFab import removed — patient-details no longer surfaces the
// agent FAB (scoped to in-visit RxPad route only).
import { DrAgentPanel } from "@/src/components/organisms/rxpad/dr-agent/DrAgentPanel";
import { RX_CONTEXT_OPTIONS } from "@/src/components/organisms/rxpad/dr-agent/constants";
import { cn } from "@/src/hooks/utils";

// ────────────────────────────────────────────────────────────────────
// Patient adapter — the dental project had a rich APPOINTMENT_PATIENTS
// catalog. This codebase only has RX_CONTEXT_OPTIONS (id, label,
// gender, age). We synthesize the missing fields (mobile, dob,
// patient code, blood group) so the PatientDetailPage shell renders.
// ────────────────────────────────────────────────────────────────────











function buildPatientProfile(
patientId,
urlName,
urlGender,
urlAge)
{
  const catalog = RX_CONTEXT_OPTIONS.find((p) => p.id === patientId);
  const genderShort =
  (urlGender ?? catalog?.gender ?? "M").toUpperCase().startsWith("F") ? "F" : "M";
  const age = Number.parseInt(urlAge ?? String(catalog?.age ?? 30), 10) || 30;
  return {
    name: urlName ?? catalog?.label ?? "Patient",
    genderLabel: genderShort === "F" ? "Female" : "Male",
    genderShort,
    age,
    dob: "—",
    mobile: "—",
    patientCode: `PAT-${(patientId || "000").slice(-6).toUpperCase()}`,
    bloodGroup: "—"
  };
}

// ────────────────────────────────────────────────────────────────────
// Mock history / Rx content — matches the dental source 1:1
// ────────────────────────────────────────────────────────────────────
const HISTORY_VIOLET = "var(--tp-violet-500)";

const VITALS_ROWS = [
{ name: "SPO2(%)", v1: "95", v2: "94" },
{ name: "Height (cms)", v1: "98.6", v2: "95" },
{ name: "Temperature (Frh)", v1: "95", v2: "94" },
{ name: "Pulse(/min)", v1: "66", v2: "65" },
{ name: "BP(mm Hg)", v1: "120/80", v2: "120/80" }];


const LAB_ROWS = [
{ name: "Hemoglobin(g/dl)", v1: "14.2", v2: "13.8" },
{ name: "WBC", v1: "7800", v2: "7200" },
{ name: "Platelets", v1: "2.45", v2: "2.38" }];



const VITALS_LAB_TABLE_COLUMNS = [
{ id: "name", header: "Name", accessor: (r) => r.name },
{ id: "v1", header: "10 Oct, 22", accessor: (r) => r.v1 },
{ id: "v2", header: "5 Oct, 22", accessor: (r) => r.v2 }];


const MEDICAL_HISTORY_ROWS = [
{
  id: "medical-problems",
  topic: "Medical problems",
  details:
  <>
        <span className="font-medium text-[#454551]">Hypothyroidism</span>
        <span> — Since </span>
        <span className="font-medium text-[#454551]">3–6 months</span>
        <span>, medication </span>
        <span className="font-medium text-[#454551]">no</span>
      </>

},
{
  id: "lifestyle",
  topic: "Lifestyle",
  details:
  <>
        <span className="font-medium text-[#454551]">Smoking</span>
        <span> — yes, since </span>
        <span className="font-medium text-[#454551]">2 years</span>
        <span>, quantity </span>
        <span className="font-medium text-[#454551]">2 units/day</span>
      </>

}];


const MEDICAL_HISTORY_COLUMNS = [
{
  id: "topic",
  header: "Topic",
  accessor: (r) =>
  <span className="text-[#a2a2a8]">{r.topic}</span>

},
{
  id: "details",
  header: "Details",
  accessor: (r) =>
  <span className="leading-relaxed">{r.details}</span>

}];


const MEDICATIONS = [
"Hydroxychloroquine 400 Tablet (400mg, once a week)",
"Vitamin C 1000 Tablet (1000mg, once a day)",
"Zinc 50 tablet (50mg, once a day)",
"Crocin 650mg tablet (650mg, SOS, in case of fever)",
"cetirizine 10mg tablet (10mg, Once a day, In case of throat pain & cough)"];


const LAB_TESTS = ["Complete Blood Count(CBC) Test", "ESR Test", "Urea", "Creat"];

const VISIT_PAGES = 8;
const RX_VISIT_DATETIME = "10 Oct 2023, 5:13 pm";

function CardShell({ children, className }) {
  return (
    <div
      className={cn(
        "rounded-[16px] bg-white shadow-[0_1px_3px_rgba(23,23,37,0.06)]",
        className
      )}>
      
      {children}
    </div>);

}

function HistorySectionCard({
  title,
  iconName,
  children




}) {
  return (
    <CardShell className="overflow-hidden">
      <div className="flex w-full items-center gap-3 px-3 py-[10px] sm:px-[14px]">
        <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center">
          <TPMedicalIcon name={iconName} variant="bulk" size={20} color={HISTORY_VIOLET} />
        </span>
        <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-tp-slate-600">
          {title}
        </span>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-tp-slate-200 bg-white text-tp-slate-500 transition-colors hover:border-tp-slate-300 hover:bg-tp-slate-50 hover:text-tp-slate-700"
          aria-label={`Open ${title}`}>
          
          <ArrowRight2 size={18} variant="Linear" color="currentColor" strokeWidth={1.75} />
        </button>
      </div>
      <div className="p-0">{children}</div>
    </CardShell>);

}

function HistorySectionCards() {
  return (
    <>
      <HistorySectionCard title="Vitals & Body Composition" iconName="Heart Rate">
        <TPClinicalTable
          columns={VITALS_LAB_TABLE_COLUMNS}
          data={VITALS_ROWS}
          rowKey={(row) => row.name} />
        
      </HistorySectionCard>
      <HistorySectionCard title="Medical History" iconName="clipboard-activity">
        <TPClinicalTable
          columns={MEDICAL_HISTORY_COLUMNS}
          data={MEDICAL_HISTORY_ROWS}
          rowKey={(row) => row.id} />
        
      </HistorySectionCard>
      <HistorySectionCard title="Lab Results" iconName="Lab">
        <TPClinicalTable columns={VITALS_LAB_TABLE_COLUMNS} data={LAB_ROWS} rowKey={(row) => row.name} />
      </HistorySectionCard>
    </>);

}



function DigitalRxPanel({
  visitIndex,
  setVisitIndex,
  rxTab,
  setRxTab





}) {
  const isDigital = rxTab === "digital";
  return (
    <CardShell className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        {/* Row 1: doctor | pagination | date */}
        <div className="flex h-[48px] items-center px-4">
          <div className="grid h-full w-full grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-self-start">
              <p className="text-[14px] font-semibold leading-tight text-tp-slate-900">Dr Umesh</p>
              <span className="inline-flex shrink-0 items-center rounded-[6px] bg-tp-slate-100 px-2 py-[2px] text-[12px] font-medium leading-tight text-tp-slate-600">
                Cardiology
              </span>
            </div>
            <div className="flex items-center justify-center gap-[2px] sm:justify-self-center">
              <button
                type="button"
                aria-label="Previous visit"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-tp-slate-500 transition-colors hover:bg-tp-slate-50 hover:text-tp-slate-700 disabled:pointer-events-none disabled:opacity-30"
                disabled={visitIndex <= 0}
                onClick={() => setVisitIndex((i) => Math.max(0, i - 1))}>
                
                <ArrowLeft2 size={16} variant="Linear" color="currentColor" />
              </button>
              <span className="min-w-[44px] text-center text-[12px] font-semibold tabular-nums text-tp-slate-700">
                {visitIndex + 1} / {VISIT_PAGES}
              </span>
              <button
                type="button"
                aria-label="Next visit"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-tp-slate-500 transition-colors hover:bg-tp-slate-50 hover:text-tp-slate-700 disabled:pointer-events-none disabled:opacity-30"
                disabled={visitIndex >= VISIT_PAGES - 1}
                onClick={() => setVisitIndex((i) => Math.min(VISIT_PAGES - 1, i + 1))}>
                
                <ArrowRight2 size={16} variant="Linear" color="currentColor" />
              </button>
            </div>
            <div className="text-left sm:text-right sm:justify-self-end">
              <p className="whitespace-nowrap text-[12px] font-medium leading-tight text-tp-slate-500">
                {RX_VISIT_DATETIME}
              </p>
            </div>
          </div>
        </div>
        <div className="h-px w-full shrink-0 bg-tp-slate-100" aria-hidden />

        {/* Row 2: view toggle + actions */}
        <div className="flex h-[48px] items-center justify-between px-4">
          <div className="inline-flex h-[32px] items-center rounded-[10px] bg-tp-slate-100 p-[3px]">
            <button
              type="button"
              onClick={() => setRxTab("digital")}
              className={cn(
                "inline-flex h-[26px] items-center rounded-[8px] px-[14px] text-[12px] font-semibold transition-colors",
                rxTab === "digital" ?
                "bg-white text-tp-blue-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" :
                "text-tp-slate-600 hover:text-tp-slate-900"
              )}>
              
              Digital Rx
            </button>
            <button
              type="button"
              onClick={() => setRxTab("transcript")}
              className={cn(
                "inline-flex h-[26px] items-center rounded-[8px] px-[14px] text-[12px] font-semibold transition-colors",
                rxTab === "transcript" ?
                "bg-white text-tp-blue-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" :
                "text-tp-slate-600 hover:text-tp-slate-900"
              )}>
              
              Transcript
            </button>
          </div>
          <TooltipProvider delayDuration={280}>
            <div className="flex items-center gap-[2px]">
              <TooltipPrimitive.Root>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Repeat"
                    className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[8px] text-tp-slate-600 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900">
                    
                    <Refresh2 size={16} variant="Linear" color="currentColor" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Repeat</TooltipContent>
              </TooltipPrimitive.Root>
              <TooltipPrimitive.Root>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Print"
                    className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[8px] text-tp-slate-600 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900">
                    
                    <Printer size={16} variant="Linear" color="currentColor" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Print</TooltipContent>
              </TooltipPrimitive.Root>
              <TooltipPrimitive.Root>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Edit"
                    className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[8px] text-tp-slate-600 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900">
                    
                    <Edit2 size={16} variant="Linear" color="currentColor" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Edit</TooltipContent>
              </TooltipPrimitive.Root>
              <div className="mx-[2px] h-[18px] w-px bg-tp-slate-200" aria-hidden />
              <TooltipPrimitive.Root>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="More"
                    className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[8px] text-tp-slate-600 transition-colors hover:bg-tp-slate-100 hover:text-tp-slate-900">
                    
                    <MoreVertical size={16} strokeWidth={1.75} className="text-tp-slate-600" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>More</TooltipContent>
              </TooltipPrimitive.Root>
            </div>
          </TooltipProvider>
        </div>
        <div className="h-px w-full shrink-0 bg-tp-slate-100" aria-hidden />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 pt-4 pb-[18px]">
        {!isDigital ?
        <p className="text-[14px] leading-relaxed text-tp-slate-500">
            Consultation transcript will appear here when available from SmartScribe.
          </p> :

        <div className="space-y-6">
            <section>
              <h4 className="text-[14px] font-medium text-tp-slate-900">Chief Complaints</h4>
              <ol className="mt-2 list-decimal pl-5 text-[12px] text-tp-slate-600">
                <li>Mild symptom (Mild, patient should be on home isolation)</li>
              </ol>
            </section>
            <section>
              <h4 className="text-[14px] font-medium text-tp-slate-900">Investigations</h4>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12px] text-tp-slate-600">
                {LAB_TESTS.map((t) => <li key={t}>{t}</li>)}
              </ol>
            </section>
            <section>
              <h4 className="text-[14px] font-medium text-tp-slate-900">Medication</h4>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12px] leading-relaxed text-tp-slate-600">
                {MEDICATIONS.map((line) => <li key={line}>{line}</li>)}
              </ol>
            </section>
            <section>
              <h4 className="text-[14px] font-medium text-tp-slate-900">Advice</h4>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12px] text-tp-slate-600">
                <li>Follow social distancing</li>
                <li>Practice hand hygiene</li>
                <li>Wear masks</li>
              </ol>
            </section>
            <section>
              <h4 className="text-[14px] font-medium text-tp-slate-900">Follow-up</h4>
              <p className="mt-2 text-[12px] text-tp-slate-600">03/07/2024</p>
            </section>
          </div>
        }
      </div>
    </CardShell>);

}











const NAV_CONFIG = [
{ id: "opd-summary", label: "OPD Visit Summary", bannerTitle: "OPD Visit Summary", kind: "opd" },
{ id: "reports", label: "Reports", bannerTitle: "Reports", kind: "placeholder", placeholderKey: "reports" },
{ id: "certificates", label: "Certificates", bannerTitle: "Certificates", kind: "placeholder", placeholderKey: "certificates" },
{ id: "add-edit-bill", label: "Add/Edit Bill", bannerTitle: "Add/Edit Bill", kind: "placeholder", placeholderKey: "bill" },
{ id: "ipd-discharge", label: "IPD Discharge Summary", bannerTitle: "IPD Discharge Summary", kind: "placeholder", placeholderKey: "ipd" },
{ id: "daycare-discharge", label: "Daycare Discharge Summary", bannerTitle: "Daycare Discharge Summary", kind: "placeholder", placeholderKey: "daycare" }];


function SecondaryNavIcon({ item, selected }) {
  const iconSize = 20;
  const idleColor = "var(--tp-slate-700)";
  const activeColor = "#ffffff";
  const variant = selected ? "Bulk" : "Linear";
  const color = selected ? activeColor : idleColor;
  switch (item.id) {
    case "opd-summary":return <DocumentText size={iconSize} variant={variant} color={color} />;
    case "reports":return <Note1 size={iconSize} variant={variant} color={color} />;
    case "certificates":return <MedalStar size={iconSize} variant={variant} color={color} />;
    case "add-edit-bill":return <ReceiptText size={iconSize} variant={variant} color={color} />;
    case "ipd-discharge":return <Hospital size={iconSize} variant={variant} color={color} />;
    case "daycare-discharge":return <Buildings2 size={iconSize} variant={variant} color={color} />;
    default:return <DocumentText size={iconSize} variant="Linear" color={idleColor} />;
  }
}

const PLACEHOLDER_COPY = {
  reports: { title: "Reports", message: "Investigation and imaging reports linked to this patient will show here.", icon: Note1 },
  certificates: { title: "Certificates", message: "Medical certificates and fitness notes will appear in this section.", icon: DocumentText },
  bill: { title: "Add/Edit Bill", message: "Create invoices, record payments, and manage billing from here.", icon: ReceiptText },
  ipd: { title: "IPD Discharge Summary", message: "Inpatient discharge summaries will be listed here when available.", icon: Hospital },
  daycare: { title: "Daycare Discharge Summary", message: "Daycare procedure summaries will appear here.", icon: Buildings2 }
};

const PLACEHOLDER_CTA = {
  reports: { label: "Upload report", icon: <DocumentUpload size={18} variant="Linear" strokeWidth={1.5} /> },
  certificates: { label: "Add new certificate", icon: <Add size={18} strokeWidth={1.5} /> },
  bill: { label: "Add new bill", icon: <Add size={18} strokeWidth={1.5} /> },
  ipd: { label: "Add IPD summary", icon: <Add size={18} strokeWidth={1.5} /> },
  daycare: { label: "Add daycare summary", icon: <Add size={18} strokeWidth={1.5} /> }
};

function EmptyModuleBody({ k }) {
  const c = PLACEHOLDER_COPY[k];
  const cta = PLACEHOLDER_CTA[k];
  const Icon = c.icon;
  return (
    <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <Icon size={80} variant="Bulk" color="var(--tp-slate-300)" />
      <p className="text-[16px] font-semibold text-tp-slate-800">{c.title}</p>
      <p className="text-[14px] leading-relaxed text-tp-slate-500">{c.message}</p>
      {cta &&
      <Button variant="solid" theme="primary" size="md" surface="light" className="mt-3 whitespace-nowrap" leftIcon={cta.icon}>
          {cta.label}
        </Button>
      }
    </div>);

}

function PatientDetailInner({
  patientId: patientIdProp,
  name: nameProp,
  gender: genderProp,
  age: ageProp,
  from: fromProp






}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = patientIdProp ?? searchParams?.get("patientId") ?? "__patient__";
  const fromPage = fromProp ?? searchParams?.get("from") ?? "appointments";

  const [activeNav, setActiveNav] = useState("opd-summary");
  const [rxTab, setRxTab] = useState("digital");
  const [visitIndex, setVisitIndex] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  const navFromUrl = searchParams?.get("nav");
  useEffect(() => {
    if (!navFromUrl) return;
    if (NAV_CONFIG.some((n) => n.id === navFromUrl)) setActiveNav(navFromUrl);
  }, [navFromUrl]);

  const headerPatient = useMemo(
    () =>
    buildPatientProfile(
      patientId,
      nameProp ?? searchParams?.get("name"),
      genderProp ?? searchParams?.get("gender"),
      ageProp ?? searchParams?.get("age")
    ),
    [patientId, nameProp, genderProp, ageProp, searchParams]
  );

  const profileFields = useMemo(
    () => [
    { key: "patient-id", label: "Patient ID", value: headerPatient.patientCode, icon: <Card color="var(--tp-violet-500)" size={18} strokeWidth={1.5} variant="Linear" /> },
    { key: "mobile", label: "Mobile Number", value: headerPatient.mobile.replace(/^\+91-/, ""), icon: <CallCalling color="var(--tp-violet-500)" size={18} strokeWidth={1.5} variant="Linear" /> },
    { key: "dob", label: "DOB", value: headerPatient.dob, icon: <Calendar2 color="var(--tp-violet-500)" size={18} strokeWidth={1.5} variant="Linear" /> }],

    [headerPatient]
  );

  const activeConfig = NAV_CONFIG.find((n) => n.id === activeNav) ?? NAV_CONFIG[0];

  const handleBack = () => {
    if (fromPage === "rxpad-voice" || fromPage === "rxpad") router.push(`/rxpad/voice?patientId=${patientId}`);else
    router.push("/tp-appointment-screen");
  };

  const goTypeRx = () => {
    router.push(`/rxpad/voice?patientId=${patientId}`);
  };

  const bannerActions =
  activeConfig.kind === "opd" ?
  <TPSplitButton
    size="md"
    variant="solid"
    theme="primary"
    surface="dark"
    className="whitespace-nowrap"
    primaryAction={{ label: "Voice RX", onClick: goTypeRx }}
    secondaryActions={[
    { label: "Voice RX", onClick: goTypeRx },
    { label: "Type RX", onClick: goTypeRx },
    { label: "Snap RX", onClick: goTypeRx },
    { label: "SmartSync", onClick: goTypeRx }]
    } /> :

  activeConfig.placeholderKey ?
  <Button
    variant="outline"
    theme="primary"
    size="md"
    surface="dark"
    className="!bg-white/[0.13] !text-white hover:!bg-white/[0.22] whitespace-nowrap"
    leftIcon={PLACEHOLDER_CTA[activeConfig.placeholderKey].icon}>
    
        {PLACEHOLDER_CTA[activeConfig.placeholderKey].label}
      </Button> :
  null;

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-tp-slate-100"
      data-tp-slide-in>
      
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Secondary nav: 220 px expanded, 80 px compact when Dr. Agent is open */}
        <nav
          className={cn(
            "relative flex shrink-0 flex-col overflow-hidden border-r border-tp-slate-100 bg-white transition-[width] duration-200",
            isAgentOpen ? "w-[80px]" : "w-[220px]"
          )}
          aria-label="Patient sections">
          
          <div className={cn("shrink-0 pt-3 pb-2", isAgentOpen ? "flex justify-center px-2" : "px-3")}>
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              title={isAgentOpen ? "Go back" : undefined}
              className={cn(
                "inline-flex h-[32px] items-center text-[14px] font-medium text-tp-slate-600 transition-colors hover:bg-tp-slate-50 hover:text-tp-blue-600",
                isAgentOpen ? "w-[32px] justify-center rounded-[8px]" : "gap-[6px] rounded-[8px] pl-[6px] pr-[10px]"
              )}>
              
              <ArrowLeft2 size={16} color="currentColor" variant="Linear" />
              {!isAgentOpen && <span>Back</span>}
            </button>
          </div>
          <div className="h-px shrink-0 bg-tp-slate-100" aria-hidden />

          <div className={cn("shrink-0 pt-3 pb-3", isAgentOpen ? "flex justify-center px-2" : "px-3")}>
            {isAgentOpen ?
            <button
              type="button"
              title={`${headerPatient.name} · ${headerPatient.genderShort} · ${headerPatient.age}Y`}
              className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-tp-slate-100 transition-colors hover:bg-tp-slate-200/75"
              aria-label="Patient profile">
              
                <User color="var(--tp-slate-500)" size={22} variant="Bulk" />
              </button> :

            <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-[10px] bg-tp-slate-100 px-2 py-2 text-left transition-colors hover:bg-tp-slate-200/75 data-[state=open]:bg-tp-slate-200/80">
                  
                    <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-white">
                      <User color="var(--tp-slate-500)" size={22} variant="Bulk" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-tp-slate-900">{headerPatient.name}</p>
                      <p className="flex items-center text-[12px] font-medium">
                        <span className="text-tp-slate-500">{headerPatient.genderShort}</span>
                        <span className="w-[14px] shrink-0 text-center text-tp-slate-300" aria-hidden>·</span>
                        <span className="text-tp-slate-500">{`${headerPatient.age}Y`}</span>
                      </p>
                    </div>
                    <ArrowDown2
                    color="var(--tp-slate-700)"
                    size={18}
                    strokeWidth={2}
                    variant="Linear"
                    className={cn("transition-transform", isProfileOpen && "rotate-180")} />
                  
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="w-[260px] rounded-[12px] border border-tp-slate-100 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                
                  <div className="space-y-3">
                    {profileFields.map((item) =>
                  <div key={item.key} className="flex items-center gap-2.5">
                        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-tp-violet-50">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] leading-[16px] text-tp-slate-500">{item.label}</p>
                          <p className="truncate text-[14px] font-semibold text-tp-slate-800">{item.value}</p>
                        </div>
                      </div>
                  )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          </div>

          <div className="h-px shrink-0 bg-tp-slate-100" aria-hidden />

          <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-4 pt-3", isAgentOpen ? "gap-[4px]" : "gap-[2px]")}>
            {NAV_CONFIG.map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  title={isAgentOpen ? item.label : undefined}
                  className={cn(
                    "da-patient-nav-item relative transition-colors",
                    active && "da-patient-nav-item--active",
                    isAgentOpen ?
                    "mx-[6px] flex flex-col items-center gap-[4px] rounded-[10px] px-[4px] py-[8px]" :
                    "flex w-full flex-row items-center gap-3 px-3 py-[10px] text-left"
                  )}>
                  
                  {active && !isAgentOpen &&
                  <span className="absolute bottom-[6px] left-0 top-[6px] w-[3px] rounded-r-[12px] bg-tp-blue-500" aria-hidden />
                  }
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] transition-colors",
                      active ? "bg-tp-blue-500" : "bg-tp-slate-100"
                    )}>
                    
                    <SecondaryNavIcon item={item} selected={active} />
                  </span>
                  <span
                    className={cn(
                      "leading-snug",
                      isAgentOpen ? "w-full text-center text-[10px]" : "min-w-0 flex-1 truncate text-left text-[14px]",
                      active ? "font-semibold text-tp-slate-900" : "font-medium text-tp-slate-700"
                    )}>
                    
                    {item.label}
                  </span>
                </button>);

            })}
          </div>
        </nav>

        {/* Main column */}
        <div
          className={cn(
            "static flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-[padding] duration-200",
            isAgentOpen && "md:pr-[300px] xl:pr-[400px]"
          )}>
          
          <div className="shrink-0">
            <AppointmentBanner title={activeConfig.bannerTitle} actions={bannerActions} />
          </div>
          <div className="relative z-10 -mt-[60px] flex min-h-0 min-w-0 w-full flex-1 flex-col px-3 pb-6 sm:px-4 md:px-5 lg:px-[18px]">
            <div className="relative flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col overflow-visible">
              {activeConfig.kind === "opd" ?
              <div className="relative z-10 flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4 py-0 md:gap-5 lg:flex-row lg:items-stretch">
                  <section
                  className="flex w-full min-w-0 flex-col gap-4 overflow-y-auto pb-4 lg:w-[280px] lg:min-w-[250px] lg:flex-none lg:shrink-0"
                  aria-label="Historical data">
                  
                    <HistorySectionCards />
                  </section>
                  <section
                  className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-lg:min-h-[min(520px,80vh)] lg:min-w-[350px]"
                  aria-label="Prescription">
                  
                    <DigitalRxPanel visitIndex={visitIndex} setVisitIndex={setVisitIndex} rxTab={rxTab} setRxTab={setRxTab} />
                  </section>
                </div> :

              <div className="relative z-10 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(23,23,37,0.06)] items-center justify-center">
                  {activeConfig.placeholderKey && <EmptyModuleBody k={activeConfig.placeholderKey} />}
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Dr. Agent — non-V0 full panel + FAB */}
      {isAgentOpen ?
      <div className="pointer-events-none fixed right-0 top-0 z-40 hidden h-screen w-[300px] md:block xl:w-[400px]">
          <div className="pointer-events-auto h-full w-full">
            <DrAgentPanel onClose={() => setIsAgentOpen(false)} initialPatientId={patientId} />
          </div>
        </div> :
      null}
      {/* DrAgentFab removed from the patient-details page — agent
           concept is scoped to the in-visit RxPad route only. */}

      <style jsx global>{`
        .da-patient-nav-item:hover { background-color: rgba(75, 74, 213, 0.08); }
        .da-patient-nav-item--active,
        .da-patient-nav-item--active:hover { background-color: rgba(75, 74, 213, 0.12); }
      `}</style>
    </div>);

}









export function PatientDetailsPage(props) {
  return (
    <Suspense
      fallback={
      <div className="flex h-screen items-center justify-center bg-tp-slate-100 text-tp-slate-500">
          Loading…
        </div>
      }>
      
      <PatientDetailInner {...props} />
    </Suspense>);

}

export default PatientDetailsPage;