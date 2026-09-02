import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  InputBox,
  Dropdown,
  DatePicker,
  SegmentedControl,
  SectionCard,
  Tooltip,
  TPIcon,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";
import {
  addPatient,
  listSalutation,
  listBloodGroup,
  searchPincode,
} from "../../redux/appointmentsSlice";
import dayjs from "dayjs";
import { readPreference, writePreference } from "../appointment-listing/data/viewPreferences";
import styles from "./PatientForm.module.css";

/* Said the same way on both fields, so hovering either one gives the same
   instruction rather than two half-answers. */
const AUTOFILL_HINT = "Enter the pincode and the city and state fill in on their own.";

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

/* Section glyphs, pinned to the exact CDN families the design calls for —
   the bare-name resolver picks a different `user` and a different
   `location` than the ones this form is meant to show. */
const SECTION_ICON = {
  personal: <TPLibraryIcon name="user" variant="bulk" family="users" size={20} color="var(--tesseract-violet-600)" />,
  additional: (
    <TPLibraryIcon
      name="document-favorite"
      variant="bulk"
      family="content-edit"
      size={20}
      color="var(--tesseract-violet-600)"
    />
  ),
  address: (
    <TPLibraryIcon name="location" variant="bulk" family="location" size={20} color="var(--tesseract-violet-600)" />
  ),
};

/* Shared shell settings for the three sections. The edge-faded stroke —
   solid across the top and bottom, dissolving down the sides — is native to
   the design system from 1.1.0, but it is off here: on a white card sitting
   on a tinted page, the page already draws the boundary and a stroke on top
   of it only adds a line. Violet tone for the icon chip, no header fill:
   the accent belongs on the glyph, not washed across a form to be read. */
const SECTION_SHELL = {
  tone: "violet",
  headerFill: "none",
  collapsible: true,
  bordered: false,
};

/* The DS single-mode picker emits {mode, date, label}, not a bare Date. */
function pickedDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v.date instanceof Date) return v.date;
  if (typeof v.date === "string") return new Date(v.date);
  return null;
}

function computeDob(years, months, days) {
  const now = dayjs();
  let d = now;
  if (years) d = d.subtract(Number(years), "year");
  if (months) d = d.subtract(Number(months), "month");
  if (days) d = d.subtract(Number(days), "day");
  return d.format("YYYY-MM-DD");
}

function PatientForm({ onSaved, onClose, onInvalid, initialName = "", initialContact = "" }, ref) {
  const dispatch = useDispatch();
  const { salutationData, bloodGroupData } = useSelector(
    (s) => s.records
  );

  const [form, setForm] = useState({
    pm_salutation: "Mr",
    // Carried over from whatever was typed in the patient search that led
    // here, so the same name is never entered twice.
    pm_fullname: initialName,
    pm_contact_no: initialContact,
    pm_gender: "",
    ageYears: "",
    ageMonths: "",
    ageDays: "",
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

  /* The two optional sections remember how the doctor left them, so a
     practice that never fills addresses stops reopening one every time.
     Personal Details is deliberately not remembered: it holds the required
     fields, and a new patient always starts with those in view. */
  const [sectionOpen, setSectionOpen] = useState(() => ({
    additional: readPreference("patientSectionAdditional", "open") === "open",
    address: readPreference("patientSectionAddress", "open") === "open",
  }));
  const toggleSection = useCallback((key, prefName) => (collapsed) => {
    setSectionOpen((prev) => ({ ...prev, [key]: !collapsed }));
    writePreference(prefName, collapsed ? "collapsed" : "open");
  }, []);

  const [errors, setErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const fileInputRef = React.useRef(null);
  const dobWrapRef = React.useRef(null);

  // Date of Birth → the age fields. Pulled out of the picker's onChange so the
  // day-click interception below can commit the same way the design system's
  // own commit does.
  const applyDob = useCallback((d) => {
    if (!d || Number.isNaN(d.getTime())) return;
    const now = dayjs();
    const dob = dayjs(d);
    const years = now.diff(dob, "year");
    const months = now.diff(dob.add(years, "year"), "month");
    const days = now.diff(dob.add(years, "year").add(months, "month"), "day");
    setForm((f) => ({
      ...f,
      pm_dob: d,
      ageYears: years > 0 ? String(years) : "",
      ageMonths: months > 0 ? String(months) : "",
      ageDays: days > 0 ? String(days) : "",
    }));
    setErrors((e) => ({ ...e, ageYears: undefined }));
  }, []);

  // Tag the DOB popover on open so the "one action" footer restyle (Clear only,
  // no Cancel/Apply — see .dobPopover in the CSS) is scoped to this picker.
  const tagDobPopover = useCallback(() => {
    requestAnimationFrame(() => {
      const id = dobWrapRef.current
        ?.querySelector('[class*="_trigger_"]')
        ?.getAttribute("aria-controls");
      if (id) document.getElementById(id)?.classList.add(styles.dobPopover);
    });
  }, []);

  // Clicking a day IS the decision, so commit it and close in one tap rather
  // than making the doctor confirm a date they already picked. Scoped to this
  // picker's own popover so it never touches the appointment date picker behind
  // the drawer. Closes through the (hidden) Cancel; the controlled value we set
  // is what the field then shows.
  useEffect(() => {
    const onClick = (e) => {
      const popover = e.target.closest?.('[id^="tp-drp-popover-"]');
      if (!popover) return;
      const ourId = dobWrapRef.current
        ?.querySelector('[class*="_trigger_"]')
        ?.getAttribute("aria-controls");
      if (!ourId || popover.id !== ourId) return;
      const dayBtn = e.target.closest('[class*="_day_"]');
      if (!dayBtn) return;
      const d = new Date(dayBtn.getAttribute("aria-label"));
      if (Number.isNaN(d.getTime())) return;
      setTimeout(() => {
        applyDob(d);
        popover.querySelector('[class*="_actionsRight_"] button')?.click();
      }, 0);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [applyDob]);

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

  /* Age and date of birth answer the same question, so only one of them can
     be the answer. Picking a date fills the age (below); typing an age drops
     the date, because otherwise a stale picked date would still win at save
     time and quietly discard what was just typed. The date field is never
     filled from the age: a birth year guessed from "45 yrs" is not a fact. */
  const setAge = useCallback((key, val) => {
    setForm((f) => ({ ...f, [key]: val, pm_dob: null }));
    setErrors((e) => ({ ...e, ageYears: undefined }));
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

  /* showBloodGroup returns { bg_value: "A+", bg_title: "A Positive" }. The
     old mapping read a `tbg_name` that does not exist, so every option came
     through as the raw object and React threw the moment the list opened.
     The label matches the legacy screen: value first, full name in brackets. */
  const bloodOptions = useMemo(() => {
    const list = bloodGroupData?.length ? bloodGroupData : BLOOD_FALLBACK;
    return list
      .map((b) => {
        if (typeof b === "string") return { value: b, label: b };
        const value = b?.bg_value ?? b?.tbg_name ?? "";
        const title = b?.bg_title ?? "";
        return { value: String(value), label: title ? `${value} (${title})` : String(value) };
      })
      .filter((o) => o.value);
  }, [bloodGroupData]);

  /* One place that knows what "valid" means, so leaving a field and pressing
     Save can never disagree about it. Each rule reads the whole form because
     age and date of birth answer the same question between them.

     The messages are written to be repaired, not obeyed. Where a field has a
     fixed length the line says how many digits are there against how many are
     needed, so the doctor can see whether they dropped one or added one
     without recounting; where the shape is the problem it shows the shape.
     No "invalid", no "error", no scolding: the field is simply not finished
     yet, and the line says what finishes it. */
  const digits = (v) => String(v || "").replace(/\D/g, "").length;
  /* Two kinds of "not right". A missing name or mobile number means the
     record cannot be created, so Save is refused. A pincode that is five
     digits long is worth flagging but is nobody's blocker: the field is
     optional, and a doctor who wants it saved as typed gets to save it.
     ADVISORY fields therefore warn and let go; the rest stop the save. */
  const ADVISORY = ["pm_email", "pm_aadhar_card_number", "pm_pincode"];
  const RULES = {
    pm_fullname: (f) => {
      const v = f.pm_fullname.trim();
      if (!v) return "Add the patient's name so the record can be found later";
      /* Digits and symbols in a name are almost always a typo or a note that
         belongs in Remarks, and they break search and printed records later.
         The two cases get their own line so the fix is obvious rather than a
         generic "invalid name". Letters, spaces, hyphens, apostrophes and
         full stops are allowed; the salutation lives in its own field, so
         "B/O" and the like never need to be typed here. */
      if (/[0-9]/.test(v)) return "Names do not contain numbers. Remove the digits from the name";
      if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(v))
        return "Use letters only, with spaces, hyphens or apostrophes. Anything else belongs in Remarks";
      return "";
    },
    pm_contact_no: (f) =>
      /^[0-9]{10}$/.test(f.pm_contact_no)
        ? ""
        : f.pm_contact_no
          ? `A mobile number is 10 digits. This one has ${digits(f.pm_contact_no)}`
          : "Add a 10-digit mobile number for appointment reminders",
    pm_gender: (f) => (f.pm_gender ? "" : "Pick one so the record is complete"),
    ageYears: (f) =>
      f.ageYears || f.ageMonths || f.ageDays || f.pm_dob
        ? ""
        : "Add an age or a date of birth. Either one is enough",
    /* Optional fields, but a half-entered one is worse than an empty one:
       a five-digit pincode or a stray string in the email box will be
       stored and then quietly fail whoever tries to use it. Empty passes;
       filled has to be right. */
    pm_email: (f) =>
      !f.pm_email || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.pm_email.trim())
        ? ""
        : "An email address looks like name@example.com. Leave it blank if you don't have one",
    pm_aadhar_card_number: (f) =>
      !f.pm_aadhar_card_number || /^[0-9]{12}$/.test(f.pm_aadhar_card_number)
        ? ""
        : `An Aadhaar number is 12 digits. This one has ${digits(f.pm_aadhar_card_number)}`,
    pm_pincode: (f) =>
      !f.pm_pincode || /^[0-9]{6}$/.test(f.pm_pincode)
        ? ""
        : `A pincode is 6 digits. This one has ${digits(f.pm_pincode)}`,
  };

  /* Leaving a field checks that field, and only once it has been visited —
     an empty form should not turn red before anything has been typed. */
  const checkField = useCallback(
    (key) => setErrors((prev) => ({ ...prev, [key]: RULES[key]?.(form) || undefined })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- RULES is a stable literal
    [form]
  );

  const validate = useCallback(() => {
    const e = {};
    Object.entries(RULES).forEach(([key, rule]) => {
      const msg = rule(form);
      if (msg) e[key] = msg;
    });
    setErrors(e);
    /* Only the blocking ones come back: advisory fields are still marked in
       place, they just do not stand between the doctor and Save. */
    return Object.fromEntries(Object.entries(e).filter(([k]) => !ADVISORY.includes(k)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- RULES is a stable literal
  }, [form]);

  const handleSave = useCallback(async () => {
    const failures = validate();
    const keys = Object.keys(failures);
    if (keys.length) {
      /* Say what is wrong once, in words, and mark every field that is
         wrong: a red border with no sentence leaves the user hunting. */
      /* One specific sentence when one thing is wrong, because it can be
         acted on as read. With several, the sentence would be about the first
         of them and quietly wrong about the rest, so the toast steps back and
         lets the marked fields do the pointing. */
      onInvalid?.(
        keys.length === 1
          ? failures[keys[0]]
          : "A few details still need your attention. The fields are marked below."
      );
      const first = document.querySelector(`[data-field="${keys[0]}"]`);
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      first?.querySelector("input")?.focus();
      return false;
    }

    const dob = form.pm_dob
      ? dayjs(form.pm_dob).format("YYYY-MM-DD")
      : (form.ageYears || form.ageMonths || form.ageDays)
        ? computeDob(form.ageYears, form.ageMonths, form.ageDays)
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
      // Pass the created patient up so callers can auto-select it.
      onSaved?.(action.payload);
      onClose?.();
      return true;
    }
    onInvalid?.(action.payload?.message || "Could not save the patient. Please try again.");
    return false;
  }, [form, validate, dispatch, onSaved, onClose, onInvalid]);

  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

  return (
    <div className={styles.form}>
      {/* ── Personal Details ──────────────────────────────── */}
      <SectionCard
        {...SECTION_SHELL}
        className={styles.section}
        title="Personal Details"
        icon={SECTION_ICON.personal}
      >
        <div className={styles.sectionBody}>
          {/* ── Hero row: fields (left) + avatar (right) ────── */}
          <div className={styles.heroRow}>
            <div className={styles.heroFields}>
              <div className={styles.row}>
                <div className={styles.colFull} data-field="pm_fullname">
                  {/* Native <select> (InputBox leftAddon type=select) opens the
                      OS picker on tablets and covers the whole screen. Use the
                      same Tesseract Dropdown as Blood Group so the menu stays
                      in-page and sized to its options. */}
                  <label className={styles.fieldLabel} htmlFor="add-patient-full-name">
                    Full Name<span className={styles.required}>*</span>
                  </label>
                  <div className={styles.namePair}>
                    <div className={styles.nameSalutation}>
                      <Dropdown
                        ariaLabel="Salutation"
                        options={salutationOptions}
                        value={form.pm_salutation || undefined}
                        onChange={(v) => handleSalutationChange(v)}
                      />
                    </div>
                    <div className={styles.nameInput}>
                      <InputBox
                        id="add-patient-full-name"
                        placeholder="Enter patient's full name"
                        value={form.pm_fullname}
                        onChange={(e) => set("pm_fullname", e.target.value)}
                        onBlur={() => checkField("pm_fullname")}
                        status={errors.pm_fullname ? "error" : "default"}
                        helperText={errors.pm_fullname || ""}
                        fullWidth
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.row} style={{ marginBottom: 0 }}>
                <div className={styles.colHalf} data-field="pm_contact_no">
                  <InputBox
                    label="Mobile Number"
                    required
                    placeholder="Enter 10 digit number"
                    value={form.pm_contact_no}
                    onChange={(e) =>
                      set(
                        "pm_contact_no",
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    onBlur={() => checkField("pm_contact_no")}
                    allow="numeric"
                    status={errors.pm_contact_no ? "error" : "default"}
                    helperText={errors.pm_contact_no || ""}
                    fullWidth
                    /* Every number this clinic stores is Indian, so the
                       country code is a fixed affix in the design system's
                       own add-on slot: read-only chrome before the field,
                       not ten more characters to type. */
                    leftAddon="+91"
                  />
                </div>
                <div className={styles.colHalf} data-field="pm_gender">
                  <div className={styles.genderField}>
                    <label className={styles.genderLabel}>
                      Gender<span className={styles.required}>*</span>
                    </label>
                    {/* Until a gender is chosen the control shows no
                        selection at all: the indicator is withdrawn and the
                        three options are separated by hairlines, so nothing
                        can be mistaken for an answer already given. */}
                    <div
                      className={styles.genderInputWrap}
                      data-empty={!form.pm_gender || undefined}
                      data-invalid={errors.pm_gender ? "" : undefined}
                    >
                      <SegmentedControl
                        size="md"
                        variant="block"
                        theme="neutral"
                        // Fills its column like every other control in the
                        // row, so the grid stays on one rhythm at any width.
                        fullWidth
                        options={GENDER_SEGMENT_OPTIONS}
                        /* Controlled from the first render, empty string and
                           all. Passing `undefined` while nothing was picked
                           left the control uncontrolled, so it latched its
                           own internal selection on the first option: with
                           Male already "selected" internally, clicking Male
                           was a no-op and never fired onValueChange, while
                           Female worked. The indicator still stays hidden
                           until a real choice is made, via data-empty. */
                        value={form.pm_gender}
                        onValueChange={handleGenderChange}
                      />
                    </div>
                  </div>
                  {errors.pm_gender && <p className={styles.errorText}>{errors.pm_gender}</p>}
                </div>
              </div>
            </div>

            {/* ── Avatar (right side) ──────────────────────── */}
            <div
              className={styles.heroAvatar}
              onClick={() => !avatarPreview && fileInputRef.current?.click()}
              role={avatarPreview ? undefined : "button"}
              tabIndex={avatarPreview ? undefined : 0}
              onKeyDown={(e) => {
                if (!avatarPreview && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className={styles.avatarCircle}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Patient"
                    className={styles.avatarImg}
                  />
                ) : (
                  <TPIcon name="camera" variant="bulk" size={32} />
                )}
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
                  <button
                    type="button"
                    className={styles.removeAvatarBtn}
                    onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                  >
                    <TPIcon name="trash" variant="linear" size={14} />
                    Remove photo
                  </button>
                ) : (
                  <span className={styles.uploadLink}>Click to upload</span>
                )}
              </span>
            </div>
          </div>

          <div className={styles.row}>
            {/* Two DS fields with their own unit suffixes rather than one
                control split down the middle: years and months are separate
                values, and each gets the design system's own focus, error
                and numeric-filtering behaviour. */}
            <div className={styles.colThird} data-field="ageYears">
              <div className={styles.agePair}>
                <InputBox
                  label="Age"
                  required
                  placeholder="Years"
                  unit="yrs"
                  allow="numeric"
                  maxLength={3}
                  value={form.ageYears}
                  onChange={(e) => setAge("ageYears", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  onBlur={() => checkField("ageYears")}
                  status={errors.ageYears ? "error" : "default"}
                  fullWidth
                />
                <InputBox
                  label="&nbsp;"
                  placeholder="Months"
                  unit="mth"
                  allow="numeric"
                  maxLength={2}
                  value={form.ageMonths}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    if (Number(v || 0) <= 12) setAge("ageMonths", v);
                  }}
                  onBlur={() => checkField("ageYears")}
                  status={errors.ageYears ? "error" : "default"}
                  fullWidth
                />
                {/* Days matters for newborns: a two-week-old baby has no whole
                    month to show, so without this the age would round to zero. */}
                <InputBox
                  label="&nbsp;"
                  placeholder="Days"
                  unit="day"
                  allow="numeric"
                  maxLength={2}
                  value={form.ageDays}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    if (Number(v || 0) <= 31) setAge("ageDays", v);
                  }}
                  onBlur={() => checkField("ageYears")}
                  status={errors.ageYears ? "error" : "default"}
                  fullWidth
                />
              </div>
              {/* The pair shares one message, so it sits under both rather
                  than being duplicated into each field's own helper slot. */}
              {errors.ageYears && <p className={styles.errorText}>{errors.ageYears}</p>}
            </div>
            <div className={styles.colThird}>
              {/* The DS picker. Its popover escapes the section card, which a
                  popover rendered inside the body could not do. Clicking a day
                  commits and closes in one tap (see the day-click interception
                  above); the footer keeps only Clear, with Cancel/Apply dropped.
                  Picking a date fills the age fields, since the two say the
                  same thing and a doctor should only state it once. */}
              <div ref={dobWrapRef} onClickCapture={tagDobPopover}>
                <DatePicker
                  label="Date of Birth"
                  mode="single"
                  size="md"
                  fullWidth
                  commitMode="outside-click"
                  value={form.pm_dob ? new Date(form.pm_dob) : null}
                  maxDate={new Date()}
                  placeholder="Select date"
                  formatDate={(d) => dayjs(d).format("DD MMM YYYY")}
                  onChange={(v) => applyDob(pickedDate(v))}
                />
              </div>
            </div>
            <div className={styles.colThird}>
              <InputBox
                label="Patient Reference ID"
                placeholder="Enter reference ID"
                value={form.pm_reference_id}
                onChange={(e) => set("pm_reference_id", e.target.value)}
                fullWidth
               
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Additional Details ────────────────────────────── */}
      <SectionCard
        {...SECTION_SHELL}
        className={styles.section}
        title="Additional Details"
        icon={SECTION_ICON.additional}
        collapsed={!sectionOpen.additional}
        onCollapsedChange={toggleSection("additional", "patientSectionAdditional")}
      >
        <div className={styles.sectionBody}>
          <div className={styles.row}>
            <div className={styles.colHalf}>
              <Dropdown
                label="Blood Group"
                placeholder="Select blood group"
                options={bloodOptions}
                value={form.pm_blood_group || undefined}
                onChange={(v) => set("pm_blood_group", v)}
              />
            </div>
            <div className={styles.colHalf}>
              <Dropdown
                label="Marital Status"
                placeholder="Select marital status"
                options={MARITAL_OPTIONS}
                value={form.pm_married_status || undefined}
                onChange={(v) => set("pm_married_status", v)}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.colHalf}>
              <InputBox
                leftIcon={<TPLibraryIcon name="briefcase" family="clothes" size={16} />}
                label="Occupation"
                placeholder="Enter occupation"
                value={form.pm_occupation}
                onChange={(e) => set("pm_occupation", e.target.value)}
                fullWidth
               
              />
            </div>
            <div className={styles.colHalf} data-field="pm_email">
              <InputBox
                label="Email ID"
                placeholder="Enter email address"
                type="email"
                value={form.pm_email}
                onChange={(e) => set("pm_email", e.target.value)}
                onBlur={() => checkField("pm_email")}
                status={errors.pm_email ? "warning" : "default"}
                helperText={errors.pm_email || ""}
                fullWidth
               
                leftIcon={<TPIcon name="sms" variant="linear" size={16} />}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.colHalf} data-field="pm_aadhar_card_number">
              <InputBox
                leftIcon={<TPLibraryIcon name="id-card-2" family="user" size={16} />}
                label="Aadhaar Card Number"
                placeholder="Enter 12-digit Aadhaar number"
                onBlur={() => checkField("pm_aadhar_card_number")}
                status={errors.pm_aadhar_card_number ? "warning" : "default"}
                helperText={errors.pm_aadhar_card_number || ""}
                value={form.pm_aadhar_card_number}
                onChange={(e) =>
                  set(
                    "pm_aadhar_card_number",
                    e.target.value.replace(/\D/g, "").slice(0, 12)
                  )
                }
                allow="numeric"
                fullWidth
               
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Address ───────────────────────────────────────── */}
      <SectionCard
        {...SECTION_SHELL}
        className={styles.section}
        title="Address"
        icon={SECTION_ICON.address}
        collapsed={!sectionOpen.address}
        onCollapsedChange={toggleSection("address", "patientSectionAddress")}
      >
        <div className={styles.sectionBody}>
          <div className={styles.row}>
            <div className={styles.colThird} data-field="pm_pincode">
              <InputBox
                label="Pincode"
                placeholder="Enter pincode"
                value={form.pm_pincode}
                onChange={handlePincodeChange}
                onBlur={() => checkField("pm_pincode")}
                allow="numeric"
                fullWidth
                status={pinError ? "error" : errors.pm_pincode ? "warning" : "default"}
                helperText={pinError || errors.pm_pincode || ""}
                rightIcon={
                  pinLoading ? (
                    <span className={styles.pinSpinner} />
                  ) : undefined
                }
              />
            </div>
            {/* City and State are answers to the pincode, not questions of
                their own. A disabled field with no explanation reads as
                broken, so hovering either one says where the value comes
                from. The tooltip sits on a wrapper because a disabled input
                fires no pointer events of its own. */}
            <Tooltip content={AUTOFILL_HINT} placement="top">
              <div className={styles.colThird}>
                <InputBox
                  label="City"
                  placeholder="Fills from pincode"
                  value={form.pm_city}
                  disabled
                  fullWidth
                />
              </div>
            </Tooltip>
            <Tooltip content={AUTOFILL_HINT} placement="top">
              <div className={styles.colThird}>
                <InputBox
                  label="State"
                  placeholder="Fills from pincode"
                  value={form.pm_state}
                  disabled
                  fullWidth
                />
              </div>
            </Tooltip>
          </div>

          <div className={styles.row}>
            <div className={styles.colFull}>
              <InputBox
                label="Street Address"
                placeholder="Enter street address"
                value={form.pm_address}
                onChange={(e) => set("pm_address", e.target.value)}
                fullWidth
               
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default forwardRef(PatientForm);
