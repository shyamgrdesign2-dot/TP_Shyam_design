/**
 * Inline subsection keys inside card bodies — e.g. BP:, SpO₂:, lab short names, Chronic:,
 * Sx:/Dx:/Rx:, Pending:/Overdue: — semibold muted slate.
 *
 * Full-width strip titles use `SectionSummaryBar` (slate-500 semibold on bg-tp-slate-100/70), not this class.
 * V0 and full agent share the same card components, so this applies to both.
 */
export const SECTION_INLINE_SUBKEY_CLASS = "text-tp-slate-400 font-semibold";