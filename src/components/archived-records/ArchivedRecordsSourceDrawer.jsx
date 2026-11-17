import React from "react";
import { Drawer, DrawerContent } from "@dhspl-tatvacare/tesseract-ui";
import { archivedRecordsStore, useArchivedRecords } from "./archivedRecordsStore";
import SourcePageViewer from "./SourcePageViewer";
import styles from "./ArchivedRecords.module.scss";

// The light drawer a page chip opens on the Rx pad: just the original page,
// scrollable through its whole document. Nothing about reviewing here (no
// "Review and save", no "Next to review"): the doctor is checking a source,
// not saving anything.
export default function ArchivedRecordsSourceDrawer() {
  const { bundle, viewer, quickView } = useArchivedRecords();
  return (
    <Drawer open={quickView} onOpenChange={(next) => { if (!next) archivedRecordsStore.closeQuickView(); }}>
      <DrawerContent
        side="right"
        width="min(720px, 92vw)"
        bodyPadding={0}
        bodyClassName={styles.drawerBody}
        title="Source page"
      >
        {quickView ? (
          <div className={styles.sourceOnly}>
            <SourcePageViewer
              bundle={bundle}
              page={viewer.page}
              rid={viewer.rid}
              jump={viewer.n}
              reviewTools={false}
              onPageChange={(page, rid) => archivedRecordsStore.openSource(page, rid)}
            />
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
