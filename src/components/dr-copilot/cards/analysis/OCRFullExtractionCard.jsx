import React, { useState } from "react"
import { cn } from "../../../dr-agent/utils"
import { useTouchDevice } from "../../../dr-agent/hooks/use-touch-device"
import { CardShell } from "../CardShell"
import { CopyIcon } from "../CopyIcon"
import { ActionableTooltip } from "../ActionableTooltip"
import { SidebarLink } from "../SidebarLink"
import { SectionSummaryBar } from "../SectionSummaryBar"
import { formatWithHierarchy } from "../../shared/formatWithHierarchy"

export function OCRFullExtractionCard({
  data,
  onCopySection,
  onCopyItem,
}) {
  const isTouch = useTouchDevice()
  const [copiedKey, setCopiedKey] = useState(null)

  const handleCopyItem = (item, dest, key) => {
    _optionalChain([navigator, 'access', _ => _.clipboard, 'optionalAccess', _2 => _2.writeText, 'call', _3 => _3(item)])
    _optionalChain([onCopyItem, 'optionalCall', _4 => _4(item, dest)])
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1200)
  }

  const handleCopySection = (heading, items, dest, key) => {
    const text = items.join("\n")
    _optionalChain([navigator, 'access', _5 => _5.clipboard, 'optionalAccess', _6 => _6.writeText, 'call', _7 => _7(text)])
    _optionalChain([onCopySection, 'optionalCall', _8 => _8(heading, items, dest)])
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1200)
  }

  return (
    <CardShell
      icon={<span />}
      tpIconName="medical-record"
      title={data.title}
      badge={{
        label: "Auto-Analyzed",
        color: "#7C3AED",
        bg: "#EDE9FE",
      }}
      copyAll={() => {
        const text = data.sections.map(s => `${s.heading}:\n${s.items.map(i => `  • ${i}`).join('\n')}`).join('\n\n')
        _optionalChain([navigator, 'access', _9 => _9.clipboard, 'optionalAccess', _10 => _10.writeText, 'call', _11 => _11(text)])
      }}
      copyAllTooltip="Fill complete digitized report to Medical Records"
      sidebarLink={<SidebarLink text="View original" />}
    >
      <div className="flex flex-col gap-[8px]">
        {/* Sections — matching Structured Transcript pattern */}
        {data.sections.map((section) => {
          const sectionKey = `section-${section.heading}`
          return (
            <div key={section.heading}>
              {/* Section header bar with hover copy icon */}
              <SectionSummaryBar
                label={section.heading}
                icon={section.icon}
                trailing={(
                  <span className={cn("transition-opacity", isTouch ? "opacity-70" : "opacity-0 group-hover/section-header:opacity-100")}>
                    {copiedKey === sectionKey ? (
                      <span className="text-[14px] text-tp-success-500 font-medium">Copied</span>
                    ) : (
                      <ActionableTooltip
                        label={`Fill ${section.heading.toLowerCase()} to ${section.copyDestination}`}
                        onAction={() => handleCopySection(section.heading, section.items, section.copyDestination, sectionKey)}
                      >
                        <CopyIcon size={14} onClick={() => handleCopySection(section.heading, section.items, section.copyDestination, sectionKey)} />
                      </ActionableTooltip>
                    )}
                  </span>
                )}
              />

              {/* Bullet items with per-item hover copy */}
              <ul className="mt-1 flex flex-col gap-[2px] pl-1">
                {section.items.map((item, idx) => {
                  const itemKey = `${section.heading}-${idx}`
                  return (
                    <li
                      key={idx}
                      className="group/ocr-item flex items-start gap-[6px] rounded-[4px] px-1 -mx-1 py-[2px] text-[14px] leading-[1.6] text-tp-slate-700 transition-colors hover:bg-tp-slate-50/80"
                    >
                      <span className="mt-[1px] flex-shrink-0 text-tp-slate-400">
                        •
                      </span>
                      <span className="flex-1 font-normal">
                        {formatWithHierarchy(item)}
                      </span>
                      <span className={cn("flex-shrink-0 transition-opacity", isTouch ? "opacity-70" : "opacity-0 group-hover/ocr-item:opacity-100")}>
                        {copiedKey === itemKey ? (
                          <span className="text-[14px] text-tp-success-500 font-medium">Copied</span>
                        ) : (
                          <ActionableTooltip
                            label={`Fill to ${section.copyDestination}`}
                            onAction={() => handleCopyItem(item, section.copyDestination, itemKey)}
                          >
                            <CopyIcon
                              size={14}
                              onClick={() => handleCopyItem(item, section.copyDestination, itemKey)}
                            />
                          </ActionableTooltip>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
