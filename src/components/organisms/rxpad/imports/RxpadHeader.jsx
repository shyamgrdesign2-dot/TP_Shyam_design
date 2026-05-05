import React, { useState } from "react";
import { TPSplitButton } from "@/src/components/atoms/Button/button-system/TPSplitButton";
import {
  ArrowDown2,
  Calendar2,
  CallCalling,
  Card,
  ClipboardText,
  Edit2,
  Eye,
  Grid5,
  Ram,
  Setting2,
  User } from
"iconsax-reactjs";

/** End-Visit glyph — user-supplied SVG. Small arrow being pushed into a
 *  box on the right. Filled in white so it reads on the violet End Visit
 *  button. */
function EndVisitIcon({ size = 18, color = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M11.4291 15.3005L10.3691 14.2405L12.9291 11.6805L10.3691 9.12054L11.4291 8.06055L15.0591 11.6805L11.4291 15.3005Z" fill={color} />
      <path d="M13.67 10.9307H3V12.4307H13.67V10.9307Z" fill={color} />
      <path d="M20.5 20.3701H11V18.8701H19V4.37012H11V2.87012H20.5V20.3701Z" fill={color} />
    </svg>);

}
import { ChevronLeft, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/src/components/molecules/DropdownMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/atoms/Tooltip";
import { TutorialPlayIcon } from "@/src/components/atoms/TutorialPlayIcon/TutorialPlayIcon";




















export default function RxpadHeader({
  className,
  onBack,
  onVisitSummary,
  onPreview,
  onCustomise,
  onEndVisit,
  onSaveDraft,
  voiceCaptureMode = null,
  patientName,
  patientMeta
}) {
  const displayName = patientName ?? "Shyam GR";
  const metaParts = patientMeta?.split(",").map((s) => s.trim()) ?? ["Male", "25y"];
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className={`bg-white relative h-[62px] w-full overflow-x-auto ${className ?? ""}`} data-name="Rxpad_Header">
      <div className="flex h-full min-w-[980px] w-full flex-row items-center">
        <div className="content-stretch flex items-center justify-between pr-[16px] py-[10px] relative size-full max-xl:pr-[10px]">
          <div className="content-stretch flex min-w-0 items-center gap-[16px] relative max-xl:gap-[10px]">
            <button
              aria-label="Go back"
              className="bg-white content-stretch flex h-[60px] items-center justify-center px-[16px] py-[20px] relative shrink-0 w-[80px] transition-colors hover:bg-tp-slate-50"
              data-name="Back Button"
              // Voice-lock passthrough: the VoiceRxFlow wrapper intercepts
              // this click and decides whether to open a confirmation
              // dialog (voice active) or just navigate back.
              data-voice-allow
              onClick={onBack}
              type="button">
              
              <div aria-hidden="true" className="absolute border-[#f1f1f5] border-b-[0.5px] border-r-[0.5px] border-solid inset-[0_-0.25px_-0.25px_0] pointer-events-none" />
              <div className="relative shrink-0 size-[24px]" data-name="Back Arrow">
                <ChevronLeft color="#454551" size={24} strokeWidth={2} />
              </div>
            </button>
            <div className="content-stretch flex items-center min-h-px min-w-0 relative" data-name="User Info">
              <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="content-stretch flex gap-[6px] items-center relative shrink-0 min-w-0 max-w-[200px] rounded-[10px] px-1 py-0.5 text-left transition-colors hover:bg-tp-slate-50"
                    data-name="Container">
                    
                    <div className="bg-[#f1f1f5] relative rounded-[1250px] shrink-0 size-[40px]" data-name="Profile Image">
                      <div className="absolute left-[8.57px] size-[22.857px] top-[8.57px]" data-name="User">
                        <User color="#545460" size={22.857} variant="Bulk" />
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col items-start relative shrink-0 min-w-0 w-[200px] max-w-[200px]" data-name="User Details">
                      <div className="content-stretch flex gap-[6px] items-center relative shrink-0 w-full" data-name="Header">
                        <p className="font-['Inter',sans-serif] font-semibold leading-[normal] max-w-[150px] min-w-0 truncate not-italic relative shrink text-tp-slate-700 text-[14px]">
                          {displayName}
                        </p>
                        <div className="relative shrink-0 size-[18px]" data-name="Dropdown Icon">
                          <ArrowDown2
                            color="var(--tp-slate-700)"
                            size={20}
                            strokeWidth={2}
                            variant="Linear"
                            className={`transition-transform duration-150 ${isProfileOpen ? "rotate-180" : ""}`} />
                          
                        </div>
                      </div>
                      <div
                        className="content-stretch flex items-start leading-[18px] relative shrink-0 text-[12px] tracking-[0.1px] w-full font-['Inter',sans-serif] font-medium text-tp-slate-600"
                        data-name="Age & gender">
                        
                        <p className="relative shrink-0 whitespace-nowrap">{metaParts[0] ?? "Male"}</p>
                        <p className="relative shrink-0 text-tp-slate-300 text-center w-[8px]">|</p>
                        <p className="relative shrink-0 whitespace-nowrap">{metaParts[1] ?? "25y"}</p>
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={6}
                  className="relative z-[120] w-[320px] rounded-[22px] border border-tp-slate-100 bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
                  
                  <div className="pointer-events-none absolute -top-[12px] left-[94px] h-0 w-0 border-b-[12px] border-l-[12px] border-r-[12px] border-b-tp-slate-100 border-l-transparent border-r-transparent" />
                  <div className="pointer-events-none absolute -top-[10px] left-[95px] h-0 w-0 border-b-[10px] border-l-[10px] border-r-[10px] border-b-white border-l-transparent border-r-transparent" />
                  <div className="space-y-4">
                    {[
                    { key: "patient-id", label: "Patient ID", value: "PAT0061", icon: <Card color="var(--tp-violet-500)" size={18} strokeWidth={1.5} variant="Linear" /> },
                    { key: "mobile", label: "Mobile Number", value: "9567933357", icon: <CallCalling color="var(--tp-violet-500)" size={18} strokeWidth={1.5} variant="Linear" /> },
                    { key: "dob", label: "DOB", value: "24 Jul 2000", icon: <Calendar2 color="var(--tp-violet-500)" size={18} strokeWidth={1.5} variant="Linear" /> }].
                    map((item) =>
                    <div key={item.key} className="flex items-center gap-3.5">
                        <div className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full bg-tp-violet-50">{item.icon}</div>
                        <div className="min-w-0">
                          <p className="font-['Inter',sans-serif] text-[14px] leading-[20px] font-medium text-tp-slate-600">{item.label}</p>
                          <p className="font-['Inter',sans-serif] text-[16px] leading-[22px] font-semibold text-tp-slate-700">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      onClick={() => setIsProfileOpen(false)}
                      className="inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border border-tp-blue-200 bg-white px-4 text-tp-blue-500 hover:bg-tp-blue-50/40">
                      
                      <Edit2 color="currentColor" size={20} strokeWidth={1.5} variant="Linear" />
                      <span className="font-['Inter',sans-serif] text-[16px] leading-[20px] font-semibold">Edit Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onVisitSummary?.();
                      }}
                      className="inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border border-tp-blue-200 bg-white px-4 text-tp-blue-500 hover:bg-tp-blue-50/40">
                      
                      <ClipboardText color="currentColor" size={20} strokeWidth={1.5} variant="Linear" />
                      <span className="font-['Inter',sans-serif] text-[16px] leading-[20px] font-semibold">Patient Summary</span>
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Top-nav voice-mode tag removed — mode is already indicated
                 inside the Dr. Agent panel's glossy header pill, so showing
                 it again here was redundant and noisy. */}
          </div>
          <div className="content-stretch flex gap-[14px] items-center relative shrink-0 ml-4 max-xl:gap-[10px]" data-name="Toolbar">
            <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label="Tutorial"
                    className="content-stretch flex h-[42px] items-center justify-center relative shrink-0"
                    data-name="Tutorial">
                    
                  <TutorialPlayIcon size={42} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="rounded-[6px] border-0 bg-tp-slate-900 px-2.5 py-1.5 text-[12px] leading-[1.45] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45)]">Watch a quick tutorial</TooltipContent>
            </Tooltip>
            <div className="bg-gradient-to-b from-[rgba(208,213,221,0.2)] h-[42px] opacity-80 shrink-0 to-[rgba(208,213,221,0.2)] via-1/2 via-[#d0d5dd] w-[1.05px]" data-name="Divider" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label="Template"
                    className="bg-[#f1f1f5] content-stretch flex h-[42px] items-center justify-center p-[8.4px] relative rounded-[10px] shrink-0 transition-colors hover:bg-[#e9e9ef]"
                    data-name="Template">
                    
                  <Grid5 color="#454551" size={24} strokeWidth={1.5} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="rounded-[6px] border-0 bg-tp-slate-900 px-2.5 py-1.5 text-[12px] leading-[1.45] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45)]">Templates</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label="Save"
                    className="bg-[#f1f1f5] content-stretch flex h-[42px] items-center justify-center p-[8.4px] relative rounded-[10px] shrink-0 transition-colors hover:bg-[#e9e9ef]"
                    data-name="Save">
                    
                  <Ram color="#454551" size={24} strokeWidth={1.5} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="rounded-[6px] border-0 bg-tp-slate-900 px-2.5 py-1.5 text-[12px] leading-[1.45] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45)]">Save this filled Rx as a reusable template</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label="Customisation"
                    onClick={onCustomise}
                    className="bg-[#f1f1f5] content-stretch flex h-[42px] items-center justify-center p-[8.4px] relative rounded-[10px] shrink-0 transition-colors hover:bg-[#e9e9ef]"
                    data-name="Customisation">
                    
                  <Setting2 color="#454551" size={24} strokeWidth={1.5} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="rounded-[6px] border-0 bg-tp-slate-900 px-2.5 py-1.5 text-[12px] leading-[1.45] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45)]">Customise your Rx layout</TooltipContent>
            </Tooltip>
            <div className="bg-gradient-to-b from-[rgba(208,213,221,0.2)] h-[42px] opacity-80 shrink-0 to-[rgba(208,213,221,0.2)] via-1/2 via-[#d0d5dd] w-[1.05px]" data-name="Divider" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label="Preview"
                    onClick={onPreview}
                    className="content-stretch flex gap-[6.3px] items-center justify-center px-[16px] py-[8px] relative rounded-[10px] shrink-0 bg-white border border-tp-blue-500 transition-colors hover:bg-tp-blue-50/50"
                    data-name="Preview">
                    
                  <Eye color="var(--tp-blue-500)" size={24} strokeWidth={1.5} variant="Linear" />
                  <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-tp-blue-500 text-[14.7px] text-center whitespace-nowrap">Preview</p>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="rounded-[6px] border-0 bg-tp-slate-900 px-2.5 py-1.5 text-[12px] leading-[1.45] text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45)]">Preview the printable Rx</TooltipContent>
            </Tooltip>
            </TooltipProvider>
            <TPSplitButton
              primaryAction={{
                label: "End Visit",
                onClick: () => onEndVisit?.(),
                // Custom glyph (user-provided SVG) replaces the old
                // iconsax Login icon on the End Visit CTA.
                icon: <EndVisitIcon size={18} />
              }}
              // Save as Draft no longer carries its own icon per design —
              // text-only row in the dropdown.
              secondaryActions={[
              { label: "End Visit", onClick: () => onEndVisit?.() },
              { label: "Save as Draft", onClick: () => onSaveDraft?.() }]
              }
              variant="solid"
              theme="primary"
              size="md" />
            
            <button
              type="button"
              aria-label="More options"
              className="flex items-center justify-center relative shrink-0 size-[25.2px] rounded-[8px] transition-colors hover:bg-tp-slate-100"
              style={{ "--transform-inner-width": "1200", "--transform-inner-height": "18" }}>
              
              <MoreVertical color="#454551" size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-tp-slate-100 border-b border-solid inset-[0_0_-0.5px_0] pointer-events-none" />
    </div>);

}