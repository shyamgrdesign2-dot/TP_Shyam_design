/**
 * TatvaPractice Button System — Type Definitions
 *
 * Shared types and per-component interfaces for the expanded Action System.
 * All styling derives from design tokens. No hardcoded values in product code.
 */

import type { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from "react"

// ─── HARD CONSTRAINTS (Immutable) ───

/** Border radius for all buttons (except link). */
export const TP_BUTTON_RADIUS = 10

/** Typography: 14px / 600 / Inter */
export const TP_BUTTON_TYPOGRAPHY = {
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "Inter, sans-serif",
} as const

/** Icon sizes by button size. */
export const TP_BUTTON_ICON_SIZES = {
  sm: 18,
  md: 20,
  lg: 22,
} as const

/** Heights by size. */
export const TP_BUTTON_HEIGHTS = {
  sm: 36,
  md: 42,
  lg: 48,
} as const

// ─── SHARED TYPES ───

/** Allowed themes for CTAs. Secondary (Violet) reserved for non-clickable content. */
export type TPButtonTheme = "primary" | "neutral" | "error"

/** Size scale. */
export type TPButtonSize = "sm" | "md" | "lg"

/** Interactive states every button must support. */
export type TPButtonState =
  | "default"
  | "hover"
  | "active"
  | "focused"
  | "disabled"
  | "loading"

/** Surface context for adaptive styling (e.g. inverted on dark). */
export type TPButtonSurface = "light" | "dark"

/** Standard action button variants. M3: solid≈Filled, outline≈Outlined, tonal≈Filled.Tonal, ghost≈text */
export type TPButtonVariant = "solid" | "outline" | "ghost" | "tonal" | "link"

/** FAB types. */
export type TPFabType = "primary" | "extended" | "contextual"

/** Button group layout. */
export type TPButtonGroupLayout = "connected" | "segmented" | "toggle"

// ─── BASE PROPS (Shared across all button types) ───

export interface TPButtonBaseProps {
  /** Theme. Only primary and neutral for CTAs; error for destructive. */
  theme?: TPButtonTheme
  /** Size scale. */
  size?: TPButtonSize
  /** Disabled state. */
  disabled?: boolean
  /** Loading state. Shows spinner, disables interaction. */
  loading?: boolean
  /** Surface context. Dark = inverted styling. */
  surface?: TPButtonSurface
  /** Accessible label (required for icon-only). */
  "aria-label"?: string
  /** Additional class names. */
  className?: string
  /** Children. */
  children?: ReactNode
}

// ─── 1. STANDARD ACTION BUTTON ───

export interface TPStandardButtonProps
  extends TPButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Variant: solid, outline, ghost, link. MUI-style: contained ≈ solid, outlined ≈ outline, text ≈ ghost. */
  variant?: TPButtonVariant
  /** Optional left icon (Iconsax Linear). */
  leftIcon?: ReactNode
  /** Optional right icon or dropdown chevron. */
  rightIcon?: ReactNode
  /** Label text. */
  children: ReactNode
}

// ─── 2. ICON-BASED ACTIONS ───

export interface TPIconButtonProps
  extends TPButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Icon content. aria-label required when no text. */
  icon: ReactNode
  /** Optional label for extended tooltip. */
  label?: string
  /** For toggle: whether pressed/selected. */
  pressed?: boolean
  /** aria-pressed when used as toggle. */
  "aria-pressed"?: boolean
}

/** Toggle icon button: pressed state, aria-pressed. */
export interface TPToggleIconButtonProps extends TPIconButtonProps {
  pressed: boolean
  "aria-pressed": boolean
  /** Called when toggle state changes. */
  onToggle?: (pressed: boolean) => void
}

// ─── 3. STATEFUL BUTTONS ───

export interface TPToggleButtonProps
  extends TPButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant: TPButtonVariant
  /** Whether selected. */
  selected: boolean
  /** Value for group context. */
  value?: string
  /** Called when selection changes. */
  onSelect?: (selected: boolean) => void
  children: ReactNode
}

export interface TPLoadingButtonProps extends TPStandardButtonProps {
  loading: boolean
  /** Optional custom loading indicator. */
  loadingIndicator?: ReactNode
}

// ─── 4. SPLIT ACTION BUTTON ───

export interface TPSplitButtonAction {
  /** Unique id for keyboard/accessibility. */
  id: string
  /** Label. */
  label: string
  /** Optional icon. */
  icon?: ReactNode
  /** Optional shortcut hint (e.g. "⌘S"). */
  shortcut?: string
  /** Whether this action is disabled. */
  disabled?: boolean
  /** Danger styling (e.g. Delete). */
  danger?: boolean
  /** Called when selected. */
  onClick?: () => void
}

export interface TPSplitButtonProps extends TPButtonBaseProps {
  /** Primary action (main button). */
  primaryAction: {
    label: string
    icon?: ReactNode
    onClick: () => void
  }
  /** Secondary actions (dropdown menu). */
  secondaryActions: TPSplitButtonAction[]
  /** Variant for the combined button. */
  variant?: Exclude<TPButtonVariant, "link">
  /** Whether dropdown is open (controlled). */
  open?: boolean
  /** Called when dropdown open state changes. */
  onOpenChange?: (open: boolean) => void
  /** Loading applies to primary action. */
  loading?: boolean
}

// ─── 5. BUTTON GROUPS ───

export interface TPButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Layout: connected (merged), segmented (pill), toggle. */
  layout: TPButtonGroupLayout
  /** Orientation. */
  orientation?: "horizontal" | "vertical"
  /** Disabled state for entire group. */
  disabled?: boolean
  /** For toggle group: controlled selected value(s). */
  value?: string | string[]
  /** For toggle group: selection change handler. */
  onChange?: (value: string | string[]) => void
  children: ReactNode
}

export interface TPButtonGroupContextValue {
  layout: TPButtonGroupLayout
  orientation: "horizontal" | "vertical"
  disabled: boolean
  /** For toggle group: selected value. */
  value?: string | string[]
  onChange?: (value: string | string[]) => void
}

// ─── 6. FLOATING ACTION ───

export interface TPFabProps extends TPButtonBaseProps {
  /** FAB type. */
  type: TPFabType
  /** Icon. */
  icon: ReactNode
  /** Label (required for extended FAB). */
  label?: string
  /** Position. */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
}

export interface TPFabWithMenuProps extends TPFabProps {
  /** Child actions. */
  actions: Array<{
    id: string
    label: string
    icon?: ReactNode
    onClick: () => void
  }>
  /** Whether menu is open. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ─── REFS ───

export type TPStandardButtonRef = HTMLButtonElement
export type TPIconButtonRef = HTMLButtonElement
export type TPSplitButtonRef = HTMLDivElement
export type TPButtonGroupRef = HTMLDivElement
export type TPFabRef = HTMLButtonElement
