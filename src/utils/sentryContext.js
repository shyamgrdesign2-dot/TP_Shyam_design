import * as Sentry from "@sentry/react";

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "")
  );

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

  Sentry.setContext(
    "doctor",
    compactObject({
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
    })
  );

  Sentry.setTag("doctor_um_id", tokenData?.user_id || userId || "unknown");
  Sentry.setTag("clinic_id", tokenData?.clinic_id || "unknown");
  Sentry.setTag("doctor_speciality_id", profile?.dp_id || "unknown");
};

export const applySentryPatientContext = (patientData) => {
  const patientId = patientData?.patient_unique_id;

  if (patientId) {
    Sentry.setContext("patient", { patient_unique_id: patientId });
    Sentry.setTag("patient_unique_id", patientId);
  } else {
    Sentry.setContext("patient", null);
    Sentry.setTag("patient_unique_id", "unknown");
  }
};

export const clearSentryContext = () => {
  Sentry.setUser(null);
  Sentry.setContext("doctor", null);
  Sentry.setContext("patient", null);
  Sentry.setTag("doctor_um_id", "unknown");
  Sentry.setTag("clinic_id", "unknown");
  Sentry.setTag("doctor_speciality_id", "unknown");
  Sentry.setTag("patient_unique_id", "unknown");
};
