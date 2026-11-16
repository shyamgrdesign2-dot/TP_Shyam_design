import React from "react";
import CaseFileRecord from "./CaseFileRecord";

/**
 * Structured record: the file, for reading.
 *
 * This tab is the shared Case File record (CaseFileRecord), the same piece the
 * Rx pad panel shows: the notice, then the details under their section
 * headings and tags. No summary and no tabs: here the record sits beside the
 * original pages for comparison, the workspace has its own search and its own
 * Documents tab, and a timeline adds nothing to that.
 *
 * Nothing is decided here. A section name jumps to that kind of data under
 * Clinical data, where it is verified, corrected or removed.
 */
export default function RecordTab({ onOpenDomain, onReview }) {
  return <CaseFileRecord search={false} tabs={false} onOpenReview={onReview} onOpenDomain={onOpenDomain} />;
}
