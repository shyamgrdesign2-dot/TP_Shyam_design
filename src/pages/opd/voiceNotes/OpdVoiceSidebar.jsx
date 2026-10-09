import { useCallback, useEffect, useRef } from "react";
import { VoiceRxCanvas } from "../../../components/dr-agent/voicerx/VoiceRxCanvas";
import { VoiceStructuredRxCard } from "../../../components/dr-agent/rxpad/dr-agent/cards/action/VoiceStructuredRxCard";
import { useRxPadSync } from "../../../components/dr-agent/rxpad/dr-agent/RxPadSyncContext";
import { toast } from "../../../components/dr-agent/voicerx/toast";
import { buildClinicalNotesCopyMeta, trackDrAgentCopyUsed } from "../../../components/dr-agent/utils/copyTracking";
import "../../../components/dr-agent/dr-agent-globals.css";
import "./opdVoiceSidebar.scss";

// Persists across sidebar remounts within the SPA session so a consultation's
// `copy` modules are auto-applied to the Rx only once.
const autoCopiedConsultationIds = new Set();

function isVitalsCopyPayload(payload) {
  const digitization = payload?.digitization;
  return Boolean(
    digitization?.vitals_and_body_composition ||
    digitization?.vitalsAndBodyComposition ||
    digitization?.vitals
  );
}

export default function OpdVoiceSidebar({
  transcript = "",
  transcriptSegments,
  structuredData,
  autoCopy = null,
}) {
  const { runCopyWithAura } = useRxPadSync();
  const autoCopyRef = useRef(false);

  // Auto-copy the modules the doctor already marked (`copy`) straight into the
  // left-side Rx: ["all"] copies everything, specific keys copy only those.
  // Runs once per consultation to avoid re-appending on re-render/navigation.
  useEffect(() => {
    const consultationId = autoCopy?.consultationId;
    const digitization = autoCopy?.digitization;
    if (!consultationId || !digitization) return;
    if (autoCopyRef.current || autoCopiedConsultationIds.has(consultationId)) return;

    autoCopyRef.current = true;
    autoCopiedConsultationIds.add(consultationId);

    runCopyWithAura(
      { sourceDateLabel: "Voice consult", targetSection: "rxpad", digitization },
      { bulk: true, onAfterCopy: () => toast.success("Voice notes copied to RxPad") }
    );
  }, [autoCopy?.consultationId, autoCopy?.digitization, autoCopy?.copy, runCopyWithAura]);

  const onCopy = useCallback(
    (payload, opts = {}) => {
      if (opts?.copyTracking) trackDrAgentCopyUsed(opts.copyTracking);
      runCopyWithAura(payload, {
        ...opts,
        onAfterCopy: isVitalsCopyPayload(payload)
          ? undefined
          : () => toast.success("Copied to RxPad"),
      });
    },
    [runCopyWithAura]
  );

  const onCopyAll = useCallback(() => {
    const digitization = structuredData?.copyAllPayload?.digitization;
    if (!digitization) return;

    trackDrAgentCopyUsed(
      buildClinicalNotesCopyMeta({
        component: "Structured Clinical Notes",
        componentKey: "all",
        copyScope: "copy_all",
        cta: "copy_all_to_rxpad",
        isBulk: true,
      })
    );

    runCopyWithAura(
      { sourceDateLabel: "Voice consult", targetSection: "rxpad", digitization },
      { bulk: true, onAfterCopy: () => toast.success("Copied All Fields to RxPad") }
    );
  }, [runCopyWithAura, structuredData?.copyAllPayload?.digitization]);

  if (!structuredData?.sections?.length && !transcript && !transcriptSegments?.length) {
    return null;
  }

  return (
    <div data-dr-agent="true" className="opd-voice-sidebar">
      <VoiceRxCanvas
        modeLabel="Conversation Mode"
        transcript={transcript}
        transcriptSegments={transcriptSegments}
        emrCard={
          structuredData ? (
            <VoiceStructuredRxCard data={structuredData} onCopy={onCopy} hideHeader />
          ) : null
        }
        onCopyToRx={structuredData?.copyAllPayload?.digitization ? onCopyAll : undefined}
      />
    </div>
  );
}
