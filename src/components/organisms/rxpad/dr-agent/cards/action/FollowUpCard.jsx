"use client";

import { CardShell } from "../CardShell";
// InsightBox removed
import { ChatPillButton } from "../ActionRow";











export function FollowUpCard({ data, onSelect, onCopyToFollowUp }) {
  // Find recommended option for the insight box
  const recommended = data.options.find((o) => o.recommended);

  return (
    <CardShell
      icon={<span />}
      tpIconName="medical-record"
      title="Suggested Follow-Up"
      copyAll={
      recommended ?
      () => onCopyToFollowUp?.(recommended.days, recommended.label) :
      undefined
      }
      copyAllTooltip="Fill follow-up to RxPad"
      dataSources={["AI-Generated"]}>
      
      {/* Context line */}
      <p className="mb-2 text-[14px] leading-[1.5] text-tp-slate-400">
        {data.context}
      </p>

      {/* Option pills */}
      <div className="flex flex-wrap gap-1.5">
        {data.options.map((option) =>
        <ChatPillButton
          key={option.days}
          label={option.label}
          onClick={() => onSelect?.(option.days)} />

        )}
      </div>

      {/* Insight removed — follow-up reasoning to be defined by backend logic */}
    </CardShell>);

}