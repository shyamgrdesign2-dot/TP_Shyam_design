import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { useLocation } from "react-router-dom";
import { DrAgentPanel, HOMEPAGE_COMMON_ID } from "../DrAgentPanel";
import { RxPadSyncContext, RxPadSyncProvider } from "../compat/rxpad-sync-context";
import { useCopilotRxPadBridge } from "./copilotRxPadBridge";
import { DrAgentFab as VoiceSessionFab } from "../../dr-agent/rxpad/dr-agent/shell/DrAgentFab";
import runtimeStyles from "../../dr-agent/rxpad/dr-agent/shell/DrAgentRuntime.module.scss";
import { COPILOT_DOCK, COPILOT_FULL, COPILOT_MODAL, useCopilot } from "./CopilotContext";
import { useCopilotPatients } from "./useCopilotPatients";
import { useCopilotReply } from "../chart-search/useCopilotReply";
import { useCopilotDiscoveryReply, clinicScopeId } from "../chart-search/useCopilotDiscoveryReply";
import CopilotRecentSessions from "./CopilotRecentSessions";
import CopilotContextBar from "./CopilotContextBar";
import {
  COPILOT_SCOPE_SWITCH_EVENT,
  hospitalGroupLabel,
  setHospitalGroup,
  setLastCopilotPatient,
  useHospitalGroup,
} from "./copilotScopeStore";
import { restoreCopilotSession } from "../chart-search/copilotApi";
import { replyFromResult } from "../chart-search/copilotReplyShapes";
import { forgetAllThreads, forgetThread, getSession, setSession } from "../chart-search/copilotSessionStore";
import { useCopilotStarters } from "../chart-search/useCopilotStarters";
import { ensureCopilotAuth } from "../chart-search/copilotApi";
import { hasLiveConversation, loadThread, saveThread } from "../chart-search/copilotSessionStore";
import { CopilotIcon } from "../ui/CopilotIcon";
import { EvidenceViewerProvider, useEvidenceViewer } from "./EvidenceViewerContext";
import EvidencePanel from "./EvidencePanel";
import styles from "./CopilotDock.module.css";
import "../ui/tokens.css";
import "../ui/copilot.css";
import { clearHistoryNow, hideSession } from "../chart-search/copilotHistoryPrefs";
import { clearMockSessions, isCopilotMock } from "../chart-search/copilotMock";
import { firstNameOf } from "../shared/patientName";
import { findPatientsNamed } from "./useCopilotPatientPicker";

/**
 * The single mount point for Dr. Copilot.
 *
 * Rendered once inside the app shell, it draws the same DrAgentPanel in
 * whichever presentation the context currently asks for, and shows the FAB
 * when nothing is open. Everything is portalled to document.body so no
 * ancestor's overflow:hidden can clip the panel.
 *
 * #dr-copilot-root is required, not decorative: the module's Tailwind build
 * emits every utility under that id (see tailwind.copilot.config.js), so the
 * panel is unstyled without it.
 */
/* What the clinic scope can be asked, in the doctor's words. Unlike the
   patient starters these cannot come from the service: it builds those from
   one chart's records, and there is no equivalent for a whole organisation.
   Kept to searches the service actually supports - recorded facts and
   numeric thresholds, never a cohort it would have to infer. */
const CLINIC_STARTERS = [
  { label: "Find patients whose latest HbA1c is above 7%", short: "Patients with HbA1c above 7%", wide: "Patients with HbA1c above 7%", requires: [] },
  { label: "Find patients with type 2 diabetes", short: "Patients with type 2 diabetes", wide: "Patients with type 2 diabetes", requires: [] },
  { label: "Find patients with a family history of coronary artery disease", short: "Patients with family history of CAD", wide: "Patients with family history of CAD", requires: [] },
  { label: "Find patients whose latest blood pressure is above 140/90", short: "Patients with BP above 140/90", wide: "Patients with BP above 140/90", requires: [] },
];

/* "Find patients with ...", "list of patients who ...", "patient with
   HbA1c": a question about a group, not about the chart that is open.
   Plural "patients" is always a group here; a singular "patient with" only
   counts at the start, so "is this patient with diabetes on metformin?"
   stays in the chart. */
function isCohortQuestion(message) {
  const q = String(message || "").trim();
  if (!q) return false;
  if (/\bpatients\b/i.test(q) && !/\b(this|the|my)\s+patients?'?s?\s+(record|chart)\b/i.test(q)) return true;
  return /^(?:(?:find|list|show|give me|get)\s+(?:me\s+)?(?:all\s+)?)?(?:the\s+)?patients?\s+(?:with|who|whose|having|on)\b/i.test(q);
}

/* The other starters, minus any the question already covers: matched on the
   starter's key term ("hba1c", "type", "family", "bp"), so "patient with
   HbA1c above 7" does not get "Patients with HbA1c above 7%" offered back. */
function clinicFollowUps(asked) {
  const q = String(asked || "").trim().toLowerCase();
  const keyOf = (s) => s.short.replace(/^patients with\s+/i, "").split(/\s+/)[0].toLowerCase();
  return CLINIC_STARTERS.filter((s) => s.label.toLowerCase() !== q && !q.includes(keyOf(s)))
    .slice(0, 3)
    .map((s) => ({ label: s.short, message: s.label }));
}

const RECENTS_KEY = "velora:recents-open";

/* Reopens the history sidebar from the conversation's top-left corner, where
   the sidebar's own collapse control sits when it is open. */
function SidebarToggle({ onClick }) {
  return (
    <Tooltip
      className="copilot-tooltip"
      side="bottom"
      content={
        <span style={{ display: "block", maxWidth: 240 }}>
          <span style={{ display: "block", fontWeight: 600 }}>Recent conversations</span>
          <span style={{ display: "block", opacity: 0.85, marginTop: 2 }}>Today's chats, for every patient and search.</span>
        </span>
      }
    >
      <button
        type="button"
        onClick={onClick}
        aria-label="Show recent conversations"
        className="copilot-glass-tag flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] text-tp-slate-600 transition-colors hover:text-tp-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
      >
        <CopilotIcon name="sidebar-left" variant="linear" size={17} />
      </button>
    </Tooltip>
  );
}

/* With the sidebar collapsed, "New chat" sits at the right end of the
   header: it opens the sidebar on its patient picker. */
function NewChatButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Start new chat"
      className="copilot-glass-tag flex h-[32px] shrink-0 items-center gap-[6px] rounded-[10px] pl-[9px] pr-[12px] text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
    >
      <span className="copilot-grad-icon flex">
        <CopilotIcon name="message-add" variant="linear" size={16} />
      </span>
      <span className="copilot-grad-text">New chat</span>
    </button>
  );
}

export default function CopilotDock() {
  const copilot = useCopilot();
  const livePatients = useCopilotPatients();
  const surfaceRef = useRef(null);
  const { pathname } = useLocation();

  /**
   * The consultation is where VoiceRx lives.
   *
   * Copilot is the same panel on every screen; what changes is whether its
   * composer offers to record a consultation. On the patient detail page
   * there is none in progress, so the mic dictates a question and that is
   * all. On the Rx pad there is, so the composer carries VoiceRx beside the
   * mic - the rail is the Copilot, and VoiceRx is a mode of its input box.
   */
  const isRxPad = /^\/(smart-|tab-rx-)?prescription/.test(pathname);

  /**
   * Where Copilot belongs at all.
   *
   * `patientId` outlives the screen it was set on - open Copilot on a patient,
   * navigate back to the queue, and the context still holds them - so having a
   * patient is not the same as being somewhere a chart can be searched. The
   * route is. Two screens qualify: the patient's own page and the
   * consultation.
   */
  const inChartScope = /^\/(patient_details|(smart-|tab-rx-)?prescription)/.test(pathname);

  // A caller can open Copilot on a patient the appointment list has never seen
  // (a consultation reached straight from a link). Fold that patient in so the
  // panel labels them properly instead of falling back to a demo name.
  const patients = useMemo(() => {
    const id = copilot && copilot.patientId;
    const label = copilot && copilot.patientLabel;
    if (!id || !label) return livePatients;
    if ((livePatients || []).some((p) => p.id === id)) return livePatients;
    return [{ id, label, kind: "patient", isToday: true }, ...(livePatients || [])];
  }, [livePatients, copilot]);

  /**
   * Copilot runs wherever a patient is in scope, and the patient it runs on is
   * the patient on screen.
   *
   * The service keys on `patientUid`, which is the portal's own patient id, so
   * there is no mapping, no MRN to paste and no resolution by name - the chart
   * Copilot answers about is the chart the doctor is looking at. Selecting a
   * different patient changes the scope by itself.
   */
  const patientUid = copilot && copilot.patientId;
  /* Always the patient on screen, never a substitute. A chart the service
     has not indexed answers "not indexed", which is the truth; the same
     screen works in full for any account that holds indexed patients. */
  /* Declared before every use below: the auth prefetch, the idle-expiry check
     and the restored-thread memo all read it during render. */
  const isOpenNow = !!(copilot && copilot.isOpen);

  /* Auth is the first call on a patient page: fired as soon as a patient is in
     scope, before anything else is asked. Every patient call also waits for
     it, so this only makes the order explicit - it is shared, not repeated. */
  useEffect(() => {
    if (isOpenNow || (patientUid && inChartScope)) ensureCopilotAuth().catch(() => {});
  }, [patientUid, inChartScope, isOpenNow]);

  const { prompts: starterPrompts } = useCopilotStarters(patientUid);

  /**
   * Two scopes, one panel.
   *
   * With a patient in scope Copilot answers from that chart. With none - the
   * appointments page, all patients, anywhere the doctor has not opened a
   * record - it runs the clinic-wide search instead of saying "open a
   * patient". The two never mix: each has its own conversation, and opening a
   * result switches scope rather than continuing the search thread.
   */
  /* Enabled in every scope: a patient's chat answers list questions too. */
  const clinicReply = useCopilotDiscoveryReply({ enabled: true });

  const openPatientFromResult = useCallback(
    (uid, match) => {
      if (!copilot || !uid) return;
      copilot.open({
        presentation: copilot.presentation,
        patientId: String(uid),
        patientLabel: (match && match.patientName) || undefined,
        /* Asked on arrival, so the chat opens on its answer. */
        ...(match && match.askAbout ? { message: match.askAbout } : {}),
      });
    },
    [copilot]
  );

  /**
   * Switching scope, and being able to switch back.
   *
   * Clearing the patient is what puts Copilot in the hospital-wide scope, so
   * on its own a switch would strand the doctor: nothing on the appointments
   * page would put that patient back. The last patient in scope is kept here
   * so the context bar can offer the way back, and their thread is untouched
   * either way - the two scopes are separate conversations.
   */
  const lastPatientRef = useRef(null);
  if (patientUid) {
    const row = patients.find((p) => p.id === patientUid) || {};
    lastPatientRef.current = {
      id: patientUid,
      label: (copilot && copilot.patientLabel) || row.label || null,
      /* Age and sex, when the appointment row carried them: the bar is also
         the answer to "is this the right Sharma?", which a name alone is not. */
      meta: row.gender && row.age != null ? `${row.gender}, ${row.age}y` : row.gender || null,
    };
  }
  const lastPatient = lastPatientRef.current;
  /* Published for the cards: one of them offers the way back into this chart
     and must not offer it when there is no chart to go back to. */
  useEffect(() => {
    setLastCopilotPatient(lastPatient ? { id: lastPatient.id, name: lastPatient.label } : null);
  }, [lastPatient]);

  const switchToClinic = useCallback(
    (message) => {
      if (!copilot) return;
      copilot.open({
        presentation: copilot.presentation,
        patientId: undefined,
        patientLabel: undefined,
        ...(message ? { message } : {}),
      });
    },
    [copilot]
  );

  const switchToPatient = useCallback(
    (message) => {
      if (!copilot || !lastPatient || !lastPatient.id) return;
      copilot.open({
        presentation: copilot.presentation,
        patientId: lastPatient.id,
        patientLabel: lastPatient.label || undefined,
        ...(message ? { message } : {}),
      });
    },
    [copilot, lastPatient]
  );

  /**
   * A chart question that turned out to be about other patients.
   *
   * The answer card offers the hospital-wide search and carries the question
   * with it, so the doctor neither has to find the other scope nor type it
   * again. The card asks through the window rather than a prop because it is
   * rendered deep inside the panel's own card renderer.
   */
  useEffect(() => {
    const onSwitch = (e) => {
      const detail = (e && e.detail) || {};
      const question = detail.question || undefined;
      if (detail.target === "patient" && detail.patient && detail.patient.id && copilot) {
        copilot.open({
          presentation: copilot.presentation,
          patientId: String(detail.patient.id),
          patientLabel: detail.patient.label || undefined,
          ...(question ? { message: question } : {}),
        });
      } else if (detail.target === "patient") switchToPatient(question);
      else switchToClinic(question);
    };
    window.addEventListener(COPILOT_SCOPE_SWITCH_EVENT, onSwitch);
    return () => window.removeEventListener(COPILOT_SCOPE_SWITCH_EVENT, onSwitch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switchToClinic, switchToPatient]);

  /**
   * The conversation lives here, not in the panel.
   *
   * The panel unmounts when Copilot closes and remounts when it moves between
   * the rail and the popup; holding the thread inside it lost the whole
   * conversation on every one of those. This component stays mounted for the
   * life of the app, and each patient's thread is also written to the session
   * store, so leaving a patient and coming back - or reloading the tab -
   * resumes it, alongside the service session it chains to.
   *
   * A patient's stored thread is folded in the moment they are in scope, both
   * for rendering and inside every update, so an update can never be applied
   * to an empty list and overwrite what was restored.
   */
  const [threads, setThreads] = useState({});

  /**
   * Reopening an earlier conversation.
   *
   * The service keeps completed conversations for 30 days and hands back
   * every turn, so a restored thread shows the same cards and citations it
   * did live - the turns are rebuilt through the same mapping a fresh answer
   * uses. Restoring also adopts that conversation's session, so the next
   * question continues it rather than starting a new one beside it.
   */
  /* Recent conversations is a sidebar on the left, open by default like a
     chat app's history, and it stays as the doctor leaves it: collapsed once,
     it stays collapsed across patients and visits until opened again. */
  /* Bumped by every clear or delete, so the history sidebar reloads instead
     of showing the conversations it fetched before. */
  const [historyVersion, setHistoryVersion] = useState(0);
  const [recentOpen, setRecentOpen] = useState(() => {
    try {
      return window.localStorage.getItem(RECENTS_KEY) !== "0";
    } catch (e) {
      return true;
    }
  });
  /* Where Velora was opened: a patient's page or the common space. That
     place keeps its card in the history for the whole visit, even after
     the chat moves to another patient, so the doctor can switch back. */
  const [anchor, setAnchor] = useState(null);
  useEffect(() => {
    if (!isOpenNow) {
      setAnchor(null);
      return;
    }
    setAnchor(patientUid ? { id: patientUid, label: (lastPatient && lastPatient.label) || null } : { home: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenNow]);
  /* The page patient's name can arrive a moment after opening. */
  useEffect(() => {
    if (anchor && anchor.id && !anchor.label && patientUid === anchor.id && lastPatient && lastPatient.label) {
      setAnchor({ id: anchor.id, label: lastPatient.label });
    }
  }, [anchor, patientUid, lastPatient]);
  /* Every opening starts with the history open; a collapse lasts for that
     visit only. */
  useEffect(() => {
    if (isOpenNow) setRecentOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenNow]);
  useEffect(() => {
    try {
      window.localStorage.setItem(RECENTS_KEY, recentOpen ? "1" : "0");
    } catch (e) {
      /* storage blocked: the sidebar simply opens by default next time */
    }
  }, [recentOpen]);
  const [restoring, setRestoring] = useState(false);
  const restoreConversation = useCallback(
    (row) => {
      if (!row || !row.session_id || !copilot) return undefined;
      setRestoring(true);
      /* Returned, and a failure re-thrown: the history list shows a failed
         row inline ("did not open, try again") instead of closing on the
         doctor as if it had worked. */
      return restoreCopilotSession(row.session_id)
        .then((data) => {
          const clinic = (data && data.mode) === "find_patients";
          const restoredGroup = data.scope === "mine" ? "mine" : "all";
          const uid = clinic ? clinicScopeId(restoredGroup) : String(data.patientUid || (data.patient && data.patient.patientUid) || "");
          if (!clinic && !uid) throw new Error("That conversation has no patient to open.");

          const messages = [];
          (data.turns || []).forEach((turn) => {
            const question = String((turn && turn.question) || "").trim();
            if (question) {
              messages.push({
                id: `${row.session_id}-q-${messages.length}`,
                role: "user",
                text: question,
                createdAt: new Date((row.updated_at || 0) * 1000).toISOString(),
              });
            }
            const reply = replyFromResult(data.mode, turn && turn.result, question);
            if (reply) {
              messages.push({
                id: `${row.session_id}-a-${messages.length}`,
                role: "assistant",
                text: reply.text,
                rxOutput: reply.rxOutput,
                createdAt: new Date((row.updated_at || 0) * 1000).toISOString(),
                feedbackGiven: null,
              });
            }
          });

          /* The thread and the session it belongs to are restored together,
             the same pairing the store keeps for live conversations. */
          const key = uid;
          setSession(key, { sessionId: data.session_id, lastRequestId: data.last_request_id || null });
          /* A hospital search reopened in the other hospital scope: switch
             scope and park the thread where the switch will pick it up. */
          if (clinic && restoredGroup !== groupRef.current) {
            setThreads((prev) => ({ ...prev, [`__group_${restoredGroup}`]: messages }));
            setHospitalGroup(restoredGroup);
          } else {
            setThreads((prev) => ({ ...prev, [clinic ? HOMEPAGE_COMMON_ID : uid]: messages }));
          }

          copilot.open({
            presentation: copilot.presentation,
            ...(clinic
              ? { patientId: undefined, patientLabel: undefined }
              : { patientId: uid, patientLabel: (data.patient && data.patient.patientName) || undefined }),
          });
          /* The sidebar stays where it is in the full view; only the
             dropdown's overlay, which covers the thread, steps aside. */
          if (copilot.presentation !== COPILOT_FULL) setRecentOpen(false);
        })
        .finally(() => setRestoring(false));
    },
    [copilot]
  );
  /* "All my patients" and "All hospital patients" are two conversations
     shown in the one clinic slot. Changing scope parks the thread on screen
     under its scope and brings the other scope's thread back. */
  const group = useHospitalGroup();
  const groupRef = useRef(group);
  useEffect(() => {
    const prev = groupRef.current;
    if (prev === group) return;
    groupRef.current = group;
    setThreads((t) => {
      const next = { ...t, [`__group_${prev}`]: t[HOMEPAGE_COMMON_ID] || [] };
      next[HOMEPAGE_COMMON_ID] = t[`__group_${group}`] || [];
      delete next[`__group_${group}`];
      return next;
    });
  }, [group]);
  const withRestored = useCallback((state, id) => {
    if (!id || Object.prototype.hasOwnProperty.call(state, id)) return state;
    const restored = loadThread(id);
    return restored ? { ...state, [id]: restored } : state;
  }, []);
  /* With no patient, the thread being kept is the clinic conversation, which
     the panel files under its own common id. */
  const threadKey = patientUid || HOMEPAGE_COMMON_ID;
  /* The service session behind the thread on screen, which is how the
     history list knows which of its rows is "this conversation". */
  const activeSessionId =
    (getSession(patientUid ? patientUid : clinicScopeId(group)) || {}).sessionId || null;

  /* Idle past the window: the session has reset, so the thread on screen
     must too, or the doctor would read on from a conversation the service no
     longer holds. Checked whenever Copilot opens or the patient changes. */
  useEffect(() => {
    if (!threadKey) return;
    setThreads((prev) => {
      const held = prev[threadKey];
      if (!held || !held.length || hasLiveConversation(threadKey)) return prev;
      const next = { ...prev };
      delete next[threadKey];
      return next;
    });
  }, [threadKey, isOpenNow]);
  /* Recomputed on open as well: the stored entry can expire while nothing in
     this component changed, and a memo keyed only on state would keep
     showing the expired thread. */
  /* The latest answer always ends with what to ask next. Answers carry
     their follow-ups only when first asked, so a conversation reopened from
     history, or kept across a reload, came back with none; the next
     questions are filled in from the same lists a live answer uses: this
     chart's starters, or the hospital searches. */
  const threadView = useMemo(
    () => {
      const view = withRestored(threads, threadKey);
      const list = view[threadKey];
      if (!Array.isArray(list) || !list.length) return view;
      const last = list[list.length - 1];
      if (!last || last.role !== "assistant" || (last.suggestions && last.suggestions.length)) return view;
      const asked = [...list].reverse().find((m) => m.role === "user");
      const question = String((asked && asked.text) || "").trim().toLowerCase();
      const next = patientUid
        ? (starterPrompts || [])
            .filter((p) => String(p.label || "").trim().toLowerCase() !== question)
            .slice(0, 3)
            .map((p) => ({ label: p.short || p.label, message: p.label }))
        : clinicFollowUps(question);
      if (!next.length) return view;
      return { ...view, [threadKey]: [...list.slice(0, -1), { ...last, suggestions: next }] };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, threadKey, withRestored, isOpenNow, starterPrompts, patientUid]
  );
  /**
   * Starting over, and clearing.
   *
   * Three things a doctor can do from the panel's menu, all about the scope
   * on screen. "New chat" starts a fresh conversation and keeps the old one
   * in Recent conversations for the rest of the day. "Clear this chat" does
   * the same and also takes the old one out of that list. "Clear today's
   * history" empties every conversation and the list. None of them changes
   * which patient or scope Velora is on.
   */
  const scopeSessionKey = patientUid ? patientUid : clinicScopeId(group);
  const startNewChat = useCallback(() => {
    forgetThread(threadKey);
    if (scopeSessionKey !== threadKey) forgetThread(scopeSessionKey);
    setThreads((prev) => ({ ...prev, [threadKey]: [] }));
  }, [threadKey, scopeSessionKey]);
  /* Start a scope over: its thread and its service session go, so the next
     question opens a new conversation. Used by "New chat" in the sidebar,
     which picks the patient (or hospital scope) first. When the hospital
     scope is the target but a different group is on screen now, the parked
     copy of that group's thread is cleared instead. */
  const startFresh = useCallback(
    (threadId, sessionId, groupKey) => {
      forgetThread(threadId);
      if (sessionId && sessionId !== threadId) forgetThread(sessionId);
      setThreads((prev) => {
        const next = { ...prev };
        if (groupKey && groupKey !== groupRef.current) next[`__group_${groupKey}`] = [];
        else next[threadId] = [];
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  /* A conversation deleted from its row menu: hidden from history, removed
     from demo data, and if it is a thread held here, forgotten too. */
  const deleteConversation = useCallback(
    (row) => {
      if (!row) return;
      hideSession(row.session_id);
      if (isCopilotMock()) clearMockSessions([row.session_id]);
      setHistoryVersion((v) => v + 1);
      const clinic = row.mode === "find_patients";
      if (clinic) {
        const g = row.scope === "mine" ? "mine" : "all";
        if ((getSession(clinicScopeId(g)) || {}).sessionId === row.session_id) startFresh(HOMEPAGE_COMMON_ID, clinicScopeId(g), g);
      } else {
        const uid = String((row.patient && row.patient.patientUid) || "");
        if (uid && (getSession(uid) || {}).sessionId === row.session_id) startFresh(uid, uid);
      }
    },
    [startFresh]
  );
  const clearThisChat = useCallback(() => {
    const id = (getSession(scopeSessionKey) || {}).sessionId;
    if (id) {
      hideSession(id);
      if (isCopilotMock()) clearMockSessions([id]);
    }
    startNewChat();
  }, [scopeSessionKey, startNewChat]);
  const clearToday = useCallback(() => {
    clearHistoryNow();
    if (isCopilotMock()) clearMockSessions();
    forgetAllThreads();
    setThreads({ [threadKey]: [] });
    setHistoryVersion((v) => v + 1);
  }, [threadKey]);
  const scopeName = patientUid
    ? `${firstNameOf((lastPatient && lastPatient.label) || "") || "this patient"}'s chart`
    : hospitalGroupLabel(group);

  /**
   * What is waiting in the other scope.
   *
   * A switch is cheap to make and, without this, impossible to predict: the
   * doctor cannot tell whether they are about to land in the search they left
   * half-finished or in an empty panel. The switcher says which, per scope,
   * before the switch - the stored thread is read for the scope that is not
   * on screen, since only the active one is folded into state.
   */
  const questionCount = useCallback(
    (id) => {
      if (!id) return 0;
      const thread = Object.prototype.hasOwnProperty.call(threads, id) ? threads[id] : loadThread(id);
      return (thread || []).filter((m) => m && m.role === "user").length;
    },
    [threads]
  );

  /* A thread restored from the 24-hour store was only ever shown, never
     held: after a reload the hospital conversation lived in the view alone,
     and the next change built on an empty copy and saved it over the stored
     one, which is how a whole morning's searches vanished. Held as soon as
     it is shown, and every change starts from the full thread. */
  useEffect(() => {
    setThreads((prev) => withRestored(withRestored(prev, threadKey), HOMEPAGE_COMMON_ID));
  }, [threadKey, withRestored]);

  /* Every question asked, across all held threads: the history refreshes
     on it, so the conversation just used moves to the top. */
  const questionsAsked = useMemo(
    () => Object.values(threads).reduce((n, list) => n + (Array.isArray(list) ? list.filter((m) => m && m.role === "user").length : 0), 0),
    [threads]
  );

  /* The hospital chat's last question and when it was asked, for its card. */
  /* The collapsed header's new-chat button: open the sidebar on its picker. */
  const [newChatPending, setNewChatPending] = useState(false);
  const homeLast = useMemo(() => {
    const list = Array.isArray(threads[HOMEPAGE_COMMON_ID]) ? threads[HOMEPAGE_COMMON_ID] : [];
    const q = [...list].reverse().find((m) => m && m.role === "user");
    return q ? { text: q.text || q.content || "", at: q.createdAt ? Date.parse(q.createdAt) : 0 } : null;
  }, [threads]);

  const onThreadsChange = useCallback(
    (update) =>
      setThreads((prev0) => {
        const prev = withRestored(withRestored(prev0, threadKey), HOMEPAGE_COMMON_ID);
        const next = typeof update === "function" ? update(prev) : update;
        Object.keys(next).forEach((id) => {
          if (next[id] !== prev0[id]) saveThread(id, next[id]);
        });
        return next;
      }),
    [threadKey, withRestored]
  );
  const chartReply = useCopilotReply({ patientUid, enabled: !!patientUid, starters: starterPrompts });

  /**
   * Which way the conversation moves when the scope changes.
   *
   * Going into a patient (from a list, the picker, or a named-patient card)
   * is forward: the new chat slides in from the right. Coming back out to a
   * hospital scope is back: it slides in from the left. Spatial, like moving
   * between pages, so the doctor always knows which way they went.
   */
  const [threadMotion, setThreadMotion] = useState("none");
  const scopeRef = useRef(null);

  useEffect(() => {
    const now = {
      id: patientUid || null,
      group: patientUid ? null : group,
      label: patientUid ? (lastPatient && lastPatient.label) || null : null,
    };
    const prev = scopeRef.current;
    scopeRef.current = now;
    if (!prev || (prev.id === now.id && prev.group === now.group)) return;
    setThreadMotion(now.id ? "forward" : prev.id ? "back" : "forward");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientUid, group]);
  /* No back control: every conversation is in the history sidebar, which
     is where the doctor moves between them. */

  /* A question that names a different patient is offered their chart
     before anything is asked: the answer is in that chart, not this one.
     Only for a question about one person - "patients" in it means a search. */
  const bridgeFor = useCallback(
    (message) =>
      /\bpatients\b/i.test(String(message || ""))
        ? Promise.resolve(null)
        : findPatientsNamed(message, { lowerCase: !patientUid })
            .then((named) => {
              if (!named) return null;
              /* In a patient's own chat, their own name means them. */
              const current = String((lastPatient && lastPatient.label) || "").toLowerCase();
              if (patientUid && current && named.name && current.split(/\s+/).includes(String(named.name).toLowerCase().split(/\s+/)[0])) {
                return null;
              }
              /* Named, but nobody by that name: the search opens on it with
                 nothing found, so the doctor corrects it there rather than
                 getting a search across every patient. Hospital chats only;
                 inside a chart an unmatched word is just part of the question. */
              if (!named.patients.length) {
                if (patientUid) return null;
                return {
                  text: `I could not find a patient matching “${named.name}”. Search for them below by name, patient ID or mobile number.`,
                  rxOutput: { kind: "patient_bridge", data: { patients: [], question: message, name: named.name } },
                };
              }
              const others = named.patients.filter((p) => String(p.id) !== String(patientUid || ""));
              if (!others.length) return null;
              const several = others.length > 1;
              return {
                text: patientUid
                  ? several
                    ? `That question is about ${named.name}, not this patient. More than one patient has that name, so choose the right one.`
                    : `That question is about ${named.name}, not this patient. Their own chart can answer it.`
                  : several
                    ? "That question is about one patient, and more than one patient has that name. Choose the right one."
                    : "That question is about one patient. Their chart can answer it.",
                rxOutput: { kind: "patient_bridge", data: { patients: others, question: message, name: named.name } },
              };
            })
            .catch(() => null),
    [patientUid, lastPatient]
  );

  /* A question about a group of patients, asked inside one patient's chat,
     is answered right here, from the hospital search, and the chat stays
     this patient's. The answer says it is drawn from all patients; opening a
     patient from it is what moves the doctor on, to that patient's chat.
     No switch to undo, so nothing to go back from. */
  const answerAcrossPatients = useCallback(
    (question) => {
      const from = firstNameOf((lastPatient && lastPatient.label) || "") || "this patient";
      return Promise.resolve(clinicReply(question)).then((reply) => {
        if (!reply) return reply;
        if (reply.rxOutput && reply.rxOutput.kind === "patient_matches") {
          return {
            ...reply,
            rxOutput: {
              ...reply.rxOutput,
              data: { ...reply.rxOutput.data, askedFrom: from },
            },
            suggestions: clinicFollowUps(question),
          };
        }
        return reply;
      });
    },
    [clinicReply, lastPatient]
  );

  const copilotReply = useCallback(
    (message, pid, options) => {
      if (isCohortQuestion(message)) return answerAcrossPatients(message);
      return bridgeFor(message).then((bridge) => bridge || chartReplyAndMove(message, pid, options));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bridgeFor, chartReply, answerAcrossPatients]
  );

  /* Hospital answers end with the next searches worth running, as chart
     answers end with the chart's next questions: the other starters, minus
     the one just asked. */
  const clinicReplyWithBridge = useCallback(
    (message, pid, options) => {
      const withNext = (reply) =>
        reply && !reply.suggestions && reply.rxOutput && reply.rxOutput.kind === "patient_matches"
          ? { ...reply, suggestions: clinicFollowUps(message) }
          : reply;
      return options && options.more
        ? Promise.resolve(clinicReply(message, pid, options)).then(withNext)
        : bridgeFor(message).then((bridge) => bridge || Promise.resolve(clinicReply(message, pid, options)).then(withNext));
    },
    [bridgeFor, clinicReply]
  );

  /* The chart can still decide a question was about other patients (the
     service's own "other_patient" answer). Then the same thing happens as
     for a question recognised up front: answered here, across patients. */
  function chartReplyAndMove(message, pid, options) {
    const pending = chartReply(message, pid, options);
    if (!pending || typeof pending.then !== "function") return pending;
    return pending.then((reply) =>
      reply && reply.autoSwitch && reply.autoSwitch.target === "clinic"
        ? answerAcrossPatients(reply.autoSwitch.question || message)
        : reply
    );
  }

  /**
   * VoiceRx on the consultation.
   *
   * The Rx pad page publishes its live sync and voice context through the
   * bridge; only there does Copilot carry VoiceRx. While a VoiceRx session is
   * recording or processing, closing Copilot hides it instead of unmounting
   * it - unmounting would end the recording - and the Rx pad's live-session
   * button takes over (pause, submit, reopen), exactly as the Rx pad's Dr.
   * Agent behaved when collapsed mid-consultation.
   */
  const bridge = useCopilotRxPadBridge();
  const rxPadBridge = isRxPad && bridge ? bridge : null;
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [voiceCollapsed, setVoiceCollapsed] = useState(false);
  /* VoiceRx lives in the sidebar. A request from the popup (start a
     consultation, or open its notes) switches Copilot to the sidebar and is
     handed to the sidebar panel once it mounts. */
  const [pendingVoiceRx, setPendingVoiceRx] = useState(null);
  const moveVoiceRxToSidebar = useCallback(
    (request) => {
      setPendingVoiceRx({ ...request, id: Date.now() });
      if (copilot) copilot.open({ presentation: COPILOT_DOCK });
    },
    [copilot]
  );
  const handlePendingVoiceRx = useCallback(
    (id) => setPendingVoiceRx((current) => (current && current.id === id ? null : current)),
    []
  );
  /* Closing plays the open in reverse: the popup shrinks back to the
     centre and the scrim fades, over the shared exit duration, and only
     then unmounts. It used to vanish on the frame of the click, which read
     as something breaking rather than something closing. */
  const [leaving, setLeaving] = useState(false);
  const leaveTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(leaveTimerRef.current), []);
  const requestClose = useCallback(() => {
    if (voiceSessionActive) {
      setVoiceCollapsed(true);
      return;
    }
    if (!copilot) return;
    const modal = copilot.presentation === COPILOT_FULL || copilot.presentation === COPILOT_MODAL;
    if (!modal) {
      copilot.close();
      return;
    }
    setLeaving(true);
    clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setLeaving(false);
      copilot.close();
    }, 150);
  }, [voiceSessionActive, copilot]);
  useEffect(() => {
    if (voiceSessionActive || !voiceCollapsed) return;
    /* The session finished while hidden: its result is in the thread, so the
       hidden panel can close for real. */
    setVoiceCollapsed(false);
    if (copilot) copilot.close();
  }, [voiceSessionActive, voiceCollapsed, copilot]);

  const isOpen = !!(copilot && copilot.isOpen);
  const isSheet = !!(copilot && copilot.presentation === COPILOT_MODAL);
  const isFull = !!(copilot && copilot.presentation === COPILOT_FULL);
  const isModal = isSheet || isFull;
  const anchorRect = useAnchorRect(copilot && copilot.anchorEl, isOpen && isSheet);

  /* While the rail is out, the page gives up its width. Removed on close and
     on unmount, so a route change never leaves the app indented. */
  useEffect(() => {
    const docked = !!(copilot && copilot.isOpen) && copilot.presentation === COPILOT_DOCK && !voiceCollapsed;
    if (!docked) return undefined;
    document.body.classList.add("copilot-docked");
    return () => document.body.classList.remove("copilot-docked");
  }, [copilot, voiceCollapsed]);

  // Close the popup on Escape. The dock is persistent and ignores it, matching
  // how the rest of the app treats a docked panel versus an overlay.
  useEffect(() => {
    if (!copilot || !isOpen || !isModal) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copilot, isOpen, isModal, requestClose]);

  // Opening the popup should land the doctor on a ready cursor: they came here
  // from a search box, so asking is the next thing they intend to do. The panel
  // owns its own input and is lazily loaded, so the textarea is not there on the
  // first frame. Poll briefly rather than guessing a delay, and stop as soon as
  // it takes (or the doctor has clicked something else themselves).
  useEffect(() => {
    if (!isOpen || !isModal) return undefined;

    let tries = 0;
    const id = setInterval(() => {
      const root = surfaceRef.current;
      const el = root && root.querySelector("textarea");
      const movedOn = document.activeElement && root && root.contains(document.activeElement);
      if (el && !movedOn) el.focus();
      if ((el && document.activeElement === el) || movedOn || ++tries > 24) clearInterval(id);
    }, 50);

    return () => clearInterval(id);
  }, [isOpen, isModal]);

  /* After a scope switch, the cursor goes where the next question is typed.
     Switching is done to ask something; leaving focus on the tag, or nowhere
     after a mouse pick, made the doctor click into the field first. Not on
     the first render: opening has its own focus above. */
  const scopeFocusRef = useRef(threadKey);
  useEffect(() => {
    if (scopeFocusRef.current === threadKey) return undefined;
    scopeFocusRef.current = threadKey;
    if (!isOpen) return undefined;
    let tries = 0;
    const id = setInterval(() => {
      const root = surfaceRef.current;
      const el = root && root.querySelector("textarea");
      if (el && !el.disabled) {
        el.focus({ preventScroll: true });
        clearInterval(id);
      } else if (++tries > 24) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [threadKey, isOpen]);

  if (!copilot || typeof document === "undefined") return null;

  const SyncHost = rxPadBridge ? RxPadSyncContext.Provider : RxPadSyncProvider;
  const syncHostProps = rxPadBridge ? { value: rxPadBridge.sync } : {};
  const panel = (
    <SyncHost {...syncHostProps}>
      <DrAgentPanel
        mode="homepage"
        initialPatientId={copilot.patientId}
        persistedMessagesByPatient={threadView}
        onPersistedMessagesChange={onThreadsChange}
        homepagePatients={patients}
        autoMessage={copilot.autoMessage}
        autoMessageTrigger={copilot.autoMessageTrigger}
        onAutoMessageConsumed={copilot.consumeAutoMessage}
        autoDictateTrigger={copilot.autoDictateTrigger}
        /* Always the live service. Without an override the panel would fall
           back to its bundled demo engines and invent a chart. */
        replyOverride={patientUid ? copilotReply : clinicReplyWithBridge}
        threadMotion={threadMotion}
        hideBrand={isFull && recentOpen}
        headerEnd={
          isFull && !recentOpen ? (
            <NewChatButton
              onClick={() => {
                setNewChatPending(true);
                setRecentOpen(true);
              }}
            />
          ) : null
        }
        headerLeading={
          isFull && !recentOpen ? (
            <SidebarToggle onClick={() => setRecentOpen(true)} />
          ) : null
        }
        /* A patient list can now appear in a patient's chat too, so opening
           a patient from it works in every scope. */
        onOpenPatient={openPatientFromResult}
        /* Said in both scopes, in the same place: the panel used to leave
           the patient implied and only label the hospital-wide one. */
        scopeStrip={
          <>
          <CopilotContextBar
            clinic={!patientUid}
            patientName={(lastPatient && lastPatient.label) || (patientUid ? "This patient" : null)}
            patientMeta={patientUid ? lastPatient && lastPatient.meta : null}
            /* Today's appointments, which is the list a doctor picks from,
               with everyone else reachable through the search over it. In
               demo mode the picker brings its own invented list, and real
               appointment rows must not be mixed into it. */
            patients={isCopilotMock() ? [] : patients}
            activePatientId={patientUid}
            group={group}
            onPickClinic={(g, opts) => {
              const want = g || "all";
              /* From "New chat": a fresh conversation for that scope, not the
                 one it already holds. */
              if (opts && opts.fresh) startFresh(HOMEPAGE_COMMON_ID, clinicScopeId(want), want);
              setHospitalGroup(want);
              switchToClinic();
            }}
            onPickPatient={(p, opts) => {
              if (opts && opts.fresh && p && p.id) startFresh(String(p.id), String(p.id));
              openPatientFromResult(p && p.id, { patientName: p && p.label });
            }}
            patientQuestions={questionCount(lastPatient && lastPatient.id)}
            clinicQuestions={questionCount(HOMEPAGE_COMMON_ID)}
          />
          </>
        }
        recentOverlay={
          recentOpen && !isFull ? (
            <CopilotRecentSessions
              onPick={restoreConversation}
              onClose={() => setRecentOpen(false)}
              activeSessionId={activeSessionId}
            />
          ) : null
        }
        busy={restoring}
        /* The starter questions are what Copilot offers wherever it has a
           patient in scope - not only where an archive MRN happens to be
           configured. They are the questions themselves, in the doctor's
           words; the old feature cards named tools instead. */
        welcomeSuggestions={patientUid ? starterPrompts : CLINIC_STARTERS}
        /* No live service reads attachments yet, and the only thing behind
           this control is a demo document engine. */
        allowAttach={false}
        lockPatient={!!copilot.patientId}
        /* The dock gets the same bare, glowing composer as the popup. Docked,
           it was a white plate laid over the panel's own wash with a hard
           seam across it and no glow at all. */
        composerGlow
        roomy={isFull}
        allowVoiceRx={!!(rxPadBridge && rxPadBridge.enabled)}
        voiceRx={rxPadBridge}
        isPanelVisible={!voiceCollapsed}
        onVoiceSessionChange={setVoiceSessionActive}
        voiceRxInPopup={isModal}
        onMoveVoiceRxToSidebar={moveVoiceRxToSidebar}
        pendingVoiceRx={isModal ? null : pendingVoiceRx}
        onPendingVoiceRxHandled={handlePendingVoiceRx}
        onClose={requestClose}
      />
    </SyncHost>
  );

  const sync = rxPadBridge && rxPadBridge.sync;
  const collapsedSession = sync && sync.collapsedVoiceSession;
  /* The Rx pad's page aura while copying to it, and while a session runs
     collapsed - the same backdrop its Dr. Agent drew. */
  const pageAura = sync && (sync.copyOverlayActive || (voiceCollapsed && collapsedSession && collapsedSession.active)) ? (
    <div
      className={[runtimeStyles.activeBackdrop, sync.copyOverlayActive && !voiceCollapsed ? runtimeStyles.copyBackdrop : ""]
        .filter(Boolean)
        .join(" ")}
      data-dr-agent="true"
      aria-hidden="true"
    />
  ) : null;

  /* No floating tab anywhere. Every screen that can open Velora has its
     own way in, in its header: the top bar on the clinic pages, the search
     field on the patient page and the consultation. A tab on the right edge
     was a second entry to the same popup, sitting on top of the page's own
     controls, and on the Rx pad it collided with VoiceRx's. */
  if (!isOpen) return null;


  return createPortal(
    <div id="dr-copilot-root" className="dr-copilot-scope">
      {pageAura}
      {voiceCollapsed && collapsedSession && (
        <VoiceSessionFab
          activeVoiceSession
          activeVoicePaused={!!collapsedSession.paused}
          activeVoiceStatusLabel={collapsedSession.statusLabel}
          activeVoiceElapsedLabel={collapsedSession.elapsedLabel}
          activeVoiceAudioLevel={collapsedSession.audioLevel}
          onPauseToggle={sync.requestVoicePauseToggle}
          onActiveSubmit={() => {
            setVoiceCollapsed(false);
            sync.requestVoiceSubmit();
          }}
          onClick={() => setVoiceCollapsed(false)}
        />
      )}
      <div style={voiceCollapsed ? { visibility: "hidden", pointerEvents: "none" } : undefined} aria-hidden={voiceCollapsed || undefined}>
      {isModal ? (
        <div
          className={[isFull ? styles.overlayFull : styles.overlay, leaving ? styles.overlayLeaving : ""]
            .filter(Boolean)
            .join(" ")}
          onMouseDown={requestClose}
        >
          <div
            className={[
              isFull ? styles.full : styles.sheet,
              leaving ? (isFull ? styles.fullLeaving : styles.sheetLeaving) : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={isFull ? undefined : sheetStyle(anchorRect)}
            ref={surfaceRef}
            role="dialog"
            aria-label="Velora"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {!isFull && <PanelControls copilot={copilot} isFull={isFull} onClose={requestClose} lockPresentation={voiceSessionActive} onRecent={() => setRecentOpen((v) => !v)} recentOpen={recentOpen} onNewChat={startNewChat} onClearChat={clearThisChat} onClearToday={clearToday} scopeName={scopeName} />}
            {/* History on the left, as a chat app keeps it: open by default,
                collapsed from its own top-left corner, and reopened from the
                same corner of the conversation. In the dropdown it overlays
                instead, with a way back. */}
            {isFull && recentOpen && (
              <CopilotRecentSessions
                variant="sidebar"
                openNewChat={newChatPending}
                pinned={anchor && anchor.id && anchor.label ? { id: anchor.id, label: anchor.label } : null}
                homeAnchored={!!(anchor && anchor.home)}
                onOpenPatient={(p) => openPatientFromResult(p.id, { patientName: p.label })}
                onNewChatOpened={() => setNewChatPending(false)}
                onPick={restoreConversation}
                onClose={() => setRecentOpen(false)}
                onStartChat={(choice) => {
                  if (choice.kind === "scope") {
                    setHospitalGroup(choice.group);
                    switchToClinic();
                  } else if (choice.patient) {
                    openPatientFromResult(choice.patient.id, { patientName: choice.patient.label });
                  }
                }}
                onDelete={deleteConversation}
                onClearAll={clearToday}
                refreshKey={`${historyVersion}:${questionsAsked}`}
                current={patientUid ? { id: patientUid, label: (lastPatient && lastPatient.label) || "This patient" } : null}
                homeRow={{
                  label: hospitalGroupLabel(group),
                  sub: (homeLast && homeLast.text) || (group === "mine" ? "Find patients among the ones you treat" : "Find patients across the hospital"),
                  updatedAt: (homeLast && homeLast.at) || 0,
                  mine: group === "mine",
                  active: !patientUid,
                  onOpen: () => switchToClinic(),
                  onClear: () => {
                    const id = (getSession(clinicScopeId(group)) || {}).sessionId;
                    if (id) {
                      hideSession(id);
                      if (isCopilotMock()) clearMockSessions([id]);
                    }
                    startFresh(HOMEPAGE_COMMON_ID, clinicScopeId(group), group);
                    setHistoryVersion((v) => v + 1);
                  },
                }}
                activeSessionId={activeSessionId}
              />
            )}
            {/* Citations open the evidence sidebar over the page. The dock
                gets no provider and expands evidence in place instead. */}
            <EvidenceViewerProvider>
              <CopilotSurface panel={panel} />
            </EvidenceViewerProvider>
          </div>
          {/* The popup's close floats outside it, on the veil, so it reads as
              closing Velora and not as closing the chat in front. */}
          {isFull && (
            <div className={styles.floatingControls} onMouseDown={(e) => e.stopPropagation()}>
              <PanelControls copilot={copilot} isFull={isFull} onClose={requestClose} lockPresentation={voiceSessionActive} onRecent={() => setRecentOpen((v) => !v)} recentOpen={recentOpen} onNewChat={startNewChat} onClearChat={clearThisChat} onClearToday={clearToday} scopeName={scopeName} />
            </div>
          )}
        </div>
      ) : (
        <aside className={styles.dock} ref={surfaceRef} aria-label="Velora">
          <EvidenceViewerProvider>
            <PanelControls copilot={copilot} isFull={false} onClose={requestClose} lockPresentation={voiceSessionActive} onRecent={() => setRecentOpen((v) => !v)} recentOpen={recentOpen} onNewChat={startNewChat} onClearChat={clearThisChat} onClearToday={clearToday} scopeName={scopeName} />
            <CopilotSurface panel={panel} />
          </EvidenceViewerProvider>
        </aside>
      )}
      </div>
    </div>,
    document.body
  );
}

/**
 * Copilot, and the evidence sidebar over it when a citation is open.
 *
 * Reads the viewer from context rather than taking props, so nothing between
 * here and a citation tag has to thread state it does not care about.
 */
function CopilotSurface({ panel }) {
  const viewer = useEvidenceViewer();
  const state = viewer && viewer.state;

  return (
    <>
      {panel}
      {state && (
        <EvidencePanel
          cited={state.cited}
          documents={state.documents}
          activeNumber={state.activeNumber}
          onSelect={viewer.select}
          onClose={viewer.close}
        />
      )}
    </>
  );
}

/**
 * Tracks the search field's box so the panel can hang directly off it.
 *
 * Measured rather than guessed: the same field sits in two different headers
 * (patient detail and the consultation RxPad) at different offsets, and the
 * page behind can scroll while the panel is open.
 */
function useAnchorRect(anchorEl, active) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!active || !anchorEl) {
      setRect(null);
      return undefined;
    }
    const measure = () => {
      const r = anchorEl.getBoundingClientRect();
      /* The field's own top, not its bottom: the panel takes the search box's
         place rather than hanging under it, which is what makes opening read
         as the box turning into the panel. */
      /* Below the field, not over it: the bar stays on screen in a quiet
         state, naming what the panel underneath is talking about. */
      setRect({ left: r.left, width: r.width, top: r.bottom + 8 });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorEl, active]);

  return rect;
}

/**
 * Without an anchor - Copilot opened from somewhere with no search box - the
 * panel centres itself near the top of the viewport, which is where a dropdown
 * would have landed anyway.
 */
function sheetStyle(rect) {
  if (!rect) {
    /* Centred with margin rather than a transform: the open animation ends on
       `transform: none`, which cancelled a centring translate and made the
       panel jump sideways as it landed. */
    const width = "min(880px, 92vw)";
    return { top: 76, left: "50%", marginLeft: `calc(${width} / -2)`, width };
  }
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    maxHeight: `calc(100vh - ${Math.round(rect.top)}px - 20px)`,
  };
}

/**
 * The panel's own chrome: expand, and close.
 *
 * Sits above the ported AgentHeader rather than inside it, so that component
 * stays byte-identical to source; the header's own minimize control is hidden
 * from CSS in these presentations, because these two say the same things
 * better. Expand blows the dropdown up to a near-full-page view and back;
 * close is a cross, which is what a cross means.
 */
/**
 * The panel's menu: starting over and clearing, for the scope on screen.
 *
 * Three dots beside close, because these are about the conversation, not
 * the page. Every item names the scope it acts on, and the one that cannot
 * be undone asks once before it does anything.
 */
function MoreMenu({ scopeName, onNewChat, onClearChat, onClearToday }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  const run = (fn) => () => {
    setOpen(false);
    if (fn) fn();
  };

  const itemBase =
    "group/mi flex w-full items-center gap-[10px] rounded-[10px] px-[8px] py-[8px] text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-tp-blue-500";
  const item = `${itemBase} hover:bg-tp-slate-50`;
  /* Deleting items warm to red on hover, so the row being pointed at says
     what it will do before it is pressed. */
  const dangerItem = `${itemBase} hover:bg-tp-error-50`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <ControlTip title="More options" body="Start a new chat, or clear this chat or today's history." disabled={open}>
      <button
        type="button"
        className={styles.control}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More options"
      >
        <CopilotIcon asset="settings/3-dots-more" family="straight" variant="bold" size={17} style={{ transform: "rotate(90deg)" }} />
      </button>
      </ControlTip>
      {open && (
        <div
          role="menu"
          className="copilot-menu-in absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] overflow-hidden rounded-[14px] border-[1px] border-tp-slate-200 bg-white p-[6px] shadow-[0_18px_44px_-14px_rgba(15,23,42,0.32)]"
        >
          {!confirming ? (
            <>
              <button type="button" role="menuitem" className={item} onClick={run(onNewChat)}>
                <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] bg-tp-blue-50 text-tp-blue-600">
                  <CopilotIcon name="message-add" variant="linear" size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-tp-slate-800">New chat</span>
                  <span className="block text-[11.5px] leading-[15px] text-tp-slate-500">
                    Start fresh with {scopeName}. This one stays in Recent conversations for today.
                  </span>
                </span>
              </button>
              {/* Both clears delete, so both are red, and they sit together
                  under the divider, apart from New chat which deletes nothing. */}
              <div className="my-[4px] border-t border-tp-slate-100" />
              <button type="button" role="menuitem" className={dangerItem} onClick={run(onClearChat)}>
                <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] bg-tp-error-50 text-tp-error-600 transition-colors group-hover/mi:bg-white">
                  <CopilotIcon name="message-remove" variant="linear" size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-tp-error-700">Clear this chat</span>
                  <span className="block text-[11.5px] leading-[15px] text-tp-error-400">
                    Removes this conversation with {scopeName} from today&apos;s history.
                  </span>
                </span>
              </button>
              <button type="button" role="menuitem" className={dangerItem} onClick={() => setConfirming(true)}>
                <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] bg-tp-error-50 text-tp-error-600 transition-colors group-hover/mi:bg-white">
                  <CopilotIcon name="trash" variant="linear" size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-tp-error-700">Clear today&apos;s history</span>
                  <span className="block text-[11.5px] leading-[15px] text-tp-error-400">
                    Removes every conversation from today, for all patients.
                  </span>
                </span>
              </button>
            </>
          ) : (
            <div className="p-[8px]">
              <p className="m-0 text-[13px] font-semibold text-tp-slate-800">Clear all of today&apos;s conversations?</p>
              <p className="m-0 mt-[4px] text-[12px] leading-[17px] text-tp-slate-600">
                Every conversation from today, for every patient and for All hospital patients, is removed. This
                cannot be undone.
              </p>
              <div className="mt-[12px] flex justify-end gap-[8px]">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="h-[32px] rounded-[10px] px-[12px] text-[12.5px] font-semibold text-tp-slate-700 hover:bg-tp-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={run(onClearToday)}
                  className="h-[32px] rounded-[10px] bg-tp-error-600 px-[12px] text-[12.5px] font-semibold text-white hover:bg-tp-error-700"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PanelControls({
  copilot,
  isFull,
  onClose,
  lockPresentation = false,
  onRecent,
  recentOpen = false,
  onNewChat,
  onClearChat,
  onClearToday,
  scopeName,
}) {
  return (
    /* With history open beside the full view, the controls belong to the
       conversation, not to the history column: they move left with the
       conversation's edge instead of floating over the column's header. */
    <div className={styles.controls}>
      {/* The doctor's earlier conversations, both scopes, kept 30 days by the
          service. Beside close because it is about this panel's history. */}
      {onRecent && !isFull && (
        <ControlTip
          title={recentOpen ? "Hide recent conversations" : "Recent conversations"}
          body={recentOpen ? "Close the list of your conversations." : "Reopen any conversation, for a patient or for a search."}
        >
        <button
          type="button"
          className={styles.control}
          onClick={onRecent}
          /* A toggle, and it says which way it is: pressed and bulk while the
             history is open, linear while it is shut. */
          aria-pressed={!!recentOpen}
          aria-label={recentOpen ? "Hide recent conversations" : "Recent conversations"}
        >
          <CopilotIcon name="clock" variant="bulk" size={16} />
        </button>
        </ControlTip>
      )}
      {/* No collapse in the popup: Velora is always the popup. The side
          panel only appears for a VoiceRx consultation on the Rx pad, and
          there this control is its way back to the popup. Switching remounts
          the panel, which would end a recording, so it waits for the session
          to finish. */}
      {!lockPresentation && !isFull && (
      <button
        type="button"
        className={styles.control}
        onClick={copilot.togglePresentation}
        aria-label="Open in the full view"
        title="Expand"
      >
        <ExpandIcon />
      </button>
      )}
      {onNewChat && !isFull && (
        <MoreMenu
          scopeName={scopeName}
          onNewChat={onNewChat}
          onClearChat={onClearChat}
          onClearToday={onClearToday}
        />
      )}
      <ControlTip title="Close Velora" body="Your chats are kept. Open Velora again to carry on.">
      <button
        type="button"
        className={styles.control}
        onClick={onClose || copilot.close}
        aria-label="Close Velora"
      >
        {/* Two glyphs of the same nominal size do not read as the same size:
            the expand mark is eight thin strokes at the box's full width, the
            close is a solid square whose cross is a knock-out well inside it.
            The close is set larger so the crosses match by eye. */}
        <CopilotIcon name="close-square" variant="bold" size={18} />
      </button>
      </ControlTip>
    </div>
  );
}

/* A header control's tooltip: what it is, and in one line what it does, for
   a doctor meeting the control for the first time. Hidden while its own
   menu is open, so the two never stack. */
function ControlTip({ title, body, disabled, children }) {
  if (disabled) return children;
  return (
    <Tooltip
      className="copilot-tooltip"
      side="bottom"
      content={
        <span style={{ display: "block", maxWidth: 240 }}>
          <span style={{ display: "block", fontWeight: 600 }}>{title}</span>
          <span style={{ display: "block", opacity: 0.85, marginTop: 2 }}>{body}</span>
        </span>
      }
    >
      {children}
    </Tooltip>
  );
}

function ExpandIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="1.71"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15.85 2H22V8.15" />
        <path d="M8.15 2H2V8.15" />
        <path d="M15.85 21.9996H22V15.8496" />
        <path d="M14.31 9.69L22 2" />
        <path d="M9.69 9.69L2 2" />
        <path d="M14.31 14.3105L22 22.0005" />
        <path d="M9.69 14.3105L2 22.0005" />
        <path d="M8.15 21.9996H2V15.8496" />
      </g>
    </svg>
  );
}

/* TP icon set, arrow2/expand-max: arrows in from the corners. */
