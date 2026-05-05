/**
 * TatvaPractice Button System — Token Mapping
 *
 * Maps design tokens (TP.interactive.*) to button theme/size/state.
 * All styling MUST reference these tokens. No hex literals in components.
 *
 * MUI-style token aliases:
 *   color.primary   → theme "primary"
 *   color.neutral   → theme "neutral"
 *   color.error     → theme "error"
 *   variant.contained → solid
 *   variant.outlined  → outline
 *   variant.text      → ghost
 *   variant.link      → link
 *   state.loading     → loading
 *   surface.dark      → surface "dark"
 */

import type { TPButtonTheme, TPButtonSize, TPButtonState, TPButtonSurface } from "./types"

// ─── TOKEN REFERENCE (Design tokens from lib/design-tokens.ts) ───

/**
 * Token paths used by the Button System.
 * Implementations resolve these via design-tokens.ts or CSS variables.
 *
 * Primary CTA (light surface):
 *   TP.interactive.primary.bg
 *   TP.interactive.primary.hover
 *   TP.interactive.primary.active
 *   TP.interactive.primary.text
 *
 * Primary CTA (dark surface):
 *   TP.interactive.primary.dark.bg
 *   TP.interactive.primary.dark.text
 *   TP.interactive.primary.dark.hover
 *
 * Secondary / Outline:
 *   TP.interactive.secondary.bg
 *   TP.interactive.secondary.border
 *   TP.interactive.secondary.text
 *   TP.interactive.secondary.hover
 *
 * Neutral:
 *   TP.interactive.neutral.bg
 *   TP.interactive.neutral.hover
 *   TP.interactive.neutral.text
 *
 * Destructive (error theme):
 *   TP.interactive.destructive.bg
 *   TP.interactive.destructive.hover
 *   TP.interactive.destructive.text
 *
 * Disabled:
 *   TP.interactive.disabled.bg
 *   TP.interactive.disabled.text
 *
 * Focus (all themes):
 *   TP.focus.primary (primary theme)
 *   TP.focus.secondary (neutral theme)
 *   TP.focus.error (error theme)
 */

export type TPButtonTokenKey =
  | "bg"
  | "text"
  | "border"
  | "hover"
  | "active"
  | "focusRing"
  | "disabledBg"
  | "disabledText"
  | "disabledBorder"

export interface TPButtonTokenMap {
  /** Token path for resolution (e.g. TP.interactive.primary.bg) */
  token: string
  /** Fallback hex (for build-time / non-CSS-variable envs) */
  value: string
}

/** Resolved style values per theme × surface. */
export interface TPButtonThemeTokens {
  bg: string
  text: string
  border: string
  hover: string
  active: string
  focusRing: string
  disabledBg: string
  disabledText: string
  disabledBorder: string
}

// ─── TOKEN RESOLUTION ───

/**
 * Resolves tokens for a given theme and surface.
 * In production, this should read from design-tokens or CSS variables.
 */
export function getButtonTokens(
  theme: TPButtonTheme,
  surface: TPButtonSurface
): TPButtonThemeTokens {
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
export const BUTTON_SIZE_TOKENS: Record<
  TPButtonSize,
  { height: number; paddingX: number; iconSize: number; iconTextGap: number }
> = {
  sm: { height: 36, paddingX: 14, iconSize: 18, iconTextGap: 6 },
  md: { height: 42, paddingX: 18, iconSize: 20, iconTextGap: 6 },
  lg: { height: 48, paddingX: 22, iconSize: 24, iconTextGap: 6 },
}
