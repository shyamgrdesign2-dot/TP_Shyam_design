"use client";

/**
 * VoiceRxIndicator — formerly the always-on Quick-Dictation pill, now
 * intentionally HIDDEN per product call.
 *
 * The doctor's surface for invoking Quick Dictation is now:
 *   1. A one-time coach-mark on the first focus of any free-text input,
 *      teaching the ⇧+⇧ shortcut (no visible pill or tooltip).
 *   2. The double-Shift keyboard handler in VoiceBarProvider, unchanged.
 *
 * We keep:
 *   • Scope registration + patient tagging (other surfaces depend on it).
 *   • Input-focus shimmer hook (still pings the provider).
 *   • The after-dictation popover (now anchored to the bottom-right corner,
 *     since there's no pill anchor anymore).
 *   • The history sidebar (no UI to open it for now — reachable later).
 *   • The first-input coach-mark (new — teaches the shortcut on focus #1).
 *
 * The pill JSX itself is gone. The file is the integration point for the
 * Quick-Dictation chrome, so all of the above mounts here.
 */

import { useRegisterVoiceRxScope } from "./voice-bar-context";
import { useInputShimmer } from "./use-input-shimmer";
import { VoiceRxAfterDictationPopover } from "./VoiceRxAfterDictationPopover";
import { VoiceRxHistorySidebar } from "./VoiceRxHistorySidebar";
import { QuickDictateCoachMark } from "./QuickDictateCoachMark";

export function VoiceRxIndicator({ patient } = {}) {
  // Register scope so the provider knows VoiceRx is mounted, and wire the
  // focus-shimmer listener while we're alive.
  useRegisterVoiceRxScope(patient);
  useInputShimmer();

  return (
    <>
      {/* After-dictation preview popover (no input was focused at submit
          time). No pill anchor anymore — falls back to bottom-right. */}
      <VoiceRxAfterDictationPopover anchorRef={null} />

      {/* History sidebar — still reachable via context.openHistory() from
          wherever we choose to surface it next. */}
      <VoiceRxHistorySidebar />

      {/* Stateful Quick-Dictator coach mark. Shows on every qualifying
          free-text focus until: (a) the doctor checks "Don't show again"
          + Got it, or (b) they complete one successful dictation, after
          which it drops to a minimal chip for 2 more focuses, then never
          again. Hidden while the VoiceBar itself is open. */}
      <QuickDictateCoachMark />
    </>
  );
}
