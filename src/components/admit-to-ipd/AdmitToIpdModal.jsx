import React, { useEffect, useState } from "react";
import { Button, Drawer, Select, Spin, message } from "antd";
import { handleAdmitToIpd } from "../../utils/utils";
import "./AdmitToIpdModal.css";

export const ADMISSION_CATEGORY_OPTIONS = [
  "EMERGENCY",
  "DAY CARE",
  "PROCEDURE",
  "SURGERY",
  "OBSERVATION",
  "MEDICAL MANAGEMENT",
  "ROUTINE",
  "OPD DAY CARE",
];

export const ADMISSION_REQUEST_REASON_OPTIONS = [
  "Medical Management",
  "Chemo",
  "Surgery Advance",
];

const toSelectOptions = (items) =>
  items.map((item) => ({
    label: item,
    value: item,
  }));

function AdmitToIpdModal({ open, patientRecord, onClose }) {
  const [admissionCategory, setAdmissionCategory] = useState();
  const [admissionReason, setAdmissionReason] = useState();
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = Boolean(admissionCategory && admissionReason);
  const patientName =
    patientRecord?.pm_fullname || patientRecord?.patientName || "Patient";
  const mrno =
    patientRecord?.mrno ||
    patientRecord?.pm_reference_id ||
    patientRecord?.tpml_refrence_id ||
    patientRecord?.pm_pid ||
    "";
  const encounterId = patientRecord?.encounterId || patientRecord?.pam_ref_id || "";

  useEffect(() => {
    if (open) {
      setAdmissionCategory(undefined);
      setAdmissionReason(undefined);
    }
  }, [open, patientRecord]);

  const handleSubmit = async () => {
    if (!admissionCategory || !admissionReason) {
      message.error("Select admission category and request reason");
      return;
    }

    setSubmitting(true);
    try {
      await handleAdmitToIpd(patientRecord, {
        admissionCategoryEnumVal: admissionCategory,
        admissionRequestReasonEnumVal: admissionReason,
      });
      message.success("Admission request submitted successfully");
      onClose();
    } catch (error) {
      message.error(error?.message || "Failed to submit admission request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer
        title="Admit to IPD"
        placement="right"
        open={open}
        onClose={submitting ? undefined : onClose}
        className="admit-to-ipd-drawer"
        width={430}
        push={false}
        maskClosable={!submitting}
        keyboard={!submitting}
      >
        <div className="admit-to-ipd-form">
          <div className="admit-to-ipd-summary">
            <div className="admit-to-ipd-patient-name">{patientName}</div>
            <div className="admit-to-ipd-patient-meta">
              <span>MRN: {mrno || "--"}</span>
              <span>Encounter: {encounterId || "--"}</span>
            </div>
          </div>

          <div className="admit-to-ipd-field">
            <label className="admit-to-ipd-label">Admission Category</label>
            <Select
              className="admit-to-ipd-select"
              placeholder="Select category"
              value={admissionCategory}
              onChange={setAdmissionCategory}
              options={toSelectOptions(ADMISSION_CATEGORY_OPTIONS)}
              disabled={submitting}
            />
          </div>

          <div className="admit-to-ipd-field">
            <label className="admit-to-ipd-label">Request Reason</label>
            <Select
              className="admit-to-ipd-select"
              placeholder="Select reason"
              value={admissionReason}
              onChange={setAdmissionReason}
              options={toSelectOptions(ADMISSION_REQUEST_REASON_OPTIONS)}
              disabled={submitting}
            />
          </div>

          <div className="admit-to-ipd-actions">
            <Button onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="primary" onClick={handleSubmit} disabled={submitting || !canSubmit}>
              Submit
            </Button>
          </div>
        </div>
      </Drawer>

      {submitting && (
        <div className="admit-to-ipd-loader-overlay">
          <div className="admit-to-ipd-loader-card">
            <Spin size="large" />
            <span>Submitting admission request...</span>
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(AdmitToIpdModal);
