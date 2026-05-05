/**
 * RX Workspace Type Definitions
 * ─────────────────────────────
 * Complete type system for the TatvaPractice RX sidebar panels,
 * expanded section views, and RXPad content area.
 *
 * Architecture:
 *   NavItem → SecondaryNav → ExpandedPanel → SectionContent
 *                                              ↓
 *                                           RxPad (receives copied items)
 */

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════




























// ═══════════════════════════════════════════════════════════════
// PAST VISITS
// ═══════════════════════════════════════════════════════════════
























// ═══════════════════════════════════════════════════════════════
// VITALS
// ═══════════════════════════════════════════════════════════════

















// ═══════════════════════════════════════════════════════════════
// MEDICAL HISTORY
// ═══════════════════════════════════════════════════════════════
























































// ═══════════════════════════════════════════════════════════════
// OPHTHAL
// ═══════════════════════════════════════════════════════════════





















// ═══════════════════════════════════════════════════════════════
// GYNEC
// ═══════════════════════════════════════════════════════════════























// ═══════════════════════════════════════════════════════════════
// OBSTETRIC
// ═══════════════════════════════════════════════════════════════









































// ═══════════════════════════════════════════════════════════════
// VACCINE
// ═══════════════════════════════════════════════════════════════





















// ═══════════════════════════════════════════════════════════════
// GROWTH
// ═══════════════════════════════════════════════════════════════















// ═══════════════════════════════════════════════════════════════
// LAB RESULTS
// ═══════════════════════════════════════════════════════════════
























// ═══════════════════════════════════════════════════════════════
// MEDICAL RECORDS
// ═══════════════════════════════════════════════════════════════
























// ═══════════════════════════════════════════════════════════════
// FOLLOW-UP
// ═══════════════════════════════════════════════════════════════














// ═══════════════════════════════════════════════════════════════
// RXPAD (Main Content Area)
// ═══════════════════════════════════════════════════════════════





























































// ═══════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════



























// ═══════════════════════════════════════════════════════════════
// PATIENT CONTEXT
// ═══════════════════════════════════════════════════════════════


















// ═══════════════════════════════════════════════════════════════
// DISPLAY RULES
// ═══════════════════════════════════════════════════════════════

/**
 * Display rules for section content formatting.
 * These define how medical data should be highlighted,
 * color-coded, and formatted across sections.
 */









export const VITAL_DISPLAY_RULES = {
  normal: {
    style: "text-tp-success-600 bg-tp-success-50",
    condition: "Value within normal reference range",
    description: "Green text on light green background — indicates healthy/normal reading"
  },
  warning: {
    style: "text-tp-warning-600 bg-tp-warning-50",
    condition: "Value slightly outside normal range",
    description: "Amber text on light amber background — requires attention but not critical"
  },
  critical: {
    style: "text-tp-error-600 bg-tp-error-50",
    condition: "Value significantly outside normal range",
    description: "Red text on light red background — requires immediate attention"
  },
  low: {
    style: "text-tp-blue-600 bg-tp-blue-50",
    condition: "Value below normal range",
    description: "Blue text on light blue background — below normal, monitor required"
  }
};

export const ALLERGY_SEVERITY_RULES = {
  mild: {
    style: "text-tp-warning-600 bg-tp-warning-50 border-tp-warning-200",
    condition: "Mild allergic reaction, no life-threatening symptoms",
    description: "Amber styling for mild alerts"
  },
  moderate: {
    style: "text-tp-warning-700 bg-tp-warning-100 border-tp-warning-300",
    condition: "Moderate reaction requiring treatment",
    description: "Darker amber for moderate severity"
  },
  severe: {
    style: "text-tp-error-600 bg-tp-error-50 border-tp-error-200",
    condition: "Severe/anaphylactic reaction — ALWAYS prominently displayed",
    description: "Red styling with bold text for severe allergies"
  }
};

export const LAB_RESULT_RULES = {
  Normal: {
    style: "text-tp-slate-700",
    condition: "Result within reference range",
    description: "Default text color — no special highlighting needed"
  },
  Abnormal: {
    style: "text-tp-warning-600 font-semibold",
    condition: "Result outside reference range",
    description: "Amber bold text to draw attention"
  },
  Critical: {
    style: "text-tp-error-600 font-bold",
    condition: "Result critically outside range — life-threatening",
    description: "Red bold text — highest priority visual indicator"
  },
  Pending: {
    style: "text-tp-slate-400 italic",
    condition: "Result not yet available",
    description: "Muted italic text — awaiting results"
  }
};

export const VACCINE_STATUS_RULES = {
  Completed: {
    style: "text-tp-success-600 bg-tp-success-50",
    condition: "Vaccine administered",
    description: "Green — completed vaccination"
  },
  Due: {
    style: "text-tp-blue-600 bg-tp-blue-50",
    condition: "Vaccine due as per schedule",
    description: "Blue — upcoming vaccination"
  },
  Overdue: {
    style: "text-tp-error-600 bg-tp-error-50",
    condition: "Vaccine past due date",
    description: "Red — missed schedule, needs attention"
  },
  Scheduled: {
    style: "text-tp-violet-600 bg-tp-violet-50",
    condition: "Appointment scheduled for vaccination",
    description: "Violet — scheduled, not yet due"
  },
  Missed: {
    style: "text-tp-slate-500 bg-tp-slate-100 line-through",
    condition: "Vaccine was missed and not rescheduled",
    description: "Muted with strikethrough — missed entirely"
  }
};

export const FOLLOW_UP_STATUS_RULES = {
  Scheduled: {
    style: "text-tp-blue-600 bg-tp-blue-50",
    condition: "Appointment scheduled",
    description: "Blue — upcoming follow-up"
  },
  Completed: {
    style: "text-tp-success-600 bg-tp-success-50",
    condition: "Follow-up completed",
    description: "Green — completed"
  },
  Missed: {
    style: "text-tp-error-600 bg-tp-error-50",
    condition: "Patient did not attend",
    description: "Red — missed appointment"
  },
  Cancelled: {
    style: "text-tp-slate-500 bg-tp-slate-100",
    condition: "Appointment cancelled",
    description: "Muted — cancelled"
  },
  Rescheduled: {
    style: "text-tp-warning-600 bg-tp-warning-50",
    condition: "Appointment moved to a new date",
    description: "Amber — rescheduled"
  }
};