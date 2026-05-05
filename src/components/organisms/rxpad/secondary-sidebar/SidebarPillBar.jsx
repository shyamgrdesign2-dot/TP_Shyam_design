"use client";

import { SIDEBAR_TAB_PILLS } from "./sidebar-pills";
import { useRxPadSync } from "@/src/components/organisms/rxpad/rxpad-sync-context";
// AiGradientBg icon removed from pill bar

/**
 * Pill bar rendered at the bottom of each sidebar content panel.
 * Tapping a pill publishes a signal that the floating agent picks up
 * and injects as a user message in the chat.
 *
 * Design: sticky bottom, AI shimmer pills, fade overlay above.
 */

const DANGER_PILL_CLASS =
"rounded-full border-[0.5px] border-tp-error-200 bg-tp-error-50 px-2.5 py-0.5 text-[14px] font-medium text-tp-error-700 transition-colors hover:bg-tp-error-100";

export function SidebarPillBar({ sectionId }) {
  const { publishSignal } = useRxPadSync();
  const pills = SIDEBAR_TAB_PILLS[sectionId];

  if (!pills || pills.length === 0) return null;

  function handlePillClick(pill) {
    publishSignal({
      type: "sidebar_pill_tap",
      label: `${pill.icon} ${pill.label}`,
      sectionId
    });
  }

  return (
    <>
      {/* Fade overlay — content fades out behind the pill bar */}
      <div className="pointer-events-none sticky bottom-[28px] z-[9] -mb-[2px] h-6 shrink-0 bg-gradient-to-t from-white/95 to-transparent" />

      {/* Pill bar — 28px pill height, horizontal scroll */}
      <div className="sticky bottom-0 z-10 shrink-0 bg-white/95 px-2 pb-[14px] pt-1 backdrop-blur-sm">
        <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-max items-center gap-1.5">
            {pills.map((pill) =>
            pill.danger ?
            <button
              key={pill.id}
              type="button"
              onClick={() => handlePillClick(pill)}
              className={`inline-flex h-[28px] items-center gap-1 whitespace-nowrap ${DANGER_PILL_CLASS}`}>
              
                  {pill.label}
                </button> :

            <button
              key={pill.id}
              type="button"
              onClick={() => handlePillClick(pill)}
              className="inline-flex h-[28px] items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[14px] font-medium transition-colors hover:bg-purple-50/60"
              style={{
                background: "rgba(139, 92, 246, 0.05)",
                border: "1px solid rgba(139, 92, 246, 0.15)"
              }}>
              
                  <span
                style={{
                  background: "linear-gradient(90deg, #D565EA 0%, #8B5CF6 25%, #4F46E5 50%, #8B5CF6 75%, #D565EA 100%)",
                  backgroundSize: "200% 100%",
                  animation: "aiShimmer 3s ease-in-out infinite",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>
                
                    {pill.label}
                  </span>
                </button>

            )}
          </div>
        </div>
      </div>
    </>);

}