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

/**
 * Resolves the complete inline style object for a TPButton given its variant,
 * interaction state, and pre-computed token/dimension maps.
 *
 * @param {string} variant  - "solid" | "outline" | "ghost" | "tonal" | "link"
 * @param {string} theme    - "primary" | "error" | "neutral"
 * @param {string} surface  - "light" | "dark"
 * @param {"disabled"|"focused"|"hover"|"default"} state
 * @param {object} tokens   - result of getButtonTokens(theme, surface)
 * @param {object} dims     - entry from BUTTON_SIZE_TOKENS
 * @returns {React.CSSProperties}
 */
export function getButtonStyle(variant, theme, surface, state, tokens, dims) {
  const isDisabled = state === "disabled";
  const bg = isDisabled ? tokens.disabledBg : state === "hover" ? tokens.hover : tokens.bg;
  const textColor = isDisabled ? tokens.disabledText : tokens.text;
  const borderColor = isDisabled ? tokens.disabledBorder : tokens.border;

  let finalBg = bg;
  let finalBorder = "none";
  let finalText = textColor;
  let finalBackdropFilter;

  if (variant === "outline") {
    if (surface === "dark") {
      finalBg = isDisabled ? "rgba(255,255,255,0.08)" : state === "hover" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)";
      finalBorder = `1.5px solid ${isDisabled ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.34)"}`;
      finalText = isDisabled ? "rgba(255,255,255,0.45)" : "#FFFFFF";
      finalBackdropFilter = "blur(8px)";
    } else {
      finalBg = isDisabled ? "transparent" : state === "hover" ? (theme === "primary" ? "#EEEEFF" : theme === "error" ? "#FFF1F2" : "#FAFAFB") : "transparent";
      finalBorder = `1.5px solid ${borderColor}`;
      finalText = isDisabled ? tokens.disabledText : theme === "neutral" ? tokens.text : tokens.border;
    }
  } else if (variant === "ghost") {
    finalBg = isDisabled ? "transparent" : state === "hover" ? (theme === "primary" ? "#EEEEFF" : theme === "error" ? "#FFF1F2" : "#F1F1F5") : "transparent";
    finalBorder = "none";
    finalText = isDisabled ? tokens.disabledText : theme === "neutral" ? "#454551" : tokens.border;
  } else if (variant === "tonal") {
    finalBg = isDisabled ? tokens.disabledBg : (theme === "primary" ? "#EEEEFF" : theme === "error" ? "#FFF1F2" : "#F1F1F5");
    finalBorder = "none";
    finalText = isDisabled ? tokens.disabledText : theme === "neutral" ? "#454551" : tokens.border;
  } else if (variant === "link") {
    finalBg = "transparent";
    finalBorder = "none";
    finalText = isDisabled ? tokens.disabledText : theme === "neutral" ? "#454551" : tokens.border;
  }

  return {
    height: variant === "link" ? "auto" : `${dims.height}px`,
    paddingLeft: variant === "link" ? 0 : dims.paddingX,
    paddingRight: variant === "link" ? 0 : dims.paddingX,
    borderRadius: variant === "link" ? 0 : 10,
    fontSize: dims.fontSize,
    fontWeight: 600,
    fontFamily: "Inter, sans-serif",
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "all 150ms ease",
    opacity: isDisabled ? 0.7 : 1,
    backgroundColor: finalBg,
    color: finalText,
    border: finalBorder,
    boxShadow: state === "focused" ? `0 0 0 3px ${tokens.focusRing}` : undefined,
    backdropFilter: finalBackdropFilter,
    textDecoration: variant === "link" ? "underline" : "none",
    textUnderlineOffset: variant === "link" ? 4 : undefined,
  };
}

/**
 * Resolves the split-button separator color and opacity.
 *
 * @param {string} variant    - "solid" | "outline" | "ghost" | "tonal"
 * @param {string} theme      - "primary" | "error" | "neutral"
 * @param {string} surface    - "light" | "dark"
 * @param {string} borderColor - resolved border color from getButtonTokens
 * @returns {{ color: string, opacity: number }}
 */
export function getSplitButtonSeparator(variant, theme, surface, borderColor) {
  const color =
    variant === "solid" && surface === "light"
      ? "rgba(255,255,255,0.35)"
      : variant === "solid" && surface === "dark"
      ? "rgba(0,0,0,0.15)"
      : variant === "tonal" && surface === "light"
      ? borderColor
      : variant === "outline" || variant === "ghost"
      ? theme === "neutral" ? "#A2A2A8" : borderColor
      : "currentColor";

  const opacity =
    variant === "solid"
      ? 0.5
      : theme === "neutral" && variant === "outline"
      ? 0.65
      : 0.5;

  return { color, opacity };
}

/** Size dimensions (from hard constraints). Icon-Text gap: 6px. Linear icon strokeWidth: 1.5. */
export const BUTTON_SIZE_TOKENS = {
  sm: { height: 36, paddingX: 14, iconSize: 18, iconTextGap: 6, fontSize: 12 },
  md: { height: 42, paddingX: 18, iconSize: 20, iconTextGap: 6, fontSize: 14 },
  lg: { height: 48, paddingX: 22, iconSize: 24, iconTextGap: 6, fontSize: 14 },
}
