"use client";

/**
 * VoiceRxHistorySidebar — Quick Dictator tutorial drawer.
 *
 * Originally a history list of past dictations; product call moved away
 * from per-doctor history, so the file keeps its name (callers + context
 * are still wired up as `isHistoryOpen` / `openHistory()` / `closeHistory()`)
 * but the surface is now a step-by-step "how Quick Dictator works" tutorial.
 *
 * Steps shown:
 *   1. Invoke   — double-tap ⇧ from anywhere in VoiceRx
 *   2. Speak    — talk naturally; we capture words verbatim
 *   3. Insert   — ✓ / Enter drops the text into the field you were on
 *   4. Undo     — ✕ within 10s discards the take
 *
 * Each step is a numbered card with a violet step badge, title, body, and
 * an icon/glyph hint at the right. The whole panel scrolls if the
 * viewport is short. A footer ribbon repeats the ⇧+⇧ keycap so the
 * doctor leaves the drawer with the shortcut in their head.
 */

import { Sidebar } from "@/src/components/molecules/Sidebar";
import { SidebarHeader } from "@/src/components/molecules/SidebarHeader";
import { CloseSquare } from "iconsax-reactjs";
import { useVoiceBar } from "./voice-bar-context";
import styles from "./VoiceRxHistorySidebar.module.scss";

const STEPS = [
  {
    n: 1,
    title: "Double-tap Shift",
    body: "From any note field, tap ⇧ twice to open the dictation bar.",
  },
  {
    n: 2,
    title: "Just talk",
    body: "Speak naturally. We transcribe word-for-word, no AI editing.",
  },
  {
    n: 3,
    title: "Hit ✓ to insert",
    body: "Press ✓ or Enter. Your words drop straight into the field.",
  },
  {
    n: 4,
    title: "10 seconds to undo",
    body: "Click ✕ to cancel. You've got 10 seconds to undo.",
  },
];

export function VoiceRxHistorySidebar() {
  const { isHistoryOpen, closeHistory } = useVoiceBar();

  return (
    <Sidebar
      open={isHistoryOpen}
      onClose={closeHistory}
      width="420px"
      layer={1}
      header={
        <SidebarHeader
          onClose={closeHistory}
          closeAriaLabel="Close tutorial"
          closeIcon={<CloseSquare size={22} color="currentColor" variant="Bold" />}
          title="Quick Dictator"
        />
      }
    >
      <div className={styles.tutorialBody}>
        <div className={styles.intro}>
          <span className={styles.introEyebrow}>How it works</span>
          <h2 className={styles.introTitle}>Talk through your notes in four steps.</h2>
          <p className={styles.introCopy}>
            Quick Dictator is the fastest way to add free text to any note field
            in VoiceRx. Hands stay free, you just talk, and your words land
            exactly the way you said them to the patient, with clinical precision.
          </p>
        </div>

        <ol className={styles.stepList}>
          {STEPS.map((step, idx) => (
            <li key={step.n} className={styles.step}>
              <span className={styles.stepRail} aria-hidden="true">
                <span className={styles.stepGlyph}>{step.n}</span>
                {idx < STEPS.length - 1 && (
                  <span className={styles.stepConnector} />
                )}
              </span>
              <div className={styles.stepBody}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepCopy}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <footer className={styles.recap}>
          <span className={styles.recapKeys}>
            <span className={styles.kbdLarge}>⇧</span>
            <span className={styles.kbdPlus}>+</span>
            <span className={styles.kbdLarge}>⇧</span>
          </span>
          <span className={styles.recapCopy}>
            Try it now. Focus a notes field and double-tap Shift.
          </span>
        </footer>
      </div>
    </Sidebar>
  );
}
