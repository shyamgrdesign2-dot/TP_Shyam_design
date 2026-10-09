import * as Sentry from "@sentry/react";

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "")
  );

const removeTag = (key) => {
  const scope = Sentry.getIsolationScope?.();
  if (!scope?._tags) return;

  delete scope._tags[key];
  scope._notifyScopeListeners?.();
};

const setTagIfValue = (key, value) => {
  if (value !== undefined && value !== null && value !== "") {
    Sentry.setTag(key, String(value));
  } else {
    removeTag(key);
  }
};

export const applySentryUserContext = ({ profile, tokenData, userId }) => {
  const user = compactObject({
    id: userId || tokenData?.user_id,
    username: profile?.um_name,
    email: profile?.um_email,
  });

  if (Object.keys(user).length > 0) {
    Sentry.setUser(user);
  } else {
    Sentry.setUser(null);
  }

  const doctorContext = compactObject({
    um_id: tokenData?.user_id,
    doctor_unique_id: profile?.doctor_unique_id,
    name: profile?.um_name,
    mobile: profile?.um_contact,
    email: profile?.um_email,
    speciality_id: profile?.dp_id,
    speciality: profile?.dp_name,
    b2c_id: profile?.b2c,
    clinic_id: tokenData?.clinic_id,
    hospital_business_id: tokenData?.hospital_business_id,
  });

  Sentry.setContext(
    "doctor",
    Object.keys(doctorContext).length > 0 ? doctorContext : null
  );

  setTagIfValue("doctor_um_id", tokenData?.user_id || userId);
  setTagIfValue("doctor_unique_id", profile?.doctor_unique_id);
  setTagIfValue("doctor_b2c_id", profile?.b2c);
  setTagIfValue("clinic_id", tokenData?.clinic_id);
  setTagIfValue("doctor_speciality_id", profile?.dp_id);
  setTagIfValue("doctor_speciality", profile?.dp_name);
};

export const applySentryPatientContext = (patientData) => {
  const patientId = patientData?.patient_unique_id;

  if (patientId) {
    Sentry.setContext("patient", { patient_unique_id: patientId });
    setTagIfValue("patient_unique_id", patientId);
  } else {
    Sentry.setContext("patient", null);
    removeTag("patient_unique_id");
  }
};

export const clearSentryContext = () => {
  Sentry.getIsolationScope?.()?.clear();
};
