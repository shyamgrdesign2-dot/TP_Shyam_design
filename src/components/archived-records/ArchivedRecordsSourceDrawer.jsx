import React from "react";
import { Button, Drawer, DrawerContent } from "@dhspl-tatvacare/tesseract-ui";
import { archivedRecordsStore, useArchivedRecords } from "./archivedRecordsStore";
import SourcePageViewer from "./SourcePageViewer";
import styles from "./ArchivedRecords.module.scss";

// The light drawer a page chip opens on the Rx pad: just the original page,
// scrollable through its whole document. No review tools in the way.
export default function ArchivedRecordsSourceDrawer({ onOpenReview }) {
  const { bundle, viewer, quickView } = useArchivedRecords();
  return (
    <Drawer open={quickView} onOpenChange={(next) => { if (!next) archivedRecordsStore.closeQuickView(); }}>
      <DrawerContent
        side="right"
        width="min(720px, 92vw)"
        bodyPadding={0}
        bodyClassName={styles.drawerBody}
        title="Source page"
        action={onOpenReview ? <Button variant="outline" theme="primary" size="sm" onClick={onOpenReview}>Review and save</Button> : null}
      >
        {quickView ? (
          <div className={styles.sourceOnly}>
            <SourcePageViewer
              bundle={bundle}
              page={viewer.page}
              rid={viewer.rid}
              jump={viewer.n}
              onPageChange={(page, rid) => archivedRecordsStore.openSource(page, rid)}
            />
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
