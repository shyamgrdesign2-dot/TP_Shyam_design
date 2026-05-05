"use client";

import { useState } from "react";
import { cn } from "@/src/hooks/utils";
import { AI_PILL_BG, AI_PILL_BG_HOVER, AI_PILL_BORDER, AI_PILL_TEXT_GRADIENT } from "../constants";












export function ActionRow({ items, className }) {
  if (items.length === 0) return null;

  const chatPills = items.filter((i) => i.type === "chat");
  const otherButtons = items.filter((i) => i.type !== "chat");

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {/* Chat pills row */}
      {chatPills.length > 0 &&
      <div className="flex flex-wrap gap-1">
          {chatPills.map((item) =>
        <ChatPillButton key={item.label} label={item.label} onClick={item.onClick} />
        )}
        </div>
      }

      {/* Divider if both types present */}
      {chatPills.length > 0 && otherButtons.length > 0 &&
      <div className="my-1" style={{ borderTop: "0.5px solid var(--tp-slate-50, #F8FAFC)" }} />
      }

      {/* Copy / External buttons row */}
      {otherButtons.length > 0 &&
      <div className="flex flex-wrap gap-1">
          {otherButtons.map((item) =>
        item.type === "copy" ?
        <CopyButton key={item.label} label={item.label} onClick={item.onClick} /> :
        <ExternalButton key={item.label} label={item.label} onClick={item.onClick} />
        )}
        </div>
      }
    </div>);

}

export function ChatPillButton({ label, onClick, className }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "inline-flex h-[26px] items-center gap-[3px] rounded-full px-[14px] text-[14px] font-normal transition-all whitespace-nowrap",
        className
      )}
      style={{
        background: isHovered ? AI_PILL_BG_HOVER : AI_PILL_BG,
        border: AI_PILL_BORDER
      }}>
      
      <span
        style={{
          background: AI_PILL_TEXT_GRADIENT,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
        
        {label}
      </span>
    </button>);

}

export function CopyButton({ label, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-[26px] items-center gap-[3px] rounded-full border-[1.5px] border-tp-blue-500 bg-tp-blue-50 px-2.5 text-[14px] font-medium text-tp-blue-500 transition-colors hover:bg-tp-blue-100",
        className
      )}>
      
      {label}
    </button>);

}

export function ExternalButton({ label, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-[26px] items-center gap-[3px] rounded-full border-[1.5px] border-tp-blue-500 bg-transparent px-2.5 text-[14px] font-medium text-tp-blue-500 transition-colors hover:bg-tp-blue-50",
        className
      )}>
      
      {label}
    </button>);

}