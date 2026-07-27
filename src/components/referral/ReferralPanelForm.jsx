import React, { useEffect, useMemo, useState } from "react";
import { AutoComplete, Input } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { listDoctor } from "../../redux/bulkMessagesSlice";
import "./ReferralPanelForm.scss";

const { TextArea } = Input;

export const EMPTY_REFERRAL_DATA = {
  um_id: null,
  um_name: "",
  dp_id: null,
  department_name: "",
  reason_for_cross_consult: "",
};

const formatDoctorLabel = (umName, departmentName) => {
  if (!umName) return "";
  return departmentName ? `${umName} (${departmentName})` : umName;
};

function ReferralPanelForm({
  value = EMPTY_REFERRAL_DATA,
  onChange,
  className = "",
  variant = "tabRx",
}) {
  const dispatch = useDispatch();
  const { doctorList } = useSelector((state) => state.bulkMessages);
  const { userId } = useSelector((state) => state.doctors);
  const [searchQuery, setSearchQuery] = useState("");
  const referral = value || EMPTY_REFERRAL_DATA;

  useEffect(() => {
    if (!doctorList?.length) {
      dispatch(listDoctor());
    }
  }, [dispatch, doctorList?.length]);

  const doctorInputValue =
    searchQuery || formatDoctorLabel(referral.um_name, referral.department_name);

  const options = useMemo(
    () =>
      (doctorList || [])
        .filter((doctor) => String(doctor.um_id) !== String(userId))
        .map((doctor) => ({
          value: formatDoctorLabel(doctor.um_name, doctor.department_name),
          key: `${doctor.um_id}-${doctor.dp_id}`,
          doctor,
        })),
    [doctorList, userId]
  );

  const updateReferral = (patch) => {
    onChange?.({ ...referral, ...patch });
  };

  const doctorField = (
    <div className="referral-field">
      <label className="referral-field-label" htmlFor="referral-doctor-search">
        Doctor
      </label>
      <AutoComplete
        id="referral-doctor-search"
        className="referral-doctor-search w-100"
        value={doctorInputValue}
        options={options}
        onSearch={(query) => {
          setSearchQuery(query);
          if (!query.trim()) {
            updateReferral({
              um_id: null,
              um_name: "",
              dp_id: null,
              department_name: "",
            });
          }
        }}
        onSelect={(_, option) => {
          const doctor = option?.doctor;
          if (!doctor) return;
          setSearchQuery("");
          updateReferral({
            um_id: doctor.um_id,
            um_name: doctor.um_name || "",
            dp_id: doctor.dp_id ?? null,
            department_name: doctor.department_name || "",
          });
        }}
        onBlur={() => setSearchQuery("")}
      >
        <Input placeholder="Search by doctor or specialty" />
      </AutoComplete>
    </div>
  );

  const notesField = (
    <div className="referral-field">
      <label className="referral-field-label" htmlFor="referral-notes">
        Referral notes
      </label>
      <TextArea
        id="referral-notes"
        className="referral-notes-input"
        placeholder="Reason for referral, clinical context, instructions..."
        value={referral.reason_for_cross_consult || ""}
        onChange={(event) =>
          updateReferral({ reason_for_cross_consult: event.target.value })
        }
        rows={2}
      />
    </div>
  );

  return (
    <div
      className={`referral-panel-form ${
        variant === "sideNav" ? "referral-panel-form--side-nav" : ""
      } ${
        variant === "prescription" ? "referral-panel-form--prescription" : ""
      } ${className}`.trim()}
    >
      {variant === "prescription" ? (
        <div className="referral-fields-row">
          {doctorField}
          {notesField}
        </div>
      ) : (
        <>
          {doctorField}
          {notesField}
        </>
      )}
      <span className="opacity-08" style={{ fontSize: "12px" }}>
        This referral appears on the printed prescription.
      </span>
    </div>
  );
}

export default ReferralPanelForm;
