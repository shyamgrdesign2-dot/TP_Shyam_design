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
export const VISIT_ICON = { icon: "user-tag", family: "users" };

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

export const CONDITION_COLORS = {
  1: { color: "#FF0000", name: "HIV" },
  2: { color: "#800080", name: "HbA1c" },
  3: { color: "#FF69B4", name: "HBsAg" },
  4: { color: "#FFA500", name: "Blood Group Negative" },
};

export function parseDurationString(s) {
  if (!s || (typeof s !== "string" && typeof s !== "number")) return { h: 0, m: 0, s: 0 };
  const str = String(s).trim();
  const colon = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    return {
      h: parseInt(colon[1], 10),
      m: parseInt(colon[2], 10),
      s: parseInt(colon[3] || "0", 10),
    };
  }
  const hoursMatch = str.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i);
  const minsMatch = str.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
  const secsMatch = str.match(/(\d+)\s*(?:seconds?|secs?|s)\b/i);
  if (hoursMatch || minsMatch || secsMatch) {
    return {
      h: hoursMatch ? parseInt(hoursMatch[1], 10) : 0,
      m: minsMatch ? parseInt(minsMatch[1], 10) : 0,
      s: secsMatch ? parseInt(secsMatch[1], 10) : 0,
    };
  }
  const onlyNumber = str.match(/^(\d+)$/);
  if (onlyNumber) {
    const totalMinutes = parseInt(onlyNumber[1], 10);
    return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60, s: 0 };
  }
  return { h: 0, m: 0, s: 0 };
}

export function formatDurationConsultation(durationStr) {
  if (!durationStr) return "";
  const d = parseDurationString(durationStr);
  const h = d.h || 0;
  const m = d.m || 0;
  if (h > 0) return `${h}H ${m}m`;
  return `${m}m`;
}

