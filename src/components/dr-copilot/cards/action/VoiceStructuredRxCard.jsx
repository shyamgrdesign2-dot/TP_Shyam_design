import React, { useState } from "react"
import { cn } from "../../../dr-agent/utils"
import { useTouchDevice } from "../../../dr-agent/hooks/use-touch-device"
import { CardShell } from "../CardShell"
import { CopyIcon } from "../CopyIcon"
import { ActionableTooltip } from "../ActionableTooltip"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { tesseractIcon } from "../../ui/tesseractIcon"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Microphone2 = tesseractIcon("microphone-2")

/** Format a VoiceRxItem to a plain text string for clipboard copy */
function formatVoiceItem(item) {
  return item.detail ? `${item.name} (${item.detail})` : item.name
}

export function VoiceStructuredRxCard({ data, onCopy }) {
  const isTouch = useTouchDevice()
  const [copiedKey, setCopiedKey] = useState(null)
  const [showOriginal, setShowOriginal] = useState(false)

  const handleCopyItem = (item, key) => {
    _optionalChain([navigator, 'access', _ => _.clipboard, 'optionalAccess', _2 => _2.writeText, 'call', _3 => _3(formatVoiceItem(item))])
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1200)
  }

  const handleCopySection = (sectionId, items) => {
    const text = items.map(formatVoiceItem).join("\n")
    _optionalChain([navigator, 'access', _4 => _4.clipboard, 'optionalAccess', _5 => _5.writeText, 'call', _6 => _6(text)])
    setCopiedKey(`section-${sectionId}`)
    setTimeout(() => setCopiedKey(null), 1200)
  }

  return (
    <CardShell
      icon={<Microphone2 size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title="VoiceRx transcript"
      badge={{ label: "Just now", color: "#64748B", bg: "#F1F5F9" }}
      copyAll={() => _optionalChain([onCopy, 'optionalCall', _7 => _7(data.copyAllPayload)])}
      copyAllTooltip="Fill structured transcript to RxPad"
      collapsible
      defaultCollapsed={false}
    >
      <div className="flex flex-col gap-[8px]">
        {/* Toggle original voice text */}
        <button
          type="button"
          onClick={() => setShowOriginal((v) => !v)}
          className="text-left text-[14px] font-medium text-tp-slate-400 hover:text-tp-slate-500 transition-colors"
        >
          {showOriginal ? "▾ Hide original text" : "▸ Show original text"}
        </button>

        {showOriginal && (
          <p className="text-[14px] italic leading-[1.7] text-tp-slate-400 bg-tp-slate-50 rounded-[6px] px-[8px] py-[6px]">
            &ldquo;{data.voiceText}&rdquo;
          </p>
        )}

        {/* Structured sections */}
        {data.sections.map((section) => (
          <div key={section.sectionId}>
            {/* Section header bar with hover copy icon */}
            <SectionSummaryBar
              label={section.title}
              icon={section.tpIconName}
              trailing={(
                <span className={cn("transition-opacity", isTouch ? "opacity-70" : "opacity-0 group-hover/section-header:opacity-100")}>
                  <ActionableTooltip
                    label={`Fill ${section.title.toLowerCase()} to RxPad`}
                    onAction={() => handleCopySection(section.sectionId, section.items)}
                  >
                    <CopyIcon size={14} onClick={() => handleCopySection(section.sectionId, section.items)} />
                  </ActionableTooltip>
                </span>
              )}
            />

            {/* Bullet items with per-item hover copy — structured name (detail) format */}
            <ul className="mt-1 flex flex-col gap-[2px] pl-1">
              {section.items.map((item, idx) => {
                const itemKey = `${section.sectionId}-${idx}`
                return (
                  <li
                    key={idx}
                    className="group/voice-item flex items-start gap-[6px] rounded-[4px] px-1 -mx-1 py-[2px] text-[14px] leading-[1.6] text-tp-slate-700 transition-colors hover:bg-tp-slate-50/80"
                  >
                    <span className="mt-[1px] flex-shrink-0 text-tp-slate-400">
                      •
                    </span>
                    <span className="flex-1 font-normal text-tp-slate-700">
                      {item.name}
                      {item.detail && (
                        <span className="ml-1 text-tp-slate-400">({item.detail})</span>
                      )}
                    </span>
                    <span className={cn("flex-shrink-0 transition-opacity", isTouch ? "opacity-70" : "opacity-0 group-hover/voice-item:opacity-100")}>
                      {copiedKey === itemKey ? (
                        <span className="text-[14px] text-tp-success-500 font-medium">Copied</span>
                      ) : (
                        <ActionableTooltip
                          label={`Fill to RxPad`}
                          onAction={() => handleCopyItem(item, itemKey)}
                        >
                          <CopyIcon
                            size={14}
                            onClick={() => handleCopyItem(item, itemKey)}
                          />
                        </ActionableTooltip>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
