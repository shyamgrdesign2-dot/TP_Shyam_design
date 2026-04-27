/**
 * InProgressTab — Cluster card layout for in-progress plans.
 * Outer shell: rounded-[16px], bg-white, NO stroke.
 * Inner sub-cards: 0.5px neutral stroke.
 * Each service sub-card is an accordion — first open by default, one at a time.
 * Status dropdown exposes all explicit states (Yet to start, In Progress,
 * Completed, No-Show, Not Interested, Cancelled).
 */
import { useEffect, useState, useCallback, Children } from "react";
import {
  TickCircle,
  ArrowRotateLeft,
  Printer,
  Receipt1,
  Add,
  Timer1,
  Edit2,
  Trash,
  Calendar2,
  DocumentDownload,
  DocumentText,
  Clipboard } from
"iconsax-reactjs";
import { Ban, ChevronDown, Info, MoreVertical, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"../ui/alert-dialog";
import { TPConfirmDialog } from "../ui/tp-confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"../ui/dropdown-menu";
import { usePlanContext } from "./plan-context";
import {
  SectionFrame,
  EmptyState,
  PlanEmptyIcon,
  formatINR,
  computePlanTotal,
  getServiceWorkflowStatus,
  buildConsultationRxUrl,
  CloseSquareIcon,
  PLAN_DRAWER_PANEL_CLASS } from
"./plan-shared";
import { TPSplitButton } from "../tp-ui/button-system";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { TPDrawer, TPDrawerContent } from "../tp-ui/tp-drawer";
import {
  Select as TPSelect,
  SelectContent as TPSelectContent,
  SelectItem as TPSelectItem,
  SelectTrigger as TPSelectTrigger,
  SelectValue as TPSelectValue } from
"../ui/select";
import { RxPreviewDocument } from "../tp-rxpad/RxPreviewDocument";
import { getComposedRxPreviewSnapshot } from "../tp-rxpad/rx-preview-composer";
import dui from "../dental-ui.module.scss";
import styles from "./InProgressTab.module.scss";
const cx = (...classes) => classes.filter(Boolean).join(" ");
const dropdownContentClass = styles.dropdownContent;
const dropdownItemClass = styles.dropdownItem;
const dropdownMenuLabelClass = styles.dropdownLabel;
/** View Rx — icon-text button without outer border (matches preview). */
const VIEW_RX_SECONDARY_CLASS = styles.viewRxBtn;
/** Timeline TypeRx split — primary segment at least 120px wide. */
const TIMELINE_TYPERX_TRACK_CLASS = styles.timelineTrack;
/** Appointment row icon actions — white surface, slate border. */
const APPT_ACTION_ICON_CLASS = styles.apptActionBtn;
/** Timeline row ⋮ — compact icon button (print still hides it). */
const TIMELINE_MENU_TRIGGER_CLASS = styles.timelineMenuTrigger;
/** Capture / book in service header — filled slate, 10px radius (not circular). */
const SERVICE_HEADER_ACTION_CLASS = styles.serviceHeaderAction;
const PREVIEW_RX_ICON_BTN_CLASS = styles.previewRxIconBtn;
const APPT_MONTH_SHORT = {
  jan: "Jan",
  january: "Jan",
  feb: "Feb",
  february: "Feb",
  mar: "Mar",
  march: "Mar",
  apr: "Apr",
  april: "Apr",
  may: "May",
  jun: "Jun",
  june: "Jun",
  jul: "Jul",
  july: "Jul",
  aug: "Aug",
  august: "Aug",
  sep: "Sep",
  sept: "Sep",
  september: "Sep",
  oct: "Oct",
  october: "Oct",
  nov: "Nov",
  november: "Nov",
  dec: "Dec",
  december: "Dec"
};
/** e.g. "14 April 2026" / "14 Apr 2026" -> "14 Apr 2026" */
function formatAppointmentDateLong(dateStr) {
  const s = String(dateStr ?? "").trim();
  const m = /^(\d{1,2})\s+(\w+)\s+(\d{4})$/.exec(s);
  if (!m) return s;
  const mon = APPT_MONTH_SHORT[m[2].toLowerCase()] ?? m[2];
  return `${m[1]} ${mon} ${m[3]}`;
}
const CASE_TYPE_LABELS = {
  consultation: "Consultation",
  procedure: "Procedure",
  review: "Review / Check-up",
  emergency: "Emergency",
  "follow-up": "Follow-up"
};
const APPT_MONTH_PARSE = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11
};
/** Parse "10:30 AM" / "14:00" into ms offset from midnight (local). */
function parseTimeOffsetMs(timeRaw) {
  const t = String(timeRaw ?? "").trim();
  if (!t || t === "—") return 0;
  const ampm = /\b(am|pm)\b/i.exec(t);
  const hm = /(\d{1,2})\s*:\s*(\d{2})/.exec(t);
  if (!hm) return 0;
  let h = parseInt(hm[1], 10);
  const min = parseInt(hm[2], 10);
  if (ampm) {
    const ap = ampm[1].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  }
  return (h * 60 + min) * 60 * 1000;
}
function parseApptSortMs(dateStr, timeStr) {
  const s = String(dateStr ?? "").trim();
  const m = /^(\d{1,2})\s+(\w+)\s+(\d{4})$/.exec(s);
  if (!m) return 0;
  const day = parseInt(m[1], 10);
  const mon = APPT_MONTH_PARSE[m[2]] ?? 0;
  const y = parseInt(m[3], 10);
  const base = new Date(y, mon, day).getTime();
  return base + parseTimeOffsetMs(timeStr);
}
function parseIsoMs(iso) {
  const n = Date.parse(String(iso ?? ""));
  return Number.isFinite(n) ? n : 0;
}
function parseSittingSortMs(sit) {
  if (sit?.createdAt) {
    const fromCreatedAt = parseIsoMs(sit.createdAt);
    if (fromCreatedAt) return fromCreatedAt;
  }
  return parseIsoMs(sit?.date);
}
/**
 * Merged visit timeline: upcoming (booked, no Rx yet) → completed (Rx saved or direct visit) → cancelled.
 */
function buildVisitTimelineEntries(service) {
  const appointmentItems = service.appointments ?? [];
  const consultationItems = service.consultations ?? [];
  const sittingItems = service.sittings ?? [];
  const appointmentIdSet = new Set(appointmentItems.map((a) => a.id));
  const raw = [];
  for (const appt of appointmentItems) {
    const linkedConsultations = consultationItems.filter(
      (c) => c.appointmentId === appt.id
    );
    raw.push({
      kind: "appointment",
      appt,
      linkedConsultations,
      sortMs: parseApptSortMs(appt.date, appt.time)
    });
  }
  for (const c of consultationItems) {
    if (c.appointmentId && appointmentIdSet.has(c.appointmentId)) continue;
    raw.push({
      kind: "direct",
      consultation: c,
      linkedConsultations: [],
      sortMs: parseIsoMs(c.endedAt)
    });
  }
  for (const sit of sittingItems) {
    raw.push({
      kind: "sitting",
      sitting: sit,
      linkedConsultations: [],
      sortMs: parseSittingSortMs(sit)
    });
  }
  const upcoming = [];
  const completed = [];
  const cancelled = [];
  for (const e of raw) {
    if (e.kind === "appointment" && e.appt.status === "cancelled") {
      cancelled.push(e);
      continue;
    }
    if (e.kind === "appointment" && e.linkedConsultations.length > 0) {
      completed.push(e);
      continue;
    }
    if (e.kind === "direct") {
      completed.push(e);
      continue;
    }
    if (e.kind === "sitting") {
      const sitSt = e.sitting.status ?? "completed";
      if (sitSt === "cancelled") {
        cancelled.push(e);
        continue;
      }
      if (sitSt === "scheduled") {
        upcoming.push(e);
        continue;
      }
      completed.push(e);
      continue;
    }
    upcoming.push(e);
  }
  upcoming.sort((a, b) => (a.sortMs || 0) - (b.sortMs || 0));
  completed.sort((a, b) => (b.sortMs || 0) - (a.sortMs || 0));
  cancelled.sort((a, b) => (b.sortMs || 0) - (a.sortMs || 0));
  return [...upcoming, ...completed, ...cancelled];
}
function visitBadge(kind) {
  if (kind === "cancelled") {
    return (
      <span className={`${styles.visitBadge} ${styles.visitBadgeCancelled}`}>
        Cancelled
      </span>);

  }
  if (kind === "completed") {
    return (
      <span className={`${styles.visitBadge} ${styles.visitBadgeCompleted}`}>
        Completed
      </span>);

  }
  return (
    <span className={`${styles.visitBadge} ${styles.visitBadgeUpcoming}`}>
      Upcoming
    </span>);

}
/** Inline date+time pill with a small calendar icon, e.g. "18 Apr 2026 (08:30 AM)". */
function VisitDatePill({ date, time }) {
  const datePart = String(date ?? "").trim();
  const timePart = String(time ?? "").trim();
  if (!datePart && !timePart) return null;
  const label = timePart ? `${datePart} (${timePart})` : datePart;
  return (
    <span className={styles.datePill}>
      <Calendar2
        size={13}
        variant="Linear"
        color="#581C87"
        strokeWidth={1.75} />


      <span>{label}</span>
    </span>);

}
/**
 * Gradient-border surface for visit-row cards.
 * Two stacked gradients (one per background-clip layer) render a faux stroke
 * that fades in at the top and bottom and thins out through the middle.
 * The stroke hue matches the card's base tint: lavender for default and rose
 * for cancelled rows.
 */
function getVisitRowSurfaceStyle(isCancelled) {
  if (isCancelled) {
    return {
      border: "1px solid transparent",
      borderRadius: "16px",
      backgroundImage:
      "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(253,224,215,0.75) 100%), " +
      "linear-gradient(180deg, rgba(193,66,28,0.10) 0%, rgba(193,66,28,0.02) 30%, rgba(193,66,28,0) 50%, rgba(193,66,28,0.02) 70%, rgba(193,66,28,0.10) 100%)",
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box"
    };
  }
  return {
    border: "1px solid transparent",
    borderRadius: "16px",
    backgroundImage:
    "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(242,239,250,0.7) 100%), " +
    "linear-gradient(180deg, rgba(88,28,135,0.09) 0%, rgba(88,28,135,0.02) 30%, rgba(88,28,135,0) 50%, rgba(88,28,135,0.02) 70%, rgba(88,28,135,0.09) 100%)",
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box"
  };
}
/** Visit-row avatar (intentionally hidden to match current UI requirements). */
function VisitDoctorAvatar() {
  return null;
}
/** Timeline dot with centered inner core and larger visual weight. */
function VisitTimelineDot({ variant = "default" }) {
  const isCancelled = variant === "cancelled";
  const outer = isCancelled ? "bg-[#F3C4B9]" : "bg-[#BCA4CF]";
  const inner = isCancelled ? "bg-[#C1421C]" : "bg-white";
  return (
    <span
      aria-hidden={true}
      className={`${styles.timelineDot} ${
        isCancelled ? styles.cancelled : styles.default
      }`}>

      <span
        className={`${styles.timelineDotInner} ${
          isCancelled ? styles.cancelled : styles.default
        }`} />
    </span>);

}
/** Frosted-white consultation summary surface — title + body rendered on a single line. */
function ConsultationSummarySurface({ children, className = "" }) {
  const parts = Children.toArray(children);
  const summary = parts[0];
  const actions = parts.slice(1);
  return (
    <div
      className={`${styles.consultationSummary} ${className}`}>

      <span className={styles.label}>
        Consultation summary:
      </span>{" "}
      <span className={styles.text}>{summary}</span>
      {actions.length ? <div className={styles.actions}>{actions}</div> : null}
    </div>);

}
function renderStatusChip(status, size = "sm") {
  const cls =
  status === "completed" ?
  "bg-tp-success-50 text-tp-success-700" :
  status === "in-progress" ?
  "bg-tp-warning-50 text-tp-warning-700" :
  status === "no-show" ?
  "bg-tp-error-50 text-tp-error-700" :
  status === "not-interested" || status === "cancelled" ?
  "bg-tp-error-50 text-tp-error-700" :
  "bg-tp-slate-100 text-tp-slate-500";
  const label =
  status === "completed" ?
  "Completed" :
  status === "in-progress" ?
  "In Progress" :
  status === "no-show" ?
  "No Show" :
  status === "not-interested" ?
  "Not Interested" :
  status === "cancelled" ?
  "Cancelled" :
  "Yet to Start";
  return (
    <span
      className={`${styles.statusChip} ${
        size === "md" ? styles.md : ""
      } ${
        status === "completed" ? styles.completed :
        status === "in-progress" ? styles.inProgress :
        status === "no-show" ? styles.noShow :
        status === "not-interested" || status === "cancelled" ? styles.cancelled :
        styles.yetToStart
      }`}>

      {label}
    </span>);

}
function getStatusSelectClasses(status) {
  if (status === "completed") return styles.statusSelect + " " + styles.completed;
  if (status === "in-progress") return styles.statusSelect + " " + styles.inProgress;
  if (status === "no-show") return styles.statusSelect + " " + styles.noShow;
  if (status === "not-interested") return styles.statusSelect + " " + styles.notInterested;
  if (status === "cancelled") return styles.statusSelect + " " + styles.cancelled;
  return styles.statusSelect + " " + styles.default;
}
function getStatusSelectItemToneClasses(status) {
  if (status === "completed") return styles.statusSelectItemTone + " " + styles.completed;
  if (status === "in-progress") return styles.statusSelectItemTone + " " + styles.inProgress;
  if (
  status === "no-show" ||
  status === "not-interested" ||
  status === "cancelled")

  return styles.statusSelectItemTone + " " + styles.cancelled;
  // "not-started" / fallback ("Get Started")
  return styles.statusSelectItemTone + " " + styles.default;
}
const statusSelectItemBaseClass = styles.statusSelectItemBase;

// Explicit status options shown in the treatment status dropdown.
// Order reflects typical flow. No "Auto" option — status is either
// derived from activity (consultations / legacy sittings & procedures) or explicitly chosen.
const STATUS_OPTIONS = [
{
  value: "not-started",
  label: "Yet to start"
},
{
  value: "in-progress",
  label: "In Progress"
},
{
  value: "completed",
  label: "Completed"
},
{
  value: "no-show",
  label: "Patient No-Show"
},
{
  value: "not-interested",
  label: "Not Interested"
},
{
  value: "cancelled",
  label: "Cancelled"
}];


function renderPlanCompletionChip(status) {
  const cls =
  status === "completed" ?
  "bg-tp-success-50 text-tp-success-700" :
  status === "partially-completed" ?
  "bg-tp-warning-50 text-tp-warning-700" :
  "bg-tp-slate-100 text-tp-slate-500";
  const label =
  status === "completed" ?
  "Completed" :
  status === "partially-completed" ?
  "Partially Completed" :
  "Not Completed";
  return (
    <span
      className={`${styles.completionChip} ${
        status === "completed" ? styles.completed :
        status === "partially-completed" ? styles.partiallyCompleted :
        styles.notCompleted
      }`}>

      {label}
    </span>);

}
function formatSurfaceLabel(surface) {
  return surface.charAt(0).toUpperCase() + surface.slice(1);
}

/** Split saved consultation summary into labeled rows (Sx / Dx / Lab …) for scan-friendly display. */
function segmentConsultSummaryLines(raw) {
  if (!raw?.trim()) return [];
  const rows = [];
  const pushRow = (badge, tone, text) => {
    const t = text?.trim();
    if (t)
    rows.push({
      badge,
      tone,
      text: t
    });
  };
  const lines = raw.
  split(/\n/).
  map((l) => l.trim()).
  filter(Boolean);
  for (const p of lines) {
    if (!p) continue;
    const sx = /^symptoms?:\s*(.+)$/i.exec(p);
    if (sx) {
      pushRow("Sx", "emerald", sx[1]);
      continue;
    }
    const dx = /^diagnosis:\s*(.+)$/i.exec(p);
    if (dx) {
      pushRow("Dx", "violet", dx[1]);
      continue;
    }
    const ex = /^examination:\s*(.+)$/i.exec(p);
    if (ex) {
      pushRow("Ex", "cyan", ex[1]);
      continue;
    }
    const lab = /^lab\s*investigation:\s*(.+)$/i.exec(p);
    if (lab) {
      pushRow("Lab", "amber", lab[1]);
      continue;
    }
    const med = /^medication:\s*(.+)$/i.exec(p);
    if (med) {
      pushRow("Rx", "rose", med[1]);
      continue;
    }
    const adv = /^(?:advice|adv)\s*:\s*(.+)$/i.exec(p);
    if (adv) {
      pushRow("Adv", "slate", adv[1]);
      continue;
    }
    if (/^tooth\s*:\s*/i.test(p) || /^tooth\s+/i.test(p) || /^T\d+/i.test(p)) {
      pushRow("Tooth", "blue", p.replace(/^tooth\s*:?\s*/i, ""));
      continue;
    }
    const proc = /^(?:procedure|Tx\s*history)\s*:?\s*(.+)$/i.exec(p);
    if (proc) {
      pushRow("Proc", "indigo", proc[1]);
      continue;
    }
    pushRow(null, "neutral", p);
  }
  return rows;
}
/** Pull FDI e.g. T24 from free text for compact summary lines. */
function extractToothFdiToken(text) {
  const m =
  /\bT\s*(\d{2})\b/i.exec(text) ??
  /\((T?\d{2})\)/.exec(text) ??
  /\b(\d{2})\s*(?:\)|$|,|\s)/.exec(text);
  if (!m) return null;
  const d = (m[1] ?? m[0]).replace(/^T/i, "");
  return /^\d{2}$/.test(d) ? `T${d}` : null;
}
/** Strip long tooth names; keep a short clause for narrative summaries. */
function compactToothSummaryText(text) {
  let t = text.
  replace(/\s*\([^)]*\)\s*/g, " ").
  replace(/\s+/g, " ").
  trim();
  t = t.replace(/^tooth\s*:?\s*/i, "").trim();
  return t;
}
/**
 * Short prose summary from saved Rx-style lines (no Sx:/Dx: labels).
 * Ordered roughly: presentation → exam → diagnosis → tooth-specific → labs → Rx → advice.
 */
function buildProseConsultSummary(raw, maxLen = 400) {
  const rows = segmentConsultSummaryLines(raw);
  const pushUnique = (arr, s) => {
    const x = s?.trim();
    if (x && !arr.includes(x)) arr.push(x);
  };
  const clauses = [];
  if (!rows.length) {
    const t = raw?.trim();
    if (!t) return "";
    const softened = t.
    replace(
      /\b(?:symptoms?|diagnosis|examination|lab\s*investigation|medication|adv(?:ice)?|procedure|Tx\s*history)\s*:\s*/gi,
      ""
    ).
    split(/\s*·\s*/).
    map((p) => p.trim()).
    filter(Boolean).
    join(". ").
    replace(/\s+/g, " ").
    trim();
    let out = softened || t;
    if (out.length > maxLen) out = `${out.slice(0, maxLen - 1).trimEnd()}…`;
    return out;
  }
  const sx = [],
    ex = [],
    dx = [],
    lab = [],
    rx = [],
    adv = [],
    tooth = [],
    proc = [],
    other = [];
  for (const r of rows) {
    const txt = r.text?.trim();
    if (!txt) continue;
    switch (r.badge) {
      case "Sx":
        pushUnique(sx, txt);
        break;
      case "Ex":
        pushUnique(ex, txt);
        break;
      case "Dx":
        pushUnique(dx, txt);
        break;
      case "Lab":
        pushUnique(lab, txt);
        break;
      case "Rx":
        pushUnique(rx, txt);
        break;
      case "Adv":
        pushUnique(adv, txt);
        break;
      case "Tooth":{
          const fdi = extractToothFdiToken(txt);
          const afterParen = txt.
          replace(/^[\s\S]*?\)\s*(?:·|,|\s)*\s*/m, "").
          trim();
          if (fdi && afterParen) pushUnique(tooth, `${fdi} — ${afterParen}`);else
          if (fdi) pushUnique(tooth, fdi);else
          pushUnique(tooth, compactToothSummaryText(txt));
          break;
        }
      case "Proc":
        pushUnique(proc, txt);
        break;
      default:
        pushUnique(other, txt);
    }
  }
  const chunks = [];
  if (sx.length) chunks.push(sx.join("; "));
  if (ex.length) chunks.push(ex.join("; "));
  if (dx.length) chunks.push(`Diagnosis ${dx.join("; ")}`);
  if (tooth.length) chunks.push(tooth.join("; "));
  if (proc.length) chunks.push(proc.join("; "));
  if (lab.length) chunks.push(`Labs ${lab.join("; ")}`);
  if (rx.length) chunks.push(`Rx ${rx.join("; ")}`);
  if (adv.length) chunks.push(`Advice ${adv.join("; ")}`);
  if (other.length) chunks.push(other.join("; "));
  let out = chunks.join(". ").replace(/\s+/g, " ").trim();
  if (out) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
    if (!/[.!?]$/.test(out)) out += ".";
  }
  if (out.length > maxLen) out = `${out.slice(0, maxLen - 1).trimEnd()}…`;
  return out;
}
/** Split tooth row into a Past Visits–style title (tooth + FDI) and detail body after · or —. */
function splitToothSnippetRow(text) {
  const trimmed = text.trim();
  const sep = trimmed.match(/^(.+?)\s*[·—]\s+([\s\S]+)$/);
  if (sep)
  return {
    title: sep[1].trim(),
    body: sep[2].trim()
  };
  return {
    title: trimmed,
    body: ""
  };
}
function formatInlineSnippetPart(row) {
  if (row.badge === "Tooth") {
    const { title, body } = splitToothSnippetRow(row.text);
    return body ? `${title}: ${body}` : title;
  }
  if (row.badge === "Proc") return `Procedure: ${row.text}`;
  return row.text;
}
/** Labelled flowing paragraph (full card). Snippet uses structured Past Visits–style blocks when inSurface. */
function renderConsultSummarySnippetBody(raw, { inSurface = false } = {}) {
  const pad = inSurface ? "pl-[0px]" : "pl-[4px]";
  const rows = segmentConsultSummaryLines(raw);
  if (inSurface) {
    if (!rows.length) {
      const prose = buildProseConsultSummary(raw);
      return prose ?
      <span className={`${styles.proseSummary} ${styles.hasText} ${pad}`}>{prose}</span> :

      <span className={`${styles.proseSummary} ${styles.noText} ${pad}`}>
          No summary text.
        </span>;

    }
    // In the surface variant we must show *all* content (no truncation/slicing),
    // because the requirement is to persist the full summary text.
    const inlineText = rows.
    map((r) => formatInlineSnippetPart(r)).
    filter(Boolean).
    join(" | ");
    return inlineText ?
    <span className={`${styles.proseSummary} ${styles.hasText} ${pad}`}>{inlineText}</span> :

    <span className={`${styles.proseSummary} ${styles.noText} ${pad}`}>
        No summary text.
      </span>;

  }
  if (!rows.length) {
    const t = raw?.trim();
    return t ?
    <p
      className={`${styles.proseSummary} ${styles.hasText} ${pad}`}>

        {t}
      </p> :

    <p
      className={`${styles.proseSummary} ${styles.noText} ${pad}`}>

        No summary text.
      </p>;

  }
  return (
    <p
      className={`${styles.proseSummary} ${styles.structured} ${pad}`}>

      {rows.map((r, i) =>
      <span key={i}>
          {i > 0 && <span className={styles.separator}> · </span>}
          {r.badge &&
        <span className={styles.badge}>{r.badge}: </span>}


          <span className={styles.content}>{r.text}</span>
        </span>
      )}
    </p>);

}
function formatDigitalRxSnapshotPlainText(snapshot) {
  const lines = [];
  lines.push("Digital Rx");
  lines.push("");
  if (snapshot) {
    const pushSection = (title, rows) => {
      if (!rows?.length) return;
      lines.push(title);
      rows.forEach((row) => {
        const suffix = row.metaParts?.length ?
        ` (${row.metaParts.join(" | ")})` :
        "";
        lines.push(`- ${row.title}${suffix}`);
      });
      lines.push("");
    };
    pushSection("Symptoms", snapshot.symptoms);
    pushSection("Examination", snapshot.examinations);
    pushSection("Diagnosis", snapshot.diagnoses);
    pushSection("Lab Investigation", snapshot.labInvestigations);
    pushSection("Medication (Rx)", snapshot.medications);
    pushSection("Advice", snapshot.advice);
  } else {
    lines.push("No Rx data available yet.");
  }
  return lines.join("\n");
}
function downloadSnapshotTxt(snapshot) {
  const blob = new Blob([formatDigitalRxSnapshotPlainText(snapshot)], {
    type: "text/plain;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "digital-rx.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function sanitizeDownloadFilename(name) {
  return (
    String(name ?? "document").
    replace(/[^\w.-]+/g, "-").
    replace(/^-+|-+$/g, "").
    slice(0, 96) || "document");

}
function downloadTxtFile(text, filename = "document.txt") {
  const body = String(text ?? "").trim() || "—";
  const blob = new Blob([body], {
    type: "text/plain;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeDownloadFilename(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function printPlainTextDocument(title, bodyText) {
  const esc = (s) =>
  String(s ?? "").
  replace(/&/g, "&amp;").
  replace(/</g, "&lt;").
  replace(/>/g, "&gt;").
  replace(/"/g, "&quot;");
  const htmlBody = esc(String(bodyText ?? "").trim() || "—").replace(
    /\r?\n/g,
    "<br/>"
  );
  const w = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=800,height=900"
  );
  if (!w) return;
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;color:#334155;font-size:13px;line-height:1.65;}h1{font-size:15px;font-weight:600;margin:0 0 12px;color:#0f172a;}</style></head><body><h1>${esc(title)}</h1><div>${htmlBody}</div></body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
  w.close();
}
function downloadDigitalRxSnapshot(patientId) {
  downloadSnapshotTxt(getComposedRxPreviewSnapshot(patientId));
}
function printDigitalRxSnapshot(patientId) {
  printPlainTextDocument(
    "Digital Rx",
    formatDigitalRxSnapshotPlainText(getComposedRxPreviewSnapshot(patientId))
  );
}
function ConsultationPreviewCard({
  c,
  appointmentItems,
  patientId,
  plan,
  service,
  embedInPatientShell,
  underAppointment = false,
  variant = "card",
  previewOpen: previewOpenControlled,
  onPreviewOpenChange: setPreviewOpenControlled,
  hideViewRxButton = false
}) {
  const [previewOpenInternal, setPreviewOpenInternal] = useState(false);
  const isPreviewControlled =
  previewOpenControlled !== undefined &&
  setPreviewOpenControlled !== undefined;
  const previewOpen = isPreviewControlled ?
  Boolean(previewOpenControlled) :
  previewOpenInternal;
  const setPreviewOpen = (v) => {
    if (isPreviewControlled) setPreviewOpenControlled(v);else
    setPreviewOpenInternal(v);
  };
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!previewOpen) return;
    setSnapshot(getComposedRxPreviewSnapshot(patientId));
  }, [previewOpen, patientId]);
  const fromAppt = c.source === "appointment" && c.appointmentId;
  const appt = fromAppt ?
  appointmentItems.find((a) => a.id === c.appointmentId) :
  null;
  const tag =
  fromAppt && appt ?
  `Linked · ${appt.date} · ${appt.time}` :
  "Treatment visit (no appointment)";
  const ended = c.endedAt?.includes("T") ?
  c.endedAt.slice(0, 16).replace("T", " · ") :
  c.endedAt ?? "";
  const metaLine =
  underAppointment && fromAppt ?
  ended ?
  `Ended · ${ended}` :
  "Saved from this visit's Rx" :
  ended ?
  `${tag} · ${ended}` :
  tag;
  const rxHref = buildConsultationRxUrl(
    patientId,
    plan.id,
    service.id,
    c.appointmentId,
    embedInPatientShell,
    service.treatment
  );
  const snippet =
  <>
      {renderConsultSummarySnippetBody(c.summaryText ?? "", {
      inSurface: variant === "snippet"
    })}
      {!hideViewRxButton &&
    <button
      type="button"
      onClick={() => setPreviewOpen(true)}
      className={
      variant === "snippet" ?
      `${VIEW_RX_SECONDARY_CLASS}` :
      `mt-[10px] ${VIEW_RX_SECONDARY_CLASS}`}>


          View Rx
        </button>}

    </>;


  return (
    <>
      {variant === "snippet" ?
      <ConsultationSummarySurface>{snippet}</ConsultationSummarySurface> :

      <div className={styles.previewSummaryCard}>
          <div className={styles.previewSummaryHeader}>
            <p className={styles.previewSummaryTitle}>
              Rx summary
            </p>
            <span className={styles.previewSummaryMeta}>
              {metaLine}
            </span>
          </div>
          <div className={styles.previewSummaryBody}>{snippet}</div>
        </div>}


      <TPDrawer open={previewOpen} onOpenChange={setPreviewOpen}>
        <TPDrawerContent
          side="right"
          size="xl"
          className={`${styles.previewDrawerPanel} ${PLAN_DRAWER_PANEL_CLASS}`}>

          <div className={dui.drawerHeader}>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className={dui.drawerCloseBtn}
                  aria-label="Close preview">

                  <CloseSquareIcon size={24} color="var(--tp-slate-700)" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Close
              </TooltipContent>
            </Tooltip>
            <div className={dui.drawerDivider} aria-hidden={true} />
            <h2 className={dui.drawerTitle}>Preview Rx</h2>
            <div className={cx(dui.drawerAction, styles.drawerActionRow)}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild={true}>
                  <button
                    type="button"
                    onClick={() => downloadSnapshotTxt(snapshot)}
                    className={PREVIEW_RX_ICON_BTN_CLASS}
                    aria-label="Download Rx">

                    <DocumentDownload size={18} variant="Linear" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Download Rx
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild={true}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={PREVIEW_RX_ICON_BTN_CLASS}
                    aria-label="Print Rx">

                    <Printer size={18} variant="Linear" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Print Rx
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild={true}>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewOpen(false);
                      window.location.assign(rxHref);
                    }}
                    className={PREVIEW_RX_ICON_BTN_CLASS}
                    aria-label="Edit RX">

                    <Edit2 size={18} variant="Linear" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Edit RX
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className={styles.previewDrawerBody}>
            <RxPreviewDocument snapshot={snapshot} />
          </div>
        </TPDrawerContent>
      </TPDrawer>
    </>);

}

/** Quick visit (sitting) — Preview Rx drawer: consultation notes + composed digital Rx (same shell as consultation preview). */
function QuickVisitRxPreview({
  sit,
  patientId,
  plan,
  service,
  embedInPatientShell,
  previewOpen,
  onOpenChange
}) {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!previewOpen) return;
    setSnapshot(getComposedRxPreviewSnapshot(patientId));
  }, [previewOpen, patientId]);
  const rxHref = buildConsultationRxUrl(
    patientId,
    plan.id,
    service.id,
    undefined,
    embedInPatientShell,
    service.treatment
  );
  const notesRaw = String(sit.notes ?? "").trim();
  return (
    <TPDrawer open={previewOpen} onOpenChange={onOpenChange}>
      <TPDrawerContent
        side="right"
        size="xl"
        className={`${styles.previewDrawerPanel} ${PLAN_DRAWER_PANEL_CLASS}`}>

        <div className={dui.drawerHeader}>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild={true}>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={dui.drawerCloseBtn}
                aria-label="Close preview">

                <CloseSquareIcon size={24} color="var(--tp-slate-700)" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              Close
            </TooltipContent>
          </Tooltip>
          <div className={dui.drawerDivider} aria-hidden={true} />
          <h2 className={dui.drawerTitle}>Preview Rx</h2>
          <div className={cx(dui.drawerAction, styles.drawerActionRow)}>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={() => downloadSnapshotTxt(snapshot)}
                  className={PREVIEW_RX_ICON_BTN_CLASS}
                  aria-label="Download Rx">

                  <DocumentDownload size={18} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Download Rx
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={PREVIEW_RX_ICON_BTN_CLASS}
                  aria-label="Print Rx">

                  <Printer size={18} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Print Rx
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.assign(rxHref);
                  }}
                  className={PREVIEW_RX_ICON_BTN_CLASS}
                  aria-label="Edit RX">

                  <Edit2 size={18} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Edit RX
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className={styles.previewDrawerBody}>
          <div className={styles.previewDrawerBodyInner}>
            <RxPreviewDocument
              snapshot={snapshot}
              extraNotes={notesRaw || undefined} />

          </div>
        </div>
      </TPDrawerContent>
    </TPDrawer>);

}

// ─── Service Sub-Card ──────────────────────────────────────
function ServiceSubCard({ service, plan, index, isOpen, onToggle }) {
  const { dispatch, openDrawer, patientId, embedInPatientShell } =
  usePlanContext();
  const [consultPreviewId, setConsultPreviewId] = useState(null);
  const [sittingPreviewId, setSittingPreviewId] = useState(null);
  const [markDoneOpen, setMarkDoneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Appointment cancellation dialog state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const openCancelDialog = (appt) => {
    setCancelTarget(appt);
    setCancelReason(appt.cancellationReason ?? "");
  };
  const closeCancelDialog = () => {
    setCancelTarget(null);
    setCancelReason("");
  };
  const confirmCancelAppointment = () => {
    if (!cancelTarget) return;
    dispatch({
      type: "UPDATE_APPOINTMENT",
      serviceId: service.id,
      appointmentId: cancelTarget.id,
      patch: {
        status: "cancelled",
        cancellationReason: cancelReason.trim() || "No reason provided"
      }
    });
    closeCancelDialog();
  };
  const handleMarkDone = () => {
    dispatch({
      type: "MARK_SERVICE_COMPLETED",
      serviceId: service.id
    });
    setMarkDoneOpen(false);
  };
  const appointmentItems = service.appointments ?? [];
  const timelineEntries = buildVisitTimelineEntries(service);
  const serviceRxHref = buildConsultationRxUrl(
    patientId,
    plan.id,
    service.id,
    undefined,
    embedInPatientShell,
    service.treatment
  );
  const toothText =
  service.toothFdi === "full-mouth" ? "Full Mouth" : `T${service.toothFdi}`;
  const surfaceSummary =
  service.surfaces.length > 0 ?
  service.surfaces.
  map((surface) => formatSurfaceLabel(surface)).
  join(", ") :
  "All surfaces";
  const serviceMetaSummary =
  service.toothFdi === "full-mouth" ?
  "Full Mouth" :
  `${service.toothLabel} (${toothText})`;
  const hoverDetails = [
  {
    label: "Tooth",
    value:
    service.toothFdi === "full-mouth" ?
    "Full Mouth" :
    `${service.toothLabel} (${toothText})`
  },
  {
    label: "Surfaces",
    value: surfaceSummary
  },
  {
    label: "Notes",
    value: String(service.notes ?? "").trim() || "No notes added"
  }];


  const workflowStatus = getServiceWorkflowStatus(service);
  // Persisted-store status that we use as the dropdown value. If the
  // service has never been explicitly set, fall back to the derived
  // workflow status so the dropdown reflects reality.
  const dropdownValue =
  service.status === "planned" ? workflowStatus : service.status;
  const statusSelectClasses = getStatusSelectClasses(dropdownValue);
  const accordionIconToneClass = getStatusSelectItemToneClasses(dropdownValue);
  const handleServiceStatusChange = (next) => {
    // "not-started" is synthetic — it maps back to the reducer's "planned".
    const mappedStatus = next === "not-started" ? "planned" : next;
    dispatch({
      type: "UPDATE_SERVICE",
      serviceId: service.id,
      patch: {
        status: mappedStatus,
        completedAt:
        mappedStatus === "completed" ?
        service.completedAt ?? new Date().toISOString().slice(0, 10) :
        undefined
      }
    });
  };
  return (
    <div className={styles.serviceCard}>
      <div
        className={cx(styles.serviceCardHeader, isOpen ? styles.serviceCardHeaderOpen : "")}
        onClick={() => onToggle?.()}>

        <div className={styles.serviceCardIndexPill}>
          <span className={styles.serviceCardIndexText}>
            {index + 1}
          </span>
        </div>
        <div className={styles.serviceCardContent}>
          <div className={styles.serviceCardMain}>
            <div className={styles.serviceCardTitleRow}>
              <p className={styles.serviceCardTitle}>
                {service.treatment}
              </p>
              <span className={styles.serviceCardToothBadge}>
                {toothText}
              </span>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild={true}>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={styles.serviceInfoButton}
                    aria-label="View treatment details">

                    <Info size={14} strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className={styles.serviceInfoTooltip}>

                  <div className={styles.serviceInfoTooltipBody}>
                    {hoverDetails.map((detail) =>
                    <p>
                        <span className={styles.serviceInfoTooltipLabel}>
                          {detail.label}:{" "}
                        </span>
                        <span>{detail.value}</span>
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className={styles.serviceCardStatusRow}>
              <TPSelect
                value={dropdownValue}
                onValueChange={(v) => handleServiceStatusChange(v)}>

                <TPSelectTrigger
                  className={cx(styles.serviceStatusTrigger, statusSelectClasses)}
                  onPointerDown={(e) => e.stopPropagation()}>

                  <TPSelectValue placeholder="Select status" />
                </TPSelectTrigger>
                <TPSelectContent className={styles.serviceStatusContent}>
                  {STATUS_OPTIONS.map((opt) =>
                  <TPSelectItem
                    value={opt.value}
                    className={`${statusSelectItemBaseClass} ${getStatusSelectItemToneClasses(opt.value)}`}>

                      {opt.label}
                    </TPSelectItem>
                  )}
                </TPSelectContent>
              </TPSelect>
            </div>
          </div>
          <div className={styles.serviceCardActions}>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isOpen) onToggle?.();
                    openDrawer({
                      type: "add-sitting",
                      serviceId: service.id
                    });
                  }}
                  className={styles.serviceActionButton}
                  aria-label="Add quick visit record">

                  <Add size={18} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className={styles.serviceActionTooltip}>

                Add quick visit record
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild={true}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isOpen) onToggle?.();
                    openDrawer({
                      type: "book-appointment",
                      planId: plan.id,
                      serviceId: service.id
                    });
                  }}
                  className={styles.serviceActionButton}
                  aria-label="Book appointment">

                  <Calendar2 size={17} variant="Linear" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className={styles.serviceActionTooltip}>

                Book appointment
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild={true}>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className={styles.serviceMoreButton}
                  aria-label="More actions">

                  <MoreVertical
                    size={18}
                    color="currentColor"
                    strokeWidth={2} />

                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={dropdownContentClass}>
                <DropdownMenuItem
                  onClick={() =>
                  openDrawer({
                    type: "bill-preview",
                    planId: plan.id,
                    serviceId: service.id
                  })}

                  className={dropdownItemClass}>

                  <Receipt1 size={16} variant="Linear" />
                  View work done
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className={styles.deleteServiceMenuItem}>

                  <Trash
                    size={16}
                    variant="Linear"
                    className={styles.errorIcon} />


                  <span className={styles.errorText}>Delete Service</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle?.();
              }}
              aria-label={isOpen ? "Collapse service" : "Expand service"}
              className={styles.serviceCollapseButton}>

              <span
                className={cx(styles.serviceCollapseIcon, isOpen ? styles.serviceCollapseIconOpen : "")}>

                <ChevronDown
                  size={18}
                  className={styles.currentColorIcon}
                  strokeWidth={2} />

              </span>
            </button>
          </div>
        </div>
      </div>
      {isOpen &&
      <div className={styles.serviceBody}>
          <div className={styles.serviceBodyInner}>
            <div className={styles.serviceSummaryBox}>
              <div className={styles.serviceSummaryRow}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>
                    Treatment:
                  </span>
                  <span>{service.treatment}</span>
                </div>
                <span aria-hidden={true} className={styles.summaryDivider} />
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>
                    Tooth:
                  </span>
                  <span>
                    {service.toothFdi === "full-mouth" ?
                  "Full Mouth" :
                  `${service.toothLabel} (${toothText})`}
                  </span>
                </div>
                {service.toothFdi !== "full-mouth" &&
                <span
                aria-hidden={true}
                className={styles.summaryDivider} />}



                {service.toothFdi !== "full-mouth" &&
              <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>
                      Surfaces:
                    </span>
                    <span>{surfaceSummary}</span>
                  </div>}


                <span aria-hidden={true} className={styles.summaryDivider} />
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>
                    Amount:
                  </span>
                  <span className={styles.summaryValueAmount}>
                    {formatINR(service.amount)}
                  </span>
                </div>
                <span aria-hidden={true} className={styles.summaryDivider} />
                <div className={`${styles.summaryItem} ${styles.summaryItemFull}`}>
                  <span className={styles.summaryLabel}>
                    Notes:
                  </span>
                  <span
                  className={
                  String(service.notes ?? "").trim() ?
                  "" :
                  styles.muted}>


                    {String(service.notes ?? "").trim() || "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.minWidthZero}>
              {timelineEntries.length > 0 ?
            <div className={styles.minWidthZero}>
                  {timelineEntries.map((entry, idx) => {
                const isLast = idx === timelineEntries.length - 1;
                if (entry.kind === "appointment") {
                  const appt = entry.appt;
                  const isCancelled = appt.status === "cancelled";
                  const linkedConsultations = entry.linkedConsultations;
                  // Cancelled appointments must not display consultation summary/preview UI.
                  const hasVisitNotes =
                  !isCancelled && linkedConsultations.length > 0;
                  const primaryConsult = linkedConsultations[0];
                  const apptRxHref = buildConsultationRxUrl(
                    patientId,
                    plan.id,
                    service.id,
                    appt.id,
                    embedInPatientShell,
                    service.treatment
                  );
                  const dateLong = formatAppointmentDateLong(appt.date);
                  const badgeKind = isCancelled ?
                  "cancelled" :
                  hasVisitNotes ?
                  "completed" :
                  "upcoming";
                  return (
                    <div
                      className={cx(styles.timelineEntry, idx === 0 ? styles.first : "")}>

                          {!isLast &&
                      <span
                        aria-hidden={true}
                        className={styles.timelineVerticalLine} />}



                          <VisitTimelineDot
                        variant={isCancelled ? "cancelled" : "default"} />


                          <div
                        className={styles.visitRowCard}
                        style={getVisitRowSurfaceStyle(isCancelled)}>

                            <div className={styles.visitRowHeader}>
                              <div className={styles.visitRowInfo}>
                                <div className={styles.doctorInfoRow}>
                                  <VisitDoctorAvatar />
                                  <p
                                className={cx(styles.doctorName, isCancelled ? styles.cancelledLine : "")}>

                                    {appt.doctor}
                                  </p>
                                  {visitBadge(badgeKind)}
                                </div>
                               <div
                               className={`${styles.visitMetaRow} ${isCancelled ? styles.cancelledLine : ""}`}>

                                  <span className={styles.metaItem}>
                                     <span className={styles.metaLabel}>Date:</span>
                                    <span>
                                      {appt.time ?
                                  `${dateLong} (${appt.time})` :
                                  dateLong}
                                    </span>
                                  </span>
                                  <span
                                className={styles.metaDivider}
                                aria-hidden={true} />


                                  <span className={styles.metaItem}>
                                    <span className={styles.metaLabel}>
                                      Visit Type:
                                    </span>
                                    <span>
                                      {appt.caseType ?
                                  CASE_TYPE_LABELS[appt.caseType] ??
                                  "Follow up" :
                                  "Follow up"}
                                    </span>
                                  </span>
                                  <span
                                className={styles.metaDivider}
                                aria-hidden={true} />


                                  <span className={cx(styles.metaItem, styles.metaItemTruncate)}>
                                    <span className={styles.metaLabel}>
                                      Remarks:
                                    </span>
                                    <span className={styles.metaValueTruncate}>
                                      {String(appt.notes ?? "").trim() ||
                                  "Review and obturation planning"}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <div className={styles.visitRowActions}>
                                {hasVisitNotes && primaryConsult &&
                            <button
                              type="button"
                              onClick={() => {
                                setSittingPreviewId(null);
                                setConsultPreviewId(primaryConsult.id);
                              }}
                              className={VIEW_RX_SECONDARY_CLASS}>

                                    <DocumentText size={14} variant="Linear" />
                                    View Rx
                                  </button>}


                                {!hasVisitNotes && !isCancelled &&
                            <TPSplitButton
                              size="sm"
                              variant="outline"
                              theme="primary"
                              className={styles.noShadow}
                              trackClassName={TIMELINE_TYPERX_TRACK_CLASS}
                              primaryAction={{
                                label: "TypeRx",
                                onClick: () =>
                                window.location.assign(apptRxHref)
                              }}
                              secondaryActions={[
                              {
                                id: "quick-record-visit-form",
                                label: "Quick visit record form",
                                onClick: () =>
                                openDrawer({
                                  type: "add-sitting",
                                  serviceId: service.id
                                })
                              },
                              {
                                id: "quick-record-separator",
                                separator: true
                              },
                              {
                                id: "type-rx",
                                label: "TypeRx",
                                onClick: () =>
                                window.location.assign(apptRxHref)
                              },
                              {
                                id: "voice-rx",
                                label: "VoiceRx",
                                onClick: () =>
                                window.location.assign(apptRxHref)
                              },
                              {
                                id: "snap-rx",
                                label: "SnapRx",
                                onClick: () =>
                                window.location.assign(apptRxHref)
                              },
                              {
                                id: "smart-sync",
                                label: "SmartSync",
                                onClick: () =>
                                window.location.assign(apptRxHref)
                              }]} />}




                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild={true}>
                                    <button
                                  type="button"
                                  className={TIMELINE_MENU_TRIGGER_CLASS}
                                  aria-label="More actions">

                                      <MoreVertical
                                    size={17}
                                    color="currentColor"
                                    strokeWidth={2} />

                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                align="end"
                                className={dropdownContentClass}>

                                    {hasVisitNotes && primaryConsult &&
                                <>
                                        <DropdownMenuItem
                                    className={dropdownItemClass}
                                    onClick={() =>
                                    window.location.assign(apptRxHref)}>


                                          <Edit2
                                      size={16}
                                      variant="Linear" />

                                          Edit in RxPad
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                    className={dropdownItemClass}
                                    onClick={() => {
                                      setSittingPreviewId(null);
                                      setConsultPreviewId(
                                        primaryConsult.id
                                      );
                                    }}>

                                          <DocumentText
                                      size={16}
                                      variant="Linear" />

                                          View Rx
                                        </DropdownMenuItem>
                                      </>}


                                    {!isCancelled && !hasVisitNotes &&
                                <>
                                        <DropdownMenuItem
                                    className={dropdownItemClass}
                                    onClick={() =>
                                    openDrawer({
                                      type: "book-appointment",
                                      planId: plan.id,
                                      serviceId: service.id,
                                      appointmentId: appt.id
                                    })}>


                                          <Edit2
                                      size={16}
                                      variant="Linear" />

                                          Edit appointment
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                    className="rounded-[8px] !gap-[6px] focus:bg-red-50 data-[highlighted]:bg-red-50"
                                    onClick={() => openCancelDialog(appt)}>

                                          <Ban
                                      size={16}
                                      variant="Linear"
                                      className={styles.errorIcon} />


                                          <span className={styles.errorText}>
                                            Cancel appointment
                                          </span>
                                        </DropdownMenuItem>
                                      </>}


                                    {isCancelled && !hasVisitNotes &&
                                <>
                                        <DropdownMenuItem
                                    className={dropdownItemClass}
                                    onClick={() =>
                                    dispatch({
                                      type: "UPDATE_APPOINTMENT",
                                      serviceId: service.id,
                                      appointmentId: appt.id,
                                      patch: {
                                        status: "scheduled",
                                        cancellationReason: undefined
                                      }
                                    })}>


                                          <ArrowRotateLeft
                                      size={16}
                                      variant="Linear"
                                      className={styles.successIcon} />


                                          <span className="text-tp-success-600">
                                            Revert cancellation
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                    className={dropdownItemClass}
                                    onClick={() =>
                                    dispatch({
                                      type: "REMOVE_APPOINTMENT",
                                      serviceId: service.id,
                                      appointmentId: appt.id
                                    })}>


                                          <Trash
                                      size={16}
                                      variant="Linear" />

                                          Remove from timeline
                                        </DropdownMenuItem>
                                      </>}

                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            {isCancelled && appt.cancellationReason &&
                        <p className={styles.cancelReasonRow}>
                                <span className={styles.cancelReasonLabel}>Reason: </span>
                                {appt.cancellationReason}
                              </p>}


                            {!isCancelled &&
                        linkedConsultations.map((c) =>
                        <ConsultationPreviewCard
                          c={c}
                          appointmentItems={appointmentItems}
                          patientId={patientId}
                          plan={plan}
                          service={service}
                          embedInPatientShell={embedInPatientShell}
                          underAppointment={true}
                          variant="snippet"
                          previewOpen={consultPreviewId === c.id}
                          onPreviewOpenChange={(o) => {
                            if (o) setSittingPreviewId(null);
                            setConsultPreviewId(o ? c.id : null);
                          }}
                          hideViewRxButton={true} />

                        )}
                          </div>
                        </div>);

                }
                if (entry.kind === "sitting") {
                  const sit = entry.sitting;
                  const sitStatus = sit.status ?? "completed";
                  const isCancelledSit = sitStatus === "cancelled";
                  const isUpcomingSit = sitStatus === "scheduled";
                  const sitRxHref = buildConsultationRxUrl(
                    patientId,
                    plan.id,
                    service.id,
                    undefined,
                    embedInPatientShell,
                    service.treatment
                  );
                  const sitDateLong = sit.date ?
                  formatAppointmentDateLong(sit.date) :
                  "";
                  return (
                    <div
                      className={cx(styles.timelineEntry, idx === 0 ? styles.first : "")}>

                          {!isLast &&
                      <span
                        aria-hidden={true}
                        className={styles.timelineVerticalLine} />}



                          <VisitTimelineDot
                        variant={isCancelledSit ? "cancelled" : "default"} />


                          <div
                        className={styles.visitRowCard}
                        style={getVisitRowSurfaceStyle(isCancelledSit)}>

                            <div className={styles.visitRowHeader}>
                               <div className={styles.visitRowInfo}>
                                <div className={styles.doctorInfoRow}>
                                  <VisitDoctorAvatar />
                                  <p
                                className={cx(styles.doctorName, isCancelledSit ? styles.cancelledLine : "")}>

                                    {sit.doctor || "Quick visit"}
                                  </p>
                                  {visitBadge(
                                isCancelledSit ?
                                "cancelled" :
                                isUpcomingSit ?
                                "upcoming" :
                                "completed"
                              )}
                                </div>
                                 <div
                               className={`${styles.visitMetaRow} ${isCancelledSit ? styles.cancelledLine : ""}`}>

                                  {sitDateLong &&
                              <span className={styles.metaItem}>
                                      <span className={styles.metaLabel}>
                                        Date:
                                      </span>
                                      <span>
                                        {sit.time ?
                                  `${sitDateLong} (${sit.time})` :
                                  sitDateLong}
                                      </span>
                                    </span>}


                                  {sitDateLong &&
                              <span
                                className={styles.metaDivider}
                                aria-hidden={true} />}



                                  <span className={styles.metaItem}>
                                    <span className={styles.metaLabel}>
                                      Visit Type:
                                    </span>
                                    <span>
                                      {String(sit.visitType ?? "").trim() ||
                                  "Follow up"}
                                    </span>
                                  </span>
                                  <span
                                className={styles.metaDivider}
                                aria-hidden={true} />


                                  <span className={cx(styles.metaItem, styles.metaItemTruncate)}>
                                    <span className={styles.metaLabel}>
                                      Remarks:
                                    </span>
                                    <span className={styles.metaValueTruncate}>
                                      {String(sit.notes ?? "").trim() ||
                                  "Review and obturation planning"}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <div className={styles.visitRowActions}>
                                {!isCancelledSit &&
                            sitStatus === "completed" &&
                            <button
                              type="button"
                              onClick={() => {
                                setConsultPreviewId(null);
                                setSittingPreviewId(sit.id);
                              }}
                              className={VIEW_RX_SECONDARY_CLASS}>

                                      <DocumentText
                                size={14}
                                variant="Linear" />

                                      View Rx
                                    </button>}


                                {!isCancelledSit && isUpcomingSit &&
                            <TPSplitButton
                              size="sm"
                              variant="outline"
                              theme="primary"
                              className={styles.noShadow}
                              trackClassName={TIMELINE_TYPERX_TRACK_CLASS}
                              primaryAction={{
                                label: "TypeRx",
                                onClick: () =>
                                window.location.assign(sitRxHref)
                              }}
                              secondaryActions={[
                              {
                                id: "quick-record-visit-form",
                                label: "Quick visit record form",
                                onClick: () =>
                                openDrawer({
                                  type: "add-sitting",
                                  serviceId: service.id
                                })
                              },
                              {
                                id: "quick-record-separator",
                                separator: true
                              },
                              {
                                id: "type-rx",
                                label: "TypeRx",
                                onClick: () =>
                                window.location.assign(sitRxHref)
                              },
                              {
                                id: "voice-rx",
                                label: "VoiceRx",
                                onClick: () =>
                                window.location.assign(sitRxHref)
                              },
                              {
                                id: "snap-rx",
                                label: "SnapRx",
                                onClick: () =>
                                window.location.assign(sitRxHref)
                              },
                              {
                                id: "smart-sync",
                                label: "SmartSync",
                                onClick: () =>
                                window.location.assign(sitRxHref)
                              }]} />}




                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild={true}>
                                    <button
                                  type="button"
                                  className={TIMELINE_MENU_TRIGGER_CLASS}
                                  aria-label="More actions">

                                      <MoreVertical
                                    size={17}
                                    color="currentColor"
                                    strokeWidth={2} />

                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                align="end"
                                className={dropdownContentClass}>

                                    {!isCancelledSit &&
                                <>
                                        <DropdownMenuItem
                                    className={dropdownItemClass}
                                    onClick={() =>
                                    openDrawer({
                                      type: "edit-sitting",
                                      serviceId: service.id,
                                      sittingId: sit.id
                                    })}>


                                          <Edit2
                                      size={16}
                                      variant="Linear" />

                                          Edit visit
                                        </DropdownMenuItem>
                                        {sit.notes &&
                                  <DropdownMenuItem
                                    className={dropdownItemClass}
                                    onClick={() => {
                                      setConsultPreviewId(null);
                                      setSittingPreviewId(sit.id);
                                    }}>

                                            <DocumentText
                                      size={16}
                                      variant="Linear" />

                                            View Rx
                                          </DropdownMenuItem>}

                                      </>}


                                    {isCancelledSit &&
                                <>
                                        <DropdownMenuItem
                                    className={dropdownItemClass}
                                    onClick={() =>
                                    dispatch({
                                      type: "UPDATE_SITTING",
                                      serviceId: service.id,
                                      sittingId: sit.id,
                                      patch: {
                                        status: "completed"
                                      }
                                    })}>


                                          <ArrowRotateLeft
                                      size={16}
                                      variant="Linear"
                                      className={styles.successIcon} />


                                          <span className={styles.successText}>
                                            Revert cancellation
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                    className={dropdownItemClass}
                                    onClick={() =>
                                    dispatch({
                                      type: "REMOVE_SITTING",
                                      serviceId: service.id,
                                      sittingId: sit.id
                                    })}>


                                          <Trash
                                      size={16}
                                      variant="Linear" />

                                          Remove from timeline
                                        </DropdownMenuItem>
                                      </>}

                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            {!isCancelledSit && !isUpcomingSit && sit.notes &&
                        <ConsultationSummarySurface>
                                {renderConsultSummarySnippetBody(sit.notes, {
                            inSurface: true
                          })}
                              </ConsultationSummarySurface>}

                          </div>
                          <QuickVisitRxPreview
                        sit={sit}
                        patientId={patientId}
                        plan={plan}
                        service={service}
                        embedInPatientShell={embedInPatientShell}
                        previewOpen={sittingPreviewId === sit.id}
                        onOpenChange={(o) =>
                        setSittingPreviewId(o ? sit.id : null)} />


                        </div>);

                }
                const c = entry.consultation;
                const directRxHref = buildConsultationRxUrl(
                  patientId,
                  plan.id,
                  service.id,
                  c.appointmentId,
                  embedInPatientShell,
                  service.treatment
                );
                return (
                  <div
                    className={`${styles.timelineEntry} ${idx === 0 ? styles.first : ""}`}>

                        {!isLast &&
                    <span className={styles.timelineVerticalLineThin} />}


                        <span className={styles.timelineDotSimple} />
                        <div className={styles.visitRowCardGradient}>

                          <div className={styles.visitRowHeader}>
                            <div className={styles.visitRowInfo}>
                              <div className={styles.doctorInfoRow}>
                                <p className={styles.chairsideVisitLabel}>
                                  Chairside visit
                                </p>
                                {visitBadge("completed")}
                              </div>
                              <div className={styles.visitMetaRow}>
                                <span className={styles.metaLabel}>
                                  Visit Type:
                                </span>
                                <span>Follow up</span>
                                <span
                              className={styles.metaDivider}
                              aria-hidden={true} />


                                <span className={styles.metaLabel}>Remarks:</span>
                                <span className={styles.metaValueTruncate}>
                                  {String(c.summaryText ?? "").
                              trim().
                              split(/\n/).
                              map((l) => l.trim()).
                              filter(Boolean)[0] ||
                              "Review and obturation planning"}
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                              <button
                            type="button"
                            onClick={() => {
                              setSittingPreviewId(null);
                              setConsultPreviewId(c.id);
                            }}
                            className={VIEW_RX_SECONDARY_CLASS}>

                                <DocumentText size={14} variant="Linear" />
                                View Rx
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild={true}>
                                  <button
                                type="button"
                                className={TIMELINE_MENU_TRIGGER_CLASS}
                                aria-label="More actions">

                                    <MoreVertical
                                  size={17}
                                  color="currentColor"
                                  strokeWidth={2} />

                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                              align="end"
                              className={dropdownContentClass}>

                                  <DropdownMenuItem
                                className={dropdownItemClass}
                                onClick={() =>
                                window.location.assign(directRxHref)}>


                                    <Edit2
                                  size={16}
                                  variant="Linear"
                                  className="" />

                                    Edit in RxPad
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                className={dropdownItemClass}
                                onClick={() => {
                                  setSittingPreviewId(null);
                                  setConsultPreviewId(c.id);
                                }}>

                                    <DocumentText
                                  size={16}
                                  variant="Linear"
                                  className="" />

                                    View Rx
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <ConsultationPreviewCard
                        c={c}
                        appointmentItems={appointmentItems}
                        patientId={patientId}
                        plan={plan}
                        service={service}
                        embedInPatientShell={embedInPatientShell}
                        variant="snippet"
                        previewOpen={consultPreviewId === c.id}
                        onPreviewOpenChange={(o) => {
                          if (o) setSittingPreviewId(null);
                          setConsultPreviewId(o ? c.id : null);
                        }}
                        hideViewRxButton={true} />

                        </div>
                      </div>);

              })}
                </div> :

            <div className={styles.emptyTimeline}>
                  <PlanEmptyIcon size={96} />
                  <p className={styles.emptyTitle}>
                    No visits recorded yet
                  </p>
                  <p className={styles.emptyDesc}>
                    Add a quick visit report or book the next appointment for
                    this service.
                  </p>
                  <div className={styles.emptyActionsRow}>
                    <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDrawer({
                      type: "book-appointment",
                      planId: plan.id,
                      serviceId: service.id
                    });
                  }}
                  className={styles.emptyBookBtn}>

                      <Calendar2
                    size={18}
                    variant="Linear"
                    className={styles.blueIcon} />

                      Book appointment
                    </button>
                    <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDrawer({
                      type: "add-sitting",
                      serviceId: service.id
                    });
                  }}
                  className={styles.emptyAddBtn}>

                      <Add size={18} variant="Linear" className={styles.whiteIcon} />
                      Add Quick Visit Report
                    </button>
                  </div>
                </div>}

            </div>
          </div>
        </div>}
      {" "}
      // ── Dialogs ────────────────────────────────────
      <TPConfirmDialog
        open={markDoneOpen}
        onOpenChange={setMarkDoneOpen}
        title="Mark as Completed"
        warning={`This marks ${service.treatment} (${service.toothFdi === "full-mouth" ? "Full Mouth" : `T${service.toothFdi}`}) as completed. You can revert the status if needed.`}
        secondaryLabel="Cancel"
        primaryLabel="Mark Done"
        primaryTone="success"
        onPrimary={handleMarkDone} />

      <TPConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Service"
        warning={`This permanently removes ${service.treatment} from the plan. This action cannot be undone.`}
        secondaryLabel="Cancel"
        primaryLabel="Delete"
        primaryTone="destructive"
        onPrimary={() => {
          dispatch({
            type: "REMOVE_SERVICE",
            serviceId: service.id
          });
          setDeleteOpen(false);
        }} />

      <TPConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) closeCancelDialog();
        }}
        title="Cancel Appointment"
        warning={
        cancelTarget ?
        `Cancelling ${cancelTarget.doctor}'s appointment on ${cancelTarget.date} at ${cancelTarget.time}. Record a reason so it stays visible in the visit history.` :
        ""}

        secondaryLabel="Keep appointment"
        primaryLabel="Cancel appointment"
        primaryTone="destructive"
        primaryDisabled={!cancelReason.trim()}
        onPrimary={confirmCancelAppointment}>

        <div className="flex flex-col gap-[8px]">
          <label className="block font-['Inter',sans-serif] text-[12px] font-semibold text-tp-slate-700">
            Reason for cancellation
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Patient requested to reschedule due to travel"
            rows={3}
            className={styles.cancelTextarea} />


          <div className="flex flex-wrap gap-[6px]">
            {[
            "Patient travel",
            "Doctor unavailable",
            "Patient no-show",
            "Rescheduled"].
            map((quick) =>
            <button
              type="button"
              onClick={() => setCancelReason(quick)}
              className={styles.quickReasonBtn}>

                {quick}
              </button>
            )}
          </div>
        </div>
      </TPConfirmDialog>
    </div>);

}

// ─── Plan Cluster Card ─────────────────────────────────────
function PlanClusterCard({ plan, collapsed = false, onToggleCollapse }) {
  const { dispatch, openDrawer, patientId } = usePlanContext();
  const [markAllOpen, setMarkAllOpen] = useState(false);
  const [revertAllOpen, setRevertAllOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  // Accordion — first service open by default, one at a time.
  const [openServiceIndex, setOpenServiceIndex] = useState(0);
  const services = plan.services;
  const total = computePlanTotal(plan.services);
  const additionalDiscount = plan.additionalDiscount ?? 0;
  const finalTotal = Math.max(0, total - additionalDiscount);
  return (
    <div
      className={cx(styles.planClusterCard, dui.planClusterShell)}>

      <div
        className={cx(styles.planClusterHeader, dui.planClusterHeaderActive)}>

        <div className={styles.planHeaderLeft}>
          <div className={styles.planIconWrapper}>
            <Timer1 size={22} variant="Bulk" className={styles.warningIcon} />
          </div>
          <div>
            <h4 className={styles.planName}>
              {plan.name}
            </h4>
            <div className={styles.planMetaRow}>
              {additionalDiscount > 0 ?
              <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild={true}>
                    <span className={styles.planTotalBadge}>
                      {formatINR(finalTotal)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                  side="bottom"
                  sideOffset={6}
                  className={styles.serviceActionTooltip}>

                    <div className={styles.planTotalTooltipBody}>
                      <p className={styles.planTotalTooltipMuted}>
                        Subtotal: {formatINR(total)}
                      </p>
                      <p className={styles.planTotalTooltipSuccess}>
                        Discount: −{formatINR(additionalDiscount)}
                      </p>
                      <p className={styles.planTotalTooltipStrong}>
                        Final: {formatINR(finalTotal)}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip> :

              <span className={styles.planTotalBadge}>
                  {formatINR(finalTotal)}
                </span>}

            </div>
          </div>
        </div>
        <div className={styles.planHeaderActions}>
          <button
            type="button"
            onClick={() => setMarkAllOpen(true)}
            className={styles.markAllDoneBtn}>

            <TickCircle size={20} variant="Linear" />
            Mark All Done
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild={true}>
              <button
                type="button"
                className={styles.planMoreActionsBtn}>

                <MoreVertical
                  size={20}
                  color="var(--tp-slate-500)"
                  strokeWidth={2} />

              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={dropdownContentClass}>
              <DropdownMenuItem
                onClick={() =>
                openDrawer({
                  type: "bill-preview",
                  planId: plan.id
                })}

                className={dropdownItemClass}>

                <Receipt1 size={16} variant="Linear" className="" />
                View Plan Bill
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setRevertAllOpen(true)}
                className={styles.warningMenuItem}>

                <ArrowRotateLeft
                  size={16}
                  variant="Linear"
                  className={styles.warningText} />


                <span className={styles.warningText}>Revert All to Plan</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeletePlanOpen(true)}
                className={styles.deleteServiceMenuItem}>

                <Trash
                  size={16}
                  variant="Linear"
                  className={styles.errorIcon} />


                <span className={styles.deletePlanText}>
                  Delete Plan
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => onToggleCollapse?.()}
            aria-label={collapsed ? "Expand plan" : "Collapse plan"}
            className={styles.planCollapseButton}>

            <ChevronDown
              size={18}
              strokeWidth={2}
              className={`${styles.collapseIcon} ${collapsed ? styles.collapsed : ""}`} />

          </button>
        </div>
      </div>
      {!collapsed &&
      <div
        className={cx(styles.planClusterBody, dui.planClusterInnerSurface)}>

          {services.map((svc, idx) =>
        <ServiceSubCard
          service={svc}
          plan={plan}
          index={idx}
          isOpen={openServiceIndex === idx}
          onToggle={() =>
          setOpenServiceIndex((current) => current === idx ? -1 : idx)} />


        )}
        </div>}


      <TPConfirmDialog
        open={markAllOpen}
        onOpenChange={setMarkAllOpen}
        title="Mark All Services as Completed"
        warning={`This marks all ${services.length} service${services.length === 1 ? "" : "s"} in ${plan.name} as completed and moves this plan to Completed Plans.`}
        secondaryLabel="Cancel"
        primaryLabel="Mark All Done"
        primaryTone="success"
        onPrimary={() => {
          dispatch({
            type: "MARK_PLAN_COMPLETED",
            planId: plan.id
          });
          setMarkAllOpen(false);
        }} />


      <TPConfirmDialog
        open={revertAllOpen}
        onOpenChange={setRevertAllOpen}
        title="Revert Plan to Estimates"
        warning={`Reverts ${plan.name} back to estimates. Appointments, consultations, recorded visits and procedures on this plan will be cleared.`}
        secondaryLabel="Cancel"
        primaryLabel="Revert to Estimates"
        primaryTone="warning"
        onPrimary={() => {
          dispatch({
            type: "REVERT_PLAN_TO_ESTIMATES",
            planId: plan.id
          });
          setRevertAllOpen(false);
        }} />


      <TPConfirmDialog
        open={deletePlanOpen}
        onOpenChange={setDeletePlanOpen}
        title="Delete Plan"
        warning={`This will permanently delete "${plan.name}" and all its ${services.length} service${services.length === 1 ? "" : "s"}, appointments, and visit records. This action cannot be undone.`}
        secondaryLabel="Cancel"
        primaryLabel="Delete Plan"
        primaryTone="destructive"
        onPrimary={() => {
          dispatch({
            type: "DELETE_PLAN",
            planId: plan.id
          });
          setDeletePlanOpen(false);
        }} />

    </div>);

}

// ─── Tab Content ────────────────────────────────────────────
export function InProgressTab() {
  const { inProgressPlans } = usePlanContext();
  // Track collapsed state per plan. Default: all expanded. Users can collapse
  // individual plans when several are active to keep the page navigable.
  const [collapsedPlanIds, setCollapsedPlanIds] = useState(() => new Set());
  const toggleCollapse = useCallback((planId) => {
    setCollapsedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);else
      next.add(planId);
      return next;
    });
  }, []);
  if (inProgressPlans.length === 0) {
    return (
      <SectionFrame>
        <div
          className={`${styles.emptyPlansShell} ${dui.planClusterShell}`}>

          <div
            className={cx(styles.emptyPlanHeader, dui.planClusterHeaderActive)}>

            <div className={styles.planHeaderLeft}>
              <div className={styles.planIconWrapperLarge}>
                <Timer1
                  size={24}
                  variant="Bulk"
                  className={styles.warningIcon} />

              </div>
              <h3 className={styles.activePlansTitle}>
                Active Plans
              </h3>
            </div>
          </div>
          <div
            className={`${styles.emptyPlansBody} ${dui.planClusterInnerSurface}`}>

            <EmptyState
              icon={<PlanEmptyIcon size={120} />}
              title="No active plans yet"
              description="Activate a plan from Plan Estimates to see services here." />

          </div>
        </div>
      </SectionFrame>);

  }
  return (
    <SectionFrame>
      <div className={styles.inProgressTabScroll}>
        <div className={styles.inProgressTabList}>
          {inProgressPlans.map((plan) =>
          <PlanClusterCard
            plan={plan}
            collapsed={collapsedPlanIds.has(plan.id)}
            onToggleCollapse={() => toggleCollapse(plan.id)} />

          )}
        </div>
      </div>
    </SectionFrame>);

}