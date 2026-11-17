import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArchivedRecordsDrawer, ArchivedRecordsWorkspace, CaseFileRecord } from '../../components/archived-records';
import ArchivedRecordsSourceDrawer from '../../components/archived-records/ArchivedRecordsSourceDrawer';
import SampleRxPad from './SampleRxPad';
import '../../components/sideNavbar/sideNavbar.css';
import './ArchivedRecordsSmoke.scss';

// Design preview on sample data; no clinical actions are connected.
// Each place the Case File lives has its own link, with nothing around it:
//
//   /dev/archived-records            the review workspace
//   /dev/archived-records/rx-pad     a sample Rx pad; Case File is in the blue sidebar
//   /dev/archived-records/record     the record on its own, as another screen
//                                    or another EMR would place it
const viewOf = (pathname) => {
  const part = pathname.replace(/\/+$/, '').split('/')[3] || 'review';
  return ['rx-pad', 'record'].includes(part) ? part : 'review';
};

export default function ArchivedRecordsSmoke() {
  const view = viewOf(useLocation().pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openReview = () => setDrawerOpen(true);

  if (view === 'rx-pad') {
    return (
      <div className="ars-root" data-view="rx-pad">
        <SampleRxPad onOpenReview={openReview} />
        <ArchivedRecordsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} reviewerName="Dr. Demo" />
      </div>
    );
  }

  if (view === 'record') {
    return (
      <div className="ars-root" data-view="record">
        <div className="ars-record">
          <CaseFileRecord heading quick onOpenReview={openReview} />
        </div>
        <ArchivedRecordsSourceDrawer />
        <ArchivedRecordsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} reviewerName="Dr. Demo" />
      </div>
    );
  }

  return (
    <div className="ars-root" data-view="review">
      <div className="ars-stage">
        <ArchivedRecordsWorkspace reviewerName="Dr. Demo" variant="page" header="inline" />
      </div>
    </div>
  );
}
