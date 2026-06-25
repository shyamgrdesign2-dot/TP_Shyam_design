import React from "react";
import { Grid5, Ram } from "iconsax-reactjs";
import ui from "./ExaminationTab.ui.module.scss";

/**
 * Shared chrome for SingleToothPanel and OralExamPanel:
 * thumbnail + title/badge header, action buttons, and panel body wrapper.
 *
 * The clear button and its confirmation dialog differ between panels, so the
 * caller supplies `clearSection` as a ReactNode (Eraser button + dialog).
 */
export function PanelShell({ thumbnail, title, titleStyle, badge, onSave, saveDisabled, onClose, clearSection, templateSection, children }) {
  return (
    <div className={ui.panelRoot}>
      <header className={ui.panelHeader}>
        <div className={ui.panelHeaderRow}>
          <div className={ui.panelHeaderLeft}>
            <div className={ui.panelThumb}>{thumbnail}</div>
            <div className={ui.panelTitleBlock}>
              <div className={ui.panelTitleRow}>
                <h3 className={ui.panelTitle} style={titleStyle}>{title}</h3>
                {badge && <span className={ui.panelBadge}>{badge}</span>}
              </div>
            </div>
          </div>
          <div className={ui.panelHeaderActions}>
            {templateSection ?? (
              <button type="button" className={ui.panelIconBtn} title="Template">
                <Grid5 color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
              </button>
            )}
            {/* <button type="button" className={ui.panelIconBtn} title="Save" onClick={onSave} disabled={saveDisabled}>
              <Ram color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
            </button> */}
            {clearSection}
            <div className={ui.panelDivider} />
            <button type="button" onClick={onClose} className={ui.panelCloseBtn} title="Close panel">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256">
                <rect width="256" height="256" fill="none" />
                <polyline points="192 104 152 104 152 64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <line x1="208" y1="48" x2="152" y2="104" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <polyline points="64 152 104 152 104 192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <line x1="48" y1="208" x2="104" y2="152" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <polyline points="152 192 152 152 192 152" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <line x1="208" y1="208" x2="152" y2="152" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <polyline points="104 64 104 104 64 104" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                <line x1="48" y1="48" x2="104" y2="104" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <div className={ui.panelBody}>
        {children}
      </div>
    </div>
  );
}
