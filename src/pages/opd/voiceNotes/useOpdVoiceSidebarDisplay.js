import { useEffect, useState } from "react";
import {
  extractConsultationCopy,
  extractOpdVoiceDigitization,
  extractVoiceTranscript,
  buildVoiceStructuredCardData,
} from "./opdVoiceNotesUtils";
import { fetchNeoVoiceConsultationForPatient } from "../../../api/services/ApiNeoSapien";

export default function useOpdVoiceSidebarDisplay({
  patientUniqueId,
  enabled = true,
}) {
  const [voiceSidebarProps, setVoiceSidebarProps] = useState(null);

  useEffect(() => {
    if (!enabled || !patientUniqueId) {
      setVoiceSidebarProps(null);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const consultation = await fetchNeoVoiceConsultationForPatient(patientUniqueId);
        if (cancelled) return;

        if (!consultation) {
          setVoiceSidebarProps(null);
          return;
        }

        const copy = extractConsultationCopy(consultation);
        const digitization = extractOpdVoiceDigitization(consultation);
        const structuredData = buildVoiceStructuredCardData(digitization, copy);
        const { transcript, transcriptSegments } = extractVoiceTranscript(consultation);
        const hasContent =
          structuredData.sections.length > 0 ||
          Boolean(transcript) ||
          transcriptSegments.length > 0;

        const consultationId =
          consultation?._id ||
          consultation?.id ||
          consultation?.digitizeData?._id ||
          consultation?.digitizeData?.id ||
          null;
        const autoCopy = copy.length && structuredData.copyAllPayload?.digitization
          ? {
            consultationId: consultationId || `${patientUniqueId}`,
            copy,
            digitization: structuredData.copyAllPayload.digitization,
          }
          : null;

        if (!hasContent) {
          setVoiceSidebarProps(null);
          return;
        }

        setVoiceSidebarProps({ transcript, transcriptSegments, structuredData, autoCopy });
      } catch {
        if (!cancelled) setVoiceSidebarProps(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, patientUniqueId]);

  return voiceSidebarProps;
}
