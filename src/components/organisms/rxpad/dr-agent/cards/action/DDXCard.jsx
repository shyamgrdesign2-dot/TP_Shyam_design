"use client";

import { useState, useCallback } from "react";
import { CardShell } from "../CardShell";
import { ChatPillButton } from "../ActionRow";
import { SidebarLink } from "../SidebarLink";















const BUCKET_CONFIG =





{
  cant_miss: {
    label: "CAN'T MISS",
    borderColor: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.04)",
    labelColor: "#DC2626",
    checkColor: "#EF4444"
  },
  most_likely: {
    label: "MOST LIKELY",
    borderColor: "#4B4AD5",
    bgColor: "rgba(75, 74, 213, 0.04)",
    labelColor: "#3C3BB5",
    checkColor: "#4B4AD5"
  },
  consider: {
    label: "EXTENDED",
    borderColor: "#94A3B8",
    bgColor: "rgba(148, 163, 184, 0.04)",
    labelColor: "#64748B",
    checkColor: "#94A3B8"
  }
};

const BUCKET_ORDER = ["cant_miss", "most_likely", "consider"];

function CustomCheckbox({ checked, color, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-all"
      style={{
        borderColor: checked ? color : "#CBD5E1",
        backgroundColor: checked ? color : "transparent"
      }}>
      
      {checked &&
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
    </button>);

}

export function DDXCard({ data, onAccept, onCopyToDiagnosis, onCopyToRxPad, onSendCannedMessage }) {
  const [selected, setSelected] = useState(() => {
    const init = {};
    data.options.forEach((opt) => {
      init[opt.name] = opt.selected ?? false;
    });
    return init;
  });

  const handleToggle = useCallback(
    (name, checked) => {
      setSelected((prev) => {
        const next = { ...prev, [name]: checked };
        if (onAccept) {
          const selectedNames = Object.entries(next).
          filter(([, v]) => v).
          map(([k]) => k);
          onAccept(selectedNames);
        }
        return next;
      });
    },
    [onAccept]
  );

  const grouped = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: data.options.filter((o) => o.bucket === bucket)
  })).filter((g) => g.items.length > 0);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  // Parse reasoning basis (pipe-separated)
  const contextParts = data.context.split(/[,;·|]/).map((s) => s.trim()).filter(Boolean);

  return (
    <CardShell
      icon={<span />}
      tpIconName="Diagnosis"
      title="Differential Diagnosis"
      date="Ranked by clinical probability"
      dataSources={["AI-Generated"]}
      copyAll={() => {
        const selectedNames = Object.entries(selected).
        filter(([, v]) => v).
        map(([k]) => k);
        onCopyToDiagnosis?.(selectedNames);
      }}
      copyAllTooltip="Fill selected diagnoses to RxPad"
      actions={
      selectedCount > 0 ?
      <>
            <ChatPillButton
          label={`Generate cascade (${selectedCount})`}
          onClick={() => {
            const selectedNames = Object.entries(selected).
            filter(([, v]) => v).
            map(([k]) => k);
            onSendCannedMessage?.(`Generate cascade for: ${selectedNames.join(", ")}`);
          }} />
        
            <ChatPillButton
          label="Suggest investigations"
          onClick={() => onSendCannedMessage?.("Suggest investigations")} />
        
            <ChatPillButton
          label="Compare with history"
          onClick={() => onSendCannedMessage?.("Compare with history")} />
        
          </> :

      <span className="text-[14px] text-tp-slate-400 italic px-1">
            Select a diagnosis to see suggestions
          </span>

      }
      sidebarLink={
      selectedCount > 0 ?
      <SidebarLink
        text={`Fill selected to RxPad (${selectedCount})`}
        onClick={() => {
          const selectedNames = Object.entries(selected).
          filter(([, v]) => v).
          map(([k]) => k);
          onCopyToRxPad?.(selectedNames);
        }} /> :

      undefined
      }>
      
      {/* Reasoning basis */}
      <div className="mb-[10px] rounded-[8px] bg-tp-slate-50 px-3 py-[6px]">
        <span className="text-[14px] leading-[1.6] text-tp-slate-500">
          <span className="font-medium text-tp-slate-600">Reasoning basis:</span>{" "}
          {contextParts.map((part, i) =>
          <span key={i}>
              {i > 0 && <span className="mx-[6px] text-tp-slate-200">|</span>}
              <span>{part}</span>
            </span>
          )}
        </span>
      </div>

      {/* Tier boxes */}
      <div className="flex flex-col gap-[10px]">
        {grouped.map((group) => {
          const cfg = BUCKET_CONFIG[group.bucket];
          return (
            <div
              key={group.bucket}
              className="overflow-hidden rounded-[8px]"
              style={{
                border: `1px solid ${cfg.borderColor}20`,
                borderLeftWidth: 3,
                borderLeftColor: cfg.borderColor,
                backgroundColor: cfg.bgColor
              }}>
              
              {/* Tier label */}
              <div className="px-3 pt-[8px] pb-[2px]">
                <span
                  className="text-[12px] font-semibold tracking-wider"
                  style={{ color: cfg.labelColor }}>
                  
                  {cfg.label}
                </span>
              </div>

              {/* Items */}
              <div className="px-3 pb-[8px]">
                {group.items.map((opt, i) =>
                <label
                  key={opt.name}
                  className="flex cursor-pointer items-center gap-[8px] py-[6px]"
                  style={{
                    borderBottom: i < group.items.length - 1 ?
                    `1px solid ${cfg.borderColor}10` :
                    undefined
                  }}>
                  
                    <CustomCheckbox
                    checked={selected[opt.name] ?? false}
                    color={cfg.checkColor}
                    onChange={(checked) => handleToggle(opt.name, checked)} />
                  
                    <span className="text-[14px] text-tp-slate-800">{opt.name}</span>
                  </label>
                )}
              </div>
            </div>);

        })}
      </div>
    </CardShell>);

}