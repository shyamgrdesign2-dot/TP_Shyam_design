/**
 * ═══════════════════════════════════════════════════════════════
 * TatvaPractice Design System — Component Token Registry
 * ═══════════════════════════════════════════════════════════════
 *
 * Centralized source of truth for every component-level design
 * token. Consumed by:
 *  1. Inline token display on each showcase page
 *  2. Figma HTML export (variant-aware components)
 *  3. Component specs JSON export
 *  4. React library README generation
 *
 * Naming convention: TP.{component}.{property}.{variant?}.{state?}
 * ═══════════════════════════════════════════════════════════════
 */

























// ─── FOUNDATION: TYPOGRAPHY ───────────────────────────────────

export const typographyTokens = {
  component: "Typography",
  category: "foundation",
  description: "Type scale tokens for headings, body, labels, and utility text styles",
  tokens: [
  { token: "TP.text.display", value: "48px/56px", cssVar: "--tp-text-display", property: "font", description: "Hero titles, major page headers. Mulish 700" },
  { token: "TP.text.h1", value: "36px/44px", cssVar: "--tp-text-h1", property: "font", description: "Page titles, section headers. Mulish 700" },
  { token: "TP.text.h2", value: "30px/38px", cssVar: "--tp-text-h2", property: "font", description: "Section titles, card headers. Mulish 600" },
  { token: "TP.text.h3", value: "24px/32px", cssVar: "--tp-text-h3", property: "font", description: "Sub-section headers. Mulish 600" },
  { token: "TP.text.h4", value: "20px/28px", cssVar: "--tp-text-h4", property: "font", description: "Card titles, widget headers. Mulish 600" },
  { token: "TP.text.h5", value: "16px/24px", cssVar: "--tp-text-h5", property: "font", description: "Small section titles. Mulish 600" },
  { token: "TP.text.h6", value: "14px/20px", cssVar: "--tp-text-h6", property: "font", description: "Overlines, uppercase labels. Mulish 600" },
  { token: "TP.text.body.lg", value: "18px/28px", cssVar: "--tp-text-body-lg", property: "font", description: "Intro text, feature descriptions. Inter 400" },
  { token: "TP.text.body.base", value: "16px/24px", cssVar: "--tp-text-body-base", property: "font", description: "Default body text. Inter 400" },
  { token: "TP.text.body.sm", value: "14px/20px", cssVar: "--tp-text-body-sm", property: "font", description: "Secondary text, captions. Inter 400" },
  { token: "TP.text.body.xs", value: "12px/16px", cssVar: "--tp-text-body-xs", property: "font", description: "Badges, timestamps. Inter 500" },
  { token: "TP.text.label.lg", value: "16px/24px", cssVar: "--tp-text-label-lg", property: "font", description: "Large form labels. Inter 600" },
  { token: "TP.text.label.md", value: "14px/20px", cssVar: "--tp-text-label-md", property: "font", description: "Default labels, CTA text. Inter 600" },
  { token: "TP.text.label.sm", value: "12px/16px", cssVar: "--tp-text-label-sm", property: "font", description: "Small labels, tag text. Inter 600" },
  { token: "TP.text.overline", value: "12px/14px", cssVar: "--tp-text-overline", property: "font", description: "Section overlines. Inter 700, tracking 0.08em" },
  { token: "TP.font.heading", value: "Mulish", cssVar: "--font-heading", property: "font-family", description: "Heading font family" },
  { token: "TP.font.body", value: "Inter", cssVar: "--font-sans", property: "font-family", description: "Body font family" },
  { token: "TP.font.mono", value: "SF Mono, Menlo, Consolas, monospace", cssVar: "--font-mono", property: "font-family", description: "Code/monospace font family (system stack)" },
  { token: "TP.weight.regular", value: "400", property: "font-weight", description: "Regular weight for body text" },
  { token: "TP.weight.medium", value: "500", property: "font-weight", description: "Medium weight for emphasis" },
  { token: "TP.weight.semibold", value: "600", property: "font-weight", description: "Semibold for labels, buttons" },
  { token: "TP.weight.bold", value: "700", property: "font-weight", description: "Bold for headings" },
  { token: "TP.weight.extrabold", value: "800", property: "font-weight", description: "Extrabold for display text" }]

};

// ─── FOUNDATION: SPACING ──────────────────────────────────────

export const spacingTokens = {
  component: "Spacing",
  category: "foundation",
  description: "Spacing scale based on 2px base unit, grid system, and layout breakpoints",
  tokens: [
  { token: "TP.space.2", value: "2px", cssVar: "--tp-space-2", property: "spacing", description: "Minimal: dense icon padding" },
  { token: "TP.space.4", value: "4px", cssVar: "--tp-space-4", property: "spacing", description: "Tight: chip padding, inline gap" },
  { token: "TP.space.6", value: "6px", cssVar: "--tp-space-6", property: "spacing", description: "Compact: small button padding" },
  { token: "TP.space.8", value: "8px", cssVar: "--tp-space-8", property: "spacing", description: "Default: CTA vertical padding" },
  { token: "TP.space.10", value: "10px", cssVar: "--tp-space-10", property: "spacing", description: "Medium: input padding" },
  { token: "TP.space.12", value: "12px", cssVar: "--tp-space-12", property: "spacing", description: "Standard gap between elements" },
  { token: "TP.space.14", value: "14px", cssVar: "--tp-space-14", property: "spacing", description: "CTA horizontal padding" },
  { token: "TP.space.16", value: "16px", cssVar: "--tp-space-16", property: "spacing", description: "Card padding (compact)" },
  { token: "TP.space.18", value: "18px", cssVar: "--tp-space-18", property: "spacing", description: "Default card internal padding" },
  { token: "TP.space.20", value: "20px", cssVar: "--tp-space-20", property: "spacing", description: "Section padding" },
  { token: "TP.space.24", value: "24px", cssVar: "--tp-space-24", property: "spacing", description: "Large section gap" },
  { token: "TP.space.32", value: "32px", cssVar: "--tp-space-32", property: "spacing", description: "Hero section padding" },
  { token: "TP.space.40", value: "40px", cssVar: "--tp-space-40", property: "spacing", description: "Page-level vertical rhythm" },
  { token: "TP.space.48", value: "48px", cssVar: "--tp-space-48", property: "spacing", description: "Major section dividers" },
  { token: "TP.space.64", value: "64px", cssVar: "--tp-space-64", property: "spacing", description: "Full-page section breaks" },
  { token: "TP.grid.mobile.cols", value: "4", property: "grid-template-columns", description: "Mobile: 4 columns" },
  { token: "TP.grid.tablet.cols", value: "8", property: "grid-template-columns", description: "Tablet: 8 columns" },
  { token: "TP.grid.desktop.cols", value: "12", property: "grid-template-columns", description: "Desktop: 12 columns" },
  { token: "TP.grid.gutter", value: "16px", property: "gap", description: "Default grid gutter" },
  { token: "TP.grid.margin", value: "16-64px", property: "margin", description: "Responsive page margins" }]

};

// ─── FOUNDATION: SHADOWS & RADIUS ─────────────────────────────

export const shadowTokens = {
  component: "Shadows & Elevation",
  category: "foundation",
  description: "Layered elevation scale, focus rings, and hover/focus state shadows",
  tokens: [
  { token: "TP.shadow.xs", value: "0 1px 2px rgba(23,23,37,0.04)", cssVar: "--tp-shadow-xs", property: "box-shadow", description: "Subtle lift for inputs, small cards" },
  { token: "TP.shadow.sm", value: "0 1px 3px rgba(23,23,37,0.08)", cssVar: "--tp-shadow-sm", property: "box-shadow", description: "Default card shadow, dropdowns" },
  { token: "TP.shadow.md", value: "0 4px 8px rgba(23,23,37,0.08)", cssVar: "--tp-shadow-md", property: "box-shadow", description: "Elevated cards, modals, popovers" },
  { token: "TP.shadow.lg", value: "0 12px 24px rgba(23,23,37,0.08)", cssVar: "--tp-shadow-lg", property: "box-shadow", description: "Floating elements, prominent modals" },
  { token: "TP.shadow.xl", value: "0 20px 40px rgba(23,23,37,0.12)", cssVar: "--tp-shadow-xl", property: "box-shadow", description: "Hero overlays, command palettes" },
  { token: "TP.shadow.2xl", value: "0 32px 64px rgba(23,23,37,0.20)", cssVar: "--tp-shadow-2xl", property: "box-shadow", description: "Maximum elevation" },
  { token: "TP.shadow.focus.primary", value: "0 0 0 4px rgba(75,74,213,0.15)", cssVar: "--tp-shadow-focus-primary", property: "box-shadow", description: "Primary focus ring" },
  { token: "TP.shadow.focus.error", value: "0 0 0 4px rgba(225,29,72,0.15)", cssVar: "--tp-shadow-focus-error", property: "box-shadow", description: "Error focus ring" },
  { token: "TP.shadow.focus.neutral", value: "0 0 0 4px rgba(113,113,121,0.12)", cssVar: "--tp-shadow-focus-neutral", property: "box-shadow", description: "Neutral focus ring" }]

};

export const radiusTokens = {
  component: "Border Radius",
  category: "foundation",
  description: "Corner radius scale from 2px to full-round",
  tokens: [
  { token: "TP.radius.2", value: "2px", cssVar: "--tp-radius-2", property: "border-radius", description: "Micro elements, inline tags" },
  { token: "TP.radius.4", value: "4px", cssVar: "--tp-radius-4", property: "border-radius", description: "Small chips, badges" },
  { token: "TP.radius.6", value: "6px", cssVar: "--tp-radius-6", property: "border-radius", description: "Compact inputs, toggles" },
  { token: "TP.radius.8", value: "8px", cssVar: "--tp-radius-8", property: "border-radius", description: "Standard inputs, small cards" },
  { token: "TP.radius.10", value: "10px", cssVar: "--tp-radius-10", property: "border-radius", description: "Buttons (CTA default)" },
  { token: "TP.radius.12", value: "12px", cssVar: "--tp-radius-12", property: "border-radius", description: "CTA, medium cards" },
  { token: "TP.radius.16", value: "16px", cssVar: "--tp-radius-16", property: "border-radius", description: "Cards, dialogs" },
  { token: "TP.radius.20", value: "20px", cssVar: "--tp-radius-20", property: "border-radius", description: "Feature cards, modals" },
  { token: "TP.radius.24", value: "24px", cssVar: "--tp-radius-24", property: "border-radius", description: "Hero cards, banners" },
  { token: "TP.radius.42", value: "42px", cssVar: "--tp-radius-42", property: "border-radius", description: "Pill shapes" },
  { token: "TP.radius.full", value: "9999px", cssVar: "--tp-radius-full", property: "border-radius", description: "Perfect circle, status dots" }]

};

export const borderTokens = {
  component: "Borders",
  category: "foundation",
  description: "Border widths and semantic border colors",
  tokens: [
  { token: "TP.border.width.default", value: "1px", cssVar: "--tp-border-width-default", property: "border-width", description: "Default borders, dividers" },
  { token: "TP.border.width.medium", value: "1.5px", cssVar: "--tp-border-width-medium", property: "border-width", description: "CTA outlines, emphasis" },
  { token: "TP.border.width.strong", value: "2px", cssVar: "--tp-border-width-strong", property: "border-width", description: "Focus rings, selected states" },
  { token: "TP.border.width.heavy", value: "3px", cssVar: "--tp-border-width-heavy", property: "border-width", description: "Active tab indicator" },
  { token: "TP.border.color.default", value: "#E2E2EA", cssVar: "--tp-border-default", property: "border-color", description: "Default borders, card outlines" },
  { token: "TP.border.color.subtle", value: "#F1F1F5", cssVar: "--tp-border-subtle", property: "border-color", description: "Inner dividers, row separators" },
  { token: "TP.border.color.strong", value: "#D0D5DD", cssVar: "--tp-border-strong", property: "border-color", description: "Emphasized borders, input hover" },
  { token: "TP.border.color.focus", value: "#4B4AD5", cssVar: "--tp-border-focus", property: "border-color", description: "Focus state, active inputs" },
  { token: "TP.border.color.error", value: "#E11D48", cssVar: "--tp-border-error", property: "border-color", description: "Error state inputs" },
  { token: "TP.border.color.success", value: "#10B981", cssVar: "--tp-border-success", property: "border-color", description: "Success state inputs" }]

};

// ─── COMPONENT: CTA / BUTTONS ─────────────────────────────────

export const ctaTokens = {
  component: "CTA / Buttons",
  category: "cta",
  description: "Call-to-action tokens covering anatomy, color themes, sizes, and all interactive states",
  tokens: [
  // Anatomy
  { token: "TP.cta.height.sm", value: "32px", property: "height", description: "Small CTA height" },
  { token: "TP.cta.height.md", value: "38px", property: "height", description: "Medium CTA height (default)" },
  { token: "TP.cta.height.lg", value: "44px", property: "height", description: "Large CTA height" },
  { token: "TP.cta.radius", value: "10px", cssVar: "--tp-cta-radius", property: "border-radius", description: "CTA corner radius (locked)" },
  { token: "TP.cta.padding.x", value: "14px", property: "padding-inline", description: "Horizontal CTA padding" },
  { token: "TP.cta.padding.y", value: "8px", property: "padding-block", description: "Vertical CTA padding" },
  { token: "TP.cta.icon.size", value: "20px", property: "width/height", description: "Icon size inside CTAs (locked)" },
  { token: "TP.cta.font.size", value: "14px", property: "font-size", description: "CTA label font size" },
  { token: "TP.cta.font.weight", value: "600", property: "font-weight", description: "CTA label font weight (Semibold)" },
  { token: "TP.cta.font.family", value: "Inter", property: "font-family", description: "CTA label font family" },
  { token: "TP.cta.border.width", value: "1.5px", property: "border-width", description: "CTA outline border width" },
  // Primary theme
  { token: "TP.cta.bg.primary.default", value: "#4B4AD5", cssVar: "--tp-cta-primary-bg", property: "background-color", description: "Primary CTA background" },
  { token: "TP.cta.bg.primary.hover", value: "#3C3AB3", cssVar: "--tp-cta-primary-hover", property: "background-color", description: "Primary CTA hover background" },
  { token: "TP.cta.text.primary", value: "#FFFFFF", property: "color", description: "Primary CTA text" },
  { token: "TP.cta.bg.primary.disabled", value: "#E2E2EA", property: "background-color", description: "Primary CTA disabled background" },
  { token: "TP.cta.text.primary.disabled", value: "#A2A2A8", property: "color", description: "Primary CTA disabled text" },
  // Outline / Secondary
  { token: "TP.cta.bg.outline.default", value: "transparent", property: "background-color", description: "Outline CTA background" },
  { token: "TP.cta.border.outline", value: "#4B4AD5", property: "border-color", description: "Outline CTA border color" },
  { token: "TP.cta.text.outline", value: "#4B4AD5", property: "color", description: "Outline CTA text" },
  { token: "TP.cta.bg.outline.hover", value: "#EEEEFF", property: "background-color", description: "Outline CTA hover background" },
  // Ghost
  { token: "TP.cta.bg.ghost.default", value: "transparent", property: "background-color", description: "Ghost CTA background" },
  { token: "TP.cta.text.ghost", value: "#4B4AD5", property: "color", description: "Ghost CTA text" },
  { token: "TP.cta.bg.ghost.hover", value: "#EEEEFF", property: "background-color", description: "Ghost CTA hover background" },
  // Tonal
  { token: "TP.cta.bg.tonal.default", value: "#EEEEFF", property: "background-color", description: "Tonal CTA background" },
  { token: "TP.cta.text.tonal", value: "#4B4AD5", property: "color", description: "Tonal CTA text" },
  { token: "TP.cta.bg.tonal.hover", value: "#D8D8FF", property: "background-color", description: "Tonal CTA hover background" },
  // Neutral
  { token: "TP.cta.bg.neutral.default", value: "#F1F1F5", property: "background-color", description: "Neutral CTA background" },
  { token: "TP.cta.text.neutral", value: "#454551", property: "color", description: "Neutral CTA text" },
  { token: "TP.cta.bg.neutral.hover", value: "#E2E2EA", property: "background-color", description: "Neutral CTA hover background" },
  // Error / Destructive
  { token: "TP.cta.bg.error.default", value: "#E11D48", property: "background-color", description: "Destructive CTA background" },
  { token: "TP.cta.text.error", value: "#FFFFFF", property: "color", description: "Destructive CTA text" },
  { token: "TP.cta.bg.error.hover", value: "#BE123C", property: "background-color", description: "Destructive CTA hover background" },
  // Focus state
  { token: "TP.cta.focus.ring", value: "0 0 0 4px rgba(75,74,213,0.15)", property: "box-shadow", description: "CTA focus ring" },
  // Loading
  { token: "TP.cta.loading.opacity", value: "0.7", property: "opacity", description: "CTA opacity when loading" }]

};

// ─── COMPONENT: INPUT FIELDS ──────────────────────────────────

export const inputTokens = {
  component: "Input Fields",
  category: "input",
  description: "Text input, select, search, and form control tokens",
  tokens: [
  // Anatomy
  { token: "TP.input.height.sm", value: "36px", property: "height", description: "Small input height" },
  { token: "TP.input.height.md", value: "42px", property: "height", description: "Medium input height (default)" },
  { token: "TP.input.height.lg", value: "48px", property: "height", description: "Large input height" },
  { token: "TP.input.radius", value: "10px", cssVar: "--tp-input-radius", property: "border-radius", description: "Input corner radius" },
  { token: "TP.input.padding.x", value: "12px", property: "padding-inline", description: "Input horizontal padding" },
  { token: "TP.input.font.size", value: "14px", property: "font-size", description: "Input text size" },
  { token: "TP.input.icon.size", value: "20px", property: "width/height", description: "Input icon size" },
  { token: "TP.input.icon.color", value: "#A2A2A8", cssVar: "--tp-input-icon", property: "color", description: "Input icon color" },
  // Default state
  { token: "TP.input.bg.default", value: "#FFFFFF", property: "background-color", description: "Default input background" },
  { token: "TP.input.border.default", value: "#E2E2EA", property: "border-color", description: "Default input border" },
  { token: "TP.input.text.default", value: "#171725", property: "color", description: "Input text color" },
  { token: "TP.input.text.placeholder", value: "#A2A2A8", property: "color", description: "Placeholder text color" },
  // Hover
  { token: "TP.input.border.hover", value: "#D0D5DD", property: "border-color", description: "Input border on hover" },
  // Focus
  { token: "TP.input.border.focus", value: "#4B4AD5", property: "border-color", description: "Input border on focus" },
  { token: "TP.input.focus.ring", value: "0 0 0 4px rgba(75,74,213,0.08)", property: "box-shadow", description: "Input focus ring" },
  // Filled
  { token: "TP.input.bg.filled", value: "#F8F8FC", property: "background-color", description: "Input background when filled" },
  // Error
  { token: "TP.input.border.error", value: "#E11D48", property: "border-color", description: "Input border in error state" },
  { token: "TP.input.text.error", value: "#E11D48", property: "color", description: "Error helper text color" },
  { token: "TP.input.focus.error", value: "0 0 0 4px rgba(225,29,72,0.08)", property: "box-shadow", description: "Error focus ring" },
  // Success
  { token: "TP.input.border.success", value: "#10B981", property: "border-color", description: "Input border in success state" },
  { token: "TP.input.text.success", value: "#10B981", property: "color", description: "Success helper text color" },
  // Warning
  { token: "TP.input.border.warning", value: "#F59E0B", property: "border-color", description: "Input border in warning state" },
  // Disabled
  { token: "TP.input.bg.disabled", value: "#F8F8FC", property: "background-color", description: "Disabled input background" },
  { token: "TP.input.border.disabled", value: "#F1F1F5", property: "border-color", description: "Disabled input border" },
  { token: "TP.input.text.disabled", value: "#A2A2A8", property: "color", description: "Disabled input text color" },
  // Label
  { token: "TP.input.label.size", value: "14px", property: "font-size", description: "Form label font size" },
  { token: "TP.input.label.weight", value: "500", property: "font-weight", description: "Form label font weight" },
  { token: "TP.input.label.color", value: "#454551", property: "color", description: "Form label color" },
  // Helper text
  { token: "TP.input.helper.size", value: "12px", property: "font-size", description: "Helper text font size" },
  { token: "TP.input.helper.color", value: "#717179", property: "color", description: "Helper text color" }]

};

// ─── COMPONENT: CHECKBOX / RADIO / SWITCH ─────────────────────

export const toggleTokens = {
  component: "Checkbox, Radio & Switch",
  category: "input",
  description: "Selection control tokens for checkbox, radio, and toggle switch",
  tokens: [
  { token: "TP.checkbox.size", value: "20px", property: "width/height", description: "Checkbox box size" },
  { token: "TP.checkbox.radius", value: "6px", property: "border-radius", description: "Checkbox corner radius" },
  { token: "TP.checkbox.border.default", value: "#D0D5DD", property: "border-color", description: "Unchecked border" },
  { token: "TP.checkbox.bg.checked", value: "#4B4AD5", property: "background-color", description: "Checked background" },
  { token: "TP.checkbox.icon.color", value: "#FFFFFF", property: "color", description: "Checkmark icon color" },
  { token: "TP.radio.size", value: "20px", property: "width/height", description: "Radio button size" },
  { token: "TP.radio.dot.size", value: "8px", property: "width/height", description: "Radio inner dot size" },
  { token: "TP.radio.border.default", value: "#D0D5DD", property: "border-color", description: "Unselected radio border" },
  { token: "TP.radio.bg.selected", value: "#4B4AD5", property: "background-color", description: "Selected radio fill" },
  { token: "TP.switch.width", value: "44px", property: "width", description: "Switch track width" },
  { token: "TP.switch.height", value: "24px", property: "height", description: "Switch track height" },
  { token: "TP.switch.thumb.size", value: "18px", property: "width/height", description: "Switch thumb diameter" },
  { token: "TP.switch.bg.off", value: "#E2E2EA", property: "background-color", description: "Switch off track" },
  { token: "TP.switch.bg.on", value: "#4B4AD5", property: "background-color", description: "Switch on track" },
  { token: "TP.switch.thumb.color", value: "#FFFFFF", property: "background-color", description: "Switch thumb color" }]

};

// ─── COMPONENT: DATA DISPLAY ──────────────────────────────────

export const dataDisplayTokens = {
  component: "Data Display",
  category: "data",
  description: "Tokens for tables, tooltips, badges, avatars, and data visualization",
  tokens: [
  // Table
  { token: "TP.table.header.bg", value: "#F8F8FC", property: "background-color", description: "Table header background" },
  { token: "TP.table.header.text", value: "#454551", property: "color", description: "Table header text color" },
  { token: "TP.table.row.bg", value: "#FFFFFF", property: "background-color", description: "Table row background" },
  { token: "TP.table.row.hover", value: "#F8F8FC", property: "background-color", description: "Table row hover background" },
  { token: "TP.table.row.selected", value: "#EEEEFF", property: "background-color", description: "Table row selected background" },
  { token: "TP.table.border", value: "#F1F1F5", property: "border-color", description: "Table cell borders" },
  { token: "TP.table.cell.padding", value: "12px 16px", property: "padding", description: "Table cell padding" },
  { token: "TP.table.radius", value: "12px", property: "border-radius", description: "Table container radius" },
  // Badge
  { token: "TP.badge.bg.primary", value: "#EEEEFF", property: "background-color", description: "Primary badge background" },
  { token: "TP.badge.text.primary", value: "#4B4AD5", property: "color", description: "Primary badge text" },
  { token: "TP.badge.bg.success", value: "#ECFDF5", property: "background-color", description: "Success badge background" },
  { token: "TP.badge.text.success", value: "#059669", property: "color", description: "Success badge text" },
  { token: "TP.badge.bg.warning", value: "#FFFBEB", property: "background-color", description: "Warning badge background" },
  { token: "TP.badge.text.warning", value: "#D97706", property: "color", description: "Warning badge text" },
  { token: "TP.badge.bg.error", value: "#FFF1F2", property: "background-color", description: "Error badge background" },
  { token: "TP.badge.text.error", value: "#E11D48", property: "color", description: "Error badge text" },
  { token: "TP.badge.radius", value: "9999px", property: "border-radius", description: "Badge pill shape" },
  // Avatar
  { token: "TP.avatar.size.sm", value: "32px", property: "width/height", description: "Small avatar" },
  { token: "TP.avatar.size.md", value: "40px", property: "width/height", description: "Medium avatar (default)" },
  { token: "TP.avatar.size.lg", value: "48px", property: "width/height", description: "Large avatar" },
  { token: "TP.avatar.size.xl", value: "64px", property: "width/height", description: "Extra large avatar" },
  { token: "TP.avatar.radius", value: "9999px", property: "border-radius", description: "Avatar circle shape" },
  { token: "TP.avatar.bg", value: "#EEEEFF", property: "background-color", description: "Avatar placeholder background" },
  { token: "TP.avatar.text", value: "#4B4AD5", property: "color", description: "Avatar initials color" },
  // Tooltip
  { token: "TP.tooltip.bg", value: "#171725", property: "background-color", description: "Tooltip background" },
  { token: "TP.tooltip.text", value: "#FFFFFF", property: "color", description: "Tooltip text color" },
  { token: "TP.tooltip.radius", value: "8px", property: "border-radius", description: "Tooltip border radius" },
  { token: "TP.tooltip.font.size", value: "12px", property: "font-size", description: "Tooltip font size" }]

};

// ─── COMPONENT: FEEDBACK ──────────────────────────────────────

export const feedbackTokens = {
  component: "Feedback & Alerts",
  category: "feedback",
  description: "Tokens for alerts, toasts, banners, progress, and skeleton loading",
  tokens: [
  // Alert — Info
  { token: "TP.alert.info.bg", value: "#EEEEFF", property: "background-color", description: "Info alert background" },
  { token: "TP.alert.info.border", value: "#4B4AD5", property: "border-color", description: "Info alert border" },
  { token: "TP.alert.info.icon", value: "#4B4AD5", property: "color", description: "Info alert icon" },
  { token: "TP.alert.info.text", value: "#2D2D80", property: "color", description: "Info alert text" },
  // Alert — Success
  { token: "TP.alert.success.bg", value: "#ECFDF5", property: "background-color", description: "Success alert background" },
  { token: "TP.alert.success.border", value: "#10B981", property: "border-color", description: "Success alert border" },
  { token: "TP.alert.success.icon", value: "#059669", property: "color", description: "Success alert icon" },
  { token: "TP.alert.success.text", value: "#065F46", property: "color", description: "Success alert text" },
  // Alert — Warning
  { token: "TP.alert.warning.bg", value: "#FFFBEB", property: "background-color", description: "Warning alert background" },
  { token: "TP.alert.warning.border", value: "#F59E0B", property: "border-color", description: "Warning alert border" },
  { token: "TP.alert.warning.icon", value: "#D97706", property: "color", description: "Warning alert icon" },
  { token: "TP.alert.warning.text", value: "#92400E", property: "color", description: "Warning alert text" },
  // Alert — Error
  { token: "TP.alert.error.bg", value: "#FFF1F2", property: "background-color", description: "Error alert background" },
  { token: "TP.alert.error.border", value: "#E11D48", property: "border-color", description: "Error alert border" },
  { token: "TP.alert.error.icon", value: "#E11D48", property: "color", description: "Error alert icon" },
  { token: "TP.alert.error.text", value: "#9F1239", property: "color", description: "Error alert text" },
  // Toast
  { token: "TP.toast.bg.default", value: "#171725", property: "background-color", description: "Default toast background" },
  { token: "TP.toast.text.default", value: "#FFFFFF", property: "color", description: "Default toast text" },
  { token: "TP.toast.radius", value: "12px", property: "border-radius", description: "Toast border radius" },
  { token: "TP.toast.shadow", value: "TP.shadow.lg", property: "box-shadow", description: "Toast elevation" },
  // Progress
  { token: "TP.progress.track.bg", value: "#F1F1F5", property: "background-color", description: "Progress track background" },
  { token: "TP.progress.fill.primary", value: "#4B4AD5", property: "background-color", description: "Progress fill (primary)" },
  { token: "TP.progress.fill.success", value: "#10B981", property: "background-color", description: "Progress fill (success)" },
  { token: "TP.progress.fill.warning", value: "#F59E0B", property: "background-color", description: "Progress fill (warning)" },
  { token: "TP.progress.fill.error", value: "#E11D48", property: "background-color", description: "Progress fill (error)" },
  { token: "TP.progress.height", value: "8px", property: "height", description: "Progress bar height" },
  { token: "TP.progress.radius", value: "9999px", property: "border-radius", description: "Progress bar radius" },
  // Skeleton
  { token: "TP.skeleton.bg", value: "#F1F1F5", property: "background-color", description: "Skeleton base color" },
  { token: "TP.skeleton.shimmer", value: "#E2E2EA", property: "background-color", description: "Skeleton shimmer color" },
  { token: "TP.skeleton.radius", value: "8px", property: "border-radius", description: "Skeleton border radius" }]

};

// ─── COMPONENT: NAVIGATION ────────────────────────────────────

export const navigationTokens = {
  component: "Navigation",
  category: "navigation",
  description: "Tokens for tabs, sidebar, breadcrumbs, pagination, and dropdown menus",
  tokens: [
  // Tabs
  { token: "TP.tab.text.default", value: "#717179", property: "color", description: "Inactive tab text" },
  { token: "TP.tab.text.active", value: "#4B4AD5", property: "color", description: "Active tab text" },
  { token: "TP.tab.indicator.color", value: "#4B4AD5", property: "border-color", description: "Tab active indicator" },
  { token: "TP.tab.indicator.height", value: "2px", property: "border-width", description: "Tab indicator thickness" },
  { token: "TP.tab.bg.hover", value: "#F8F8FC", property: "background-color", description: "Tab hover background" },
  // Sidebar
  { token: "TP.sidebar.width", value: "260px", property: "width", description: "Sidebar width" },
  { token: "TP.sidebar.bg", value: "#FFFFFF", property: "background-color", description: "Sidebar background" },
  { token: "TP.sidebar.item.text.default", value: "#717179", property: "color", description: "Sidebar item text" },
  { token: "TP.sidebar.item.text.active", value: "#4B4AD5", property: "color", description: "Active sidebar item text" },
  { token: "TP.sidebar.item.bg.active", value: "#EEEEFF", property: "background-color", description: "Active sidebar item bg" },
  { token: "TP.sidebar.item.bg.hover", value: "#F8F8FC", property: "background-color", description: "Sidebar item hover bg" },
  { token: "TP.sidebar.item.radius", value: "8px", property: "border-radius", description: "Sidebar item radius" },
  { token: "TP.sidebar.item.padding", value: "8px 12px", property: "padding", description: "Sidebar item padding" },
  // Dropdown Menu
  { token: "TP.menu.bg", value: "#FFFFFF", property: "background-color", description: "Dropdown menu background" },
  { token: "TP.menu.border", value: "#E2E2EA", property: "border-color", description: "Dropdown menu border" },
  { token: "TP.menu.shadow", value: "TP.shadow.lg", property: "box-shadow", description: "Dropdown menu elevation" },
  { token: "TP.menu.radius", value: "12px", property: "border-radius", description: "Dropdown menu radius" },
  { token: "TP.menu.item.text", value: "#454551", property: "color", description: "Menu item text" },
  { token: "TP.menu.item.bg.hover", value: "#F8F8FC", property: "background-color", description: "Menu item hover bg" },
  { token: "TP.menu.item.text.danger", value: "#E11D48", property: "color", description: "Danger menu item text" },
  { token: "TP.menu.item.padding", value: "8px 12px", property: "padding", description: "Menu item padding" },
  // Breadcrumb
  { token: "TP.breadcrumb.text", value: "#717179", property: "color", description: "Breadcrumb text" },
  { token: "TP.breadcrumb.text.current", value: "#171725", property: "color", description: "Current breadcrumb" },
  { token: "TP.breadcrumb.separator", value: "#A2A2A8", property: "color", description: "Separator color" },
  // Pagination
  { token: "TP.pagination.size", value: "36px", property: "width/height", description: "Page button size" },
  { token: "TP.pagination.radius", value: "8px", property: "border-radius", description: "Page button radius" },
  { token: "TP.pagination.bg.active", value: "#4B4AD5", property: "background-color", description: "Active page bg" },
  { token: "TP.pagination.text.active", value: "#FFFFFF", property: "color", description: "Active page text" },
  { token: "TP.pagination.bg.hover", value: "#F1F1F5", property: "background-color", description: "Page hover bg" }]

};

// ─── COMPONENT: SURFACES ──────────────────────────────────────

export const surfaceTokens = {
  component: "Surfaces & Cards",
  category: "surface",
  description: "Tokens for cards, dialogs, drawers, accordions, and dividers",
  tokens: [
  // Card
  { token: "TP.card.bg", value: "#FFFFFF", cssVar: "--tp-card-bg", property: "background-color", description: "Card background" },
  { token: "TP.card.border", value: "#E2E2EA", property: "border-color", description: "Card border color" },
  { token: "TP.card.radius", value: "16px", property: "border-radius", description: "Card border radius" },
  { token: "TP.card.padding", value: "18px", property: "padding", description: "Card internal padding" },
  { token: "TP.card.shadow", value: "TP.shadow.sm", property: "box-shadow", description: "Card default elevation" },
  // Dialog / Modal
  { token: "TP.dialog.bg", value: "#FFFFFF", property: "background-color", description: "Dialog background" },
  { token: "TP.dialog.radius", value: "20px", property: "border-radius", description: "Dialog border radius" },
  { token: "TP.dialog.shadow", value: "TP.shadow.xl", property: "box-shadow", description: "Dialog elevation" },
  { token: "TP.dialog.overlay.bg", value: "rgba(23,23,37,0.40)", property: "background-color", description: "Dialog backdrop overlay" },
  { token: "TP.dialog.padding", value: "24px", property: "padding", description: "Dialog content padding" },
  // Drawer
  { token: "TP.drawer.bg", value: "#FFFFFF", property: "background-color", description: "Drawer background" },
  { token: "TP.drawer.shadow", value: "TP.shadow.2xl", property: "box-shadow", description: "Drawer elevation" },
  { token: "TP.drawer.overlay.bg", value: "rgba(23,23,37,0.40)", property: "background-color", description: "Drawer backdrop" },
  // Accordion
  { token: "TP.accordion.border", value: "#E2E2EA", property: "border-color", description: "Accordion divider" },
  { token: "TP.accordion.header.padding", value: "16px", property: "padding", description: "Accordion header padding" },
  { token: "TP.accordion.content.padding", value: "0 16px 16px", property: "padding", description: "Accordion content padding" },
  // Divider
  { token: "TP.divider.color", value: "#E2E2EA", property: "border-color", description: "Standard divider" },
  { token: "TP.divider.subtle", value: "#F1F1F5", property: "border-color", description: "Subtle divider" }]

};

// ─── COMPONENT: OVERLAYS ──────────────────────────────────────

export const overlayTokens = {
  component: "Overlays & Popups",
  category: "overlay",
  description: "Tokens for tooltips, popovers, dropdown menus, and command palettes",
  tokens: [
  { token: "TP.popover.bg", value: "#FFFFFF", property: "background-color", description: "Popover background" },
  { token: "TP.popover.border", value: "#E2E2EA", property: "border-color", description: "Popover border" },
  { token: "TP.popover.shadow", value: "TP.shadow.lg", property: "box-shadow", description: "Popover elevation" },
  { token: "TP.popover.radius", value: "12px", property: "border-radius", description: "Popover radius" },
  { token: "TP.command.bg", value: "#FFFFFF", property: "background-color", description: "Command palette background" },
  { token: "TP.command.border", value: "#E2E2EA", property: "border-color", description: "Command palette border" },
  { token: "TP.command.shadow", value: "TP.shadow.2xl", property: "box-shadow", description: "Command palette elevation" },
  { token: "TP.command.radius", value: "16px", property: "border-radius", description: "Command palette radius" },
  { token: "TP.command.input.bg", value: "#FFFFFF", property: "background-color", description: "Command input background" },
  { token: "TP.command.item.bg.selected", value: "#F8F8FC", property: "background-color", description: "Selected command item" }]

};

// ─── COMPLETE REGISTRY ────────────────────────────────────────

export const allComponentTokenGroups = [
typographyTokens,
spacingTokens,
shadowTokens,
radiusTokens,
borderTokens,
ctaTokens,
inputTokens,
toggleTokens,
dataDisplayTokens,
feedbackTokens,
navigationTokens,
surfaceTokens,
overlayTokens];


/** Get all tokens for a specific category */
export function getTokensByCategory(category) {
  return allComponentTokenGroups.filter((g) => g.category === category);
}

/** Get all tokens flat (for export) */
export function getAllTokensFlat() {
  return allComponentTokenGroups.flatMap((g) => g.tokens);
}

/** Total token count */
export function getTokenCount() {
  return allComponentTokenGroups.reduce((acc, g) => acc + g.tokens.length, 0);
}