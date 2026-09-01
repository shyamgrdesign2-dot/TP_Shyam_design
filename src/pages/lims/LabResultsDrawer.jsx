import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Drawer } from "antd";
import { CloseOutlined, SettingOutlined } from "@ant-design/icons";
import LabParams from "../../components/LabParams";
import { getPatientLastVisitDoctorUmId } from "../../utils/labResultsUtils";
import { printPatientResults } from "./limsPrint";
import "./LabResultsDrawer.css";

export default function LabResultsDrawer({
  open,
  patient,
  onClose,
  onSaved,
  isReceptionistSession = false,
}) {
  const bodyRef = useRef(null);
  const attendingDoctorUmId = getPatientLastVisitDoctorUmId(patient);
  const [isInvestigationSettingsOpen, setIsInvestigationSettingsOpen] = useState(false);

  useEffect(() => {
    if (!open) setIsInvestigationSettingsOpen(false);
  }, [open]);

  const handleSave = useCallback(() => {
    if (isInvestigationSettingsOpen) return;
    const btn = bodyRef.current?.querySelector(".modalCard-header .btn-primary3");
    if (btn) btn.click();
  }, [isInvestigationSettingsOpen]);

  const handlePrint = useCallback(() => {
    if (patient) printPatientResults(patient);
  }, [patient]);

  if (!patient) return null;
  return (
    <Drawer
      closeIcon={false}
      className="lims-lab-drawer"
      placement="right"
      width="60%"
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <div className="lims-drawer-header">
        <button
          type="button"
          className="lims-drawer-close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseOutlined />
        </button>
        <div className="lims-drawer-header-divider" />
        <span className="lims-drawer-title">Add Lab Results</span>
        <div className="lims-drawer-spacer" />
        <div className="lims-drawer-actions">
          {/* <Button onClick={handlePrint} icon={<PrinterOutlined />}>
            Print
          </Button> */}
          <button
            type="button"
            className="lims-drawer-settings"
            aria-label="Investigation Settings"
            title="Investigation Settings"
            onClick={() => setIsInvestigationSettingsOpen(true)}
            disabled={isInvestigationSettingsOpen}
          >
            <SettingOutlined style={{ fontSize: 18 }} />
          </button>
          <Button
            type="primary"
            className="btn btn-primary3 px-4"
            onClick={handleSave}
            disabled={isInvestigationSettingsOpen}
            title={
              isInvestigationSettingsOpen
                ? "Close Investigation Settings to save results"
                : undefined
            }
            style={{ minWidth: 100 }}
          >
            Save
          </Button>
        </div>
      </div>
      <div ref={bodyRef}>
        <LabParams
          handleAddLabParamsDrawer={onClose}
          patient_unique_id={patient.patient_unique_id}
          patientGender={patient.pm_gender}
          isBackModalOpen={false}
          showHideBackModal={onClose}
          onSave={() => onSaved?.()}
          attendingDoctorUmId={attendingDoctorUmId}
          isReceptionistSession={isReceptionistSession}
          investigationSettingsOpen={isInvestigationSettingsOpen}
          onInvestigationSettingsChange={setIsInvestigationSettingsOpen}
        />
      </div>
    </Drawer>
  );
}
