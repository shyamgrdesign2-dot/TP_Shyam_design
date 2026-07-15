import React, { useCallback, useRef } from "react";
import { Button, Drawer } from "antd";
import { CloseOutlined, PrinterOutlined } from "@ant-design/icons";
import LabParams from "../../components/LabParams";
import { printPatientResults } from "./limsPrint";
import "./LabResultsDrawer.css";

export default function LabResultsDrawer({ open, patient, onClose, onSaved }) {
  const bodyRef = useRef(null);

  const handleSave = useCallback(() => {
    const btn = bodyRef.current?.querySelector(".modalCard-header .btn-primary3");
    if (btn) btn.click();
  }, []);

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
          <Button type="primary" className="btn btn-primary3 px-4" onClick={handleSave} style={{ minWidth: 100 }}>
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
        />
      </div>
    </Drawer>
  );
}
