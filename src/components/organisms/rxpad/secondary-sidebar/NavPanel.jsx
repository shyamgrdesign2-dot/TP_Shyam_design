/**
 * SecondaryNavPanel — 80px left sidebar
 * Mixed icon source:
 * - TP medical icon library for clinical nav items
 * - iconsax for requested utility nav items
 */
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/src/hooks/utils";
import styles from "./NavPanel.module.scss";
import { ArrowDown2, Calendar2, DocumentText, Eye, Note1, Ruler } from "iconsax-reactjs";
import { ReferralIcon } from "@/src/components/organisms/rxpad/referral/ReferralIcon";

import { TPMedicalIcon } from "@/src/components/atoms/MedicalIcon";
import { Tooltip as TPTooltip } from "@/src/components/atoms/Tooltip";
import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";
import { useSidebarConfig } from "@/src/components/organisms/rxpad/customise-context";


import { rxSidebarTokens } from "./tokens";


function IconPill({
  active,
  hasUnseen,
  isVoiceRecording,
  children





}) {
  return (
    <div
      className={`content-stretch flex flex-col items-center justify-center p-[6px] relative rounded-[10px] shrink-0 ${
      active ? rxSidebarTokens.navIconActiveBgClass : rxSidebarTokens.navIconBgClass}`
      }>
      
      {isVoiceRecording ?
      <span
        className="tp-nav-voice-dot absolute -right-0.5 -top-0.5 z-10 h-[10px] w-[10px] rounded-full bg-rose-400"
        aria-hidden /> :

      hasUnseen ?
      <span
        className="tp-nav-unseen-dot absolute -right-0.5 -top-0.5 z-10 h-2 w-2 rounded-full bg-[#E53935] ring-2 ring-white/90"
        aria-hidden /> :

      null}
      {/* Whole pill wobbles gently while unseen — quick attention cue
          that something landed in this section. Stops as soon as the
          doctor opens the section (hasUnseen flips false). */}
      <div className={`flex h-[20px] w-[20px] items-center justify-center overflow-hidden ${hasUnseen ? "tp-nav-pill-wobble" : ""}`}>{children}</div>
      {/* styles live in app/globals.css */}
    </div>);

}

function MedicalNavIcon({ active, name, hasUnseen, isVoiceRecording }) {
  return (
    <IconPill active={active} hasUnseen={hasUnseen} isVoiceRecording={isVoiceRecording}>
      <TPMedicalIcon
        name={name}
        variant={active ? "bulk" : "line"}
        size={20}
        color={active ? "var(--tp-blue-500)" : "#FFFFFF"}
        className="block h-[20px] w-[20px]" />
      
    </IconPill>);

}

function IconsaxNavIcon({
  active,
  Icon,
  hasUnseen,
  isVoiceRecording





}) {
  return (
    <IconPill active={active} hasUnseen={hasUnseen} isVoiceRecording={isVoiceRecording}>
      <Icon
        size={20}
        variant={active ? "Bulk" : "Linear"}
        color={active ? "var(--tp-blue-500)" : "#FFFFFF"}
        strokeWidth={1.5} />
      
    </IconPill>);

}

function SelectionArrow() {
  return (
    <div className="pointer-events-none absolute right-[-2px] top-1/2 z-20 h-0 w-0 -translate-y-1/2 border-y-[8px] border-y-transparent border-r-[8px] border-r-white" />);

}

function NavDivider() {
  return (
    <div className="h-0 relative shrink-0 w-full">
      <div className="absolute inset-[-1px_0_0_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 80 1">
          <line stroke="url(#divGrad)" strokeOpacity="0.3" x2="80" y1="0.5" y2="0.5" />
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="divGrad" x1="9.27" x2="70.92" y1="1" y2="1">
              <stop stopColor="white" stopOpacity="0" />
              <stop offset="0.5" stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>);

}





// Presentation metadata — order/enabled comes from the customise config
// (`useSidebarConfig()`), but each item's label and icon stay declared
// locally so a stored config doesn't carry presentational concerns.
const NAV_META = {
  pastVisits: { label: "Past Visits", icon: { kind: "iconsax", Icon: Note1 } },
  vitals: { label: "Vitals", icon: { kind: "medical", name: "Heart Rate" } },
  history: { label: "History", icon: { kind: "medical", name: "clipboard-activity" } },
  labResults: { label: "Lab Results", icon: { kind: "medical", name: "Lab" } },
  medicalRecords: { label: "Records", icon: { kind: "medical", name: "health-file-03" } },
  gynec: { label: "Gynec", icon: { kind: "medical", name: "Gynec" } },
  obstetric: { label: "Obstetric", icon: { kind: "medical", name: "Obstetric" } },
  vaccine: { label: "Vaccine", icon: { kind: "medical", name: "injection" } },
  growth: { label: "Growth", icon: { kind: "iconsax", Icon: Ruler } },
  // Optal (Ophthalmology) — sits below Growth so paediatric → ocular
  // flow stays grouped. Eye glyph from iconsax.
  optal: { label: "Ophthal", icon: { kind: "iconsax", Icon: Eye } },
  // Internal id stays `personalNotes` so existing localStorage prefs +
  // sync state keep working; display label updated to "Private Notes".
  personalNotes: { label: "Private Notes", icon: { kind: "iconsax", Icon: DocumentText } },
  // Handwriting-only tabs (TabRx / SnapRx / SmartSync) — injected via the
  // `extraTabs` prop, not the global sidebar config, so they never appear in
  // VoiceRx / TypeRx (which capture follow-up + referral in the RxPad form).
  followUps: { label: "Follow-ups", icon: { kind: "iconsax", Icon: Calendar2 } },
  referral: { label: "Referral", icon: { kind: "iconsax", Icon: ReferralIcon } },
  drAgent: { label: "Dr Agent", icon: { kind: "iconsax", Icon: DocumentText } }
};

function DrAgentGlyph({ active }) {
  return (
    <div
      className={cn(
        "relative h-[32px] w-[32px] overflow-hidden rounded-[10px]",
        active ? styles.drAgentGlyphActive : styles.drAgentGlyphIdle
      )}>
      
      <svg
        className="absolute left-1/2 top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        
        <path
          d="M18.0841 11.612C18.4509 11.6649 18.4509 12.3351 18.0841 12.388C14.1035 12.9624 12.9624 14.1035 12.388 18.0841C12.3351 18.4509 11.6649 18.4509 11.612 18.0841C11.0376 14.1035 9.89647 12.9624 5.91594 12.388C5.5491 12.3351 5.5491 11.6649 5.91594 11.612C9.89647 11.0376 11.0376 9.89647 11.612 5.91594C11.6649 5.5491 12.3351 5.5491 12.388 5.91594C12.9624 9.89647 14.1035 11.0376 18.0841 11.612Z"
          fill={active ? "#FFFFFF" : "url(#drAgentAiGrad)"} />
        
        {!active ?
        <defs>
            <linearGradient id="drAgentAiGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8A4DBB" />
              <stop offset="1" stopColor="#4B4AD5" />
            </linearGradient>
          </defs> :
        null}
      </svg>
    </div>);

}

function NavItem({
  id,
  label,
  icon,
  active,
  hasUnseen,
  isVoiceRecording,
  disabled,
  disabledReason,
  onClick
}) {
  const [hovered, setHovered] = useState(false);

  const rowBg = active ?
  rxSidebarTokens.navItemSelectedBg :
  hovered && !disabled ?
  rxSidebarTokens.navItemHoverBg :
  "transparent";

  const row = (
    <div
      aria-disabled={disabled || undefined}
      className={cn(
        "relative shrink-0",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
        styles.navItemRow,
      )}
      style={{ backgroundColor: rowBg }}
      data-voice-allow
      onClick={() => { if (!disabled) onClick(id); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      <div className="content-stretch flex items-center relative w-full">
        <div
          className={cn("content-stretch flex flex-col items-center relative shrink-0", styles.navItemInner)}>

          {icon.kind === "medical" ?
          <MedicalNavIcon active={active} name={icon.name} hasUnseen={hasUnseen} isVoiceRecording={isVoiceRecording} /> :

          <IconsaxNavIcon active={active} Icon={icon.Icon} hasUnseen={hasUnseen} isVoiceRecording={isVoiceRecording} />
          }
          <p
            className={`${rxSidebarTokens.navLabelClass} min-w-full not-italic overflow-hidden relative shrink-0 text-center text-ellipsis text-white w-[min-content] whitespace-pre-wrap`}>

            {label}
          </p>
        </div>
        {active ? <div className="absolute bg-white bottom-0 left-0 rounded-br-[12px] rounded-tr-[12px] top-0 w-[3px]" /> : null}
      </div>
      {active ? <SelectionArrow /> : null}
    </div>);

  return disabled && disabledReason ? (
    <TPTooltip title={disabledReason} placement="right" arrow>
      {row}
    </TPTooltip>
  ) : row;
}

function DrAgentItem({ active, onClick }) {
  const [hovered, setHovered] = useState(false);

  const rowBg = active ?
  rxSidebarTokens.navItemSelectedBg :
  hovered ?
  rxSidebarTokens.navItemHoverBg :
  "transparent";

  return (
    <div
      className={cn("relative shrink-0 cursor-pointer", styles.navItemRow)}
      style={{ backgroundColor: rowBg }}
      data-voice-allow
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      
      <div
        className={cn("content-stretch flex flex-col items-center relative shrink-0", styles.navItemInner)}>
        
        <DrAgentGlyph active={active} />

        <p
          className={cn(`${rxSidebarTokens.navLabelClass} min-w-full not-italic overflow-hidden relative shrink-0 text-center text-ellipsis w-[min-content] whitespace-pre-wrap`, styles.drAgentLabel)}>
          
          Dr.Agent
        </p>
      </div>
      {active ? <div className="absolute bg-white bottom-0 left-0 rounded-br-[12px] rounded-tr-[12px] top-0 w-[3px]" /> : null}
      {active ? <SelectionArrow /> : null}
    </div>);

}







export function NavPanel({ active, onSelect, voiceActiveSection, voiceLockedLabel, extraTabs = [] }) {
  const { isHistoricalSectionUnseen } = useRxPadSync();
  const sidebarConfig = useSidebarConfig();
  const navItems = sidebarConfig.
  filter((item) => item.enabled && NAV_META[item.id]).
  map((item) => ({ id: item.id, ...NAV_META[item.id] }));
  // Per-flow extra tabs (handwriting flows). Inserted just ABOVE Private Notes
  // (which stays last as a free-form scratchpad): … Follow-ups, Referral,
  // Private Notes. Deduped against the config so a tab can't render twice.
  const configIds = new Set(navItems.map((i) => i.id));
  const extraItems = extraTabs.
  filter((id) => NAV_META[id] && !configIds.has(id)).
  map((id) => ({ id, ...NAV_META[id] }));
  const pnIndex = navItems.findIndex((i) => i.id === "personalNotes");
  const allNavItems =
  pnIndex === -1 ?
  [...navItems, ...extraItems] :
  [...navItems.slice(0, pnIndex), ...extraItems, ...navItems.slice(pnIndex)];
  const scrollRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const updateHint = () => {
      const hasOverflow = node.scrollHeight > node.clientHeight + 2;
      const atTop = node.scrollTop <= 2;
      setShowScrollHint(hasOverflow && atTop);
    };

    updateHint();
    node.addEventListener("scroll", updateHint, { passive: true });
    window.addEventListener("resize", updateHint);

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHint);
      observer.observe(node);
    }

    return () => {
      node.removeEventListener("scroll", updateHint);
      window.removeEventListener("resize", updateHint);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className={cn("relative h-full shrink-0", styles.railOuter)}>
      <div
        ref={scrollRef}
        className={cn(
          "content-stretch flex flex-col gap-[4px] h-full items-center overflow-x-visible overflow-y-auto relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          styles.navBg,
          styles.railScroll
        )}>
        
        {/* Dr.Agent removed from sidebar nav — lives only in its own panel */}

        {allNavItems.map(({ id, label, icon }) => {
          const isLockedTarget = voiceActiveSection != null && voiceActiveSection !== id;
          return (
            <NavItem
              key={id}
              id={id}
              label={label}
              icon={icon}
              active={active === id}
              hasUnseen={isHistoricalSectionUnseen(id)}
              isVoiceRecording={voiceActiveSection === id}
              disabled={isLockedTarget}
              disabledReason={
                isLockedTarget
                  ? `Voice dictation in ${voiceLockedLabel ?? "another section"} is active. Stop or submit it before navigating.`
                  : undefined
              }
              onClick={onSelect} />
          );
        })}
      </div>

      {showScrollHint ?
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex h-16 items-end justify-center bg-gradient-to-t from-[#2a2996]/90 via-[#2a2996]/45 to-transparent pb-2">
          <div className="inline-flex h-7 w-7 animate-bounce items-center justify-center rounded-full bg-white/15">
            <ArrowDown2 color="#FFFFFF" size={16} strokeWidth={1.5} variant="Linear" />
          </div>
        </div> :
      null}

    </div>);

}