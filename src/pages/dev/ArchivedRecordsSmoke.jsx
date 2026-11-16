import React, { useState } from 'react';
import { SegmentedControl } from '@dhspl-tatvacare/tesseract-ui';
import { ArchivedRecordsDrawer, ArchivedRecordsWorkspace, FEATURE_NAME, useArchivedRecords } from '../../components/archived-records';
import AiDraftBadge from '../../components/archived-records/AiDraftBadge';
import { fileDetails, fileLine } from '../../components/archived-records/ArchivedRecordsWorkspace';
import SampleRxPad from './SampleRxPad';
import '../../components/sideNavbar/sideNavbar.css';
import './ArchivedRecordsSmoke.scss';

// Local design QA only. Mock data, no clinical actions connected.
const VIEWS = [
  { value: 'workspace', label: 'Review workspace' },
  { value: 'rail', label: 'Rx pad panel' },
];

export default function ArchivedRecordsSmoke() {
  const [view, setView] = useState('workspace');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { bundle } = useArchivedRecords();
  return (
    <div className="ars-root" data-view={view}>
      <div className="ars-bar">
        <div className="ars-title">
          <strong>{FEATURE_NAME}</strong>
          <AiDraftBadge details={fileDetails(bundle)} />
          <span>{fileLine(bundle)}</span>
        </div>
        <SegmentedControl options={VIEWS} value={view} onValueChange={setView} size="sm" />
      </div>
      {view === 'workspace' ? (
        <div className="ars-stage">
          <ArchivedRecordsWorkspace reviewerName="Dr. Demo" variant="page" header="banner" />
        </div>
      ) : (
        <div className="ars-rail-stage">
          <SampleRxPad onOpenReview={() => setDrawerOpen(true)} />
          <ArchivedRecordsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} reviewerName="Dr. Demo" />
        </div>
      )}
    </div>
  );
}
