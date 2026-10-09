/**
 * Dr. Copilot uses the Rx pad's real sync context, not a copy of it.
 *
 * This file used to hold a slimmed duplicate, which meant Copilot's "copy to
 * RxPad", VoiceRx credit guard and dictation locks acted on a context no page
 * was listening to. Re-exporting the real one keeps every existing import
 * working while making them all read the same state the consultation page
 * provides (see surfaces/copilotRxPadBridge.js).
 */
export {
  RxPadSyncProvider,
  RxPadSyncContext,
  useRxPadSync,
} from "../../dr-agent/rxpad/dr-agent/RxPadSyncContext";
