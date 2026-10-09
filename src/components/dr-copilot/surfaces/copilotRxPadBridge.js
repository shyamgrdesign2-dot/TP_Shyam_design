import { useEffect, useSyncExternalStore } from "react";
import { useRxPadSync } from "../../dr-agent/rxpad/dr-agent/RxPadSyncContext";

/**
 * How Dr. Copilot reaches the Rx pad it is open over.
 *
 * Copilot is mounted once for the whole app (CopilotBoundary), outside the
 * consultation page's RxPadSyncProvider. VoiceRx cannot run without that
 * provider: the credit guard, the "another dictation is active" locks,
 * copy-to-RxPad and the page aura all live in it. So the consultation page
 * renders <CopilotRxPadBridge/> inside its own provider, and the bridge
 * publishes the live value - plus the patient, voice hydration status and SOAP
 * printing - to this small store. CopilotDock reads it and provides the same
 * context value around its panel, so Copilot's VoiceRx acts on the real page.
 *
 * A store rather than React state on the Copilot context: publishing into a
 * provider above the whole app would re-render every route on each sync
 * change. Only CopilotDock subscribes here.
 */

let current = null;
const listeners = new Set();

function publish(next) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return current;
}

/** `{ sync, enabled, patientId, doctorId, patientData, voiceHydrationStatus, symptomCollectorStatus, onPrintSoap }` or null. */
export function useCopilotRxPadBridge() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function CopilotRxPadBridge({
  enabled,
  patientId,
  doctorId,
  patientData,
  voiceHydrationStatus,
  symptomCollectorStatus,
  onPrintSoap,
}) {
  const sync = useRxPadSync();

  useEffect(() => {
    publish({
      sync,
      enabled: !!enabled,
      patientId,
      doctorId,
      patientData,
      voiceHydrationStatus,
      symptomCollectorStatus,
      onPrintSoap,
    });
  }, [sync, enabled, patientId, doctorId, patientData, voiceHydrationStatus, symptomCollectorStatus, onPrintSoap]);

  /* Leaving the consultation takes the bridge with it, so Copilot never acts
     on a page that is no longer there. */
  useEffect(() => () => publish(null), []);

  return null;
}
