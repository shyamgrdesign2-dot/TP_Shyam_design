"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/src/hooks/utils";

import { ChatBubble } from "./ChatBubble";
import { TypingIndicator } from "./TypingIndicator";





















export function ChatThread({
  messages,
  isTyping = false,
  onFeedback,
  onPillTap,
  onCopy,
  onSidebarNav,
  className,
  activeSpecialty,
  patientDocuments,
  onPatientSelect,
  typingHint,
  onEditMessage
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  // Track which message IDs have already been "seen" — skip animation for those
  const seenRef = useRef(new Set());
  const prevMessageCountRef = useRef(0);
  const [, forceRender] = useState(0);

  // Mark all current messages as seen on mount (so initial load doesn't animate)
  useEffect(() => {
    if (seenRef.current.size === 0 && messages.length > 0) {
      messages.forEach((m) => seenRef.current.add(m.id));
      forceRender((n) => n + 1);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on typing indicator OR when a new voice-entry user message lands — the
  // slide-up animation only reads when the newest bubble is actually in view.
  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const landedVoice = messages.length > prev && messages[messages.length - 1]?.voiceEntryAnimation;
    if (isTyping || landedVoice) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, isTyping]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col px-[8px] pt-[14px] pb-[12px]",
        "bg-gradient-to-b from-[rgba(213,101,234,0.02)] via-white to-[rgba(26,25,148,0.02)]",
        className
      )}>
      
      {messages.map((message, index) => {
        // Spacing: 6px between same-role, 16px between different roles for clear separation
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const isSameRole = prevMessage?.role === message.role;
        const spacing = index === 0 ? "" : isSameRole ? "mt-[24px]" : "mt-[28px]";

        // Stream-in animation: only for NEW assistant messages WITHOUT text.
        // Text-bearing messages use the typewriter hook in ChatBubble instead,
        // so the CSS opacity animation would hide the typewriter effect.
        const isNew = !seenRef.current.has(message.id);
        const isAssistant = message.role === "assistant";
        if (isNew) seenRef.current.add(message.id);
        const animate = isNew && isAssistant && !message.text;
        // User-voice messages get a dedicated slide-up-from-bottom entry — treats the
        // submitted transcript like a voice note being dropped into the conversation.
        const voiceEnter = isNew && !isAssistant && message.voiceEntryAnimation;

        return (
          <div
            key={message.id}
            className={cn(
              spacing,
              animate && "chat-stream-in",
              voiceEnter && "chat-voice-in"
            )}
            style={animate ? { animationDelay: `${(index - (messages.length - 1)) * 0 + 50}ms` } : undefined}>
            
            <ChatBubble
              message={message}
              onFeedback={onFeedback}
              onPillTap={onPillTap}
              onCopy={onCopy}
              onSidebarNav={onSidebarNav}
              activeSpecialty={activeSpecialty}
              patientDocuments={patientDocuments}
              onPatientSelect={onPatientSelect}
              onEditMessage={onEditMessage} />
            
          </div>);

      })}

      {/* Typing indicator — contextual thinking state */}
      {isTyping &&
      <div className="mt-[10px]">
          <TypingIndicator queryHint={typingHint} />
        </div>
      }

      {/* Bottom sentinel for auto-scroll */}
      <div ref={bottomRef} />

      {/* Stream-in animation for new assistant messages */}
      {/* da-* styles live in app/globals.css */}
    </div>);

}