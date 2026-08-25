/**
 * Zydus Encounter consult / patient-details flow, mirrored from
 * AppointmentData.js (`onZydus_Consult_PatientDetails_Click`,
 * `syncGenxEncounter`, `goToConsut`).
 *
 * GenX path: POST /genx2/sync-patient-and-appointment, then viewPatient,
 * then navigate to Rx / patient details.
 * Legacy ICT path: POST /appointment/syncZydusPatientAndAppointment (kept
 * as a fallback when the row is not a GenX encounter).
 */
import moment from "moment";
import { jwtDecode } from "jwt-decode";
import { env } from "../../../EnvironmentConfig";
import { getDecodedToken } from "../../../utils/localStorage";
import {
  PERSISTANT_STORAGE_KEY_GENX_TOKEN,
  TAB_ZYDUS_ENCOUNTER,
} from "../../../utils/constants";
import { buildGenxSyncPayload } from "../../../utils/zydusClinicalEncounterAdapter";
import {
  syncGenxPatientAndAppointment,
  syncZydusPatientAndAppointment,
  viewPatient,
} from "../../../redux/appointmentsSlice";
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

const getStoredGenxTokenData = () => {
  try {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_GENX_TOKEN);
    const parsedToken = token == null ? null : JSON.parse(token);
    return parsedToken ? jwtDecode(parsedToken) : {};
  } catch {
    return {};
  }
};

export const getGenxDoctorRefId = ({ tokenData, profile } = {}) => {
  const genxTokenData = getStoredGenxTokenData();
  return (
    genxTokenData?.username ||
    genxTokenData?.sub ||
    tokenData?.username ||
    tokenData?.sub ||
    profile?.username ||
    profile?.doctor_unique_id ||
    ""
  );
};

export const isGenxEncounterFlow = ({ activeTab, record } = {}) =>
  record?.source === "GENX" || activeTab === TAB_ZYDUS_ENCOUNTER || activeTab === "zydus-encounter";

const getGenxPatientData = (record, businessId, syncData = {}, patientDetails = {}) => {
  const patientUniqueId =
    syncData?.patient_unique_id ||
    patientDetails?.patient_unique_id ||
    record?.patient_unique_id ||
    record?.patientId;
  return {
    ...record,
    ...patientDetails,
    patient_unique_id: patientUniqueId,
    pam_id: syncData?.pam_id ?? patientDetails?.pam_id ?? record?.pam_id ?? 0,
    tcm_id: syncData?.tcm_id ?? patientDetails?.tcm_id ?? record?.tcm_id ?? 0,
    pm_fullname:
      patientDetails?.pm_fullname || record?.pm_fullname || record?.patientName || "",
    pm_gender: patientDetails?.pm_gender || record?.pm_gender || record?.gender || "",
    pm_contact_no:
      patientDetails?.pm_contact_no || record?.pm_contact_no || record?.mobileNo || "",
    patient_address:
      patientDetails?.patient_address ||
      record?.patient_address ||
      record?.patientAddress ||
      record?.location ||
      "",
    mrno: record?.mrno,
    departmentId: record?.departmentId,
    visitId: record?.visitId,
    encounterId: record?.encounterId,
    employeeId: record?.employeeId,
    hospital_business_id: businessId,
  };
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
 * @param {object} opts.record — raw ICT/GenX encounter row
 * @param {string} opts.activeTab — listing tab id
 * @param {Function} opts.dispatch
 * @param {Function} opts.navigate
 * @param {object} opts.profile
 * @param {string|number} opts.siteId
 * @param {string|number|Array} opts.empNo
 * @param {object|null} opts.finishedConsultation — matching finished TP row by pam_ref_id
 * @param {boolean} opts.isDentalEnabled
 * @param {string} opts.dentalRoute
 * @param {boolean} opts.isVoiceRxNewUi
 * @param {Function} opts.onError — (message: string) => void
 * @param {Set} opts.syncInFlight — mutable Set for in-flight GenX sync keys
 */
export async function runZydusConsultOrPatientDetails({
  flag,
  record,
  activeTab,
  dispatch,
  navigate,
  profile,
  siteId,
  empNo,
  finishedConsultation = null,
  isDentalEnabled = false,
  dentalRoute = "/prescription",
  isVoiceRxNewUi = false,
  onError = () => {},
  syncInFlight,
} = {}) {
  const tokenData = getDecodedToken()?.result;
  if (!record) return;

  const isGenx = isGenxEncounterFlow({ activeTab, record });

  if (isGenx) {
    if (flag === ZYDUS_FLAG.PATIENT_DETAILS && finishedConsultation?.patient_unique_id) {
      const actionViewPatient = await dispatch(
        viewPatient({
          patient_unique_id: finishedConsultation.patient_unique_id,
          source: "zydus",
        })
      );
      if (actionViewPatient.meta.requestStatus !== "fulfilled") {
        onError("Something went wrong! Please try again later");
        return;
      }
      navigate("/patient_details", {
        state: {
          patient_data: {
            ...record,
            ...actionViewPatient?.payload,
            pam_id: finishedConsultation?.pam_id ?? record?.pam_id ?? 0,
            tcm_id: finishedConsultation?.tcm_id ?? record?.tcm_id ?? 0,
            patient_unique_id: finishedConsultation.patient_unique_id,
            mrno: record?.mrno || finishedConsultation?.pm_reference_id,
            departmentId: record?.departmentId,
            visitId: record?.visitId,
            encounterId: record?.encounterId,
            employeeId: record?.employeeId,
            hospital_business_id: tokenData?.hospital_business_id,
          },
        },
      });
      return;
    }

    const syncKey =
      record?.encounterId || record?.encounterNo || record?.visitId || record?.mrno;
    if (syncKey && syncInFlight?.has(syncKey)) return;
    if (syncKey && syncInFlight) syncInFlight.add(syncKey);

    let syncAction;
    try {
      const payload = buildGenxSyncPayload(record, {
        businessId: tokenData?.hospital_business_id,
        doctorRefId: getGenxDoctorRefId({ tokenData, profile }),
      });
      syncAction = await dispatch(syncGenxPatientAndAppointment(payload));
    } catch (error) {
      onError(error?.message || "Something went wrong! Please try again later");
      return;
    } finally {
      if (syncKey && syncInFlight) syncInFlight.delete(syncKey);
    }

    if (!syncAction || syncAction.meta.requestStatus !== "fulfilled") {
      onError(
        syncAction?.error?.message || "Something went wrong! Please try again later"
      );
      return;
    }

    const syncData = syncAction.payload || {};
    const genxPatientUniqueId = syncData.patient_unique_id;
    if (!genxPatientUniqueId) {
      onError("Something went wrong! Please try again later");
      return;
    }

    const genxAction = {
      payload: {
        patient_unique_id: genxPatientUniqueId,
        pam_id: syncData?.pam_id ?? record?.pam_id ?? 0,
        tcm_id: syncData?.tcm_id ?? record?.tcm_id ?? 0,
        syncData,
      },
    };

    if (
      flag === ZYDUS_FLAG.CONSULT ||
      flag === ZYDUS_FLAG.SNAP_RX ||
      flag === ZYDUS_FLAG.VOICE_RX ||
      flag === ZYDUS_FLAG.SMART_RX
    ) {
      await goToZydusConsult({
        record,
        action: genxAction,
        businessId: tokenData?.hospital_business_id,
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

    // Patient details
    const actionCashManager = await dispatch(
      viewCaseManager({
        patient_unique_id: genxPatientUniqueId,
        tcm_id: syncData?.tcm_id ?? 0,
      })
    );
    if (actionCashManager.meta.requestStatus === "fulfilled") {
      const actionViewPatient = await dispatch(
        viewPatient({
          patient_unique_id: genxPatientUniqueId,
          source: "zydus",
        })
      );
      if (actionViewPatient.meta.requestStatus === "fulfilled") {
        navigate("/patient_details", {
          state: {
            patient_data: {
              ...actionViewPatient?.payload,
              pam_id: syncData?.pam_id ?? record?.pam_id ?? 0,
              tcm_id: syncData?.tcm_id ?? record?.tcm_id ?? 0,
              mrno: record.mrno,
              departmentId: record.departmentId,
              visitId: record.visitId,
              encounterId: record.encounterId,
              employeeId: record.employeeId,
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
        action: genxAction,
        businessId: tokenData?.hospital_business_id,
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
    return;
  }

  // Legacy ICT sync (non-GenX encounter rows)
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
  activeTab,
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

  if (isGenxEncounterFlow({ activeTab, record })) {
    const syncData = action?.payload?.syncData || action?.payload || {};
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
    const patient_data = getGenxPatientData(
      record,
      businessId,
      syncData,
      actionViewPatient?.payload
    );
    navigateForFlag({
      navigate,
      flag,
      patientData: patient_data,
      isDental: isDentalEnabled,
      dentalRoute,
      isVoiceRxNewUi,
    });
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
    employeeId: record?.source === "GENX" ? record.employeeId : emp,
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
