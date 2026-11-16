import React from "react";
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
 */
export default function ArchivedRecordsRailPanel({ onOpenReview, kit = {}, summary = false }) {
  const openReview = () => {
    archivedRecordsStore.closeQuickView();
    onOpenReview?.();
  };
  return (
    <>
      <CaseFileRecord host="rail" quick summary={summary} RxSection={kit.RxSection} onOpenReview={openReview} />
      <ArchivedRecordsSourceDrawer onOpenReview={openReview} />
    </>
  );
}
