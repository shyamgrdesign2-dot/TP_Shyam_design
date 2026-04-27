export function getButtonTokens(theme, surface) {
  // Light surface tokens (from design-tokens interactive section)
  const primary = {
    bg: "#4B4AD5",        // TP.interactive.primary.bg
    text: "#FFFFFF",      // TP.interactive.primary.text
    border: "#4B4AD5",
    hover: "#3C3BB5",     // TP.interactive.primary.hover
    active: "#2E2D96",    // TP.interactive.primary.active
    focusRing: "#B5B4F2",
    disabledBg: "#E2E2EA",
    disabledText: "#A2A2A8",
    disabledBorder: "#E2E2EA",
  }

  const neutral = {
    bg: "#F1F1F5",        // TP.interactive.neutral.bg
    text: "#454551",      // TP.interactive.neutral.text (TP slate-700)
    border: "#D0D5DD",    // TP slate-300, better definition
    hover: "#E2E2EA",     // TP.interactive.neutral.hover
    active: "#D0D5DD",
    focusRing: "#D0D5DD",
    disabledBg: "#FAFAFB",
    disabledText: "#A2A2A8",
    disabledBorder: "#E2E2EA",
  }

  const error = {
    bg: "#E11D48",        // TP.interactive.destructive.bg
    text: "#FFFFFF",
    border: "#E11D48",
    hover: "#C8102E",     // TP.interactive.destructive.hover
    active: "#9F1239",
    focusRing: "#FDA4AF",
    disabledBg: "#E2E2EA",
    disabledText: "#A2A2A8",
    disabledBorder: "#E2E2EA",
  }

  // Dark surface: primary inverts to white bg
  const primaryDark = {
    bg: "#FFFFFF",        // TP.interactive.primary.dark.bg
    text: "#161558",      // TP.interactive.primary.dark.text
    border: "#FFFFFF",
    hover: "#E2E2EA",     // TP.interactive.primary.dark.hover
    active: "#D0D5DD",
    focusRing: "rgba(255,255,255,0.4)",
    disabledBg: "rgba(255,255,255,0.10)",
    disabledText: "rgba(255,255,255,0.30)",
    disabledBorder: "rgba(255,255,255,0.15)",
  }

  if (surface === "dark" && theme === "primary") {
    return primaryDark
  }

  switch (theme) {
    case "primary":
      return primary
    case "neutral":
      return neutral
    case "error":
      return error
    default:
      return primary
  }
}

/** Size dimensions (from hard constraints). Icon-Text gap: 6px. Linear icon strokeWidth: 1.5. */
export const BUTTON_SIZE_TOKENS = {
  sm: { height: 36, paddingX: 14, iconSize: 18, iconTextGap: 6, fontSize: 12 },
  md: { height: 42, paddingX: 18, iconSize: 20, iconTextGap: 6, fontSize: 14 },
  lg: { height: 48, paddingX: 22, iconSize: 24, iconTextGap: 6, fontSize: 14 },
}
