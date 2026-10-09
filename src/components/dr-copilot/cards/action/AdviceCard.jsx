import React, { useState } from "react"
import { cn } from "../../../dr-agent/utils"
import { CardShell } from "../CardShell"
import { CopyIcon } from "../CopyIcon"

import { useTouchDevice } from "../../../dr-agent/hooks/use-touch-device"

import { FooterCTA } from "../FooterCTA"
import { tesseractIcon } from "../../ui/tesseractIcon"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Share = tesseractIcon("share")

export function AdviceCard({ data, onCopy, onPillTap }) {
  const isTouch = useTouchDevice()
  const [copiedIndex, setCopiedIndex] = useState(null)

  const handleCopyItem = (item, index) => {
    _optionalChain([navigator, 'access', _ => _.clipboard, 'optionalAccess', _2 => _2.writeText, 'call', _3 => _3(item)])
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1200)
  }

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text: data.shareMessage }).catch(() => {})
    }
  }

  return (
    <CardShell
      icon={<span />}
      tpIconName="clipboard-activity"
      title={data.title}
      copyAll={() => _optionalChain([onCopy, 'optionalCall', _4 => _4(data.copyPayload)])}
      copyAllTooltip="Fill advice to RxPad"
      dataSources={["AI-Generated"]}
      collapsible

      sidebarLink={
        <FooterCTA label="Share via WhatsApp" onClick={handleShare} tone="secondary" iconLeft={<Share size={14} variant="Linear" />} />
      }
    >
      <ul className="flex flex-col gap-[2px]">
        {data.items.map((item, i) => (
          <li
            key={i}
            className="group/advice-item flex items-start gap-[6px] rounded-[4px] px-1 -mx-1 py-[3px] text-[14px] leading-[1.6] text-tp-slate-700 transition-colors hover:bg-tp-slate-50"
          >
            <span className="mt-[1px] flex-shrink-0 text-tp-slate-400">•</span>
            <span className="flex-1">{item}</span>
            <span className={cn("flex-shrink-0 transition-opacity", isTouch ? "opacity-70" : "opacity-0 group-hover/advice-item:opacity-100")}>
              {copiedIndex === i ? (
                <span className="text-[14px] text-tp-success-500 font-medium">Copied</span>
              ) : (
                <CopyIcon
                  size={14}
                  onClick={() => handleCopyItem(item, i)}
                />
              )}
            </span>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
