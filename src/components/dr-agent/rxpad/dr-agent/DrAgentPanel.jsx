import React, { useEffect, useMemo } from "react";
import { message } from "antd";
import { useSelector } from "react-redux";
import { cn } from "../../utils";
import styles from "./DrAgentPanel.module.scss";

import { useRxPadSync } from "./RxPadSyncContext";
import { VoiceRxBottomSheet } from "../../voicerx/VoiceRxBottomSheet";
import { toast } from "../../voicerx/toast";
import { AgentHeader } from "./shell/AgentHeader";
import { SessionHistoryDrawer } from "./shell/SessionHistoryDrawer";
import { ChatThread } from "./chat/ChatThread";
import { DocumentBottomSheet } from "./chat/DocumentBottomSheet";
import { VoiceEmptyState } from "./shell/VoiceEmptyState";
import { BackFace } from "./shell/BackFace";
import { FooterBar } from "./shell/FooterBar";

import { VOICE_RX_CONSULT_OPTIONS } from "./constants";
import { useDrAgentPanel } from "./hooks/useDrAgentPanel";
import { buildClinicalNotesCopyMeta, trackDrAgentCopyUsed } from "../../utils/copyTracking";

function isVitalsCopyPayload(payload) {
  const digitization = payload?.digitization;
  return Boolean(
    digitization?.vitals_and_body_composition ||
    digitization?.vitalsAndBodyComposition ||
    digitization?.vitals ||
    payload?.vitals_and_body_composition ||
    payload?.vitalsAndBodyComposition ||
    payload?.vitals
  );
}

export function DrAgentPanel({
  onClose,
  onOpen,
  isPanelVisible = true,
  initialPatientId,
  voiceRxMode = false,
  onVoiceCaptureModeChange,
  headerBrandTitle,
  autoOpenBottomSheet = false,
  patientId,
  doctorId,
  patientData,
  voiceHydrationStatus,
  symptomCollectorStatus,
  onPrintSoap,
}) {
  const { profile } = useSelector((state) => state.doctors || {});
  const voiceDigitization = useSelector((state) => state.voiceDigitization || {});
  const voiceCopyTrackingContext = useMemo(() => ({
    doctorId: doctorId || profile?.doctor_unique_id || "",
    doctorName: profile?.um_name || "",
    patientId: patientData?.patient_unique_id || patientId || initialPatientId || "",
    patientName: patientData?.pm_fullname || patientData?.pm_first_name || "",
    sessionId: voiceDigitization?.sessionId || "",
    voiceRxVersion: "2.0",
    sourceSurface: "doctor-agent",
    voiceInputLocation: "Clinical Notes",
  }), [
    doctorId,
    initialPatientId,
    patientData?.patient_unique_id,
    patientData?.pm_first_name,
    patientData?.pm_fullname,
    patientId,
    profile?.doctor_unique_id,
    profile?.um_name,
    voiceDigitization?.sessionId,
  ]);
  const {
    // State
    selectedPatientId,
    messages,
    isTyping,
    typingHint,
    activeSpecialty,
    setActiveSpecialty,
    doctorViewType,
    intakeMode,
    inputValue,
    setInputValue,
    isPrefilled,
    setIsPrefilled,
    isSessionHistoryOpen,
    setIsSessionHistoryOpen,
    showAttachPanel,
    setShowAttachPanel,
    showDocBottomSheet,
    setShowDocBottomSheet,
    voiceRxDialogOpen,
    setVoiceRxDialogOpen,
    voiceRxDialogChoice,
    setVoiceRxDialogChoice,
    voiceRxRecording,
    setVoiceRxRecording,
    beginVoiceAddOn,
    submitQuickEdit,
    retryVoiceRxSoap,
    flipDeg,
    voiceRxAwaitingResponse,
    voiceRxHandoffExiting,
    voiceRxResult,
    setVoiceRxResult,
    voiceRxResultMinimized,
    setVoiceRxResultMinimized,
    voiceRxLiveTranscript,
    voiceRxSubmittedTranscript,
    voiceRxProcessingTranscript,
    blockedVoiceToast,
    setBlockedVoiceToast,
    chipShaking,
    // Computed
    patient,
    summary,
    voiceEmptyState,
    voiceFirstTimeMode,
    glanceInlinePillsActive,
    pills,
    availableSpecialties,
    showDoctorViewSelector,
    patientDocuments,
    isFlipped,
    // Handlers
    handleSend,
    handlePillTap,
    handleFeedback,
    handlePatientSelect,
    handleCopy,
    handleSidebarNav,
    handleChatPillTap,
    handleDoctorViewChange,
    handleIntakeModeChange,
    handlePatientChange,
    handleLockedChipClick,
    handleEditMessage,
    handleAttach,
    handleSendDocuments,
    handleUploadNew,
    handleFileInputChange,
    handleAttachSelect,
    handleVoiceTranscription,
    handleVoiceRxPauseChange,
    confirmVoiceRxConsult,
    cancelVoiceRxRecording,
    submitVoiceRxRecording,
    handleViewPatientDetails,
    // Refs
    chatScrollRef,
    fileInputRef,
    // RxPad sync
    runCopyWithAura,
    pushHistoricalUpdates
  } = useDrAgentPanel({
    voiceRxMode,
    onVoiceCaptureModeChange,
    initialPatientId,
    isPanelVisible,
    autoOpenBottomSheet,
    onClose,
    onOpen,
    patientId,
    doctorId,
    patientData,
    voiceHydrationStatus,
    symptomCollectorStatus,
  });

  const { activeVoiceModule, headerDictation } = useRxPadSync();
  const headerDictationBusy = headerDictation?.status === "recording" || headerDictation?.status === "transcribing";
  const voiceLocked = !!activeVoiceModule || headerDictationBusy;
  const voiceRecorderAnalyticsContext = useMemo(() => {
    const activePatientId = patientData?.patient_unique_id || patientId || selectedPatientId || "";
    return {
      patientData,
      profile,
      sessionId: voiceDigitization?.sessionId || "",
      mode: voiceRxDialogChoice,
      voicecall: voiceDigitization?.voiceCallCount || 0,
      moduleName: "Dr Agent",
      sourceSurface: "dr_agent",
      voiceInputLocation: "Dr Agent",
      isDoctorAgent: true,
      doctorId,
      patientId: activePatientId,
      selectedPatientId,
    };
  }, [
    doctorId,
    patientData,
    patientId,
    profile,
    selectedPatientId,
    voiceDigitization?.sessionId,
    voiceDigitization?.voiceCallCount,
    voiceRxDialogChoice,
  ]);

  useEffect(() => {
    toast.setHandler(({ type, msg, duration, closable, key, onDismiss }) => {
      const notify = message[type] || message.info;
      const messageKey = key || `dr-agent-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const content = closable ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <span>{msg}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={(event) => {
              event.stopPropagation();
              message.destroy(messageKey);
              onDismiss?.();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              border: 0,
              borderRadius: 11,
              background: "rgba(17, 24, 39, 0.10)",
              color: "inherit",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}>
            {"\u00d7"}
          </button>
        </span>
      ) : msg;
      notify({ key: messageKey, content, duration: duration ?? 2.5 });
    });
    return () => toast.setHandler(null);
  }, []);

  return (
    <div
      id="dr-agent-panel-root"
      className={styles.panelRoot}>

      {/* 3D Wrapper — perspective + preserve-3d in CSS; only dynamic rotateY inline */}
      <div
        className={styles.flipWrapper}
        style={{ "--flip-deg": `${flipDeg}deg` }}>

        {/* FRONT FACE */}
        <div
          className={cn(styles.frontFace, isFlipped && styles.frontFaceHidden)}>

          <div className={styles.frontInner}>

            {/* Animated TP AI gradient wash */}
            <div className="vrx-da-gradient-wash pointer-events-none absolute inset-0 z-0" aria-hidden />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className={styles.fileInput}
              onChange={handleFileInputChange}
            />

            {/* Chat area */}
            <div className={styles.chatArea}>

              <div ref={chatScrollRef} className={cn("da-chat-scroll", styles.chatScroll)}>

                {/* Sticky liquid-glass header */}
                <div className={styles.headerSticky}>
                  <AgentHeader
                    availableSpecialties={availableSpecialties}
                    activeSpecialty={activeSpecialty}
                    onSpecialtyChange={setActiveSpecialty}
                    onPatientChange={handlePatientChange}
                    selectedPatientId={selectedPatientId}
                    onClose={onClose}
                    doctorViewType={doctorViewType}
                    onDoctorViewChange={handleDoctorViewChange}
                    showDoctorViewSelector={showDoctorViewSelector}
                    onViewSessionHistory={() => setIsSessionHistoryOpen(true)}
                    intakeMode={intakeMode}
                    onIntakeModeChange={handleIntakeModeChange}
                    brandTitle={headerBrandTitle}
                  />
                </div>

                {voiceEmptyState ? (
                  <VoiceEmptyState
                    onStartVoice={() => setVoiceRxDialogOpen(true)}
                    onViewPatientDetails={handleViewPatientDetails}
                    hasSymptomCollectorData={!!summary.symptomCollectorData}
                    voiceLocked={voiceLocked}
                  />
                ) : (
                  <ChatThread
                    messages={messages}
                    isTyping={isTyping || voiceRxAwaitingResponse}
                    typingHint={typingHint}
                    onFeedback={handleFeedback}
                    onPillTap={handleChatPillTap}
                    onCopy={handleCopy}
                    onSidebarNav={handleSidebarNav}
                    className={styles.chatThreadFlex}
                    activeSpecialty={activeSpecialty}
                    patientDocuments={patientDocuments}
                    onPatientSelect={handlePatientSelect}
                    onEditMessage={handleEditMessage}
                  />
                )}
              </div>
            </div>

            <FooterBar
              voiceRxMode={voiceRxMode}
              voiceRxRecording={voiceRxRecording}
              voiceFirstTimeMode={voiceFirstTimeMode}
              pills={pills}
              messages={messages}
              isTyping={isTyping}
              glanceInlinePillsActive={glanceInlinePillsActive}
              showAttachPanel={showAttachPanel}
              inputValue={inputValue}
              isPrefilled={isPrefilled}
              isDisabled={isTyping || voiceRxAwaitingResponse}
              patientLabel={patient.label}
              patientGender={patient.gender}
              patientAge={patient.age}
              onPillTap={handlePillTap}
              onAttachSelect={handleAttachSelect}
              onAttachClose={() => setShowAttachPanel(false)}
              onStartVoice={() => setVoiceRxDialogOpen(true)}
              onInputChange={(v) => { setInputValue(v); if (isPrefilled) setIsPrefilled(false); }}
              onSend={() => { setIsPrefilled(false); handleSend(); }}
              onAttach={handleAttach}
              onVoiceTranscription={handleVoiceTranscription}
              onLockedChipClick={handleLockedChipClick}
              voiceLocked={voiceLocked}
            />

            {/* Document Bottom Sheet */}
            {showDocBottomSheet && (
              <DocumentBottomSheet
                documents={patientDocuments}
                onSendDocuments={handleSendDocuments}
                onUploadNew={handleUploadNew}
                onClose={() => setShowDocBottomSheet(false)}
                patientFirstName={patient?.label?.split(" ")[0]}
              />
            )}

            <SessionHistoryDrawer
              open={isSessionHistoryOpen}
              onOpenChange={setIsSessionHistoryOpen}
              patientName={patient.label}
              patientMeta={[patient.gender, patient.age ? `${patient.age}y` : null].filter(Boolean).join(" · ")}
            />

            {voiceRxMode && (
              <VoiceRxBottomSheet
                isOpen={voiceRxDialogOpen}
                onClose={() => setVoiceRxDialogOpen(false)}
                consultOptions={VOICE_RX_CONSULT_OPTIONS}
                selectedOption={voiceRxDialogChoice}
                onSelectOption={setVoiceRxDialogChoice}
                onConfirm={confirmVoiceRxConsult}
              />
            )}

          </div>
        </div>

        <BackFace
          isFlipped={isFlipped}
          isPanelVisible={isPanelVisible}
          voiceRxResult={voiceRxResult}
          voiceRxDialogChoice={voiceRxDialogChoice}
          voiceRxLiveTranscript={voiceRxLiveTranscript}
          voiceRxSubmittedTranscript={voiceRxSubmittedTranscript}
          voiceRxProcessingTranscript={voiceRxProcessingTranscript}
          voiceRxAwaitingResponse={voiceRxAwaitingResponse}
          voiceRxHandoffExiting={voiceRxHandoffExiting}
          patientName={patient.label}
          patientId={patientId}
          doctorId={doctorId}
          analyticsContext={voiceRecorderAnalyticsContext}
          onCancel={cancelVoiceRxRecording}
          onSubmit={submitVoiceRxRecording}
          onCollapse={onClose}
          onExpand={onOpen}
          onPauseChange={handleVoiceRxPauseChange}
          onBack={() => setVoiceRxResultMinimized(true)}
          onMinimize={onClose}
          onAddDetailsByVoice={beginVoiceAddOn}
          onQuickEditSubmit={submitQuickEdit}
          onRetrySoap={retryVoiceRxSoap}
          voiceLocked={voiceLocked}
          onCopyResult={(payload, opts) => {
            if (opts?.copyTracking) {
              trackDrAgentCopyUsed({
                ...voiceCopyTrackingContext,
                ...opts.copyTracking,
              });
            }
            runCopyWithAura(payload, {
              ...opts,
              onAfterCopy: isVitalsCopyPayload(payload) ? undefined : () => toast.success("Copied to RxPad")
            });
          }}
          onCopyAll={() => {
            if (!voiceRxResult) return;
            const copyAllPayload = voiceRxResult.digitization
              ? {
                sourceDateLabel: "Voice consult",
                targetSection: "rxpad",
                digitization: voiceRxResult.digitization
              }
              : voiceRxResult.structured?.copyAllPayload;
            if (!copyAllPayload) return;
            trackDrAgentCopyUsed(buildClinicalNotesCopyMeta({
              ...voiceCopyTrackingContext,
              component: "Structured Clinical Notes",
              componentKey: "all",
              copyScope: "copy_all",
              cta: "copy_all_to_rxpad",
              isBulk: true,
            }));
            runCopyWithAura(copyAllPayload, {
              bulk: true,
              onAfterCopy: () => toast.success("Copied All Fields to RxPad")
            });
            if (voiceRxResult.pendingSidebarBatch) {
              pushHistoricalUpdates(voiceRxResult.pendingSidebarBatch);
              setVoiceRxResult((prev) => prev ? { ...prev, pendingSidebarBatch: undefined } : prev);
            }
          }}
          onCopySoap={() => trackDrAgentCopyUsed(buildClinicalNotesCopyMeta({
            ...voiceCopyTrackingContext,
            component: "SOAP Note",
            componentKey: "soap",
            destination: "clipboard",
            copyScope: "soap_note",
            cta: "copy_soap_note",
          }))}
          onPrintSoap={onPrintSoap}
        />

      </div>
      {/* da-* styles live in dr-agent-globals.css */}
    </div>
  );
}
