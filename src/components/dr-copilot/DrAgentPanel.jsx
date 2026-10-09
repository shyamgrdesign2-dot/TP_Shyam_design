import { useCallback, useEffect, useMemo, useRef, useState, } from "react"
import { cn } from "../dr-agent/utils"

import { useRxPadSync } from "./compat/rxpad-sync-context"

import { CONTEXT_PATIENT_ID, QUICK_CLINICAL_SNAPSHOT_PROMPT, RX_CONTEXT_OPTIONS } from "./constants"
import { buildQuickClinicalSnapshotInlineSuggestions, buildQuickClinicalSnapshotText } from "./shared/buildCoreNarrative"
import { isSituationAtGlanceAssistantMessage } from "./shared/isSituationAtGlanceMessage"
import { SMART_SUMMARY_BY_CONTEXT } from "./mock-data"
import { generatePills } from "./engines/pill-engine"
import { generateHomepagePills } from "./engines/homepage-pill-engine"
import { inferPhase } from "./engines/phase-engine"
import { classifyIntent, PILL_INTENT_MAP } from "./engines/intent-engine"
import { buildReply, buildDocumentReply, } from "./engines/reply-engine"
import { buildHomepageReply } from "./engines/homepage-reply-engine"
import { parseVoiceToStructuredRx } from "./engines/voice-rx-engine"

import { AgentHeader } from "./shell/AgentHeader"
import { PatientSelector } from "./shell/PatientSelector"
import { ChatThread } from "./chat/ChatThread"
import { WelcomeScreen, } from "./chat/WelcomeScreen"
import { VoiceRxBottomSheet } from "../dr-agent/voicerx/VoiceRxBottomSheet"
import { VOICE_RX_CONSULT_OPTIONS } from "../dr-agent/rxpad/dr-agent/constants"
import { useSelector } from "react-redux"
import { useVoiceRxChat } from "../dr-agent/rxpad/dr-agent/hooks/useVoiceRxChat"
import { getHospitalGroup, requestCopilotScopeMenu } from "./surfaces/copilotScopeStore"
import { BackFace } from "../dr-agent/rxpad/dr-agent/shell/BackFace"
import { toast as voiceToast } from "../dr-agent/voicerx/toast"
import { buildClinicalNotesCopyMeta, trackDrAgentCopyUsed } from "../dr-agent/utils/copyTracking"
import flip from "./surfaces/CopilotFlip.module.css"
import { getVeloraWelcomeActions } from "./velora/velora-patients"
import { PillBar } from "./chat/PillBar"
import { ChatInput } from "./chat/ChatInput"
import { AttachPanel } from "./chat/AttachPanel"
import { DocumentBottomSheet } from "./chat/DocumentBottomSheet"

import { PATIENT_DOCUMENTS } from "./mock-data"
import { firstNameOf } from "./shared/patientName"
import { SCOPE_HOSPITAL, SCOPE_PATIENT, scopePlaceholder } from "./shared/RollingPlaceholder"
import { CopilotIcon } from "./ui/CopilotIcon"

// ═══════════════ HELPERS ═══════════════

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

/** Map intent category + query keywords to a context-aware typing indicator hint */
function getQueryHint(category, query) {
  const q = query.toLowerCase()
  if (q.includes("interaction") || q.includes("drug")) return "Checking drug interactions"
  if (q.includes("lab") || q.includes("vital") || q.includes("trend")) return "Fetching lab results"
  if (q.includes("summary") || q.includes("snapshot") || q.includes("patient")) return "Looking up patient records"
  if (q.includes("intake") || q.includes("pre-visit")) return "Loading intake data"
  if (q.includes("ddx") || q.includes("diagnos")) return "Reviewing clinical guidelines"
  if (q.includes("investigation") || q.includes("test")) return "Reviewing investigation protocols"
  if (q.includes("document") || q.includes("report") || q.includes("upload")) return "Analyzing document"
  switch (category) {
    case "data_retrieval": return "Looking up patient records"
    case "clinical_decision": return "Reviewing clinical guidelines"
    case "clinical_question": return "Reviewing clinical data"
    case "comparison": return "Comparing clinical data"
    case "operational": return "Fetching clinic data"
    case "document_analysis": return "Analyzing document"
    case "action": return "Preparing response"
    default: return "Reviewing clinical data"
  }
}

function detectSpecialties(summary) {
  const tabs = ["gp"]
  if (summary.obstetricData) tabs.push("obstetric")
  if (summary.pediatricsData) tabs.push("pediatrics")
  if (summary.gynecData) tabs.push("gynec")
  if (summary.ophthalData) tabs.push("ophthal")
  return tabs
}

function buildIntroMessages(
  summary,
  patient,
  _doctorViewType,
  intakeMode = "with_intake",
  panelMode = "homepage",
) {
  const hasData = summary.specialtyTags.length > 0
  const messages = []

  // ── RxPad mode: no pre-loaded messages — WelcomeScreen handles first-time ──
  if (panelMode === "rxpad") {
    return messages
  }

  // ── Homepage mode WITH specific patient ──
  // Source opened straight onto a "situation at a glance" summary. Opening with
  // an answer nobody asked for is the wrong first move: the doctor arrives with
  // their own question, and a pre-written paragraph buries the four things they
  // are most likely to want. Return nothing so WelcomeScreen takes the space and
  // offers patient-relevant cards instead. "Detailed summary" is one of them, so
  // the old behaviour is still one tap away.
  if (panelMode === "homepage" && hasData) {
    return messages
  }

  // ── Homepage mode WITHOUT patient data: no messages, WelcomeScreen handles ──
  if (panelMode === "homepage") {
    return messages
  }

  // ── Homepage / Appointment page intro flow ──
  //
  // With intake:
  //   Single message → Intake card (already includes quick snapshot via patientNarrative)
  //
  // Without intake:
  //   Single message → Quick historical snapshot (patient_narrative)
  //
  // No data:
  //   Single message → New patient text
  //
  const showIntake = intakeMode === "with_intake" && !!summary.symptomCollectorData

  if (showIntake) {
    // Intake card — includes quick snapshot inside via patientNarrative
    messages.push({
      id: uid(),
      role: "assistant",
      text: `${patient.label}'s details reported by patient via Symptom Collector:`,
      createdAt: new Date().toISOString(),
      rxOutput: {
        kind: "symptom_collector",
        data: {
          ...summary.symptomCollectorData,
          patientNarrative: summary.patientNarrative,
        },
      },
      feedbackGiven: null,
    })
  } else if (hasData) {
    // No intake — show quick historical snapshot
    messages.push({
      id: uid(),
      role: "assistant",
      text: `Quick snapshot for ${patient.label}:`,
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "patient_narrative", data: summary },
      feedbackGiven: null,
    })
  } else {
    messages.push({
      id: uid(),
      role: "assistant",
      text: `${patient.label} — new patient, first visit. No prior records yet.`,
      createdAt: new Date().toISOString(),
      feedbackGiven: null,
    })
  }

  return messages
}

// ═══════════════ STATIC PATIENT INFO STRIP ═══════════════

function StaticPatientStrip({ selectedPatientId }) {
  const selected =
    _nullishCoalesce(RX_CONTEXT_OPTIONS.find((o) => o.id === selectedPatientId), () => (
    RX_CONTEXT_OPTIONS[0]))

  const genderLabel = _optionalChain([selected, 'optionalAccess', _ => _.gender]) === "M" ? "M" : _optionalChain([selected, 'optionalAccess', _2 => _2.gender]) === "F" ? "F" : ""
  const ageLabel = _optionalChain([selected, 'optionalAccess', _3 => _3.age]) ? `${selected.age}y` : ""
  const metaParts = [genderLabel, ageLabel].filter(Boolean).join(", ")

  return (
    <div className="sticky top-0 z-10 flex justify-center pb-1 pt-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border-[1px] border-white/50 bg-white/55 px-2.5 py-1 text-[14px] font-medium text-tp-slate-600 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.5)] backdrop-blur-md">
        {_optionalChain([selected, 'optionalAccess', _4 => _4.label])}
        {metaParts && <span className="text-tp-slate-400">· {metaParts}</span>}
      </span>
    </div>
  )
}

// ═══════════════ MAIN COMPONENT ═══════════════

export const HOMEPAGE_COMMON_ID = "__homepage_common__"

/* Phrasing the reply engine matches to return the symptom_collector card. */
const SYMPTOM_COLLECTOR_PROMPT = "Reported by patient"

export function DrAgentPanel({
  onClose,
  initialPatientId,
  mode = "rxpad",
  activeTab,
  activeRailItem,
  homepagePatients,
  autoMessage,
  autoMessageTrigger,
  onAutoMessageConsumed,
  patientSwitchTrigger,
  onSnapshotDelivered,
  persistedMessagesByPatient,
  onPersistedMessagesChange,
  replyOverride,
  welcomeSuggestions,
  /* VoiceRx belongs to the consultation. Off by default so no screen grows a
     consultation recorder just by hosting the panel. */
  allowVoiceRx = false,
  /* What the consultation page hands VoiceRx through copilotRxPadBridge:
     { patientId, doctorId, patientData, voiceHydrationStatus,
       symptomCollectorStatus, onPrintSoap }. Null off the Rx pad. */
  voiceRx = null,
  /* False while the panel is kept mounted but hidden (Copilot closed during
     a voice session), so the recorder knows it is collapsed. */
  isPanelVisible = true,
  /* Told whether a VoiceRx session is recording or processing, so the dock
     keeps the panel mounted rather than killing the recording on close. */
  onVoiceSessionChange,
  /* Clinic-wide results carry patients this panel has no chart for. The dock
     handles opening one, because that is a change of scope, not a selection
     inside this conversation. */
  onOpenPatient,
  /* Shown under the header while Copilot is in clinic scope: which patients
     this conversation covers. A node, because the dock owns the choice. */
  scopeStrip = null,
  /* The recent-conversations list, when the dock has it open. Covers the
     thread rather than replacing the panel, so closing it returns to exactly
     the conversation underneath. */
  recentOverlay = null,
  /* A line above the thread after the scope changes: what it changed to,
     why when Velora moved it, and the way back. Owned by the dock. */
  /* "forward" (into a patient) or "back" (out to a hospital scope): which
     way the conversation slides in when the scope changes. */
  threadMotion = "none",
  /* One step back to the previous conversation, shown in the brand tag. */
  onBack = null,
  backLabel = "",
  /* A restore in flight: the panel is about to be replaced wholesale, so the
     composer waits rather than letting a question land in the old thread. */
  busy = false,
  /* VoiceRx only ever runs in the sidebar. In the popup, starting it or
     opening its notes asks the dock to move to the sidebar instead of
     turning the card here; the sidebar panel then picks the request up. */
  voiceRxInPopup = false,
  onMoveVoiceRxToSidebar,
  pendingVoiceRx = null,
  onPendingVoiceRxHandled,
  /* Bumped when Copilot was opened by the page's mic: the gesture started out
     there, so the composer picks it up already listening rather than making
     the doctor press a second mic. */
  autoDictateTrigger = 0,
  /* Chart Search answers from the record and cannot read an attachment, and
     its scope is the page's patient rather than a switchable context - so the
     composer drops the attach control and the chip stops offering a menu. */
  allowAttach = true,
  lockPatient = false,
  /* The popup is far wider than the dock this panel was built for. The shell
     carries no padding of its own - the header pins to its top edge - and the
     content is inset here instead, which is what keeps the thread readable
     across a 90vw surface. */
  roomy = false,
  /* In the popup the composer sits on the panel's own gradient wash, so the
     white band and the fade above it - which exist to keep the input legible
     against a scrolling thread in a narrow dock - read as a plate stuck to the
     bottom of an otherwise open surface. There, the input carries its own soft
     glow instead. */
  composerGlow = false,
}) {
  // ── Patient Context ──
  // In homepage mode with no patient, use a special common ID for operational context
  const effectiveDefaultId = (mode === "homepage" && !initialPatientId) ? HOMEPAGE_COMMON_ID : (_nullishCoalesce(initialPatientId, () => ( CONTEXT_PATIENT_ID)))
  const [selectedPatientId, setSelectedPatientId] = useState(effectiveDefaultId)

  // Sync when initialPatientId changes from parent (appointment page)
  useEffect(() => {
    if (mode === "homepage" && !initialPatientId) {
      if (selectedPatientId !== HOMEPAGE_COMMON_ID) {
        setSelectedPatientId(HOMEPAGE_COMMON_ID)
      }
    } else if (initialPatientId) {
      /* A question still in flight belongs to the patient it was asked about
         and lands in their thread; the indicator must not follow the doctor
         to the next patient and lock that composer. */
      if (String(initialPatientId) !== String(selectedPatientId)) {
        setIsTyping(false)
        setTypingHint("")
      }
      setSelectedPatientId(initialPatientId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatientId, mode, patientSwitchTrigger])

  // ── Per-Patient State (keyed by patient ID; lifted to parent when onPersistedMessagesChange is set) ──
  const [internalMessagesByPatient, setInternalMessagesByPatient] = useState({})
  const isMessagesPersisted = onPersistedMessagesChange != null
  const messagesByPatient = isMessagesPersisted ? (_nullishCoalesce(persistedMessagesByPatient, () => ( {}))) : internalMessagesByPatient
  const setMessagesByPatient = useCallback(
    (u) => {
      if (onPersistedMessagesChange) {
        onPersistedMessagesChange(u)
      } else {
        setInternalMessagesByPatient(u)
      }
    },
    [onPersistedMessagesChange],
  )
  const [phaseByPatient, setPhaseByPatient] = useState({})

  // ── UI State ──
  const [activeSpecialty, setActiveSpecialty] = useState("gp")
  const [activeTabLens] = useState("dr-agent")
  const [doctorViewType, setDoctorViewType] = useState("specialist_first_visit")
  const [intakeMode, setIntakeMode] = useState("with_intake")
  const [inputValue, setInputValue] = useState("")
  const [isPrefilled, setIsPrefilled] = useState(false)
  const [isPatientSheetOpen, setIsPatientSheetOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingHint, setTypingHint] = useState("")
  const [showAttachPanel, setShowAttachPanel] = useState(false)
  const [showDocBottomSheet, setShowDocBottomSheet] = useState(false)
  const fileInputRef = useRef(null)

  // ── Integration ──
  const { requestCopyToRxPad, lastSignal, publishSignal, setPatientAllergies } = useRxPadSync()
  const lastSignalIdRef = useRef(0)

  // ── Derived State ──
  // Caller-supplied patients (today's real queue, or the one patient a RxPad is
  // open on) are checked before the bundled demo list, so the chip shows the
  // name the doctor actually recognises. Source only ever looked at
  // RX_CONTEXT_OPTIONS, so a live patient came out labelled as a mock one.
  const patient = useMemo(
    () => {
      const found = (homepagePatients || []).find((p) => p.id === selectedPatientId)
      if (found) return found
      /* A caller that supplies its own patients never falls back to the
         bundled demo list: a doctor must not see an invented name on a chip
         that scopes a real chart. A plain label is the honest miss. */
      if (homepagePatients) return { id: selectedPatientId, label: "Patient", kind: "patient" }
      return RX_CONTEXT_OPTIONS.find((p) => p.id === selectedPatientId) || RX_CONTEXT_OPTIONS[0]
    },
    [selectedPatientId, homepagePatients],
  )

  const summary = useMemo(
    () => SMART_SUMMARY_BY_CONTEXT[selectedPatientId] || SMART_SUMMARY_BY_CONTEXT[CONTEXT_PATIENT_ID],
    [selectedPatientId],
  )

  const messages = useMemo(
    () => messagesByPatient[selectedPatientId] || [],
    [messagesByPatient, selectedPatientId],
  )

  /** Glance intro still has inline pills under the bubble — hide context PillBar until cleared */
  const glanceInlinePillsActive = useMemo(
    () => messages.some((m) => isSituationAtGlanceAssistantMessage(m) && !!_optionalChain([m, 'access', _5 => _5.suggestions, 'optionalAccess', _6 => _6.length])),
    [messages],
  )

  const phase = useMemo(
    () => phaseByPatient[selectedPatientId] || "empty",
    [phaseByPatient, selectedPatientId],
  )

  const availableSpecialties = useMemo(() => detectSpecialties(summary), [summary])

  const isPatientContext = mode === "homepage" && selectedPatientId !== HOMEPAGE_COMMON_ID

  // Show doctor view selector only for patients with POMR/SBAR data (POC: Ramesh Kumar only)
  const showDoctorViewSelector = selectedPatientId === "apt-ramesh-ckd"

  // ── Pill deduplication: track which card kinds have been shown ──
  const shownCardKinds = useMemo(() => {
    const kinds = new Set()
    for (const msg of messages) {
      if (_optionalChain([msg, 'access', _7 => _7.rxOutput, 'optionalAccess', _8 => _8.kind])) kinds.add(msg.rxOutput.kind)
    }
    return kinds
  }, [messages])

  /** Map pill labels to the card kind(s) they produce — used to hide pills for already-shown cards */
  const PILL_TO_CARD_KINDS = {
    "Patient's detailed summary": ["patient_summary", "sbar_overview"],
    "Patient summary": ["sbar_overview", "patient_summary"],
    "Reported by patient": ["symptom_collector"],
    "Show reported intake": ["symptom_collector"],
    "Last visit": ["last_visit"],
    "Last visit details": ["last_visit"],
    "Past visit summaries": ["last_visit"],
    "Vital trends": ["vitals_trend_bar"],
    "Suggest DDX": ["ddx"],
    "Lab overview": ["lab_panel"],
    "Lab comparison": ["lab_comparison"],
    "Obstetric summary": ["obstetric_summary"],
    "Gynec summary": ["gynec_summary"],
    "Growth & vaccines": ["pediatric_summary"],
    "Vision summary": ["ophthal_summary"],
    "Flagged lab results": ["lab_panel"],
    "Follow-up overview": ["follow_up"],
  }

  const pills = useMemo(() => {
    const rawPills = (mode === "homepage" && selectedPatientId === HOMEPAGE_COMMON_ID)
      ? generateHomepagePills(activeTab, activeRailItem, null)
      : isPatientContext
        ? generateHomepagePills(activeTab, activeRailItem, summary)
        : generatePills(summary, phase, activeTabLens, showDoctorViewSelector ? doctorViewType : undefined)

    // Filter out pills whose card has already been shown in the current conversation
    return rawPills.filter(pill => {
      const cardKinds = PILL_TO_CARD_KINDS[pill.label]
      if (!cardKinds) return true // Unknown mapping — always show
      return !cardKinds.some(kind => shownCardKinds.has(kind))
    })
  }, [mode, activeTab, activeRailItem, isPatientContext, summary, phase, activeTabLens, selectedPatientId, showDoctorViewSelector, doctorViewType, shownCardKinds])

  /**
   * Velora pill override: when the most recent assistant message is a Velora scenario card
   * (not the brief), its inline suggestions should appear in the PillBar above the input
   * instead of under the bubble. Produces a synthetic pill list from the message's suggestions.
   */
  const veloraPillsOverride = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAssistant) return null
    const kind = _optionalChain([lastAssistant, 'access', _9 => _9.rxOutput, 'optionalAccess', _10 => _10.kind])
    const isVeloraFollowUp =
      kind === "velora_scenario_card" ||
      kind === "care_gap_window" ||
      kind === "clinical_correlation_chain"
    if (!isVeloraFollowUp) return null
    if (!lastAssistant.suggestions || lastAssistant.suggestions.length === 0) return null
    return lastAssistant.suggestions.map((s, i) => ({
      id: `velora-pill-${i}`,
      label: s.label,
      priority: i,
      layer: 2,
      tone: "info",
    }))
  }, [messages])

  /** The actual pills shown above the input box. Velora-follow-up overrides default pills. */
  const effectivePills = _nullishCoalesce(veloraPillsOverride, () => ( pills))

  // ── Sync patient allergies to context (for RxPad medication alerts) ──
  useEffect(() => {
    setPatientAllergies(_nullishCoalesce(summary.allergies, () => ( [])))
  }, [summary, setPatientAllergies])

  // ── Initialize patient messages on first visit or after intake mode change ──
  // Note: we track whether messages exist for the current patient using a ref-derived flag
  // to avoid putting messagesByPatient in the dep array (which would cause infinite loops
  // since this effect itself sets messagesByPatient).
  const hasMessagesForPatient = !!messagesByPatient[selectedPatientId]
  useEffect(() => {
    if (!hasMessagesForPatient) {
      let introMessages
      if (mode === "homepage" && selectedPatientId === HOMEPAGE_COMMON_ID) {
        // Homepage — no intro messages; WelcomeScreen handles the first-time experience
        introMessages = []
      } else if (
        mode === "homepage" &&
        selectedPatientId !== HOMEPAGE_COMMON_ID &&
        _optionalChain([autoMessage, 'optionalAccess', _11 => _11.trim, 'call', _12 => _12()]) === QUICK_CLINICAL_SNAPSHOT_PROMPT
      ) {
        // Appointment-row AI icon: parent auto-sends quick snapshot — skip intro so we don't duplicate the glance card
        return
      } else {
        introMessages = buildIntroMessages(summary, patient, showDoctorViewSelector ? doctorViewType : undefined, intakeMode, mode)
      }
      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: introMessages,
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId, hasMessagesForPatient, summary, patient, mode, initialPatientId, autoMessage])

  // ── Reset specialty when patient changes ──
  useEffect(() => {
    const detected = detectSpecialties(summary)
    if (!detected.includes(activeSpecialty)) {
      setActiveSpecialty("gp")
    }
  }, [summary, activeSpecialty])

  // ── Handle Sidebar Signals ──
  useEffect(() => {
    if (!lastSignal || lastSignal.id === lastSignalIdRef.current) return
    lastSignalIdRef.current = lastSignal.id

    if (lastSignal.type === "sidebar_pill_tap" && lastSignal.label) {
      // Pre-fill input box — doctor decides whether to send
      setInputValue(lastSignal.label)
      setIsPrefilled(true)
    }

    // AI trigger from RxPad section chips or sidebar icons → pre-fill input
    if (lastSignal.type === "ai_trigger" && lastSignal.label) {
      setInputValue(lastSignal.label)
      setIsPrefilled(true)
    }

    // When symptoms are added in RxPad, advance phase to show DDX pills
    if (lastSignal.type === "symptoms_changed") {
      const currentPhase = phaseByPatient[selectedPatientId] || "empty"
      if (currentPhase === "empty") {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: "symptoms_entered" }))
      }
    }

    // When diagnosis is added, advance phase
    if (lastSignal.type === "diagnosis_changed") {
      const currentPhase = phaseByPatient[selectedPatientId] || "empty"
      if (currentPhase === "symptoms_entered") {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: "dx_accepted" }))
      }
    }

    // When medications are added, advance phase accordingly
    if (lastSignal.type === "medications_changed") {
      const currentPhase = phaseByPatient[selectedPatientId] || "empty"
      if (currentPhase === "dx_accepted") {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: "meds_written" }))
      }
    }
  }, [lastSignal])

  // ── Core: Send Message ──
  const handleSend = useCallback((text) => {
    const msg = text || inputValue.trim()
    if (!msg) return

    // Clear inline suggestions from all messages (so bottom pill bar reappears)
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).map(m => m.suggestions ? { ...m, suggestions: undefined } : m),
    }))

    const userMsg = {
      id: uid(),
      role: "user",
      text: msg,
      createdAt: new Date().toISOString(),
    }

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))
    setInputValue("")

    // Classify intent — check PILL_INTENT_MAP first (exact pill labels bypass NLU)
    const pillOverride = PILL_INTENT_MAP[msg]
    const intent = pillOverride
      ? { category: pillOverride, format: "card" , confidence: 1 }
      : classifyIntent(msg)

    // Set context-aware typing hint before showing indicator.
    /* Against the live service the keyword guesses ("Checking drug
       interactions") describe work nothing is doing. Say the one thing that
       is true in each scope: which records are being read. The guesses stay
       for the bundled demo engines, which do branch on them. */
    setTypingHint(
      replyOverride
        ? selectedPatientId === HOMEPAGE_COMMON_ID
          ? getHospitalGroup() === "mine"
            ? "Searching all your patients"
            : "Searching all hospital patients"
          : `Reading ${firstNameOf(patient && patient.label) || "the patient"}'s chart`
        : getQueryHint(intent.category, msg)
    )
    setIsTyping(true)

    // Build reply after a short delay (simulate thinking)
    setTimeout(() => {
      const currentMessages = [...(messagesByPatient[selectedPatientId] || []), userMsg]
      const currentPhase = phaseByPatient[selectedPatientId] || "empty"

      // Update phase
      const newPhase = inferPhase(currentMessages, currentPhase)
      if (newPhase !== currentPhase) {
        setPhaseByPatient((prev) => ({ ...prev, [selectedPatientId]: newPhase }))
      }

      // ── Reply override hook (e.g. Velora scenario router) ──
      // When provided AND returning a reply for this patient+message, we skip the default
      // pipeline entirely. Lets an external scenario engine drive the drill-down flow
      // without touching the panel's regular intent/classifier path.
      const overrideReply = _optionalChain([replyOverride, 'optionalCall', _13 => _13(msg, selectedPatientId)])

      // Land a resolved override as an assistant turn. Shared by the sync path
      // (scenario routers) and the async one (a live archive lookup).
      const deliverOverride = (resolved) => {
        if (!resolved) return false
        /* The question belongs in another conversation and has gone there to
           be answered: take it out of this one rather than leave it here
           unanswered. */
        if (resolved.moveQuestion) {
          setMessagesByPatient((prev) => ({
            ...prev,
            [selectedPatientId]: (prev[selectedPatientId] || []).filter((m) => m.id !== userMsg.id),
          }))
          setIsTyping(false)
          setTypingHint("")
          return true
        }
        setMessagesByPatient((prev) => ({
          ...prev,
          [selectedPatientId]: [
            ...(prev[selectedPatientId] || []),
            {
              id: uid(),
              role: "assistant",
              text: resolved.text,
              createdAt: new Date().toISOString(),
              rxOutput: resolved.rxOutput,
              feedbackGiven: null,
              suggestions: resolved.suggestions,
            },
          ],
        }))
        setIsTyping(false)
        setTypingHint("")
        _optionalChain([onSnapshotDelivered, 'optionalCall', _14 => _14(selectedPatientId)])
        return true
      }

      // An override may answer from a live service rather than in-process, so a
      // thenable is allowed: the typing indicator simply stays up until it
      // settles instead of the panel falling through to the mock pipeline.
      if (overrideReply && typeof overrideReply.then === "function") {
        overrideReply
          .then((resolved) =>
            deliverOverride(
              resolved || {
                text: "I could not find anything in the archive for that.",
              }
            )
          )
          .catch((err) =>
            deliverOverride({
              text: _optionalChain([err, 'optionalAccess', _e => _e.message]) || "That lookup failed.",
            })
          )
        return
      }

      if (overrideReply) {
        deliverOverride(overrideReply)
        return
      }

      // ── Guardrails + Routing ──
      const isClinicOverview = mode === "homepage" && selectedPatientId === HOMEPAGE_COMMON_ID
      const isRxPadMode = mode === "rxpad"

      // Patient-specific intents that should NOT render in Clinic Overview
      const PATIENT_SPECIFIC_INTENTS = new Set([
        "data_retrieval", "clinical_decision", "comparison", "document_analysis",
      ])
      // Patient-specific keywords in the message
      const nl = msg.toLowerCase()
      const isPatientSpecificQuery = nl.includes("timeline") || nl.includes("last visit") || nl.includes("patient summary")
        || nl.includes("snapshot") || nl.includes("lab") || nl.includes("vital")
        || nl.includes("medication") || nl.includes("obstetric summary") || nl.includes("gynec summary")
        || nl.includes("growth") || nl.includes("vision") || nl.includes("intake")

      // Operational (clinic-overview) keywords
      const isOperationalQuery = intent.category === "operational"

      let reply

      // Extract patient name from message for search
      const extractPatientQuery = (text) => {
        const patterns = [
          /(?:details?\s+(?:about|of|for)\s+)(.+)/i,
          /(?:search|find|look\s*up|show)\s+(?:patient\s+)?(.+)/i,
          /(?:patient\s+named?\s+)(.+)/i,
          /(?:who\s+is\s+)(.+)/i,
        ]
        for (const p of patterns) {
          const m = text.match(p)
          if (m) return m[1].trim().replace(/[?.!]+$/, "")
        }
        return ""
      }

      // Check if message mentions a patient name (fuzzy match against known patients)
      const allPatients = RX_CONTEXT_OPTIONS.filter(o => o.kind === "patient")
      let nameQuery = extractPatientQuery(msg)
      // If no pattern matched, check if the raw input matches a known patient name
      if (!nameQuery) {
        const directMatch = allPatients.some(
          p => p.label.toLowerCase().includes(nl) || nl.includes(p.label.toLowerCase().split(" ")[0])
        )
        if (directMatch) nameQuery = msg.trim()
      }

      if (isClinicOverview && nameQuery) {
        // ── Patient search → show search card with pre-filled query ──
        const matches = allPatients
          .filter(p => p.label.toLowerCase().includes(nameQuery.toLowerCase()))
          .map(p => ({
            patientId: p.id,
            name: p.label,
            meta: p.meta,
            hasAppointmentToday: !!p.isToday,
          }))
        reply = {
          text: matches.length > 0
            ? `Found ${matches.length} patient${matches.length > 1 ? "s" : ""} matching "${nameQuery}". Select to view details.`
            : `No patients found for "${nameQuery}". Try searching with a different name.`,
          rxOutput: {
            kind: "patient_search",
            data: { query: nameQuery, results: matches },
          },
        }
      } else if (isClinicOverview && (PATIENT_SPECIFIC_INTENTS.has(intent.category) || isPatientSpecificQuery)) {
        // ── GUARDRAIL: Patient-specific query without a name → show search card ──
        reply = {
          text: "Please search for a patient to view their clinical data.",
          rxOutput: {
            kind: "patient_search",
            data: { query: "", results: [] },
          },
        }
      } else if (isRxPadMode && isOperationalQuery) {
        // ── GUARDRAIL: Operational/clinic query inside RxPad → redirect to appointments page ──
        const patientLabel = summary.patientNarrative
          ? "this patient"
          : "the current patient"
        reply = {
          text: `You're currently inside ${patientLabel}'s consultation. Clinic-wide analytics like revenue, KPIs, and scheduling are available on the Appointments page. Switch to the Clinic Overview context to access operational data.`,
          followUpPills: [
            { id: "grd-suggest", label: "Suggest DDX", priority: 10, layer: 3, tone: "primary"  },
            { id: "grd-labs", label: "Lab overview", priority: 12, layer: 3, tone: "primary"  },
          ],
        }
      } else if (mode === "homepage" && isOperationalQuery) {
        // ── Normal: Operational query in Clinic Overview ──
        reply = buildHomepageReply(msg, intent)
      } else {
        // ── Normal: Patient-context reply ──
        reply = buildReply(msg, summary, newPhase, intent)
      }

      const qt = msg.trim().toLowerCase()
      const qp = QUICK_CLINICAL_SNAPSHOT_PROMPT.toLowerCase()
      if (
        selectedPatientId !== HOMEPAGE_COMMON_ID &&
        (qt === qp || qt.startsWith(qp))
      ) {
        reply = {
          text: "Here's the situation at a glance.",
          rxOutput: { kind: "text_quote", data: { quote: buildQuickClinicalSnapshotText(summary), source: "" } },
          suggestions: buildQuickClinicalSnapshotInlineSuggestions(summary, "full"),
        }
      }

      const assistantMsg = {
        id: uid(),
        role: "assistant",
        text: reply.text,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null,
        suggestions: reply.suggestions,
      }

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg],
      }))
      setIsTyping(false)
      setTypingHint("")
      _optionalChain([onSnapshotDelivered, 'optionalCall', _15 => _15(selectedPatientId)])
    // The pause is only ever for the in-process engines, which answer
    // instantly and read as canned without it. A live service has its own
    // latency; adding two seconds on top of that is pretending.
    }, replyOverride ? 0 : 1800 + Math.random() * 700)
  }, [inputValue, selectedPatientId, summary, messagesByPatient, phaseByPatient, mode, homepagePatients, onSnapshotDelivered, replyOverride, patient])

  // ── Auto-message from parent (e.g. tooltip "View Detailed Summary" CTA) ──
  const handleSendRef = useRef(handleSend)
  handleSendRef.current = handleSend
  // Sending mutates messagesByPatient, which this effect reads, so without a
  // latch the effect re-runs and re-sends forever. Source only ever passed the
  // fixed snapshot prompt here (caught by the dedupe below), so the loop never
  // showed up there; Dr. Copilot passes arbitrary text from its entry points.
  const lastAutoSendKeyRef = useRef(null)
  const autoSendRafRef = useRef(null)

  // Cancel a pending auto-send on unmount only. It must NOT be cancelled when
  // the effect below merely re-runs: React clears the previous cleanup first,
  // and the re-run is latched, so cancelling there would drop the send entirely.
  useEffect(
    () => () => {
      if (autoSendRafRef.current) cancelAnimationFrame(autoSendRafRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!autoMessage || !selectedPatientId) return

    /* Scope first, question second.
       A scope switch that carries a question - the redirect cards do exactly
       that - arrives as one `open()` with a new patient and a new message.
       The patient is adopted in an effect above this one, so this effect runs
       once more while the panel still holds the old scope. Sending then would
       both answer in the scope the doctor just left and, because the key
       changes when the patient catches up, send the question a second time. */
    const scopePending =
      mode === "homepage" &&
      (initialPatientId
        ? String(initialPatientId) !== String(selectedPatientId)
        : selectedPatientId !== HOMEPAGE_COMMON_ID)
    if (scopePending) return

    /* Keyed on the instruction, not on the scope: keying it on the patient
       too meant the same carried question counted as new in every scope the
       doctor switched to, and was asked again there. */
    const sendKey = `${autoMessageTrigger}|${autoMessage}`
    if (lastAutoSendKeyRef.current === sendKey) return

    const am = autoMessage.trim().toLowerCase()
    const qp = QUICK_CLINICAL_SNAPSHOT_PROMPT.trim().toLowerCase()
    if (am === qp || am.startsWith(qp)) {
      const existing = messagesByPatient[selectedPatientId] || []
      if (
        existing.some(
          (m) => m.role === "user" && m.text.trim().toLowerCase() === am,
        )
      ) {
        return
      }
    }
    lastAutoSendKeyRef.current = sendKey
    if (autoSendRafRef.current) cancelAnimationFrame(autoSendRafRef.current)
    autoSendRafRef.current = requestAnimationFrame(() => {
      autoSendRafRef.current = requestAnimationFrame(() => {
        autoSendRafRef.current = null
        const text = autoMessage
        /* Cleared before sending, so a remount cannot find it and replay it. */
        if (onAutoMessageConsumed) onAutoMessageConsumed()
        handleSendRef.current(text)
      })
    })
  }, [autoMessage, autoMessageTrigger, selectedPatientId, messagesByPatient, mode, initialPatientId, onAutoMessageConsumed])

  // ── Pill Tap ──
  const handlePillTap = useCallback((pill) => {
    handleSend(pill.label)
  }, [handleSend])

  // ── Symptom collector ──
  // The chat input's second capture entry point, beside VoiceRx. "Reported by
  // patient" is the phrasing the reply engine matches to return the
  // symptom_collector card, so it is sent verbatim rather than paraphrased.
  const handleSymptomCollector = useCallback(() => {
    handleSend(SYMPTOM_COLLECTOR_PROMPT)
  }, [handleSend])

  // ── Feedback ──
  const handleFeedback = useCallback((messageId, feedback) => {
    setMessagesByPatient((prev) => {
      const msgs = prev[selectedPatientId] || []
      return {
        ...prev,
        [selectedPatientId]: msgs.map((m) =>
          m.id === messageId ? { ...m, feedbackGiven: feedback } : m,
        ),
      }
    })
  }, [selectedPatientId])

  // ── Patient Search Selection ──
  const handlePatientSelect = useCallback((patientId, patient) => {
    if (onOpenPatient) {
      onOpenPatient(patientId, patient)
      return
    }
    setSelectedPatientId(patientId)
  }, [onOpenPatient])

  // ── Fill to RxPad ──
  const handleCopy = useCallback((payload) => {
    if (payload && typeof payload === "object" && "sourceDateLabel" in payload) {
      requestCopyToRxPad(payload )
      // Also persist to sessionStorage so RxPad can pick it up if opened later
      try {
        const existing = sessionStorage.getItem("pendingRxPadCopy")
        const arr = existing ? JSON.parse(existing) : []
        arr.push(payload)
        sessionStorage.setItem("pendingRxPadCopy", JSON.stringify(arr))
      } catch (e) { /* ignore storage errors */ }
    }
  }, [requestCopyToRxPad])

  // ── Sidebar Navigation ──
  const handleSidebarNav = useCallback((tab) => {
    // Publish signal first so sidebar can process it
    publishSignal({ type: "section_focus", sectionId: tab })
    // Small delay to let sidebar process the signal before closing agent panel
    setTimeout(() => {
      onClose()
    }, 50)
  }, [publishSignal, onClose])

  // ── From pill tap in chat (text-based) ──
  const handleChatPillTap = useCallback((label) => {
    handleSend(label)
  }, [handleSend])

  // ── Doctor View Change — directly rebuild intro messages ──
  const handleDoctorViewChange = useCallback((newType) => {
    setDoctorViewType(newType)
    // Directly rebuild intro messages instead of delete-then-recreate via useEffect
    // This avoids the intermediate empty state that could cause visual flicker
    const newIntro = buildIntroMessages(summary, patient, showDoctorViewSelector ? newType : undefined, intakeMode, mode)
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: newIntro,
    }))
    setIsTyping(false)
  }, [selectedPatientId, summary, patient, showDoctorViewSelector, intakeMode])

  // ── Intake Mode Change — directly rebuild intro messages ──
  const handleIntakeModeChange = useCallback((newMode) => {
    setIntakeMode(newMode)
    // Directly rebuild intro messages instead of delete-then-recreate via useEffect
    const newIntro = buildIntroMessages(summary, patient, showDoctorViewSelector ? doctorViewType : undefined, newMode, mode)
    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: newIntro,
    }))
    setIsTyping(false)
  }, [selectedPatientId, summary, patient, showDoctorViewSelector, doctorViewType])

  // ── Patient Change ──
  const handlePatientChange = useCallback((id) => {
    setSelectedPatientId(id)
    setInputValue("")
    setIsTyping(false)
  }, [])

  // Locked-chip click handler — previously drove a shake on the top floating chip, which has
  // been removed. Kept as a no-op so ChatInput's prop contract stays unchanged.
  const handleLockedChipClick = useCallback(() => {}, [])

  // ── Edit message — ChatGPT-style: truncate after edited msg, re-send ──
  const handleEditMessage = useCallback((messageId, newText) => {
    setMessagesByPatient((prev) => {
      const msgs = prev[selectedPatientId] || []
      const idx = msgs.findIndex((m) => m.id === messageId)
      if (idx < 0) return prev
      // Keep messages up to (not including) the edited one
      const kept = msgs.slice(0, idx)
      return { ...prev, [selectedPatientId]: kept }
    })
    // Re-send with new text after state updates
    setTimeout(() => handleSend(newText), 50)
  }, [selectedPatientId, handleSend])

  // ── Handle attach — context-aware ──
  // Homepage (Clinic Overview, no patient) → open native file picker
  // Patient context → show bottom sheet with patient's documents
  const handleAttach = useCallback(() => {
    if (mode === "homepage" && selectedPatientId === HOMEPAGE_COMMON_ID) {
      // No patient context → trigger native file input
      _optionalChain([fileInputRef, 'access', _16 => _16.current, 'optionalAccess', _17 => _17.click, 'call', _18 => _18()])
    } else {
      // Patient context → show document bottom sheet
      setShowDocBottomSheet(true)
    }
  }, [mode, selectedPatientId])

  // ── Handle sending selected documents from bottom sheet ──
  const handleSendDocuments = useCallback((docs) => {
    setShowDocBottomSheet(false)

    const fileNames = docs.map(d => d.fileName)
    const textPrefix = docs.length === 1
      ? `Analyze this document: **${docs[0].fileName}**`
      : `Analyze these ${docs.length} documents: ${fileNames.map(f => `**${f}**`).join(", ")}`

    const userMsg = {
      id: uid(),
      role: "user",
      text: textPrefix,
      createdAt: new Date().toISOString(),
      attachment: {
        type: "pdf",
        fileName: docs[0].fileName,
        pageCount: docs[0].pageCount,
      },
    }

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))
    setIsTyping(true)

    // Determine reply based on first doc's type
    const docType = docs[0].docType === "radiology" ? "radiology"
      : docs[0].docType === "prescription" ? "prescription"
      : "pathology"

    setTimeout(() => {
      const reply = buildDocumentReply(docType, summary)
      const assistantMsg = {
        id: uid(),
        role: "assistant",
        text: docs.length === 1
          ? reply.text
          : `I've analyzed ${docs.length} documents. Here's the key extraction from the primary report:\n\n${reply.text}`,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null,
      }

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg],
      }))
      setIsTyping(false)
    }, 1200)
  }, [selectedPatientId, summary])

  // ── Handle upload from bottom sheet or file input ──
  const handleUploadNew = useCallback(() => {
    setShowDocBottomSheet(false)
    _optionalChain([fileInputRef, 'access', _19 => _19.current, 'optionalAccess', _20 => _20.click, 'call', _21 => _21()])
  }, [])

  const handleFileInputChange = useCallback(() => {
    // In POC, just open the old attach panel for doc type selection
    setShowAttachPanel(true)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleAttachSelect = useCallback((docType) => {
    setShowAttachPanel(false)

    const fileNameMap = {
      pathology: "Lab_Report_Mar2026.pdf",
      radiology: "X-Ray_Chest_Mar2026.pdf",
      prescription: "Previous_Rx_Mar2026.pdf",
    }
    const pageMap = { pathology: 2, radiology: 1, prescription: 1 }

    const userMsg = {
      id: uid(),
      role: "user",
      text: "",
      createdAt: new Date().toISOString(),
      attachment: {
        type: "pdf",
        fileName: _nullishCoalesce(fileNameMap[docType], () => ( "Document.pdf")),
        pageCount: _nullishCoalesce(pageMap[docType], () => ( 1)),
      },
    }

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))
    setIsTyping(true)

    setTimeout(() => {
      const reply = buildDocumentReply(docType, summary)
      const assistantMsg = {
        id: uid(),
        role: "assistant",
        text: reply.text,
        createdAt: new Date().toISOString(),
        rxOutput: reply.rxOutput,
        feedbackGiven: null,
        suggestions: reply.suggestions,
      }

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg],
      }))
      setIsTyping(false)
    }, 1200)
  }, [selectedPatientId, summary])

  // ── Voice transcription → structured RX ──
  const handleVoiceTranscription = useCallback((text) => {
    // Show truncated user message
    const truncated = text.length > 60 ? text.slice(0, 57) + "..." : text
    const userMsg = {
      id: uid(),
      role: "user",
      text: `🎤 ${truncated}`,
      createdAt: new Date().toISOString(),
    }

    setMessagesByPatient((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), userMsg],
    }))
    setIsTyping(true)

    // Parse voice text into structured sections
    setTimeout(() => {
      const structured = parseVoiceToStructuredRx(text)
      const sectionNames = structured.sections.map((s) => s.title).join(", ")
      const assistantMsg = {
        id: uid(),
        role: "assistant",
        text: `VoiceRx structured your dictation into ${structured.sections.length} sections (${sectionNames}). Review and copy to RxPad.`,
        createdAt: new Date().toISOString(),
        rxOutput: { kind: "voice_structured_rx", data: structured },
        feedbackGiven: null,
      }

      setMessagesByPatient((prev) => ({
        ...prev,
        [selectedPatientId]: [...(prev[selectedPatientId] || []), assistantMsg],
      }))
      setIsTyping(false)
    }, 800)
  }, [selectedPatientId])

  // ── Chat scroll ref ──
  const chatScrollRef = useRef(null)

  useEffect(() => {
    const el = chatScrollRef.current
    if (!el) return
    return () => {
    }
  }, [])

  // ── Patient documents for bottom sheet ──
  const patientDocuments = useMemo(
    () => PATIENT_DOCUMENTS[selectedPatientId] || [],
    [selectedPatientId],
  )

  /* Nothing sent yet: the panel has no thread, so the welcome screen and the
     composer share the middle of it rather than hugging opposite edges. */
  const isFirstTurn = messages.length === 0 && !isTyping

  /**
   * VoiceRx: the product's own flow, shared with the Rx pad's Dr. Agent.
   *
   * useVoiceRxChat is the exact VoiceRx the consultation page's Dr. Agent
   * panel ran - consult-mode sheet, recording, processing handoff, the
   * transcript bubble and structured Rx card in the thread, the result canvas
   * (transcript / clinical notes / SOAP, add details by voice, quick edit),
   * plus the credit guard, usage logging and voice history. Copilot owns only
   * the thread it lands in and the turn of the card; the back face is the
   * Rx pad's own BackFace. It only acts on the Rx pad, where the page's live
   * sync reaches this panel through copilotRxPadBridge.
   */
  const voiceProfile = useSelector((state) => (state && state.doctors ? state.doctors.profile : null))
  const voiceDigitizationState = useSelector((state) => (state ? state.voiceDigitization : null))
  const voiceEnabled = !!(allowVoiceRx && voiceRx)
  const voicePatientId = (voiceRx && voiceRx.patientId) || selectedPatientId
  const voiceDoctorId = (voiceRx && voiceRx.doctorId) || (voiceProfile && voiceProfile.doctor_unique_id) || ""
  const {
    runCopyWithAura,
    pushHistoricalUpdates,
    activeVoiceModule,
    headerDictation,
  } = useRxPadSync()
  const {
    voiceRxDialogOpen,
    setVoiceRxDialogOpen,
    voiceRxDialogChoice,
    setVoiceRxDialogChoice,
    voiceRxRecording,
    voiceRxAwaitingResponse,
    voiceRxSubmittedTranscript,
    voiceRxProcessingTranscript,
    setVoiceRxResultMinimized,
    voiceRxHandoffExiting,
    voiceRxResult,
    setVoiceRxResult,
    handleVoiceRxPauseChange,
    voiceRxLiveTranscript,
    voiceCopyTrackingContext,
    confirmVoiceRxConsult,
    beginVoiceAddOn,
    submitQuickEdit,
    cancelVoiceRxRecording,
    submitVoiceRxRecording,
    retryVoiceRxSoap,
    isFlipped: voiceFlipped,
    flipDeg,
  } = useVoiceRxChat({
    selectedPatientId,
    messagesByPatient,
    setMessagesByPatient,
    voiceRxMode: voiceEnabled,
    onVoiceCaptureModeChange: undefined,
    isPanelVisible,
    autoOpenBottomSheet: false,
    patientId: voicePatientId,
    doctorId: voiceDoctorId,
    patientData: voiceRx ? voiceRx.patientData : undefined,
    voiceHydrationStatus: voiceRx ? voiceRx.voiceHydrationStatus : undefined,
    symptomCollectorStatus: voiceRx ? voiceRx.symptomCollectorStatus : undefined,
    summarySymptomCollectorData: undefined,
    resetThreadOnVoiceSession: false,
  })
  const isFlippedToVoice = voiceEnabled && voiceFlipped
  const headerDictationBusy =
    headerDictation && (headerDictation.status === "recording" || headerDictation.status === "transcribing")
  const voiceLocked = !!activeVoiceModule || !!headerDictationBusy
  const voiceRecorderAnalyticsContext = useMemo(() => ({
    patientData: voiceRx ? voiceRx.patientData : undefined,
    profile: voiceProfile,
    sessionId: (voiceDigitizationState && voiceDigitizationState.sessionId) || "",
    mode: voiceRxDialogChoice,
    voicecall: (voiceDigitizationState && voiceDigitizationState.voiceCallCount) || 0,
    moduleName: "Dr Agent",
    sourceSurface: "dr_agent",
    voiceInputLocation: "Dr Copilot",
    isDoctorAgent: true,
    doctorId: voiceDoctorId,
    patientId: voicePatientId,
    selectedPatientId,
  }), [voiceRx, voiceProfile, voiceDigitizationState, voiceRxDialogChoice, voiceDoctorId, voicePatientId, selectedPatientId])

  /* Popup: the result canvas never opens here. The chat card's "View clinical
     notes" fires open-voicerx; catch it before the shared flow does and hand
     it to the sidebar with the card's data. */
  useEffect(() => {
    if (!voiceEnabled || !voiceRxInPopup || !onMoveVoiceRxToSidebar) return undefined
    const intercept = (e) => {
      e.stopImmediatePropagation()
      onMoveVoiceRxToSidebar({ kind: "result", detail: e.detail })
    }
    window.addEventListener("open-voicerx", intercept, true)
    return () => window.removeEventListener("open-voicerx", intercept, true)
  }, [voiceEnabled, voiceRxInPopup, onMoveVoiceRxToSidebar])

  /* Sidebar: carry out what the popup asked for. Starting needs the chosen
     mode in state before confirming, because the shared flow reads it. */
  const pendingHandledRef = useRef(null)
  useEffect(() => {
    if (!voiceEnabled || voiceRxInPopup || !pendingVoiceRx) return
    if (pendingHandledRef.current === pendingVoiceRx.id) return
    if (pendingVoiceRx.kind === "start") {
      if (voiceRxDialogChoice !== pendingVoiceRx.choice) {
        setVoiceRxDialogChoice(pendingVoiceRx.choice)
        return
      }
      pendingHandledRef.current = pendingVoiceRx.id
      confirmVoiceRxConsult()
    } else if (pendingVoiceRx.kind === "result") {
      pendingHandledRef.current = pendingVoiceRx.id
      window.dispatchEvent(new CustomEvent("open-voicerx", { detail: pendingVoiceRx.detail }))
    }
    if (onPendingVoiceRxHandled) onPendingVoiceRxHandled(pendingVoiceRx.id)
  }, [voiceEnabled, voiceRxInPopup, pendingVoiceRx, voiceRxDialogChoice, setVoiceRxDialogChoice, confirmVoiceRxConsult, onPendingVoiceRxHandled])

  const voiceSessionActive = voiceEnabled && (voiceRxRecording || voiceRxAwaitingResponse)
  useEffect(() => {
    if (onVoiceSessionChange) onVoiceSessionChange(voiceSessionActive)
  }, [voiceSessionActive, onVoiceSessionChange])

  return (
    <div
      className={flip.wrapper}
      /* No width of its own. The dock and the popup size the panel through
         `#dr-agent-panel-root` - the popup's override is what turns 400px into
         the full sheet - and a wrapper carrying its own clamp sat outside the
         reach of that rule and pinned the popup to dock width. */
      style={{ "--flip-deg": `${voiceEnabled && !voiceRxInPopup ? flipDeg : 0}deg` }}
    >
    <div
      id="dr-agent-panel-root"
      className={cn(
        flip.face,
        flip.front,
        isFlippedToVoice && !voiceRxInPopup && flip.hidden,
        "relative flex h-full flex-col overflow-hidden bg-white",
        isFirstTurn && "justify-center",
      )}
      style={{ minWidth: 350, maxWidth: 400 }}
    >
      {/* Hidden file input for native upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Animated TP AI gradient wash — single continuous background across header + chat + footer.
          Runs at 7% opacity + 90px blur so even on the empty/intro state it reads as a very subtle
          living gradient rather than competing with the greeting copy. */}
      <div className="da-gradient-wash pointer-events-none absolute inset-0 z-0" aria-hidden />

      {/*
        Header — floats absolutely over the chat column so scrolled messages
        pass *behind* the liquid-glass brand tag and collapse tag. The chat
        scroll container adds `pt-[52px]` so the initial state doesn't sit
        under the tags.
      */}
      <div className="absolute inset-x-0 top-0 z-30">
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
        intakeMode={intakeMode}
        onIntakeModeChange={handleIntakeModeChange}
        /* Beside the brand tag, on the same glass: the scope is part of what
           this panel is, not a band stacked under it. A band cost a row of
           the panel and still read as chrome. */
        trailing={scopeStrip}
        onBack={onBack}
        backLabel={backLabel}
      />
      </div>


      {recentOverlay}

      {/* The top edge of the thread, in the panel's own colour: the header
          tags float over the scroll, and without this a line of text met
          them mid-stroke. Same fade as the composer's, the other way up, and
          no blur behind either. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[64px]"
        aria-hidden
        style={{
          background:
            "linear-gradient(to bottom, #fff 0%, rgba(255,255,255,0.92) 46%, rgba(255,255,255,0) 100%)",
        }}
      />

      {/* ── Chat area — transparent; inherits the animated AI wash behind the panel.
          `pt-[52px]` leaves room for the floating header so content scrolls *under* it.

          Before the first message the chat area shrinks to its content, which
          lets the welcome screen and the composer sit together in the vertical
          middle of the panel: nothing has happened yet, so there is no thread
          for the composer to anchor beneath. Sending drops it to the bottom,
          where it stays. ── */}
      <div
        className={cn(
          "relative z-10 flex flex-col overflow-hidden",
          isFirstTurn ? "flex-none" : "flex-1",
        )}
        style={{ background: "transparent" }}
      >
        <div
          ref={chatScrollRef}
          /* Keyed on the scope: switching patient (or to the whole hospital)
             replaces the conversation, so the old one leaves and the new one
             settles in, rather than one list of messages turning into
             another under the doctor's eyes. */
          key={selectedPatientId}
          className={cn(
            "da-chat-scroll flex flex-col",
            threadMotion === "forward"
              ? "copilot-thread-forward"
              : threadMotion === "back"
                ? "copilot-thread-back"
                : "copilot-thread-in",
            /* Clears the floating header. The scope tag rides inside it. */
            "pt-[52px]",
            /* The rail is narrow, not padding-free: it had 0 here and the
               cards ran into its right edge. */
            roomy ? "px-[24px]" : "px-[14px]",
            isFirstTurn ? "overflow-visible" : "flex-1 overflow-y-auto",
          )}
        >

          {messages.length === 0 && !isTyping ? (
            <WelcomeScreen
              context={
                mode === "homepage"
                  ? (selectedPatientId === HOMEPAGE_COMMON_ID ? "homepage" : "patient_detail")
                  : "rxpad"
              }
              patientName={selectedPatientId !== HOMEPAGE_COMMON_ID ? _optionalChain([patient, 'optionalAccess', _22 => _22.label]) : undefined}
              hasIntake={!!summary.symptomCollectorData}
              summary={selectedPatientId !== HOMEPAGE_COMMON_ID ? summary : undefined}
              actionsOverride={getVeloraWelcomeActions(selectedPatientId)}
              suggestions={welcomeSuggestions}
              /* The scope in the greeting opens the same picker the tag
                 does, so the empty state is where a doctor can find it. */
              onScopeClick={scopeStrip ? requestCopilotScopeMenu : undefined}
              promptsAsTags
              /* The popup can hold two chips a line; the 384px rail cannot. */
              promptsLayout={roomy ? "grid" : "stack"}
              onActionClick={(msg) => handleSend(msg)}
            />
          ) : (
            /* Chat messages */
            <ChatThread
              messages={messages}
              isTyping={isTyping || (voiceEnabled && voiceRxAwaitingResponse)}
              typingHint={typingHint}
              onFeedback={handleFeedback}
              onPillTap={handleChatPillTap}
              onCopy={handleCopy}
              onSidebarNav={handleSidebarNav}
              className="flex-1"
              activeSpecialty={activeSpecialty}
              patientDocuments={patientDocuments}
              onPatientSelect={handlePatientSelect}
              onEditMessage={handleEditMessage}
            />
          )}
        </div>
      </div>

      {/* ── Sticky footer: bg-white for input legibility; a soft white fade above hides the seam
          against the wash, while the input capsule stays fully opaque and crisp. ── */}
      {/* Before the first message the composer belongs to the welcome block
          above it - same measure, same centre line, so the two read as one
          component rather than a greeting with an input parked under it.
          Once there is a thread it goes full width, where it anchors the
          conversation rather than a card. */}
      <div
        className={cn(
          "z-10 shrink-0",
          /* The wide inset is for a thread running the width of the popup. In
             the first turn the composer is part of the centred block and takes
             its measure from that instead, or the two would sit on different
             edges. */
          !isFirstTurn && (roomy ? "px-[24px]" : "px-[8px]"),
          /* Centred, the composer floats on the panel's own wash with a glow
             under it. Docked to the bottom of a thread it needs the faded
             white band back, which is what keeps the input legible as cards
             scroll behind it. */
          /* Wider than the greeting and the prompts on purpose. It is the one
             thing on this screen meant to be used, and the widest element is
             the one the eye lands on. */
          /* The chat column carries pt-[52px] to clear the floating header.
             With nothing balancing it below, the centred stack sat half that
             distance low. Matching padding here puts the block on the panel's
             own centre line. */
          isFirstTurn
            ? "relative mx-auto w-full max-w-[680px] bg-transparent pb-[62px]"
            : composerGlow
              ? "sticky bottom-0"
              : "sticky bottom-0 bg-white",
        )}
      >
        {isFirstTurn ? (
          /* No bloom element here any more. Anchored to this padded box it
             pooled below the field and stopped short of it, which is what
             made the glow look cut off at the bottom edge. The capsule's own
             blurred shadow bleeds evenly on all four sides instead. */
          null
        ) : (
          /* One layer for both jobs: it covers the composer's own ground and
             the seam above it. Transparent at the top so cards dissolve into
             it rather than meeting an edge, and masked at the sides so the
             band has no visible left or right end against the wash. */
          <div
            className="pointer-events-none absolute inset-x-0 -top-[28px] bottom-0 z-[-1]"
            style={{
              /* Colour, not blur. A backdrop filter here smeared whatever
                 scrolled under it into a grey haze and cost a composite layer
                 on every frame of the scroll; a gradient in the panel's own
                 white does the same job and looks like the page. */
              background: composerGlow
                ? "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.72) 38%, rgba(255,255,255,0.97) 68%, #fff 100%)"
                : "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 32%, #fff 58%)",
              maskImage:
                "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)",
            }}
          />
        )}
        <ChatInput
          value={inputValue}
          onChange={(v) => { setInputValue(v); if (isPrefilled) setIsPrefilled(false) }}
          onSend={() => { setIsPrefilled(false); handleSend() }}
          onAttach={allowAttach ? handleAttach : undefined}
          onVoiceTranscription={handleVoiceTranscription}
          disabled={isTyping || busy}
          /* A disabled field says why, so a doctor does not think it broke. */
          disabledReason={
            busy
              ? "Opening this conversation..."
              : "Velora is answering. You can ask your next question when it finishes."
          }
          isPrefilled={isPrefilled}
          /* The rolling invitation runs in both scopes now, each with hints
             that teach its own kind of question; this still line is what the
             field falls back to where it cannot roll. */
          placeholder={scopePlaceholder(
            selectedPatientId === HOMEPAGE_COMMON_ID ? SCOPE_HOSPITAL : SCOPE_PATIENT,
            patient && patient.label
          )}
          rollingPlaceholder
          bare={composerGlow}
          hideTrust={composerGlow}
          patientName={selectedPatientId === HOMEPAGE_COMMON_ID ? undefined : (patient.label || undefined)}
          patientMeta={selectedPatientId === HOMEPAGE_COMMON_ID ? undefined : (patient.gender && patient.age ? `${patient.gender}|${patient.age}y` : undefined)}
          // Homepage (appointment screen) → chip is the context switcher (opens PatientSelector sheet).
          // Patient-detail / RxPad pages → chip is locked to the current patient, with a compact tooltip.
          patientLocked={lockPatient || mode !== "homepage"}
          patientLockedMessage={mode === "homepage" ? undefined : `Chat is focused on ${_optionalChain([patient, 'access', _23 => _23.label, 'optionalAccess', _24 => _24.split, 'call', _25 => _25(" "), 'access', _26 => _26[0]]) || "this patient"} for this ${mode === "rxpad" ? "prescription" : "visit"}`}
          onPatientClick={mode === "homepage" && !lockPatient ? () => setIsPatientSheetOpen(true) : undefined}
          onLockedChipClick={handleLockedChipClick}
          isClinicContext={selectedPatientId === HOMEPAGE_COMMON_ID}
          onSymptomCollector={handleSymptomCollector}
          tall={isFirstTurn}
          allowVoiceRx={allowVoiceRx}
          autoDictateTrigger={autoDictateTrigger}
          onVoiceRx={voiceEnabled ? () => setVoiceRxDialogOpen(true) : undefined}
        />
      </div>

      {/* Bottom-aligned, because it is a statement about the panel rather than
          about the input: under a centred composer it read as a caption. */}
      {composerGlow && (
        <div
          className={cn(
            "pointer-events-none z-10 flex items-center justify-center gap-[4px]",
            isFirstTurn
              ? "absolute inset-x-0 bottom-[10px]"
              : "shrink-0 pt-[6px] pb-[12px]",
          )}
        >
          <CopilotIcon name="security-safe" variant="linear" size={12} className="shrink-0 text-tp-slate-500" />
          <span className="text-[11px] leading-[1.4] text-tp-slate-500">
            Data stays private &middot; AI-assisted, you decide
          </span>
        </div>
      )}

      {/* The product's own consultation-mode sheet: conversation or dictation,
          the same two options and the same copy as the Rx pad's. */}
      {voiceEnabled && (
        <VoiceRxBottomSheet
          isOpen={voiceRxDialogOpen}
          onClose={() => setVoiceRxDialogOpen(false)}
          consultOptions={VOICE_RX_CONSULT_OPTIONS}
          selectedOption={voiceRxDialogChoice}
          onSelectOption={setVoiceRxDialogChoice}
          onConfirm={
            voiceRxInPopup && onMoveVoiceRxToSidebar
              ? () => {
                  setVoiceRxDialogOpen(false)
                  onMoveVoiceRxToSidebar({ kind: "start", choice: voiceRxDialogChoice })
                }
              : confirmVoiceRxConsult
          }
        />
      )}

      {/* ── Document Bottom Sheet — overlays entire panel ── */}
      {showDocBottomSheet && (
        <DocumentBottomSheet
          documents={patientDocuments}
          onSendDocuments={handleSendDocuments}
          onUploadNew={handleUploadNew}
          onClose={() => setShowDocBottomSheet(false)}
          patientFirstName={_optionalChain([patient, 'optionalAccess', _27 => _27.label, 'optionalAccess', _28 => _28.split, 'call', _29 => _29(" "), 'access', _30 => _30[0]])}
        />
      )}

      {/* Patient/Context selector — bottom sheet overlays entire panel */}
      {mode === "homepage" && (
        <PatientSelector
          selectedId={selectedPatientId}
          onSelect={handlePatientChange}
          showUniversalOption
          universalOptionId={HOMEPAGE_COMMON_ID}
          externalPatients={homepagePatients}
          isOpen={isPatientSheetOpen}
          onClose={() => setIsPatientSheetOpen(false)}
        />
      )}

      {/* Panel-level CSS: scrollbar + animated wash. */}
      <style>{`
        .da-chat-scroll::-webkit-scrollbar { width: 3px; }
        .da-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .da-chat-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
        .da-chat-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.12) transparent; }

        /* Animated AI conic wash — single continuous background behind the entire panel.
           @property lets us animate an <angle> CSS variable (otherwise the browser can't
           interpolate conic-gradient angles). Heavy blur so the six color stops bleed
           smoothly; low opacity so it reads as a gentle living sheen, not a party trick. */
        @property --da-wash-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .da-gradient-wash {
          opacity: 0.07;
          background: conic-gradient(
            from var(--da-wash-angle) at 50% 50%,
            #E38BBE 0deg,
            #B06CE0 55deg,
            #8B5CF6 115deg,
            #6B5FE0 180deg,
            #4B4AD5 235deg,
            #4FACFE 295deg,
            #E38BBE 360deg
          );
          filter: blur(90px);
          animation: daWashRotate 22s linear infinite;
          will-change: --da-wash-angle;
        }
        @keyframes daWashRotate {
          from { --da-wash-angle: 0deg; }
          to   { --da-wash-angle: 360deg; }
        }
        @media (prefers-reduced-motion: reduce) {
          .da-gradient-wash { animation: none; }
        }
      `}</style>
    </div>

    {/* The back face is the Rx pad's own: the recorder while listening and
        processing, then the result canvas. It positions and turns itself. */}
    {voiceEnabled && !voiceRxInPopup && (
      <div
        className={flip.voiceHost}
        data-dr-agent="true"
        style={voiceFlipped ? undefined : { pointerEvents: "none" }}
      >
      <BackFace
        isFlipped={voiceFlipped}
        isPanelVisible={isPanelVisible}
        voiceRxResult={voiceRxResult}
        voiceRxDialogChoice={voiceRxDialogChoice}
        voiceRxLiveTranscript={voiceRxLiveTranscript}
        voiceRxSubmittedTranscript={voiceRxSubmittedTranscript}
        voiceRxProcessingTranscript={voiceRxProcessingTranscript}
        voiceRxAwaitingResponse={voiceRxAwaitingResponse}
        voiceRxHandoffExiting={voiceRxHandoffExiting}
        patientName={patient && patient.label}
        patientId={voicePatientId}
        doctorId={voiceDoctorId}
        analyticsContext={voiceRecorderAnalyticsContext}
        onCancel={cancelVoiceRxRecording}
        onSubmit={submitVoiceRxRecording}
        onCollapse={onClose}
        onExpand={undefined}
        onPauseChange={handleVoiceRxPauseChange}
        onBack={() => setVoiceRxResultMinimized(true)}
        onMinimize={() => setVoiceRxResultMinimized(true)}
        onAddDetailsByVoice={beginVoiceAddOn}
        onQuickEditSubmit={submitQuickEdit}
        onRetrySoap={retryVoiceRxSoap}
        voiceLocked={voiceLocked}
        onCopyResult={(payload, opts) => {
          if (opts && opts.copyTracking) {
            trackDrAgentCopyUsed({ ...voiceCopyTrackingContext, ...opts.copyTracking })
          }
          runCopyWithAura(payload, {
            ...opts,
            onAfterCopy: () => voiceToast.success("Copied to RxPad"),
          })
        }}
        onCopyAll={() => {
          if (!voiceRxResult) return
          const copyAllPayload = voiceRxResult.digitization
            ? { sourceDateLabel: "Voice consult", targetSection: "rxpad", digitization: voiceRxResult.digitization }
            : voiceRxResult.structured && voiceRxResult.structured.copyAllPayload
          if (!copyAllPayload) return
          trackDrAgentCopyUsed(buildClinicalNotesCopyMeta({
            ...voiceCopyTrackingContext,
            component: "Structured Clinical Notes",
            componentKey: "all",
            copyScope: "copy_all",
            cta: "copy_all_to_rxpad",
            isBulk: true,
          }))
          runCopyWithAura(copyAllPayload, {
            bulk: true,
            onAfterCopy: () => voiceToast.success("Copied All Fields to RxPad"),
          })
          if (voiceRxResult.pendingSidebarBatch) {
            pushHistoricalUpdates(voiceRxResult.pendingSidebarBatch)
            setVoiceRxResult((prev) => (prev ? { ...prev, pendingSidebarBatch: undefined } : prev))
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
        onPrintSoap={voiceRx ? voiceRx.onPrintSoap : undefined}
      />
      </div>
    )}
    </div>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
