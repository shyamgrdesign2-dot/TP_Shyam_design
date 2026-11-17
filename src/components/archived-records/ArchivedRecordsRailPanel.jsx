import React, { useEffect } from "react";
import ArchivedRecordsSourceDrawer from "./ArchivedRecordsSourceDrawer";
import CaseFileRecord from "./CaseFileRecord";
import { archivedRecordsStore } from "./archivedRecordsStore";

/**
 * The Case File panel beside the blue rail on the Rx pad.
 *
 * It is the shared Case File record (CaseFileRecord) in its narrow form, in
 * the Rx pad's own section frame, with one thing only this panel has: the
 * light drawer a citation opens, so the original page can be read without
 * leaving the prescription.
 *
 * Two tabs here, Data and Documents. The course of each stay is already the
 * Hospital Course section at the foot of Data, so a Timeline tab would only
 * say it twice.
 */
const RAIL_TABS = ["data", "documents"];

export default function ArchivedRecordsRailPanel({ onOpenReview, kit = {}, summary = false }) {
  // Opening the panel clears the red dot on the rail's Case File icon.
  useEffect(() => {
    archivedRecordsStore.markRailSeen();
  }, []);
  const openReview = () => {
    archivedRecordsStore.closeQuickView();
    onOpenReview?.();
  };
  return (
    <>
      <CaseFileRecord host="rail" quick tabs={RAIL_TABS} summary={summary} RxSection={kit.RxSection} onOpenReview={openReview} />
      <ArchivedRecordsSourceDrawer />
    </>
  );
}
