// --- TatvaPractice Design System: Two-Level Token Architecture ---
// Level 1: Base Palette (system maintainers only)
// Level 2: Semantic Tokens (designers & developers use these)
// Rule: Components must ONLY reference semantic tokens. Never base palette directly.
// ─── BRAND GRADIENTS ───
export const gradients = {
    primary: {
        name: "Primary (TP Blue Depth)",
        description: "Primary brand surface background. Used for hero banners, feature highlight cards, and top-level brand moments.",
        css: "radial-gradient(101.06% 60.94% at 50% 55.44%, #4B4AD5 0%, #161558 39.08%, #2E2D96 78.16%, #4B4AD5 100%)",
        stops: [
            { position: "0%", color: "#4B4AD5" },
            { position: "39.08%", color: "#161558" },
            { position: "78.16%", color: "#2E2D96" },
            { position: "100%", color: "#4B4AD5" },
        ],
        variants: {
            hero: "radial-gradient(101.06% 60.94% at 50% 55.44%, #4B4AD5 0%, #161558 39.08%, #2E2D96 78.16%, #4B4AD5 100%)",
            card: "radial-gradient(101.06% 60.94% at 50% 55.44%, rgba(75,74,213,0.92) 0%, rgba(22,21,88,0.88) 39.08%, rgba(46,45,150,0.90) 78.16%, rgba(75,74,213,0.92) 100%)",
            subtle: "radial-gradient(101.06% 60.94% at 50% 55.44%, rgba(75,74,213,0.55) 0%, rgba(22,21,88,0.45) 39.08%, rgba(46,45,150,0.50) 78.16%, rgba(75,74,213,0.55) 100%)",
        },
    },
    secondary: {
        name: "Secondary (TP Violet Depth)",
        description: "Secondary brand surface background. Used for premium sections, educational content, and secondary hero banners.",
        css: "radial-gradient(99.09% 59.99% at 50% 55.44%, #8A4DBB 0%, #3E1C64 39.08%, #572A81 78.16%, #A461D8 100%)",
        stops: [
            { position: "0%", color: "#8A4DBB" },
            { position: "39.08%", color: "#3E1C64" },
            { position: "78.16%", color: "#572A81" },
            { position: "100%", color: "#A461D8" },
        ],
        variants: {
            hero: "radial-gradient(99.09% 59.99% at 50% 55.44%, #8A4DBB 0%, #3E1C64 39.08%, #572A81 78.16%, #A461D8 100%)",
            card: "radial-gradient(99.09% 59.99% at 50% 55.44%, rgba(138,77,187,0.92) 0%, rgba(62,28,100,0.88) 39.08%, rgba(87,42,129,0.90) 78.16%, rgba(164,97,216,0.92) 100%)",
            subtle: "radial-gradient(99.09% 59.99% at 50% 55.44%, rgba(138,77,187,0.55) 0%, rgba(62,28,100,0.45) 39.08%, rgba(87,42,129,0.50) 78.16%, rgba(164,97,216,0.55) 100%)",
        },
    },
    ai: {
        name: "AI (Intelligence Surface)",
        description: "Locked AI identity gradient. Reserved exclusively for intelligence features (Ask TatvaPractice, CDSS, Voice AI). Never use flat AI colors -- always use this gradient.",
        css: "linear-gradient(91deg, #D565EA 3.04%, #673AAC 66.74%, #1A1994 130.45%)",
        stops: [
            { position: "3.04%", color: "#D565EA" },
            { position: "66.74%", color: "#673AAC" },
            { position: "130.45%", color: "#1A1994" },
        ],
        variants: {
            hero: "linear-gradient(91deg, #D565EA 3.04%, #673AAC 66.74%, #1A1994 130.45%)",
            card: "linear-gradient(91deg, rgba(213,101,234,0.92) 3.04%, rgba(103,58,172,0.90) 66.74%, rgba(26,25,148,0.88) 130.45%)",
            subtle: "linear-gradient(91deg, rgba(213,101,234,0.55) 3.04%, rgba(103,58,172,0.50) 66.74%, rgba(26,25,148,0.45) 130.45%)",
        },
    },
};
// ──────────────────────────────────────────────
// LEVEL 1 -- BASE PALETTE (System Maintainers)
// ──────────────────────────────────────────────
export const designTokens = {
    primary: {
        name: "TP Blue -- Primary",
        description: "Core identity and action color. Signals Trust, Stability, Readiness. Primary CTAs, Links, Active Navigation, Focus Indicators.",
        colors: [
            { token: 50, value: "#EEEEFF", usage: "Lightest tint, selected surfaces" },
            { token: 100, value: "#D8D8FA", usage: "Selected-row tint, light bg" },
            { token: 200, value: "#B5B4F2", usage: "Focus ring, tag bg" },
            { token: 300, value: "#8E8DE8", usage: "Active accent, progress fill" },
            { token: 400, value: "#6C6BDE", usage: "Link color (alt), badge bg" },
            { token: 500, value: "#4B4AD5", usage: "Base -- Primary CTAs, brand identity" },
            { token: 600, value: "#3C3BB5", usage: "Hover state for primary CTA" },
            { token: 700, value: "#2E2D96", usage: "Pressed state, gradient stop" },
            { token: 800, value: "#212077", usage: "Gradient stop, dark surfaces" },
            { token: 900, value: "#161558", usage: "Deepest accent, hero gradient stop" },
        ],
    },
    secondary: {
        name: "TP Violet -- Secondary",
        description: "Information and education color. Informative UI, Suggestions, Educational Content, AI identity. NEVER used for CTAs.",
        colors: [
            { token: 50, value: "#FAF5FE", usage: "Lightest tint, subtle bg" },
            { token: 100, value: "#EDDFF7", usage: "Selected-row tint" },
            { token: 200, value: "#DBBFEF", usage: "AI border, tag bg" },
            { token: 300, value: "#C89FE7", usage: "AI silent accent" },
            { token: 400, value: "#BA7DE9", usage: "Informative accent" },
            { token: 500, value: "#A461D8", usage: "Base -- Informative surfaces, education" },
            { token: 600, value: "#8A4DBB", usage: "AI secondary text, hover" },
            { token: 700, value: "#703A9E", usage: "Pressed state, gradient stop" },
            { token: 800, value: "#572A81", usage: "AI primary text" },
            { token: 900, value: "#3E1C64", usage: "Deepest accent, deep gradient" },
        ],
    },
    tertiary: {
        name: "TP Amber -- Tertiary (Minimized Use)",
        description: "Intentionally minimized. NOT part of the primary visual language. Rare Distinction, Special Highlights only.",
        colors: [
            { token: 50, value: "#FFFBEB", usage: "Lightest warm tint" },
            { token: 100, value: "#FFF4CC", usage: "Subtle warm bg" },
            { token: 200, value: "#FFE8AE", usage: "Highlight bg" },
            { token: 300, value: "#FEDC85", usage: "Warm accent" },
            { token: 400, value: "#FED15E", usage: "Active warm accent" },
            { token: 500, value: "#F5B832", usage: "Base -- Special highlights only" },
            { token: 600, value: "#D99B1A", usage: "Hover state" },
            { token: 700, value: "#B47D10", usage: "Pressed state" },
            { token: 800, value: "#8F6008", usage: "Dark warm accent" },
            { token: 900, value: "#6A4504", usage: "Deepest warm" },
        ],
    },
    aiGradientStops: {
        name: "AI Gradient Stops",
        description: "Locked AI identity gradient stops. Reserved exclusively for intelligence features. Always use as gradient, never flat.",
        colors: [
            { token: "start", value: "#D565EA", usage: "AI gradient start (pink)" },
            { token: "mid", value: "#673AAC", usage: "AI gradient mid-stop (violet)" },
            { token: "end", value: "#1A1994", usage: "AI gradient deep-stop (indigo)" },
        ],
    },
    tpSlate: {
        name: "TP Slate (Neutrals)",
        description: "Text, Borders, Dividers, Structure. System neutrals for all surfaces.",
        colors: [
            { token: 0, value: "#FFFFFF", usage: "Pure white: cards, modals, inputs" },
            { token: 50, value: "#FAFAFB", usage: "Subtle sections, zebra rows" },
            { token: 100, value: "#F1F1F5", usage: "Page canvas, disabled bg" },
            { token: 200, value: "#E2E2EA", usage: "Default borders, card separators" },
            { token: 300, value: "#D0D5DD", usage: "Input borders, section edges, disabled text" },
            { token: 400, value: "#A2A2A8", usage: "Placeholders, hints, disabled icons" },
            { token: 500, value: "#717179", usage: "Default icons, meta text" },
            { token: 600, value: "#545460", usage: "Metadata, labels, captions" },
            { token: 700, value: "#454551", usage: "Body text, descriptions" },
            { token: 800, value: "#2C2C35", usage: "Strong emphasis text" },
            { token: 900, value: "#171725", usage: "Headings, main content, overlays" },
        ],
    },
    functional: {
        name: "Status & Feedback Colors",
        description: "Full 50-900 scales for Success, Warning, and Error. Built for healthcare EMR contexts -- allergy alerts, Rx confirmations, vitals thresholds, clinical validation.",
        subgroups: [
            {
                name: "TP Success (Green)",
                colors: [
                    { token: 50, value: "#ECFDF5", usage: "Confirmation surface, Rx saved bg" },
                    { token: 100, value: "#D1FAE5", usage: "Success tint, vitals normal band" },
                    { token: 200, value: "#A7F3D0", usage: "Success tag bg, badge fill" },
                    { token: 300, value: "#6EE7B7", usage: "Progress fill, chart positive" },
                    { token: 400, value: "#34D399", usage: "Active success accent" },
                    { token: 500, value: "#10B981", usage: "Base -- Confirmation icons, check marks" },
                    { token: 600, value: "#059669", usage: "Success icon, status dot" },
                    { token: 700, value: "#047857", usage: "Success text on light surfaces" },
                    { token: 800, value: "#065F46", usage: "Strong success text, titles" },
                    { token: 900, value: "#064E3B", usage: "Deepest success, dark overlays" },
                ],
            },
            {
                name: "TP Warning (Amber)",
                colors: [
                    { token: 50, value: "#FFFBEB", usage: "Warning surface, drug interaction bg" },
                    { token: 100, value: "#FEF3C7", usage: "Warning tint, review-needed tray" },
                    { token: 200, value: "#FDE68A", usage: "Warning tag bg" },
                    { token: 300, value: "#FCD34D", usage: "Warning border accent" },
                    { token: 400, value: "#FBBF24", usage: "Active warning accent" },
                    { token: 500, value: "#F59E0B", usage: "Base -- Warning icons, attention" },
                    { token: 600, value: "#D97706", usage: "Warning icon, status dot" },
                    { token: 700, value: "#B45309", usage: "Warning text on light surfaces" },
                    { token: 800, value: "#92400E", usage: "Strong warning text, titles" },
                    { token: 900, value: "#78350F", usage: "Deepest warning, dark overlays" },
                ],
            },
            {
                name: "TP Error (Crimson Red)",
                colors: [
                    { token: 50, value: "#FFF1F2", usage: "Error surface, allergy alert bg" },
                    { token: 100, value: "#FFE4E6", usage: "Error tint, validation failed bg" },
                    { token: 200, value: "#FECDD3", usage: "Error tag bg, badge fill" },
                    { token: 300, value: "#FDA4AF", usage: "Error border accent" },
                    { token: 400, value: "#FB7185", usage: "Active error accent" },
                    { token: 500, value: "#E11D48", usage: "Base -- Critical alerts, allergy flags" },
                    { token: 600, value: "#C8102E", usage: "Error icon, destructive action" },
                    { token: 700, value: "#9F1239", usage: "Error text on light surfaces" },
                    { token: 800, value: "#881337", usage: "Strong error text, critical titles" },
                    { token: 900, value: "#4C0519", usage: "Deepest error, severe alert overlay" },
                ],
            },
        ],
    },
};
// ──────────────────────────────────────────────
// LEVEL 2 -- SEMANTIC TOKENS (Designers & Devs)
// Naming: TP.{category}.{role}.{state}
// ──────────────────────────────────────────────
export const semanticTokens = {
    text: {
        name: "Text Tokens",
        description: "Primary communication layer. High contrast and hierarchy for clinical readability.",
        groups: [
            {
                name: "Core Text Hierarchy",
                tokens: [
                    { token: "TP.text.heading", usage: "Page titles, section headings", source: "tp-slate-900", value: "#171725" },
                    { token: "TP.text.primary", usage: "Primary text, body, descriptions", source: "tp-slate-700", value: "#454551" },
                    { token: "TP.text.tertiary", usage: "Metadata, timestamps, lab units, captions", source: "tp-slate-600", value: "#545460" },
                    { token: "TP.text.placeholder", usage: "Input placeholders, search hints", source: "tp-slate-400", value: "#A2A2A8" },
                    { token: "TP.text.disabled", usage: "Disabled labels, inactive controls", source: "tp-slate-300", value: "#D0D5DD" },
                    { token: "TP.text.inverse", usage: "Text on dark/gradient surfaces", source: "tp-slate-0", value: "#FFFFFF" },
                ],
            },
            {
                name: "Branded Text",
                tokens: [
                    { token: "TP.text.brand", usage: "Selected nav, active tab, primary action text", source: "tp-blue-500", value: "#4B4AD5" },
                    { token: "TP.text.link", usage: "Clickable links, breadcrumbs", source: "tp-blue-500", value: "#4B4AD5" },
                    { token: "TP.text.link.hover", usage: "Link hover state", source: "tp-blue-600", value: "#3C3BB5" },
                    { token: "TP.text.ai", usage: "AI-assisted labels, CDSS confidence text", source: "tp-violet-600", value: "#8A4DBB" },
                ],
            },
            {
                name: "Status Text",
                tokens: [
                    { token: "TP.text.success", usage: "Rx confirmed, vitals normal, appointment saved", source: "tp-success-700", value: "#047857" },
                    { token: "TP.text.warning", usage: "Drug interaction alert, pending review", source: "tp-warning-700", value: "#B45309" },
                    { token: "TP.text.error", usage: "Allergy flag, validation failed, critical alert", source: "tp-error-700", value: "#9F1239" },
                ],
            },
        ],
    },
    background: {
        name: "Background Tokens",
        description: "Canvas, containers, surfaces, and branded depth backgrounds.",
        groups: [
            {
                name: "Core Surfaces",
                tokens: [
                    { token: "TP.bg.page", usage: "App canvas / body / EMR workspace", source: "tp-slate-100", value: "#F1F1F5" },
                    { token: "TP.bg.surface", usage: "Section containers, panels", source: "tp-slate-0", value: "#FFFFFF" },
                    { token: "TP.bg.card", usage: "Cards, modals, patient info tiles", source: "tp-slate-0", value: "#FFFFFF" },
                    { token: "TP.bg.elevated", usage: "Elevated cards, popovers, tooltips", source: "tp-slate-0", value: "#FFFFFF" },
                    { token: "TP.bg.subtle", usage: "Zebra rows, alternate sections", source: "tp-slate-50", value: "#FAFAFB" },
                    { token: "TP.bg.section.header", usage: "SectionSummaryBar + SectionTag default fill — tp-slate-100 (#F1F1F5) at 70% opacity; label/icon tp-slate-500, semibold. Sub-keys in rows (BP:, lab names, Chronic:) use tp-slate-400 semibold", source: "tp-slate-100/70", value: "rgba(241,241,245,0.7) over white" },
                    { token: "TP.bg.input", usage: "Input fields, text areas", source: "tp-slate-0", value: "#FFFFFF" },
                    { token: "TP.bg.disabled", usage: "Disabled inputs, inactive cards", source: "tp-slate-100", value: "#F1F1F5" },
                ],
            },
            {
                name: "Interaction Surfaces",
                tokens: [
                    { token: "TP.bg.hover.subtle", usage: "Row hover, list item hover", source: "tp-slate-50", value: "#FAFAFB" },
                    { token: "TP.bg.selected.subtle", usage: "Selected rows, active list items", source: "tp-blue-50", value: "#EEEEFF" },
                    { token: "TP.bg.brand.soft", usage: "Brand-tinted panels, onboarding cards", source: "tp-blue-50", value: "#EEEEFF" },
                    { token: "TP.bg.overlay", usage: "Modal overlays, drawer backdrop", source: "tp-slate-900/50", value: "rgba(23,23,37,0.50)" },
                ],
            },
            {
                name: "Brand Depth Surfaces",
                tokens: [
                    { token: "TP.bg.depth.primary", usage: "Primary hero, feature banner, brand section", source: "gradient.primary.hero", value: "TP Blue Depth" },
                    { token: "TP.bg.depth.primary.card", usage: "Primary feature card, highlight tile", source: "gradient.primary.card", value: "TP Blue Depth (Card)" },
                    { token: "TP.bg.depth.secondary", usage: "Secondary hero, premium section, education", source: "gradient.secondary.hero", value: "TP Violet Depth" },
                    { token: "TP.bg.depth.secondary.card", usage: "Secondary feature card, premium tile", source: "gradient.secondary.card", value: "TP Violet Depth (Card)" },
                    { token: "TP.bg.ai.surface", usage: "AI panel, CDSS card, voice assistant", source: "gradient.ai", value: "AI Gradient" },
                ],
            },
            {
                name: "Status Surfaces",
                tokens: [
                    { token: "TP.bg.success.soft", usage: "Rx confirmed bg, vitals normal band", source: "tp-success-50", value: "#ECFDF5" },
                    { token: "TP.bg.success.muted", usage: "Success tag fill, badge bg", source: "tp-success-100", value: "#D1FAE5" },
                    { token: "TP.bg.warning.soft", usage: "Drug interaction bg, pending review", source: "tp-warning-50", value: "#FFFBEB" },
                    { token: "TP.bg.warning.muted", usage: "Warning tag fill, attention badge", source: "tp-warning-100", value: "#FEF3C7" },
                    { token: "TP.bg.error.soft", usage: "Allergy alert bg, critical validation", source: "tp-error-50", value: "#FFF1F2" },
                    { token: "TP.bg.error.muted", usage: "Error tag fill, failed badge", source: "tp-error-100", value: "#FFE4E6" },
                ],
            },
        ],
    },
    border: {
        name: "Border Tokens",
        description: "Structure, separation, and interactive emphasis for clinical interfaces.",
        groups: [
            {
                name: "Primary Borders",
                tokens: [
                    { token: "TP.border.primary", usage: "Primary CTA borders, focus ring", source: "tp-blue-500", value: "#4B4AD5" },
                    { token: "TP.border.primary.subtle", usage: "Primary soft border, focus rings", source: "tp-blue-200", value: "#B5B4F2" },
                    { token: "TP.border.primary.light", usage: "Primary lightest, selected card", source: "tp-blue-50", value: "#EEEEFF" },
                ],
            },
            {
                name: "Violet Borders",
                tokens: [
                    { token: "TP.border.violet", usage: "AI panel borders, informative emphasis", source: "tp-violet-500", value: "#A461D8" },
                    { token: "TP.border.violet.subtle", usage: "AI card border, CDSS emphasis", source: "tp-violet-200", value: "#DBBFEF" },
                    { token: "TP.border.violet.light", usage: "Violet lightest border", source: "tp-violet-50", value: "#FAF5FE" },
                ],
            },
            {
                name: "Neutral Borders",
                tokens: [
                    { token: "TP.border.neutral.lightest", usage: "Inner dividers, table rows", source: "tp-slate-100", value: "#F1F1F5" },
                    { token: "TP.border.neutral.default", usage: "Card borders, input borders", source: "tp-slate-200", value: "#E2E2EA" },
                    { token: "TP.border.neutral.strong", usage: "Section separation, emphasis", source: "tp-slate-300", value: "#D0D5DD" },
                    { token: "TP.border.neutral.disabled", usage: "Disabled input borders", source: "tp-slate-100", value: "#F1F1F5" },
                ],
            },
            {
                name: "Status Borders",
                tokens: [
                    { token: "TP.border.success", usage: "Confirmed border", source: "tp-success-500", value: "#10B981" },
                    { token: "TP.border.success.soft", usage: "Success card soft border", source: "tp-success-200", value: "#A7F3D0" },
                    { token: "TP.border.warning", usage: "Attention border", source: "tp-warning-500", value: "#F59E0B" },
                    { token: "TP.border.warning.soft", usage: "Warning card soft border", source: "tp-warning-200", value: "#FDE68A" },
                    { token: "TP.border.error", usage: "Critical border", source: "tp-error-500", value: "#E11D48" },
                    { token: "TP.border.error.soft", usage: "Error card soft border", source: "tp-error-200", value: "#FECDD3" },
                ],
            },
        ],
    },
    interactive: {
        name: "Interactive Tokens",
        description: "Buttons, links, and clickable elements across the EMR workspace.",
        groups: [
            {
                name: "Primary CTA",
                tokens: [
                    { token: "TP.interactive.primary.bg", usage: "Primary CTA (save, confirm, submit)", source: "tp-blue-500", value: "#4B4AD5" },
                    { token: "TP.interactive.primary.hover", usage: "CTA hover state", source: "tp-blue-600", value: "#3C3BB5" },
                    { token: "TP.interactive.primary.active", usage: "CTA active/pressed", source: "tp-blue-700", value: "#2E2D96" },
                    { token: "TP.interactive.primary.text", usage: "CTA label on primary bg", source: "tp-slate-0", value: "#FFFFFF" },
                ],
            },
            {
                name: "Primary CTA on Dark Surface",
                tokens: [
                    { token: "TP.interactive.primary.dark.bg", usage: "Primary CTA on gradient/dark bg", source: "tp-slate-0", value: "#FFFFFF" },
                    { token: "TP.interactive.primary.dark.text", usage: "CTA label on white button", source: "tp-blue-900", value: "#161558" },
                    { token: "TP.interactive.primary.dark.hover", usage: "CTA hover on dark surface", source: "tp-slate-200", value: "#E2E2EA" },
                ],
            },
            {
                name: "Secondary CTA",
                tokens: [
                    { token: "TP.interactive.secondary.bg", usage: "Secondary CTA bg (outline)", source: "transparent", value: "transparent" },
                    { token: "TP.interactive.secondary.border", usage: "Secondary outline border", source: "tp-blue-500", value: "#4B4AD5" },
                    { token: "TP.interactive.secondary.text", usage: "Secondary label", source: "tp-blue-500", value: "#4B4AD5" },
                    { token: "TP.interactive.secondary.hover", usage: "Secondary hover fill", source: "tp-blue-50", value: "#EEEEFF" },
                ],
            },
            {
                name: "Neutral CTA",
                tokens: [
                    { token: "TP.interactive.neutral.bg", usage: "Neutral / secondary CTA fill", source: "tp-slate-100", value: "#F1F1F5" },
                    { token: "TP.interactive.neutral.hover", usage: "Neutral hover", source: "tp-slate-200", value: "#E2E2EA" },
                    { token: "TP.interactive.neutral.text", usage: "Neutral label (TP Slate 700)", source: "tp-slate-700", value: "#454551" },
                ],
            },
            {
                name: "Destructive CTA",
                tokens: [
                    { token: "TP.interactive.destructive.bg", usage: "Delete, cancel appointment, remove allergy", source: "tp-error-600", value: "#C8102E" },
                    { token: "TP.interactive.destructive.hover", usage: "Destructive hover state", source: "tp-error-700", value: "#9F1239" },
                    { token: "TP.interactive.destructive.text", usage: "Destructive label on red bg", source: "tp-slate-0", value: "#FFFFFF" },
                ],
            },
            {
                name: "Disabled",
                tokens: [
                    { token: "TP.interactive.disabled.bg", usage: "Disabled button / input", source: "tp-slate-200", value: "#E2E2EA" },
                    { token: "TP.interactive.disabled.text", usage: "Disabled label", source: "tp-slate-400", value: "#A2A2A8" },
                ],
            },
            {
                name: "Links",
                tokens: [
                    { token: "TP.interactive.link.default", usage: "Text links, breadcrumbs", source: "tp-blue-500", value: "#4B4AD5" },
                    { token: "TP.interactive.link.hover", usage: "Link hover", source: "tp-blue-600", value: "#3C3BB5" },
                    { token: "TP.interactive.link.visited", usage: "Visited link", source: "tp-violet-600", value: "#8A4DBB" },
                ],
            },
        ],
    },
    icon: {
        name: "Icon Tokens",
        description: "Visual cues, navigation, and clinical status indicators.",
        groups: [
            {
                name: "Navigation & Action Icons",
                tokens: [
                    { token: "TP.icon.default", usage: "Default inactive icons, sidebar", source: "tp-slate-500", value: "#717179" },
                    { token: "TP.icon.hover", usage: "Icon hover state", source: "tp-slate-700", value: "#454551" },
                    { token: "TP.icon.active", usage: "Active nav, selected tab icon", source: "tp-blue-500", value: "#4B4AD5" },
                    { token: "TP.icon.informative", usage: "Informative / static icons (TP secondary)", source: "tp-violet-600", value: "#8A4DBB" },
                    { token: "TP.icon.informative.bg", usage: "Informative icon container (lighter violet)", source: "tp-violet-100", value: "#FAF5FE" },
                    { token: "TP.icon.disabled", usage: "Disabled, greyed-out icons", source: "tp-slate-300", value: "#D0D5DD" },
                    { token: "TP.icon.inverse", usage: "Icons on dark/gradient surfaces", source: "tp-slate-0", value: "#FFFFFF" },
                    { token: "TP.icon.clickable.light.bg", usage: "Unselected clickable icon container (white surface)", source: "tp-blue-500/10", value: "rgba(75,74,213,0.10)" },
                    { token: "TP.icon.clickable.light.bg.hover", usage: "Hover clickable icon container (white surface)", source: "tp-blue-500/15", value: "rgba(75,74,213,0.15)" },
                    { token: "TP.icon.clickable.dark.bg", usage: "Unselected clickable icon container (dark sidebar)", source: "tp-slate-0/25", value: "rgba(255,255,255,0.25)" },
                    { token: "TP.icon.clickable.dark.bg.hover", usage: "Hover clickable icon container (dark sidebar)", source: "tp-slate-0/28", value: "rgba(255,255,255,0.28)" },
                ],
            },
            {
                name: "Clinical Status Icons",
                tokens: [
                    { token: "TP.icon.ai", usage: "AI feature icons (CDSS, voice)", source: "ai.gradient", value: "AI Gradient" },
                    { token: "TP.icon.success", usage: "Rx confirmed, vitals ok, check", source: "tp-success-600", value: "#059669" },
                    { token: "TP.icon.warning", usage: "Drug interaction, attention needed", source: "tp-warning-600", value: "#D97706" },
                    { token: "TP.icon.error", usage: "Allergy flag, critical alert, fail", source: "tp-error-600", value: "#C8102E" },
                ],
            },
        ],
    },
    ai: {
        name: "AI-Specific Tokens",
        description: "Reserved for AI-powered features. Always use AI gradient, never flat colors.",
        groups: [
            {
                name: "AI Surfaces & Actions",
                tokens: [
                    { token: "TP.ai.cta", usage: "AI CTA buttons (Ask TatvaPractice)", source: "ai.gradient", value: "AI Gradient" },
                    { token: "TP.ai.surface", usage: "AI panel backgrounds, CDSS card", source: "ai.gradient.surface", value: "AI Gradient" },
                    { token: "TP.ai.icon", usage: "AI feature icons, sparkle", source: "ai.gradient", value: "AI Gradient" },
                    { token: "TP.ai.border", usage: "AI panel border, CDSS emphasis", source: "tp-violet-200", value: "#DBBFEF" },
                    { token: "TP.ai.text.primary", usage: "AI content titles", source: "tp-violet-800", value: "#572A81" },
                    { token: "TP.ai.text.secondary", usage: "AI metadata, confidence scores", source: "tp-violet-600", value: "#8A4DBB" },
                    { token: "TP.ai.badge.bg", usage: "'AI' badge background", source: "ai.gradient", value: "AI Gradient" },
                    { token: "TP.ai.badge.text", usage: "'AI' badge text", source: "tp-slate-0", value: "#FFFFFF" },
                    { token: "TP.ai.accent", usage: "AI silent accent, subtle glow", source: "tp-violet-300", value: "#C89FE7" },
                ],
            },
        ],
    },
    status: {
        name: "Clinical Status Tokens",
        description: "EMR-specific feedback states. Maps to clinical workflows: Rx confirmations, allergy alerts, vitals thresholds, drug interactions.",
        groups: [
            {
                name: "Confirmed / Success",
                tokens: [
                    { token: "TP.status.confirmed.bg", usage: "Rx saved, appointment booked, vitals normal", source: "tp-success-50", value: "#ECFDF5" },
                    { token: "TP.status.confirmed.bg.muted", usage: "Tag fill, badge bg for confirmed", source: "tp-success-100", value: "#D1FAE5" },
                    { token: "TP.status.confirmed.border", usage: "Confirmed card border", source: "tp-success-500", value: "#10B981" },
                    { token: "TP.status.confirmed.border.subtle", usage: "Confirmed soft border", source: "tp-success-200", value: "#A7F3D0" },
                    { token: "TP.status.confirmed.text", usage: "Confirmed text label", source: "tp-success-700", value: "#047857" },
                    { token: "TP.status.confirmed.icon", usage: "Confirmed icon, check mark", source: "tp-success-600", value: "#059669" },
                ],
            },
            {
                name: "Attention / Warning",
                tokens: [
                    { token: "TP.status.attention.bg", usage: "Drug interaction alert, pending review, expiring Rx", source: "tp-warning-50", value: "#FFFBEB" },
                    { token: "TP.status.attention.bg.muted", usage: "Tag fill, badge bg for attention", source: "tp-warning-100", value: "#FEF3C7" },
                    { token: "TP.status.attention.border", usage: "Attention card border", source: "tp-warning-500", value: "#F59E0B" },
                    { token: "TP.status.attention.border.subtle", usage: "Attention soft border", source: "tp-warning-200", value: "#FDE68A" },
                    { token: "TP.status.attention.text", usage: "Attention text label", source: "tp-warning-700", value: "#B45309" },
                    { token: "TP.status.attention.icon", usage: "Attention icon, warning triangle", source: "tp-warning-600", value: "#D97706" },
                ],
            },
            {
                name: "Critical / Error",
                tokens: [
                    { token: "TP.status.critical.bg", usage: "Allergy flag, failed auth, critical vitals", source: "tp-error-50", value: "#FFF1F2" },
                    { token: "TP.status.critical.bg.muted", usage: "Tag fill, badge bg for critical", source: "tp-error-100", value: "#FFE4E6" },
                    { token: "TP.status.critical.border", usage: "Critical card border", source: "tp-error-500", value: "#E11D48" },
                    { token: "TP.status.critical.border.subtle", usage: "Critical soft border", source: "tp-error-200", value: "#FECDD3" },
                    { token: "TP.status.critical.text", usage: "Critical text label, allergy name", source: "tp-error-700", value: "#9F1239" },
                    { token: "TP.status.critical.icon", usage: "Critical icon, shield alert", source: "tp-error-600", value: "#C8102E" },
                ],
            },
        ],
    },
};
export const shadowScale = [
    { name: "Extra Small", token: "xs", css: "0 1px 2px 0 rgba(23,23,37,0.04)", x: 0, y: 1, blur: 2, spread: 0, color: "rgba(23,23,37,0.04)", usage: "Subtle lift for inputs, small cards" },
    { name: "Small", token: "sm", css: "0 1px 3px 0 rgba(23,23,37,0.08), 0 1px 2px -1px rgba(23,23,37,0.06)", x: 0, y: 1, blur: 3, spread: 0, color: "rgba(23,23,37,0.08)", usage: "Default card shadow, dropdowns" },
    { name: "Medium", token: "md", css: "0 4px 8px -2px rgba(23,23,37,0.08), 0 2px 4px -2px rgba(23,23,37,0.06)", x: 0, y: 4, blur: 8, spread: -2, color: "rgba(23,23,37,0.08)", usage: "Elevated cards, modals, popovers" },
    { name: "Large", token: "lg", css: "0 12px 24px -4px rgba(23,23,37,0.08), 0 4px 8px -4px rgba(23,23,37,0.04)", x: 0, y: 12, blur: 24, spread: -4, color: "rgba(23,23,37,0.08)", usage: "Floating elements, prominent modals" },
    { name: "Extra Large", token: "xl", css: "0 20px 40px -8px rgba(23,23,37,0.12), 0 8px 16px -6px rgba(23,23,37,0.06)", x: 0, y: 20, blur: 40, spread: -8, color: "rgba(23,23,37,0.12)", usage: "Hero overlays, command palettes" },
    { name: "2X Large", token: "2xl", css: "0 32px 64px -12px rgba(23,23,37,0.20)", x: 0, y: 32, blur: 64, spread: -12, color: "rgba(23,23,37,0.20)", usage: "Maximum elevation, full-screen overlays" },
    { name: "Focus Primary", token: "focus-primary", css: "0 0 0 3px #B5B4F2", x: 0, y: 0, blur: 0, spread: 3, color: "#B5B4F2", usage: "Primary focus ring" },
    { name: "Focus Error", token: "focus-error", css: "0 0 0 3px #FDA4AF", x: 0, y: 0, blur: 0, spread: 3, color: "#FDA4AF", usage: "Error focus ring" },
    { name: "Focus Neutral", token: "focus-neutral", css: "0 0 0 3px #D0D5DD", x: 0, y: 0, blur: 0, spread: 3, color: "#D0D5DD", usage: "Neutral focus ring" },
];
export const radiusScale = [
    { token: "0", px: 0, usage: "Sharp corners, no rounding" },
    { token: "2", px: 2, usage: "Micro rounding, inline badges" },
    { token: "4", px: 4, usage: "Small elements, tags, chips" },
    { token: "6", px: 6, usage: "Compact cards, small inputs" },
    { token: "8", px: 8, usage: "Inputs, dropdowns, small cards" },
    { token: "10", px: 10, usage: "CTA buttons (primary spec)" },
    { token: "12", px: 12, usage: "CTA buttons, standard cards" },
    { token: "14", px: 14, usage: "Large inputs, feature cards" },
    { token: "16", px: 16, usage: "Large cards, feature tiles" },
    { token: "18", px: 18, usage: "Prominent cards, panels" },
    { token: "20", px: 20, usage: "Hero sections, modals" },
    { token: "22", px: 22, usage: "Large modals, overlays" },
    { token: "24", px: 24, usage: "Maximum standard rounding" },
    { token: "42", px: 42, usage: "Pill shapes, full-round buttons" },
    { token: "84", px: 84, usage: "Circle elements, avatars" },
    { token: "full", px: 9999, usage: "Circular avatars, pills, toggles" },
];
export const sizingScale = [
    { token: "2", px: 2, usage: "Hairline divider, micro dot" },
    { token: "4", px: 4, usage: "Small dot indicator, micro icon" },
    { token: "6", px: 6, usage: "Status dot, inline indicator" },
    { token: "8", px: 8, usage: "Small icon, compact indicator" },
    { token: "10", px: 10, usage: "Badge label height" },
    { token: "12", px: 12, usage: "Small icon container" },
    { token: "14", px: 14, usage: "Compact toggle, inline icon" },
    { token: "16", px: 16, usage: "Default icon size, small avatar" },
    { token: "18", px: 18, usage: "CTA icon (sm)" },
    { token: "20", px: 20, usage: "CTA icon (md), default icon" },
    { token: "22", px: 22, usage: "CTA icon (lg)" },
    { token: "24", px: 24, usage: "Navigation icon, section icon" },
    { token: "28", px: 28, usage: "Small avatar, compact thumbnail" },
    { token: "32", px: 32, usage: "Default avatar, icon container" },
    { token: "36", px: 36, usage: "CTA height (sm)" },
    { token: "40", px: 40, usage: "Large avatar, section indicator" },
    { token: "42", px: 42, usage: "CTA height (md)" },
];
export const opacityScale = [
    { token: "5", percent: 5, decimal: 0.05, usage: "Subtle hover, ghost fills" },
    { token: "10", percent: 10, decimal: 0.10, usage: "Disabled state fills, dark surface CTA disabled" },
    { token: "15", percent: 15, decimal: 0.15, usage: "Focus ring alpha, soft borders" },
    { token: "20", percent: 20, decimal: 0.20, usage: "Dark surface outline hover, muted overlays" },
    { token: "25", percent: 25, decimal: 0.25, usage: "Light scrim, watermarks" },
    { token: "30", percent: 30, decimal: 0.30, usage: "Dark surface disabled text, moderate overlays" },
    { token: "35", percent: 35, decimal: 0.35, usage: "Mid-weight overlays" },
    { token: "40", percent: 40, decimal: 0.40, usage: "Dark surface borders, placeholder text on dark" },
    { token: "45", percent: 45, decimal: 0.45, usage: "Subtle gradient stops" },
    { token: "50", percent: 50, decimal: 0.50, usage: "Modal backdrop, bg.overlay" },
    { token: "55", percent: 55, decimal: 0.55, usage: "Gradient subtle variants" },
    { token: "60", percent: 60, decimal: 0.60, usage: "Secondary text on dark surfaces" },
    { token: "65", percent: 65, decimal: 0.65, usage: "Mid-prominence dark surface text" },
    { token: "70", percent: 70, decimal: 0.70, usage: "Frosted glass panels" },
    { token: "75", percent: 75, decimal: 0.75, usage: "High-prominence overlay text" },
    { token: "80", percent: 80, decimal: 0.80, usage: "Near-solid overlays" },
    { token: "85", percent: 85, decimal: 0.85, usage: "Translucent panels" },
    { token: "90", percent: 90, decimal: 0.90, usage: "Gradient card variants" },
    { token: "95", percent: 95, decimal: 0.95, usage: "Almost solid, subtle transparency" },
    { token: "100", percent: 100, decimal: 1.00, usage: "Fully opaque, solid fills" },
];
export const borderWidthScale = [
    { token: "default", px: 1, usage: "Default borders, dividers" },
    { token: "medium", px: 1.5, usage: "CTA outlines, emphasis" },
    { token: "strong", px: 2, usage: "Focus rings, selected states" },
    { token: "heavy", px: 3, usage: "Active sidebar indicator" },
];
// ─── NOISE TEXTURE ───
export const noiseTexture = {
    opacity: { hero: 0.08, card: 0.06 },
    scale: { hero: 1, card: 0.8 },
    blend: "overlay",
};
export const ctaSizes = [
    { name: "Small", token: "sm", height: 36, iconSize: 18, paddingX: 12, usage: "Compact actions, table row actions" },
    { name: "Medium", token: "md", height: 42, iconSize: 20, paddingX: 16, usage: "Default CTA size" },
    { name: "Large", token: "lg", height: 48, iconSize: 22, paddingX: 20, usage: "Hero CTAs, primary page actions" },
];
export const ctaVariants = [
    {
        name: "Primary",
        description: "Solid background. Used for the most important action on the page.",
        specs: {
            radius: "10px",
            textSize: "14px",
            fontWeight: "600",
            fontFamily: "Inter",
            iconSize: "20px",
            minHeight: "38px",
            gap: "6px",
            paddingX: "14px",
            paddingY: "8px",
        },
        onLight: {
            bg: "#4B4AD5",
            text: "#FFFFFF",
            border: "none",
            hoverBg: "#3C3BB5",
            pressedBg: "#2E2D96",
            disabledBg: "#E2E2EA",
            disabledText: "#A2A2A8",
        },
        onDark: {
            bg: "#FFFFFF",
            text: "#161558",
            border: "none",
            hoverBg: "#E2E2EA",
            pressedBg: "#D0D5DD",
            disabledBg: "rgba(255,255,255,0.10)",
            disabledText: "rgba(255,255,255,0.30)",
        },
    },
    {
        name: "Outline",
        description: "Border button. Secondary action, less visual weight.",
        specs: {
            radius: "10px",
            textSize: "14px",
            fontWeight: "600",
            fontFamily: "Inter",
            iconSize: "20px",
            minHeight: "38px",
            gap: "6px",
            paddingX: "14px",
            paddingY: "8px",
        },
        onLight: {
            bg: "transparent",
            text: "#4B4AD5",
            border: "#4B4AD5",
            hoverBg: "#EEEEFF",
            pressedBg: "#D8D8FA",
            disabledBg: "transparent",
            disabledText: "#A2A2A8",
        },
        onDark: {
            bg: "transparent",
            text: "#FFFFFF",
            border: "rgba(255,255,255,0.40)",
            hoverBg: "rgba(255,255,255,0.20)",
            pressedBg: "rgba(255,255,255,0.12)",
            disabledBg: "rgba(255,255,255,0.08)",
            disabledText: "rgba(255,255,255,0.30)",
        },
    },
    {
        name: "Link",
        description: "Underline text link. No container. Adapts color to surface.",
        specs: {
            radius: "10px",
            textSize: "14px",
            fontWeight: "600",
            fontFamily: "Inter",
            iconSize: "20px",
            minHeight: "auto",
            gap: "6px",
            paddingX: "14px",
            paddingY: "8px",
        },
        onLight: {
            bg: "transparent",
            text: "#4B4AD5",
            border: "none",
            hoverBg: "transparent",
            pressedBg: "transparent",
            disabledBg: "transparent",
            disabledText: "#A2A2A8",
        },
        onDark: {
            bg: "transparent",
            text: "#FFFFFF",
            border: "none",
            hoverBg: "transparent",
            pressedBg: "transparent",
            disabledBg: "transparent",
            disabledText: "rgba(255,255,255,0.30)",
        },
    },
];
export const typographyScale = [
    // Headings (Mulish)
    { name: "Display XL", element: "h1", fontFamily: "Mulish", size: "56px", weight: "800", lineHeight: "64px", letterSpacing: "-0.03em", paragraphSpacing: "32px", textCase: "none", textDecoration: "none", usage: "Marketing hero, landing page headline" },
    { name: "Display", element: "h1", fontFamily: "Mulish", size: "48px", weight: "700", lineHeight: "56px", letterSpacing: "-0.02em", paragraphSpacing: "24px", textCase: "none", textDecoration: "none", usage: "Hero titles, major page headers" },
    { name: "H1", element: "h1", fontFamily: "Mulish", size: "36px", weight: "700", lineHeight: "44px", letterSpacing: "-0.02em", paragraphSpacing: "20px", textCase: "none", textDecoration: "none", usage: "Page titles, section headers" },
    { name: "H2", element: "h2", fontFamily: "Mulish", size: "30px", weight: "600", lineHeight: "38px", letterSpacing: "-0.01em", paragraphSpacing: "18px", textCase: "none", textDecoration: "none", usage: "Section titles, card headers" },
    { name: "H3", element: "h3", fontFamily: "Mulish", size: "24px", weight: "600", lineHeight: "32px", letterSpacing: "-0.01em", paragraphSpacing: "16px", textCase: "none", textDecoration: "none", usage: "Sub-section headers" },
    { name: "H4", element: "h4", fontFamily: "Mulish", size: "20px", weight: "600", lineHeight: "28px", letterSpacing: "0", paragraphSpacing: "14px", textCase: "none", textDecoration: "none", usage: "Card titles, widget headers" },
    { name: "H5", element: "h5", fontFamily: "Mulish", size: "16px", weight: "600", lineHeight: "24px", letterSpacing: "0", paragraphSpacing: "12px", textCase: "none", textDecoration: "none", usage: "Small section titles, labels" },
    { name: "H6", element: "h6", fontFamily: "Mulish", size: "14px", weight: "600", lineHeight: "20px", letterSpacing: "0.01em", paragraphSpacing: "10px", textCase: "none", textDecoration: "none", usage: "Sub-labels, grouped item headers" },
    // Body text (Inter)
    { name: "Body XL", element: "p", fontFamily: "Inter", size: "20px", weight: "400", lineHeight: "32px", letterSpacing: "-0.01em", paragraphSpacing: "20px", textCase: "none", textDecoration: "none", usage: "Featured text, hero descriptions" },
    { name: "Body LG", element: "p", fontFamily: "Inter", size: "18px", weight: "400", lineHeight: "28px", letterSpacing: "0", paragraphSpacing: "16px", textCase: "none", textDecoration: "none", usage: "Intro text, feature descriptions" },
    { name: "Body Base", element: "p", fontFamily: "Inter", size: "16px", weight: "400", lineHeight: "24px", letterSpacing: "0", paragraphSpacing: "14px", textCase: "none", textDecoration: "none", usage: "Default body text, paragraphs" },
    { name: "Body SM", element: "p", fontFamily: "Inter", size: "14px", weight: "400", lineHeight: "20px", letterSpacing: "0", paragraphSpacing: "12px", textCase: "none", textDecoration: "none", usage: "Secondary text, table cells" },
    { name: "Body XS", element: "p", fontFamily: "Inter", size: "12px", weight: "400", lineHeight: "18px", letterSpacing: "0", paragraphSpacing: "10px", textCase: "none", textDecoration: "none", usage: "Fine print, compact table cells" },
    // Emphasis variants (Inter — bold versions of body)
    { name: "Body Base Bold", element: "strong", fontFamily: "Inter", size: "16px", weight: "600", lineHeight: "24px", letterSpacing: "0", paragraphSpacing: "16px", textCase: "none", textDecoration: "none", usage: "Emphasized text, strong labels" },
    { name: "Body SM Bold", element: "strong", fontFamily: "Inter", size: "14px", weight: "600", lineHeight: "20px", letterSpacing: "0", paragraphSpacing: "12px", textCase: "none", textDecoration: "none", usage: "CTA labels, form labels, bold secondary" },
    { name: "Body XS Bold", element: "strong", fontFamily: "Inter", size: "12px", weight: "600", lineHeight: "18px", letterSpacing: "0.01em", paragraphSpacing: "10px", textCase: "none", textDecoration: "none", usage: "Bold micro-labels, tag text" },
    // Labels (Inter — form labels)
    { name: "Label LG", element: "label", fontFamily: "Inter", size: "16px", weight: "600", lineHeight: "24px", letterSpacing: "0", paragraphSpacing: "0", textCase: "none", textDecoration: "none", usage: "Large form labels" },
    { name: "Label MD", element: "label", fontFamily: "Inter", size: "14px", weight: "600", lineHeight: "20px", letterSpacing: "0", paragraphSpacing: "0", textCase: "none", textDecoration: "none", usage: "Default form labels, CTA text" },
    { name: "Label SM", element: "label", fontFamily: "Inter", size: "12px", weight: "600", lineHeight: "16px", letterSpacing: "0.01em", paragraphSpacing: "0", textCase: "none", textDecoration: "none", usage: "Small labels, tag text" },
    // Caption & Micro (Inter)
    { name: "Caption LG", element: "span", fontFamily: "Inter", size: "14px", weight: "500", lineHeight: "18px", letterSpacing: "0.005em", paragraphSpacing: "8px", textCase: "none", textDecoration: "none", usage: "Helper text, input descriptions" },
    { name: "Caption", element: "span", fontFamily: "Inter", size: "12px", weight: "500", lineHeight: "16px", letterSpacing: "0.01em", paragraphSpacing: "8px", textCase: "none", textDecoration: "none", usage: "Badges, timestamps, micro-text" },
    { name: "Caption SM", element: "span", fontFamily: "Inter", size: "12px", weight: "500", lineHeight: "14px", letterSpacing: "0.01em", paragraphSpacing: "6px", textCase: "none", textDecoration: "none", usage: "Compact badges, dense table captions" },
    { name: "Micro", element: "span", fontFamily: "Inter", size: "10px", weight: "500", lineHeight: "12px", letterSpacing: "0.02em", paragraphSpacing: "4px", textCase: "none", textDecoration: "none", usage: "Minimum legible text, chart axis labels" },
    // Special styles
    { name: "Overline", element: "span", fontFamily: "Inter", size: "12px", weight: "700", lineHeight: "14px", letterSpacing: "0.08em", paragraphSpacing: "8px", textCase: "uppercase", textDecoration: "none", usage: "Section overlines, category labels" },
    { name: "Overline LG", element: "span", fontFamily: "Inter", size: "14px", weight: "700", lineHeight: "18px", letterSpacing: "0.06em", paragraphSpacing: "10px", textCase: "uppercase", textDecoration: "none", usage: "Prominent section labels" },
    { name: "Link Base", element: "a", fontFamily: "Inter", size: "14px", weight: "600", lineHeight: "20px", letterSpacing: "0", paragraphSpacing: "0", textCase: "none", textDecoration: "underline", usage: "Inline text links" },
    { name: "Link SM", element: "a", fontFamily: "Inter", size: "12px", weight: "600", lineHeight: "16px", letterSpacing: "0.01em", paragraphSpacing: "0", textCase: "none", textDecoration: "underline", usage: "Compact text links, breadcrumbs" },
    { name: "Code", element: "code", fontFamily: "monospace (system)", size: "14px", weight: "500", lineHeight: "20px", letterSpacing: "0", paragraphSpacing: "0", textCase: "none", textDecoration: "none", usage: "Code snippets, token references" },
    { name: "Code SM", element: "code", fontFamily: "monospace (system)", size: "12px", weight: "500", lineHeight: "16px", letterSpacing: "0", paragraphSpacing: "0", textCase: "none", textDecoration: "none", usage: "Compact code, inline references" },
    { name: "Strikethrough", element: "s", fontFamily: "Inter", size: "14px", weight: "400", lineHeight: "20px", letterSpacing: "0", paragraphSpacing: "0", textCase: "none", textDecoration: "line-through", usage: "Deprecated items, removed items" },
];
// ─── FONT SIZE REFERENCE (all sizes used in the system) ───
export const fontSizeScale = [
    { size: "10px", token: "micro", usage: "Micro text, chart axis labels" },
    { size: "12px", token: "xs", usage: "Overlines, caption-sm" },
    { size: "12px", token: "sm", usage: "Captions, badges, timestamps" },
    { size: "14px", token: "caption-lg", usage: "Helper text, input descriptions" },
    { size: "14px", token: "base-sm", usage: "CTA labels, body-sm, form labels" },
    { size: "16px", token: "base", usage: "Default body text" },
    { size: "18px", token: "lg", usage: "Body-lg, intro text" },
    { size: "20px", token: "xl", usage: "Body-xl, H4" },
    { size: "24px", token: "2xl", usage: "H3" },
    { size: "30px", token: "3xl", usage: "H2" },
    { size: "36px", token: "4xl", usage: "H1" },
    { size: "48px", token: "5xl", usage: "Display" },
    { size: "56px", token: "6xl", usage: "Display XL" },
];
// ─── FONT WEIGHT REFERENCE ───
export const fontWeightScale = [
    { weight: "400", name: "Regular", usage: "Body text, paragraphs" },
    { weight: "500", name: "Medium", usage: "Captions, links, subtle emphasis" },
    { weight: "600", name: "Semibold", usage: "CTA labels, H2-H6, form labels" },
    { weight: "700", name: "Bold", usage: "H1, Display, overlines" },
    { weight: "800", name: "Extrabold", usage: "Display XL, marketing headlines" },
];
// ─── LETTER SPACING REFERENCE ───
export const letterSpacingScale = [
    { value: "-0.03em", token: "tightest", usage: "Display XL" },
    { value: "-0.02em", token: "tighter", usage: "Display, H1" },
    { value: "-0.01em", token: "tight", usage: "H2, H3, Body XL" },
    { value: "0", token: "normal", usage: "Body text, H4, H5" },
    { value: "0.005em", token: "slightly-wide", usage: "Caption LG" },
    { value: "0.01em", token: "wide", usage: "H6, captions, micro" },
    { value: "0.02em", token: "wider", usage: "Micro text" },
    { value: "0.06em", token: "widest", usage: "Overline LG" },
    { value: "0.08em", token: "ultra-wide", usage: "Overline, section labels" },
];
// ─── TEXT CASE REFERENCE ───
export const textCaseOptions = [
    { value: "none", token: "default", usage: "Normal sentence case" },
    { value: "uppercase", token: "uppercase", usage: "Overlines, section labels, status badges" },
    { value: "lowercase", token: "lowercase", usage: "URLs, email display" },
    { value: "capitalize", token: "capitalize", usage: "Nav items, button labels" },
];
// ─── TEXT DECORATION REFERENCE ───
export const textDecorationOptions = [
    { value: "none", token: "none", usage: "Default, no decoration" },
    { value: "underline", token: "underline", usage: "Links, interactive text" },
    { value: "line-through", token: "strikethrough", usage: "Deprecated items, price strike" },
];
// ─── PARAGRAPH SPACING REFERENCE ───
export const paragraphSpacingScale = [
    { value: "0", token: "none", usage: "Inline elements, no spacing" },
    { value: "4px", token: "micro", usage: "Micro text, chart labels" },
    { value: "6px", token: "xs", usage: "Caption-sm" },
    { value: "8px", token: "sm", usage: "Captions, badges" },
    { value: "10px", token: "md", usage: "Body XS, overlines" },
    { value: "12px", token: "base", usage: "Body SM, default paragraph gap" },
    { value: "14px", token: "comfortable", usage: "H4 paragraph spacing" },
    { value: "16px", token: "lg", usage: "Body Base, H3" },
    { value: "18px", token: "xl", usage: "Body LG" },
    { value: "20px", token: "2xl", usage: "Body XL, H2" },
    { value: "24px", token: "3xl", usage: "H1" },
    { value: "28px", token: "4xl", usage: "Display" },
    { value: "32px", token: "5xl", usage: "Display XL" },
];
// ─── SPACING SCALE (2px base, every 2px from 2–42, then larger jumps) ───
export const spacingScale = [
    { token: "0.25", px: 1, usage: "Hairline, sub-pixel adjustments" },
    { token: "0.5", px: 2, usage: "Micro gap, icon offset" },
    { token: "1", px: 4, usage: "Tight gap, icon-text in small tags" },
    { token: "1.5", px: 6, usage: "CTA icon-text gap, compact spacing" },
    { token: "2", px: 8, usage: "CTA vertical padding, inline elements" },
    { token: "2.5", px: 10, usage: "Small component padding" },
    { token: "3", px: 12, usage: "Tag padding, compact card gap" },
    { token: "3.5", px: 14, usage: "CTA horizontal padding" },
    { token: "4", px: 16, usage: "Standard padding, form gap" },
    { token: "4.5", px: 18, usage: "Medium component padding" },
    { token: "5", px: 20, usage: "Section inner gap" },
    { token: "5.5", px: 22, usage: "Card inner padding (compact)" },
    { token: "6", px: 24, usage: "Card padding, section gap" },
    { token: "7", px: 28, usage: "Large card padding" },
    { token: "8", px: 32, usage: "Section margin, modal padding" },
    { token: "9", px: 36, usage: "Large section gap" },
    { token: "10", px: 40, usage: "Page section spacing" },
    { token: "10.5", px: 42, usage: "Feature card padding" },
    { token: "12", px: 48, usage: "Page section spacing" },
    { token: "16", px: 64, usage: "Hero padding" },
];
export const gridSystem = [
    { breakpoint: "Desktop (>=1280px)", columns: 12, margin: "64px", gutter: "24px", usage: "Full EMR workspace, dashboards, forms" },
    { breakpoint: "Tablet (>=768px)", columns: 8, margin: "32px", gutter: "20px", usage: "iPad clinical view, side panels" },
    { breakpoint: "Mobile (<768px)", columns: 4, margin: "16px", gutter: "16px", usage: "Patient app, mobile check-in" },
];
// ─── HELPERS ───
export function getColor(group, tokenNum) {
    if (!group || !("colors" in group) || !Array.isArray(group.colors)) {
        return "#000000";
    }
    return group.colors.find((c) => c.token === tokenNum)?.value ?? "#000000";
}
export function hexToRgbNormalized(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (_m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 }
        : { r: 0, g: 0, b: 0 };
}
// ─── STYLE FOUNDATIONS (Docs Showcase Contracts) ───
export const tokenFoundationModel = {
    principle: "Components consume semantic tokens first. Primitive tokens are maintained centrally and mapped into semantic roles.",
    layers: [
        {
            layer: "Primitive Tokens",
            purpose: "Raw source values maintained by system owners.",
            examples: ["tp-blue-500", "tp-slate-700", "spacing-4", "radius-10"],
        },
        {
            layer: "Semantic Tokens",
            purpose: "Contextualized roles consumed by components and design files.",
            examples: ["TP.text.primary", "TP.bg.surface", "TP.icon.active", "TP.border.default"],
        },
        {
            layer: "Component Tokens",
            purpose: "Component-level aliases for stable implementation contracts.",
            examples: ["TP.button.primary.bg", "TP.field.focus.ring", "TP.sidebar.item.active"],
        },
    ],
};
export const colorFoundationSections = {
    overview: "Color system mirrors material-style foundations while preserving TatvaPractice semantic mapping and usage constraints.",
    system: [
        "Primitives are not directly consumed in UI components.",
        "Semantic tokens define intent (text, surface, icon, border).",
        "Brand clickables default to TP Blue, AI identity uses gradient.",
    ],
    choosingSchemes: [
        "Use Light scheme for default clinical workflows.",
        "Use Brand-depth scheme for hero/marketing moments only.",
        "Use AI scheme only for AI-labeled surfaces and controls.",
    ],
    dynamicTheming: "Schemes are selected by product context. Dynamic color adjustments may be applied for contrast and accessibility, while semantic names remain stable.",
    advanced: [
        "Contrast guardrails at token pair level.",
        "Surface overlays and elevation-aware tinting.",
        "State-aware role substitution (hover/focus/pressed).",
    ],
};
export const colorRules = [
    "Clickable brand text and controls use TP Blue semantic roles.",
    "Body copy defaults to neutral slate semantic roles.",
    "AI labels and surfaces use AI gradient identity, not flat violet.",
    "Violet remains informative and educational, never primary CTA fill.",
];
export const colorSchemes = [
    {
        name: "Clinical Light",
        surface: "TP.bg.surface",
        text: "TP.text.primary",
        border: "TP.border.default",
        usage: "Default EMR workflows and operational surfaces.",
    },
    {
        name: "Brand Depth",
        surface: "TP.bg.depth-blue",
        text: "TP.text.inverse",
        border: "TP.border.primary.subtle",
        usage: "Top-level branded hero and product moments.",
    },
    {
        name: "AI Surface",
        surface: "TP.bg.ai-surface",
        text: "TP.ai.text-primary",
        border: "TP.ai.border",
        usage: "AI assistant panels, insight cards, confidence UI.",
    },
];
export const colorSystemRoles = [
    { role: "Primary Text", token: "TP.text.primary", usage: "Body content and default readable text." },
    { role: "Heading Text", token: "TP.text.heading", usage: "Section and page headings." },
    { role: "Brand Action", token: "TP.text.brand", usage: "Links, active nav, primary interactive text." },
    { role: "Surface", token: "TP.bg.surface", usage: "Base card and panel background." },
    { role: "Selected Surface", token: "TP.bg.selected", usage: "Selected items and active list rows." },
    { role: "Default Border", token: "TP.border.default", usage: "Card, input and layout separators." },
];
export const elevationFoundationSections = {
    overview: "Elevation follows layered shadows with semantic levels for resting, hover, and modal states.",
    levels: [
        { level: 0, token: "TP.elevation.none", usage: "Flat content and structural containers." },
        { level: 1, token: "TP.elevation.sm", usage: "Default cards and lightweight controls." },
        { level: 2, token: "TP.elevation.md", usage: "Raised panels and dropdown menus." },
        { level: 3, token: "TP.elevation.lg", usage: "Dialogs, popovers, focused overlays." },
    ],
    focus: [
        { state: "Focus primary", token: "TP.focus.primary", usage: "Primary interactive focus state." },
        { state: "Focus error", token: "TP.focus.error", usage: "Error state focus ring and outline." },
    ],
};
export const iconFoundationSections = {
    overview: "Iconsax family rules: Linear in default state, Bulk in hover/selected state, Bold for rare emphasis.",
    families: [
        { family: "Linear", usage: "Default icon style for idle clickable controls." },
        { family: "Bulk", usage: "Dual-tone selected/hover interactive state." },
        { family: "Bold", usage: "High-emphasis utility state only." },
    ],
    sizes: ["16", "20", "24"],
    constraints: [
        "Clickable nav icons transition from Linear to Bulk when selected.",
        "Informative icons may use violet context but remain non-clickable.",
        "Do not mix icon families randomly within the same component state group.",
    ],
};
export const motionFoundationSections = {
    overview: "Motion tokens are constrained by intent: entry, emphasis, and dismissal with predictable easing.",
    principles: [
        "Motion should clarify hierarchy and state changes.",
        "Avoid ornamental movement without functional purpose.",
        "Prefer composited transforms and opacity for performance.",
    ],
};
export const motionEasing = [
    { token: "motion.easing.standard", curve: "cubic-bezier(0.2, 0, 0, 1)" },
    { token: "motion.easing.decelerate", curve: "cubic-bezier(0, 0, 0, 1)" },
    { token: "motion.easing.accelerate", curve: "cubic-bezier(0.3, 0, 1, 1)" },
];
export const motionDuration = [
    { token: "motion.duration.short", ms: 120 },
    { token: "motion.duration.medium", ms: 200 },
    { token: "motion.duration.long", ms: 300 },
];
export const motionTransitions = [
    { component: "Buttons", transition: "120ms standard" },
    { component: "Tabs / Segments", transition: "180ms standard" },
    { component: "Dialogs / Drawers", transition: "250ms decelerate" },
    { component: "Toasts", transition: "200ms standard" },
];
export const shapeFoundationSections = {
    overview: "Shape system is geometric and tokenized by corner radius and semantic component role.",
    geometry: [
        { shape: "Sharp", usage: "Dividers and structural utilities.", tokens: ["radius-0", "radius-2"] },
        { shape: "Comfort", usage: "Inputs, chips, and compact surfaces.", tokens: ["radius-8", "radius-10", "radius-12"] },
        { shape: "Soft", usage: "Cards, modals, feature containers.", tokens: ["radius-16", "radius-20", "radius-24"] },
    ],
    rules: [
        "CTA family uses radius-10 by contract.",
        "Form controls should remain between radius-8 and radius-12.",
        "Do not exceed radius-24 except full pill/circle semantics.",
    ],
};
export const typographyFoundationSections = {
    overview: "Typography follows a dual family system: Mulish for headings and Inter for interface/body readability.",
    fonts: [
        { family: "Mulish", role: "Display and heading hierarchy", weights: "600, 700" },
        { family: "Inter", role: "Body, forms, labels, microcopy", weights: "400, 500, 600" },
        { family: "System Monospace", role: "Code and token references", weights: "400, 500" },
    ],
    typeScale: [
        "Display -> H1 -> H2 -> H3 -> H4 -> H5 -> H6",
        "Body LG -> Body -> Body SM -> Caption",
        "Label LG/MD/SM for control surfaces.",
    ],
    tokenization: [
        "Use TP.text.* tokens for semantic type role mapping.",
        "Keep typography utility token names stable across platforms.",
        "Avoid direct font-size literals in component code.",
    ],
    applyingType: [
        "Use heading family only for hierarchy-defining labels.",
        "Use body family for operational, tabular and form-heavy content.",
        "Retain contrast and spacing to preserve readability at dense scales.",
    ],
    editorialTreatment: [
        "Sentence case by default; uppercase reserved for short labels.",
        "Avoid long all-caps body text.",
        "Maintain consistent paragraph spacing by role.",
    ],
};
export const styleDosAndDonts = {
    dos: [
        "Use semantic tokens in component code and Figma styles.",
        "Keep icon family transitions state-driven and consistent.",
        "Preserve CTA geometry and typography contracts across modules.",
    ],
    donts: [
        "Do not hardcode hex values in component implementations.",
        "Do not use violet as primary clickable CTA fill.",
        "Do not mix arbitrary icon families in the same state context.",
    ],
};
export const advancedColorTools = [
    { tool: "Contrast Check", usage: "Validate text/surface pairs for accessibility." },
    { tool: "State Overlay", usage: "Apply consistent hover/focus/pressed tonal overlays." },
    { tool: "Role Mapper", usage: "Map primitive colors to semantic token roles." },
];
export const iconSystemRules = [
    {
        rule: "State transition",
        behavior: "Default Linear -> Hover/Selected Bulk",
        appliesTo: "Sidebar, tabs, segmented controls, clickable icon actions",
    },
    {
        rule: "Informative icon",
        behavior: "Use violet/informative semantic role only when non-clickable",
        appliesTo: "Hints, educational labels, supportive markers",
    },
];
export const interactionStateTokens = {
    states: ["default", "hover", "focus", "pressed", "selected", "disabled"],
    iconModeRule: "Clickable icon contexts use Linear at default and Bulk at hover/selected; disabled remains low-contrast neutral.",
    stateRules: [
        "Focus-visible must use semantic focus ring token.",
        "Disabled must lower contrast and suppress motion emphasis.",
        "Selected states should be clear even without color-only cue.",
    ],
};
export const componentTokenContracts = {
    button: {
        height: "38px",
        radius: "10px",
        font: "Inter 14/20 600",
        icon: "20px",
    },
    field: {
        radius: "8px",
        border: "TP.border.default",
        focusRing: "TP.focus.primary",
    },
    navTab: {
        iconDefault: "Linear",
        iconSelected: "Bulk",
        activeIndicator: "TP.border.primary",
    },
    sidebarItem: {
        iconContainerDefault: "TP.icon.brand-soft",
        iconContainerSelected: "TP.icon.brand-active",
        labelMaxWidth: "68px",
    },
};
export const figmaStyleFoundationMap = {
    Colors: {
        source: "Figma Variables + Semantic mappings",
        naming: "TP.<category>.<role>",
        styleGroups: ["Text", "Background", "Border", "Icon", "Status"],
    },
    Typography: {
        source: "Type scale tokens",
        naming: "TP.text.<role>",
        styleGroups: ["Display", "Heading", "Body", "Label", "Caption"],
    },
    Effects: {
        source: "Elevation and focus tokens",
        naming: "TP.elevation.<level> / TP.focus.<intent>",
        styleGroups: ["Shadow", "Focus ring", "Overlay"],
    },
};
