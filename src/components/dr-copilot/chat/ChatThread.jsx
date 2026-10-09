import { useEffect, useRef, useState } from "react"
import { cn } from "../../dr-agent/utils"

import { ChatBubble } from "./ChatBubble"
import { TypingIndicator } from "./TypingIndicator"

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
  onEditMessage,
}) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)
  // Track which message IDs have already been "seen" — skip animation for those
  const seenRef = useRef(new Set())
  const prevMessageCountRef = useRef(0)
  const [, forceRender] = useState(0)

  // Mark all current messages as seen on mount (so initial load doesn't animate)
  useEffect(() => {
    if (seenRef.current.size === 0 && messages.length > 0) {
      messages.forEach((m) => seenRef.current.add(m.id))
      forceRender((n) => n + 1)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Only scroll to bottom when typing indicator appears — no auto-scroll on new messages
  useEffect(() => {
    if (isTyping) {
      _optionalChain([bottomRef, 'access', _ => _.current, 'optionalAccess', _2 => _2.scrollIntoView, 'call', _3 => _3({ behavior: "smooth" })])
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length, isTyping])

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col px-[8px] pt-[14px] pb-[12px] bg-transparent",
        className,
      )}
    >
      {messages.map((message, index) => {
        // Voice cards in history: only the latest structured Rx card stays,
        // exactly as in the Rx pad's Dr. Agent - an older one is superseded.
        const isStaleVoiceCard =
          _optionalChain([message, 'access', _v => _v.rxOutput, 'optionalAccess', _v2 => _v2.kind]) === "voice_structured_rx" &&
          messages.some((m, i) => i > index && m.rxOutput && m.rxOutput.kind === "voice_structured_rx")
        if (isStaleVoiceCard) return null
        // Spacing: 6px between same-role, 16px between different roles for clear separation
        const prevMessage = index > 0 ? messages[index - 1] : null
        const isSameRole = _optionalChain([prevMessage, 'optionalAccess', _4 => _4.role]) === message.role
        const spacing = index === 0 ? "" : isSameRole ? "mt-[6px]" : "mt-[16px]"

        // Stream-in animation: only for NEW assistant messages WITHOUT text.
        // Text-bearing messages use the typewriter hook in ChatBubble instead,
        // so the CSS opacity animation would hide the typewriter effect.
        const isNew = !seenRef.current.has(message.id)
        const isAssistant = message.role === "assistant"
        if (isNew) seenRef.current.add(message.id)
        const animate = isNew && isAssistant && !message.text
        const voiceEnter = isNew && !isAssistant && message.voiceEntryAnimation

        return (
          <div
            key={message.id}
            className={cn(spacing, animate && "chat-stream-in", voiceEnter && "chat-voice-in")}
            style={animate ? { animationDelay: `${(index - (messages.length - 1)) * 0 + 50}ms` }  : undefined}
          >
            <ChatBubble
              message={message}
              onFeedback={onFeedback}
              onPillTap={onPillTap}
              onCopy={onCopy}
              onSidebarNav={onSidebarNav}
              activeSpecialty={activeSpecialty}
              patientDocuments={patientDocuments}
              onPatientSelect={onPatientSelect}
              onEditMessage={onEditMessage}
            />
          </div>
        )
      })}

      {/* Typing indicator — contextual thinking state */}
      {isTyping && (
        <div className="mt-[10px]">
          <TypingIndicator queryHint={typingHint} />
        </div>
      )}

      {/* Bottom sentinel for auto-scroll */}
      <div ref={bottomRef} />

      {/* Stream-in animation for new assistant messages */}
      <style>{`
        @keyframes chatStreamIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(2px);
          }
          50% {
            opacity: 0.7;
            transform: translateY(3px);
            filter: blur(0.5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        .chat-stream-in {
          animation: chatStreamIn 550ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .da-suggestion-scroll::-webkit-scrollbar { height: 0; display: none; }
        .da-suggestion-scroll { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
