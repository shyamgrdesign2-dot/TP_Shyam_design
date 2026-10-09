import { useState, useEffect } from 'react';

// Compact prescription header for narrow desktops (e.g. 11.6" / 1366px laptops).
// Intentionally separate from useTabletViewport to avoid app-wide layout side effects.
const COMPACT_PRESCRIPTION_HEADER_QUERY =
  '(min-width: 600px) and (max-width: 1440px)';

export function useCompactPrescriptionHeader() {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(COMPACT_PRESCRIPTION_HEADER_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(COMPACT_PRESCRIPTION_HEADER_QUERY);
    const update = (e) => setIsCompact(e.matches);

    mql.addEventListener('change', update);

    return () => mql.removeEventListener('change', update);
  }, []);

  return isCompact;
}

export default useCompactPrescriptionHeader;
