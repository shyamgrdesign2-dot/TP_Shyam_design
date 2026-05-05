"use client";

import { Translate } from "iconsax-reactjs";
import { CardShell } from "../CardShell";










export function TranslationCard({
  data,
  onCopy,
  onPillTap
}) {
  return (
    <CardShell
      icon={<Translate size={14} variant="Bulk" />}
      title={data.targetLanguage}
      copyAll={() => onCopy?.(data.copyPayload)}
      copyAllTooltip="Fill translation to RxPad">

      
      {/* Source text */}
      <div className="mb-2">
        <div className="mb-[2px] text-[12px] font-medium tracking-wide text-tp-slate-400">
          {data.sourceLanguage}
        </div>
        <div className="rounded-[6px] bg-tp-slate-50 px-2 py-[5px] text-[14px] leading-[1.6] text-tp-slate-600">
          {data.sourceText}
        </div>
      </div>

      {/* Translated text */}
      <div>
        <div className="mb-[2px] text-[12px] font-medium tracking-wide text-tp-success-600">
          {data.targetLanguage}
        </div>
        <div className="rounded-[6px] bg-tp-success-50 px-2 py-[5px] text-[14px] leading-[1.6] text-tp-success-700">
          {data.translatedText}
        </div>
      </div>
    </CardShell>);

}