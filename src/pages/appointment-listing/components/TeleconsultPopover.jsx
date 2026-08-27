import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";

import { StatusTag } from "./BillingTag";
import { statusMeta, videoTint } from "../data/appointmentStates";
import { useListingAccess } from "../data/useListingAccess";
import styles from "./TeleconsultPopover.module.css";

/**
 * The video marker's own card: what this call is, and the way into it.
 *
 * A dark tooltip can hold a sentence, not an appointment, and it cannot hold
 * a control at all because the pointer never reaches it. So this is a light
 * surface that survives the trip from the glyph to the action: the patient,
 * when the call is, what kind of visit, and the same consultation split
 * button the calendar card carries. Joining is the doctor's choice of Rx
 * mode, not an automatic jump into a call.
 *
 * Opens on hover after a short delay (so a pointer crossing the row does not
 * trip it) and closes only once the pointer has left both the marker and the
 * card. Clicking pins it.
 */
export default function TeleconsultPopover({ row, tabId, onRowAction }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [rect, setRect] = useState(null);
  const anchorRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const { showBilling } = useListingAccess();

  const clearTimers = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  };
  useEffect(() => clearTimers, []);

  const show = () => {
    clearTimers();
    openTimer.current = setTimeout(() => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) {
        setRect(r);
        setOpen(true);
      }
    }, 120);
  };
  const hide = () => {
    clearTimers();
    if (pinned) return;
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };
  const close = () => {
    clearTimers();
    setPinned(false);
    setOpen(false);
  };

  const status = statusMeta(row.status || tabId);



  /* Placed under the marker, then pulled back inside the viewport rather
     than allowed to run off the right edge or below the fold. */
  const WIDTH = 268;
  const style = rect
    ? {
        top: Math.min(rect.bottom + 8, window.innerHeight - 300),
        left: Math.max(12, Math.min(rect.left + rect.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - 12)),
        width: WIDTH,
      }
    : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={styles.marker}
        aria-label="Teleconsultation details"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation();
          setPinned(true);
          show();
        }}
      >
        <TPLibraryIcon
          name="video"
          variant="bulk"
          family="video-audio-image"
          size={14}
          color={videoTint(row.status || tabId)}
        />
      </button>

      {open &&
        style &&
        createPortal(
          <>
            {pinned && <div className={styles.layer} onClick={close} />}
            <div
              className={styles.card}
              style={style}
              onMouseEnter={clearTimers}
              onMouseLeave={hide}
            >
              <p className={styles.name}>
                {row.name}
                <span className={styles.nameGlyph} title="Teleconsultation">
                  <TPLibraryIcon
                    name="video"
                    variant="bulk"
                    family="video-audio-image"
                    size={15}
                    color={videoTint(row.status || tabId)}
                  />
                </span>
              </p>
              {(row.genderAge || row.mrn) && (
                <p className={styles.meta}>
                  {row.genderAge}
                  {row.genderAge && row.mrn && <span className={styles.sep}>|</span>}
                  {row.mrn}
                </p>
              )}

              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <TPLibraryIcon name="clock" variant="bulk" size={14} color="var(--tesseract-slate-500)" />
                  <span>
                    {row.slotTime}
                    {row.slotDate ? ` · ${row.slotDate}` : ""}
                  </span>
                </div>
                {row.contact && row.contact !== "--" && (
                  <div className={styles.fact}>
                    <TPLibraryIcon name="call" variant="bulk" size={14} color="var(--tesseract-slate-500)" />
                    <span>{row.contact}</span>
                  </div>
                )}
                {row.visitType && row.visitType !== "--" && (
                  <div className={styles.fact}>
                    <TPLibraryIcon name="calendar" variant="bulk" family="time" size={14} color="var(--tesseract-slate-500)" />
                    <span>
                      {row.visitType}
                      {row.specialty && <span className={styles.sep}>|</span>}
                      {row.specialty}
                    </span>
                  </div>
                )}
                {row.remark && (
                  <div className={styles.fact} data-remark="true">
                    <TPLibraryIcon
                      name="message-text"
                      variant="bulk"
                      family="emails-messages"
                      size={14}
                      color="var(--tesseract-slate-500)"
                    />
                    <span title={row.remark}>{row.remark}</span>
                  </div>
                )}
              </dl>

              <div className={styles.tags}>
                {status && <StatusTag tone={status.badge}>{status.label}</StatusTag>}
                {showBilling && row.billStatus && (
                  <StatusTag tone={row.billStatus === "Unbilled" ? "unbilled" : "billed"}>
                    {row.billStatus}
                  </StatusTag>
                )}
              </div>

              {/* One action, because there is only one thing this card is
                  for. Joining starts the call in the app's floating window
                  and leaves the doctor here; choosing an Rx mode is a
                  separate decision, taken from the row. */}
              <Button
                variant="solid"
                theme="primary"
                size="sm"
                className={styles.join}
                leftIcon={
                  <TPLibraryIcon name="video" variant="bulk" family="video-audio-image" size={16} />
                }
                onClick={() => {
                  close();
                  onRowAction?.("join-video", row);
                }}
              >
                Join video call
              </Button>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
