"use client";

/**
 * AppTopHeader — the 62px sticky top bar used by every dashboard-style
 * page (Appointments, All Patients, future OPD Billing, etc.).
 *
 * Renders: TatvaPractice logo on the left; tutorial / notifications /
 * clinic switcher / profile avatar on the right. Identical to the
 * header originally embedded inside DrAgentPage — extracted so the All
 * Patients page (and future listing pages) reuse the exact same chrome
 * without copy-pasting 200 lines of JSX.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Hospital, Notification, TickCircle } from "iconsax-reactjs";
import { TutorialPlayIcon } from "@/src/components/atoms/TutorialPlayIcon/TutorialPlayIcon";
import { cn } from "@/src/hooks/utils";

const REF_LOGO = "/assets/b38df11ad80d11b9c1d530142443a18c2f53d406.png";
const REF_AVATAR = "/assets/52cb18088c5b8a5db6a7711c9900d7d08a1bac42.png";

const DUMMY_CLINICS = [
  { id: "rajeshwar", name: "Rajeshwar Eye Clinic" },
  { id: "city", name: "City Medical Centre" },
  { id: "sunrise", name: "Sunrise Hospital" },
  { id: "apollo", name: "Apollo Clinic, Banjara Hills" },
  { id: "care", name: "Care Diagnostics" },
];

export function AppTopHeader() {
  const [isClinicMenuOpen, setClinicMenuOpen] = useState(false);
  const [activeClinic, setActiveClinic] = useState(DUMMY_CLINICS[0].id);
  const [clinicSearch, setClinicSearch] = useState("");
  const clinicMenuRef = useRef(null);
  const clinicSearchRef = useRef(null);
  const clinicListRef = useRef(null);
  const [clinicListCanScrollDown, setClinicListCanScrollDown] = useState(false);

  function updateClinicScrollState() {
    const el = clinicListRef.current;
    if (!el) return;
    setClinicListCanScrollDown(el.scrollHeight > el.scrollTop + el.clientHeight + 2);
  }

  useEffect(() => {
    function onPointerDown(event) {
      if (!clinicMenuRef.current?.contains(event.target)) {
        setClinicMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (isClinicMenuOpen) {
      setClinicSearch("");
      setTimeout(() => {
        clinicSearchRef.current?.focus();
        updateClinicScrollState();
      }, 50);
    }
  }, [isClinicMenuOpen]);

  useEffect(() => {
    if (isClinicMenuOpen) {
      requestAnimationFrame(updateClinicScrollState);
    }
  }, [clinicSearch, isClinicMenuOpen]);

  const activeClinicName = DUMMY_CLINICS.find((c) => c.id === activeClinic)?.name ?? "Clinic";
  const filteredClinics = DUMMY_CLINICS.filter((c) =>
    c.name.toLowerCase().includes(clinicSearch.toLowerCase())
  );

  return (
    <header className="flex h-[62px] shrink-0 items-center border-b border-tp-slate-100 bg-tp-slate-0 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 items-center">
        <img src={REF_LOGO} alt="TatvaPractice" className="h-8 w-auto object-contain" />
      </div>

      <div className="flex items-center gap-3.5">
        <button
          type="button"
          className="flex size-[42px] items-center justify-center"
          aria-label="Play tutorial">
          <TutorialPlayIcon size={42} />
        </button>

        <div className="bg-gradient-to-b from-[rgba(208,213,221,0.2)] h-[42px] opacity-80 shrink-0 to-[rgba(208,213,221,0.2)] via-1/2 via-[#d0d5dd] w-[1.05px]" />

        <button
          type="button"
          className="relative inline-flex size-[42px] items-center justify-center rounded-[10px] bg-tp-slate-100 text-tp-slate-700 transition-colors hover:bg-tp-slate-200"
          aria-label="Notifications">
          <Notification size={20} variant="Linear" strokeWidth={1.5} />
          <span className="absolute -top-0.5 right-1 size-2.5 rounded-full border-2 border-white bg-red-500" />
        </button>

        <div className="bg-gradient-to-b from-[rgba(208,213,221,0.2)] h-[42px] opacity-80 shrink-0 to-[rgba(208,213,221,0.2)] via-1/2 via-[#d0d5dd] w-[1.05px]" />

        <div className="relative hidden sm:block" ref={clinicMenuRef}>
          <button
            type="button"
            onClick={() => setClinicMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-tp-slate-100 px-4 py-2 transition-colors hover:bg-tp-slate-200"
            aria-label="Switch clinic"
            aria-expanded={isClinicMenuOpen}>
            <Hospital size={20} variant="Linear" strokeWidth={1.5} color="var(--tp-slate-700)" />
            <span className="max-w-[120px] truncate text-[14.7px] text-tp-slate-700">
              {activeClinicName.length > 18 ? activeClinicName.substring(0, 18) + "…" : activeClinicName}
            </span>
            <ChevronDown
              size={18}
              strokeWidth={1.5}
              className="transition-transform duration-200"
              style={{ transform: isClinicMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {isClinicMenuOpen && (
            <div className="absolute right-0 top-[46px] z-50 w-[240px] overflow-hidden rounded-[12px] border border-tp-slate-200 bg-white shadow-[0_12px_24px_-4px_rgba(23,23,37,0.10)]">
              <div className="border-b border-tp-slate-100 p-2">
                <div className="relative">
                  <Search
                    size={14}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tp-slate-400"
                  />
                  <input
                    ref={clinicSearchRef}
                    type="text"
                    value={clinicSearch}
                    onChange={(e) => setClinicSearch(e.target.value)}
                    placeholder="Search clinics..."
                    className="h-[32px] w-full rounded-[8px] border border-tp-slate-200 bg-tp-slate-50 pl-7 pr-2 text-[14px] text-tp-slate-700 placeholder:text-tp-slate-400 focus:border-tp-blue-300 focus:outline-none focus:ring-1 focus:ring-tp-blue-200"
                  />
                </div>
              </div>

              <div className="relative">
                <div
                  ref={clinicListRef}
                  onScroll={updateClinicScrollState}
                  className="max-h-[200px] overflow-y-auto py-1">
                  <p className="px-3 pb-1 pt-1.5 text-[12px] font-semibold uppercase tracking-wide text-tp-slate-400">
                    Your Clinics
                  </p>
                  {filteredClinics.length === 0 ? (
                    <p className="px-3 py-3 text-[14px] text-tp-slate-400">No clinics found</p>
                  ) : (
                    filteredClinics.map((clinic) => (
                      <button
                        key={clinic.id}
                        type="button"
                        onClick={() => {
                          setActiveClinic(clinic.id);
                          setClinicMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors",
                          clinic.id === activeClinic
                            ? "bg-tp-blue-50 text-tp-blue-700"
                            : "text-tp-slate-700 hover:bg-tp-slate-50"
                        )}>
                        <Hospital
                          size={16}
                          variant={clinic.id === activeClinic ? "Bulk" : "Linear"}
                          strokeWidth={1.5}
                          color={clinic.id === activeClinic ? "var(--tp-blue-500)" : "var(--tp-slate-500)"}
                        />
                        <span className="flex-1 truncate">{clinic.name}</span>
                        {clinic.id === activeClinic && (
                          <TickCircle size={14} variant="Bold" color="var(--tp-blue-500)" />
                        )}
                      </button>
                    ))
                  )}
                </div>
                {clinicListCanScrollDown && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-9 items-end justify-center rounded-b-[12px] bg-gradient-to-t from-white via-white/80 to-transparent pb-1.5">
                    <ChevronDown size={13} strokeWidth={2} className="text-tp-slate-400" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="relative inline-flex size-[42px] items-center justify-center rounded-full transition-opacity hover:opacity-80"
          aria-label="Profile">
          <span
            className="inline-flex size-full items-center justify-center rounded-full"
            style={{
              background:
                "linear-gradient(to bottom, #FFDE00, #FD5900) padding-box, linear-gradient(to bottom, #FFDE00, #FD5900) border-box",
            }}>
            <span className="inline-flex size-full overflow-hidden rounded-full border border-white">
              <img src={REF_AVATAR} alt="User" className="size-full object-cover" />
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}
