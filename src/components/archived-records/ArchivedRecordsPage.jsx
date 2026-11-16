import React from "react";
import AiDraftBadge from "./AiDraftBadge";
import ARCHIVED_RECORDS_MOCK from "./mock/archivedRecordsMock";
import ArchivedRecordsWorkspace, { fileDetails, fileLine } from "./ArchivedRecordsWorkspace";
import { FEATURE_NAME } from "./archivedRecordsName";
import styles from "./ArchivedRecords.module.scss";

/**
 * Case File as a tab of the patient details page.
 *
 * The page's violet banner carries the heading (name, AI-draft badge, the
 * one-line description of the file); the workspace below starts straight at
 * its toolbar. `caseFileBanner` gives the banner what to show.
 */
export const caseFileBanner = (bundle = ARCHIVED_RECORDS_MOCK) => ({
  title: (
    <span className={styles.bannerTitle}>
      {FEATURE_NAME}
      <AiDraftBadge onDark details={fileDetails(bundle)} />
    </span>
  ),
  subtitle: fileLine(bundle).replace(/^\(|\)$/g, ""),
});

export default function ArchivedRecordsPage({ reviewerName }) {
  return (
    <div className={styles.pageSlot}>
      <ArchivedRecordsWorkspace reviewerName={reviewerName} variant="page" header="banner" />
    </div>
  );
}
