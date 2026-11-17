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
 * No tabs here: the panel is the data, under its search box. On the Rx pad a
 * doctor reads facts and opens a page from its citation; browsing the file
 * document by document belongs to the review and the record page, which
 * keep their Documents tab.
 */
const RAIL_TABS = ["data"];

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
