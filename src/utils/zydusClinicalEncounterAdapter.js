import moment from "moment";

const GENX_SOURCE = "GENX";
const ENCOUNTER_DATE_FORMAT = "DD-MM-YYYY HH:mm";
const SELECTED_DATE_FORMAT = "DD-MM-YYYY";
const GENX_DATE_FORMAT = "YYYY-MM-DD";
const GENX_SYNC_DATE_FORMAT = "DD-MM-YYYY";
const GENX_SYNC_TIME_FORMAT = "HH:mm:ss";

const SALUTATIONS = [
  "B/O",
  "Baby",
  "D/O",
  "Dr",
  "Master",
  "Miss",
  "Mr",
  "Mrs",
  "Ms.",
  "S/O",
];

const meaningfulValue = (value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
};

export const normalizeZydusGender = (gender) => {
  const normalized = String(gender || "").trim().toUpperCase();
  if (["MALE", "FEMALE", "OTHER"].includes(normalized)) return normalized;
  return "UNKNOWN";
};

export const formatGenxClinicalEncounterDate = (date) => {
  if (!date || typeof date !== "string") return date;
  const parsedDate = moment(date, SELECTED_DATE_FORMAT, true);
  return parsedDate.isValid() ? parsedDate.format(GENX_DATE_FORMAT) : date;
};

export const parseGenxTotalElements = (totalElements) => {
  const parsed = Number(totalElements);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const getGenxEncounterIdentity = (record = {}) => {
  const identityParts = [
    meaningfulValue(record.encounterId),
    meaningfulValue(record.encounterNo),
    meaningfulValue(record.visitId),
    meaningfulValue(record.visitNo),
    meaningfulValue(record.mrno),
  ].filter((value) => value !== undefined);

  return identityParts.length ? identityParts.join("|") : "";
};

export const normalizeGenxClinicalEncounter = (record = {}) => {
  const encounterDateTime = meaningfulValue(record.encounterDateTime);
  const parsedDateTime = moment(encounterDateTime, ENCOUNTER_DATE_FORMAT, true);
  const isValidDateTime = !encounterDateTime || parsedDateTime.isValid();

  const patientName = meaningfulValue(record.patientName) || "";
  const mrno = meaningfulValue(record.mrno) || "";
  const encounterId = meaningfulValue(record.encounterId);
  const encounterNo = meaningfulValue(record.encounterNo) || "";
  const visitId = meaningfulValue(record.visitId);
  const visitNo = meaningfulValue(record.visitNo) || "";
  const patientId = meaningfulValue(record.patientId);

  return {
    ...record,
    source: GENX_SOURCE,
    isValidEncounterRecord: Boolean(
      patientId && mrno && (encounterId || encounterNo) && isValidDateTime
    ),
    patientId,
    patient_unique_id: patientId,
    mrno,
    patientName,
    gender: normalizeZydusGender(record.gender),
    mobileNo: meaningfulValue(record.mobileNo) || "",
    visitId,
    visitNo,
    encounterId,
    encounterNo,
    pvsId: meaningfulValue(record.pvsId),
    encounterDate: meaningfulValue(record.encounterDate) || "",
    encounterDateTime: encounterDateTime || "",
    consultationStatus: meaningfulValue(record.consultationStatus) || "",
    consultationType: meaningfulValue(record.consultationType) || "",
    isCancelled: Boolean(record.isCancelled),
    departmentId: meaningfulValue(record.departmentId),
    departmentCode: meaningfulValue(record.departmentCode) || "",
    departmentName: meaningfulValue(record.departmentName) || "",
    employeeId: meaningfulValue(record.employeeId),
    employeeName: meaningfulValue(record.employeeName) || "",
    branchCode: meaningfulValue(record.branchCode) || "",
    branchName: meaningfulValue(record.branchName) || "",
    unitName: meaningfulValue(record.unitName) || "",
    visitTypeId: meaningfulValue(record.visitTypeId),
    visitTypeCode: meaningfulValue(record.visitTypeCode) || "",
    queueNo: meaningfulValue(record.queueNo) || "",
    patientAddress: meaningfulValue(record.patientAddress) || "",
    dob: meaningfulValue(record.dob) || "",
    registeredOn: meaningfulValue(record.registeredOn) || "",
    patientStatus: meaningfulValue(record.patientStatus) || "",
    updatedBy: meaningfulValue(record.updatedBy) || "",
    updatedDate: meaningfulValue(record.updatedDate) || "",
    raw: record,
  };
};

export const normalizeGenxClinicalEncounterResponse = (response = {}) => ({
  ...response,
  status: "success",
  data: (Array.isArray(response.data) ? response.data : []).map(
    normalizeGenxClinicalEncounter
  ),
  totalElements: parseGenxTotalElements(response.totalElements),
  totalPages: Number.isFinite(Number(response.totalPages))
    ? Number(response.totalPages)
    : 1,
});

export const parseZydusPatientName = (patientName) => {
  const parts = String(patientName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const salutation = SALUTATIONS.find(
    (item) => item.toLowerCase() === String(parts[0] || "").toLowerCase()
  );
  const nameParts = salutation ? parts.slice(1) : parts;

  if (nameParts.length === 0) {
    return {
      salutation: salutation || "",
      firstName: "",
      middleName: "",
      lastName: "",
    };
  }

  if (nameParts.length === 1) {
    return {
      salutation: salutation || "",
      firstName: nameParts[0],
      middleName: "",
      lastName: "",
    };
  }

  return {
    salutation: salutation || "",
    firstName: nameParts[0],
    middleName: nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "",
    lastName: nameParts[nameParts.length - 1],
  };
};

const getRequiredValue = (value, fieldName) => {
  const resolvedValue = meaningfulValue(value);
  if (resolvedValue === undefined) {
    throw new Error(`${fieldName} is required for Genx sync`);
  }
  return resolvedValue;
};

export const buildGenxSyncPayload = (encounter = {}, context = {}) => {
  const encounterDateTime = getRequiredValue(
    encounter.encounterDateTime || encounter.encounterDate,
    "encounterDateTime"
  );
  const parsedDateTime = moment(encounterDateTime, ENCOUNTER_DATE_FORMAT, true);
  if (!parsedDateTime.isValid()) {
    throw new Error("encounterDateTime must be in DD-MM-YYYY HH:mm format");
  }

  const patientName = parseZydusPatientName(encounter.patientName);

  return {
    source: "TP-React-FE",
    businessId: String(getRequiredValue(context.businessId, "businessId")),
    doctorRefId: String(getRequiredValue(context.doctorRefId, "doctorRefId")),
    patientRefId: String(getRequiredValue(encounter.mrno, "mrno")),
    encounterRefId: String(
      getRequiredValue(encounter.encounterId, "encounterId")
    ),
    visitType: String(getRequiredValue(encounter.visitTypeCode, "visitTypeCode")),
    scheduledDate: parsedDateTime.format(GENX_SYNC_DATE_FORMAT),
    scheduledTime: parsedDateTime.format(GENX_SYNC_TIME_FORMAT),
    scheduledDuration: String(context.scheduledDuration || "15"),
    billingStatus: String(context.billingStatus || "PAID"),
    patientDetails: {
      salutation: patientName.salutation,
      firstName: patientName.firstName,
      middleName: patientName.middleName,
      lastName: patientName.lastName,
      dateOfBirth: meaningfulValue(encounter.dob) || "",
      gender: meaningfulValue(encounter.gender) || "",
      contactNumber: meaningfulValue(encounter.mobileNo) || "",
      emailId: meaningfulValue(encounter.emailId) || "noreply@zydushospitals.com",
      address: meaningfulValue(encounter.patientAddress) || "",
    },
  };
};

const firstMeaningful = (...values) =>
  values.find((value) => meaningfulValue(value) !== undefined);

export const normalizeGenxSyncResponse = (response = {}) => {
  const data = response?.data && typeof response.data === "object"
    ? response.data
    : response;
  const patient = data?.patient || data?.patientData || data?.patient_data || {};
  const appointment =
    data?.appointment || data?.appointmentData || data?.appointment_data || {};
  const caseManager =
    data?.caseManager || data?.caseManagerData || data?.case_manager || {};

  const patientUniqueId = firstMeaningful(
    data?.patient_unique_id,
    data?.patientUniqueId,
    data?.pm_pid,
    patient?.patient_unique_id,
    patient?.patientUniqueId,
    patient?.pm_pid,
    appointment?.patient_unique_id,
    appointment?.patientUniqueId
  );
  const pamId = firstMeaningful(
    data?.pam_id,
    data?.pamId,
    data?.appointmentId,
    appointment?.pam_id,
    appointment?.pamId,
    appointment?.appointmentId
  );
  const tcmId = firstMeaningful(
    data?.tcm_id,
    data?.tcmId,
    caseManager?.tcm_id,
    caseManager?.tcmId
  );

  return {
    ...response,
    status: response?.status ?? data?.status ?? Boolean(patientUniqueId),
    data,
    patient_unique_id: patientUniqueId,
    pam_id: pamId,
    tcm_id: tcmId,
    patient,
    appointment,
    caseManager,
    alreadySynced: Boolean(
      data?.alreadySynced || data?.isAlreadySynced || data?.existingRecord
    ),
  };
};
