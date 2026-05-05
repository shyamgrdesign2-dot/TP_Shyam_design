"use client";

















/**
 * Small AI spark icon button for sidebar section headers.
 * Clicking it opens Dr. Agent with a pre-filled contextual message.
 * Shows a portal-based styled tooltip (same pattern as ActionableTooltip)
 * that renders on document.body — never clipped by parent overflow.
 */
export function AiTriggerIcon({
  tooltip: _tooltip,
  signalLabel: _signalLabel,
  sectionId: _sectionId,
  size: _size = 14,
  as: _as = "button",
  tone: _tone = "default",
  className: _className
}) {
  // AI trigger icon intentionally disabled in RxPad sections.
  // VoiceRx mode should not surface alternate agentic actions.
  return null;
}