import React, { useState } from 'react';
import { Button, SegmentedControl } from '@dhspl-tatvacare/tesseract-ui';
import { ArchivedRecordsDrawer, ArchivedRecordsRailPanel, ArchivedRecordsWorkspace } from '../../components/archived-records';
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
  return (
    <div className="ars-root">
      <div className="ars-bar">
        <strong>Case File · design preview</strong>
        <SegmentedControl options={VIEWS} value={view} onValueChange={setView} size="sm" />
      </div>
      {view === 'workspace' ? (
        <div className="ars-stage">
          <ArchivedRecordsWorkspace reviewerName="Dr. Demo" variant="page" />
        </div>
      ) : (
        <div className="ars-rail-stage">
          <div className="ars-rail-panel">
            <div className="ars-rail-title">Case File</div>
            <div className="snv-content-scroll snv-archived-records-content">
              <ArchivedRecordsRailPanel onOpenReview={() => setDrawerOpen(true)} />
            </div>
          </div>
          <div className="ars-rail-pad">
            <p>Rx pad area (placeholder)</p>
            <Button variant="outline" theme="neutral" size="sm" onClick={() => setDrawerOpen(true)}>Open review drawer</Button>
          </div>
          <ArchivedRecordsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} reviewerName="Dr. Demo" />
        </div>
      )}
    </div>
  );
}
