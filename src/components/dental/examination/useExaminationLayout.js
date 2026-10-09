import { useEffect, useRef, useState } from "react";

/**
 * useExaminationLayout — owns the resizable side-panel split state for the
 * ExaminationTab. Persists separate widths for dentition vs single-tooth views
 * in localStorage (UI-only state; safe to persist).
 *
 * @param {{ isSingle: boolean, isOral: boolean }} params
 * @returns {{
 *   containerRef: React.RefObject,
 *   asidePct: number,
 *   canvasPct: number,
 *   dragging: boolean,
 *   setDragging: (v: boolean) => void,
 * }}
 */
export function useExaminationLayout({ isSingle, isOral }) {
  const containerRef = useRef(null);
  // Separate persisted widths for dentition vs single-tooth. Both draggable 40-60.
  // Defer localStorage read to useEffect so SSR + first client render match.
  // Default: dentition 35% (canvas takes 65%); single-tooth 65% content / 35% canvas.
  const [dentitionAsidePct, setDentitionAsidePct] = useState(35);
  const [singleAsidePct, setSingleAsidePct] = useState(65);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const defaultSingle = 65;
    setSingleAsidePct(defaultSingle);
    const d = parseFloat(
      window.localStorage.getItem("dental.aside.pct.dentition") ?? ""
    );
    if (Number.isFinite(d) && d >= 30 && d <= 40) setDentitionAsidePct(d);
    const s = parseFloat(
      window.localStorage.getItem("dental.aside.pct.single") ?? ""
    );
    if (Number.isFinite(s) && s >= 50 && s <= 70) setSingleAsidePct(s);
  }, []);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const x = e.clientX;
      const r = el.getBoundingClientRect();
      const [min, max] = (isSingle || isOral) ? [50, 70] : [30, 40];
      // Panel is on the RIGHT now → measure from right edge.
      const pct = Math.min(max, Math.max(min, (r.right - x) / r.width * 100));
      if (isSingle || isOral) setSingleAsidePct(pct); else
        setDentitionAsidePct(pct);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove, {
      passive: false
    });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, isSingle, isOral]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "dental.aside.pct.dentition",
        String(dentitionAsidePct)
      );
    }
  }, [dentitionAsidePct]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "dental.aside.pct.single",
        String(singleAsidePct)
      );
    }
  }, [singleAsidePct]);
  const asidePct = (isSingle || isOral) ? singleAsidePct : dentitionAsidePct;
  const canvasPct = 100 - asidePct;

  return { containerRef, asidePct, canvasPct, dragging, setDragging };
}
