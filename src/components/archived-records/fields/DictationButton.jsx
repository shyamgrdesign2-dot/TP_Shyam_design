import React from "react";
import { Button, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { Microphone2, MicrophoneSlash, Stop } from "iconsax-reactjs";
import { DICTATION_UNAVAILABLE } from "../useDictation";
import styles from "./fields.module.scss";

/**
 * The microphone at the end of a text field. Press to dictate, press again
 * to stop. It follows the Rx pad's voice button: a pressed state for screen
 * readers, a tooltip that says what is happening, a pulsing dot while it
 * listens. Listening also changes the icon, so the state does not rest on
 * colour.
 *
 *   dictation  what useDictation returns
 *   label      the button's name, such as "Dictate notes"
 *
 * A browser with no speech recognition gets no button. A microphone that was
 * refused keeps the button, struck through, with a tooltip that says so.
 */
export default function DictationButton({ dictation, label = "Dictate notes" }) {
  if (!dictation?.supported) return null;
  const { listening, available } = dictation;
  const tip = !available ? DICTATION_UNAVAILABLE : listening ? "Listening. Press to stop." : label;
  const Icon = !available ? MicrophoneSlash : listening ? Stop : Microphone2;
  return (
    <Tooltip content={tip}>
      <Button
        className={styles.mic}
        variant="ghost"
        theme={listening ? "error" : "neutral"}
        size="sm"
        aria-label={label}
        aria-pressed={listening}
        aria-disabled={available ? undefined : "true"}
        data-listening={listening ? "true" : undefined}
        icon={
          <span className={styles.micIcon}>
            <Icon size={16} variant={listening ? "Bold" : "Linear"} />
            {listening ? <span className={styles.micPulse} aria-hidden="true" /> : null}
          </span>
        }
        onClick={available ? dictation.toggle : undefined}
      />
    </Tooltip>
  );
}
