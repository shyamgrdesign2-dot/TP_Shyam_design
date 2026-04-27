/**
 * SecondarySidebar — NavPanel + optional ContentPanel.
 */
import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { NavPanel } from "./NavPanel";
import { ContentPanel } from "./ContentPanel";
import styles from "./SecondarySidebar.module.scss";
import { RxPadChromeContext } from "../rxpad-chrome-context";

const RX_SIDEBAR_IDS = new Set([
"pastVisits",
"vitals",
"history",
"gynec",
"obstetric",
"vaccine",
"growth",
"medicalRecords",
"labResults",
"personalNotes",
"dental",
"ophthal",
"dentalPlan"]
);

export function SecondarySidebar() {
  const [searchParams] = useSearchParams();
  const chrome = useContext(RxPadChromeContext);
  const [localActiveId, setLocalActiveId] = useState(null);
  const rxSidebarParam = searchParams?.get("rxSidebar") ?? null;

  const activeId = chrome ? chrome.secondarySidebarActiveId : localActiveId;

  useEffect(() => {
    if (!rxSidebarParam || !RX_SIDEBAR_IDS.has(rxSidebarParam)) return;
    if (chrome) {
      chrome.setSecondarySidebarActiveId(rxSidebarParam);
    } else {
      setLocalActiveId(rxSidebarParam);
    }
    // Only react to URL changes — not chrome identity — so closing the panel is not undone on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rxSidebarParam]);

  function handleSelect(id) {
    if (chrome) {
      chrome.toggleSecondarySidebar(id);
    } else {
      setLocalActiveId((prev) => prev === id ? null : id);
    }
  }

  function handleClose() {
    if (chrome) {
      chrome.setSecondarySidebarActiveId(null);
    } else {
      setLocalActiveId(null);
    }
  }

  return (
    <div className={styles.root}>
      <NavPanel active={activeId} onSelect={handleSelect} />
      {activeId ?
      <ContentPanel activeId={activeId} onClose={handleClose} /> :
      null}
    </div>);

}