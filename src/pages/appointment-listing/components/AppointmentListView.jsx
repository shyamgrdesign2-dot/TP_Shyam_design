import React, { useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Button,
  DataTable,
  TableActions,
  Empty,
  Tooltip,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";

import { ASSETS } from "../../../assets";
import { TAB_IDS, EMPTY_STATE_BY_TAB } from "../data/appointmentsConfig";
import { useListingAccess } from "../data/useListingAccess";
import { rowPrimaryAction, RowKebabMenu } from "./rowActions";
import QueueRxSplitButton from "./QueueRxSplitButton";
import emptyDocsIllustration from "../assets/empty-docs.svg";
import BillingTag from "./BillingTag";
import TeleconsultPopover from "./TeleconsultPopover";
import styles from "./AppointmentListView.module.css";

export default function AppointmentListView({
  tabId,
  rows,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  error,
  onRetry,
  hasActiveFilters,
  onClearFilters,
  onRowAction,
  onPatientClick,
  onAddAppointment,
}) {
  const emptyMeta = EMPTY_STATE_BY_TAB[tabId] || EMPTY_STATE_BY_TAB[TAB_IDS.QUEUE];
  const wrapRef = useRef(null);
  const access = useListingAccess();
  const { showBilling, showBookActions, isZydusAccount, isChikitsalay } = access;
  const finishedData = useSelector((state) => state.records?.finishedData) || [];
  const zydusAppointmentData = useSelector((state) => state.records?.zydusAappointmentData) || [];

  // Legacy: hide Encounter Consult when finishedData already has pam_ref_id.
  const finishedEncounterIds = useMemo(() => {
    const ids = new Set();
    finishedData.forEach((item) => {
      if (item?.pam_ref_id != null) ids.add(String(item.pam_ref_id));
    });
    return ids;
  }, [finishedData]);

  const actionCtx = useMemo(
    () => ({ ...access, finishedEncounterIds }),
    [access, finishedEncounterIds]
  );

  // Legacy UAT: name is not clickable on Zydus Appointment or Cancelled tabs.
  const patientNameClickable =
    !isZydusAccount ||
    (tabId !== TAB_IDS.ZYDUS_APPOINTMENT && tabId !== TAB_IDS.CANCELLED);

  // The new table scrolls inside the DS scroller, not the page (unlike
  // legacy AppointmentData). Watch that scroller: near the bottom, or when
  // the first page does not fill the pane, load the next 25.
  useEffect(() => {
    if (!hasMore || loading || !onLoadMore) return undefined;
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const scroller = wrap.querySelector('[class*="_scroller_"]') || wrap;
    const maybeLoad = () => {
      if (loadingMore) return;
      const overflow = scroller.scrollHeight > scroller.clientHeight + 8;
      const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
      if (!overflow || nearBottom) onLoadMore();
    };
    scroller.addEventListener("scroll", maybeLoad, { passive: true });
    maybeLoad();
    return () => scroller.removeEventListener("scroll", maybeLoad);
  }, [hasMore, loading, loadingMore, rows.length, onLoadMore]);

  const columns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        minWidth: 48,
        cell: (_row, i) => <span className={styles.serial}>{i + 1}</span>,
      },
      {
        id: "name",
        header: "Name",
        minWidth: 180,
        cell: (row) => (
          <div className={styles.cellStack}>
            {patientNameClickable ? (
              <Button
                variant="link"
                theme="primary"
                size="sm"
                className={styles.patientLink}
                onClick={() => onPatientClick?.(row)}
              >
                {row.name}
              </Button>
            ) : (
              <span className={styles.patientNamePlain}>{row.name}</span>
            )}
            <p className={styles.patientMeta}>
              {row.genderAge}
              {row.symptomsGathered && (
                <Tooltip content="Symptoms collected before the visit" side="top">
                  <img
                    src={ASSETS.images.symptomsGreen}
                    alt=""
                    width={16}
                    height={16}
                    className={styles.symptomsGlyph}
                  />
                </Tooltip>
              )}
            </p>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        minWidth: 150,
        cell: (row) => <span className={styles.contact}>{row.contact}</span>,
      },
      {
        /* A column of its own rather than a second line under the contact:
           it is how the front desk finds a patient, and clinic reference
           IDs are free text, so the cell is bounded and wraps to a second
           line before it truncates. */
        id: "mrn",
        header: "Patient ID",
        minWidth: 120,
        maxWidth: 180,
        cell: (row) => {
          const mrn = row.mrn || "";
          // Legacy Encounter Contact&Mrn: "(A)" when the same MRN also exists
          // in the ICT appointments bucket.
          const showApptBadge =
            isZydusAccount &&
            tabId === TAB_IDS.ZYDUS_ENCOUNTER &&
            mrn &&
            zydusAppointmentData.some((x) => String(x.mrno) === String(mrn));
          return (
            <span className={styles.mrn}>
              {mrn || "--"}
              {showApptBadge ? <span className={styles.apptBadge}> (A)</span> : null}
            </span>
          );
        },
      },
      ...(tabId === TAB_IDS.REFERRAL
        ? [
            {
              id: "referredBy",
              header: "Referred By",
              minWidth: 150,
              cell: (row) => <span className={styles.contact}>{row.referredBy || "--"}</span>,
            },
            {
              id: "referralDate",
              header: "Referral Date",
              minWidth: 140,
              cell: (row) => <span className={styles.contact}>{row.referralDate || "--"}</span>,
            },
            {
              id: "referralNotes",
              header: "Referral Notes",
              minWidth: 220,
              cell: (row) =>
                row.referralNotes ? (
                  <Tooltip content={row.referralNotes} side="top">
                    <p className={styles.remark}>{row.referralNotes}</p>
                  </Tooltip>
                ) : (
                  <span className={styles.remarkEmpty}>--</span>
                ),
            },
          ]
        : [
      {
        id: "visitType",
        header: "Visit Type",
        minWidth: 150,
        cell: (row) => (
          <div className={styles.visitRow}>
            <div className={styles.cellStack}>
              <span className={styles.visitType}>{row.visitType}</span>
              {row.specialty && <p className={styles.specialty}>{row.specialty}</p>}
            </div>
            <BillingTag status={showBilling ? row.billStatus : ""} />
          </div>
        ),
      },
      {
        id: "slot",
        header: "Slot",
        minWidth: 140,
        sortable: true,
        sortAccessor: (row) => `${row.dateISO || ""} ${String(row.slotHour ?? 0).padStart(2, "0")}:${String(row.slotMinute ?? 0).padStart(2, "0")}`,
        cell: (row) => (
          <div className={styles.cellStack}>
            <span className={styles.slotTime}>
              {row.slotTime}
              {row.hasVideo && <TeleconsultPopover row={row} tabId={tabId} onRowAction={onRowAction} />}
            </span>
            <p className={styles.slotDate}>{row.slotDate}</p>
          </div>
        ),
      },
      {
        id: "remarks",
        header: "Remarks",
        minWidth: 170,
        cell: (row) =>
          row.remark ? (
            <Tooltip content={row.remark} side="top">
              <p className={styles.remark}>{row.remark}</p>
            </Tooltip>
          ) : (
            <span className={styles.remarkEmpty}>--</span>
          ),
      },
        ]),
      ...(tabId === TAB_IDS.CLINIC_APPOINTMENT
        ? []
        : [
      {
        /* Hug the CTA + kebab. `width: "1%"` is the table-layout trick that
           stops a 100%-wide table from pouring leftover viewport into this
           sticky cell (which read as empty space left of Consult). minWidth
           floors a kebab-only row (Cancelled); maxWidth caps the longest
           label (Digitise Rx / Consult split). Shared by every list tab. */
        id: "actions",
        header: "Action",
        sticky: "right",
        align: "right",
        headerAlign: "left",
        width: "1%",
        minWidth: 88,
        maxWidth: 240,
        headerClassName: styles.actionCol,
        cellClassName: styles.actionCol,
        cell: (row) => (
          <div className={styles.actionCell}>
            {tabId === TAB_IDS.QUEUE || tabId === TAB_IDS.REFERRAL ? (
              tabId === TAB_IDS.QUEUE && isChikitsalay ? (
                <Button
                  variant="outline"
                  theme="primary"
                  size="sm"
                  onClick={() => onRowAction?.("type-rx", row)}
                >
                  Consult
                </Button>
              ) : (
                <QueueRxSplitButton row={row} onRowAction={onRowAction} tabId={tabId} />
              )
            ) : (
              <TableActions align="right" primary={rowPrimaryAction(tabId, row, onRowAction, actionCtx)} actions={[]} />
            )}
            <RowKebabMenu tabId={tabId} row={row} onRowAction={onRowAction} />
          </div>
        ),
      },
        ]),
    ],
    [
      tabId,
      onRowAction,
      onPatientClick,
      access,
      showBilling,
      patientNameClickable,
      isZydusAccount,
      zydusAppointmentData,
      actionCtx,
      isChikitsalay,
    ]
  );

  return (
    <div className={styles.tableWrap} ref={wrapRef}>
    <DataTable
      className={styles.refTable}
      columns={columns}
      data={rows}
      rowKey={(row) => row.id}
      rowHeight="lg"
      sortable
      hoverable={false}
      loading={loading}
      emptyState={
        loading ? null : error ? (
        <Empty
          media={<img src={emptyDocsIllustration} alt="" width={80} height={80} />}
          title="Could not load appointments"
          description="Something went wrong fetching this list. Try again."
          action={
            <Button variant="solid" theme="primary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          }
        />
        ) : (
        <Empty
          media={<img src={emptyDocsIllustration} alt="" width={80} height={80} />}
          title={hasActiveFilters ? "No matching appointments" : emptyMeta.title}
          description={
            hasActiveFilters
              ? "Nothing matches the current search and filters. Try removing some of them to see more results."
              : emptyMeta.description
          }
          action={
            hasActiveFilters ? (
              <Button variant="ghost" theme="primary" size="sm" onClick={onClearFilters}>
                Clear all filters
              </Button>
            ) : emptyMeta.cta === "add-appointment" && showBookActions ? (
              <Button
                variant="solid"
                theme="primary"
                size="sm"
                leftIcon={<TPLibraryIcon name="add" family="essential" size={16} />}
                onClick={onAddAppointment}
              >
                Add Appointment
              </Button>
            ) : undefined
          }
        />
        )
      }
    />
      {hasMore && !error && rows.length > 0 && (
        <div className={styles.loadMore}>
          {loadingMore ? "Loading more appointments…" : null}
        </div>
      )}
    </div>
  );
}
