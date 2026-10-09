import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import moment from "moment";
import {
  Button,
  TableActions,
  Toggle,
  Tooltip,
  TPIcon,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";

import { ASSETS } from "../../../assets";
import useDoctorSlots from "../data/useDoctorSlots";
import useReceptionistDoctorSlots from "../../receptionist-appointment-listing/data/useReceptionistDoctorSlots";
import { STATUS_META, statusMeta, visitMeta, shortGenderAge, CONDITION_COLORS } from "../data/appointmentStates";
import { TAB_IDS, MONTH_CALENDAR_SIZE } from "../data/appointmentsConfig";
import { rowPrimaryAction, RowKebabMenu } from "./rowActions";
import { ReceptionistRowKebabMenu, receptionistRowPrimaryAction } from "../../receptionist-appointment-listing/components/receptionistRowActions";
import QueueRxSplitButton from "./QueueRxSplitButton";
import AppointmentEventCard from "./AppointmentEventCard";
import BillingTag, { StatusTag } from "./BillingTag";
import { useListingAccess } from "../data/useListingAccess";
import { readPreference, writePreference } from "../data/viewPreferences";
import styles from "./AppointmentCalendarView.module.css";

/* Google-Calendar-style grid: 24h day starting at midnight, 12-hour labels,
   a now-line on today, availability from the listSlots API rendered as
   bookable blocks, and booked appointments as event cards with the same
   per-tab actions as the table. */

// Vertical scale is zoomable (trackpad ctrl+wheel / iPad pinch), Google
// Calendar style, on the day/week time grids only. Default is roomy enough
// that a 15-minute slot is a comfortable tap target.
// Fully expanded by default (max zoom); pinch out to compress. The floor
// keeps four 15-min slots per hour readable (96px/h → 24px each).
const HOUR_PX_MIN = 96;
const HOUR_PX_MAX = 280;
/* Open at a denser default so more of the day is legible in one view without a
   pinch: at the old max (280px/hour) barely four hours fit, which reads as an
   empty screen on a tablet or a laptop. 180px keeps a 15-minute slot at a
   comfortable 45px tap target while showing ~50% more of the day; zoom still
   reaches 280 for anyone who wants the room. */
const HOUR_PX_DEFAULT = 180;
/* Dragging pulls the grid in so more of the day is reachable without a long
   scroll, but only a little: dropping straight to HOUR_PX_MIN shrank an hour
   to a third of its size mid-gesture, and aiming a 15-minute slot that is
   suddenly 24px tall while the card is already moving is guesswork. This
   keeps a 15-minute slot at 45px, which is still a comfortable target. */
const HOUR_PX_DRAG = 180;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
/* The four states a card can actually be drawn in, in the order a visit moves
   through them. Pending digitisation borrows Finished's colour, so listing it
   would put the same swatch on the strip twice. */
const BASE_LEGEND = [TAB_IDS.QUEUE, TAB_IDS.FINISHED, TAB_IDS.CANCELLED, TAB_IDS.DRAFT];
/* Placeholder bars for a column whose availability is still loading. Sized
   like a typical consulting day (7 AM – 9 PM in half-hour blocks) so the
   shimmer occupies roughly the space the real slots will. */
const SLOT_SKELETON = Array.from({ length: 28 }, (_, i) => ({ top: 7 * 60 + i * 30, height: 30 }));
// Pinned date-head row height. Fixed rather than measured because it also
// offsets every scroll calculation below: the head is sticky, so it covers
// the first GRID_HEAD_PX of the grid body at any scroll position.
const GRID_HEAD_PX = 56;
// Month "+N more" math: a chip is 18px + the 4px cell gap; the cell's fixed
// chrome is the 24px date pill + 12px padding + the 18px "+N more" line. Module
// scope so the fit calc has stable identity across renders.
const MONTH_CHIP_H = 22;
const MONTH_CELL_CHROME = 24 + 12 + 18;

function initialCalendarMode() {
  const saved = readPreference("calendarMode", "day");
  return saved === "week" || saved === "month" ? saved : "day";
}


const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const iso = (d) => moment(d).format("YYYY-MM-DD");
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
// Week starts on Monday (getDay: Sun=0).
const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const hourLabel = (h) => moment({ hour: h }).format("h A");

// Side-by-side layout for overlapping events (Google style): events in the
// same time cluster split the column into equal sub-columns instead of
// stacking on top of each other.
function layoutOverlaps(items) {
  const laid = [...items].sort((a, b) => a.startMin - b.startMin || b.durationMin - a.durationMin);
  const clusters = [];
  let cur = [];
  let curEnd = -1;
  for (const e of laid) {
    if (cur.length && e.startMin >= curEnd) {
      clusters.push(cur);
      cur = [];
      curEnd = -1;
    }
    cur.push(e);
    curEnd = Math.max(curEnd, e.startMin + e.durationMin);
  }
  if (cur.length) clusters.push(cur);
  clusters.forEach((cluster, ci) => {
    const colEnds = [];
    for (const e of cluster) {
      let c = colEnds.findIndex((end) => end <= e.startMin);
      if (c === -1) {
        c = colEnds.length;
        colEnds.push(0);
      }
      colEnds[c] = e.startMin + e.durationMin;
      e.col = c;
    }
    const from = Math.min(...cluster.map((e) => e.startMin));
    const to = Math.max(...cluster.map((e) => e.startMin + e.durationMin));
    for (const e of cluster) {
      e.cols = colEnds.length;
      e.cluster = ci;
      e.clusterFrom = from;
      e.clusterTo = to;
      e.clusterSize = cluster.length;
    }
  });
  return laid;
}

function bookingSpan(row, slots) {
  const startMin = row.slotHour * 60 + row.slotMinute;
  const matching = row.hasVideo
    ? slots.find((s) => s.startMin === startMin && s.bookMode === "teleconsult") ||
      slots.find((s) => s.startMin === startMin)
    : slots.find((s) => s.startMin === startMin && s.bookMode === "in-clinic") ||
      slots.find((s) => s.startMin === startMin);
  return {
    startMin,
    endMin: startMin + (matching?.increment || matching?.durationMin || 15),
    hasVideo: !!row.hasVideo,
  };
}

function sameModeBookingCovers(chip, bookedSpans) {
  const isTele = chip.bookMode === "teleconsult";
  const chipEnd = chip.startMin + chip.durationMin;
  return bookedSpans.some((b) => {
    if (b.hasVideo !== isTele) return false;
    return b.startMin < chipEnd && chip.startMin < b.endMin;
  });
}

/**
 * Free-slot chips from the dual clinic + tele lists in slotsByDate.
 * Each API row is already a chip (`bookMode`). Overlapping bands share the
 * column; in-clinic is always pinned left, tele right — even when the other
 * mode is a booked card, not a free chip (otherwise the leftover chip sits
 * full-width under that card and looks missing).
 */
function prepareFreeSlotChips(slots, slotFilter, bookedRows = []) {
  const slotList = slots || [];
  const bookedSpans = (bookedRows || [])
    .filter((row) => row && row.slotHour != null)
    .map((row) => bookingSpan(row, slotList));
  const dualGrid =
    slotList.some((s) => s?.bookMode === "teleconsult") &&
    slotList.some((s) => s && s.bookMode !== "teleconsult");

  const items = [];
  slotList.forEach((slot) => {
    if (!slot || slot.startMin == null) return;

    const bookMode = slot.bookMode === "teleconsult" ? "teleconsult" : "in-clinic";
    const durationMin = Math.max(
      1,
      (slot.endMin != null ? slot.endMin : slot.startMin + (slot.increment || 5)) - slot.startMin
    );
    const chip = { bookMode, startMin: slot.startMin, durationMin };
    /* Hide a chip only when this same grid is booked. A clinic booking
       must not eat the tele chip (and the reverse already worked). */
    if (sameModeBookingCovers(chip, bookedSpans)) return;

    const bookable =
      (slot.status === "available" || slot.status === "confirmed") && !slot.isPast;

    if (slotFilter) {
      if (!bookable) return;
      if (slotFilter === "video" && bookMode !== "teleconsult") return;
      if (slotFilter === "in-clinic" && bookMode !== "in-clinic") return;
    }

    items.push({
      ...slot,
      bookMode,
      bookable,
      blocked: slot.status === "unavailable" || slot.status === "leave",
      chipKey: slot.chipId || `${bookMode}-${slot.start}`,
      durationMin,
    });
  });

  /* Pack clinic before tele so the greedy column assigner lands clinic in
     col 0 (left) and tele in col 1+ (right). */
  const laid = layoutOverlaps(
    [...items].sort(
      (a, b) =>
        a.startMin - b.startMin ||
        (a.bookMode === "teleconsult" ? 1 : 0) - (b.bookMode === "teleconsult" ? 1 : 0) ||
        b.durationMin - a.durationMin
    )
  );

  if (dualGrid) {
    laid.forEach((e) => {
      e.col = e.bookMode === "teleconsult" ? 1 : 0;
      e.cols = 2;
    });
    return laid;
  }

  const byCluster = new Map();
  laid.forEach((e) => {
    if (!byCluster.has(e.cluster)) byCluster.set(e.cluster, []);
    byCluster.get(e.cluster).push(e);
  });
  byCluster.forEach((group) => {
    const hasClinic = group.some((e) => e.bookMode !== "teleconsult");
    const hasTele = group.some((e) => e.bookMode === "teleconsult");
    if (!hasClinic || !hasTele) return;
    group.forEach((e) => {
      e.col = e.bookMode === "teleconsult" ? 1 : 0;
      e.cols = 2;
    });
  });

  return laid;
}

/* Week columns are roughly a seventh of the grid. Splitting an overlapping
   run across side-by-side columns there leaves each card 30-odd pixels wide,
   which is not a card, it is a sliver. So Week stacks them instead: full
   width, one compact line each, and a "+N" chip into Day view when the run
   is deeper than the band can hold. Month already works this way; this is
   the same idea applied to the time grid. */
const WEEK_CHIP_H = 26;
const WEEK_CHIP_GAP = 2;

function stackForWeek(laid, minPx) {
  const byCluster = new Map();
  laid.forEach((e) => {
    if (!byCluster.has(e.cluster)) byCluster.set(e.cluster, []);
    byCluster.get(e.cluster).push(e);
  });
  const cards = [];
  const overflows = [];
  byCluster.forEach((items) => {
    const bandTop = items[0].clusterFrom * minPx;
    const bandHeight = (items[0].clusterTo - items[0].clusterFrom) * minPx;
    const slotFor = WEEK_CHIP_H + WEEK_CHIP_GAP;
    const capacity = Math.max(1, Math.floor((bandHeight + WEEK_CHIP_GAP) / slotFor));
    // Everything fits, or all but the last row does and that row becomes "+N".
    const shown = items.length <= capacity ? items.length : Math.max(1, capacity - 1);
    items.slice(0, shown).forEach((e, i) => {
      cards.push({ ...e, col: 0, cols: 1, top: bandTop + i * slotFor, height: WEEK_CHIP_H });
    });
    if (items.length > shown) {
      overflows.push({
        key: `ovf-${items[0].cluster}`,
        top: bandTop + shown * slotFor,
        height: WEEK_CHIP_H,
        count: items.length - shown,
        rows: items.slice(shown).map((e) => e.row),
      });
    }
  });
  return { cards, overflows };
}

const weekdayShort = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });
// Time-axis caption in the header's corner cell, e.g. "GMT+05:30".
const tzLabel = `GMT${moment().format("Z")}`;

/* Mini date popover for the header pill: month grid, today shortcut. The DS
   DatePicker's single mode never commits in the installed build (no Apply
   button rendered, outside-click doesn't emit), so this stays first-party. */
export function MiniDatePopover({ anchor, onPick, onClose, maxDate = null }) {
  const [view, setView] = useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const cells = useMemo(() => {
    const gridStart = startOfWeek(view);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [view]);
  const todayISO = iso(new Date());
  const anchorISO = iso(anchor);
  return (
    <>
      <div className={styles.miniLayer} onClick={onClose} />
      <div className={styles.miniPop}>
        <div className={styles.miniHead}>
          <button
            type="button"
            className={styles.miniNavBtn}
            aria-label="Previous month"
            onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
          >
            <TPIcon name="chevron-left" size={14} />
          </button>
          <span className={styles.miniTitle}>{moment(view).format("MMMM YYYY")}</span>
          <button
            type="button"
            className={styles.miniNavBtn}
            aria-label="Next month"
            onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
          >
            <TPIcon name="chevron-right" size={14} />
          </button>
        </div>
        <div className={styles.miniWeekRow}>
          {cells.slice(0, 7).map((d) => (
            <span key={iso(d)}>{moment(d).format("dd")[0]}</span>
          ))}
        </div>
        <div className={styles.miniGrid}>
          {cells.map((d) => {
            const beyondMax = maxDate && startOfDay(d) > startOfDay(maxDate);
            return (
              <button
                key={iso(d)}
                type="button"
                className={styles.miniDay}
                data-outside={d.getMonth() !== view.getMonth() || undefined}
                data-today={iso(d) === todayISO || undefined}
                data-selected={iso(d) === anchorISO || undefined}
                data-disabled={beyondMax || undefined}
                disabled={beyondMax}
                onClick={() => !beyondMax && onPick(d)}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        <button type="button" className={styles.miniToday} onClick={() => onPick(new Date())}>
          Go to today
        </button>
      </div>
    </>
  );
}

/**
 * The card's tooltip: opens on hover, pins on click. It sits directly above or
 * below the card depending on which side it fits, measured after mount rather
 * than estimated, and carries the CTA that small cards can't show inline.
 */
function EventPopover({ anchorRect, row, tabId, onRowAction, onClose, pinned, onMouseEnter, onMouseLeave, receptionistMode = false }) {
  // Act on this appointment's own status inside the merged "All" view.
  const cardTab = row.status || tabId;
  const access = useListingAccess();
  const { showBilling: showBillingDoctor } = access;
  const showBilling = receptionistMode ? false : showBillingDoctor;
  const act = (id, r) => {
    onRowAction?.(id, r);
    /* Keep the popover mounted through the current pointer-down so a
       medical-records file-input click is not cancelled by this unmount. */
    if (id === "upload-records" || id === "upload-records-pick") {
      queueMicrotask(onClose);
      return;
    }
    onClose();
  };
  const primary = receptionistMode
    ? receptionistRowPrimaryAction()
    : rowPrimaryAction(cardTab, row, act, access);
  const canShowAbha = Boolean(
    (row.abhaAddress || row.raw?.abhaAddress) && access.hipId && access.abhaEnable
  );
  const conditionId = row.patientConditionId || row.raw?.patient_condition_id;
  const condition = CONDITION_COLORS[conditionId];
  const width = 320;
  const popRef = useRef(null);
  // Placed after the first paint, once the real height is known; until then
  // it renders hidden so the flip never flashes.
  const [placement, setPlacement] = useState(null);
  useLayoutEffect(() => {
    const h = popRef.current?.offsetHeight || 0;
    const gap = 10;
    const fitsBelow = anchorRect.bottom + gap + h <= window.innerHeight - 8;
    const fitsAbove = anchorRect.top - gap - h >= 8;
    const side = fitsBelow || !fitsAbove ? "below" : "above";
    const top =
      side === "below"
        ? Math.min(anchorRect.bottom + gap, window.innerHeight - h - 8)
        : Math.max(8, anchorRect.top - gap - h);
    /* Anchored to the card's leading edge, not its centre: an event card can
       be a full column wide, and a tooltip centred on that reads as pointing
       at empty space rather than at the appointment. */
    const caretX = anchorRect.left + Math.min(anchorRect.width / 2, 44);
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, caretX - 44));
    const caret = Math.max(16, Math.min(width - 16, caretX - left));
    setPlacement({ top, left, side, caret });
  }, [anchorRect]);

  const status = statusMeta(cardTab);
  const visit = visitMeta(row.visitType);
  /* Join only for an upcoming teleconsult. Cancelled/finished still carry
     hasVideo on the record, but joining is no longer a valid action — and
     rendering Join alone used to force the actions footer open, which then
     drew a second kebab next to the head one (cancelled has no primary). */
  const showJoin = !receptionistMode && row.hasVideo && cardTab === TAB_IDS.QUEUE;
  const showActionsFooter = !!(primary || showJoin);
  /* Two boxes on purpose: the outer one positions and carries the caret,
     the inner one clips its children to the 12px radius. A single box can't
     do both, because clipping would eat the caret. */
  const card = (
    <div
      ref={popRef}
      className={styles.popoverWrap}
      style={{ top: placement?.top ?? -9999, left: placement?.left ?? -9999, width, visibility: placement ? "visible" : "hidden" }}
      data-side={placement?.side}
      role="tooltip"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className={styles.popoverCaret} style={{ left: placement?.caret ?? 0 }} aria-hidden="true" />
      <div className={styles.popover}>
      {/* Who, then where they stand, then the appointment's facts as a
          label/value list, then the one action. */}
      <div className={styles.popoverHead}>
        <div className={styles.popoverHeadText}>
          <p className={styles.popoverName}>
            {row.name}
            {canShowAbha && (
              <Tooltip content="ABHA" side="top">
                <span className={styles.popoverNameGlyph}>
                  <img src={ASSETS.images.abhaSvg} alt="ABHA" width={16} height={16} />
                </span>
              </Tooltip>
            )}
            {row.symptomsGathered && (
              <Tooltip content="Symptoms collected before the visit" side="top">
                <span className={styles.popoverNameGlyph}>
                  <img src={ASSETS.images.symptomsGreen} alt="" width={16} height={16} />
                </span>
              </Tooltip>
            )}
            {/* The consultation mode is stated on its own row below (In-clinic /
                Teleconsultation), so it no longer rides beside the name too. */}
          </p>
          {/* Sex/age abbreviated so the patient ID keeps its room; the pair
              stays on one line and truncates rather than wrapping. */}
          {(row.genderAge || row.mrn) && (
            <p className={styles.popoverMeta}>
              {row.genderAge && shortGenderAge(row.genderAge)}
              {condition && (
                <Tooltip content={condition.name} side="top">
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: condition.color,
                      marginLeft: 3,
                      verticalAlign: "middle",
                      flexShrink: 0,
                    }}
                  />
                </Tooltip>
              )}
              {row.genderAge && row.mrn && <span className={styles.popoverSep}>|</span>}
              {row.mrn}
            </p>
          )}
        </div>
        {/* Cancelled (and any other no-CTA) rows put the kebab here; when the
            footer is open the kebab lives there instead — never both. */}
        {!showActionsFooter &&
          (receptionistMode ? (
            <ReceptionistRowKebabMenu tabId={cardTab} row={row} onRowAction={act} />
          ) : (
            <RowKebabMenu tabId={cardTab} row={row} onRowAction={act} />
          ))}
      </div>

      {/* Icon-led rows: the glyph names the field, so no label column is
          needed and the values line up in one scannable column. */}
      <div className={styles.popoverBody}>
        <p className={styles.popoverRow}>
          <TPLibraryIcon name="clock" variant="bulk" size={18} color="var(--tesseract-slate-600)" />
          <span className={styles.popoverValue}>
            {row.slotTime}
            <span className={styles.popoverSep}>|</span>
            {row.slotDate}
          </span>
        </p>
        <p className={styles.popoverRow}>
          <TPLibraryIcon name={visit.icon} family={visit.family} variant="bulk" size={18} color="var(--tesseract-slate-600)" />
          <span className={styles.popoverValue}>
            {row.visitType}
            {row.specialty && (
              <>
                <span className={styles.popoverSep}>|</span>
                {row.specialty}
              </>
            )}
          </span>
        </p>
        {/* How the visit happens, stated the same way as everywhere else:
            hospital glyph for in-clinic, video for a teleconsult. */}
        <p className={styles.popoverRow}>
          <TPLibraryIcon
            name={row.hasVideo ? "video" : "hospital"}
            family={row.hasVideo ? "video-audio-image" : "building"}
            variant="bulk"
            size={18}
            color="var(--tesseract-slate-600)"
          />
          <span className={styles.popoverValue}>{row.hasVideo ? "Teleconsultation" : "In-clinic Consultation"}</span>
        </p>
        {row.contact && row.contact !== "--" && (
          <p className={styles.popoverRow}>
            <TPLibraryIcon name="call" variant="bulk" size={18} color="var(--tesseract-slate-600)" />
            <span className={styles.popoverValue}>{row.contact}</span>
          </p>
        )}
        {/* The tooltip is where a long remark finally gets to be read in
            full, so it wraps rather than truncating. */}
        {row.remark && (
          <p className={styles.popoverRow} data-remark>
            <TPLibraryIcon name="message-text" variant="bulk" size={18} color="var(--tesseract-slate-600)" />
            <span className={styles.popoverValue}>{row.remark}</span>
          </p>
        )}
      </div>

      {/* State reads last, once the appointment's facts have been taken in.
          Billing uses the same chip as the table so one fact keeps one look. */}
      <div className={styles.popoverTags}>
        {status && <StatusTag tone={status.badge}>{status.label}</StatusTag>}
        {showBilling && <BillingTag status={row.billStatus} />}
      </div>

      {/* CTA left, the rest of the actions right. */}
      {showActionsFooter && (
        <div className={styles.popoverActions}>
          <span className={styles.popoverActionsLead}>
            {!receptionistMode && primary && (
              cardTab === TAB_IDS.QUEUE || cardTab === TAB_IDS.REFERRAL ? (
                <QueueRxSplitButton row={row} onRowAction={act} tabId={cardTab} />
              ) : (
                <TableActions align="left" primary={primary} actions={[]} />
              )
            )}
            {showJoin && (
              <Button
                size="sm"
                variant="solid"
                theme="primary"
                leftIcon={<TPLibraryIcon name="video" variant="bulk" family="video-audio-image" size={16} />}
                onClick={() => act("join-video", row)}
              >
                Join
              </Button>
            )}
          </span>
          {receptionistMode ? (
            <ReceptionistRowKebabMenu tabId={cardTab} row={row} onRowAction={act} />
          ) : (
            <RowKebabMenu tabId={cardTab} row={row} onRowAction={act} />
          )}
        </div>
      )}
      </div>
    </div>
  );

  // Pinned (clicked) gets the click-away layer; the hover tooltip must leave
  // the grid underneath fully usable, so it portals on its own.
  return createPortal(
    pinned ? (
      <div className={styles.popoverLayer} onClick={onClose}>
        {card}
      </div>
    ) : (
      card
    ),
    document.body
  );
}

export default function AppointmentCalendarView({
  rows,
  dayTotals = {},
  tabId,
  onRowAction,
  onSlotPick,
  onEventDrop,
  rescheduleFor,
  onCancelReschedule,
  /* Puts the calendar into "pick a new slot" mode for a row. Touch's
     equivalent of picking the card up. */
  onStartMove,
  onRefresh,
  refreshing = false,
  /* Lets the toolbar picker mirror the window this grid is showing. */
  onWindowLabelChange = null,
  slotFilter = null, // "video" | "in-clinic" | null — hides non-matching slots
  allowFutureDates = true, // Queue only; other tabs clamp navigation at today
  dateRange = null, // shared toolbar date; drives (and receives) the anchor
  onAnchorChange = null, // publishes the anchor back to the toolbar picker
  onWindowChange = null, // publishes the span on screen so rows cover it
  onDateChange = null, // same setter the toolbar picker uses (null = clear)
  onSlotUnavailable = null, // toast when a past/blocked slot is clicked
  slotsVersion = 0,
  allowBook = true,
  // Zydus parity: calendar is read-only and should render appointments only
  // (no slot availability fetches + no Week/Month controls).
  modeOverride = null, // "day" | "week" | "month"
  onModeChange = null, // publishes internal mode changes so the toolbar toggle stays in sync
  disableAvailabilityLayer = false, // hides availability controls + stops slot API calls
  hideModeToggle = false,
  /** When set, slot fetches use receptionist auth for this doctor. */
  doctorId = null,
  receptionistMode = false,
}) {
  const { isChikitsalay, isQueueManagementEnabled } = useListingAccess();
  const legend = isChikitsalay
    ? [TAB_IDS.CLINIC_APPOINTMENT, ...BASE_LEGEND]
    : BASE_LEGEND;
  const [mode, setMode] = useState(initialCalendarMode);
  /* The availability layer is on by default, because a doctor opening the
     calendar to book needs to see where the gaps are. Turned off, the grid
     shows only what is actually booked, which is the view you want when you
     are reading the day rather than filling it. */
  const [freeSlots, setFreeSlots] = useState(
    () => readPreference("calendarFreeSlots", "on") === "on"
  );
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    if (!modeOverride) return;
    setMode(modeOverride);
  }, [modeOverride]);
  const [popup, setPopup] = useState(null); // {row, anchorRect, pinned}
  const [dragging, setDragging] = useState(null); // {id, x, y, offX, offY, width}
  /* Which free slot the pointer is currently over, as `dateISO|slot.start`.
     At the drag scale a slot is 45px tall and the ghost card covers most of
     it, so without this the doctor is aiming at a target they cannot see. */
  const [dropTarget, setDropTarget] = useState(null);
  /* With the layer switched off, the grid still answers "is there a slot
     here?" — but only where the pointer actually is. One block surfaces under
     the cursor and follows it; the rest of the day stays clear, which is the
     whole reason for turning the layer off. Keyed `dateISO|start`. */
  const [hoverSlotKey, setHoverSlotKey] = useState(null);
  const hoverRafRef = useRef(0);

  /* Everything shows while the layer is on, and while a card is being
     dragged: you cannot aim at slots you cannot see. */
  const showAllSlots = freeSlots || !!dragging;
  // Day-column width, measured so cards can decide what they have room for.
  const [colWidth, setColWidth] = useState(0);
  const hoverTimer = useRef(null);
  const closeTimer = useRef(null);
  const dragRef = useRef(null);

  const suppressClickRef = useRef(false);
  const autoScrollRef = useRef(0);
  const TAB_QUEUE_ID = "queue";

  /* Nothing in flight survives an unmount: a pending long press would arm a
     card that no longer exists, a pending frame would set state on it. */
  useEffect(
    () => () => {
      cancelAnimationFrame(hoverRafRef.current);
    },
    []
  );

  // Edge auto-scroll while dragging (Google-style): pointer near the top or
  // bottom of the scroller keeps the grid moving.
  const setAutoScroll = (velocity) => {
    cancelAnimationFrame(autoScrollRef.current);
    autoScrollRef.current = 0;
    if (!velocity) return;
    const step = () => {
      const el = scrollRef.current;
      if (el) el.scrollTop += velocity;
      autoScrollRef.current = requestAnimationFrame(step);
    };
    autoScrollRef.current = requestAnimationFrame(step);
  };

  // Google-style drag-to-reschedule (queue only): the card becomes a fixed
  // ghost under the pointer, the grid eases out so more of the day is within
  // reach, and on release it snaps to the free slot under the pointer, else
  // snaps back.
  const startDrag = (e, row) => {
    // Drag-reschedule applies to queue (upcoming) rows — including queue rows
    // shown inside the merged "All" view.
    if (!allowBook) return;
    if ((row.status || tabId) !== TAB_QUEUE_ID || e.button === 2) return;
    /* Pointer + touch both drag. Touch used to fall back to a "Move" button
       in the popover (which overlapped Join on video cards); that CTA is
       gone, so tablets use the same drag-to-slot gesture as laptops. A
       slightly larger move threshold on touch keeps day-scroll available
       until the finger clearly intends to drag the card. */
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      row,
      startX: e.clientX,
      startY: e.clientY,
      offX: e.clientX - rect.left,
      offY: e.clientY - rect.top,
      width: rect.width,
      moved: false,
      prevHourPx: hourPxRef.current,
      pointerType: e.pointerType || "mouse",
      threshold: e.pointerType === "touch" ? 12 : 6,
    };
    try {
      card.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic or already-released pointers can't be captured; the drag
      // still works through the bubbling pointer events.
    }
  };
  /* One resolver for both the live highlight and the drop, so what lights up
     under the pointer is by construction the slot the release will use. */
  const resolveDrop = (clientX, clientY) => {
    const col = document
      .elementsFromPoint(clientX, clientY)
      .map((el) => el.closest?.("[data-date]"))
      .find(Boolean);
    const dateISO = col?.getAttribute("data-date");
    if (!dateISO) return null;
    const rect = col.getBoundingClientRect();
    const minute = (clientY - rect.top) / (hourPxRef.current / 60);
    const slot = (slotsByDate[dateISO] || [])
      .filter(
        (s) => s.status === "available" && !s.isPast && s.startMin <= minute && minute < s.endMin
      )
      .sort((a, b) => (a.endMin - a.startMin) - (b.endMin - b.startMin))[0];
    return slot ? { dateISO, slot } : null;
  };

  /* The drop resolver only matches slots a card could land on. Hovering asks
     a wider question: "what is here?", and the honest answer includes time
     that is blocked or already gone. Same geometry, no status filter. */
  const resolveHover = (clientX, clientY) => {
    const col = document
      .elementsFromPoint(clientX, clientY)
      .map((el) => el.closest?.("[data-date]"))
      .find(Boolean);
    const dateISO = col?.getAttribute("data-date");
    if (!dateISO) return null;
    const rect = col.getBoundingClientRect();
    const minute = (clientY - rect.top) / (hourPxRef.current / 60);
    const slot = (slotsByDate[dateISO] || [])
      .filter((s) => s.status !== "confirmed" && s.startMin <= minute && minute < s.endMin)
      .sort((a, b) => (a.endMin - a.startMin) - (b.endMin - b.startMin))[0];
    return slot ? { dateISO, slot } : null;
  };

  const moveDrag = (e, row) => {
    const d = dragRef.current;
    if (!d || d.row.id !== row.id) return;
    const threshold = d.threshold ?? 6;
    if (!d.moved && Math.abs(e.clientX - d.startX) < threshold && Math.abs(e.clientY - d.startY) < threshold) {
      return;
    }
    if (!d.moved) {
      d.moved = true;
      /* Ease out, never in: a grid already tighter than the drag scale is
         left exactly where the doctor put it. */
      if (hourPxRef.current > HOUR_PX_DRAG) zoomTo(HOUR_PX_DRAG, e.clientY);
    }
    /* Once the card owns the gesture, stop the day from scrolling under the
       finger (tablet) so the drop target stays under the ghost. */
    if (e.cancelable) e.preventDefault();
    const hit = resolveDrop(e.clientX, e.clientY);
    setDropTarget(hit ? `${hit.dateISO}|${hit.slot.start}` : null);
    setDragging({
      id: row.id,
      x: e.clientX,
      y: e.clientY,
      offX: d.offX,
      offY: d.offY,
      width: d.width,
      /* The ghost says whether releasing here would do anything, so the
         answer is on the thing under the cursor rather than only on a slot
         the card may be covering. */
      over: hit ? hit.slot.label12 : null,
    });
    const el = scrollRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (e.clientY > rect.bottom - 56) setAutoScroll(Math.min(28, (e.clientY - (rect.bottom - 56)) / 2 + 6));
      else if (e.clientY < rect.top + 56) setAutoScroll(-Math.min(28, (rect.top + 56 - e.clientY) / 2 + 6));
      else setAutoScroll(0);
    }
  };
  const endDrag = (e, row) => {
    const d = dragRef.current;
    dragRef.current = null;
    setAutoScroll(0);
    setDropTarget(null);
    if (!d || !d.moved) {
      setDragging(null);
      return;
    }
    setDragging(null);
    // Resolve the drop target at the CURRENT (drag) scale, then restore.
    const hit = resolveDrop(e.clientX, e.clientY);
    zoomTo(d.prevHourPx || HOUR_PX_DEFAULT, e.clientY);
    onEventDrop?.(row, hit?.slot || null);
    // Swallow the click that follows pointerup so the popover doesn't open.
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };
  const cancelDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setAutoScroll(0);
    setDragging(null);
    setDropTarget(null);
    if (d?.moved) zoomTo(d.prevHourPx || HOUR_PX_DEFAULT);
  };
  const [nowTick, setNowTick] = useState(() => Date.now());
  // The chosen density sticks across reloads: a doctor who pinches to their
  // preferred zoom does not have to redo it every time the page loads.
  const [hourPx, setHourPx] = useState(() => {
    const saved = Number(readPreference("calendarHourPx", ""));
    return Number.isFinite(saved) && saved >= HOUR_PX_MIN && saved <= HOUR_PX_MAX
      ? saved
      : HOUR_PX_DEFAULT;
  });
  // Sticky-header depth cue: shadow only while grid content is scrolled
  // underneath (React bails out when the boolean doesn't change).
  const [scrolled, setScrolled] = useState(false);
  // Horizontal-scroll edges: days hidden off to the left (scrolled away from the
   // start) and off to the right (more to come). Each drives an edge fade so the
   // grid reads as scrollable, and the right one squares the card's top-right
   // corner. Two, not one, because the week auto-scrolls to today: on a late day
   // it opens scrolled to the right end, where the hidden days are to the LEFT.
  const [overflowStart, setOverflowStart] = useState(false);
  const [overflowEnd, setOverflowEnd] = useState(false);
  // Floating "Now" chip: appears only while today's now-line is scrolled out
  // of the viewport; direction tells which way it went.
  const [nowChip, setNowChip] = useState(null); // null | "up" | "down"
  // Visible band of the grid, in grid-body pixels. Feeds the per-day "+N"
  // overflow chips, so it only needs to change when the band actually moves.
  const [viewport, setViewport] = useState({ top: 0, height: 0 });
  const scrollRef = useRef(null);
  const gridBodyRef = useRef(null);
  const hourPxRef = useRef(HOUR_PX_DEFAULT);
  hourPxRef.current = hourPx;
  const minPx = hourPx / 60;

  // Zoom keeping the time under the pointer (or viewport centre) anchored.
  const zoomTo = (next, clientY) => {
    const el = scrollRef.current;
    const clamped = Math.max(HOUR_PX_MIN, Math.min(HOUR_PX_MAX, next));
    const prev = hourPxRef.current;
    // Remember the density. A drag temporarily zooms then restores, so this
    // lands on the pre-drag value either way — the doctor's real choice.
    writePreference("calendarHourPx", String(clamped));
    if (clamped === prev || !el) {
      setHourPx(clamped);
      return;
    }
    const rect = el.getBoundingClientRect();
    const offsetY = clientY != null ? clientY - rect.top : rect.height / 2;
    const ratio = clamped / prev;
    const target = (el.scrollTop + offsetY) * ratio - offsetY;
    setHourPx(clamped);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = target;
    });
  };

  /* Tooltip controller: hovering a card opens it after a beat, leaving closes
     it after a shorter one (so the pointer can cross the gap into the
     tooltip), and clicking pins it until dismissed. */
  const cancelTimers = () => {
    clearTimeout(hoverTimer.current);
    clearTimeout(closeTimer.current);
  };
  useEffect(() => cancelTimers, []);

  const hoverOpen = (row, el) => {
    if (dragRef.current) return;
    /* A touch screen synthesises a mouseenter on tap and never sends the
       matching leave, so the hover-opened popover would stay up until
       something else was tapped. On touch the popover is opened by the tap
       itself (pinned), which can be dismissed; hover-open is for pointers. */
    if (!window.matchMedia?.("(hover: hover)").matches) return;
    cancelTimers();
    const anchorRect = el.getBoundingClientRect();
    hoverTimer.current = setTimeout(
      () => setPopup((p) => (p?.pinned ? p : { row, anchorRect, pinned: false })),
      220
    );
  };
  const hoverClose = () => {
    clearTimeout(hoverTimer.current);
    closeTimer.current = setTimeout(() => setPopup((p) => (p?.pinned ? p : null)), 180);
  };
  const keepOpen = () => clearTimeout(closeTimer.current);
  const pinPopup = (row, el) => {
    cancelTimers();
    setPopup({ row, anchorRect: el.getBoundingClientRect(), pinned: true });
  };
  const closePopup = () => {
    cancelTimers();
    setPopup(null);
  };
  // Scrolling moves the card the tooltip points at, so follow it rather than
  // leaving a tooltip stranded; drop it once the card leaves the grid.
  const reanchorPopup = () => {
    setPopup((p) => {
      if (!p || p.pinned) return p;
      const el = gridBodyRef.current?.querySelector(`[data-event-id="${CSS.escape(String(p.row.id))}"]`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const grid = scrollRef.current?.getBoundingClientRect();
      if (grid && (rect.bottom < grid.top + GRID_HEAD_PX || rect.top > grid.bottom)) return null;
      return { ...p, anchorRect: rect };
    });
  };

  /* Keyboard shortcuts, matching the conventions Google Calendar and Outlook
     share: D/W/M switch view, T jumps to today, arrows step. Ignored while
     the user is typing somewhere. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (el?.closest?.("input, textarea, select, [contenteditable=true]")) return;
      const key = e.key.toLowerCase();
      if (key === "d") pickMode("day");
      else if (key === "w") pickMode("week");
      // Month shortcut ("m") disabled while Month mode is hidden.
      else if (key === "t") goToDate(new Date());
      else if (key === "arrowleft") step(-1);
      else if (key === "arrowright") step(1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers read current state via closure refresh below
  }, [mode, anchor, allowFutureDates]);

  // Trackpad pinch (wheel + ctrlKey) and iPad Safari pinch (gesture events).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || mode === "month") return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomTo(hourPxRef.current * (e.deltaY < 0 ? 1.08 : 0.92), e.clientY);
    };
    let gestureStartPx = null;
    const onGestureStart = (e) => {
      e.preventDefault();
      gestureStartPx = hourPxRef.current;
    };
    const onGestureChange = (e) => {
      e.preventDefault();
      if (gestureStartPx != null) zoomTo(gestureStartPx * e.scale, e.clientY);
    };
    /* `gesturestart`/`gesturechange` are WebKit-only, so iPad Safari pinches
       and Android tablets did nothing. Two-finger touch tracking covers every
       other engine with the same anchored-zoom behaviour. */
    let pinchStartDist = null;
    let pinchStartPx = null;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const midY = (t) => (t[0].clientY + t[1].clientY) / 2;
    const onTouchStart = (e) => {
      if (e.touches.length !== 2) return;
      pinchStartDist = dist(e.touches);
      pinchStartPx = hourPxRef.current;
    };
    const onTouchMove = (e) => {
      if (e.touches.length !== 2 || pinchStartDist == null) return;
      e.preventDefault();
      zoomTo(pinchStartPx * (dist(e.touches) / pinchStartDist), midY(e.touches));
    };
    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinchStartDist = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listeners read via refs
  }, [mode]);

  const days = useMemo(() => {
    if (mode === "day") return [anchor];
    if (mode === "week") {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    return [];
  }, [mode, anchor]);

  // A tooltip points at a card; changing the view or the date replaces the
  // cards underneath it, so it goes with them.
  useEffect(() => {
    cancelTimers();
    setPopup(null);
  }, [mode, anchor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Measure a day column so each card knows whether it has room for a CTA, a
  // kebab, or only its time and name.
  useEffect(() => {
    if (mode === "month") return undefined;
    let raf = 0;
    const recompute = () => {
      // Edge fades are pseudo-elements, so setting these does not relay out the
      // observed grid — read and set them synchronously (no rAF, which is paused
      // when the tab is unfocused and would leave the initial state unseeded).
      const sc = scrollRef.current;
      if (sc) {
        setOverflowStart(sc.scrollLeft > 1);
        setOverflowEnd(sc.scrollWidth - sc.clientWidth - sc.scrollLeft > 1);
      }
      // colWidth DOES drive layout, so defer it a frame to avoid the
      // "ResizeObserver loop completed with undelivered notifications" warning a
      // synchronous relayout-in-observer trips.
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const gb = gridBodyRef.current;
        if (gb) setColWidth(Math.max(0, (gb.getBoundingClientRect().width - 72) / Math.max(1, days.length)));
      });
    };
    // Refs are attached by the time useEffect runs, so set up synchronously and
    // watch BOTH: the grid body (per-day column width) and the scroller (the body
    // sits at its min-width and does not resize when the card narrows, so only the
    // scroller catches that). Seed once so a grid that opens already overflowing
    // shows its fade without waiting for a resize or a scroll.
    const gb = gridBodyRef.current;
    const sc = scrollRef.current;
    const ro = new ResizeObserver(recompute);
    if (gb) ro.observe(gb);
    if (sc) ro.observe(sc);
    recompute();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mode, days.length, hourPx, showAllSlots]);

  /* Availability for the visible day(s); the toggle only controls the
     highlight, clicks work either way.

     Month asks for it too, so an empty cell can say how much of that day is
     still open instead of showing nothing at all. It asks for less than the
     whole grid: the leading and trailing cells belong to other months, and a
     day already gone cannot be booked, so neither is worth a request. That
     takes a typical month from 42 days to roughly half, and the hook's cache
     makes a second visit free.

     Derived from `anchor` rather than from `monthCells`, which is computed
     further down — the availability hook has to run before the memos that
     read its output. */
  const slotDateISOs = useMemo(() => {
    if (disableAvailabilityLayer) return [];
    if (mode !== "month") return days.map(iso);
    /* Month only reads availability to draw the bars, so with the switch off
       there is nothing to draw and nothing worth fetching. */
    if (!freeSlots) return [];
    const todayStart = startOfDay(new Date());
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const out = [];
    for (let d = new Date(first); d.getMonth() === anchor.getMonth(); d = addDays(d, 1)) {
      if (startOfDay(d) >= todayStart) out.push(iso(d));
    }
    return out;
  }, [mode, days, anchor, freeSlots, disableAvailabilityLayer]);

  const doctorSlots = useDoctorSlots({
    dateISOs: slotDateISOs,
    version: slotsVersion,
    enabled: !doctorId,
    isQueueManagementEnabled,
  });
  const receptionistSlots = useReceptionistDoctorSlots({
    doctorId,
    dateISOs: slotDateISOs,
    version: slotsVersion,
    enabled: !!doctorId,
  });
  const { slotsByDate, pendingDates } = doctorId ? receptionistSlots : doctorSlots;

  /* How many chips a month cell can actually hold.

     It used to be a hardcoded three, so on a short viewport the third chip
     was clipped by the cell it did not fit in while "+N more" still counted
     it as shown. The number now falls out of the measured row height, which
     means a cell either shows a chip in full or counts it in the overflow.
     Never both. */
  const [monthRowH, setMonthRowH] = useState(0);
  const monthGridRef = useRef(null);
  useLayoutEffect(() => {
    if (mode !== "month") return undefined;
    let ro;
    /* The grid mounts on the same tick this effect runs, so the ref can still
       be empty; retry on the next frame rather than silently keeping the
       default. */
    const raf = requestAnimationFrame(() => {
      const el = monthGridRef.current;
      if (!el) return;
      const measure = () => {
        const cell = el.firstElementChild;
        if (cell) setMonthRowH(cell.getBoundingClientRect().height);
      };
      measure();
      // rAF so the height read + state set don't relay out the observed grid in
      // the same frame (the "ResizeObserver loop" dev-overlay warning).
      ro = new ResizeObserver(() => requestAnimationFrame(measure));
      ro.observe(el);
    });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [mode]);

  /* Three chips when the row can hold three, two when it cannot. Never one:
     a single line plus "+11 more" says almost nothing about the day, and the
     row floor in CSS guarantees room for two. */
  const monthChipCap = useMemo(() => {
    if (!monthRowH) return MONTH_CALENDAR_SIZE;
    return Math.max(2, Math.min(MONTH_CALENDAR_SIZE, Math.floor((monthRowH - MONTH_CELL_CHROME) / MONTH_CHIP_H)));
  }, [monthRowH]);

  const eventsByDay = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      if (!row.dateISO || row.slotHour == null) return;
      (map[row.dateISO] = map[row.dateISO] || []).push(row);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.slotHour * 60 + a.slotMinute - (b.slotHour * 60 + b.slotMinute))
    );
    return map;
  }, [rows]);

  // Geometry for every booked card, resolved once per day so the render and
  // the overflow chips agree on where each card sits.
  // When the day publishes both clinic and tele free grids, bookings sit in
  // the same lane as those chips (clinic left, tele right) instead of
  // spanning the full column over the other mode's slots.
  const laidByDay = useMemo(() => {
    const out = {};
    days.forEach((d) => {
      const dayISO = iso(d);
      const slots = slotsByDate[dayISO] || [];
      const dualLane =
        slots.some((s) => s.bookMode === "teleconsult") &&
        slots.some((s) => s.bookMode !== "teleconsult");

      const toEvent = (row) => {
        const startMin = row.slotHour * 60 + row.slotMinute;
        const matching = row.hasVideo
          ? slots.find((s) => s.startMin === startMin && s.bookMode === "teleconsult") ||
            slots.find((s) => s.startMin === startMin)
          : slots.find((s) => s.startMin === startMin && s.bookMode === "in-clinic") ||
            slots.find((s) => s.startMin === startMin);
        return {
          row,
          startMin,
          durationMin: matching?.increment || matching?.durationMin || 15,
        };
      };

      const events = (eventsByDay[dayISO] || []).map(toEvent);
      let laid;
      if (dualLane && mode !== "week") {
        const clinicLaid = layoutOverlaps(events.filter((e) => !e.row.hasVideo));
        const teleLaid = layoutOverlaps(events.filter((e) => e.row.hasVideo));
        clinicLaid.forEach((e) => {
          e.lane = 0;
          e.laneCols = 2;
        });
        teleLaid.forEach((e) => {
          e.lane = 1;
          e.laneCols = 2;
        });
        laid = [...clinicLaid, ...teleLaid];
      } else {
        laid = layoutOverlaps(events);
        laid.forEach((e) => {
          e.lane = 0;
          e.laneCols = 1;
        });
      }

      out[dayISO] =
        mode === "week"
          ? stackForWeek(laid, minPx)
          : {
              cards: laid.map((e) => ({
                ...e,
                top: e.startMin * minPx,
                height: Math.max(28, e.durationMin * minPx - 4),
              })),
              overflows: [],
            };
    });
    return out;
  }, [days, slotsByDate, eventsByDay, minPx, mode]);

  // Appointments scrolled out of the visible band, per day. The sticky head
  // covers the top GRID_HEAD_PX of the scroller, so the band is shorter than
  // the scroller itself.
  const hiddenByDay = useMemo(() => {
    const out = {};
    if (!viewport.height) return out;
    const top = viewport.top;
    const bottom = viewport.top + viewport.height - GRID_HEAD_PX;
    Object.entries(laidByDay).forEach(([dayISO, { cards: list }]) => {
      out[dayISO] = list.filter((e) => e.top + e.height <= top + 1 || e.top >= bottom - 1);
    });
    return out;
  }, [laidByDay, viewport]);

  const monthCells = useMemo(() => {
    if (mode !== "month") return [];
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [mode, anchor]);



  /* The toolbar picker names one day, but Week and Month draw many, and an
     appointment can only be drawn if it was fetched. The grid therefore tells
     the page how wide its window actually is, and the page queries that
     instead of the anchor day alone. */
  const windowStartISO = mode === "month" ? iso(monthCells[0] || anchor) : iso(days[0] || anchor);
  const windowEndISO =
    mode === "month" ? iso(monthCells[monthCells.length - 1] || anchor) : iso(days[days.length - 1] || anchor);
  useEffect(() => {
    onWindowChange?.({ start: windowStartISO, end: windowEndISO });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callback identity is not part of the window
  }, [windowStartISO, windowEndISO]);

  /* The toolbar picker and the calendar anchor are the same value seen from
     two places: the picker sets the anchor, and navigating here publishes it
     back. Both guards compare by day, so neither can drive the other in a
     loop. */
  useEffect(() => {
    // Cleared filter means "no date chosen", which for a calendar is today.
    if (!dateRange?.start) {
      const today = startOfDay(new Date());
      setAnchor((a) => (iso(a) === iso(today) ? a : today));
      return;
    }
    const start = startOfDay(new Date(dateRange.start));
    if (Number.isNaN(start.getTime())) return;
    setAnchor((a) => (iso(a) === iso(start) ? a : start));
  }, [dateRange?.start]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every in-calendar navigation goes through here so the toolbar keeps up.
  const goToDate = (next) => {
    const day = startOfDay(next);
    setAnchor(day);
    onAnchorChange?.(day);
  };

  // Day / Week / Month only changes how much of the anchor day is shown, so
  // the anchor itself survives the switch. The choice is remembered.
  const pickMode = (m) => {
    if (m !== "day" && m !== "week" && m !== "month") return;
    setMode(m);
    onModeChange?.(m);
    /* Each view has its own scroller and each starts at the top, so the
       previous one's scroll state must not carry over into the new header. */
    setScrolled(false);
    writePreference("calendarMode", m);
  };

  // Same rule as the legacy screen's date filter: only the Queue tab may
  // navigate into the future; other tabs clamp at today (including when the
  // user lands here from Queue with a future anchor).
  useEffect(() => {
    if (!allowFutureDates) {
      setAnchor((a) => (startOfDay(a) > startOfDay(new Date()) ? startOfDay(new Date()) : a));
    }
  }, [allowFutureDates]);

  const step = (dir) => {
    const next =
      mode === "day"
        ? addDays(anchor, dir)
        : mode === "week"
        ? addDays(anchor, dir * 7)
        : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
    if (!allowFutureDates && startOfDay(next) > startOfDay(new Date())) {
      onSlotUnavailable?.({ status: "error", title: "Only Queue shows future dates." });
      return goToDate(new Date());
    }
    return goToDate(next);
  };

  const todayISO = iso(new Date());
  const todayVisible = days.some((d) => iso(d) === todayISO);

  // Now-line, refreshed each minute.
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const nowMinutes = (() => {
    const n = new Date(nowTick);
    return n.getHours() * 60 + n.getMinutes();
  })();

  /* Where the grid opens. Arriving on a day from Month or Week, the thing
     worth seeing is the day's first appointment, not a fixed hour: landing
     at 8 AM on a day whose list starts at 6 PM shows an empty grid and
     reads as "nothing booked". So: earliest appointment if there is one,
     else now (when today is on screen), else 8 AM. */
  const earliestEventMin = useMemo(() => {
    let min = null;
    days.forEach((d) => {
      (eventsByDay[iso(d)] || []).forEach((row) => {
        const at = row.slotHour * 60 + row.slotMinute;
        if (min == null || at < min) min = at;
      });
    });
    return min;
  }, [days, eventsByDay]);

  /* Positioning happens once per view/date, plus once more if the day's
     appointments only land after the grid has already rendered — otherwise
     the first paint (no rows yet) would win and the scroll would sit at the
     fallback hour forever. Any manual scrolling after that is left alone. */
  const placedRef = useRef({ key: "", hadEvents: false });
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || mode === "month") return;
    const key = `${mode}|${iso(anchor)}`;
    const hasEvents = earliestEventMin != null;
    const placed = placedRef.current;
    if (placed.key === key && (placed.hadEvents || !hasEvents)) return;
    placedRef.current = { key, hadEvents: hasEvents };
    const px = hourPxRef.current;
    const target = hasEvents
      ? Math.max(0, ((earliestEventMin - 30) / 60) * px)
      : todayVisible
      ? Math.max(0, ((nowMinutes - 60) / 60) * px)
      : 8 * px;
    el.scrollTop = target;
    syncViewport(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- position per view/date, then once on data arrival
  }, [mode, anchor, earliestEventMin]);

  // Track the visible band, skipping the setState when it hasn't moved (the
  // drag auto-scroller fires this every frame).
  const syncViewport = (el) => {
    const top = Math.round(el.scrollTop);
    const height = Math.round(el.clientHeight);
    setViewport((v) => (v.top === top && v.height === height ? v : { top, height }));
  };

  /* Past and blocked slots stay clickable so the refusal can be explained.
     A `disabled` button swallows the click and says nothing, which reads as
     the app being broken rather than the slot being unavailable. */
  const openBooking = (slot) => {
    if (!allowBook) return;
    if (slot.isPast) {
      onSlotUnavailable?.({
        status: "error",
        title: `Can't book ${slot.label12}, that time has passed.`,
      });
      return;
    }
    if (slot.status !== "available") {
      onSlotUnavailable?.({
        status: "error",
        title: `Can't book ${slot.label12}, that slot is blocked.`,
      });
      return;
    }
    onSlotPick?.(slot);
  };

  /* What the date control says, and what the picker highlights.

     The control names the window on screen, not one day inside it: a week
     grid labelled "13 Aug 2026" claims to be showing one date while showing
     seven, which is what made changing the date feel like nothing happened.
     Day view keeps the single date, because there the window IS the day.

     The anchor is still the value underneath, so picking a date jumps to the
     period containing it and marks it on the grid — the same contract Google
     Calendar and Teams use. */
  const windowLabel = useMemo(() => {
    if (mode === "month") return moment(anchor).format("MMMM YYYY");
    if (mode === "week") {
      const a = days[0];
      const b = days[days.length - 1];
      if (!a || !b) return moment(anchor).format("D MMM YYYY");
      const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
      const sameYear = a.getFullYear() === b.getFullYear();
      return sameMonth
        ? `${moment(a).format("D")} – ${moment(b).format("D MMM YYYY")}`
        : sameYear
        ? `${moment(a).format("D MMM")} – ${moment(b).format("D MMM YYYY")}`
        : `${moment(a).format("D MMM YYYY")} – ${moment(b).format("D MMM YYYY")}`;
    }
    return moment(anchor).isSame(moment(), "day")
      ? "Today"
      : moment(anchor).format("D MMM YYYY (ddd)");
  }, [mode, anchor, days]);

  /* The window the picker should paint as chosen: the whole week or month, so
     opening it shows the period on screen rather than one lit day inside an
     otherwise blank grid. */
  const windowRange = useMemo(() => {
    if (mode === "week" && days.length) return { start: days[0], end: days[days.length - 1] };
    if (mode === "month") {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { start: first, end: last };
    }
    return null;
  }, [mode, anchor, days]);

  /* Published so the toolbar's own picker says the same thing; two controls
     on one value must not describe it two different ways. */
  useEffect(() => {
    /* `value` is what the toolbar picker should hold, already shaped for the
       mode it will run in: a range for week, a date for month. Publishing the
       range for both put an object where the month picker wanted a Date, and
       it rendered "Invalid Date". */
    onWindowLabelChange?.(
      mode === "day"
        ? null
        : { label: windowLabel, mode, value: mode === "month" ? anchor : windowRange }
    );
  }, [windowLabel, windowRange, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToNow = () => {
    const el = scrollRef.current;
    if (!el) return;
    const band = el.clientHeight - GRID_HEAD_PX;
    el.scrollTo({ top: Math.max(0, nowMinutes * minPx - band / 2), behavior: "smooth" });
    setNowChip(null);
  };

  // "+N" chip: bring the earliest off-screen appointment of that day just
  // under the pinned head.
  const scrollToHidden = (list) => {
    const el = scrollRef.current;
    if (!el || !list.length) return;
    const first = list.reduce((a, b) => (b.top < a.top ? b : a));
    el.scrollTo({ top: Math.max(0, first.top - 12), behavior: "smooth" });
  };

  return (
    <div
      className={styles.root}
      data-overflow-start={overflowStart || undefined}
      data-overflow-end={overflowEnd || undefined}
    >
      {/* No chrome row of its own any more: Day/Week lives in the page toolbar
          beside the date stepper, and Show Slots has moved down to the legend
          bar, so the grid starts straight under the toolbar. */}

      {/* Reschedule mode banner */}
      {rescheduleFor && (
        <div className={styles.rescheduleBar}>
          <TPLibraryIcon name="calendar-edit" size={16} color="var(--tesseract-blue-600)" />
          <span>
            Pick a new slot for <strong>{rescheduleFor.name}</strong> ({rescheduleFor.slotTime}, {rescheduleFor.slotDate})
          </span>
          <button type="button" className={styles.rescheduleCancel} onClick={onCancelReschedule}>
            Cancel
          </button>
        </div>
      )}

      {mode !== "month" ? (
        <div
          className={styles.timeGridWrap}
          ref={scrollRef}
          /* One resolve per frame at most: pointer moves fire far faster than
             the grid needs to repaint. */
          onMouseMove={
            showAllSlots
              ? undefined
              : (e) => {
                  if (hoverRafRef.current) return;
                  const { clientX, clientY } = e;
                  hoverRafRef.current = requestAnimationFrame(() => {
                    hoverRafRef.current = 0;
                    const hit = resolveHover(clientX, clientY);
                    setHoverSlotKey(hit ? `${hit.dateISO}|${hit.slot.start}` : null);
                  });
                }
          }
          onMouseLeave={showAllSlots ? undefined : () => setHoverSlotKey(null)}
          onScroll={(e) => {
            const el = e.currentTarget;
            syncViewport(el);
            setScrolled(el.scrollTop > 2);
            setOverflowStart(el.scrollLeft > 1);
            setOverflowEnd(el.scrollWidth - el.clientWidth - el.scrollLeft > 1);
            // Hover tooltips re-anchor; a pinned card on a coarse pointer is
            // dismissed instead — the fullscreen layer no longer traps scroll,
            // so moving the day must close the card rather than leave it
            // stranded over the wrong slot.
            if (popup?.pinned && window.matchMedia?.("(pointer: coarse)").matches) {
              closePopup();
            } else if (popup && !popup.pinned) {
              reanchorPopup();
            }
            if (!todayVisible) {
              setNowChip(null);
            } else {
              const nowY = nowMinutes * minPx;
              if (nowY < el.scrollTop + 24) setNowChip("up");
              else if (nowY > el.scrollTop + el.clientHeight - GRID_HEAD_PX - 24) setNowChip("down");
              else setNowChip(null);
            }
          }}
        >
          {/* One header band for all three modes: weekday caption over the
              date numeral, centred, on the same tinted rail the month grid
              uses. Today is marked with a soft tint and an accent rule
              underneath rather than a solid disc, which is the same
              "selected" language as the page's tabs. The "+N" chip parks in
              the corner for appointments outside the visible hours, and the
              gutter cell captions the time axis with the clinic timezone. */}
          <div
            className={styles.gridHeader}
            data-mode={mode}
            data-scrolled={scrolled || undefined}
            style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div className={styles.gridHeaderGutter}>{tzLabel}</div>
            {/* No "chosen day" mark here: the window IS the selection. Only
                today is marked. Keep comments outside `return (` / ternaries —
                a production minify of this file once dropped the entire
                colHead JSX when a block comment sat between `return (` and
                the root element, leaving only the GMT gutter in the DOM. */}
            {days.map((d) => {
              const dayISO = iso(d);
              const isToday = dayISO === todayISO;
              const hidden = hiddenByDay[dayISO] || [];
              const dayHead =
                mode === "day" ? (
                  <span className={styles.dayTitle}>
                    <span className={styles.dayTitleText}>{longDate.format(d)}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.colHeadStack}
                    title={`Open ${longDate.format(d)}`}
                    onClick={() => {
                      goToDate(d);
                      pickMode("day");
                    }}
                  >
                    <span className={styles.colHeadWeekday}>{weekdayShort.format(d)}</span>
                    <span className={styles.colHeadNum}>{d.getDate()}</span>
                  </button>
                );
              return (
                <div
                  key={dayISO}
                  className={styles.colHead}
                  data-today={isToday || undefined}
                  data-selected={dayISO === iso(anchor) || undefined}
                >
                  <span className={styles.colHeadAccent} aria-hidden="true" />
                  {dayHead}
                  {hidden.length > 0 && (
                    <button
                      type="button"
                      className={styles.overflowChip}
                      title={`${hidden.length} appointment${hidden.length > 1 ? "s" : ""} outside the visible hours`}
                      onClick={() => scrollToHidden(hidden)}
                    >
                      +{hidden.length}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className={styles.gridBody}
            ref={gridBodyRef}
            data-mode={mode}
            /* Picking mode (booking or reschedule) makes free slots explicit
               again; browsing keeps the grid quiet. */
            data-picking={slotFilter || rescheduleFor ? "" : undefined}
            style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))`, height: 24 * hourPx }}
          >
            {/* Hour gutter (12-hour labels) */}
            <div className={styles.hourGutter}>
              {HOURS.map((h) => (
                <div key={h} className={styles.hourLabel} style={{ top: h * hourPx }}>
                  {h === 0 ? "" : hourLabel(h)}
                </div>
              ))}
              {todayVisible && (
                <span className={styles.nowLabel} style={{ top: nowMinutes * minPx }}>
                  {moment(nowTick).format("h:mm A")}
                </span>
              )}
            </div>

            {days.map((d) => {
              const dayISO = iso(d);
              const slots = slotsByDate[dayISO] || [];
              const awaitingSlots = pendingDates.has(dayISO);
              return (
                <div
                  key={dayISO}
                  className={styles.dayCol}
                  data-date={dayISO}
                  data-today={dayISO === todayISO || undefined}
                >
                  {HOURS.map((h) => (
                    <React.Fragment key={h}>
                      <div className={styles.hourLine} style={{ top: h * hourPx }} />
                      <div className={styles.halfLine} style={{ top: h * hourPx + hourPx / 2 }} />
                    </React.Fragment>
                  ))}

                  {/* A column whose availability is still in flight shimmers
                      in place of its slots, so a week fills in column by
                      column instead of reading as an empty day. */}
                  {showAllSlots &&
                    awaitingSlots &&
                    SLOT_SKELETON.map((s) => (
                      <div
                        key={`sk-${s.top}`}
                        className={styles.slotSkeleton}
                        style={{ top: s.top * minPx, height: Math.max(18, s.height * minPx - 4) }}
                        aria-hidden="true"
                      />
                    ))}

                  {/* Availability layer: every clinic slot and every tele slot
                      from their own APIs, laid on the timeline. Overlapping
                      bands share the column side-by-side. */}
                  {prepareFreeSlotChips(slots, slotFilter, eventsByDay[dayISO] || []).map((chip) => {
                    if (!showAllSlots && hoverSlotKey !== `${dayISO}|${chip.start}`) return null;
                    const heightPx = Math.max(18, chip.durationMin * minPx - 10);
                    const split = chip.cols > 1;
                    const splitStyle = split
                      ? {
                          left: `calc(${(chip.col * 100) / chip.cols}% + 3px)`,
                          width: `calc(${100 / chip.cols}% - 6px)`,
                          minWidth: 0,
                          maxWidth: "none",
                        }
                      : undefined;
                    const isTele = chip.bookMode === "teleconsult";
                    /* The mode marker rides every slot in every state, so an
                       in-clinic slot reads as in-clinic whether it is open,
                       past or blocked. It is blue on a bookable slot and muted
                       on a disabled one, matching the rest of the chip. Its size
                       tracks the zoom: on a zoomed-out (short) slot a full-size
                       glyph dwarfs the row, so it steps down with the density. */
                    const modeIconSize = hourPx >= 160 ? 14 : hourPx >= 120 ? 12 : 11;
                    const modeIconEl = (
                      <TPLibraryIcon
                        name={isTele ? "video" : "hospital"}
                        variant="bulk"
                        family={isTele ? "video-audio-image" : "building"}
                        size={modeIconSize}
                        color={chip.bookable ? "var(--tesseract-blue-400)" : "var(--tesseract-slate-400)"}
                      />
                    );
                    /* Time carries its meridiem (AM/PM). The mode glyph
                       (clinic / video) is the type differentiator and rides
                       every slot; as a column narrows it is the TIME that gives
                       way to the hour gutter, never the glyph (see the container
                       queries in the CSS). The time is wrapped so it can be hidden
                       on narrow columns while the glyph stays. */
                    const slotTime = chip.label12;
                    return (
                      <button
                        key={chip.chipKey}
                        type="button"
                        className={styles.slotBlock}
                        style={{ top: chip.startMin * minPx + 5, height: heightPx, ...splitStyle }}
                        data-state={chip.bookable ? "free" : chip.blocked ? "blocked" : "past"}
                        data-book-mode={chip.bookMode || undefined}
                        data-split={split || undefined}
                        data-drop={dropTarget === `${dayISO}|${chip.start}` || undefined}
                        data-peek={!showAllSlots || undefined}
                        aria-disabled={!chip.bookable || undefined}
                        title={
                          chip.bookable
                            ? isTele
                              ? `Book teleconsultation ${chip.label12}`
                              : `Book in-clinic ${chip.label12}`
                            : chip.blocked
                            ? "Unavailable"
                            : "This time slot has already passed"
                        }
                        onClick={() => openBooking(chip)}
                      >
                        <span className={styles.slotBlockLabel}>
                          {chip.bookable ? (
                            <>
                              {/* Open slot: the time, plus the clinic / video glyph
                                  that says which kind of visit this slot books. The
                                  "+" leads a roomy full-width slot; a split half has
                                  no room for it and the dashed blue outline already
                                  reads as "open, tap to book". */}
                              {!split && <TPLibraryIcon name="add" family="essential" size={19} />}
                              <span className={styles.slotTimeText}>{slotTime}</span>
                              {modeIconEl}
                            </>
                          ) : chip.blocked ? (
                            /* Blocked / past carry no mode glyph — the marker is
                               for choosing an OPEN slot's visit type. Just the
                               time (blocked lanes say so via their striped fill). */
                            <span className={styles.slotTimeText}>{slotTime}</span>
                          ) : (
                            <span className={styles.slotTimeText}>{slotTime}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {/* Booked events — height follows the slot duration and the
                      zoom level; taller cards reveal detail progressively so
                      nothing needs a click to read: name, time, visit info,
                      contact, remark, plus the kebab right on the card. */}
                  {/* Week stacks an overlapping run into compact rows and
                      caps it with a "+N" into Day view, the way Month does;
                      a seventh of the grid is too narrow to split. */}
                  {(laidByDay[dayISO]?.overflows || []).map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      className={styles.stackMore}
                      style={{ top: o.top, height: o.height }}
                      title={`${o.count} more at this time — open ${dayISO}`}
                      onClick={() => {
                        goToDate(d);
                        pickMode("day");
                      }}
                    >
                      +{o.count} more
                    </button>
                  ))}
                  {(laidByDay[dayISO]?.cards || []).map(({ row, top, height: heightPx, col, cols, lane = 0, laneCols = 1 }) => {
                    const isDragging = dragging?.id === row.id;
                    const openPop = (e) => {
                      if (suppressClickRef.current) return;
                      pinPopup(row, e.currentTarget);
                    };
                    /* Splitting a column evenly stops working once the slices
                       fall under a readable width (a week column shared four
                       ways is ~30px). Past that point the cards cascade and
                       overlap instead, each keeping a legible width with the
                       later ones on top. */
                    const MIN_CARD_PX = 96;
                    /* Dual clinic/tele lanes: same geometry as free-slot chips
                       (clinic left, tele right). Overlaps within a lane still
                       subdivide that half. */
                    let overlapStyle = {};
                    let cardWidth = colWidth - 14;
                    if (laneCols > 1) {
                      const lanePct = 100 / laneCols;
                      const subCols = Math.max(1, cols);
                      const subPct = lanePct / subCols;
                      cardWidth = colWidth / laneCols / subCols - 8;
                      overlapStyle = {
                        left: `calc(${lane * lanePct + col * subPct}% + 3px)`,
                        width: `calc(${subPct}% - 6px)`,
                        minWidth: 0,
                        zIndex: 2 + lane + col,
                      };
                    } else if (cols > 1) {
                      const tight = colWidth / cols < MIN_CARD_PX;
                      const step = tight
                        ? Math.max(8, Math.min(22, (colWidth - MIN_CARD_PX) / Math.max(1, cols - 1)))
                        : 0;
                      cardWidth = tight
                        ? colWidth - col * step - 6
                        : colWidth / cols - 8;
                      overlapStyle = tight
                        ? {
                            left: col * step + 3,
                            width: `calc(100% - ${col * step + 6}px)`,
                            minWidth: 0,
                            zIndex: 2 + col,
                          }
                        : {
                            left: `calc(${(col * 100) / cols}% + 3px)`,
                            width: `calc(${100 / cols}% - 6px)`,
                            minWidth: 0,
                          };
                    }
                    return (
                      <AppointmentEventCard
                        key={row.id}
                        row={row}
                        tabId={tabId}
                        receptionistMode={receptionistMode}
                        width={cardWidth}
                        height={heightPx}
                        onRowAction={onRowAction}
                        onActionInteract={closePopup}
                        selected={popup?.row?.id === row.id}
                        dragging={isDragging}
                        style={
                          isDragging
                            ? {
                                position: "fixed",
                                left: dragging.x - dragging.offX,
                                top: dragging.y - dragging.offY,
                                width: dragging.width,
                                height: heightPx,
                                pointerEvents: "none",
                              }
                            : { top, height: heightPx, ...overlapStyle }
                        }
                        onClick={openPop}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") openPop(e);
                        }}
                        onPointerDown={(e) => startDrag(e, row)}
                        onPointerMove={(e) => moveDrag(e, row)}
                        onPointerUp={(e) => endDrag(e, row)}
                        onPointerCancel={cancelDrag}
                        onMouseEnter={(e) => hoverOpen(row, e.currentTarget)}
                        onMouseLeave={hoverClose}
                        onFocus={(e) => hoverOpen(row, e.currentTarget)}
                        onBlur={hoverClose}
                      />
                    );
                  })}

                  {/* Now line */}
                  {dayISO === todayISO && (
                    <div className={styles.nowLine} style={{ top: nowMinutes * minPx }}>
                      <span className={styles.nowDot} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Month has its own scroller, so it reports its own scroll position
        // (otherwise the header kept day/week `scrolled` and showed a shadow).
        <div
          className={styles.monthWrap}
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)}
        >
          {/* Same band, same weekday caption as Day and Week; only the date
              numeral is missing, because in Month it lives in each cell. */}
          <div className={styles.monthHeader} data-scrolled={scrolled || undefined}>
            {monthCells.slice(0, 7).map((d) => (
              <div key={iso(d)} className={styles.colHead} data-compact="">
                {/* Just the weekday name — the selected/today emphasis in month
                    view lives on the day cell below, not on a whole column. */}
                <span className={styles.colHeadStack}>
                  <span className={styles.colHeadWeekday}>{weekdayShort.format(d)}</span>
                </span>
              </div>
            ))}
          </div>
          <div className={styles.monthGrid} ref={monthGridRef}>
            {monthCells.map((d) => {
              const inMonth = d.getMonth() === anchor.getMonth();
              const dayISO = iso(d);
              const events = eventsByDay[dayISO] || [];
              const shown = events.slice(0, monthChipCap);
              const total = dayTotals[dayISO] ?? events.length;
              return (
                <button
                  key={dayISO}
                  type="button"
                  className={styles.monthCell}
                  data-outside={!inMonth || undefined}
                  data-today={dayISO === todayISO || undefined}
                  data-selected={dayISO === iso(anchor) || undefined}
                  onClick={() => {
                    goToDate(d);
                    pickMode("day");
                  }}
                >
                  <span className={styles.monthDate}>{d.getDate()}</span>
                  {/* A day with nothing booked is not the same as a day with
                      nothing to say. Rather than leaving the cell blank, it
                      reports what is still open, drawn in the same language
                      the day and week grids already use for an open slot: a
                      dashed blue block. A month cell is a day seen from
                      further away, so it gets one bar instead of ninety-six.

                      Tied to Show Slots, because it IS the slot layer, just
                      summarised. Days already gone say nothing, because
                      nothing can be done about them. */}
                  {freeSlots &&
                    events.length === 0 &&
                    inMonth &&
                    (() => {
                      if (startOfDay(d) < startOfDay(new Date())) return null;
                      if (pendingDates.has(dayISO)) {
                        return <span className={styles.monthFreeSkeleton} aria-hidden="true" />;
                      }
                      const daySlots = slotsByDate[dayISO];
                      if (!daySlots) return null;
                      const free = daySlots.filter((x) => x.status === "available" && !x.isPast).length;
                      /* No published slots at all is a closed day (a holiday,
                         or hours not set); slots that exist but are all taken
                         is a full day. Two different facts, two labels. */
                      const state = free > 0 ? "open" : daySlots.length ? "full" : "closed";
                      return (
                        <span className={styles.monthFree} data-state={state}>
                          {state === "open" && (
                            <TPLibraryIcon name="add" family="essential" size={13} />
                          )}
                          {state === "open"
                            ? `${free} slot${free === 1 ? "" : "s"} available`
                            : state === "full"
                            ? "Fully booked"
                            : "Not available"}
                        </span>
                      );
                    })()}
                  {/* One line each, status-coloured, so a month cell stays a
                      density read rather than a stack of little cards. */}
                  {shown.map((row) => (
                    <span key={row.id} className={styles.monthChip} data-status={row.status || tabId}>
                      <span className={styles.monthChipTime}>{row.slotTime}</span>
                      <span className={styles.monthChipName}>{row.name}</span>
                    </span>
                  ))}
                  {total > shown.length && (
                    <span className={styles.moreCount}>+{total - shown.length} more</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The cards are colour-coded and nothing on screen said what the
          colours mean. It lives under the grid rather than over it: a legend
          is something you consult once and then stop seeing, so it must not
          take space from the schedule. */}
      <div className={styles.legend}>
        {/* Show Slots now lives here, on the left of the bottom bar — the grid's
            layer control sits with the grid's key rather than in a chrome row
            of its own. A switch, not a checkbox: it turns the slot layer on and
            off, and every block it draws is a slot (open, blocked or past). */}
        {!disableAvailabilityLayer && (
          <label className={styles.availabilityToggle}>
            <span className={styles.availabilityLabel}>Show Available Slots</span>
            <Toggle
              size="sm"
              ariaLabel="Show the slot grid under the appointments"
              checked={freeSlots}
              onCheckedChange={(next) => {
                setFreeSlots(next);
                writePreference("calendarFreeSlots", next ? "on" : "off");
              }}
            />
          </label>
        )}
        {/* The colour key sits at the far right of the bar. */}
        <div className={styles.legendKey}>
          {legend.map((k) => (
            <span key={k} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: STATUS_META[k].color }} aria-hidden="true" />
              {STATUS_META[k].label}
            </span>
          ))}
        </div>
      </div>

      {/* Subtle floating chip back to the current time, only while the
          now-line is scrolled out of view on a today-visible grid. */}
      {nowChip && mode !== "month" && (
        <button type="button" className={styles.nowChip} onClick={scrollToNow}>
          <TPLibraryIcon name={nowChip === "up" ? "arrow-up2" : "arrow-down"} family="arrow" size={12} />
          Back to now
        </button>
      )}

      {/* Reading out loud what the release would do. At the drag scale the
          ghost covers most of the slot it is over, so the answer follows the
          cursor instead of hiding underneath it. */}
      {dragging && (
        <div
          className={styles.dropHint}
          data-ok={dragging.over ? "true" : undefined}
          style={{ left: dragging.x + 16, top: dragging.y + 18 }}
          aria-live="polite"
        >
          {dragging.over ? `Move to ${dragging.over}` : "No free slot here"}
        </div>
      )}

      {popup && (
        <EventPopover
          anchorRect={popup.anchorRect}
          row={popup.row}
          pinned={popup.pinned}
          tabId={tabId}
          onRowAction={onRowAction}
          onClose={closePopup}
          onMouseEnter={keepOpen}
          onMouseLeave={hoverClose}
          receptionistMode={receptionistMode}
        />
      )}
    </div>
  );
}
