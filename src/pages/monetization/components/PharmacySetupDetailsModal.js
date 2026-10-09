import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal } from "antd";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shown when a pharmacy is about to be provisioned for the first time — either because the
 * launch call reported a missing field (most commonly email, since many TatvaPractice profiles
 * never had one collected), or simply so the doctor can name their new pharmacy before it's
 * created. Organisation and branch name are always editable here; email is shown only when the
 * backend actually reports it missing (a repeat click for an already-provisioned pharmacy never
 * reaches this modal at all).
 *
 * @param {string[]} missingFields - field keys the backend reported as missing, e.g. ["email"]
 * @param {string} defaultName - the clinic's own name, prefilled into both name fields
 */
const PharmacySetupDetailsModal = ({
  open,
  onClose,
  onSubmit,
  submitting = false,
  missingFields = [],
  defaultName = "",
}) => {
  const needsEmail = missingFields.includes("email");

  const [organizationName, setOrganizationName] = useState(defaultName);
  const [branchName, setBranchName] = useState(defaultName);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState({
    organizationName: false,
    branchName: false,
    email: false,
  });

  useEffect(() => {
    if (open) {
      setOrganizationName(defaultName);
      setBranchName(defaultName);
      setEmail("");
      setTouched({ organizationName: false, branchName: false, email: false });
    }
  }, [open, defaultName]);

  const errors = useMemo(() => {
    const next = {};
    if (!organizationName.trim()) {
      next.organizationName = "Organisation name is required";
    }
    if (!branchName.trim()) {
      next.branchName = "Branch name is required";
    }
    if (needsEmail) {
      if (!email.trim()) {
        next.email = "Email is required to send your login details";
      } else if (!EMAIL_REGEX.test(email.trim())) {
        next.email = "Enter a valid email address";
      }
    }
    return next;
  }, [organizationName, branchName, email, needsEmail]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    setTouched({ organizationName: true, branchName: true, email: true });
    if (!isValid || submitting) return;
    onSubmit({
      organizationName: organizationName.trim(),
      branchName: branchName.trim(),
      ...(needsEmail ? { email: email.trim().toLowerCase() } : {}),
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
      title="Set up your pharmacy"
      width={420}
    >
      <div className="d-flex flex-column gap-3 mt-2">
        <div>
          <label className="fs-14 fw-medium mb-1 d-block">
            Organisation name
          </label>
          <Input
            value={organizationName}
            placeholder="Enter organisation name"
            maxLength={150}
            onChange={(e) => setOrganizationName(e.target.value)}
            onBlur={() =>
              setTouched((t) => ({ ...t, organizationName: true }))
            }
            status={
              touched.organizationName && errors.organizationName
                ? "error"
                : undefined
            }
          />
          {touched.organizationName && errors.organizationName && (
            <div className="text-danger fs-12 mt-1">
              {errors.organizationName}
            </div>
          )}
        </div>

        <div>
          <label className="fs-14 fw-medium mb-1 d-block">Branch name</label>
          <Input
            value={branchName}
            placeholder="Enter branch name"
            maxLength={150}
            onChange={(e) => setBranchName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, branchName: true }))}
            status={
              touched.branchName && errors.branchName ? "error" : undefined
            }
          />
          {touched.branchName && errors.branchName && (
            <div className="text-danger fs-12 mt-1">{errors.branchName}</div>
          )}
        </div>

        {needsEmail && (
          <div>
            <label className="fs-14 fw-medium mb-1 d-block">Email</label>
            <Input
              value={email}
              placeholder="Enter your email"
              maxLength={150}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              status={touched.email && errors.email ? "error" : undefined}
            />
            {touched.email && errors.email && (
              <div className="text-danger fs-12 mt-1">{errors.email}</div>
            )}
            <div className="fs-12 text-muted mt-1">
              Your pharmacy login details will be sent here.
            </div>
          </div>
        )}

        <Button
          className="btn btn-proceed btn-primary3 w-100 align-items-center justify-content-center d-flex mt-2"
          onClick={handleSubmit}
          disabled={!isValid || submitting}
        >
          {submitting ? "Setting up..." : "Continue"}
        </Button>
      </div>
    </Modal>
  );
};

export default React.memo(PharmacySetupDetailsModal);
