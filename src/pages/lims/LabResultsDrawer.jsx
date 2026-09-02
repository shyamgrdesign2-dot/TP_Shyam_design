import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Drawer } from "antd";
import { CloseOutlined, SettingOutlined } from "@ant-design/icons";
import { TesseractThemeProvider } from "@dhspl-tatvacare/tesseract-ui";
import LabParams from "../../components/LabParams";
import { getPatientLastVisitDoctorUmId } from "../../utils/labResultsUtils";
import { notifyCustomInvestigationsChanged, setCustomInvestigationAttendingDoctor } from "../../api/services/ApiCustomInvestigation";
import { InvestigationSettingsPanel } from "./InvestigationSettingsPage";
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
    setCustomInvestigationAttendingDoctor(attendingDoctorUmId);
    return () => setCustomInvestigationAttendingDoctor(undefined);
  }, [attendingDoctorUmId]);

  useEffect(() => {
    if (!open) setIsInvestigationSettingsOpen(false);
  }, [open]);

  const handleSave = useCallback(() => {
    const btn = bodyRef.current?.querySelector(".modalCard-header .btn-primary3");
    if (btn) btn.click();
  }, []);

  const handleSettingsClose = useCallback(() => {
    setIsInvestigationSettingsOpen(false);
    notifyCustomInvestigationsChanged();
  }, []);

  if (!patient) return null;
  return (
    <>
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
            >
              <SettingOutlined style={{ fontSize: 18 }} />
            </button>
            <Button
              type="primary"
              className="btn btn-primary3 px-4"
              onClick={handleSave}
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
          />
        </div>
      </Drawer>

      <Drawer
        closeIcon={false}
        className="lims-settings-drawer"
        placement="right"
        width="60%"
        open={open && isInvestigationSettingsOpen}
        onClose={handleSettingsClose}
        destroyOnClose
        zIndex={1100}
      >
        <TesseractThemeProvider colorScheme="light">
          <div data-tp-theme="light" className="lims-settings-theme">
            <InvestigationSettingsPanel onClose={handleSettingsClose} />
          </div>
        </TesseractThemeProvider>
      </Drawer>
    </>
  );
}
