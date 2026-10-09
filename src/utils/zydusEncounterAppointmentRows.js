import moment from "moment";

const normalizeEncounterDate = (value, outputFormat) =>
  value ? moment(value, "DD-MM-YYYY HH:mm").format(outputFormat) : "";

const normalizeDob = (value, outputFormat) =>
  value ? moment(value, "DD-MM-YYYY").format(outputFormat) : "";

export const buildZydusEncounterAppointmentRow = (
  encounter,
  { calculateAge = () => ({}), createKey = () => undefined } = {}
) => {
  const age = calculateAge(normalizeDob(encounter?.dob, "YYYY-MM-DD"));

  return {
    ...encounter,
    key: createKey(),
    patient_unique_id: encounter?.patient_unique_id || encounter?.patientId,
    pm_fullname: encounter?.patientName,
    apTime: normalizeEncounterDate(encounter?.encounterDateTime, "hh:mm A"),
    apDate: normalizeEncounterDate(encounter?.encounterDateTime, "Do MMM YYYY"),
    DOB: normalizeDob(encounter?.dob, "Do MMM YYYY"),
    ageYears: age?.years,
    ageMonths: age?.months,
    ageDays: age?.days,
    pm_gender: encounter?.gender,
    pm_contact_no: encounter?.mobileNo,
    patient_address: encounter?.patientAddress,
    toct_type: encounter?.consultationType,
    appointmentStatus: encounter?.consultationStatus,
    fromTime: encounter?.encounterDateTime,
    toTime: encounter?.encounterDateTime,
    location: encounter?.patientAddress,
  };
};

// The GenX clinical-encounters API is filtered server side through the
// isCancel query param, so no cancelled/active split is done here.
export const buildZydusEncounterAppointmentRows = (payload, options) =>
  (Array.isArray(payload) ? payload : []).map((encounter) =>
    buildZydusEncounterAppointmentRow(encounter, options)
  );
