import React from "react";
import { Drawer, DrawerContent } from "@dhspl-tatvacare/tesseract-ui";
import AiDraftBadge from "./AiDraftBadge";
import { useArchivedRecords } from "./archivedRecordsStore";
import ArchivedRecordsWorkspace, { fileDetails, fileLine } from "./ArchivedRecordsWorkspace";
import { FEATURE_NAME } from "./archivedRecordsName";
import styles from "./ArchivedRecords.module.scss";

// Full-width review surface over the Rx pad. It opens on Clinical data,
// because "Review and save" is a request to verify, not to read again.
// The pad stays underneath, so the
// doctor closes this and is back where they were.
export default function ArchivedRecordsDrawer({ open, onOpenChange, reviewerName, onApprove }) {
  const { bundle } = useArchivedRecords();
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" width="min(1440px, 96vw)" bodyPadding={0} bodyClassName={styles.drawerBody} title={`${FEATURE_NAME} review`} description={fileLine(bundle).replace(/^\(|\)$/g, "")} action={<AiDraftBadge details={fileDetails(bundle)} />} header={null}>
        {open ? <ArchivedRecordsWorkspace reviewerName={reviewerName} onApprove={onApprove} initialTab="data" header="banner" /> : null}
      </DrawerContent>
    </Drawer>
  );
}
