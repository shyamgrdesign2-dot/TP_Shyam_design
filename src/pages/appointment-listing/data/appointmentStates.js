import { TAB_IDS } from "./appointmentsConfig";

/**
 * The single source of truth for how an appointment's state and visit type
 * are drawn: glyph, colour and wording. Cards, tooltips and any future
 * surface read from here so the same appointment never looks like two
 * different things in two different places.
 */
export const STATUS_META = {
  [TAB_IDS.QUEUE]: {
    icon: "timer",
    family: "time",
    label: "In queue",
    color: "var(--tesseract-blue-600)",
    badge: "primary",
  },
  [TAB_IDS.CLINIC_APPOINTMENT]: {
    icon: "calendar",
    family: "time",
    label: "Appointment",
    color: "var(--tesseract-violet-600)",
    badge: "primary",
  },
  [TAB_IDS.FINISHED]: {
    icon: "clipboard-tick",
    family: "content-edit",
    label: "Finished",
    color: "var(--tesseract-success-600)",
    badge: "success",
  },
  [TAB_IDS.CANCELLED]: {
    icon: "clipboard-close",
    family: "content-edit",
    label: "Cancelled",
    color: "var(--tesseract-error-500)",
    badge: "error",
  },
  [TAB_IDS.DRAFT]: {
    icon: "edit-2",
    family: "content-edit",
    label: "Draft",
    color: "var(--tesseract-amber-600)",
    badge: "warning",
  },
  [TAB_IDS.PENDING]: {
    icon: "ai-document",
    family: "ai",
    label: "Pending digitisation",
    color: "var(--tesseract-warning-600)",
    badge: "warning",
  },
};

/**
 * Visit type reads off the backend's free-text `toct_type`, which the clinic
 * can extend at will. One glyph covers every value and the wording carries
 * the difference, so a new visit type never needs a new icon.
 */
export const VISIT_ICON = { icon: "calendar", family: "time" };

export function visitMeta(visitType) {
  const v = String(visitType || "").toLowerCase();
  const label = v.includes("walk")
    ? "Walk-in"
    : v.includes("follow")
    ? "Follow-up"
    : v.includes("new")
    ? "New"
    : visitType || "Visit";
  return { ...VISIT_ICON, label };
}

export const statusMeta = (statusId) => STATUS_META[statusId] || null;

/**
 * The tint every teleconsult marker takes.
 *
 * The video glyph used to be blue everywhere, which said "this is a video
 * visit" but not "this video visit was cancelled". Colour already carries
 * state on this screen (the card edge, the time, the status tag), so the
 * marker joins that language instead of standing outside it: blue in the
 * queue, green when finished, red when cancelled, amber in draft. Falls back
 * to blue when the row has no state of its own.
 */
export const videoTint = (statusId) =>
  STATUS_META[statusId]?.color || "var(--tesseract-blue-500)";

// "Female, 34y" → "F, 34y". Sex is a single letter everywhere it appears
// beside a name, so the identifiers next to it keep their room.
export const shortGenderAge = (s) => (s ? String(s).replace(/^([A-Za-z])[A-Za-z]*/, "$1") : "");
