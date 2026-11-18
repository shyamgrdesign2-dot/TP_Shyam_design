import React from "react";
import CaseFileRecord from "./CaseFileRecord";

/**
 * Structured record: the file, for reading.
 *
 * This tab is the shared Case File record (CaseFileRecord), the same piece the
 * Rx pad panel shows: the notice, then the details under their section
 * headings and tags, with its own search over the record. No summary and no
 * tabs: here the record sits beside the original pages for comparison.
 *
 * Nothing is decided here. A section name jumps to that kind of data under
 * Review data, where it is verified, corrected or removed.
 */
export default function RecordTab({ onOpenDomain, onReview }) {
  return <CaseFileRecord tabs={false} onOpenReview={onReview} onOpenDomain={onOpenDomain} />;
}
