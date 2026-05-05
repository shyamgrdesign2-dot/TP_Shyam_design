"use client";

import { cn } from "@/src/hooks/utils";

import { TPSnackbar } from "@/src/components/molecules/Snackbar";
import { VoiceRxBottomSheet } from "@/src/components/organisms/voicerx/VoiceRxBottomSheet";
import { AgentHeader } from "./shell/AgentHeader";
import { SessionHistoryDrawer } from "./shell/SessionHistoryDrawer";
import { ChatThread } from "./chat/ChatThread";
import { DocumentBottomSheet } from "./chat/DocumentBottomSheet";
import { VoiceEmptyState } from "./shell/VoiceEmptyState";
import { BackFace } from "./shell/BackFace";
import { FooterBar } from "./shell/FooterBar";

import { VOICE_RX_CONSULT_OPTIONS } from "./constants";
import { useDrAgentPanel } from "./hooks/useDrAgentPanel";

export function DrAgentPanel({
  onClose,
  onOpen,
  isPanelVisible = true,
  initialPatientId,
  voiceRxMode = false,
  onVoiceCaptureModeChange,
  headerBrandTitle,
  autoOpenBottomSheet = false
}) {
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
    voiceRxAwaitingResponse,
    voiceRxHandoffExiting,
    voiceRxResult,
    setVoiceRxResult,
    voiceRxResultMinimized,
    setVoiceRxResultMinimized,
    voiceRxLiveTranscript,
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
  } = useDrAgentPanel({ voiceRxMode, onVoiceCaptureModeChange, initialPatientId, isPanelVisible, autoOpenBottomSheet, onClose, onOpen });

  return (
    <div
      id="dr-agent-panel-root"
      className="relative flex h-full flex-col bg-transparent"
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        perspective: 1200,
        WebkitPerspective: 1200,
        // Force a new stacking / paint context. Safari needs this or the
        // ancestor `overflow: hidden` from the sliding fixed wrapper in
        // VoiceRxFlow flattens our preserve-3d subtree (back face ends up
        // 2D-mirrored instead of 3D-rotated — the exact iPad bug).
        isolation: "isolate"
      }}>
      
      {/* 3D Wrapper — every property below has a -webkit- twin because
           Safari (iPad, esp. iOS <16) silently falls back to flat compositing
           otherwise, which is why the BACK FACE was rendering the MIRROR of
           the front face content. `translate3d(0,0,0)` promotes the wrapper
           into its own GPU layer so the 3D context cannot be flattened by any
           overflow-hidden ancestor. */}
      <div
        className={cn("relative w-full h-full transition-transform duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]")}
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          transform: isFlipped ?
          "translate3d(0,0,0) rotateY(180deg)" :
          "translate3d(0,0,0) rotateY(0deg)",
          WebkitTransform: isFlipped ?
          "translate3d(0,0,0) rotateY(180deg)" :
          "translate3d(0,0,0) rotateY(0deg)",
          willChange: "transform"
        }}>
        

        {/* FRONT FACE —
             `translate3d(0,0,1px)` pushes the face 1px forward in Z space so
             Safari keeps it as its own 3D layer (instead of coalescing both
             faces into a single flat plane). `overflow-hidden` is moved to an
             INNER div below, because overflow clipping on a transformed 3D
             face is what triggers the Safari flattening bug. */}
        <div
          className={cn("absolute inset-0 w-full h-full bg-white", isFlipped && "pointer-events-none")}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translate3d(0,0,1px)",
            WebkitTransform: "translate3d(0,0,1px)"
          }}>
          
        <div className="flex h-full w-full flex-col overflow-hidden">

      {/* Animated TP AI gradient wash — 5% opacity moving across the whole panel */}
      <div className="vrx-da-gradient-wash pointer-events-none absolute inset-0 z-0" aria-hidden />

      {/* Hidden file input for native upload */}
      <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={handleFileInputChange} />
            

      {/* ── Chat area — transparent; inherits the FRONT FACE white + animated AI wash. ── */}
      <div
              className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden"
              style={{ background: "transparent" }}>
              
        <div ref={chatScrollRef} className="da-chat-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">

          {/* Sticky liquid-glass header — stays pinned at the top of the scroll area
                     so chat content scrolls behind the tags (content blurs under glass). */}
          <div className="pointer-events-none sticky top-0 z-30">
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
                    brandTitle={headerBrandTitle} />
                  
          </div>

          {voiceEmptyState ?
                <VoiceEmptyState
                  onStartVoice={() => setVoiceRxDialogOpen(true)}
                  onViewPatientDetails={handleViewPatientDetails}
                  hasSymptomCollectorData={!!summary.symptomCollectorData} /> : (


                /* Chat messages. `isTyping || voiceRxAwaitingResponse` so the
                   same in-chat TypingIndicator (rotating AI icon + carousel)
                   is used for BOTH manual chat replies AND voice-submit
                   processing. Replaces the old docked VoiceRxLoaderCard. */
                <ChatThread
                  messages={messages}
                  isTyping={isTyping || voiceRxAwaitingResponse}
                  typingHint={typingHint}
                  onFeedback={handleFeedback}
                  onPillTap={handleChatPillTap}
                  onCopy={handleCopy}
                  onSidebarNav={handleSidebarNav}
                  className="flex-1"
                  activeSpecialty={activeSpecialty}
                  patientDocuments={patientDocuments}
                  onPatientSelect={handlePatientSelect}
                  onEditMessage={handleEditMessage} />)

                }
        </div>
      </div>

      {/* Voice processing loader is now rendered INSIDE the chat thread
                 via ChatThread's built-in TypingIndicator (see isTyping prop
                 above). The old docked VoiceRxLoaderCard above the input is
                 gone — one loader grammar for all AI responses. */}

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
              onInputChange={(v) => {setInputValue(v);if (isPrefilled) setIsPrefilled(false);}}
              onSend={() => {setIsPrefilled(false);handleSend();}}
              onAttach={handleAttach}
              onVoiceTranscription={handleVoiceTranscription}
              onLockedChipClick={handleLockedChipClick} />
            

      {/* ── Document Bottom Sheet — overlays entire panel ── */}
      {showDocBottomSheet &&
            <DocumentBottomSheet
              documents={patientDocuments}
              onSendDocuments={handleSendDocuments}
              onUploadNew={handleUploadNew}
              onClose={() => setShowDocBottomSheet(false)}
              patientFirstName={patient?.label?.split(" ")[0]} />

            }

      {/* Patient/Context selector removed — homepage mode retired */}

      {/* Session history overlay drawer — opened from the brand-pill kebab.
                 Patient identity row at the top of the drawer reflects the active
                 patient context, so doctors always know whose history they're
                 looking at. */}
      <SessionHistoryDrawer
              open={isSessionHistoryOpen}
              onOpenChange={setIsSessionHistoryOpen}
              patientName={patient.label}
              patientMeta={[patient.gender, patient.age ? `${patient.age}y` : null].filter(Boolean).join(" · ")} />
            

      {voiceRxMode &&
            <VoiceRxBottomSheet
              isOpen={voiceRxDialogOpen}
              onClose={() => setVoiceRxDialogOpen(false)}
              consultOptions={VOICE_RX_CONSULT_OPTIONS}
              selectedOption={voiceRxDialogChoice}
              onSelectOption={setVoiceRxDialogChoice}
              onConfirm={confirmVoiceRxConsult} />

            }

      {/* Black "Generating consultation summary…" snackbar removed —
                 the in-chat typing indicator now carries the loading feedback;
                 an additional top-of-page snackbar was redundant and noisy. */}

      {/* Blocked-voice nudge — surfaces when the clinician tries to start
                 a full Dr. Agent consultation while an inline module recorder
                 is still running. Points them at the active module so they
                 know exactly what to close. Top-center severity=warning so
                 it reads as "hey, one thing first" rather than an error. */}
      <TPSnackbar
              open={blockedVoiceToast !== null}
              message={blockedVoiceToast ?? ""}
              severity="warning"
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
              autoHideDuration={3800}
              onClose={(_, reason) => {
                if (reason === "clickaway") return;
                setBlockedVoiceToast(null);
              }} />
            

        </div> {/* END inner overflow-clip wrapper */}
        </div> {/* END FRONT FACE */}

        <BackFace
          isFlipped={isFlipped}
          isPanelVisible={isPanelVisible}
          voiceRxResult={voiceRxResult}
          voiceRxDialogChoice={voiceRxDialogChoice}
          voiceRxLiveTranscript={voiceRxLiveTranscript}
          voiceRxAwaitingResponse={voiceRxAwaitingResponse}
          voiceRxHandoffExiting={voiceRxHandoffExiting}
          patientName={patient.label}
          onCancel={cancelVoiceRxRecording}
          onSubmit={submitVoiceRxRecording}
          onCollapse={onClose}
          onExpand={onOpen}
          onPauseChange={handleVoiceRxPauseChange}
          onBack={() => setVoiceRxResultMinimized(true)}
          onMinimize={onClose}
          onAddDetailsByVoice={() => {
            setVoiceRxResult(null);
            setVoiceRxRecording(true);
            onVoiceCaptureModeChange?.(voiceRxDialogChoice);
          }}
          onCopyResult={(payload) => runCopyWithAura(payload)}
          onCopyAll={() => {
            if (!voiceRxResult) return;
            runCopyWithAura(voiceRxResult.structured.copyAllPayload, { bulk: true });
            if (voiceRxResult.pendingSidebarBatch) {
              pushHistoricalUpdates(voiceRxResult.pendingSidebarBatch);
              setVoiceRxResult((prev) => prev ? { ...prev, pendingSidebarBatch: undefined } : prev);
            }
          }} />
        
      </div> {/* END 3D Wrapper */}

      {/* Floating chip hover/active + shake animation CSS */}
      {/* da-* styles live in app/globals.css */}
    </div>);

}