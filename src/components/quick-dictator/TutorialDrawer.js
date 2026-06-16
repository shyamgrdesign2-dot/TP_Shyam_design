import React from "react";
import { Drawer } from "antd";
import { useVoiceBar } from "./voice-bar-context";

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
    body: "Click ✕ to cancel. You’ve got 10 seconds to undo.",
  },
];

export function TutorialDrawer() {
  const { isTutorialOpen, closeTutorial } = useVoiceBar();

  return (
    <Drawer
      title={
        <span
          style={{
            fontFamily: "Mulish, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#0F172A",
          }}
        >
          Quick Dictator
        </span>
      }
      placement="right"
      width={400}
      open={isTutorialOpen}
      onClose={closeTutorial}
      destroyOnClose={false}
      zIndex={2147483647}
      closeIcon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      }
      styles={{
        wrapper: {
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        },
        header: {
          minHeight: 60,
          height: 60,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #E2E8F0",
          boxSizing: "border-box",
        },
        body: {
          padding: "24px 20px",
        },
        content: {
          borderLeft: "1px solid #E2E8F0",
        },
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "Mulish, sans-serif",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
            color: "#0F172A",
          }}
        >
          Talk through your notes in four steps.
        </h2>

        <ol
          style={{
            display: "flex",
            flexDirection: "column",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {STEPS.map((step, idx) => {
            const isLast = idx === STEPS.length - 1;
            return (
              <li
                key={step.n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr",
                  gap: 14,
                  padding: "4px 0 16px",
                  alignItems: "flex-start",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    alignSelf: "stretch",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background:
                        "linear-gradient(135deg, #6938EF 0%, #4338CA 100%)",
                      color: "#fff",
                      boxShadow: "0 6px 14px -6px rgba(105,56,239,0.45)",
                      fontFamily: "JetBrains Mono, SF Mono, monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      flexShrink: 0,
                    }}
                  >
                    {step.n}
                  </span>
                  {!isLast && (
                    <span
                      style={{
                        flex: 1,
                        width: 2,
                        minHeight: 28,
                        marginTop: 6,
                        marginBottom: 6,
                        backgroundImage:
                          "linear-gradient(180deg, #CBD5E1 0%, #CBD5E1 50%, transparent 50%, transparent 100%)",
                        backgroundSize: "2px 8px",
                        backgroundRepeat: "repeat-y",
                      }}
                    />
                  )}
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    paddingTop: 4,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "Mulish, sans-serif",
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "-0.005em",
                      color: "#0F172A",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: "#475569",
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 16px",
            borderRadius: 12,
            background: "#F4EFFF",
            border: "1px solid #E0D4FF",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={kbdBig}>⇧</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>
              +
            </span>
            <span style={kbdBig}>⇧</span>
          </span>
          <span
            style={{
              fontSize: 12,
              lineHeight: 1.55,
              fontWeight: 600,
              color: "#2A1E5C",
            }}
          >
            Try it now. Focus a notes field and double-tap Shift.
          </span>
        </div>
      </div>
    </Drawer>
  );
}

const kbdBig = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 22,
  padding: "0 6px",
  borderRadius: 4,
  background: "#0F172A",
  color: "#fff",
  fontFamily: "JetBrains Mono, SF Mono, monospace",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
};
