import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { Collapse, DatePicker, Input, Select, Segmented, Spin } from "antd";
import {
  addPatient,
  listSalutation,
  listBloodGroup,
  searchPincode,
} from "../../redux/appointmentsSlice";
import dayjs from "dayjs";
import styles from "./LimsPatientForm.module.css";

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const GENDER_SEGMENT_OPTIONS = GENDER_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
];

const BLOOD_FALLBACK = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const SALUTATION_MALE = ["Mr", "S/O"];
const SALUTATION_FEMALE = ["Miss", "Mrs", "Ms.", "D/O"];

function computeDob(years, months) {
  const now = dayjs();
  let d = now;
  if (years) d = d.subtract(Number(years), "year");
  if (months) d = d.subtract(Number(months), "month");
  return d.format("YYYY-MM-DD");
}

function LimsPatientForm({ onSaved, onClose }, ref) {
  const dispatch = useDispatch();
  const { salutationData, bloodGroupData } = useSelector(
    (s) => s.records
  );

  const [form, setForm] = useState({
    pm_salutation: "Mr",
    pm_fullname: "",
    pm_contact_no: "",
    pm_gender: "",
    ageYears: "",
    ageMonths: "",
    pm_dob: null,
    pm_reference_id: "",
    pm_blood_group: "",
    pm_married_status: "",
    pm_occupation: "",
    pm_email: "",
    pm_aadhar_card_number: "",
    pm_pincode: "",
    pm_city: "",
    pm_state: "",
    pm_address: "",
  });

  const [errors, setErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const fileInputRef = React.useRef(null);

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    dispatch(listSalutation());
    dispatch(listBloodGroup());
  }, [dispatch]);


  const set = useCallback((key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  const handleSalutationChange = useCallback(
    (val) => {
      set("pm_salutation", val);
      if (SALUTATION_MALE.includes(val) && form.pm_gender !== "Male") {
        set("pm_gender", "Male");
      } else if (
        SALUTATION_FEMALE.includes(val) &&
        form.pm_gender !== "Female"
      ) {
        set("pm_gender", "Female");
      }
    },
    [set, form.pm_gender]
  );

  const handleGenderChange = useCallback(
    (val) => {
      set("pm_gender", val);
      if (val === "Male" && !SALUTATION_MALE.includes(form.pm_salutation)) {
        set("pm_salutation", "Mr");
      } else if (
        val === "Female" &&
        !SALUTATION_FEMALE.includes(form.pm_salutation)
      ) {
        set("pm_salutation", "Ms.");
      }
    },
    [set, form.pm_salutation]
  );

  const handlePincodeChange = useCallback(
    (e) => {
      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
      set("pm_pincode", val);
      setPinError("");
      if (val.length < 6) {
        set("pm_city", "");
        set("pm_state", "");
        return;
      }
      setPinLoading(true);
      dispatch(searchPincode(val))
        .unwrap()
        .then((data) => {
          setPinLoading(false);
          const city = data.city || data.pm_city || "";
          const state = data.state || data.pm_state || "";
          if (!city && !state) {
            setPinError("Please enter a valid pincode");
            set("pm_city", "");
            set("pm_state", "");
            return;
          }
          set("pm_city", city);
          set("pm_state", state);
        })
        .catch(() => {
          setPinLoading(false);
          setPinError("Please enter a valid pincode");
          set("pm_city", "");
          set("pm_state", "");
        });
    },
    [set, dispatch]
  );

  const salutationOptions = useMemo(
    () =>
      (salutationData || []).map((s) => ({
        value: s.ts_name,
        label: s.ts_name,
      })),
    [salutationData]
  );

  const bloodOptions = useMemo(() => {
    const list =
      bloodGroupData && bloodGroupData.length > 0
        ? bloodGroupData.map((b) => b.tbg_name || b)
        : BLOOD_FALLBACK;
    return list.map((b) => ({ value: b, label: b }));
  }, [bloodGroupData]);

  const validate = useCallback(() => {
    const e = {};
    if (!form.pm_fullname.trim()) e.pm_fullname = "Name is required";
    if (!/^[0-9]{10}$/.test(form.pm_contact_no))
      e.pm_contact_no = "Enter a valid 10-digit number";
    if (!form.pm_gender) e.pm_gender = "Select gender";
    if (!form.ageYears && !form.ageMonths && !form.pm_dob)
      e.ageYears = "Enter age or date of birth";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    const dob = form.pm_dob
      ? dayjs(form.pm_dob).format("YYYY-MM-DD")
      : (form.ageYears || form.ageMonths)
        ? computeDob(form.ageYears, form.ageMonths)
        : "";

    const payload = {
      pm_salutation: form.pm_salutation || "",
      pm_fullname: form.pm_fullname.trim(),
      pm_contact_no: form.pm_contact_no,
      pm_gender: form.pm_gender,
      pm_dob: dob,
      pm_reference_id: form.pm_reference_id || "",
      pm_blood_group: form.pm_blood_group || "",
      pm_married_status: form.pm_married_status || "",
      pm_occupation: form.pm_occupation || "",
      pm_email: form.pm_email || "",
      pm_aadhar_card_number: form.pm_aadhar_card_number || "",
      pm_pincode: form.pm_pincode || "",
      pm_city: form.pm_city || "",
      pm_state: form.pm_state || "",
      pm_address: form.pm_address || "",
    };

    const action = await dispatch(addPatient(payload));

    if (action.meta.requestStatus === "fulfilled") {
      onSaved?.();
      onClose?.();
    }
  }, [form, validate, dispatch, onSaved, onClose]);

  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

  const sections = [
    {
      key: "personal",
      label: "Personal Details",
      children: (
        <div className={styles.sectionBody}>
          <div className={styles.heroRow}>
            <div className={styles.heroFields}>
              <div className={styles.row}>
                <div className={styles.colFull}>
                  <label className={styles.fieldLabel}>Full Name <span className={styles.required}>*</span></label>
                  <div className={styles.nameRow}>
                    <Select
                      value={form.pm_salutation}
                      className={styles.salutationSelect}
                      onChange={handleSalutationChange}
                      options={salutationOptions}
                    />
                    <Input
                      placeholder="Enter patient's full name"
                      value={form.pm_fullname}
                      onChange={(e) => set("pm_fullname", e.target.value)}
                      status={errors.pm_fullname ? "error" : ""}
                    />
                  </div>
                  {errors.pm_fullname && <div className={styles.errorText}>{errors.pm_fullname}</div>}
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.colHalf}>
                  <label className={styles.fieldLabel}>Mobile Number <span className={styles.required}>*</span></label>
                  <Input
                    placeholder="Enter 10 digit number"
                    value={form.pm_contact_no}
                    onChange={(e) => set("pm_contact_no", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    status={errors.pm_contact_no ? "error" : ""}
                  />
                  {errors.pm_contact_no && <div className={styles.errorText}>{errors.pm_contact_no}</div>}
                </div>
                <div className={styles.colHalf}>
                  <label className={styles.fieldLabel}>Gender <span className={styles.required}>*</span></label>
                  <Segmented
                    block
                    options={GENDER_SEGMENT_OPTIONS}
                    value={form.pm_gender || undefined}
                    onChange={handleGenderChange}
                  />
                  {errors.pm_gender && <div className={styles.errorText}>{errors.pm_gender}</div>}
                </div>
              </div>
            </div>
            <div
              className={styles.heroAvatar}
              onClick={() => !avatarPreview && fileInputRef.current?.click()}
              role={avatarPreview ? undefined : "button"}
              tabIndex={avatarPreview ? undefined : 0}
            >
              <div className={styles.avatarCircle}>
                {avatarPreview ? <img src={avatarPreview} alt="Patient" className={styles.avatarImg} /> : <span>📷</span>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className={styles.hiddenInput}
              />
              <span className={styles.avatarHint}>
                {avatarPreview ? (
                  <button type="button" className={styles.removeAvatarBtn} onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}>
                    Remove photo
                  </button>
                ) : (
                  <span className={styles.uploadLink}>Click to upload</span>
                )}
              </span>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.colThird}>
              <label className={styles.fieldLabel}>Age <span className={styles.required}>*</span></label>
              <div className={`${styles.splitInput} ${errors.ageYears ? styles.splitInputError : ""}`}>
                <input
                  className={styles.splitField}
                  placeholder="Years"
                  value={form.ageYears}
                  onChange={(e) => set("ageYears", e.target.value.replace(/\D/g, "").slice(0, 3))}
                />
                <span className={styles.splitUnit}>yrs</span>
                <div className={styles.splitDivider} />
                <input
                  className={styles.splitField}
                  placeholder="Months"
                  value={form.ageMonths}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    if (Number(v || 0) <= 12) set("ageMonths", v);
                  }}
                />
                <span className={styles.splitUnit}>mth</span>
              </div>
              {errors.ageYears && <div className={styles.errorText}>{errors.ageYears}</div>}
            </div>
            <div className={styles.colThird}>
              <label className={styles.fieldLabel}>Date of Birth</label>
              <DatePicker
                className={styles.fullWidth}
                value={form.pm_dob ? dayjs(form.pm_dob) : null}
                maxDate={dayjs()}
                onChange={(val) => {
                  if (!val) return;
                  const now = dayjs();
                  const years = now.diff(val, "year");
                  const months = now.diff(val.add(years, "year"), "month");
                  setForm((f) => ({
                    ...f,
                    pm_dob: val.toDate(),
                    ageYears: years > 0 ? String(years) : "",
                    ageMonths: months > 0 ? String(months) : "",
                  }));
                  setErrors((e) => ({ ...e, ageYears: undefined }));
                }}
              />
            </div>
            <div className={styles.colThird}>
              <label className={styles.fieldLabel}>Patient Reference ID</label>
              <Input value={form.pm_reference_id} onChange={(e) => set("pm_reference_id", e.target.value)} />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "additional",
      label: "Additional Details",
      children: (
        <div className={styles.sectionBody}>
          <div className={styles.row}>
            <div className={styles.colHalf}>
              <label className={styles.fieldLabel}>Blood Group</label>
              <Select className={styles.fullWidth} value={form.pm_blood_group || undefined} onChange={(v) => set("pm_blood_group", v)} options={bloodOptions} allowClear />
            </div>
            <div className={styles.colHalf}>
              <label className={styles.fieldLabel}>Marital Status</label>
              <Select className={styles.fullWidth} value={form.pm_married_status || undefined} onChange={(v) => set("pm_married_status", v)} options={MARITAL_OPTIONS} allowClear />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.colHalf}>
              <label className={styles.fieldLabel}>Occupation</label>
              <Input value={form.pm_occupation} onChange={(e) => set("pm_occupation", e.target.value)} />
            </div>
            <div className={styles.colHalf}>
              <label className={styles.fieldLabel}>Email ID</label>
              <Input value={form.pm_email} onChange={(e) => set("pm_email", e.target.value)} />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.colHalf}>
              <label className={styles.fieldLabel}>Aadhaar Card Number</label>
              <Input value={form.pm_aadhar_card_number} onChange={(e) => set("pm_aadhar_card_number", e.target.value.replace(/\D/g, "").slice(0, 12))} />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "address",
      label: "Address",
      children: (
        <div className={styles.sectionBody}>
          <div className={styles.row}>
            <div className={styles.colThird}>
              <label className={styles.fieldLabel}>Pincode</label>
              <Input
                value={form.pm_pincode}
                onChange={handlePincodeChange}
                suffix={pinLoading ? <Spin size="small" /> : null}
                status={pinError ? "error" : ""}
              />
              {pinError && <div className={styles.errorText}>{pinError}</div>}
            </div>
            <div className={styles.colThird}>
              <label className={styles.fieldLabel}>City</label>
              <Input value={form.pm_city} disabled />
            </div>
            <div className={styles.colThird}>
              <label className={styles.fieldLabel}>State</label>
              <Input value={form.pm_state} disabled />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.colFull}>
              <label className={styles.fieldLabel}>Street Address</label>
              <Input value={form.pm_address} onChange={(e) => set("pm_address", e.target.value)} />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.form}>
      <Collapse
        className={styles.collapse}
        defaultActiveKey={["personal"]}
        items={sections}
      />
    </div>
  );
}

export default forwardRef(LimsPatientForm);
