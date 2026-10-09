import React from "react";
import CopilotSearchField from "./CopilotSearchField";
import { COPILOT_FULL, useCopilot } from "./CopilotContext";
import { useCopilotStarters } from "../chart-search/useCopilotStarters";
import { WelcomePrompts, resolveWelcomeActions } from "../chat/WelcomeScreen";
import "../ui/tokens.css";
import "../ui/copilot.css";
import styles from "./CopilotTopBar.module.css";

/**
 * Header for the patient detail page, built on the consultation header's
 * pattern: a back control at the left edge behind a divider, then the content.
 *
 * Here the content is only Chart Search. The patient's name and age already sit
 * in the sidebar directly below, so repeating them in the bar would spend the
 * width twice; giving it all to the search makes the one thing a doctor is most
 * likely to do on this page the most obvious thing on it.
 *
 * Back lives here rather than in the sidebar so the rail keeps its height for
 * navigation.
 */
export default function CopilotTopBar({ patientId, patientLabel, onBack }) {
  const copilot = useCopilot();
  /* The same four questions the welcome screen offers, offered a step
     earlier. Inside the panel they are what to ask once Copilot is open; out
     here they are the reason to open it, and pressing one skips the empty
     screen entirely - the question is already sent. */
  const { prompts: starters } = useCopilotStarters(patientId);

  const ask = (question) => {
    if (!copilot) return;
    copilot.open({
      presentation: COPILOT_FULL,
      message: question,
      ...(patientId ? { patientId, patientLabel } : {}),
    });
  };

  return (
    <div className={styles.bar}>
      {onBack && (
        <div className={styles.backCell}>
          <button
            type="button"
            className={styles.back}
            onClick={onBack}
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      <div className={styles.inner}>
        <CopilotSearchField
          className={styles.field}
          patientId={patientId}
          patientLabel={patientLabel}
        />

        {/* The panel's own chips, not a lookalike: one component, so the
            offer looks the same wherever it is made. It needs the module's
            scope id around it because the bar renders in the app's DOM,
            outside the portal the panel lives in - the module's Tailwind is
            emitted under that id and is inert without it. */}
        {copilot && starters.length > 0 && (
          <div id="dr-copilot-root" className={`dr-copilot-scope ${styles.starters}`}>
            <WelcomePrompts
              layout="row"
              actions={resolveWelcomeActions({ suggestions: starters })}
              onActionClick={ask}
            />
          </div>
        )}
      </div>
    </div>
  );
}
