import React from "react";
import { TableActions, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";

import { ASSETS } from "../../../assets";
import { statusMeta, shortGenderAge, videoTint, CONDITION_COLORS } from "../data/appointmentStates";
import { rowPrimaryAction, primaryKebabOption, RowKebabMenu } from "./rowActions";
import { ReceptionistRowKebabMenu, receptionistRowPrimaryAction } from "../../receptionist-appointment-listing/components/receptionistRowActions";
import QueueRxSplitButton from "./QueueRxSplitButton";
import BillingTag from "./BillingTag";
import { useListingAccess } from "../data/useListingAccess";
import { TAB_IDS } from "../data/appointmentsConfig";
import styles from "./AppointmentEventCard.module.css";

/* Chrome that competes with the patient name for the first line, measured at
   the card's own type sizes. The tiers below are derived from these rather
   than picked by eye, so a change in one place doesn't silently break a size.

   rail 26 + gap 8 · time ~62 · divider+gaps 13 · kebab 26 · padding 16
   (F, 33y) ~56 · Unbilled badge ~66 · split CTA ~104 */
const W = {
  rail: 34,
  time: 62,
  divider: 13,
  kebab: 26,
  padding: 16,
  genderAge: 56,
  badge: 66,
  cta: 104,
  video: 21,
  // A name is worth showing only if roughly six characters survive.
  nameFloor: 52,
};

/**
 * Resolve one card's tier and contents from the space it actually has.
 *
 * Four tiers, widest to narrowest:
 *   xl  everything: name + age/sex, a full detail line, billing tag, CTA
 *   lg  as xl, but billing moves into the detail line to make room for the CTA
 *   md  one line of identity plus a short detail line; actions via the kebab
 *   sm  stacked: time (with its markers and visit tag) over the name
 *
 * Height decides how many lines are available; width decides what goes on
 * them. Anything that doesn't fit lives in the kebab and the hover tooltip,
 * so nothing is ever simply lost.
 */
export function cardVariant(width, height, row = {}) {
  const lines = height >= 64 ? 3 : height >= 42 ? 2 : 1;
  const twoLines = lines >= 2;

  // Room left on line one once the fixed chrome is paid for.
  const firstLineBudget = (extras) => width - W.rail - W.time - W.divider - W.kebab - W.padding - extras;

  const ctaFits = twoLines && height >= 54 && firstLineBudget(W.cta + W.badge + W.genderAge) >= W.nameFloor;
  const badgeInline = twoLines && firstLineBudget(W.badge + W.genderAge) >= W.nameFloor;

  let tier;
  if (twoLines && ctaFits && firstLineBudget(W.cta + W.badge + W.genderAge) >= 180) tier = "xl";
  else if (twoLines && ctaFits) tier = "lg";
  else if (firstLineBudget(W.genderAge) >= W.nameFloor) tier = "md";
  else tier = "sm";

  const stacked = tier === "sm" && twoLines;
  // Stacked cards spend line one on the time, so the name gets the full width
  // back on line two; only then is there room for the bracketed qualifier.
  const nameRoom = stacked ? width - W.rail - W.padding : firstLineBudget(0);

  return {
    tier,
    lines,
    stacked,
    // Identity
    showGenderAge: nameRoom - W.genderAge >= W.nameFloor,
    useShortName: tier === "sm",
    // Line-one markers
    showVideo: !!row.hasVideo,
    /* Detail line, narrowest first: the mobile number is the minimum worth
       carrying, then the patient ID, then what kind of visit and under which
       speciality, and only on the widest card the remark. */
    showDetail: twoLines && tier !== "sm",
    detailFields: tier === "xl" ? 5 : tier === "lg" ? 4 : 2,
    // Trailing cluster
    showCta: ctaFits,
    /* Billing is an admin fact, not an identifier: it earns a place only on
       the cards that have already shown everything clinical, and it sits at
       the end of the detail line rather than stranded in the far corner. */
    billingSlot: (tier === "xl" || tier === "lg") && badgeInline ? "detail" : "none",
    showKebab: width >= 112 && height >= 32,
    showStatusRail: width >= 132 && height >= 34,
  };
}

/**
 * One appointment, drawn to fit. The status rail leads (colour AND glyph, so
 * the card still reads without colour vision), then the time, then as much of
 * the patient as the tier allows.
 */
export default function AppointmentEventCard({
  row,
  tabId,
  width,
  height,
  onRowAction,
  selected,
  dragging,
  style,
  // Engaging an action on the card itself dismisses the hover popover: its
  // menu and the popover would otherwise stack, two of the same thing at once.
  onActionInteract,
  receptionistMode = false,
  ...handlers
}) {
  // In the merged "All" view each card acts on its own status
  // (queue → Consult, finished → Print, and so on).
  const cardTab = row.status || tabId;
  const status = statusMeta(cardTab);
  const access = useListingAccess();
  const { showBilling: showBillingDoctor } = access;
  const showBilling = receptionistMode ? false : showBillingDoctor;
  const primary = receptionistMode
    ? receptionistRowPrimaryAction()
    : rowPrimaryAction(cardTab, row, onRowAction, access);
  const v = cardVariant(width, height, row);

  const canShowAbha = Boolean(
    (row.abhaAddress || row.raw?.abhaAddress) && access.hipId && access.abhaEnable
  );
  const conditionId = row.patientConditionId || row.raw?.patient_condition_id;
  const condition = CONDITION_COLORS[conditionId];

  const genderAge = v.showGenderAge && row.genderAge ? `(${shortGenderAge(row.genderAge)})` : "";
  // The salutation lives in its own backend column, so the short form is the
  // first token of the full name, never a guess at what is a title.
  const displayName = v.useShortName ? row.firstName || row.name : row.name;
  const billing = showBilling ? <BillingTag status={row.billStatus} /> : null;

  /* On a chip there is one line to share between the time and the name, and
     the name is the thing being looked up. The meridiem goes first: its
     position in the day grid already says morning or afternoon. */
  const compact = height <= 30;
  // The narrow tiers drop the meridiem so the time and the mode glyph both fit
  // without the glyph being clipped: on a 5-way-overlap chip "11:24 AM" alone
  // eats the whole width. The grid position already says morning or afternoon.
  const tightTime = compact || v.tier === "sm";
  const timeText = tightTime
    ? String(row.slotTime || "").replace(/\s*[AP]M$/i, "").replace(/^0/, "")
    : row.slotTime;

  // Detail line, in the order a doctor scans it: how to reach them, who they
  // are on file, what kind of visit, under which speciality, then any note.
  const detail = [row.contact, row.mrn, row.visitType, row.specialty, row.remark]
    .filter((x) => x && x !== "--")
    .slice(0, v.detailFields);

  return (
    <div
      role="button"
      tabIndex={0}
      data-event-id={row.id}
      className={styles.card}
      data-status={cardTab}
      data-tier={v.tier}
      /* A chip-height card (a week column's stacked run) drops to caption
         type so the time and a usable slice of the name both survive. */
      data-compact={compact || undefined}
      data-dragging={dragging || undefined}
      data-selected={selected || undefined}
      style={style}
      {...handlers}
    >
      {v.showStatusRail && status && (
        <span className={styles.statusRail} title={status.label}>
          <TPLibraryIcon
            name={status.icon}
            family={status.family}
            variant="bulk"
            size={v.lines >= 2 ? 26 : 20}
            color={status.color}
          />
        </span>
      )}

      <div className={styles.body}>
        <span className={styles.line}>
          <span className={styles.time} title={compact ? row.slotTime : undefined}>
            {timeText}
          </span>
          {/* The glyphs the time earns: how the consult came about, and how
              it happens. A walk-in can in principle also be a teleconsult, so
              neither excludes the other. */}
          {canShowAbha && (
            <span className={styles.glyph} title="ABHA linked">
              <img src={ASSETS.images.abhaSvg} alt="ABHA" width={14} height={14} />
            </span>
          )}
          {row.symptomsGathered && (
            <span className={styles.glyph} title="Symptoms collected before the visit">
              <img src={ASSETS.images.symptomsGreen} alt="" width={14} height={14} />
            </span>
          )}
          {/* The mode marker is constant: every card says whether it is a
              teleconsult (video) or an in-clinic (hospital) visit, in every
              state, so the indication never disappears when an appointment is
              finished or cancelled. It wears the card's own state colour, so a
              cancelled visit does not advertise itself in live-appointment
              blue. */}
          <span
            className={styles.glyph}
            title={row.hasVideo ? "Teleconsultation" : "In-clinic"}
          >
            <TPLibraryIcon
              name={row.hasVideo ? "video" : "hospital"}
              variant="bulk"
              family={row.hasVideo ? "video-audio-image" : "building"}
              size={15}
              color={videoTint(row.status || tabId)}
            />
          </span>
          {!v.stacked && (
            <>
              <span className={styles.divider} aria-hidden="true" />
              <span className={styles.name}>
                {displayName}
                {genderAge && <span className={styles.genderAge}>{genderAge}</span>}
                {condition && (
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
                    title={condition.name}
                  />
                )}
              </span>
            </>
          )}
        </span>

        {v.stacked && (
          <span className={styles.name}>
            {displayName}
            {genderAge && <span className={styles.genderAge}>{genderAge}</span>}
            {condition && (
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
                title={condition.name}
              />
            )}
          </span>
        )}

        {v.showDetail && (detail.length > 0 || v.billingSlot === "detail") && (
          <span className={styles.sub}>
            {detail.map((part, i) => (
              <React.Fragment key={part}>
                {i > 0 && <span className={styles.subDivider} aria-hidden="true" />}
                {/* The last field is free text (the remark); it truncates and
                    carries its full value for hover, with the card tooltip as
                    the roomier read. */}
                <span className={styles.subText} title={i === detail.length - 1 ? part : undefined}>
                  {part}
                </span>
              </React.Fragment>
            ))}
            {v.billingSlot === "detail" && billing}
          </span>
        )}
      </div>

      {/* Trailing cluster, on the card's centre line: the CTA, then the kebab
          that carries whatever didn't fit. Chikitsalay Appointment rows have
          no action column in the table (unless Queue Management is on, where
          a Check-in CTA applies), so the card mirrors that. */}
      {(cardTab !== TAB_IDS.CLINIC_APPOINTMENT || access?.isQueueManagementEnabled) &&
        (v.showCta || v.showKebab) && (
        <div
          className={styles.trail}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            onActionInteract?.();
          }}
        >
          {!receptionistMode && v.showCta && primary && (
            cardTab === TAB_IDS.QUEUE || cardTab === TAB_IDS.REFERRAL ? (
              <QueueRxSplitButton row={row} onRowAction={onRowAction} tabId={cardTab} />
            ) : (
              <TableActions align="right" primary={primary} actions={[]} />
            )
          )}
          {v.showKebab &&
            (receptionistMode ? (
              <ReceptionistRowKebabMenu tabId={cardTab} row={row} onRowAction={onRowAction} />
            ) : (
              <RowKebabMenu
                tabId={cardTab}
                row={row}
                onRowAction={onRowAction}
                extraOptions={
                  v.showCta || cardTab === TAB_IDS.QUEUE || cardTab === TAB_IDS.REFERRAL
                    ? []
                    : [primaryKebabOption(cardTab, access)].filter(Boolean)
                }
              />
            ))}
        </div>
      )}
    </div>
  );
}
