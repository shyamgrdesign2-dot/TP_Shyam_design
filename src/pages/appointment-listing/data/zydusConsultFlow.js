/**
 * Zydus Encounter consult / patient-details flow for prod.
 * Uses ICT sync: POST /appointment/syncZydusPatientAndAppointment
 * (same contract as remote prod AppointmentData.js — not GenX).
 */
import moment from "moment";
import { env } from "../../../EnvironmentConfig";
import { getDecodedToken } from "../../../utils/localStorage";
import { syncZydusPatientAndAppointment, viewPatient } from "../../../redux/appointmentsSlice";
import { viewCaseManager } from "../../../redux/caseManagerSlice";

const LIST_SALUTATION = [
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

/** flag values match legacy AppointmentData PrimaryActionButton wrappers */
export const ZYDUS_FLAG = {
  CONSULT: 1,
  PATIENT_DETAILS: 2,
  SNAP_RX: 3,
  VOICE_RX: 4,
  SMART_RX: 5,
};

const buildLegacyIctSyncPayload = (record, { tokenData, siteId }) => {
  const [title, ...rest] = String(record?.patientName || record?.pm_fullname || "").split(" ");
  const hasSalutation = LIST_SALUTATION.some(
    (e) => e.toLowerCase() === String(title || "").toLowerCase()
  );
  return {
    source: "TP-React-FE",
    business_id: tokenData?.hospital_business_id,
    hospital_id: siteId,
    doctor_ref_id: record.employeeId,
    patient_ref_id: record.mrno,
    encounter_ref_id: record.encounterId,
    visit_type: record.visitTypeCode,
    scheduled_date: moment(record.encounterDateTime, "DD-MM-YYYY HH:mm").format("DD-MM-YYYY"),
    scheduled_time: moment(record.encounterDateTime, "DD-MM-YYYY HH:mm").format("HH:mm:ss"),
    scheduled_duration: "",
    billing_status: "PAID",
    patient_details: {
      salutation: hasSalutation ? title : "",
      first_name: hasSalutation ? rest.join(" ") : record.patientName || record.pm_patient_name,
      middle_name: "",
      last_name: "",
      date_of_birth: record.dob,
      gender: record.gender,
      contact_number: Object.prototype.hasOwnProperty.call(record, "mobileNo")
        ? record.mobileNo
        : record.pm_contact_no || "",
      email_id: "noreply@zydushospitals.com",
      address: record.patient_address || record.patientAddress,
    },
  };
};

const navigateForFlag = ({ navigate, flag, patientData, isDental, dentalRoute, isVoiceRxNewUi }) => {
  if (flag === ZYDUS_FLAG.SNAP_RX) {
    navigate("/snap-rx", { state: { patient_data: patientData } });
    return;
  }
  if (flag === ZYDUS_FLAG.VOICE_RX) {
    navigate(isVoiceRxNewUi ? "/prescription" : "/voice-rx-consult", {
      state: {
        patient_data: patientData,
        ...(isVoiceRxNewUi
          ? { isVoiceRxNewUiFlow: true, voiceRxEntryPoint: "zydus_encounter" }
          : {}),
      },
    });
    return;
  }
  if (flag === ZYDUS_FLAG.SMART_RX) {
    navigate("/smart-prescription", { state: { patient_data: patientData } });
    return;
  }
  navigate(isDental ? dentalRoute : "/prescription", {
    state: { patient_data: patientData },
  });
};

/**
 * @param {object} opts
 * @param {number} opts.flag — ZYDUS_FLAG.*
 * @param {object} opts.record — raw ICT encounter row
 * @param {Function} opts.dispatch
 * @param {Function} opts.navigate
 * @param {string|number} opts.siteId
 * @param {string|number|Array} opts.empNo
 * @param {boolean} opts.isDentalEnabled
 * @param {string} opts.dentalRoute
 * @param {boolean} opts.isVoiceRxNewUi
 * @param {Function} opts.onError — (message: string) => void
 */
export async function runZydusConsultOrPatientDetails({
  flag,
  record,
  activeTab,
  dispatch,
  navigate,
  siteId,
  empNo,
  isDentalEnabled = false,
  dentalRoute = "/prescription",
  isVoiceRxNewUi = false,
  onError = () => {},
} = {}) {
  const tokenData = getDecodedToken()?.result;
  if (!record) return;

  const sendData = buildLegacyIctSyncPayload(record, { tokenData, siteId });
  const action = await dispatch(syncZydusPatientAndAppointment(sendData));
  if (action.meta.requestStatus !== "fulfilled") {
    onError("Something went wrong! Please try again later");
    return;
  }

  const patientUniqueId =
    action?.payload?.patient_unique_id ||
    record?.patient_unique_id ||
    record?.patientId;
  if (!patientUniqueId) {
    onError("Something went wrong! Please try again later");
    return;
  }

  if (
    flag === ZYDUS_FLAG.CONSULT ||
    flag === ZYDUS_FLAG.SNAP_RX ||
    flag === ZYDUS_FLAG.VOICE_RX ||
    flag === ZYDUS_FLAG.SMART_RX
  ) {
    await goToZydusConsult({
      record,
      action,
      businessId: sendData.business_id,
      flag,
      dispatch,
      navigate,
      activeTab,
      empNo,
      isDentalEnabled,
      dentalRoute,
      isVoiceRxNewUi,
      onError,
    });
    return;
  }

  const actionCashManager = await dispatch(
    viewCaseManager({
      patient_unique_id: patientUniqueId,
      tcm_id: 0,
    })
  );
  if (actionCashManager.meta.requestStatus === "fulfilled") {
    const actionViewPatient = await dispatch(
      viewPatient({
        patient_unique_id: patientUniqueId,
        source: "zydus",
      })
    );
    if (actionViewPatient.meta.requestStatus === "fulfilled") {
      const emp = Array.isArray(empNo) ? empNo[empNo.length - 1] : empNo;
      navigate("/patient_details", {
        state: {
          patient_data: {
            ...actionViewPatient?.payload,
            pam_id: action?.payload?.pam_id,
            mrno: record.mrno,
            departmentId: record.departmentId,
            visitId: record.visitId,
            encounterId: record.encounterId,
            employeeId: emp,
            hospital_business_id: tokenData?.hospital_business_id,
          },
        },
      });
    } else {
      onError("Something went wrong! Please try again later");
    }
  } else {
    await goToZydusConsult({
      record,
      action,
      businessId: sendData.business_id,
      flag: ZYDUS_FLAG.CONSULT,
      dispatch,
      navigate,
      activeTab,
      empNo,
      isDentalEnabled,
      dentalRoute,
      isVoiceRxNewUi,
      onError,
    });
  }
}

async function goToZydusConsult({
  record,
  action,
  businessId,
  flag,
  dispatch,
  navigate,
  empNo,
  isDentalEnabled,
  dentalRoute,
  isVoiceRxNewUi,
  onError,
}) {
  const patientUniqueId =
    action?.payload?.patient_unique_id ||
    record?.patient_unique_id ||
    record?.patientId;
  if (!patientUniqueId) {
    onError("Something went wrong! Please try again later");
    return;
  }

  const actionViewPatient = await dispatch(
    viewPatient({
      patient_unique_id: patientUniqueId,
      source: "zydus",
    })
  );
  if (actionViewPatient.meta.requestStatus !== "fulfilled") {
    onError("Something went wrong! Please try again later");
    return;
  }

  const emp = Array.isArray(empNo) ? empNo[empNo.length - 1] : empNo;
  const patient_data = {
    ...actionViewPatient?.payload,
    pam_id: action?.payload?.pam_id ?? record?.pam_id ?? 0,
    mrno: record.mrno,
    departmentId: record.departmentId,
    visitId: record.visitId,
    encounterId: record.encounterId,
    employeeId: emp,
    hospital_business_id: businessId,
  };
  navigateForFlag({
    navigate,
    flag,
    patientData: patient_data,
    isDental: isDentalEnabled,
    dentalRoute,
    isVoiceRxNewUi,
  });
}

export function isZydusBusinessAccount(isZydusUserFromGB) {
  const tokenData = getDecodedToken()?.result;
  return (
    tokenData?.hospital_business_id == env.zydus_business_id && Boolean(isZydusUserFromGB)
  );
}
