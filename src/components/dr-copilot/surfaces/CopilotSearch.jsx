import React from "react";
import { COPILOT_FULL, useCopilot } from "./CopilotContext";
import styles from "./CopilotSearch.module.css";
import { CopilotIcon } from "../ui/CopilotIcon";
import { VeloraSpark } from "../shared/VeloraStar";
import { RollingPlaceholder, SCOPE_HOSPITAL, SCOPE_PATIENT } from "../shared/RollingPlaceholder";

/**
 * Dr. Copilot's entry point in the top bar.
 *
 * It reads as a search field because that is the affordance a doctor scans the
 * header for, but it is deliberately not one: there is no dropdown and nothing
 * to type here. Clicking it opens the Copilot popup with its input already
 * focused, so the doctor carries straight on typing. Keeping the asking in one
 * place means they never have two half-answers in two different surfaces.
 *
 * Rendered as a button rather than a text input so it announces itself
 * honestly to assistive tech and to the keyboard.
 *
 * The Copilot tab on the right edge opens the docked side panel instead.
 */


export default function CopilotSearch({
  compact = false,
  iconOnly = false,
  onDark = false,
  patientId,
  patientLabel,
  className,
}) {
  const copilot = useCopilot();
  if (!copilot) return null;

  /* Voice, straight from the bar: opens Velora and starts dictating there,
     as the patient page's field does. The panel is where the answer will
     appear, so that is where the words are heard. */
  const withMic = !compact && !iconOnly;
  const dictate = () =>
    copilot.open({
      presentation: COPILOT_FULL,
      dictate: true,
      patientId: patientId || undefined,
      patientLabel: patientId ? patientLabel : undefined,
    });

  const field = (
    <button
      type="button"
      className={[
        styles.field,
        compact ? styles.compact : "",
        onDark ? styles.onDark : "",
        iconOnly ? styles.iconOnly : "",
        withMic ? styles.withMic : "",
        withMic ? "" : className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() =>
        copilot.open({
          /* The same big view the patient page opens, and for the same
             reason: a hospital-wide answer is a page of patients, which the
             dropdown-sized sheet could only show three of. */
          presentation: COPILOT_FULL,
          // On a patient screen the panel should already be about that patient,
          // rather than making the doctor pick them again from the chip. In the
          // top bar there is no patient, and the scope has to be cleared
          // rather than inherited: a doctor who was last in a chart would
          // otherwise ask the hospital-wide field and be answered from that
          // one record.
          patientId: patientId || undefined,
          patientLabel: patientId ? patientLabel : undefined,
        })
      }
      aria-label={
        patientLabel
          ? `Ask Velora about ${patientLabel}`
          : "Ask Velora: find patients across your hospital"
      }
      title={patientLabel ? `Ask Velora about ${patientLabel}` : undefined}
      aria-haspopup="dialog"
    >
      {/* Velora's star, alive: the same mark that plays while Velora works,
          so the entry point and the thing it opens are visibly one product. */}
      <VeloraSpark size={20} className={styles.spark} />
      {/* The same invitation the composer shows, in the same words and the
          same colours: a fixed lead and a rolling example of what to ask in
          the scope this field opens. */}
      {!iconOnly &&
        (compact ? (
          <span className={styles.label}>Ask Velora</span>
        ) : (
          <RollingPlaceholder
            inline
            scope={patientId ? SCOPE_PATIENT : SCOPE_HOSPITAL}
            patientLabel={patientLabel}
            named={!!patientLabel}
            className={styles.label}
          />
        ))}
    </button>
  );

  if (!withMic) return field;
  /* The mic is a sibling laid over the field's right end, not a child: a
     button inside a button is not a thing a browser will press reliably. */
  return (
    <span className={[styles.wrap, className].filter(Boolean).join(" ")}>
      {field}
      <button
        type="button"
        className={styles.mic}
        onClick={dictate}
        aria-label={patientLabel ? `Speak a question about ${patientLabel}` : "Speak a question for Velora"}
        title="Speak your question"
      >
        {/* Neutral, and the colour given directly: this sits in the app's
            header, outside Velora's styles. Opening it starts the panel's
            own mic, so the doctor sees it listening where the words land. */}
        <CopilotIcon name="microphone-2" variant="bulk" size={18} color="var(--tp-slate-600, #545460)" />
      </button>
    </span>
  );
}
