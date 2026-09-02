import moment from "moment";
import { TAB_IDS } from "./appointmentsConfig";

/**
 * Export the appointments currently on screen as an iCalendar file, so a
 * doctor can drop their schedule into Google Calendar, Outlook or Apple
 * Calendar. Whatever the tab, date and filters have narrowed to is exactly
 * what gets written: the caller passes the rows it is already rendering.
 */

const pad = (n) => String(n).padStart(2, "0");

// Local ("floating") time, deliberately: a clinic's 11:15 is 11:15 wherever
// the calendar is later opened, and no VTIMEZONE block is needed.
const localStamp = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

const utcStamp = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes()
  )}${pad(d.getUTCSeconds())}Z`;

// RFC 5545 §3.3.11: backslash, semicolon, comma and newlines are special.
const esc = (s) =>
  String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// §3.1: content lines are folded at 75 octets, continuations start with a space.
const fold = (line) => {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
};

const STATUS_LINE = {
  [TAB_IDS.CANCELLED]: "CANCELLED",
  [TAB_IDS.QUEUE]: "CONFIRMED",
  [TAB_IDS.CLINIC_APPOINTMENT]: "CONFIRMED",
  [TAB_IDS.FINISHED]: "CONFIRMED",
  [TAB_IDS.DRAFT]: "TENTATIVE",
};

/**
 * What may leave the portal on a calendar event, agreed with the practice:
 * name, patient ID, age/sex, visit type and category — enough to recognise
 * the patient and prepare for the visit. Billing is an admin fact with no
 * bearing on the consultation, so it stays out too.
 *
 * Contact details never leave. A calendar entry replicates to third-party
 * consumer accounts and phones the practice does not control, so the mobile
 * number, email, address and free-text remarks stay in the portal.
 *
 * Shared by the .ics export, the Google sync and the subscription feed so
 * the rule is stated once.
 */
export function shareableDetails(row) {
  return [
    row.mrn && `Patient ID: ${row.mrn}`,
    row.genderAge && `Age/Sex: ${row.genderAge}`,
    row.visitType && row.visitType !== "--" && `Visit: ${row.visitType}`,
    row.specialty && `Category: ${row.specialty}`,
  ].filter(Boolean);
}

function eventLines(row, index) {
  if (!row.dateISO || row.slotHour == null) return null;
  const start = new Date(row.dateISO);
  start.setHours(row.slotHour, row.slotMinute || 0, 0, 0);
  const end = new Date(start.getTime() + (row.durationMin || 15) * 60000);

  const details = shareableDetails(row);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${esc(row.id || index)}-tatvapractice@tatvacare.in`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${localStamp(start)}`,
    `DTEND:${localStamp(end)}`,
    `SUMMARY:${esc(row.name)}${row.visitType && row.visitType !== "--" ? esc(` (${row.visitType})`) : ""}`,
  ];
  if (details.length) lines.push(`DESCRIPTION:${esc(details.join("\n"))}`);
  if (row.hasVideo) lines.push("LOCATION:Teleconsultation");
  const status = STATUS_LINE[row.status];
  if (status) lines.push(`STATUS:${status}`);
  lines.push("END:VEVENT");
  return lines;
}

export function buildIcs(rows, calendarName = "Appointments") {
  const body = (rows || []).flatMap((row, i) => eventLines(row, i) || []);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TatvaCare//TatvaPractice//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calendarName)}`,
    ...body,
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");
}

/** Count of rows that can actually become events (a date and a time). */
export const exportableCount = (rows) =>
  (rows || []).filter((r) => r.dateISO && r.slotHour != null).length;

/**
 * Names the file the way a person would: "TatvaPractice Queue (12 Aug 2026)".
 * Readable in a downloads folder and sorts sensibly next to its siblings.
 */
export function downloadIcs(rows, { label = "TatvaPractice", anchor = new Date() } = {}) {
  const name = `${label} (${moment(anchor).format("DD MMM YYYY")}).ics`;
  const blob = new Blob([buildIcs(rows, "TatvaPractice Appointments")], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so Safari has finished handing the blob off.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return name;
}
