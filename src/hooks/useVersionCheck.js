import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { hardRefresh } from '../utils/hardRefresh';
import { DENTAL_RX_PRINT_VIEW_ROUTE } from '../utils/dentalRoutes';

const POLL_INTERVAL_MS = 5 * 60 * 1000;

// Routes where the user may have unsaved data — show banner instead of auto-reloading.
const PROTECTED_ROUTES = [
  '/prescription',
  '/smart-prescription',
  '/tab-rx-prescription',
  DENTAL_RX_PRINT_VIEW_ROUTE,
  '/voice-rx-consult',
  '/tab-rx'
];

function isProtected(pathname) {
  return PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
}

// IMPORTANT (server config): version.json MUST be served from the container
// with Cache-Control: no-store, no-cache headers. Do NOT let CDN/blob cache
// this file — stale responses will prevent update detection.
async function fetchDeployedApiVersion() {
  const res = await fetch(`/version.json?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  });
  if (!res.ok) throw new Error(`version.json ${res.status}`);
  const { apiVersion } = await res.json();
  if (apiVersion == null) throw new Error('missing apiVersion field');
  return apiVersion;
}

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const bootApiVersionRef = useRef(null);
  const checkingRef = useRef(false);
  // Survives banner dismiss — tracks that a breaking update was detected.
  const updatePendingRef = useRef(false);
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  // When user navigates to a safe route after a pending update, reload immediately.
  useEffect(() => {
    if (updatePendingRef.current && !isProtected(pathname)) {
      hardRefresh();
    }
  }, [pathname]);

  useEffect(() => {
    let mounted = true;
    let timer;

    const stop = () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };

    const handleMismatch = () => {
      updatePendingRef.current = true;
      stop();
      if (isProtected(pathnameRef.current)) {
        setUpdateAvailable(true); // show banner, preserve unsaved data
      } else {
        hardRefresh(); // safe route — reload immediately
      }
    };

    const check = async () => {
      if (checkingRef.current || bootApiVersionRef.current == null) return;
      checkingRef.current = true;
      try {
        const latest = await fetchDeployedApiVersion();
        if (mounted && latest !== bootApiVersionRef.current) {
          handleMismatch();
        }
      } catch (_) {
        // network hiccup — try again next interval
      } finally {
        checkingRef.current = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };

    // Capture the apiVersion active when this session started
    fetchDeployedApiVersion()
      .then((v) => { if (mounted) bootApiVersionRef.current = v; })
      .catch(() => {}); // version.json absent in dev — skip silently

    timer = setInterval(check, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted = false;
      stop();
    };
  }, []);

  return { updateAvailable };
}
