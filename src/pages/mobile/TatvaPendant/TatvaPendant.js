import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { TatvaPendantProvider } from './context/TatvaPendantContext';
import BottomNavigation from './components/BottomNavigation';
import NeoGlobalCleanup from '../../../components/neo/NeoGlobalCleanup';
import Home from './Home';
import Captures from './Captures';
import CaptureDetail from './CaptureDetail';
import './TatvaPendant.scss';

function getActiveTab(pathname) {
  if (pathname.includes('/captures')) return 'captures';
  if (/\/tatva-pendant\/?$/.test(pathname)) return 'home';
  return '';
}

function TatvaPendantRoutes() {
  const { pathname } = useLocation();
  const activeTab = getActiveTab(pathname);
  const hideBottomNav = /\/tatva-pendant\/captures\/.+/.test(pathname);
  return (
    <div className="mobile-tatva-pendant">
      <div className="tp-ambient-bg" aria-hidden>
        <span className="tp-ambient-bg__mid" />
      </div>
      <Routes>
        <Route index element={<Home />} />
        <Route path="captures" element={<Captures />} />
        <Route path="captures/:captureId" element={<CaptureDetail />} />
        <Route path="*" element={<Navigate to="/tatva-pendant" replace />} />
      </Routes>
      {!hideBottomNav && <BottomNavigation activeTab={activeTab} />}
    </div>
  );
}

function TatvaPendant() {
  return (
    <TatvaPendantProvider>
      <NeoGlobalCleanup />
      <TatvaPendantRoutes />
    </TatvaPendantProvider>
  );
}

export default TatvaPendant;
