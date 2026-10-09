import React, { useMemo } from "react";
import { cn } from "../../../utils";
import { VoiceRxCanvas } from "../../../voicerx/VoiceRxCanvas";
import { VoiceRxActiveAgent } from "../../../voicerx/VoiceRxActiveAgent";
import { VoiceStructuredRxCard } from "../cards/action/VoiceStructuredRxCard";
import { SoapNoteCard } from "../../../voicerx/SoapNoteCard";
import { soapToHtml } from "../../../voicerx/utils/soap-formatter";
import { useDispatch, useSelector } from "react-redux";
import { updateVoiceSoapHtml } from "../../../../../redux/voiceDigitizationSlice";

class VoiceErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[VoiceRx] render crashed:", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Voice consultation could not start</div>
          <div style={{ fontSize: 12, color: "#64748b", maxWidth: 280, lineHeight: 1.5 }}>{String(this.state.error?.message || this.state.error)}</div>
          <button type="button" onClick={() => { this.setState({ error: null }); this.props.onCancel?.(); }} style={{ padding: "8px 16px", borderRadius: 8, background: "#4B4AD5", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Close</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function BackFace({
  isFlipped,
  isPanelVisible,
  voiceRxResult,
  voiceRxDialogChoice,
  voiceRxLiveTranscript,
  voiceRxSubmittedTranscript,
  voiceRxProcessingTranscript,
  voiceRxAwaitingResponse,
  voiceRxHandoffExiting,
  patientName,
  patientId,
  doctorId,
  analyticsContext,
  onCancel,
  onSubmit,
  onCollapse,
  onExpand,
  onPauseChange,
  onBack,
  onMinimize,
  onAddDetailsByVoice,
  onQuickEditSubmit,
  onRetrySoap,
  onCopyResult,
  onCopyAll,
  onCopySoap,
  onPrintSoap,
  voiceLocked = false,
}) {
  const dispatch = useDispatch();
  const liveSoapHtml = useSelector((s) => s.voiceDigitization?.soapHtml || "");
  const liveSoapRaw = useSelector((s) => s.voiceDigitization?.soap || null);
  const voiceSessionId = useSelector((s) => s.voiceDigitization?.sessionId);
  // liveSoapHtml updates on every RichEditor edit; prefer over the static voiceRxResult snapshot
  const effectiveSoap = voiceRxResult?.soap || liveSoapRaw;
  const effectiveSoapHtml = useMemo(() => {
    const hydratedHtml = liveSoapHtml || voiceRxResult?.soapHtml || "";
    if (hydratedHtml) return hydratedHtml;
    return effectiveSoap ? soapToHtml(effectiveSoap) : "";
  }, [effectiveSoap, liveSoapHtml, voiceRxResult?.soapHtml]);
  const effectiveSoapStatus = voiceRxResult?.soapStatus || (effectiveSoap || effectiveSoapHtml ? "fulfilled" : undefined);
  const hasClinicalNotes = voiceRxResult?.structured?.sections?.some(
    (section) => Array.isArray(section?.items) && section.items.length > 0
  );
  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full bg-white",
        (!isFlipped || !isPanelVisible) && "pointer-events-none invisible"
      )}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg) translate3d(0,0,1px)",
        WebkitTransform: "rotateY(180deg) translate3d(0,0,1px)",
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#fff",
      }}
    >
      <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
        {isFlipped && voiceRxResult ? (
          <VoiceRxCanvas
            modeLabel={voiceRxResult.modeLabel}
            transcript={voiceRxResult.transcript}
            transcriptSegments={voiceRxResult.transcriptSegments}
            emrCard={hasClinicalNotes ? (
              <VoiceStructuredRxCard
                data={voiceRxResult.structured}
                onCopy={onCopyResult}
                hideHeader={true}
              />
            ) : null}
            soapCard={
              <SoapNoteCard
                status={effectiveSoapStatus}
                html={effectiveSoapHtml}
                onRetry={onRetrySoap}
                onChange={(html) => dispatch(updateVoiceSoapHtml(html))}
              />
            }
            soapStatus={effectiveSoapStatus}
            soapHtml={effectiveSoapHtml}
            onCopyToRx={onCopyAll}
            onCopySoap={onCopySoap}
            onPrintSoap={onPrintSoap}
            onBack={onBack}
            onMinimize={onMinimize}
            onAddDetailsByVoice={onAddDetailsByVoice}
            onQuickEditSubmit={onQuickEditSubmit}
            audioChunkContext={{
              sessionId: voiceSessionId,
              doctorId,
              patientId,
              doctorName: analyticsContext?.profile?.um_name,
              patientName,
            }}
            analyticsContext={analyticsContext}
            voiceLocked={voiceLocked}
          />
        ) : isFlipped ? (
          <VoiceErrorBoundary onCancel={onCancel}>
            <VoiceRxActiveAgent
              mode={voiceRxDialogChoice}
              sectionLabel="Dr Agent"
              transcript={voiceRxLiveTranscript}
              submittedTranscript={voiceRxSubmittedTranscript}
              processingTranscript={voiceRxProcessingTranscript}
              isAwaitingResponse={voiceRxAwaitingResponse}
              isHandoffExiting={voiceRxHandoffExiting}
              onCancel={onCancel}
              onSubmit={onSubmit}
              onCollapse={onCollapse}
              onExpand={onExpand}
              isPanelVisible={isPanelVisible}
              onPauseChange={onPauseChange}
              patientName={patientName}
              audioChunkContext={{
                sessionId: voiceSessionId,
                doctorId,
                patientId,
                doctorName: analyticsContext?.profile?.um_name,
                patientName,
              }}
              analyticsContext={analyticsContext}
            />
          </VoiceErrorBoundary>
        ) : null}
      </div>
    </div>
  );
}
