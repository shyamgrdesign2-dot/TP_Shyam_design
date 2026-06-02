"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Calendar2,
  CalendarAdd,
  ClipboardClose,
  ClipboardText,
  ClipboardTick,
  Clock,
  DocumentLike,
  DocumentSketch,
  Flash,
  Hospital,
  MessageProgramming,
  Messages2,
  Notification,
  Printer,
  Profile2User,
  Timer,
  ReceiptText,
  SearchNormal1,
  Shop,
  TickCircle,
  Video } from
"iconsax-reactjs";
import { Check, ChevronDown, ListFilter, MoreVertical, Plus, Search, X } from "@/src/components/atoms/icons/lucide";

import { cn } from "@/src/hooks/utils";
import { TPButton as Button, TPSplitButton } from "@/src/components/atoms/Button/button-system";
import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";
import { Tag as TPTag } from "@/src/components/atoms/Tag";
import { SecondaryNavPanel as TPSecondaryNavPanel } from "@/src/components/organisms/shared/SecondaryNavPanel";
import { AppTopHeader } from "@/src/components/organisms/shared/AppTopHeader";
import { DASHBOARD_NAV_ITEMS } from "@/src/components/organisms/shared/dashboard-nav-items";
import { PatientActionsMenu } from "@/src/components/organisms/shared/PatientActionsMenu";
import { AppointmentBanner } from "@/src/components/molecules/AppointmentBanner";
import { TutorialPlayIcon } from "@/src/components/atoms/TutorialPlayIcon/TutorialPlayIcon";
// Dr. Agent imports removed — agent feature retired, only VoiceRx lives in RxPad route.
import { DateRangePicker } from "@/src/components/molecules/DateRangePicker";

const REF_LOGO = "/assets/b38df11ad80d11b9c1d530142443a18c2f53d406.png";

const REF_AVATAR = "/assets/52cb18088c5b8a5db6a7711c9900d7d08a1bac42.png";

















































// Nav items live in `shared/dashboard-nav-items.js` (imported at top of
// file) so this page and AllPatientsPage stay in sync. Local alias.
const navItems = DASHBOARD_NAV_ITEMS;


const appointmentTabs = [
{ id: "queue", label: "Queue", count: 8, icon: Clock },
{ id: "finished", label: "Finished", count: 3, icon: ClipboardTick },
{ id: "cancelled", label: "Cancelled", count: 2, icon: ClipboardClose },
{ id: "draft", label: "Draft", count: 2, icon: Timer },
{
  id: "pending-digitisation",
  label: "Pending Digitisation",
  count: 2,
  icon: DocumentSketch
}];



const queueAppointments = [
{
  id: "apt-ramesh-ckd",
  serial: 1,
  name: "Ramesh Kumar",
  gender: "M",
  age: 76,
  contact: "+91-9876012345",
  visitType: "Follow-up",
  visitTags: [{ text: "Unbilled", tone: "warning" }, { text: "Overdue", tone: "danger" }],
  slotTime: "10:00 am",
  slotDate: "9 Mar'26",
  hasVideo: false,
  status: "queue",
  dateKey: "today",
  hasSymptoms: true
},
{
  id: "apt-neha",
  serial: 2,
  name: "Neha Gupta",
  gender: "F",
  age: 32,
  contact: "+91-9876501234",
  visitType: "Follow-up",
  visitTags: [{ text: "Unbilled", tone: "warning" }, { text: "Overdue", tone: "danger" }],
  slotTime: "10:20 am",
  slotDate: "9 Mar'26",
  hasVideo: true,
  status: "queue",
  dateKey: "today",
  hasSymptoms: true
},
{
  id: "apt-zerodata",
  serial: 3,
  name: "Ramesh M",
  gender: "M",
  age: 35,
  contact: "+91-9812700001",
  visitType: "New",
  visitTags: [{ text: "Unbilled", tone: "warning" }],
  slotTime: "10:15 am",
  slotDate: "9 Mar'26",
  hasVideo: false,
  status: "queue",
  dateKey: "today",
  hasSymptoms: true
},
{
  id: "__patient__",
  serial: 4,
  name: "Shyam GR",
  gender: "M",
  age: 25,
  contact: "+91-9812734567",
  visitType: "Follow-up",
  visitTags: [{ text: "Unbilled", tone: "warning" }],
  slotTime: "10:30 am",
  slotDate: "9 Mar'26",
  hasVideo: true,
  status: "queue",
  dateKey: "today",
  hasSymptoms: true
},
{
  id: "apt-anjali",
  serial: 5,
  name: "Anjali Patel",
  gender: "F",
  age: 28,
  contact: "+91-9988771122",
  visitType: "New",
  visitTags: [{ text: "Unbilled", tone: "warning" }],
  slotTime: "10:45 am",
  slotDate: "9 Mar'26",
  hasVideo: true,
  status: "queue",
  dateKey: "today"
},
{
  id: "apt-vikram",
  serial: 6,
  name: "Vikram Singh",
  gender: "M",
  age: 42,
  contact: "+91-9001234567",
  visitType: "Follow-up",
  visitTags: [{ text: "Unbilled", tone: "warning" }, { text: "Overdue", tone: "danger" }],
  slotTime: "11:00 am",
  slotDate: "9 Mar'26",
  hasVideo: true,
  status: "queue",
  dateKey: "today"
},
{
  id: "apt-priya",
  serial: 7,
  name: "Priya Rao",
  gender: "F",
  age: 26,
  contact: "+91-9876543210",
  visitType: "Follow-up",
  visitTags: [{ text: "Billed", tone: "success" }],
  slotTime: "11:15 am",
  slotDate: "9 Mar'26",
  hasVideo: true,
  status: "queue",
  dateKey: "today",
  hasSymptoms: true
},
{
  id: "apt-arjun",
  serial: 8,
  name: "Arjun S",
  gender: "M",
  age: 4,
  contact: "+91-9123456789",
  visitType: "Follow-up",
  visitTags: [{ text: "Unbilled", tone: "warning" }],
  slotTime: "11:30 am",
  slotDate: "9 Mar'26",
  hasVideo: false,
  status: "queue",
  dateKey: "today",
  hasSymptoms: true
},
{
  id: "apt-lakshmi",
  serial: 9,
  name: "Lakshmi K",
  gender: "F",
  age: 45,
  contact: "+91-9988776655",
  visitType: "Follow-up",
  visitTags: [{ text: "Billed", tone: "success" }],
  slotTime: "11:45 am",
  slotDate: "9 Mar'26",
  hasVideo: true,
  status: "queue",
  dateKey: "today",
  starred: true,
  hasSymptoms: true
},
// ── Finished patients ──────────────────────────────────────────
{
  id: "fin-meera",
  serial: 8,
  name: "Meera Nair",
  gender: "F",
  age: 38,
  contact: "+91-9811223344",
  visitType: "Follow-up",
  slotTime: "9:30 am",
  slotDate: "9 Mar'26",
  hasVideo: false,
  status: "finished",
  dateKey: "today",
  finishedData: { symptoms: "Persistent cough 2wk, mild fever", diagnosis: "Acute Bronchitis", medication: "Azithromycin 500mg, Levocetrizine 5mg", investigations: "Chest X-ray", followUp: "16 Mar'26", completedAt: "10:05 am" }
},
{
  id: "fin-suresh",
  serial: 9,
  name: "Suresh Kumar",
  gender: "M",
  age: 52,
  contact: "+91-9900112233",
  visitType: "Follow-up",
  visitTags: [{ text: "DM+HTN", tone: "warning" }],
  slotTime: "9:00 am",
  slotDate: "9 Mar'26",
  hasVideo: true,
  status: "finished",
  dateKey: "today",
  finishedData: { symptoms: "Routine DM+HTN review", diagnosis: "Type 2 DM (controlled), Essential HTN", medication: "Metformin 500mg BD, Telma 40mg OD", investigations: "HbA1c, Lipid panel", followUp: "9 Apr'26", completedAt: "9:40 am" }
},
{
  id: "fin-deepa",
  serial: 10,
  name: "Deepa Verma",
  gender: "F",
  age: 30,
  contact: "+91-9876001122",
  visitType: "New",
  slotTime: "9:45 am",
  slotDate: "9 Mar'26",
  hasVideo: false,
  status: "finished",
  dateKey: "today",
  finishedData: { symptoms: "Sore throat 3d, nasal congestion", diagnosis: "Acute pharyngitis", medication: "Paracetamol 500mg, Cetirizine 10mg", investigations: "None", completedAt: "10:15 am" }
},
// ── Cancelled patients ─────────────────────────────────────────
{
  id: "can-rohit",
  serial: 11,
  name: "Rohit Pandey",
  gender: "M",
  age: 45,
  contact: "+91-9811556677",
  visitType: "Follow-up",
  slotTime: "11:00 am",
  slotDate: "9 Mar'26",
  hasVideo: false,
  status: "cancelled",
  dateKey: "today",
  cancelReason: "Patient called — couldn't make it due to work",
  cancelledAt: "10:15 am",
  cancelNotes: "Rescheduled for 12 Mar'26"
},
{
  id: "can-kavitha",
  serial: 12,
  name: "Kavitha M",
  gender: "F",
  age: 33,
  contact: "+91-9900998877",
  visitType: "New",
  slotTime: "2:30 pm",
  slotDate: "9 Mar'26",
  hasVideo: true,
  status: "cancelled",
  dateKey: "today",
  cancelledAt: "2:00 pm"
},
// ── Draft patients ─────────────────────────────────────────────
{
  id: "dft-amit",
  serial: 13,
  name: "Amit Gupta",
  gender: "M",
  age: 50,
  contact: "+91-9812345678",
  visitType: "Follow-up",
  visitTags: [{ text: "Partial", tone: "warning" }],
  slotTime: "1:15 pm",
  slotDate: "9 Mar'26",
  hasVideo: false,
  status: "draft",
  dateKey: "today",
  draftStatus: { symptoms: true, diagnosis: true, medCount: 2, advice: false, investigations: false, followUp: false, lastModified: "1:45 pm" }
},
{
  id: "dft-nisha",
  serial: 14,
  name: "Nisha Reddy",
  gender: "F",
  age: 22,
  contact: "+91-9801234567",
  visitType: "New",
  slotTime: "3:00 pm",
  slotDate: "9 Mar'26",
  hasVideo: true,
  status: "draft",
  dateKey: "today",
  draftStatus: { symptoms: false, diagnosis: false, medCount: 0, advice: false, investigations: false, followUp: false, lastModified: "2:55 pm" }
},
// ── Pending Digitisation (Discharge) patients ──────────────────
{
  id: "pd-rajesh",
  serial: 15,
  name: "Rajesh Menon",
  gender: "M",
  age: 62,
  contact: "+91-9811667788",
  visitType: "Inpatient",
  visitTags: [{ text: "IPD", tone: "info" }],
  slotTime: "—",
  slotDate: "6 Mar'26",
  hasVideo: false,
  status: "pending-digitisation",
  dateKey: "past-3-months",
  dischargeData: { admittedDate: "6 Mar'26", ward: "General Ward", bed: "Bed #12", currentStatus: "Stable, improving", pending: { dischargeSummary: false, billing: false, pendingLabs: "Blood culture (due 11 Mar)", notes: undefined } }
},
{
  id: "pd-sanjana",
  serial: 16,
  name: "Sanjana Vaidya",
  gender: "F",
  age: 45,
  contact: "+91-9900776655",
  visitType: "Inpatient",
  visitTags: [{ text: "Ready", tone: "success" }],
  slotTime: "—",
  slotDate: "4 Mar'26",
  hasVideo: false,
  status: "pending-digitisation",
  dateKey: "past-3-months",
  dischargeData: { admittedDate: "4 Mar'26", ward: "General Ward", bed: "Bed #8", currentStatus: "Stable", pending: { dischargeSummary: true, billing: true, notes: "Ready for discharge — pending physician sign-off" } }
}];


// Agent context constants, workspace labels, quick-prompts, buildInitialAgentThreads,
// buildWorkspaceReply, formatPatientLabel — all removed (Dr. Agent feature retired).

// ─── Column sort / filter helpers ────────────────────────────────────────────

const ALL_VISIT_TYPES = ["Follow-up", "New"];

function parseSlotTime(t) {
  const [time, mer] = t.split(" ");
  const [h, m] = time.split(":").map(Number);
  const hour = mer === "pm" && h < 12 ? h + 12 : mer === "am" && h === 12 ? 0 : h;
  return hour * 60 + m;
}

function matchesDateFilter(rowDateKey, selected) {
  if (selected === "today") return rowDateKey === "today";
  if (selected === "yesterday") return rowDateKey === "yesterday";
  if (selected === "past-3-months" || selected === "next-3-months") {
    return rowDateKey === "today" || rowDateKey === "yesterday" || rowDateKey === "past-3-months";
  }
  // past-4-months, next-4-months → show all
  return true;
}

const TAB_EMPTY_MESSAGES = {
  "queue": "There are no patients in the queue right now",
  "finished": "You haven't finished any consultations yet",
  "cancelled": "Nothing here — you haven't cancelled any appointments",
  "draft": "You haven't saved any drafts yet",
  "pending-digitisation": "No pending digitisations right now"
};

const TAB_EMPTY_ICONS = {
  "queue": Clock,
  "finished": ClipboardTick,
  "cancelled": ClipboardClose,
  "draft": ClipboardText,
  "pending-digitisation": DocumentSketch
};

export function DrAgentPage() {
  const router = useRouter();
  const [activeRailItem, setActiveRailItem] = useState(navItems[0].id);
  const [activeTab, setActiveTab] = useState("queue");
  const [query, setQuery] = useState("");
  const [tabDateFilters, setTabDateFilters] = useState({});
  const dateFilter = tabDateFilters[activeTab] ?? (activeTab === "pending-digitisation" ? "past-3-months" : "today");
  function setDateFilter(id) {
    setTabDateFilters((prev) => ({ ...prev, [activeTab]: id }));
  }
  const tableOverflowRef = useRef(null);
  const [isActionSticky, setIsActionSticky] = useState(false);

  useEffect(() => {
    const wrapper = tableOverflowRef.current;
    if (!wrapper) return;
    const update = () => {
      const hasOverflow = wrapper.scrollWidth > wrapper.clientWidth + 1;
      // Shadow only visible when content is hidden behind the Action column.
      // When scrolled all the way to the right (or no overflow), remove shadow.
      const isScrolledToEnd = wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 1;
      setIsActionSticky(hasOverflow && !isScrolledToEnd);
    };
    update();
    window.addEventListener("resize", update);
    wrapper.addEventListener("scroll", update, { passive: true });
    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(wrapper);
      const table = wrapper.querySelector("table");
      if (table) observer.observe(table);
    }
    return () => {
      window.removeEventListener("resize", update);
      wrapper.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, []);

  const stickyActionHeaderClass = isActionSticky ?
  "border-l border-tp-slate-200/80 shadow-[-8px_7px_14px_-12px_rgba(15,23,42,0.18)] before:pointer-events-none before:absolute before:inset-y-0 before:-left-3 before:w-3 before:content-[''] before:bg-gradient-to-l before:from-tp-slate-900/[0.06] before:to-transparent" :
  "";

  const stickyActionCellClass = isActionSticky ?
  "border-l border-tp-slate-200/80 shadow-[-8px_7px_14px_-12px_rgba(15,23,42,0.18)] before:pointer-events-none before:absolute before:inset-y-0 before:-left-3 before:w-3 before:content-[''] before:bg-gradient-to-l before:from-tp-slate-900/[0.06] before:to-transparent" :
  "";

  // ── Column sort + unified filter ─────────────────────────────────────────
  const [slotSort, setSlotSort] = useState("none");
  const [slotConsult, setSlotConsult] = useState("all");
  const [vtFilter, setVtFilter] = useState([]);

  // Filter panel (portal)
  const filterBtnRef = useRef(null);
  const filterPanelRef = useRef(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStyle, setFilterStyle] = useState({});
  const [filterMounted, setFilterMounted] = useState(false);
  useEffect(() => {setFilterMounted(true);}, []);

  function handleFilterBtnClick() {
    if (filterOpen) {setFilterOpen(false);return;}
    const rect = filterBtnRef.current.getBoundingClientRect();
    setFilterStyle({ position: "fixed", top: rect.bottom + 4, right: window.innerWidth - rect.right, zIndex: 9999 });
    setFilterOpen(true);
  }

  const activeFilterCount = vtFilter.length + (slotConsult !== "all" ? 1 : 0);
  const hasActiveFilters = !!query.trim() || vtFilter.length > 0 || slotConsult !== "all" || dateFilter !== "today";

  const visibleAppointments = useMemo(() => {
    let rows = queueAppointments.filter((row) => {
      const tabMatch = row.status === activeTab;
      const dateMatch = matchesDateFilter(row.dateKey, dateFilter);
      const slotMatch = slotConsult === "all" ? true :
      slotConsult === "video" ? row.hasVideo : !row.hasVideo;
      const vtMatch = vtFilter.length === 0 ? true : vtFilter.includes(row.visitType);
      const q = query.trim().toLowerCase();
      if (!tabMatch || !dateMatch || !slotMatch || !vtMatch) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.contact.toLowerCase().includes(q) ||
        row.visitType.toLowerCase().includes(q));

    });
    if (slotSort !== "none") {
      rows = [...rows].sort((a, b) => {
        const d = parseSlotTime(a.slotTime) - parseSlotTime(b.slotTime);
        return slotSort === "asc" ? d : -d;
      });
    }
    return rows;
  }, [activeTab, dateFilter, query, slotSort, slotConsult, vtFilter]);

  // Calculate counts for each tab (use each tab's own default date filter)
  const getTabCount = (tabId) => {
    const tabFilter = tabDateFilters[tabId] ?? (tabId === "pending-digitisation" ? "past-3-months" : "today");
    return queueAppointments.filter((row) => {
      const tabMatch = row.status === tabId;
      const dateMatch = matchesDateFilter(row.dateKey, tabFilter);
      const slotMatch = slotConsult === "all" ? true :
      slotConsult === "video" ? row.hasVideo : !row.hasVideo;
      const vtMatch = vtFilter.length === 0 ? true : vtFilter.includes(row.visitType);
      const q = query.trim().toLowerCase();
      if (!tabMatch || !dateMatch || !slotMatch || !vtMatch) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.contact.toLowerCase().includes(q) ||
        row.visitType.toLowerCase().includes(q));

    }).length;
  };

  function openTypeRx(patientId) {
    const url = patientId ? `/rxpad/type?patientId=${encodeURIComponent(patientId)}` : "/rxpad/type";
    router.push(url);
  }

  function openVoiceRx(patientId) {
    const url = patientId ? `/rxpad/voice?patientId=${encodeURIComponent(patientId)}` : "/rxpad/voice";
    router.push(url);
  }

  function openTabRx(patientId) {
    const url = patientId ? `/rxpad/tab?patientId=${encodeURIComponent(patientId)}` : "/rxpad/tab";
    router.push(url);
  }

  function openPrintPreview(patientId) {
    const url = patientId ?
    `/print-preview?patientId=${encodeURIComponent(patientId)}` :
    "/print-preview";
    router.push(url);
  }

  function openPatientDetails(row, from = "appointments") {
    const params = new URLSearchParams({
      patientId: row.id,
      name: row.name,
      gender: row.gender,
      age: String(row.age),
      from
    });
    router.push(`/patient-details?${params.toString()}`);
  }

  // Dr. Agent panel state removed — agent feature retired, only VoiceRx lives in RxPad route.

  return (
    <div className="min-h-screen bg-tp-slate-100 font-sans text-tp-slate-900">
      <AppTopHeader />

      <div className="flex h-[calc(100vh-62px)]">
        <aside className="hidden h-full shrink-0 md:block">
          <TPSecondaryNavPanel
            items={navItems}
            activeId={activeRailItem}
            onSelect={(id) => {
              setActiveRailItem(id);
              const target = navItems.find((it) => it.id === id);
              if (target?.href) router.push(target.href);
            }}
            variant="primary"
            height="100%"
            bottomSpacerPx={96}
            renderIcon={({ item, isActive, iconSize }) => {
              const Icon = item.icon;
              return (
                <Icon
                  size={iconSize}
                  variant={isActive ? "Bulk" : "Linear"}
                  strokeWidth={isActive ? undefined : 1.5}
                  color={isActive ? "var(--tp-slate-0)" : "var(--tp-slate-700)"} />);


            }} />
          
        </aside>

        <main className="flex-1 overflow-hidden">
          <div className="flex h-full min-w-0">
            {/* STICKY LAYOUT: section is a flex column — only the table body scrolls */}
            <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
            {/* Mobile nav strip — fixed, no scroll */}
            <div className="shrink-0 px-3 py-3 md:hidden">
              <div className="flex items-center gap-2 overflow-x-auto">
                {navItems.map((item) => {
                    const isActive = item.id === activeRailItem;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveRailItem(item.id);
                          if (item.href) router.push(item.href);
                        }}
                        className={cn(
                          "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          isActive ?
                          "border-tp-blue-500 bg-tp-blue-50 text-tp-blue-700" :
                          "border-tp-slate-200 bg-white text-tp-slate-600"
                        )}>
                        
                      {item.label}
                    </button>);

                  })}
              </div>
            </div>

            {/* Banner — fixed, shrinks to natural height */}
            <div className="shrink-0">
              <AppointmentBanner
                  title="Your Appointments"
                  actions={
                  <>
                    <Button
                      variant="outline"
                      theme="primary"
                      size="md"
                      surface="dark"
                      className="whitespace-nowrap !bg-[rgba(255,255,255,0.13)] backdrop-blur-sm"
                      leftIcon={<Plus size={20} strokeWidth={1.5} />}>
                      
                      Add Appointment
                    </Button>
                    <Button
                      variant="solid"
                      theme="primary"
                      size="md"
                      surface="dark"
                      className="whitespace-nowrap"
                      leftIcon={<Flash size={24} variant="Linear" strokeWidth={1.5} />}>
                      
                      Start Walk-In
                    </Button>
                  </>
                  } />
                
            </div>

            {/* Card — flex-1 so it takes all remaining height; overlaps banner by 60px */}
            {/* Note: no overflow-hidden here — the date picker popover must be able to escape */}
            <div className="relative z-10 -mt-[60px] flex flex-1 flex-col px-3 pb-6 sm:px-4 lg:px-[18px]">
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-tp-slate-200 bg-white">

                {/* Tabs row — fixed, does not scroll vertically */}
                <div className="shrink-0 overflow-x-auto border-b border-tp-slate-100 px-2 pt-2 sm:px-4 sm:pt-3 lg:px-[18px] lg:pt-[18px]">
                  <div className="flex min-w-max items-center gap-0">
                    {appointmentTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                              "group relative flex shrink-0 flex-col gap-2 rounded-t-lg px-3 pb-0 pt-1 transition-colors",
                              // hover: only background changes, text color stays same
                              isActive ?
                              "text-tp-blue-500" :
                              "text-tp-slate-700 hover:bg-tp-slate-100"
                            )}
                            aria-pressed={isActive}>
                            
                          <span className="flex items-center gap-2 text-[14px] font-medium">
                            <Icon
                                size={20}
                                variant={isActive ? "Bulk" : "Linear"}
                                strokeWidth={isActive ? undefined : 1.5}
                                color={isActive ? "var(--tp-blue-500)" : "var(--tp-slate-600)"} />
                              
                            <span className={cn(isActive && "font-semibold")}>
                              {tab.label}
                            </span>
                            <span className={cn(
                                "inline-flex items-center justify-center rounded-full px-[6px] h-[18px] min-w-[18px] text-[10px] font-semibold tabular-nums leading-none",
                                isActive ?
                                "bg-tp-blue-100 text-tp-blue-400" :
                                "bg-tp-slate-100 text-tp-slate-400"
                              )}>
                              {getTabCount(tab.id)}
                            </span>
                          </span>

                          <span
                              className={cn(
                                "h-[3px] w-full translate-y-px rounded-full transition-opacity",
                                isActive ?
                                "bg-tp-blue-500 opacity-100" :
                                "bg-tp-blue-500 opacity-0"
                              )} />
                            
                        </button>);

                      })}
                  </div>
                </div>

                {/* Search + filter bar — fixed, does not scroll */}
                <div className="shrink-0 px-3 pt-4 pb-3 sm:px-4 lg:px-[18px] lg:pt-5 lg:pb-4">
                  <div className="flex flex-nowrap items-center justify-between gap-3">
                    <label className="relative min-w-[160px] w-full max-w-[420px]">
                      <SearchNormal1
                          size={20}
                          variant="Linear"
                          strokeWidth={1.5}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tp-slate-400" />
                        
                      <input
                          type="text"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search by patient name / ID / mobile number"
                          className="h-[38px] w-full rounded-[10px] border border-tp-slate-200 bg-white pl-10 pr-3 text-sm text-ellipsis text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-300 focus:border-tp-blue-300 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/15" />
                        
                    </label>

                    <div className="flex shrink-0 items-center gap-2">
                      {/* Unified filter button */}
                      <button
                          ref={filterBtnRef}
                          type="button"
                          onClick={handleFilterBtnClick}
                          className={cn(
                            "inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border px-3 text-[14px] font-medium transition-colors whitespace-nowrap",
                            activeFilterCount > 0 ?
                            "border-tp-blue-300 bg-tp-blue-50 text-tp-blue-700 hover:bg-tp-blue-100" :
                            "border-tp-slate-200 bg-white text-tp-slate-600 hover:border-tp-slate-300 hover:bg-tp-slate-50"
                          )}>
                          
                        <ListFilter size={15} strokeWidth={2} className="shrink-0 text-tp-slate-600" />
                        <span>Filter</span>
                        {activeFilterCount > 0 &&
                          <span className="rounded-full bg-tp-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                            {activeFilterCount}
                          </span>
                          }
                      </button>

                      <DateRangePicker
                          value={dateFilter}
                          onChange={(sel) => setDateFilter(sel.presetId)}
                          className="min-w-[80px] max-w-[180px]"
                          hideFuturePresets={activeTab !== "queue"} />
                        
                    </div>
                  </div>
                </div>

                {/* Active filter tags — shown between search bar and table */}
                {(vtFilter.length > 0 || slotConsult !== "all") &&
                  <div className="shrink-0 px-3 pb-3 sm:px-4 lg:px-[18px]">
                    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-tp-slate-100 bg-tp-slate-50 px-3 py-2">
                      <span className="shrink-0 text-[12px] font-semibold text-tp-slate-500">
                        Filter: {activeFilterCount}
                      </span>
                      <span className="h-4 w-px shrink-0 bg-tp-slate-200" />
                      {slotConsult !== "all" &&
                      <FilterTag
                        prefix="Slot"
                        value={slotConsult === "video" ? "Teleconsultation" : "In-Clinic"}
                        onRemove={() => setSlotConsult("all")} />

                      }
                      {vtFilter.map((vt) =>
                      <FilterTag
                        key={vt}
                        prefix="Visit Type"
                        value={vt}
                        onRemove={() => setVtFilter((p) => p.filter((v) => v !== vt))} />

                      )}
                      <button
                        type="button"
                        onClick={() => {setSlotConsult("all");setVtFilter([]);}}
                        className="ml-auto shrink-0 text-[12px] font-semibold text-tp-warning-600 underline underline-offset-2 decoration-tp-warning-400 hover:text-tp-warning-700 transition-colors">
                        
                        Clear all
                      </button>
                    </div>
                  </div>
                  }

                {/* Table — flex-1, only this area scrolls */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <div
                      ref={tableOverflowRef}
                      className="flex-1 min-h-0 overflow-auto px-3 pb-4 sm:px-4 lg:px-[18px]">
                      
                    <div className="pt-1">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="rounded-[12px] bg-tp-slate-100">
                            <th className="rounded-l-[12px] px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 w-[48px]">
                              #
                            </th>
                            <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[160px]">
                              Name
                            </th>
                            <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[155px]">
                              Contact
                            </th>
                            <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[120px]">
                              Visit Type
                            </th>
                            <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[120px]">
                              <button
                                  type="button"
                                  onClick={() => setSlotSort((s) => s === "none" ? "asc" : s === "asc" ? "desc" : "none")}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 -ml-0.5 rounded-[6px] px-0.5 py-0.5 transition-colors hover:bg-tp-slate-200/70",
                                    slotSort !== "none" && "text-tp-blue-600"
                                  )}>
                                  
                                <span className="uppercase">Slot</span>
                                <ColumnSortIcon dir={slotSort} />
                              </button>
                            </th>
                            <th className={cn(
                                "relative sticky right-0 z-20 w-[1%] whitespace-nowrap rounded-tr-[12px] rounded-br-[12px] bg-tp-slate-100 pl-3 pr-2 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700",
                                stickyActionHeaderClass
                              )}>
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {visibleAppointments.length === 0 ?
                            <tr>
                              <td colSpan={6} className="py-12 text-center">
                                <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                  {(() => {
                                    const EmptyIcon = TAB_EMPTY_ICONS[activeTab];
                                    return (
                                      <EmptyIcon
                                        size={140}
                                        variant="Bulk"
                                        color="var(--tp-slate-200)" />);


                                  })()}
                                  <p className="text-[14px] font-medium text-tp-slate-500">
                                    {hasActiveFilters ?
                                    "No appointments matching your filters." :
                                    TAB_EMPTY_MESSAGES[activeTab]}
                                  </p>
                                  {hasActiveFilters &&
                                  <button
                                    type="button"
                                    onClick={() => {setQuery("");setSlotConsult("all");setVtFilter([]);setTabDateFilters({});}}
                                    className="mt-0.5 text-[12px] font-semibold text-tp-warning-600 underline underline-offset-2 decoration-tp-warning-400 transition-colors hover:text-tp-warning-700">
                                    
                                      Clear all filters
                                    </button>
                                  }
                                </div>
                              </td>
                            </tr> :

                            visibleAppointments.map((row, index) =>
                            <tr
                              key={row.id}
                              className="h-16 border-b border-tp-slate-100 last:border-b-0 hover:bg-tp-slate-50/50">
                              
                                <td className="w-[48px] px-3 py-3 text-sm text-tp-slate-700">
                                  {index + 1}
                                </td>

                                <td className="px-3 py-3 align-middle">
                                  <div className="overflow-hidden">
                                    <span className="inline-flex items-center gap-1">
                                      <button
                                      type="button"
                                      onClick={() => openPatientDetails(row)}
                                      className="cursor-pointer truncate text-left text-sm font-semibold text-tp-blue-500 hover:underline">
                                      
                                        {row.name}
                                      </button>
                                      {row.hasSymptoms &&
                                    <SymptomTooltip>
                                          <TPMedicalIcon name="virus" variant="bulk" size={16} color="var(--tp-success-500)" />
                                        </SymptomTooltip>
                                    }
                                    </span>
                                    <p className="mt-1 truncate text-sm text-tp-slate-700">
                                      {row.gender}, {row.age}y
                                    </p>
                                  </div>
                                </td>

                                <td className="px-3 py-3 align-middle">
                                  <div className="overflow-hidden">
                                    <span className="block whitespace-nowrap text-sm text-tp-slate-700">
                                      {row.contact}
                                    </span>
                                    {row.contactBadge &&
                                  <div className="mt-1">
                                        <TPTag
                                      color="violet"
                                      variant="light"
                                      size="sm">
                                      
                                          {row.contactBadge}
                                        </TPTag>
                                      </div>
                                  }
                                  </div>
                                </td>

                                <td className="px-3 py-3 align-middle text-sm text-tp-slate-700">
                                  <div className="overflow-hidden">
                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                      {row.visitType}
                                    </span>
                                    {row.visitTags && row.visitTags.length > 0 &&
                                  <div className="mt-1 flex items-center gap-1">
                                        {row.visitTags.map((tag, idx) =>
                                    <TPTag
                                      key={idx}
                                      color={tag.tone === "danger" ? "error" : tag.tone === "warning" ? "warning" : tag.tone === "info" ? "blue" : "success"}
                                      variant="light"
                                      size="sm">
                                      
                                            {tag.text}
                                          </TPTag>
                                    )}
                                      </div>
                                  }
                                  </div>
                                </td>

                                <td className="px-3 py-3 align-middle">
                                  <div className="overflow-hidden">
                                    <div className="whitespace-nowrap text-sm text-tp-slate-700">
                                      <span className="inline-flex items-center gap-1">
                                        {row.slotTime}
                                        {row.hasVideo &&
                                      <VideoConsultTooltip>
                                            <Video
                                          size={13}
                                          variant="Bulk"
                                          color="var(--tp-violet-500)" />
                                        
                                          </VideoConsultTooltip>
                                      }
                                      </span>
                                    </div>
                                    <p className="mt-1 whitespace-nowrap text-xs text-tp-slate-600">
                                      {row.slotDate}
                                    </p>
                                  </div>
                                </td>

                                <td className={cn(
                                "relative sticky right-0 z-10 w-[1%] whitespace-nowrap bg-white pl-3 pr-2 py-3 align-middle",
                                stickyActionCellClass
                              )}>
                                  <div className="flex items-center gap-3 whitespace-nowrap">
                                    {/* Tab-specific CTA */}
                                    {activeTab === "queue" &&
                                  <div className="transition-all hover:scale-105 duration-200">
                                        <TPSplitButton
                                      primaryAction={{
                                        label: "VoiceRx",
                                        onClick: () => openVoiceRx(row.id)
                                      }}
                                      secondaryActions={[
                                      { id: "voice-rx", label: "VoiceRx", onClick: () => openVoiceRx(row.id) },
                                      { id: "type-rx", label: "TypeRx", onClick: () => openTypeRx(row.id) },
                                      { id: "snap-rx", label: "SnapRx", onClick: () => {} },
                                      { id: "smart-sync", label: "SmartSync", onClick: () => {} },
                                      { id: "tab-rx", label: "TabRx", onClick: () => openTabRx(row.id) }]
                                      }
                                      variant="outline"
                                      theme="primary"
                                      size="md" />
                                    
                                      </div>
                                  }
                                    {activeTab === "finished" &&
                                  <Button
                                    variant="outline"
                                    theme="primary"
                                    size="md"
                                    leftIcon={<Printer size={16} variant="Linear" />}
                                    onClick={() => openPrintPreview(row.id)}>
                                    
                                        Print Rx
                                      </Button>
                                  }
                                    {activeTab === "draft" &&
                                  <Button
                                    variant="outline"
                                    theme="primary"
                                    size="md"
                                    onClick={() => openVoiceRx(row.id)}>
                                    
                                        Resume Rx
                                      </Button>
                                  }
                                    {activeTab === "pending-digitisation" &&
                                  <Button
                                    variant="outline"
                                    theme="primary"
                                    size="md"
                                    onClick={() => {}}>
                                    
                                        Digitise Rx
                                      </Button>
                                  }
                                    {/* cancelled — no CTA, just three-dot below.
                                       Per-row Dr. Agent / VoiceRx icon was removed from the
                                       appointments page entirely — the agent concept only
                                       lives inside the in-visit (RxPad) route. */}

                                    <PatientActionsMenu
                                    slots={[
                                      "view",
                                      "create-bill",
                                      "add-labs",
                                      "certificate",
                                      "upload",
                                      "admit-ipd",
                                      "health-checkup",
                                      ...(activeTab === "queue" ? ["cancel-appointment"] : []),
                                      ...(activeTab !== "finished" && activeTab !== "cancelled"
                                        ? ["end-visit"]
                                        : []),
                                    ]}
                                    ariaLabel={`More actions for ${row.name}`}
                                    onSelect={(slot) => {
                                      if (slot === "view") openPatientDetails(row);
                                      else if (slot === "end-visit") openVoiceRx(row.id);
                                      // Other slots: stub — wire to real
                                      // services when those flows land.
                                      // eslint-disable-next-line no-console
                                      else console.info("[appointments] action", slot, row.name);
                                    }} />
                                  </div>
                                </td>
                              </tr>
                            )
                            }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>
          </div>
        </main>
      </div>

      {/* Unified filter panel — portal-rendered to escape overflow:hidden */}
      {filterMounted && filterOpen &&
      <CommonFilterPanel
        style={filterStyle}
        panelRef={filterPanelRef}
        triggerRef={filterBtnRef}
        currentConsult={slotConsult}
        currentVtFilter={vtFilter}
        onApply={(consult, vtf) => {setSlotConsult(consult);setVtFilter(vtf);setFilterOpen(false);}} />

      }
    </div>);

}

// ─── Sub-components (AgentFloatingWindow + AgentDynamicOutputCard removed — Dr. Agent feature retired) ──

// DELETED: AgentFloatingWindow (386 LOC) — never rendered, agent chat retired
// DELETED: AgentDynamicOutputCard (82 LOC) — only used by AgentFloatingWindow

// ─── Dynamic sort icon (active direction highlighted in blue) ─────────────────
// (moved up from below the deleted blocks)
// ─── Dynamic sort icon (active direction highlighted in blue) ─────────────────

function ColumnSortIcon({ dir }) {
  return (
    <span className="inline-flex flex-col items-center gap-[2px]">
      <span className={cn(
        "h-0 w-0 border-b-[4px] border-l-[3px] border-r-[3px] border-l-transparent border-r-transparent transition-colors",
        dir === "asc" ? "border-b-tp-blue-500" : "border-b-tp-slate-600"
      )} />
      <span className={cn(
        "h-0 w-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent transition-colors",
        dir === "desc" ? "border-t-tp-blue-500" : "border-t-tp-slate-600"
      )} />
    </span>);

}

// ─── Filter chip tag ──────────────────────────────────────────────────────────

function FilterTag({ prefix, value, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-tp-blue-200 bg-tp-blue-50 px-2.5 py-1 text-[12px]">
      <span className="font-medium text-tp-blue-300">{prefix}:</span>
      <span className="font-semibold text-tp-blue-500">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 text-tp-blue-300 transition-colors hover:bg-tp-blue-100 hover:text-tp-blue-500">
        
        <X size={10} strokeWidth={2.5} />
      </button>
    </span>);

}

// ─── Unified filter panel ─────────────────────────────────────────────────────

function CommonFilterPanel({
  style,
  panelRef,
  triggerRef,
  currentConsult,
  currentVtFilter,
  onApply







}) {
  const [consult, setConsult] = useState(currentConsult);
  const [vtFilter, setVtFilter] = useState(currentVtFilter);

  // Stale-closure safe ref so the mousedown handler always sees latest onApply
  const onApplyRef = useRef(onApply);
  useEffect(() => {onApplyRef.current = onApply;}, [onApply]);

  // Click-outside → apply staged filters (not discard)
  useEffect(() => {
    function handler(e) {
      const panel = panelRef.current;
      if (panel?.contains(e.target)) return;
      if (triggerRef?.current?.contains(e.target)) return;
      onApplyRef.current(consult, vtFilter);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [consult, vtFilter, triggerRef, panelRef]);

  const consultOpts = [
  { v: "video", label: "Teleconsultation" },
  { v: "in-clinic", label: "In-clinic" }];


  function toggleVtType(t) {
    setVtFilter((prev) =>
    prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function isVtChecked(t) {
    return vtFilter.includes(t);
  }

  function handleClear() {
    setConsult("all");
    setVtFilter([]);
  }

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className="w-[236px] overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white shadow-[0_8px_24px_-4px_rgba(23,23,37,0.12)]">
      
      {/* Slot Type section */}
      <div className="p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-tp-slate-400">Slot Type</p>
        <div className="flex flex-col gap-0.5">
          {consultOpts.map(({ v, label }) =>
          <button
            key={v}
            type="button"
            onClick={() => setConsult(v)}
            className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-tp-slate-50">
            
              <span className={cn(
              "size-4 shrink-0 rounded-full border-2 transition-colors",
              consult === v ?
              "border-tp-blue-500 bg-tp-blue-500 shadow-[inset_0_0_0_2px_white]" :
              "border-tp-slate-300"
            )} />
              <span className={cn(
              "text-[14px]",
              consult === v ? "font-medium text-tp-slate-900" : "text-tp-slate-600"
            )}>
                {label}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="mx-3 h-px bg-tp-slate-100" />

      {/* Visit Types section */}
      <div className="p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-tp-slate-400">Visit Type</p>
        <div className="flex flex-col gap-0.5">
          {ALL_VISIT_TYPES.map((t) =>
          <button
            key={t}
            type="button"
            onClick={() => toggleVtType(t)}
            className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-tp-slate-50">
            
              <span className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors",
              isVtChecked(t) ? "border-tp-blue-500 bg-tp-blue-500" : "border-tp-slate-300"
            )}>
                {isVtChecked(t) && <Check size={10} strokeWidth={3} className="text-white" />}
              </span>
              <span className={cn("text-[14px]", isVtChecked(t) ? "font-medium text-tp-slate-900" : "text-tp-slate-600")}>
                {t}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="mx-3 h-px bg-tp-slate-100" />

      {/* Footer — Clear (warning orange) + Apply, right-aligned */}
      <div className="flex items-center justify-end gap-3 border-t border-tp-slate-100 p-3 pt-2.5">
        <button
          type="button"
          onClick={handleClear}
          className="text-[12px] font-semibold text-tp-warning-600 underline underline-offset-2 decoration-tp-warning-400 transition-colors hover:text-tp-warning-700">
          
          Clear
        </button>
        <button
          type="button"
          onClick={() => onApply(consult, vtFilter)}
          className="rounded-[8px] bg-tp-blue-500 px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-tp-blue-600">
          
          Apply
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── Symptom Tooltip (portal-based, z-index safe) ────────────────────────────

function SymptomTooltip({ children }) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState({});
  const triggerRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {setMounted(true);}, []);

  function show() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setStyle({
        position: "fixed",
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
        zIndex: 9999
      });
    }
    setVisible(true);
  }

  function hide() {setVisible(false);}

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="inline-flex">
        
        <span className="inline-flex flex-shrink-0 items-center justify-center">
          {children}
        </span>
      </span>
      {visible && mounted &&
      createPortal(
        <div
          style={style}
          className="max-w-[220px] whitespace-normal rounded-[6px] bg-tp-slate-800 px-[8px] py-[4px] text-[10px] font-medium leading-[14px] text-white shadow-md">
          
            This patient has submitted symptom collector data — start consultation to view it
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-[3px] border-transparent border-t-tp-slate-800" />
          </div>,
        document.body
      )}
    </>);

}

// ─── Video Consultation Tooltip (hoverable + accessible) ─────────────────────

function VideoConsultTooltip({ children }) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState({});
  const triggerRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {setMounted(true);}, []);

  function clearHideTimeout() {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }

  function show() {
    clearHideTimeout();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setStyle({
        position: "fixed",
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
        zIndex: 9999
      });
    }
    setVisible(true);
  }

  function hide() {
    hideTimeoutRef.current = setTimeout(() => setVisible(false), 150);
  }

  useEffect(() => {
    return () => {if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);};
  }, []);

  return (
    <>
      <span ref={triggerRef} onMouseEnter={show} onMouseLeave={hide} className="inline-flex cursor-pointer">
        {children}
      </span>
      {visible && mounted &&
      createPortal(
        <div
          style={style}
          onMouseEnter={clearHideTimeout}
          onMouseLeave={hide}
          className="w-[208px] overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white shadow-[0_8px_24px_-4px_rgba(23,23,37,0.16)]">
          
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-tp-slate-100 px-3 py-2.5">
              <span
              className="flex size-[28px] shrink-0 items-center justify-center rounded-[7px]"
              style={{ background: "rgba(138,77,187,0.12)" }}>
              
                <Video size={14} variant="Bulk" color="var(--tp-violet-500)" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-tp-slate-900">Video Consultation</p>
                <p className="text-[12px] text-tp-slate-500">Scheduled call</p>
              </div>
            </div>
            {/* Body */}
            <div className="px-3 py-2.5">
              <p className="mb-2.5 text-[12px] leading-relaxed text-tp-slate-500">
                Patient has requested a video call for this appointment slot.
              </p>
              <div className="flex gap-1.5">
                <button
                type="button"
                className="flex-1 rounded-[8px] bg-tp-blue-500 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-tp-blue-600">
                
                  Join Call
                </button>
                <button
                type="button"
                className="flex-1 rounded-[8px] border border-tp-slate-200 py-1.5 text-[12px] font-medium text-tp-slate-700 transition-colors hover:bg-tp-slate-50">
                
                  Reschedule
                </button>
              </div>
            </div>
          </div>,
        document.body
      )}
    </>);

}

