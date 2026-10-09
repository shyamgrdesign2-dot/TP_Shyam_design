/**
 * useStickyActionEdge — toggles a sticky action-column shadow when a horizontally
 * scrollable table can still scroll further right. Shared by the findings and
 * oral examination tables.
 *
 * @param {*} depKey - value that re-runs the overflow check when it changes
 *   (typically the row count).
 * @returns {{ wrapRef: import("react").RefObject<HTMLElement>, showEdge: boolean }}
 */
import { useEffect, useRef, useState } from "react";

export function useStickyActionEdge(depKey) {
  const wrapRef = useRef(null);
  const [showEdge, setShowEdge] = useState(false);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      setShowEdge(false);
      return;
    }
    const update = () => {
      const maxScroll = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
      const hasOverflow = wrap.scrollWidth > wrap.clientWidth + 1;
      setShowEdge(hasOverflow && wrap.scrollLeft < maxScroll - 0.5);
    };
    update();
    wrap.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(update);
      ro.observe(wrap);
      const t = wrap.querySelector("table");
      if (t) ro.observe(t);
    }
    return () => {
      wrap.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, [depKey]);
  return { wrapRef, showEdge };
}
