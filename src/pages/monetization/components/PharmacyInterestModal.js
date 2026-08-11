import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal } from "antd";

import { INDIAN_MOBILE_REGEX } from "../utils/pharmacyInterest";

/** Allow letters, digits, spaces, and common name/clinic punctuation. */
const sanitizeTextField = (value) =>
  value.replace(/[^\p{L}\p{N}\s.'&\-/]/gu, "");

const PharmacyInterestModal = ({
  open,
  onClose,
  onSubmit,
  submitting = false,
}) => {
  const [formName, setFormName] = useState("");
  const [formClinic, setFormClinic] = useState("");
  const [formMobileNo, setFormMobileNo] = useState("");
  const [touched, setTouched] = useState({
    form_name: false,
    form_clinic: false,
    form_mobile_no: false,
  });

  useEffect(() => {
    if (!open) {
      setFormName("");
      setFormClinic("");
      setFormMobileNo("");
      setTouched({
        form_name: false,
        form_clinic: false,
        form_mobile_no: false,
      });
    }
  }, [open]);

  const errors = useMemo(() => {
    const next = {};
    if (!formName.trim()) {
      next.form_name = "Name is required";
    }
    if (!formClinic.trim()) {
      next.form_clinic = "Clinic name is required";
    }
    if (!formMobileNo.trim()) {
      next.form_mobile_no = "Mobile number is required";
    } else if (!INDIAN_MOBILE_REGEX.test(formMobileNo.trim())) {
      next.form_mobile_no = "Enter a valid 10-digit mobile number";
    }
    return next;
  }, [formName, formClinic, formMobileNo]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    setTouched({
      form_name: true,
      form_clinic: true,
      form_mobile_no: true,
    });
    if (!isValid || submitting) return;
    onSubmit({
      form_name: formName.trim(),
      form_clinic: formClinic.trim(),
      form_mobile_no: formMobileNo.trim(),
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
      title="Confirm your details"
      width={420}
    >
      <div className="d-flex flex-column gap-3 mt-2">
        <div>
          <label className="fs-14 fw-medium mb-1 d-block">Name</label>
          <Input
            value={formName}
            placeholder="Enter name"
            maxLength={100}
            onChange={(e) => setFormName(sanitizeTextField(e.target.value))}
            onBlur={() => setTouched((t) => ({ ...t, form_name: true }))}
            status={touched.form_name && errors.form_name ? "error" : undefined}
          />
          {touched.form_name && errors.form_name && (
            <div className="text-danger fs-12 mt-1">{errors.form_name}</div>
          )}
        </div>

        <div>
          <label className="fs-14 fw-medium mb-1 d-block">Mobile number</label>
          <Input
            value={formMobileNo}
            placeholder="Enter 10-digit mobile number"
            maxLength={10}
            inputMode="numeric"
            onChange={(e) =>
              setFormMobileNo(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            onBlur={() => setTouched((t) => ({ ...t, form_mobile_no: true }))}
            status={
              touched.form_mobile_no && errors.form_mobile_no ? "error" : undefined
            }
          />
          {touched.form_mobile_no && errors.form_mobile_no && (
            <div className="text-danger fs-12 mt-1">{errors.form_mobile_no}</div>
          )}
        </div>

        <div>
          <label className="fs-14 fw-medium mb-1 d-block">Clinic name</label>
          <Input
            value={formClinic}
            placeholder="Enter clinic name"
            maxLength={150}
            onChange={(e) => setFormClinic(sanitizeTextField(e.target.value))}
            onBlur={() => setTouched((t) => ({ ...t, form_clinic: true }))}
            status={
              touched.form_clinic && errors.form_clinic ? "error" : undefined
            }
          />
          {touched.form_clinic && errors.form_clinic && (
            <div className="text-danger fs-12 mt-1">{errors.form_clinic}</div>
          )}
        </div>

        <Button
          className="btn btn-proceed btn-primary3 w-100 align-items-center justify-content-center d-flex mt-2"
          onClick={handleSubmit}
          disabled={!isValid || submitting}
        >
          Try Pharmacy
        </Button>
      </div>
    </Modal>
  );
};

export default React.memo(PharmacyInterestModal);
