import React, { useState } from 'react';
import { Button } from 'antd';
import { hardRefresh } from '../utils/hardRefresh';

export default function UpdateBanner({ updateAvailable }) {
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <header className="update-banner">
      <p className="update-banner__message">
        A new version of the application is available. Please refresh now to avoid potential issues.
      </p>
      <div className="update-banner__actions">
        <Button
          type="primary"
          ghost
          size="small"
          onClick={hardRefresh}
          className="update-banner__refresh-btn"
        >
          Refresh now
        </Button>
        <Button
          type="text"
          size="small"
          onClick={() => setDismissed(true)}
          className="update-banner__dismiss-btn"
        >
          Dismiss
        </Button>
      </div>
    </header>
  );
}
