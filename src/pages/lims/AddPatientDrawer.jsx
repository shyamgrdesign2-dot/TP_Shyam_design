import React, { useCallback, useMemo, useRef } from "react";
import { Button, Drawer } from "antd";
import LimsPatientForm from "./LimsPatientForm";
import "./AddPatientDrawer.css";

export default function AddPatientDrawer({ open, onClose, onSaved }) {
  const formRef = useRef(null);

  const handleSave = useCallback(() => {
    formRef.current?.save();
  }, []);

  const actions = useMemo(() => (
    <Button type="primary" className="btn btn-primary3 btn-41 px-4" onClick={handleSave}>
      Save Patient
    </Button>
  ), [handleSave]);

  return (
    <Drawer
      closeIcon={false}
      className="lims-add-patient-drawer"
      placement="right"
      width="85%"
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <div className="lims-add-patient-header">
        <div className="lims-add-patient-header-left">
          <button type="button" className="lims-add-patient-back" onClick={onClose}>
            <i className="icon-right" />
          </button>
          <div className="lims-add-patient-divider" />
          <span>Add New Patient</span>
        </div>
        {actions}
      </div>
      <div className="lims-add-patient-body">
        <LimsPatientForm ref={formRef} onSaved={onSaved} onClose={onClose} />
      </div>
    </Drawer>
  );
}
