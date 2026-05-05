"use client";

/**
 * FollowUpsPage — patients with a scheduled return visit.
 *
 * Same chrome as Appointments / All Patients (AppTopHeader, nav rail,
 * AppointmentBanner, white-card with -mt-[60px] overlap). Body shows a
 * single table — no tabs — listing the next round of follow-up
 * patients with their phone, ID, last visit, scheduled follow-up
 * date, and a status pill (`Due` / `Overdue` / `Upcoming` /
 * `Completed`).
 *
 * Action column: a primary "View" button (≥90px) plus the shared
 * PatientActionsMenu kebab. The kebab here surfaces `view` and
 * `send-reminder` so the doctor can ping the patient about the
 * upcoming visit without leaving this page.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Plus } from "lucide-react";
import { CalendarAdd } from "iconsax-reactjs";

import { cn } from "@/src/hooks/utils";
import { TPButton as Button } from "@/src/components/atoms/Button/button-system";
import { SecondaryNavPanel as TPSecondaryNavPanel } from "@/src/components/organisms/shared/SecondaryNavPanel";
import { AppTopHeader } from "@/src/components/organisms/shared/AppTopHeader";
import { DASHBOARD_NAV_ITEMS } from "@/src/components/organisms/shared/dashboard-nav-items";
import { PatientActionsMenu } from "@/src/components/organisms/shared/PatientActionsMenu";
import { AppointmentBanner } from "@/src/components/molecules/AppointmentBanner";
import { DateRangePicker } from "@/src/components/molecules/DateRangePicker";

const MOCK_FOLLOWUPS = [
  { id: "apt-ramesh-ckd", name: "Ramesh Kumar", gender: "M", age: 76, contact: "+91-9876012345", pid: "P80290101", lastVisit: "2025-12-04", followUpDate: "2026-01-04", status: "Overdue" },
  { id: "apt-neha", name: "Neha Gupta", gender: "F", age: 32, contact: "+91-9876501234", pid: "P80290234", lastVisit: "2026-02-15", followUpDate: "2026-03-15", status: "Due" },
  { id: "apt-priya", name: "Priya Rao", gender: "F", age: 26, contact: "+91-9876543210", pid: "P80290721", lastVisit: "2026-02-10", followUpDate: "2026-03-10", status: "Upcoming" },
  { id: "apt-arjun", name: "Arjun S", gender: "M", age: 4, contact: "+91-9123456789", pid: "P80290854", lastVisit: "2026-01-18", followUpDate: "2026-02-18", status: "Completed" },
  { id: "apt-lakshmi", name: "Lakshmi K", gender: "F", age: 45, contact: "+91-9988776655", pid: "P80290917", lastVisit: "2026-02-21", followUpDate: "2026-03-21", status: "Upcoming" },
  { id: "fin-meera", name: "Meera Nair", gender: "F", age: 38, contact: "+91-9811223344", pid: "P80291023", lastVisit: "2026-02-28", followUpDate: "2026-03-28", status: "Upcoming" },
  { id: "fin-suresh", name: "Suresh Kumar", gender: "M", age: 52, contact: "+91-9900112233", pid: "P80291148", lastVisit: "2026-02-08", followUpDate: "2026-03-08", status: "Due" },
  { id: "fin-deepa", name: "Deepa Verma", gender: "F", age: 30, contact: "+91-9876001122", pid: "P80291269", lastVisit: "2026-01-12", followUpDate: "2026-02-12", status: "Overdue" },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_TONES = {
  Due: "bg-[rgba(245,158,11,0.10)] text-[#B45309] border-[rgba(245,158,11,0.20)]",
  Overdue: "bg-[rgba(239,68,68,0.10)] text-[#B91C1C] border-[rgba(239,68,68,0.20)]",
  Upcoming: "bg-tp-blue-50 text-tp-blue-700 border-tp-blue-200",
  Completed: "bg-[rgba(34,197,94,0.10)] text-tp-success-700 border-[rgba(34,197,94,0.20)]",
};

const FOLLOW_UP_ACTIONS = ["view", "send-reminder"];

export function FollowUpsPage() {
  const router = useRouter();
  const [activeRailItem, setActiveRailItem] = useState("follow-ups");
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("till-date");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_FOLLOWUPS;
    return MOCK_FOLLOWUPS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.contact.toLowerCase().includes(q) ||
        p.pid.toLowerCase().includes(q)
    );
  }, [query]);

  function openPatientDetails(p) {
    const params = new URLSearchParams({
      patientId: p.id,
      name: p.name,
      gender: p.gender,
      age: String(p.age),
      from: "follow-ups",
    });
    router.push(`/patient-details?${params.toString()}`);
  }

  function handleAction(slot, p) {
    // eslint-disable-next-line no-console
    console.info("[follow-ups] action", slot, p.name);
    if (slot === "view") openPatientDetails(p);
    if (slot === "send-reminder") {
      // Stub — real wiring will call the messaging API.
      // eslint-disable-next-line no-alert
      alert(`Reminder sent to ${p.name} (${p.contact})`);
    }
  }

  function handleDownload() {
    const rows = [
      ["#", "Name", "Gender", "Age", "Contact", "Patient ID", "Last Visit", "Follow-up Date", "Status"],
      ...filtered.map((p, i) => [
        i + 1, p.name, p.gender === "M" ? "Male" : "Female", p.age, p.contact, p.pid,
        formatDate(p.lastVisit), formatDate(p.followUpDate), p.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `follow-ups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-tp-slate-100 font-sans text-tp-slate-900">
      <AppTopHeader />

      <div className="flex h-[calc(100vh-62px)]">
        <aside className="hidden h-full shrink-0 md:block">
          <TPSecondaryNavPanel
            items={DASHBOARD_NAV_ITEMS}
            activeId={activeRailItem}
            onSelect={(id) => {
              setActiveRailItem(id);
              const target = DASHBOARD_NAV_ITEMS.find((it) => it.id === id);
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
                  color={isActive ? "var(--tp-slate-0)" : "var(--tp-slate-700)"}
                />
              );
            }}
          />
        </aside>

        <main className="flex-1 overflow-hidden">
          <div className="flex h-full min-w-0">
            <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
              {/* Mobile nav strip */}
              <div className="shrink-0 px-3 py-3 md:hidden">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {DASHBOARD_NAV_ITEMS.map((item) => {
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
                          isActive
                            ? "border-tp-blue-500 bg-tp-blue-50 text-tp-blue-700"
                            : "border-tp-slate-200 bg-white text-tp-slate-600"
                        )}>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="shrink-0">
                <AppointmentBanner
                  title="Follow-ups"
                  actions={
                    <Button
                      variant="outline"
                      theme="primary"
                      size="md"
                      surface="dark"
                      className="whitespace-nowrap !bg-[rgba(255,255,255,0.13)] backdrop-blur-sm"
                      leftIcon={<Plus size={20} strokeWidth={1.5} />}>
                      Schedule Follow-up
                    </Button>
                  }
                />
              </div>

              <div className="relative z-10 -mt-[60px] flex flex-1 flex-col px-3 pb-6 sm:px-4 lg:px-[18px]">
                <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-tp-slate-200 bg-white">

                  {/* Toolbar — same shape as All Patients */}
                  <div className="shrink-0 px-3 pt-4 pb-3 sm:px-4 lg:px-[18px] lg:pt-5 lg:pb-4">
                    <div className="flex flex-nowrap items-center justify-between gap-3">
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <label className="relative min-w-[160px] w-full max-w-[420px]">
                          <Search
                            size={18}
                            strokeWidth={1.5}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tp-slate-400"
                          />
                          <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by patient name / ID / mobile number"
                            className="h-[38px] w-full rounded-[10px] border border-tp-slate-200 bg-white pl-10 pr-3 text-sm text-tp-slate-700 placeholder:text-tp-slate-400 transition-colors hover:border-tp-slate-300 focus:border-tp-blue-300 focus:outline-none focus:ring-2 focus:ring-tp-blue-500/15"
                          />
                        </label>
                        <DateRangePicker
                          value={dateFilter}
                          onChange={(sel) => setDateFilter(sel.presetId)}
                          className="min-w-[120px] max-w-[200px]"
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        <p className="text-[12px] text-tp-slate-300 font-medium whitespace-nowrap">
                          (Showing{" "}
                          <span className="text-tp-slate-500 font-semibold">
                            {filtered.length}
                          </span>{" "}
                          of{" "}
                          <span className="text-tp-slate-500 font-semibold">
                            {MOCK_FOLLOWUPS.length}
                          </span>{" "}
                          follow-ups)
                        </p>
                        <button
                          type="button"
                          onClick={handleDownload}
                          aria-label="Download follow-ups list as CSV"
                          className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-tp-slate-200 bg-white text-tp-slate-600 transition-colors hover:border-tp-slate-300 hover:bg-tp-slate-50 hover:text-tp-slate-700">
                          <Download size={16} strokeWidth={1.6} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <div className="flex-1 min-h-0 overflow-auto px-3 pb-4 sm:px-4 lg:px-[18px]">
                      <div className="pt-1">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="rounded-[12px] bg-tp-slate-100">
                              <th className="rounded-l-[12px] px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 w-[48px]">#</th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[200px]">Patient details</th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[155px]">Contact</th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[120px]">Patient ID</th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[120px]">Last visit</th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[120px]">Follow-up date</th>
                              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700 min-w-[110px]">Status</th>
                              <th className="sticky right-0 z-20 w-[1%] whitespace-nowrap rounded-tr-[12px] rounded-br-[12px] bg-tp-slate-100 pl-3 pr-2 py-3 text-left text-[12px] font-semibold uppercase text-tp-slate-700">Action</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filtered.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-12 text-center">
                                  <div className="flex flex-col items-center gap-3">
                                    <CalendarAdd size={140} variant="Bulk" color="var(--tp-slate-200)" />
                                    <p className="text-[14px] font-medium text-tp-slate-500">
                                      No follow-ups match your search.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              filtered.map((p, i) => (
                                <tr
                                  key={p.id}
                                  className="h-16 border-b border-tp-slate-100 last:border-b-0 hover:bg-tp-slate-50/50">
                                  <td className="w-[48px] px-3 py-3 text-sm text-tp-slate-700">{i + 1}</td>
                                  <td className="px-3 py-3 align-middle">
                                    <button
                                      type="button"
                                      onClick={() => openPatientDetails(p)}
                                      className="block truncate text-left text-sm font-semibold text-tp-blue-500 hover:underline">
                                      {p.name}
                                    </button>
                                    <p className="mt-1 truncate text-sm text-tp-slate-700">
                                      {p.gender === "M" ? "Male" : "Female"}, {p.age}y
                                    </p>
                                  </td>
                                  <td className="px-3 py-3 align-middle text-sm text-tp-slate-700">{p.contact}</td>
                                  <td className="px-3 py-3 align-middle font-mono text-[13px] text-tp-slate-700">{p.pid}</td>
                                  <td className="px-3 py-3 align-middle text-sm text-tp-slate-700">{formatDate(p.lastVisit)}</td>
                                  <td className="px-3 py-3 align-middle text-sm font-medium text-tp-slate-900">{formatDate(p.followUpDate)}</td>
                                  <td className="px-3 py-3 align-middle">
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                        STATUS_TONES[p.status] || "bg-tp-slate-100 text-tp-slate-600 border-tp-slate-200"
                                      )}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="sticky right-0 z-10 bg-white pl-3 pr-2 py-3 align-middle">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        theme="primary"
                                        size="sm"
                                        className="!min-w-[90px] whitespace-nowrap"
                                        onClick={() => openPatientDetails(p)}>
                                        View
                                      </Button>
                                      <PatientActionsMenu
                                        slots={FOLLOW_UP_ACTIONS}
                                        ariaLabel={`More actions for ${p.name}`}
                                        onSelect={(slot) => handleAction(slot, p)}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
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
    </div>
  );
}
