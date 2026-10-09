import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { cn } from "../../dr-agent/utils"
import { tesseractIcon } from "../ui/tesseractIcon"

import { RX_CONTEXT_OPTIONS } from "../constants"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Hospital = tesseractIcon("hospital-3")
const User = tesseractIcon(null, "users/user")
const SearchNormal1 = tesseractIcon("search-normal")
const InfoCircle = tesseractIcon("info-circle")

function CloseIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill={color} />
    </svg>
  )
}

export function PatientSelector({
  selectedId, onSelect, externalPatients, showUniversalOption, universalOptionId, className, isOpen, onClose, title = "Select Chat Context",
}) {
  const [search, setSearch] = useState("")
  const [showInfoTip, setShowInfoTip] = useState(false)
  const searchRef = useRef(null)
  const patients = _nullishCoalesce(externalPatients, () => ( RX_CONTEXT_OPTIONS))

  useEffect(() => { if (isOpen) { setSearch(""); setShowInfoTip(false); setTimeout(() => _optionalChain([searchRef, 'access', _ => _.current, 'optionalAccess', _2 => _2.focus, 'call', _3 => _3()]), 150) } }, [isOpen])
  useEffect(() => {
    if (!isOpen) return
    const h = (e) => { if (e.key === "Escape") _optionalChain([onClose, 'optionalCall', _4 => _4()]) }
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h)
  }, [isOpen, onClose])

  const handleSelect = useCallback((id) => { onSelect(id); _optionalChain([onClose, 'optionalCall', _5 => _5()]) }, [onSelect, onClose])

  const isUniversalSelected = universalOptionId ? selectedId === universalOptionId : false

  const isSearching = search.trim().length > 0

  const filteredPatients = useMemo(() => {
    const base = isSearching
      ? patients.filter((p) => {
          const q = search.toLowerCase()
          return p.label.toLowerCase().includes(q) || p.meta.toLowerCase().includes(q)
        })
      : patients.filter((p) => p.isToday) // Default: today's appointments only

    // Selected patient always appears first
    if (!isUniversalSelected && selectedId) {
      const idx = base.findIndex((p) => p.id === selectedId)
      if (idx > 0) {
        const copy = [...base]
        const [selected] = copy.splice(idx, 1)
        copy.unshift(selected)
        return copy
      }
    }
    return base
  }, [patients, search, selectedId, isUniversalSelected, isSearching])
  if (!isOpen) return null

  return (
    <div className={cn("absolute inset-0 z-50 flex flex-col justify-end", className)}>
      {/* Backdrop — dark overlay like document sheet */}
      <div className="absolute inset-0" onClick={onClose} style={{ background: "rgba(0,0,0,0.45)", animation: "psFadeIn 150ms ease-out" }} />

      {/* Bottom sheet — tall. Rounded top corners use clip-path to avoid overflow-hidden clipping tooltips */}
      <div className="relative z-10 flex flex-col overflow-hidden rounded-t-[16px] bg-[#F8F9FA]" style={{ height: "60%", animation: "psSlideUp 200ms ease-out" }}>

        {/* Sticky header — gray bg matching content */}
        <div className="sticky top-0 z-10" style={{ background: "#F8F9FA" }}>
          <div className="flex items-center justify-between px-[16px] pt-[14px] pb-[10px]">
            <div className="flex items-center gap-[6px]">
              <h3 className="text-[14px] font-semibold text-tp-slate-800">{title}</h3>
              <div className="relative flex items-center" onMouseEnter={() => setShowInfoTip(true)} onMouseLeave={() => setShowInfoTip(false)} onClick={() => setShowInfoTip(!showInfoTip)}>
                <button type="button" className="flex items-center justify-center text-tp-slate-400 hover:text-tp-slate-600 transition-colors"><InfoCircle size={14} variant="Linear" /></button>
                {showInfoTip && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-[6px] z-[9999] pointer-events-none">
                    <div className="rounded-[6px] bg-tp-slate-800 px-[8px] py-[5px] text-[12px] leading-[1.4] text-white shadow-lg" style={{ width: 210, whiteSpace: "normal" }}>
                      Choose which patient Velora focuses on. Selecting a patient lets you ask clinical questions, view summaries, and get insights specific to that patient.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full border-[4px] border-transparent border-t-tp-slate-800" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex h-[28px] w-[28px] items-center justify-center rounded-full hover:bg-tp-slate-100 transition-colors text-tp-slate-700">
              <CloseIcon size={24} />
            </button>
          </div>
          <div className="border-t border-tp-slate-100" />

          {/* Clinic Overview */}
          {showUniversalOption && universalOptionId && (
            <div className="px-[8px] py-[6px]">
              <button type="button" onClick={() => handleSelect(universalOptionId)}
                className={cn("flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[9px] text-left transition-colors", isUniversalSelected ? "bg-tp-blue-50" : "hover:bg-tp-slate-50")}>
                <span className={cn("flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors", isUniversalSelected ? "border-tp-blue-500" : "border-tp-slate-300")}>
                  {isUniversalSelected && <span className="h-[8px] w-[8px] rounded-full bg-tp-blue-500" />}
                </span>
                <div className={cn("flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[10px]", isUniversalSelected ? "bg-tp-blue-100 text-tp-blue-600" : "bg-tp-slate-100 text-tp-slate-500")}>
                  <Hospital size={15} variant="Bulk" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("text-[13px] font-semibold leading-[1.3]", isUniversalSelected ? "text-tp-blue-700" : "text-tp-slate-800")}>Clinic Overview</span>
                  <span className="text-[11px] leading-[1.3] text-tp-slate-400">Schedule, billing, analytics</span>
                </div>
              </button>
            </div>
          )}

          {/* "or" divider */}
          {showUniversalOption && universalOptionId && (
            <div className="relative mx-[16px] mb-[4px]">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-tp-slate-100" /></div>
              <div className="relative flex justify-center"><span className="px-[10px] text-[12px] font-medium text-tp-slate-300" style={{ background: "#F8F9FA" }}>or</span></div>
            </div>
          )}

          {/* Search */}
          <div className="px-[12px] pt-[8px] pb-[8px]">
            <div className="ps-search-box flex items-center gap-[8px] rounded-[8px] border-[1px] border-tp-slate-200 bg-white px-[10px] py-[7px] transition-all">
              <SearchNormal1 size={14} variant="Linear" className="flex-shrink-0 text-tp-slate-400" />
              <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient by name or ID..." className="w-full bg-transparent text-[13px] text-tp-slate-700 placeholder:text-tp-slate-300 outline-none" />
              {search && <button type="button" onClick={() => setSearch("")} className="text-tp-slate-300 hover:text-tp-slate-500"><CloseIcon size={12} /></button>}
            </div>
          </div>
        </div>

        {/* Patient list — gray bg, no shadow hover */}
        <div className="ps-scroll flex-1 overflow-y-auto px-[8px] pb-[12px]" style={{ background: "#F8F9FA" }}>
          {filteredPatients.length === 0 ? (
            <div className="py-[20px] text-center text-[14px] text-tp-slate-400">No patients found</div>
          ) : (
            <div className="flex flex-col gap-[1px] pt-[4px]">
              {filteredPatients.map((option) => {
                const isSelected = option.id === selectedId && !isUniversalSelected
                // Extract phone number from meta (last segment)
                const metaParts = option.meta.split("·").map((s) => s.trim())
                const phoneNumber = metaParts.length >= 3 ? metaParts[metaParts.length - 1] : metaParts.length > 1 ? metaParts.slice(1).join(" · ") : ""
                // Secondary line: gender / age / phone
                const secondaryParts = [option.gender || "", option.age ? `${option.age}y` : "", phoneNumber].filter(Boolean)
                return (
                  <button key={option.id} type="button" onClick={() => handleSelect(option.id)}
                    className={cn("flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[8px] text-left transition-colors", isSelected ? "bg-tp-blue-50" : "hover:bg-tp-slate-100/80")}>
                    {/* Radio button */}
                    <span className={cn("flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors", isSelected ? "border-tp-blue-500" : "border-tp-slate-300")}>
                      {isSelected && <span className="h-[8px] w-[8px] rounded-full bg-tp-blue-500" />}
                    </span>
                    {/* Circular avatar */}
                    <div className={cn("flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[10px]", isSelected ? "bg-tp-blue-100 text-tp-blue-600" : "bg-tp-slate-200/60 text-tp-slate-500")}>
                      <User size={15} variant="Bulk" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("text-[13px] font-semibold leading-[1.3] truncate", isSelected ? "text-tp-blue-700" : "text-tp-slate-800")}>{option.label}</span>
                      <span className="text-[11px] leading-[1.3] text-tp-slate-400">
                        {secondaryParts.map((part, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span style={{ color: "#D0D5DD", margin: "0 3px" }}>|</span>}
                            <span>{part}</span>
                          </React.Fragment>
                        ))}
                      </span>
                    </div>
                    {option.isToday && <span className="flex-shrink-0 rounded-[4px] bg-tp-success-50 px-[5px] py-[1px] text-[10px] font-medium text-tp-success-600">Today</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes psFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes psSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .ps-scroll::-webkit-scrollbar{width:3px}
        .ps-scroll::-webkit-scrollbar-track{background:transparent}
        .ps-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:3px}
        .ps-search-box:hover{border-color:var(--tp-slate-300,#CBD5E1);background:var(--tp-slate-50,#F8FAFC)}
        .ps-search-box:focus-within{border-color:var(--tp-blue-400,#6C6BDE);box-shadow:0 0 0 2px rgba(75,74,213,0.08);background:#fff}
      `}</style>
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
