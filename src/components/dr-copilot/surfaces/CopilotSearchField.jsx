import React, { useCallback, useEffect, useRef, useState } from "react";
import { VoiceRxSiriWaveform } from "../../dr-agent/voicerx/VoiceRxSiriWaveform";
import { COPILOT_FULL, useCopilot } from "./CopilotContext";
import { useDictation } from "../shared/useDictation";
import { CopilotIcon } from "../ui/CopilotIcon";
import styles from "./CopilotSearchField.module.css";
import { ROLLING_HINTS, useRollingIndex, RollingLeadText } from "../shared/RollingPlaceholder";
import { VeloraSpark } from "../shared/VeloraStar";

/**
 * The typeable Chart Search field, used on the pages where a patient is in
 * scope (patient detail, consultation RxPad).
 *
 * Three things happen in this one control:
 *
 *   Typing      - the doctor types here and nowhere else. Focus opens a
 *                 suggestion dropdown beneath it, so the panel is never asked
 *                 to host a second input above its own.
 *   Dictation   - the mic turns the field itself into the recorder: waveform,
 *                 elapsed time, live transcript. No separate voice screen to
 *                 travel to and come back from.
 *   Answering   - submitting hands the question to Dr. Copilot, which answers
 *                 from the clinical archive and cites every claim.
 *
 * The field also registers itself as Copilot's anchor, which is what lets the
 * panel open as a dropdown hanging off this box rather than a popup adrift in
 * the middle of the page.
 */

/* The rolling half of the placeholder comes from the shared list the
   composer uses, so the header field and the panel teach the same questions
   in the same words. The lead ("Ask Velora about Akhil's") is sticky and
   only the tail rolls. */


export default function CopilotSearchField({ patientId, patientLabel, hideWhenOpen = false, className }) {
  const copilot = useCopilot();
  const [value, setValue] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const dictation = useDictation();
  const isRecording = dictation.state === "recording";

  const [hint, prevHint] = useRollingIndex(ROLLING_HINTS.length, !value && !isRecording);

  /* Register as the anchor so the panel can hang off this box. Cleared on the
     way out only if it is still ours, so a page with two fields never leaves a
     stale element behind. */
  const setAnchor = copilot && copilot.setAnchor;
  useEffect(() => {
    if (!setAnchor) return undefined;
    const el = wrapRef.current;
    setAnchor(el);
    return () => setAnchor((current) => (current === el ? null : current));
  }, [setAnchor]);

  /* Wherever this bar is, there is a patient. Saying so on mount is what puts
     the Copilot tab on the edge of the screen before anything has been asked,
     rather than after the first question. */
  const registerPatient = copilot && copilot.registerPatient;
  useEffect(() => {
    if (registerPatient) registerPatient(patientId, patientLabel);
  }, [registerPatient, patientId, patientLabel]);

  /**
   * Opening Copilot, with or without a question.
   *
   * Straight to the full view. The dropdown tried to be a smaller step, but it
   * was the same panel in a shape that fit less of it, and the doctor's next
   * move after opening is always to read an answer. Minimising from there
   * parks it in the side dock, which is the smaller step - taken when they
   * want it, rather than imposed before they have asked anything.
   */
  const open = useCallback(
    (question) => {
      if (!copilot) return;
      const q = String(question || "").trim();
      copilot.open({
        presentation: COPILOT_FULL,
        ...(q ? { message: q } : {}),
        ...(patientId ? { patientId, patientLabel } : {}),
      });
      setValue("");
      if (inputRef.current) inputRef.current.blur();
    },
    [copilot, patientId, patientLabel]
  );

  /**
   * The bar's mic opens Copilot, already listening.
   *
   * It used to record into the bar itself, which meant the doctor spoke into a
   * 42px strip and then watched their words move somewhere else. The panel is
   * where the answer is going to appear, so the panel is where the dictation
   * belongs; the mic out here is the way in, not a second recorder.
   */
  const startDictation = useCallback(() => {
    if (!copilot) return;
    copilot.open({
      presentation: COPILOT_FULL,
      dictate: true,
      ...(patientId ? { patientId, patientLabel } : {}),
    });
  }, [copilot, patientId, patientLabel]);

  /* ── Dictation ─────────────────────────────────────────────────────────── */

  const submitDictation = useCallback(() => {
    const spoken = String(dictation.stop() || "").trim();
    open(spoken);
  }, [dictation, open]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        open(value);
      }
    },
    [open, value]
  );

  if (!copilot) return null;

  /**
   * While Copilot is open, this bar is not a second place to ask.
   *
   * On the Rx pad it goes entirely: the header there is already full of the
   * tools for writing, and a dead search box among live ones is worse than a
   * gap. On the patient detail page the bar is the page's own header - remove
   * it and the header collapses - so it stays and stands down instead,
   * quieted and untypable, naming what is open beside it.
   */
  const standDown = copilot.isOpen && !isRecording;
  if (standDown && hideWhenOpen) return null;

  /* Kept for the dropdown presentation, where the panel hangs off this box
     rather than replacing it. */
  const takenOver =
    standDown ||
    (copilot.isOpen &&
      copilot.presentation === COPILOT_FULL &&
      copilot.anchorEl === wrapRef.current);

  return (
    <div
      className={[styles.wrap, className].filter(Boolean).join(" ")}
      ref={wrapRef}
      data-recording={isRecording ? "true" : undefined}
    >
      <div
        className={[
          styles.field,
          isRecording ? styles.fieldLive : "",
          takenOver ? styles.fieldQuiet : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          className={styles.wash}
          aria-hidden="true"
          style={{ backgroundImage: "url(/icons/dr-agent/chat-bg.gif)" }}
        />
        {takenOver ? (
          <>
            <VeloraSpark size={20} className={styles.spark} />
            <span className={styles.quietTitle}>Velora</span>
            {patientLabel && <span className={styles.quietScope}>{patientLabel}</span>}
          </>
        ) : isRecording ? (
          <>
            <span className={styles.liveDot} aria-hidden="true" />
            <span className={styles.liveTime}>{formatElapsed(dictation.elapsed)}</span>
            <VoiceRxSiriWaveform stream={dictation.stream} className={styles.wave} />
            <button
              type="button"
              className={styles.liveCancel}
              onClick={dictation.cancel}
              aria-label="Cancel dictation"
              title="Cancel"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className={styles.liveAsk}
              onClick={submitDictation}
              aria-label="Done, ask Copilot"
              title="Done"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12.8l4.4 4.4L19 7.6"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        ) : (
          <>
            <VeloraSpark size={20} className={styles.spark} />

            {/* The placeholder is drawn rather than set, because a real
                placeholder attribute cannot animate. Fixed lead, rolling tail. */}
            {!value && (
              <span className={styles.ghost} aria-hidden="true">
                <span className={styles.ghostLead}>
                  <RollingLeadText patientLabel={patientLabel} named nameClassName={styles.ghostName} />
                </span>
                <span className={styles.roll}>
                  {prevHint != null && (
                    <span key={`out-${prevHint}`} className={styles.rollOut}>
                      {ROLLING_HINTS[prevHint]}
                    </span>
                  )}
                  <span key={`in-${hint}`} className={styles.rollIn}>
                    {ROLLING_HINTS[hint]}
                  </span>
                </span>
              </span>
            )}

            <input
              ref={inputRef}
              className={styles.input}
              value={value}
              placeholder=""
              aria-label={patientLabel ? `Ask Velora about ${patientLabel}` : "Ask Velora"}
              disabled={standDown}
              onFocus={() => (standDown ? undefined : open(""))}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
            />

            {/* Dictation sits in the field, where the doctor already is. */}
            <button
              type="button"
              className={styles.mic}
              aria-label="Dictate a question"
              title="Dictate a question"
              onMouseDown={(e) => e.preventDefault()}
              disabled={standDown}
              onClick={standDown ? undefined : startDictation}
            >
              <CopilotIcon name="microphone-2" variant="bulk" size={18} />
            </button>
          </>
        )}
      </div>

      {isRecording && (
        <div className={styles.panel}>
          <div className={styles.livePanel}>
            <span className={styles.liveLabel}>
              <span className={styles.liveDot} aria-hidden="true" />
              {dictation.micError ? "Microphone blocked" : "Listening"}
            </span>
            <p className={styles.liveText}>
              {dictation.transcript || (
                <span className={styles.liveIdle}>
                  {dictation.micError
                    ? "The microphone is blocked for this site. Allow it from the address bar, then try again."
                    : dictation.supported
                      ? "Ask your question out loud."
                      : "Recording. This browser cannot transcribe, so speak and then type it in."}
                </span>
              )}
            </p>
          </div>
          <div className={styles.panelFoot}>
            {dictation.micError ? (
              <button type="button" className={styles.retry} onClick={dictation.start}>
                Try again
              </button>
            ) : (
              "Tap the tick when you are done."
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Rolling placeholder ─────────────────────────────────────────────────── */

/* ── Dictation ───────────────────────────────────────────────────────────── */

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
