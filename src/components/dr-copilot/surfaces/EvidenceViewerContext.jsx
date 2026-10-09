import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Where a citation opens.
 *
 * Following a citation should not narrow the doctor's view of the evidence to
 * the one row they clicked - it should open the whole cited set with that row
 * expanded and scrolled to, so "what else did this come from?" is already
 * answered on screen.
 *
 * The sidebar overlays the page from the right edge rather than splitting the
 * panel, because checking a citation is a comparison - does this match what I
 * wrote? - and the answer must stay legible behind it. Nothing is dimmed.
 */

const EvidenceViewerContext = createContext(null);

export function EvidenceViewerProvider({ children }) {
  const [state, setState] = useState(null);

  /* `cited` and `documents` come from the card that owns the answer, because
     only it knows which phrases were marked and therefore what to highlight. */
  const open = useCallback(({ cited, documents, number }) => {
    setState({ cited: cited || [], documents: documents || {}, activeNumber: number });
  }, []);

  const select = useCallback(
    (number) => setState((prev) => (prev ? { ...prev, activeNumber: number } : prev)),
    []
  );

  const close = useCallback(() => setState(null), []);

  const value = useMemo(
    () => ({ available: true, state, open, select, close }),
    [state, open, select, close]
  );

  return (
    <EvidenceViewerContext.Provider value={value}>{children}</EvidenceViewerContext.Provider>
  );
}

/** Null when no viewer is mounted, so callers can fall back to inline. */
export function useEvidenceViewer() {
  return useContext(EvidenceViewerContext);
}
