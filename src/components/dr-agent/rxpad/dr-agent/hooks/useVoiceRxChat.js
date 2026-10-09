import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { useRxPadSync } from "../RxPadSyncContext";
import { toast } from "../../../voicerx/toast";


import { VOICE_RX_DICTATION_CHUNKS, VOICE_RX_AMBIENT_CHUNKS } from "../../../voicerx/utils";
import { createVoiceRxSessionContext } from "../../../voicerx/api/run-voice-rx-pipeline";
import {
  transcribeAudio,
  digitiseClinicalData,
  transcriptToText as clinicalTranscriptToText,
  hasTranscriptContent as clinicalHasTranscriptContent
} from "../../../voicerx/api/clinical-processing";
import { generateSoapNote } from "../../../voicerx/api/soap-service";
import { digitizationToSections } from "../../../voicerx/utils/result-formatters";
import { soapToHtml, htmlToSoapSections } from "../../../voicerx/utils/soap-formatter";
import { clearLatestSoapDraft } from "../../../voicerx/utils/soap-session-draft";
import {
  addVoiceHistoryEntry,
  beginVoiceAttempt,
  markVoiceLogCreated,
  updateVoiceClinicNotes,
  updateVoiceSoap,
  updateVoiceSoapHtml,
  updateVoiceDigitizeData,
} from "../../../../../redux/voiceDigitizationSlice";
import {
  buildVoiceHistoryEntry,
  trackVoiceRx2StartEvent,
  VOICE_RX_PROCESSING_API,
  uploadAndLogVoiceRx2,
} from "../../../voicerx/voiceRx2Logging";
import {
  createVoiceV2AbortError,
  VOICE_V2_ABORT_REASONS,
} from "../../../voicerx/api/stacks-api-tracking";

import { useLiveTranscript } from "../../../voicerx/use-live-transcript";
import { uid } from "../utils/panelUtils";


import { VOICE_RX_SUBMIT_BUTTON_MIN_MS, toStructuredVoiceItem, hasObjectData, firstMeaningfulObject, hasMeaningfulVoiceDigitization, buildSymptomCollectorPreviousContext, buildVoiceRxContextParams } from "./voiceRxChatHelpers";

/**
 * VoiceRx inside a chat panel: the whole flow, shared.
 *
 * Moved verbatim out of useDrAgentPanel so the Rx pad's Dr. Agent panel and
 * Dr. Copilot run the same VoiceRx - the consult-mode sheet, recording, the
 * processing handoff, the transcript bubble, the structured Rx card, the
 * result canvas with add-details-by-voice, quick edit and SOAP retry, plus
 * the credit guard, usage logging and voice history. Nothing here is
 * specific to either surface: the caller owns the thread
 * (`messagesByPatient` / `setMessagesByPatient`) and the patient in scope,
 * and renders the returned state with the existing VoiceRx components.
 *
 * Must be rendered under a RxPadSyncProvider (the Rx pad's own, or the
 * bridge Dr. Copilot uses) for the credit guard, dictation locks and
 * copy-to-RxPad to reach the page.
 */
export function useVoiceRxChat({
  selectedPatientId,
  messagesByPatient,
  setMessagesByPatient,
  voiceRxMode,
  onVoiceCaptureModeChange,
  isPanelVisible,
  autoOpenBottomSheet,
  patientId,
  doctorId,
  patientData,
  voiceHydrationStatus,
  symptomCollectorStatus,
  summarySymptomCollectorData,
  /* A new voice session clears the thread. Right for the Rx pad's Dr. Agent,
     whose thread is the consultation's; wrong for a surface whose thread also
     holds other conversation (Dr. Copilot's chart questions). */
  resetThreadOnVoiceSession = true,
}) {
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.doctors);
  const voiceDigitization = useSelector((state) => state.voiceDigitization);

  // Voice Rx API session context — sessionId regenerates on each new dictation
  const voiceRxSessionRef = useRef(null);
  const voiceRxAbortRef = useRef(null);
  const voiceSubmitInFlightRef = useRef(false);
  const soapRetryInFlightRef = useRef(false);
  const pendingInitialVoiceUserMsgIdRef = useRef(null);
  const hasAutoHydratedRef = useRef(false);
  const abortActiveVoiceRxRequest = useCallback((reason) => {
    if (!voiceRxAbortRef.current) return;
    try {
      if (reason) {
        voiceRxAbortRef.current.abort(createVoiceV2AbortError(reason));
      } else {
        voiceRxAbortRef.current.abort();
      }
    } catch { /* ignore */ }
    voiceRxAbortRef.current = null;
  }, []);

  const [voiceRxDialogOpen, setVoiceRxDialogOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (autoOpenBottomSheet && isPanelVisible && voiceRxMode && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      const timer = setTimeout(() => setVoiceRxDialogOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [autoOpenBottomSheet, isPanelVisible, voiceRxMode]);

  const [voiceRxDialogChoice, setVoiceRxDialogChoice] = useState("ambient_consultation");
  const [voiceRxRecording, setVoiceRxRecording] = useState(false);
  /** Scripted-demo transcript — used only as a fallback when the browser has no Web Speech API. */
  const [voiceRxScriptedTranscript, setVoiceRxScriptedTranscript] = useState("");
  const [voiceRxAwaitingResponse, setVoiceRxAwaitingResponse] = useState(false);
  const [voiceRxSubmittedTranscript, setVoiceRxSubmittedTranscript] = useState("");
  const [voiceRxProcessingTranscript, setVoiceRxProcessingTranscript] = useState("");
  /**
   * When the user clicks Back on the 3-tab result view, we don't WIPE
   * the result — we minimise it. The chat then shows the new
   * "Conversation Mode" card; clicking the expand icon on that card
   * sets minimised back to false and the panel flips back into the
   * 3-tab view it was in before, with all state preserved.
   */
  const [voiceRxResultMinimized, setVoiceRxResultMinimized] = useState(false);
  /**
   * `voiceRxHandoffExiting` is briefly true (≈320ms) at the moment we
   * cross from "shiner card with loader" to "result tabs". Lets us
   * play a coordinated exit (shiner slides UP + fades out) BEFORE the
   * panel hard-swaps to the VoiceRx result canvas, which then slides in from
   * the top. Without this gate the swap reads as a single-frame jump
   * and the user perceives a glitch.
   */
  const [voiceRxHandoffExiting, setVoiceRxHandoffExiting] = useState(false);
  // Post-submit result panel — when set, the back face shows the 3-tab
  // result view (Transcript / TP EMR / Clinical Notes) instead of the
  // recorder. "Back to chat" clears this and flips the panel back.
  const [voiceRxResult, setVoiceRxResult] = useState(null);
  const voiceRxStreamIdx = useRef(0);
  const voiceRxTimeoutRef = useRef(null);
  // Captures the prior voiceRxResult when the doctor clicks the small
  // mic on the result canvas to add more dictation. The next submit
  // merges the new transcript chunk with the prior one so the
  // transcript is cumulative — without this ref the prior transcript
  // would be wiped each time the doctor re-records.
  const priorVoiceResultRef = useRef(null);
  /** Active agent lifts its paused state here so the scripted transcript can also pause. */
  const voiceRxPausedRef = useRef(false);
  const [voiceRxPaused, setVoiceRxPaused] = useState(false);
  const handleVoiceRxPauseChange = useCallback((paused) => {
    voiceRxPausedRef.current = paused;
    setVoiceRxPaused(paused);
  }, []);

  useEffect(() => {
    setVoiceRxResult(null);
    setVoiceRxResultMinimized(false);
    hasAutoHydratedRef.current = false;
  }, [selectedPatientId]);

  useEffect(() => {
    if (voiceHydrationStatus !== "hydrated") return;
    if (hasAutoHydratedRef.current) return;
    if (voiceRxResult) return;
    if (!hasMeaningfulVoiceDigitization(voiceDigitization)) return;
    hasAutoHydratedRef.current = true;
    const history = Array.isArray(voiceDigitization.history) ? voiceDigitization.history : [];
    const digitization = voiceDigitization.clinicNotes && Object.keys(voiceDigitization.clinicNotes).length
      ? voiceDigitization.clinicNotes
      : voiceDigitization.digitizeData || voiceDigitization.editedData;
    const resultSections = digitization ? digitizationToSections(digitization) : [];
    const transcriptSegments = history.map((entry, index) => ({
      id: `stored-${index}`,
      body: entry.conversation || entry.transcription || entry.transcript || "",
      mode: entry.type,
      durationMs: (entry.sourceDurationInSeconds || 0) * 1000,
      createdAt: entry.createdAt || new Date().toISOString(),
      moduleName: entry.moduleName || "",
      isDoctorAgent: Boolean(entry.isDoctorAgent),
    }));
    const transcript = transcriptSegments.map((segment) => clinicalTranscriptToText(segment.body)).filter(Boolean).join("\n\n");
    const structuredStub = {
      sections: resultSections.map((s) => ({
        sectionId: s.id,
        title: s.title,
        tpIconName: s.tpIconName,
        items: s.items.map(toStructuredVoiceItem),
      })),
      copyAllPayload: digitization ? { digitization } : undefined,
    };
    const hydratedSoap = voiceDigitization?.soap || null;
    const hydratedSoapHtml = voiceDigitization?.soapHtml || (hydratedSoap ? soapToHtml(hydratedSoap) : "");
    const hydratedSoapStatus = hydratedSoap || hydratedSoapHtml ? "fulfilled" : undefined;
    setVoiceRxResult({
      transcript,
      transcriptSegments,
      sections: resultSections,
      digitization,
      soap: hydratedSoap,
      soapHtml: hydratedSoapHtml,
      soapStatus: hydratedSoapStatus,
      soapError: null,
      durationMs: transcriptSegments.reduce((total, item) => total + (item.durationMs || 0), 0),
      structured: structuredStub,
      modeLabel: "Conversation Mode",
      pendingSidebarBatch: undefined,
    });
    // Inject a card message so the front face shows the CTA when Back is tapped
    const hydratedCardMsg = {
      id: uid(),
      role: "assistant",
      text: "Your clinical notes are ready — view your clinical notes to review, fine-tune, and copy them to the RxPad.",
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "voice_structured_rx", data: structuredStub },
      feedbackGiven: null,
    };
    setMessagesByPatient((prev) => {
      const existing = prev[selectedPatientId] || [];
      const alreadyHasCard = existing.some((m) => m.rxOutput?.kind === "voice_structured_rx");
      if (alreadyHasCard) return prev;
      return { ...prev, [selectedPatientId]: [...existing, hydratedCardMsg] };
    });
    setVoiceRxResultMinimized(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceHydrationStatus]);

  // ── Listen for VoiceRx expand events from chat cards ──
  // The Conversation Mode card on the chat fires "open-voicerx" when
  // the doctor taps its expand icon. If we already have a cached
  // result we just unminimise it (preserves transcript / tabs / scroll
  // position). Otherwise — defensive path for cards seeded from
  // elsewhere — we synthesise a minimal result so the panel can flip.
  useEffect(() => {
    const handleOpen = (e) => {
      setVoiceRxResultMinimized(false);
      setVoiceRxResult((prev) => {
        if (prev) return prev;
        const customEvent = e;
        const data = customEvent.detail?.data;
        if (!data) return prev;
        return {
          transcript: "",
          sections: data.sections,
          durationMs: 0,
          structured: data,
          modeLabel: data.modeLabel || "Conversation Mode"
        };
      });
      setVoiceRxRecording(false);
    };
    window.addEventListener("open-voicerx", handleOpen);
    return () => window.removeEventListener("open-voicerx", handleOpen);
  }, []);

  // ── Real live transcription via Web Speech API (free, browser-native) ──
  const {
    transcript: liveFinal,
    interim: liveInterim,
    isSupported: liveSupported,
    reset: resetLiveTranscript,
    error: liveError
  } = useLiveTranscript({ enabled: !!voiceRxMode && voiceRxRecording, paused: voiceRxPaused });

  /** What the active agent actually renders — prefers real speech, falls back to the scripted
   *  demo when the browser can't transcribe or the service errors (e.g. network unreachable). */
  const voiceRxLiveTranscript = useMemo(() => {
    if (liveSupported && !liveError) {
      return [liveFinal, liveInterim].filter(Boolean).join(liveFinal && liveInterim ? " " : "");
    }
    // Fall back to scripted when speech API is unsupported or erroring
    return voiceRxScriptedTranscript;
  }, [liveSupported, liveError, liveFinal, liveInterim, voiceRxScriptedTranscript]);

  // ── Integration ──
  const { requestCopyToRxPad, lastSignal, publishSignal, 
    // setPatientAllergies,
     setAiFillInProgress, pushHistoricalUpdates, activeVoiceModule, headerDictation, runCopyWithAura, guardVoiceRxUsage } = useRxPadSync();
  const headerDictationBusy = headerDictation?.status === "recording" || headerDictation?.status === "transcribing";
  const voiceSessionCleanupSeenRef = useRef(voiceDigitization?.sessionId || "");
  useLayoutEffect(() => {
    const nextSessionId = voiceDigitization?.sessionId || "";
    if (voiceSessionCleanupSeenRef.current === nextSessionId) return;
    const previousSessionId = voiceSessionCleanupSeenRef.current;
    voiceSessionCleanupSeenRef.current = nextSessionId;
    if (previousSessionId) {
      clearLatestSoapDraft(previousSessionId);
    }
    if (nextSessionId) {
      clearLatestSoapDraft(nextSessionId);
    }
    if (voiceRxTimeoutRef.current) {
      clearTimeout(voiceRxTimeoutRef.current);
      voiceRxTimeoutRef.current = null;
    }
    abortActiveVoiceRxRequest(VOICE_V2_ABORT_REASONS.USER_DISCARDED_VOICE_RX);
    voiceRxSessionRef.current = null;
    pendingInitialVoiceUserMsgIdRef.current = null;
    priorVoiceResultRef.current = null;
    hasAutoHydratedRef.current = false;
    soapRetryInFlightRef.current = false;
    setVoiceRxResult(null);
    setVoiceRxResultMinimized(false);
    setVoiceRxRecording(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript("");
    setVoiceRxProcessingTranscript("");
    setVoiceRxAwaitingResponse(false);
    setVoiceRxPaused(false);
    voiceRxPausedRef.current = false;
    resetLiveTranscript();
    onVoiceCaptureModeChange?.(null);
    setAiFillInProgress(false);
    if (resetThreadOnVoiceSession) {
      setMessagesByPatient((prev) => {
        const existingMessages = prev[selectedPatientId] || [];
        if (!existingMessages.length) return prev;
        return { ...prev, [selectedPatientId]: [] };
      });
    }
  }, [
    resetThreadOnVoiceSession,
    abortActiveVoiceRxRequest,
    onVoiceCaptureModeChange,
    resetLiveTranscript,
    selectedPatientId,
    setAiFillInProgress,
    setMessagesByPatient,
    voiceDigitization?.sessionId,
  ]);
  const voiceCopyTrackingContext = useMemo(() => ({
    doctorId: doctorId || profile?.doctor_unique_id || "",
    doctorName: profile?.um_name || "",
    patientId: patientData?.patient_unique_id || selectedPatientId || patientId || "",
    patientName: patientData?.pm_fullname || patientData?.pm_first_name || "",
    sessionId: voiceDigitization?.sessionId || "",
    voiceRxVersion: "2.0",
    sourceSurface: "doctor-agent",
    voiceInputLocation: "Clinical Notes",
  }), [
    doctorId,
    patientData?.patient_unique_id,
    patientData?.pm_first_name,
    patientData?.pm_fullname,
    patientId,
    profile?.doctor_unique_id,
    profile?.um_name,
    selectedPatientId,
    voiceDigitization?.sessionId,
  ]);

  // Scripted fallback — only when the browser can't do real live transcription.
  useEffect(() => {
    if (!voiceRxMode || !voiceRxRecording) return;
    if (liveSupported) return;
    voiceRxStreamIdx.current = 0;
    voiceRxPausedRef.current = false;
    setVoiceRxScriptedTranscript("");
    // Pick scripted chunks per mode: ambient = Doctor/Patient turns,
    // dictation = single-voice clinical narration.
    const chunks =
    voiceRxDialogChoice === "ambient_consultation" ?
    VOICE_RX_AMBIENT_CHUNKS :
    VOICE_RX_DICTATION_CHUNKS;
    const iv = window.setInterval(() => {
      if (voiceRxPausedRef.current) return;
      const i = voiceRxStreamIdx.current;
      if (i >= chunks.length) return;
      setVoiceRxScriptedTranscript((t) => t + chunks[i]);
      voiceRxStreamIdx.current = i + 1;
    }, 700);
    return () => window.clearInterval(iv);
  }, [voiceRxMode, voiceRxRecording, liveSupported, voiceRxDialogChoice]);

  // Fresh slate each new recording — clears any text left from a prior session.
  useEffect(() => {
    if (!voiceRxRecording) return;
    setVoiceRxScriptedTranscript("");
    resetLiveTranscript();
    voiceRxSessionRef.current = createVoiceRxSessionContext({
      ...buildVoiceRxContextParams({
        patientId: patientId || "1111",
        doctorId: doctorId || "3333",
        sessionId: voiceDigitization?.sessionId,
        patientData,
        profile,
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceRxRecording]);

  const patientSwitchCleanupSeenRef = useRef(selectedPatientId);
  useEffect(() => {
    if (patientSwitchCleanupSeenRef.current === selectedPatientId) return;
    patientSwitchCleanupSeenRef.current = selectedPatientId;
    if (voiceRxTimeoutRef.current) {
      clearTimeout(voiceRxTimeoutRef.current);
      voiceRxTimeoutRef.current = null;
    }
    abortActiveVoiceRxRequest(VOICE_V2_ABORT_REASONS.USER_DISCARDED_VOICE_RX);
    voiceRxSessionRef.current = null;
    pendingInitialVoiceUserMsgIdRef.current = null;
    priorVoiceResultRef.current = null;
    setVoiceRxRecording(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript("");
    setVoiceRxProcessingTranscript("");
    setVoiceRxAwaitingResponse(false);
    setVoiceRxPaused(false);
    voiceRxPausedRef.current = false;
    resetLiveTranscript();
    onVoiceCaptureModeChange?.(null);
    setAiFillInProgress(false);
  }, [abortActiveVoiceRxRequest, onVoiceCaptureModeChange, resetLiveTranscript, selectedPatientId, setAiFillInProgress]);


  const [blockedVoiceToast, setBlockedVoiceToast] = useState(null);

  const trackDrAgentVoiceStart = useCallback((extra = {}) => {
    trackVoiceRx2StartEvent({
      patientData,
      profile,
      sessionId: voiceDigitization?.sessionId || "",
      mode: voiceRxDialogChoice,
      fromVoiceRecording: true,
      voicecall: voiceDigitization?.voiceCallCount || 0,
      moduleName: extra.moduleName || "Dr Agent",
      sourceSurface: "dr_agent",
      voiceInputLocation: extra.voiceInputLocation || "Dr Agent",
      isDoctorAgent: true,
      extra: {
        doctorId,
        patientId: patientData?.patient_unique_id || patientId || selectedPatientId || "",
        selectedPatientId,
        trigger_location: extra.triggerLocation || "dr_agent_voice_cta",
      },
    });
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

  const confirmVoiceRxConsult = useCallback(async() => {
    // Guard against starting a full-panel consultation while an inline
    // per-module / per-sidebar recorder is already running. Shared state
    // lives in the rxpad-sync context; the tooltip on hover uses the
    // same signal so the click + hover paths agree.
    if (activeVoiceModule || headerDictationBusy) {
      // Global page-center toast (warning tone) — was previously a
      // TPSnackbar nested inside DrAgentPanel's transform ancestor,
      // which clamped it inside the panel instead of true viewport
      // top-center.
      toast.warning(
        activeVoiceModule
          ? `VoiceRx is already active in ${activeVoiceModule}. Close that dictation first.`
          : "Voice dictation is already active. Finish that dictation first."
      );
      setVoiceRxDialogOpen(false);
      return;
    }
    const canUseVoiceRx = await guardVoiceRxUsage?.({ phase: "start", surface: "agent" });
    trackDrAgentVoiceStart({canUseVoiceRx});
    if (!canUseVoiceRx) {
      setVoiceRxDialogOpen(false);
      return;
    }
    onVoiceCaptureModeChange?.(voiceRxDialogChoice);
    setVoiceRxDialogOpen(false);
    // Starting a fresh consultation clears any previously generated
    // structured Rx — the doctor explicitly chose dictate/ambient again,
    // so we should drop them straight into the recorder, not flip back
    // into the old result tabs. They can still copy/edit on the RxPad
    // independently; this CTA is for capturing a NEW Rx.
    setVoiceRxResult(null);
    setVoiceRxResultMinimized(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript("");
    setVoiceRxProcessingTranscript("");
    pendingInitialVoiceUserMsgIdRef.current = null;
    resetLiveTranscript();
    setVoiceRxAwaitingResponse(false);
    setVoiceRxRecording(true);
    // Only clear prior voice result messages (user voice transcripts +
    // assistant voice-rx outputs). KEEP the symptom-collector intro card
    // and the assistant follow-up so that if the doctor cancels recording
    // and returns to the panel, they don't see a blank screen.
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).filter((m) => {
        if (m.role === "user" && m.voiceTranscript) return false;
        if (m.role === "assistant" && m.rxOutput?.kind === "voice_structured_rx") return false;
        return true;
      })
    }));
  }, [voiceRxDialogChoice, onVoiceCaptureModeChange, selectedPatientId, setMessagesByPatient, activeVoiceModule, headerDictationBusy, resetLiveTranscript, guardVoiceRxUsage, trackDrAgentVoiceStart]);

  // Listen for the "VoiceRx" CTA on a chat clinical-notes card —
  // fires "voicerx:begin-addon". Routes through the same beginVoiceAddOn
  // flow the canvas mic uses so multi-take dictation is consistent.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => beginVoiceAddOnRef.current?.();
    window.addEventListener("voicerx:begin-addon", handler);
    return () => window.removeEventListener("voicerx:begin-addon", handler);
  }, []);
  const beginVoiceAddOnRef = useRef(null);

  // Stash the current voiceRxResult and flip into recorder mode WITHOUT
  // wiping the chat history of prior voice cards. The prior result's
  // transcript will be merged onto the next submit so the transcript
  // pane stays cumulative across multiple re-records.
  const beginVoiceAddOn = useCallback(async () => {
    if (activeVoiceModule || headerDictationBusy) {
      toast.warning(
        activeVoiceModule
          ? `VoiceRx is already active in ${activeVoiceModule}. Close that dictation first.`
          : "Voice dictation is already active. Finish that dictation first."
      );
      return;
    }
    const canUseVoiceRx = await guardVoiceRxUsage?.({ phase: "start", surface: "agent-addon" });
    trackDrAgentVoiceStart({
      moduleName: "Clinical Notes",
      voiceInputLocation: "Clinical Notes",
      triggerLocation: "dr_agent_add_details_voice_cta",
      canUseVoiceRx,
    });
    if (!canUseVoiceRx) return;
    priorVoiceResultRef.current = voiceRxResult;
    setVoiceRxResult(null);
    setVoiceRxResultMinimized(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript("");
    setVoiceRxProcessingTranscript("");
    resetLiveTranscript();
    setVoiceRxAwaitingResponse(false);
    setVoiceRxRecording(true);
    onVoiceCaptureModeChange?.(voiceRxDialogChoice);
  }, [activeVoiceModule, headerDictationBusy, voiceRxResult, voiceRxDialogChoice, onVoiceCaptureModeChange, resetLiveTranscript, guardVoiceRxUsage, trackDrAgentVoiceStart]);
  beginVoiceAddOnRef.current = beginVoiceAddOn;

  // Inline quick-edit submit (called by the canvas's bottom-overlay
  // recorder). Keeps the result canvas visible, but runs the same real
  // transcribe + digitise pipeline as the full VoiceRx recorder.
  const submitQuickEdit = useCallback(async (meta = {}, progress = {}) => {
    if (voiceSubmitInFlightRef.current) return;
    if (!voiceRxResult) return;
    const canUseVoiceRx = await guardVoiceRxUsage?.({ phase: "submit", surface: "agent-quick-edit" });
    if (!canUseVoiceRx) return;
    const audioBlob = meta?.audioBlob || null;
    if (!audioBlob) {
      toast.error("No audio recording was captured.");
      throw new Error("No audio recording was captured.");
    }
    voiceSubmitInFlightRef.current = true;
    dispatch(beginVoiceAttempt());
    const voicecall = (voiceDigitization?.voiceCallCount || 0) + 1;
    const submitClickedAtMs = meta?.submitClickedAtMs || Date.now();
    const submitClickedAt = meta?.submitClickedAt || new Date(submitClickedAtMs).toISOString();
    const submitId = `voice-rx-2-agent-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const requestId = submitId;
    const clinicalStartedAtMs = Date.now();
    let transcriptCompletedAtMs = null;
    let digitizeCompletedAtMs = null;
    let voiceRxLogTranscript = "";
    let voiceRxLogDigitizeData = null;
    let voiceRxTranscriptRequestId = "";
    let voiceRxLogPreviousContext = null;

    const context = voiceRxSessionRef.current || createVoiceRxSessionContext({
      ...buildVoiceRxContextParams({
        patientId: patientId || "1111",
        doctorId: doctorId || "3333",
        sessionId: voiceDigitization?.sessionId,
        patientData,
        profile,
      }),
    });
    voiceRxSessionRef.current = context;

    if (voiceRxAbortRef.current) {
      abortActiveVoiceRxRequest();
    }
    const abortController = new AbortController();
    voiceRxAbortRef.current = abortController;

    const createdAt = new Date().toISOString();
    const optimisticTranscript = meta?.transcript || "Processing your voice edit...";
    const userMsg = {
      id: uid(),
      role: "user",
      text: optimisticTranscript,
      voiceTranscript: optimisticTranscript,
      voiceMode: voiceRxDialogChoice ?? undefined,
      voiceDurationMs: meta?.durationMs,
      createdAt,
      feedbackGiven: null,
      voiceEntryAnimation: true
    };
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg]
    }));

    try {
      progress?.onPhase?.("creating_transcript", { transcript: "" });
      const transcriptResponse = await transcribeAudio({
        audioBlob,
        context,
        signal: abortController.signal,
        includeMetadata: true
      });
      voiceRxTranscriptRequestId = transcriptResponse?.requestId || "";
      const apiTranscript = transcriptResponse?.transcript;
      transcriptCompletedAtMs = Date.now();
      const finalTranscript = clinicalHasTranscriptContent(apiTranscript) ? apiTranscript : meta?.transcript || "";
      voiceRxLogTranscript = finalTranscript;
      const finalTranscriptText = clinicalTranscriptToText(finalTranscript);
      progress?.onPhase?.("transcript_ready", { transcript: finalTranscript });

      progress?.onPhase?.("structuring_notes", { transcript: finalTranscript });
      const digitisePrev = voiceRxResult?.digitization || voiceDigitization?.clinicNotes || voiceDigitization?.digitizeData || null;
      const soapPreviousContext = htmlToSoapSections(voiceDigitization?.soapHtml || voiceRxResult?.soapHtml) || voiceRxResult?.soap || voiceDigitization?.soap || null;
      voiceRxLogPreviousContext = {
        digitiseData: digitisePrev,
        soap: soapPreviousContext,
      };
      const [digitizeResult, soapResult] = await Promise.all([
        digitiseClinicalData({
          context,
          previousContext: digitisePrev,
          signal: abortController.signal
        }),
        generateSoapNote({
          context,
          previousContext: soapPreviousContext,
          signal: abortController.signal
        })
      ]);
      digitizeCompletedAtMs = Date.now();
      if (digitizeResult?.status === "rejected") {
        const error = new Error(digitizeResult.error || "Digitisation failed.");
        error.phase = "digitise-data";
        throw error;
      }

      const digitization = digitizeResult?.data ?? null;
      voiceRxLogDigitizeData = digitization;
      const soap = soapResult?.status === "fulfilled" ? soapResult.data : null;
      const soapError = soapResult?.status === "rejected" ? soapResult.error : null;
      const soapHtml = soap ? soapToHtml(soap) : "";
      if (!digitization) {
        const error = new Error("Digitisation API returned no response.");
        error.phase = "digitise-data";
        throw error;
      }
      const resultSections = digitizationToSections(digitization);
      const structuredStub = {
        sections: resultSections.map((s) => ({
          sectionId: s.id,
          title: s.title,
          tpIconName: s.tpIconName,
          items: s.items.map(toStructuredVoiceItem)
        })),
        copyAllPayload: { digitization }
      };

      setMessagesByPatient((prev) => {
        const list = prev[selectedPatientId] || [];
        const updated = list.map((m) => m.id === userMsg.id ? { ...m, text: finalTranscriptText, voiceTranscript: finalTranscriptText } : m);
        return { ...prev, [selectedPatientId]: updated };
      });

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [
          ...(prev[selectedPatientId] || []),
          {
            id: uid(),
            role: "assistant",
            text: "Your clinical notes are updated — view to fine-tune and copy to RxPad.",
            createdAt: new Date().toISOString(),
            rxOutput: { kind: "voice_structured_rx", data: structuredStub },
            feedbackGiven: null
          }
        ]
      }));

      setVoiceRxResult((prev) => {
        if (!prev) return prev;
        const newSegment = {
          id: uid(),
          body: finalTranscript,
          mode: voiceRxDialogChoice ?? "ambient_consultation",
          durationMs: meta?.durationMs ?? 0,
          createdAt: new Date().toISOString(),
          moduleName: "Doctor Agent",
          isDoctorAgent: true,
        };
        const transcriptSegments = prev.transcriptSegments
          ? [...prev.transcriptSegments, newSegment]
          : [{
              id: uid(),
              body: prev.transcript,
              mode: "ambient_consultation",
              durationMs: prev.durationMs ?? 0,
              createdAt: new Date().toISOString(),
              moduleName: "Doctor Agent",
              isDoctorAgent: true,
            }, newSegment];
        return {
          ...prev,
          transcript: transcriptSegments.map((s) => clinicalTranscriptToText(s.body)).join("\n\n"),
          transcriptSegments,
          sections: resultSections,
          digitization,
          soap,
          soapHtml,
          soapStatus: soap ? "fulfilled" : "rejected",
          soapError,
          durationMs: (prev.durationMs ?? 0) + (meta?.durationMs ?? 0),
          structured: structuredStub,
          pendingSidebarBatch: undefined
        };
      });
      dispatch(updateVoiceDigitizeData(digitization));
      dispatch(updateVoiceClinicNotes(digitization));
      if (soap) dispatch(updateVoiceSoap(soap));
      if (soapHtml) dispatch(updateVoiceSoapHtml(soapHtml));
      const clinicalCompletedAtMs = Date.now();
      uploadAndLogVoiceRx2({
        audioBlob,
        patientData,
        profile,
        sessionId: context.sessionId || voiceDigitization?.sessionId,
        submitId,
        requestId: voiceRxTranscriptRequestId || "",
        submitClickedAt,
        submitClickedAtMs,
        durationMs: meta?.durationMs ?? 0,
        clinicalStatus: "completed",
        mode: voiceRxDialogChoice ?? "ambient_consultation",
        voicecall,
        sourceSurface: "doctor-agent",
        isDoctorAgent: true,
        processingApiName: VOICE_RX_PROCESSING_API.TRANSCRIBE_AUDIO,
        micBeingUsed: meta?.micBeingUsed || "",
        voiceLogCreated: voiceDigitization?.voiceLogCreated,
        markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
        clinicalCompletedAtMs,
        transcriptCompletedAtMs,
        digitizeCompletedAtMs,
        transcript: voiceRxLogTranscript,
        digitizeData: voiceRxLogDigitizeData,
        previousContext: voiceRxLogPreviousContext,
        speechAnalysis: meta?.speechAnalysis,
	      }).then(({ source }) => {
	        guardVoiceRxUsage?.({ phase: "mark-used", surface: "agent-quick-edit" });
	        dispatch(addVoiceHistoryEntry(buildVoiceHistoryEntry({
          type: voiceRxResult?.digitization ? "AUDIO_WITH_CONTEXT" : "AUDIO_NO_CONTEXT",
          source,
          durationMs: meta?.durationMs ?? 0,
          timeRequiredInMs: clinicalCompletedAtMs - clinicalStartedAtMs,
          conversation: finalTranscript,
          digitize: [],
          isDoctorAgent: true,
          moduleName: "Doctor Agent",
        })));
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        setMessagesByPatient((prev) => {
          const list = prev[selectedPatientId] || [];
          return { ...prev, [selectedPatientId]: list.filter((m) => m.id !== userMsg.id) };
        });
        return;
      }
      console.error("[voice-rx] quick-edit pipeline failed", error);
      const failedPhase = error?.phase === "digitise-data" ? "digitise-data" : "transcribe-audio";
      uploadAndLogVoiceRx2({
        audioBlob,
        patientData,
        profile,
        sessionId: context.sessionId || voiceDigitization?.sessionId,
        submitId,
        requestId: voiceRxTranscriptRequestId || error?.requestId || "",
        submitClickedAt,
        submitClickedAtMs,
        durationMs: meta?.durationMs ?? 0,
        clinicalStatus: "failed",
        failedPhase,
        errorMessage: error?.message || "Voice edit failed.",
        retryAttempts: failedPhase === "transcribe-audio" ? 3 : 0,
        mode: voiceRxDialogChoice ?? "ambient_consultation",
        voicecall,
        sourceSurface: "doctor-agent",
        isDoctorAgent: true,
        processingApiName: VOICE_RX_PROCESSING_API.TRANSCRIBE_AUDIO,
        micBeingUsed: meta?.micBeingUsed || "",
        voiceLogCreated: voiceDigitization?.voiceLogCreated,
        markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
        clinicalCompletedAtMs: Date.now(),
        transcriptCompletedAtMs,
        digitizeCompletedAtMs,
        transcript: voiceRxLogTranscript,
        digitizeData: voiceRxLogDigitizeData,
        previousContext: voiceRxLogPreviousContext,
        speechAnalysis: meta?.speechAnalysis,
      });
      toast.error(error?.message || "Voice edit failed.");
      setMessagesByPatient((prev) => {
        const list = prev[selectedPatientId] || [];
        return { ...prev, [selectedPatientId]: list.filter((m) => m.id !== userMsg.id) };
      });
      throw error;
    } finally {
      if (voiceRxAbortRef.current === abortController) voiceRxAbortRef.current = null;
      voiceSubmitInFlightRef.current = false;
    }
  }, [abortActiveVoiceRxRequest, voiceRxResult, voiceRxDialogChoice, selectedPatientId, setMessagesByPatient, patientId, doctorId, voiceDigitization?.sessionId, voiceDigitization?.voiceCallCount, voiceDigitization?.voiceLogCreated, dispatch, patientData, profile, guardVoiceRxUsage]);

  const cancelVoiceRxRecording = useCallback(() => {
    if (voiceRxTimeoutRef.current) {
      clearTimeout(voiceRxTimeoutRef.current);
      voiceRxTimeoutRef.current = null;
    }
    abortActiveVoiceRxRequest(VOICE_V2_ABORT_REASONS.USER_DISCARDED_VOICE_RX);
    setVoiceRxRecording(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript("");
    setVoiceRxProcessingTranscript("");
    if (pendingInitialVoiceUserMsgIdRef.current) {
      const pendingUserMsgId = pendingInitialVoiceUserMsgIdRef.current;
      pendingInitialVoiceUserMsgIdRef.current = null;
      setMessagesByPatient((prev) => {
        const list = prev[selectedPatientId] || [];
        return { ...prev, [selectedPatientId]: list.filter((m) => m.id !== pendingUserMsgId) };
      });
    }
    resetLiveTranscript();
    setVoiceRxAwaitingResponse(false);
    setAiFillInProgress(false);
    onVoiceCaptureModeChange?.(null);
    // If the doctor canceled an add-on dictation, restore the prior
    // result so the canvas re-appears with the original transcript +
    // clinical notes intact.
    if (priorVoiceResultRef.current) {
      setVoiceRxResult(priorVoiceResultRef.current);
      priorVoiceResultRef.current = null;
    }
  }, [abortActiveVoiceRxRequest, onVoiceCaptureModeChange, selectedPatientId, setAiFillInProgress, resetLiveTranscript]);

  const submitVoiceRxRecording = useCallback(async(meta) => {
    if (voiceSubmitInFlightRef.current) return;
    const liveText = voiceRxLiveTranscript.trim();
    const audioBlob = meta?.audioBlob || null;

    if (!audioBlob && !liveText) {
      setVoiceRxRecording(false);
      onVoiceCaptureModeChange?.(null);
      return;
    }
    const canUseVoiceRx = await guardVoiceRxUsage?.({ phase: "submit", surface: "agent" });
    if (!canUseVoiceRx) return;
    voiceSubmitInFlightRef.current = true;
    dispatch(beginVoiceAttempt());
    const voicecall = (voiceDigitization?.voiceCallCount || 0) + 1;
    const submitClickedAtMs = meta?.submitClickedAtMs || Date.now();
    const submitClickedAt = meta?.submitClickedAt || new Date(submitClickedAtMs).toISOString();
    const submitId = `voice-rx-2-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const requestId = submitId;

    // Echo a placeholder transcript into chat immediately (will be replaced
    // by the API-returned text once the assistant card lands).
    const echoTranscript = liveText || "Processing your voice consultation…";
    const userMsg = {
      id: uid(),
      role: "user",
      text: echoTranscript,
      voiceTranscript: echoTranscript,
      voiceMode: voiceRxDialogChoice ?? undefined,
      voiceDurationMs: meta?.durationMs,
      createdAt: new Date().toISOString(),
      feedbackGiven: null,
      voiceEntryAnimation: true
    };
    const existingMessages = messagesByPatient[selectedPatientId] || [];
    const hasPriorVoiceSubmission = existingMessages.some((m) => m.role === "user" && !!m.voiceTranscript);
    const history = Array.isArray(voiceDigitization?.history) ? voiceDigitization.history : [];
    const hasDoctorAgentHistory = history.some(
      (entry) => entry?.isDoctorAgent === true || entry?.sourceSurface === "doctor-agent"
    );
    const hasRestorableVoiceAtSubmit = hasDoctorAgentHistory || hasObjectData(voiceDigitization?.clinicNotes) || hasObjectData(voiceDigitization?.digitizeData);
    const isInitialVoiceSubmit = voiceRxMode && !hasPriorVoiceSubmission && !hasRestorableVoiceAtSubmit && !priorVoiceResultRef.current;
    pendingInitialVoiceUserMsgIdRef.current = isInitialVoiceSubmit ? userMsg.id : null;
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg]
    }));

    setVoiceRxRecording(false);
    setVoiceRxScriptedTranscript("");
    setVoiceRxSubmittedTranscript(liveText);
    setVoiceRxProcessingTranscript("");
    resetLiveTranscript();
    setVoiceRxAwaitingResponse(true);
    onVoiceCaptureModeChange?.(null);

    const context = voiceRxSessionRef.current || createVoiceRxSessionContext({
      ...buildVoiceRxContextParams({
        patientId: patientId || "1111",
        doctorId: doctorId || "3333",
        sessionId: voiceDigitization?.sessionId,
        patientData,
        profile,
      }),
    });
    voiceRxSessionRef.current = context;

    if (voiceRxAbortRef.current) {
      abortActiveVoiceRxRequest();
    }
    const abortController = new AbortController();
    voiceRxAbortRef.current = abortController;

    (async () => {
      const submittedAt = Date.now();
      const clinicalStartedAtMs = Date.now();
      let transcriptCompletedAtMs = null;
      let digitizeCompletedAtMs = null;
      let voiceRxLogTranscript = "";
      let voiceRxLogDigitizeData = null;
      let voiceRxTranscriptRequestId = "";
      let voiceRxLogPreviousContext = null;
      let digitisePreviousContextForHistory = null;
      const waitForButtonLoaderWindow = () => {
        const remaining = VOICE_RX_SUBMIT_BUTTON_MIN_MS - (Date.now() - submittedAt);
        if (remaining <= 0) return Promise.resolve();
        return new Promise((resolve) => window.setTimeout(resolve, remaining));
      };

      try {
        if (!audioBlob) {
          throw new Error("No audio recording was captured.");
        }
        let failedPhase = "";
        let apiTranscript;
        try {
          const transcriptResponse = await transcribeAudio({
            audioBlob,
            context,
            signal: abortController.signal,
            includeMetadata: true
          });
          voiceRxTranscriptRequestId = transcriptResponse?.requestId || "";
          apiTranscript = transcriptResponse?.transcript;
          transcriptCompletedAtMs = Date.now();
        } catch (error) {
          failedPhase = "transcribe-audio";
          if (error && typeof error === "object") error.phase = failedPhase;
          throw error;
        }

        const finalTranscript = clinicalHasTranscriptContent(apiTranscript) ? apiTranscript : liveText || "";
        voiceRxLogTranscript = finalTranscript;
        const finalTranscriptText = clinicalTranscriptToText(finalTranscript);
        setVoiceRxProcessingTranscript(finalTranscript);

        await waitForButtonLoaderWindow();

        const soapPreviousContext = htmlToSoapSections(voiceDigitization?.soapHtml || priorVoiceResultRef.current?.soapHtml) || priorVoiceResultRef.current?.soap || voiceDigitization?.soap || null;
        const soapPromise = generateSoapNote({
          context,
          previousContext: soapPreviousContext,
          signal: abortController.signal
        });
        let digitizeResult;
        try {
          const existingVoiceDigitisePrev = firstMeaningfulObject(
            priorVoiceResultRef.current?.digitization,
            voiceDigitization?.clinicNotes,
            voiceDigitization?.digitizeData
          );
          const symptomCollectorDigitisePrev = existingVoiceDigitisePrev
            ? null
            : buildSymptomCollectorPreviousContext(summarySymptomCollectorData, patientData);
          const mainDigitisePrev = existingVoiceDigitisePrev || symptomCollectorDigitisePrev;
          digitisePreviousContextForHistory = mainDigitisePrev;
          voiceRxLogPreviousContext = {
            digitiseData: mainDigitisePrev,
            soap: soapPreviousContext,
          };
          digitizeResult = await digitiseClinicalData({
            context,
            previousContext: mainDigitisePrev,
            signal: abortController.signal
          });
          digitizeCompletedAtMs = Date.now();
        } catch (error) {
          failedPhase = "digitise-data";
          if (error && typeof error === "object") error.phase = failedPhase;
          throw error;
        }
        if (digitizeResult?.status === "rejected") {
          const err = new Error(digitizeResult.error || "Digitisation failed.");
          err.phase = "digitising";
          failedPhase = "digitise-data";
          throw err;
        }
        const digitization = digitizeResult?.data ?? null;
        voiceRxLogDigitizeData = digitization;
        if (!digitization) {
          const err = new Error("Digitisation API returned no response.");
          failedPhase = "digitise-data";
          err.phase = failedPhase;
          throw err;
        }
        const resultSections = digitizationToSections(digitization);

        // Update the user echo bubble with the real transcript.
        setMessagesByPatient((prev) => {
          const list = prev[selectedPatientId] || [];
          const updated = list.map((m) => m.id === userMsg.id ? { ...m, text: finalTranscriptText, voiceTranscript: finalTranscriptText } : m);
          return { ...prev, [selectedPatientId]: updated };
        });

        const structuredStub = {
          sections: resultSections.map((s) => ({
            sectionId: s.id,
            title: s.title,
            tpIconName: s.tpIconName,
            items: s.items.map(toStructuredVoiceItem),
          })),
          copyAllPayload: { digitization }
        };

        const cardMsg = {
          id: uid(),
          role: "assistant",
          text: "Your clinical notes are ready — view your clinical notes to review, fine-tune, and copy them to the RxPad.",
          createdAt: new Date().toISOString(),
          rxOutput: { kind: "voice_structured_rx", data: structuredStub },
          feedbackGiven: null
        };
        setMessagesByPatient((prev) => {
          const existing = prev[selectedPatientId] || [];
          return { ...prev, [selectedPatientId]: [...existing, cardMsg] };
        });

        setVoiceRxHandoffExiting(false);
        setVoiceRxResultMinimized(false);

        const prior = priorVoiceResultRef.current;
        const newSegment = {
          id: uid(),
          body: finalTranscript,
          mode: voiceRxDialogChoice ?? "ambient_consultation",
          durationMs: meta?.durationMs ?? 0,
          createdAt: new Date().toISOString(),
          moduleName: "Doctor Agent",
          isDoctorAgent: true,
        };
        const transcriptSegments = prior?.transcriptSegments
          ? [...prior.transcriptSegments, newSegment]
          : [newSegment];
        const mergedTranscriptText = transcriptSegments.map((s) => clinicalTranscriptToText(s.body)).join("\n\n");
        priorVoiceResultRef.current = null;

        setVoiceRxResult({
          transcript: mergedTranscriptText,
          transcriptSegments,
          sections: resultSections,
          digitization,
          soap: null,
          soapHtml: "",
          soapStatus: "pending",
          soapError: null,
          durationMs: (meta?.durationMs ?? 0) + (prior?.durationMs ?? 0),
          structured: structuredStub,
          modeLabel: voiceRxDialogChoice === "dictation_consultation" ? "Dictation Mode" : "Conversation Mode",
          pendingSidebarBatch: undefined
        });
        soapPromise.then((soapResult) => {
          if (soapResult?.status === "fulfilled") {
            const soapHtml = soapToHtml(soapResult.data);
            setVoiceRxResult((prev) => prev ? { ...prev, soap: soapResult.data, soapHtml, soapStatus: "fulfilled", soapError: null } : prev);
            if (soapResult.data) dispatch(updateVoiceSoap(soapResult.data));
            if (soapHtml) dispatch(updateVoiceSoapHtml(soapHtml));
          } else {
            setVoiceRxResult((prev) => prev ? { ...prev, soap: null, soapHtml: "", soapStatus: "rejected", soapError: soapResult?.error || "SOAP generation failed." } : prev);
          }
        }).catch((err) => {
          setVoiceRxResult((prev) => prev ? { ...prev, soap: null, soapHtml: "", soapStatus: "rejected", soapError: err?.message || "SOAP generation failed." } : prev);
        });
        dispatch(updateVoiceDigitizeData(digitization));
        dispatch(updateVoiceClinicNotes(digitization));
        const clinicalCompletedAtMs = Date.now();
        uploadAndLogVoiceRx2({
          audioBlob,
          patientData,
          profile,
          sessionId: context.sessionId || voiceDigitization?.sessionId,
          submitId,
          requestId: voiceRxTranscriptRequestId || "",
          submitClickedAt,
          submitClickedAtMs,
          durationMs: meta?.durationMs ?? 0,
          clinicalStatus: "completed",
          mode: voiceRxDialogChoice ?? "ambient_consultation",
          voicecall,
          sourceSurface: "doctor-agent",
          isDoctorAgent: true,
          processingApiName: VOICE_RX_PROCESSING_API.TRANSCRIBE_AUDIO,
          micBeingUsed: meta?.micBeingUsed || "",
          voiceLogCreated: voiceDigitization?.voiceLogCreated,
          markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
          clinicalCompletedAtMs,
          transcriptCompletedAtMs,
          digitizeCompletedAtMs,
          transcript: voiceRxLogTranscript,
          digitizeData: voiceRxLogDigitizeData,
          previousContext: voiceRxLogPreviousContext,
          speechAnalysis: meta?.speechAnalysis,
        }).then(({ source }) => {
          guardVoiceRxUsage?.({ phase: "mark-used", surface: "agent" });
          dispatch(addVoiceHistoryEntry(buildVoiceHistoryEntry({
            type: digitisePreviousContextForHistory ? "AUDIO_WITH_CONTEXT" : "AUDIO_NO_CONTEXT",
            source,
            durationMs: meta?.durationMs ?? 0,
            timeRequiredInMs: clinicalCompletedAtMs - clinicalStartedAtMs,
            conversation: finalTranscript,
            digitize: [],
            isDoctorAgent: true,
            moduleName: "Doctor Agent",
          })));
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          setMessagesByPatient((prev) => {
            const list = prev[selectedPatientId] || [];
            return { ...prev, [selectedPatientId]: list.filter((m) => m.id !== userMsg.id) };
          });
          if (pendingInitialVoiceUserMsgIdRef.current === userMsg.id) {
            pendingInitialVoiceUserMsgIdRef.current = null;
          }
          return;
        }
        const failedPhase = error?.phase === "digitising" ? "digitise-data" : (error?.phase || "transcribe-audio");
        console.error("[voice-rx] pipeline failed", error);
        uploadAndLogVoiceRx2({
          audioBlob,
          patientData,
          profile,
          sessionId: context.sessionId || voiceDigitization?.sessionId,
          submitId,
          requestId: voiceRxTranscriptRequestId || error?.requestId || "",
          submitClickedAt,
          submitClickedAtMs,
          durationMs: meta?.durationMs ?? 0,
          clinicalStatus: "failed",
          failedPhase,
          errorMessage: error?.message || "Voice consultation failed.",
          retryAttempts: failedPhase === "transcribe-audio" ? 3 : 0,
          mode: voiceRxDialogChoice ?? "ambient_consultation",
          voicecall,
          sourceSurface: "doctor-agent",
          isDoctorAgent: true,
          processingApiName: VOICE_RX_PROCESSING_API.TRANSCRIBE_AUDIO,
          micBeingUsed: meta?.micBeingUsed || "",
          voiceLogCreated: voiceDigitization?.voiceLogCreated,
          markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
          clinicalCompletedAtMs: Date.now(),
          transcriptCompletedAtMs,
          digitizeCompletedAtMs,
          transcript: voiceRxLogTranscript,
          digitizeData: voiceRxLogDigitizeData,
          previousContext: voiceRxLogPreviousContext,
          speechAnalysis: meta?.speechAnalysis,
        });
        toast.error(error?.message || "Voice consultation failed.");
        // Remove the optimistic user echo so the chat doesn't dangle.
        setMessagesByPatient((prev) => {
          const list = prev[selectedPatientId] || [];
          return { ...prev, [selectedPatientId]: list.filter((m) => m.id !== userMsg.id) };
        });
        if (pendingInitialVoiceUserMsgIdRef.current === userMsg.id) {
          pendingInitialVoiceUserMsgIdRef.current = null;
        }
      } finally {
        if (voiceRxAbortRef.current === abortController) voiceRxAbortRef.current = null;
        voiceSubmitInFlightRef.current = false;
        setVoiceRxAwaitingResponse(false);
        setVoiceRxSubmittedTranscript("");
        setVoiceRxProcessingTranscript("");
      }
    })();
  }, [
    voiceRxLiveTranscript,
    voiceRxDialogChoice,
    selectedPatientId,
    setMessagesByPatient,
    onVoiceCaptureModeChange,
    resetLiveTranscript,
    voiceRxMode,
    messagesByPatient,
    voiceDigitization,
    patientId,
    doctorId,
    dispatch,
    patientData,
    profile,
    summarySymptomCollectorData,
    voiceDigitization?.sessionId,
    voiceDigitization?.voiceCallCount,
    voiceDigitization?.voiceLogCreated,
    guardVoiceRxUsage,
    abortActiveVoiceRxRequest
  ]);

  // Cleanup any pending simulated response on unmount
  useEffect(() => {
    return () => {
      if (voiceRxTimeoutRef.current) {
        clearTimeout(voiceRxTimeoutRef.current);
        voiceRxTimeoutRef.current = null;
      }
      if (voiceRxAbortRef.current) {
        abortActiveVoiceRxRequest();
      }
      setAiFillInProgress(false);
    };
  }, [abortActiveVoiceRxRequest, setAiFillInProgress]);

  // Custom events for external sticky fab control
  useEffect(() => {
    const handleRemoteSubmit = () => submitVoiceRxRecording();
    const handleRemoteCancel = () => cancelVoiceRxRecording();
    window.addEventListener("voicerx:submit", handleRemoteSubmit);
    window.addEventListener("voicerx:cancel", handleRemoteCancel);
    return () => {
      window.removeEventListener("voicerx:submit", handleRemoteSubmit);
      window.removeEventListener("voicerx:cancel", handleRemoteCancel);
    };
  }, [submitVoiceRxRecording, cancelVoiceRxRecording]);

  const hasRestorableVoiceData = useMemo(() => {
    if (!voiceDigitization) return false;
    const history = Array.isArray(voiceDigitization.history) ? voiceDigitization.history : [];
    const hasDoctorAgentHistory = history.some(
      (entry) => entry?.isDoctorAgent === true || entry?.sourceSurface === "doctor-agent"
    );
    return hasDoctorAgentHistory || hasObjectData(voiceDigitization.clinicNotes) || hasObjectData(voiceDigitization.digitizeData);
  }, [voiceDigitization]);

  const voiceLaunchLookupPending = voiceRxMode && !hasRestorableVoiceData && (
    voiceHydrationStatus === "idle" ||
    voiceHydrationStatus === "loading" ||
    voiceHydrationStatus === "hydrated" ||
    symptomCollectorStatus === "idle" ||
    symptomCollectorStatus === "loading"
  );

  const retryVoiceRxSoap = useCallback(async () => {
    if (!voiceRxResult) return;
    if (soapRetryInFlightRef.current || voiceRxResult.soapStatus === "pending") return;
    const canUseVoiceRx = await guardVoiceRxUsage?.({ phase: "submit", surface: "agent-soap-retry" });
    if (!canUseVoiceRx) return;
    soapRetryInFlightRef.current = true;
    const context = voiceRxSessionRef.current || createVoiceRxSessionContext({
      ...buildVoiceRxContextParams({
        patientId: patientId || "1111",
        doctorId: doctorId || "3333",
        sessionId: voiceDigitization?.sessionId,
        patientData,
        profile,
      }),
    });
    voiceRxSessionRef.current = context;
    setVoiceRxResult((prev) => prev ? { ...prev, soapStatus: "pending", soapError: null } : prev);
    try {
      const soapResult = await generateSoapNote({
        context,
        previousContext: htmlToSoapSections(voiceDigitization?.soapHtml || voiceRxResult?.soapHtml) || voiceRxResult?.soap || voiceDigitization?.soap || null,
      });
      if (soapResult?.status !== "fulfilled" || !soapResult.data) {
        throw new Error(soapResult?.error || "SOAP generation failed.");
      }
      const soapHtml = soapToHtml(soapResult.data);
      setVoiceRxResult((prev) => prev ? { ...prev, soap: soapResult.data, soapHtml, soapStatus: "fulfilled", soapError: null } : prev);
      dispatch(updateVoiceSoap(soapResult.data));
      if (soapHtml) dispatch(updateVoiceSoapHtml(soapHtml));
      toast.success("SOAP note refreshed");
    } catch (error) {
      setVoiceRxResult((prev) => prev ? {
        ...prev,
        soap: null,
        soapHtml: "",
        soapStatus: "rejected",
        soapError: error?.message || "SOAP generation failed.",
      } : prev);
      toast.error("SOAP note could not be generated.");
    } finally {
      soapRetryInFlightRef.current = false;
    }
  }, [dispatch, doctorId, guardVoiceRxUsage, patientData, patientId, profile, voiceDigitization?.sessionId, voiceDigitization?.soap, voiceDigitization?.soapHtml, voiceRxResult]);

  const isFlipped = (voiceRxMode && (voiceRxRecording || voiceRxAwaitingResponse)) || (voiceRxResult !== null && !voiceRxResultMinimized);

  // Flip-step counter — increments on every toggle of isFlipped so the
  // 3D wrapper always rotates by an additional 180° in the SAME
  // direction. The previous implementation animated 0 → 180 → 0,
  // which read as "flip back the way it came". Counting up gives
  // 0 → 180 → 360 → 540, so each transition spins forward and the
  // back→front trip rotates the opposite way to the front→back trip.
  const flipStepRef = useRef(0);
  const lastFlippedRef = useRef(isFlipped);
  if (lastFlippedRef.current !== isFlipped) {
    flipStepRef.current += 1;
    lastFlippedRef.current = isFlipped;
  }
  const flipDeg = flipStepRef.current * 180;

  return {
    voiceRxSessionRef,
    voiceRxAbortRef,
    voiceSubmitInFlightRef,
    soapRetryInFlightRef,
    pendingInitialVoiceUserMsgIdRef,
    hasAutoHydratedRef,
    abortActiveVoiceRxRequest,
    voiceRxDialogOpen,
    setVoiceRxDialogOpen,
    autoOpenedRef,
    voiceRxDialogChoice,
    setVoiceRxDialogChoice,
    voiceRxRecording,
    setVoiceRxRecording,
    voiceRxScriptedTranscript,
    setVoiceRxScriptedTranscript,
    voiceRxAwaitingResponse,
    setVoiceRxAwaitingResponse,
    voiceRxSubmittedTranscript,
    setVoiceRxSubmittedTranscript,
    voiceRxProcessingTranscript,
    setVoiceRxProcessingTranscript,
    voiceRxResultMinimized,
    setVoiceRxResultMinimized,
    voiceRxHandoffExiting,
    setVoiceRxHandoffExiting,
    voiceRxResult,
    setVoiceRxResult,
    voiceRxStreamIdx,
    voiceRxTimeoutRef,
    priorVoiceResultRef,
    voiceRxPausedRef,
    voiceRxPaused,
    setVoiceRxPaused,
    handleVoiceRxPauseChange,
    voiceRxLiveTranscript,
    headerDictationBusy,
    voiceSessionCleanupSeenRef,
    voiceCopyTrackingContext,
    patientSwitchCleanupSeenRef,
    blockedVoiceToast,
    setBlockedVoiceToast,
    trackDrAgentVoiceStart,
    confirmVoiceRxConsult,
    beginVoiceAddOnRef,
    beginVoiceAddOn,
    submitQuickEdit,
    cancelVoiceRxRecording,
    submitVoiceRxRecording,
    hasRestorableVoiceData,
    voiceLaunchLookupPending,
    retryVoiceRxSoap,
    isFlipped,
    flipStepRef,
    lastFlippedRef,
    flipDeg,
    liveFinal,
    liveInterim,
    liveSupported,
    resetLiveTranscript,
    liveError,
  };
}
