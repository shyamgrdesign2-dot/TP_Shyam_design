import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Shared open/close state for Dr. Copilot.
 *
 * Dr. Copilot has two presentations of the same panel:
 *   "dock"  - docked to the right edge, alongside the page (the Dr. Agent layout)
 *   "modal" - a dropdown that takes over the search field it was opened from
 *   "full"  - the same panel blown up over ~90% of the viewport
 *
 * Entry points scattered around the app (the appointment search box, the FAB,
 * a voice CTA) only need to say "open", so the presentation choice and the
 * expand/collapse toggle between the two live here rather than in any one
 * screen. A single CopilotDock mounted in the shell does the rendering.
 */

const CopilotContext = createContext(null);

/* A mic pressed outside the panel (the top bar, the patient page) opens
   Velora and asks its composer to start listening. When the panel is not yet
   mounted, the composer mounts already holding the new trigger value and
   would read it as "nothing changed", so the request is also kept here, once,
   for the composer that mounts next to take. */
let pendingDictateAt = 0;
export function takePendingDictation() {
  const fresh = pendingDictateAt && Date.now() - pendingDictateAt < 2500;
  pendingDictateAt = 0;
  return !!fresh;
}

export const COPILOT_DOCK = "dock";
export const COPILOT_MODAL = "modal";
export const COPILOT_FULL = "full";

export function CopilotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [presentation, setPresentation] = useState(COPILOT_DOCK);
  const [patientId, setPatientId] = useState(undefined);
  // Carried alongside the id so a patient the appointment list has never seen
  // (a consultation opened straight from a link, say) still shows their real
  // name in the panel rather than falling back to a demo one.
  const [patientLabel, setPatientLabel] = useState(undefined);

  // Bumping a counter is how the panel is told to send a message: it takes an
  // autoMessage plus a changing trigger, so the same text can be sent twice.
  const [autoMessage, setAutoMessage] = useState(undefined);
  const [autoMessageTrigger, setAutoMessageTrigger] = useState(0);

  /* Same counter trick as autoMessage: "start listening" has to be able to
     fire twice in a row, so it is a bump rather than a boolean. */
  const [autoDictateTrigger, setAutoDictateTrigger] = useState(0);

  // The element the panel hangs off in its dropdown presentation. The search
  // field registers itself here, which is what makes the dropdown read as an
  // extension of the box the doctor just typed in rather than a popup adrift
  // in the middle of the page.
  const [anchorEl, setAnchor] = useState(null);

  const open = useCallback((options) => {
    const opts = options || {};
    if (opts.presentation) setPresentation(opts.presentation);
    if ("patientId" in opts) setPatientId(opts.patientId);
    if ("patientLabel" in opts) setPatientLabel(opts.patientLabel);
    if (opts.message) {
      setAutoMessage(opts.message);
      setAutoMessageTrigger((n) => n + 1);
    }
    if (opts.dictate) {
      pendingDictateAt = Date.now();
      setAutoDictateTrigger((n) => n + 1);
    }
    setIsOpen(true);
  }, []);

  /**
   * A carried question is used once.
   *
   * `autoMessage` lingered in the context after the panel sent it, so every
   * later scope switch looked like a fresh instruction and the question was
   * asked again - in the scope being left as well as the one being entered.
   * The panel clears it the moment it schedules the send.
   */
  const consumeAutoMessage = useCallback(() => setAutoMessage(undefined), []);

  const close = useCallback(() => setIsOpen(false), []);

  /**
   * "There is a patient on this screen" - said without opening anything.
   *
   * The tab only belongs where Copilot has a chart to talk about, and until
   * now the only thing that established that was opening Copilot. So the tab
   * appeared after the first use and was missing on arrival, which is exactly
   * when it is the affordance. The search field registers the patient it was
   * given, the same way it registers itself as the anchor.
   */
  const registerPatient = useCallback((id, label) => {
    if (!id) return;
    setPatientId((current) => (current === id ? current : id));
    setPatientLabel((current) => (current === label ? current : label));
  }, []);

  const expand = useCallback(() => setPresentation(COPILOT_MODAL), []);
  const collapse = useCallback(() => setPresentation(COPILOT_DOCK), []);
  // Within the dropdown, "expand" means the full-page view and back again.
  // The dock is reached from the FAB, not from this toggle.
  /* Full view and the side dock are the two states that matter: the popup to
     read in, the dock to keep it open beside the page. */
  const togglePresentation = useCallback(
    () => setPresentation((p) => (p === COPILOT_FULL ? COPILOT_DOCK : COPILOT_FULL)),
    []
  );

  const value = useMemo(
    () => ({
      isOpen,
      presentation,
      patientId,
      patientLabel,
      autoMessage,
      autoMessageTrigger,
      autoDictateTrigger,
      consumeAutoMessage,
      anchorEl,
      setAnchor,
      open,
      close,
      expand,
      collapse,
      togglePresentation,
      setPatientId,
      registerPatient,
    }),
    [
      isOpen,
      presentation,
      patientId,
      patientLabel,
      autoMessage,
      autoMessageTrigger,
      autoDictateTrigger,
      consumeAutoMessage,
      anchorEl,
      open,
      close,
      expand,
      collapse,
      togglePresentation,
      registerPatient,
    ]
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

/**
 * Returns null when no provider is mounted, so entry points can render a
 * disabled state instead of crashing a page that is outside the shell.
 */
export function useCopilot() {
  return useContext(CopilotContext);
}
