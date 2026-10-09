import moment from "moment";
import QRCode from "qrcode";
import { jwtDecode } from "jwt-decode";
import api from "../api/services/axiosService";
import config from "../config";
import ApiCaseManager from "../api/services/ApiCaseManager";
import ApiMedication from "../api/services/ApiMedication";
import ApiPrintSettings from "../api/services/ApiPrintSettings";
import ApiCustomModule from "../api/services/ApiCustomModule";
import { getGynecDetails } from "../api/services/ApiGynec";
import {
  normalizeZydusFrequencyList,
  normalizeZydusMedicineFrequencyRows,
} from "./genxMedicationUtils";
import { getAllOpthalPrescriptions } from "../pages/ophthalmology/service";
import {
  getGivenVaccineDetails,
  getOverridenDueDatesByDate,
} from "../pages/vaccination/service";
import { getGrowthChartImages } from "../pages/growthChart/service";
import { fetchObstetricDetails } from "../pages/obstetric/service";
import { fetchPatientWalletBalance } from "../pages/opdBilling/service";

const PAEDIATRICS_DP_ID = 9;
const NEO_NATOLOGISTS_DP_ID = 122;
const PX_TO_PT = 0.75;
const PAGE_X_PADDING = PX_TO_PT * 60;
const WIDTH_OF_A4_PAGE_IN_PTS = 595.28;

function safeAtob(value) {
  if (!value) return "";
  try {
    return atob(decodeURIComponent(value));
  } catch (error) {
    try {
      return atob(value);
    } catch (decodeError) {
      return "";
    }
  }
}

function parsePrintParams(printUrl) {
  const url = new URL(printUrl, window.location.origin);
  const query = url.searchParams;
  return {
    patientUniqueIdEncoded: query.get("patient_unique_id"),
    tcmIdEncoded: query.get("tcm_id"),
    patientUniqueId: safeAtob(query.get("patient_unique_id")),
    tcmId: safeAtob(query.get("tcm_id")),
    token: query.get("token"),
    pamId: query.get("pam_id"),
    rx: query.get("rx"),
    type: query.get("type"),
    lg: query.get("lg"),
    carePlanId: query.get("care_plan_id"),
    rxDigitize: query.get("rxDigitize"),
    voiceRxDigitize: query.get("voiceRxDigitize"),
    ambientVoiceRxDigitize: query.get("ambientVoiceRxDigitize"),
  };
}

function asBooleanFlag(value) {
  return !!(value && String(value).toLowerCase() === "true");
}

function safeDecodeToken(token) {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch (error) {
    return null;
  }
}

async function safeCall(label, task, fallback = null) {
  try {
    const result = await task();
    return result ?? fallback;
  } catch (error) {
    console.error(`Error while fetching print payload ${label}:`, error);
    return fallback;
  }
}

function unwrapApiData(response) {
  if (
    response &&
    typeof response === "object" &&
    Object.prototype.hasOwnProperty.call(response, "status") &&
    Object.prototype.hasOwnProperty.call(response, "data")
  ) {
    return response.data;
  }
  return response;
}

function normalizeVaccinePayload(value, listKey) {
  if (Array.isArray(value)) {
    return { [listKey]: value };
  }
  if (Array.isArray(value?.[listKey])) {
    return value;
  }
  if (Array.isArray(value?.data?.[listKey])) {
    return { ...value, [listKey]: value.data[listKey] };
  }
  return value || { [listKey]: [] };
}

function unwrapRequiredApiData(response, label) {
  if (
    response &&
    typeof response === "object" &&
    Object.prototype.hasOwnProperty.call(response, "status")
  ) {
    if (!response.status) {
      throw new Error(response.error || `${label} request failed.`);
    }
    return response.data;
  }
  return response;
}

async function fetchMedicineFrequencyListForPrint(isZydusHospitalBusiness) {
  if (isZydusHospitalBusiness) {
    const zydusFrequencyResponse = await safeCall(
      "zydus medicine frequency list",
      () => ApiMedication.showZydusMedicineFrequency(),
      null
    );
    const zydusFrequencyList = normalizeZydusFrequencyList(zydusFrequencyResponse);

    if (zydusFrequencyList.length > 0) {
      return zydusFrequencyList;
    }
  }

  const frequencyListResponse = await ApiMedication.showMedicineFrequency();
  return unwrapApiData(frequencyListResponse);
}

function normalizeCaseManagerMedicineForZydusPrint(
  caseManagerData,
  frequencyList,
  isZydusHospitalBusiness
) {
  if (!isZydusHospitalBusiness || !Array.isArray(caseManagerData?.medicine)) {
    return caseManagerData;
  }

  return {
    ...caseManagerData,
    medicine: normalizeZydusMedicineFrequencyRows(
      caseManagerData.medicine,
      frequencyList
    ),
  };
}

function getRemoteImageDimensions(imageUrl) {
  if (!imageUrl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

async function buildPrintAssets(printSettings, doctorDataGet, appointmentLinkShared) {
  let fileHeader = null;
  let fileFooter = null;
  let fileLogo = null;
  let fileWatermark = null;
  let fileSignature = null;
  let nextPrintSettings = printSettings;

  if (printSettings?.logo_enable === "Y" && printSettings?.logo_image) {
    fileLogo = { imageShow: true, showFile: printSettings.logo_image };
  }
  if (printSettings?.header_image) {
    fileHeader = { imageShow: true, showFile: printSettings.header_image };
  }
  if (printSettings?.footer_image) {
    fileFooter = { imageShow: true, showFile: printSettings.footer_image };
  }
  if (fileFooter?.imageShow) {
    const dimensions = await getRemoteImageDimensions(fileFooter.showFile);
    if (dimensions?.height && dimensions?.width) {
      fileFooter.footerHeight = dimensions.height;
      fileFooter.footerWidth = dimensions.width;
      fileFooter.renderedFooterImageHeight =
        (dimensions.height / dimensions.width) *
        (WIDTH_OF_A4_PAGE_IN_PTS - PAGE_X_PADDING);
    }
  }
  if (printSettings?.water_mark_enable === "Y" && printSettings?.water_mark_image) {
    fileWatermark = { imageShow: true, showFile: printSettings.water_mark_image };
  }
  if (printSettings?.signature_enable === "Y" && printSettings?.signature_image) {
    fileSignature = { imageShow: true, showFile: printSettings.signature_image };
  }
  if (printSettings?.um_contact && printSettings?.hm_refer_code) {
    const doctorData = Array.isArray(doctorDataGet) && doctorDataGet.length > 0
      ? doctorDataGet[0]
      : null;
    const publishUrl = doctorData?.website_publish ? doctorData?.publish_url : null;
    const qrCodeUrl = publishUrl || appointmentLinkShared;
    const qrcode = qrCodeUrl ? await QRCode.toDataURL(qrCodeUrl) : null;
    nextPrintSettings = { ...printSettings, qrcode };
  }

  return {
    printSettings: nextPrintSettings,
    fileHeader,
    fileFooter,
    fileLogo,
    fileWatermark,
    fileSignature,
  };
}

function buildVitalsTable(caseManagerData) {
  let initialRows = [
    { key: "1", name: "Temp (F)" },
    { key: "2", name: "Pulse (/min)" },
    { key: "3", name: "Resp. Rate (/min)" },
    { key: "4", name: "Blood Pressure (mmHg)" },
    { key: "5", name: "SPO2 (%)" },
    { key: "6", name: "General RBS (mg/dl)" },
    { key: "7", name: "FIB4" },
    { key: "8", name: "Waist Circumference" },
    { key: "9", name: "OFC (cms)" },
    { key: "10", name: "Height (cms)" },
    { key: "11", name: "Weight (kgs)" },
    { key: "12", name: "BMI (kg/m²)" },
    { key: "13", name: "BMR (kcals)" },
    { key: "14", name: "BSA (m²)" },
  ];

  const isPediatric =
    caseManagerData?.doctor_data?.dp_id === PAEDIATRICS_DP_ID ||
    caseManagerData?.doctor_data?.dp_id === NEO_NATOLOGISTS_DP_ID;

  if (isPediatric) {
    const priorityNames = ["Weight (kgs)", "Height (cms)", "OFC (cms)"];
    const priorityRows = [];
    const otherRows = [];
    initialRows.forEach((row) => {
      if (priorityNames.includes(row.name)) priorityRows.push(row);
      else otherRows.push(row);
    });
    const orderedPriority = priorityNames
      .map((name) => priorityRows.find((row) => row.name === name))
      .filter(Boolean);
    initialRows = [...orderedPriority, ...otherRows];
  }

  const setRowValue = (rowName, columnIndex, value) => {
    const targetRow = initialRows.find((row) => row.name === rowName);
    if (targetRow) {
      targetRow[columnIndex] = value ?? "-";
    }
  };

  const uniqueDates =
    caseManagerData?.vitals?.length > 0
      ? caseManagerData.vitals.slice(0, 3).map((item) => item?.date)
      : [];
  const columns = [
    { title: "Name" },
    ...uniqueDates.map((date) => ({ title: moment(date).format("DD MMM, YY") })),
  ];

  caseManagerData?.vitals?.slice(0, 3).forEach((item, index) => {
    const formattedBP = item?.blood_press
      ? item.blood_press.endsWith("/")
        ? item.blood_press.substring(0, item.blood_press.length - 1)
        : item.blood_press
      : "-";
    setRowValue("Temp (F)", index, item?.temp ?? "-");
    setRowValue("Pulse (/min)", index, item?.pres ?? "-");
    setRowValue("Resp. Rate (/min)", index, item?.resp_rate ?? "-");
    setRowValue("Blood Pressure (mmHg)", index, formattedBP || "-");
    setRowValue("SPO2 (%)", index, item?.spo2 ?? "-");
    setRowValue("General RBS (mg/dl)", index, item?.general_rbs ?? "-");
    setRowValue("FIB4", index, item?.fib4 ?? "-");
    setRowValue("Waist Circumference", index, item?.waist_circumference ?? "-");
    setRowValue("OFC (cms)", index, Number(item?.ofc) ? parseFloat(item.ofc).toFixed(2) : "-");
    setRowValue("Height (cms)", index, item?.height ?? "-");
    setRowValue("Weight (kgs)", index, item?.weight ?? "-");
    setRowValue("BMI (kg/m²)", index, item?.bmi ? parseFloat(item.bmi).toFixed(2) : "-");
    setRowValue("BMR (kcals)", index, item?.bmr ? parseFloat(item.bmr).toFixed(2) : "-");
    setRowValue("BSA (m²)", index, item?.bsa ? parseFloat(item.bsa).toFixed(2) : "-");
  });

  return { columns, initialRows };
}

function ensureOphthalmologyPrintSetting(printSettings) {
  const options = printSettings?.prescription?.case_option;
  if (!Array.isArray(options)) return printSettings;
  const existing = options.find((option) => option.id === 20);
  const ophthalmologyOption = [
    { id: "visualAcuity", visible: true, view: 3 },
    {
      id: "autoRefraction",
      visible: true,
      view: 3,
      subSections: [
        { id: "undilated", visible: true },
        { id: "dilated", visible: true },
      ],
    },
    { id: "lensometerValues", visible: true, view: 3 },
    { id: "glassPrescription", visible: true, view: 3 },
    { id: "intraOcularPressure", visible: true, view: 3 },
    { id: "slitLampExamination", visible: true, view: 3 },
    { id: "fundusExamination", visible: true, view: 3 },
  ];

  if (!existing) {
    return {
      ...printSettings,
      prescription: {
        ...printSettings.prescription,
        case_option: [
          ...options,
          {
            id: 20,
            title: "Ophthal Details",
            format: "table",
            enable: "Y",
            custom_status: "Y",
            ophthalmology_option: ophthalmologyOption,
          },
        ],
      },
    };
  }

  if (existing.ophthalmology_option) return printSettings;

  return {
    ...printSettings,
    prescription: {
      ...printSettings.prescription,
      case_option: options.map((option) =>
        option.id === 20 ? { ...option, ophthalmology_option: ophthalmologyOption } : option,
      ),
    },
  };
}

function buildSmartDigitizePayload({
  smartRxDataFetch,
  rxDigitizeData,
  voiceRxResponseData,
  ambientVoiceRxResponseData,
  isRxDigitizeBool,
  isVoiceRxDigitizeBool,
  isAmbientVoiceRxDigitizeBool,
}) {
  const smartRxData = smartRxDataFetch?.uploaded_files?.length > 0;
  const rxDigitizeEditedData = rxDigitizeData?.editedData ?? null;
  const voiceRxDigitizeEditedData =
    voiceRxResponseData?.editedData && Object.keys(voiceRxResponseData.editedData || {}).length > 0
      ? voiceRxResponseData.editedData
      : voiceRxResponseData?.digitizeData || null;
  const ambientVoiceRxDigitizeEditedData =
    ambientVoiceRxResponseData?.editedData &&
    Object.keys(ambientVoiceRxResponseData.editedData || {}).length > 0
      ? ambientVoiceRxResponseData.editedData
      : ambientVoiceRxResponseData?.digitizeData || null;

  if (isAmbientVoiceRxDigitizeBool) {
    return ambientVoiceRxResponseData
      ? {
          ...ambientVoiceRxResponseData,
          isRxDigitizeBool,
          isVoiceRxDigitizeBool,
          isAmbientVoiceRxDigitizeBool,
          ambientVoiceRxDigitizeEditedData,
          history:
            ambientVoiceRxResponseData?.history ||
            ambientVoiceRxResponseData?.rxDigitizationHistory ||
            [],
        }
      : null;
  }

  if (isVoiceRxDigitizeBool) {
    return voiceRxResponseData
      ? {
          ...voiceRxResponseData,
          isRxDigitizeBool,
          isVoiceRxDigitizeBool,
          isAmbientVoiceRxDigitizeBool,
          voiceRxDigitizeEditedData,
          history:
            voiceRxResponseData?.history ||
            voiceRxResponseData?.rxDigitizationHistory ||
            [],
        }
      : null;
  }

  return smartRxData
    ? {
        ...smartRxDataFetch,
        isRxDigitizeBool,
        isVoiceRxDigitizeBool,
        isAmbientVoiceRxDigitizeBool,
        rxDigitizeEditedData,
        version: rxDigitizeData?.version,
      }
    : null;
}

function shouldFetchGrowthChart(caseManagerData, forceEnabled) {
  return (
    forceEnabled ||
    caseManagerData?.doctor_data?.dp_id === PAEDIATRICS_DP_ID ||
    caseManagerData?.doctor_data?.dp_name === "Paediatrics"
  );
}

export async function buildPrintPayloadDataFromPrintUrl(
  printUrl,
  {
    isCvtExtHosAccessableFromGB,
    isGrowthChartAccessableFromGB,
  } = {},
) {
  if (!printUrl) throw new Error("Print URL is missing.");

  const params = parsePrintParams(printUrl);
  if (!params.patientUniqueId || !params.tcmId) {
    throw new Error("Print URL is missing patient or consultation id.");
  }

  const decodedToken = safeDecodeToken(params.token);
  const doctorId = decodedToken?.result?.user_id;
  const clinicId = decodedToken?.result?.clinic_id;
  const hospitalBusinessId =
    decodedToken?.result?.hospital_business_id != null
      ? String(decodedToken.result.hospital_business_id)
      : undefined;
  const isZydusHospitalBusiness =
    hospitalBusinessId !== undefined &&
    config.zydus_business_id !== undefined &&
    String(hospitalBusinessId) === String(config.zydus_business_id);
  const isRxDigitizeBool = asBooleanFlag(params.rxDigitize);
  const isVoiceRxDigitizeBool = asBooleanFlag(params.voiceRxDigitize);
  const isAmbientVoiceRxDigitizeBool = asBooleanFlag(params.ambientVoiceRxDigitize);

  const caseManagerResponse = await ApiCaseManager.viewCaseManager({
    patient_unique_id: params.patientUniqueId,
    tcm_id: params.tcmId,
  });
  let caseManagerData = unwrapRequiredApiData(
    caseManagerResponse,
    "Case manager data",
  );
  if (!caseManagerData) throw new Error("Case manager data is missing.");
  if (caseManagerData.patient_data && params.patientUniqueId) {
    caseManagerData.patient_data.patient_unique_id = params.patientUniqueId;
  }

  const printSettingsDoctorId = caseManagerData?.doctor_data?.um_id || doctorId;
  const [rawPrintSettingsResponse, timingListResponse, frequencyListResponse] = await Promise.all([
    ApiPrintSettings.getDefaultPrintsettings({
      default: false,
      um_id: printSettingsDoctorId,
    }),
    ApiMedication.showMedicineTime(),
    fetchMedicineFrequencyListForPrint(isZydusHospitalBusiness),
  ]);
  const rawPrintSettings = unwrapRequiredApiData(
    rawPrintSettingsResponse,
    "Print settings",
  );
  const timingList = unwrapApiData(timingListResponse);
  const frequencyList = Array.isArray(frequencyListResponse)
    ? frequencyListResponse
    : unwrapApiData(frequencyListResponse);
  caseManagerData = normalizeCaseManagerMedicineForZydusPrint(
    caseManagerData,
    frequencyList,
    isZydusHospitalBusiness
  );
  let printSettings = ensureOphthalmologyPrintSetting(rawPrintSettings);
  const doctorUmId = caseManagerData?.doctor_data?.um_id || doctorId;

  const consultationDate = caseManagerData?.patient_data?.patient_consultaion_date
    ? moment(caseManagerData.patient_data.patient_consultaion_date).format("YYYY-MM-DD")
    : moment().format("YYYY-MM-DD");
  const smartPrescriptionFile = caseManagerData?.smart_prescription_filename || null;
  const labReportID = caseManagerData?.labReportID ?? "";
  const digitizationBaseUrl = config.digitization_api_url || config.snap_rx_api_url;
  const voiceAmbientDigitizeUrl =
    digitizationBaseUrl && smartPrescriptionFile
      ? `/api/v1/digitization/voice?id=${encodeURIComponent(smartPrescriptionFile)}`
      : null;

  const appointmentAgentsUrl =
    config.symptoms_collector_api_url && clinicId
      ? `/api/v1/receptionist/receptionist-agents?clinicId=${clinicId}`
      : null;

  const [
    ophthalModuleData,
    doctorDataGet,
    agentsResponse,
    givenVaccines,
    dueVaccines,
    gynecHistoryDetails,
    obsHistoryData,
    patientBills,
    advanceReceipts,
    patientWalletBalance,
    labParamsDetails,
    customModules,
    carePlanAssignments,
    labReportData,
    smartRxDataFetch,
    rxDigitize,
    voiceRxResponse,
    ambientVoiceRxResponse,
    abhaDetails,
    growthChartDetails,
  ] = await Promise.all([
    safeCall("ophthalmology", () =>
      getAllOpthalPrescriptions({
        tcm_id: params.tcmId,
        patientId: params.patientUniqueId,
      }),
    null),
    safeCall("doctor profile", () =>
      api.get("/api/v1/appointment/showProfile", {
        customBaseUrl: config.appointment_api_url,
      }),
    null),
    safeCall("appointment agents", () =>
      appointmentAgentsUrl
        ? api.get(appointmentAgentsUrl, {
            customBaseUrl: config.symptoms_collector_api_url,
          })
        : null,
    null),
    safeCall("given vaccines", () =>
      getGivenVaccineDetails(
        params.patientUniqueId,
        caseManagerData?.patient_data?.patient_id,
        consultationDate,
      ),
    {}),
    safeCall("due vaccines", () =>
      getOverridenDueDatesByDate(
        params.patientUniqueId,
        caseManagerData?.patient_data?.patient_id,
        consultationDate,
      ),
    {}),
    safeCall("gynec history", () =>
      doctorUmId ? getGynecDetails(params.patientUniqueId, doctorUmId) : null,
    null),
    safeCall("obstetric history", () =>
      doctorUmId
        ? fetchObstetricDetails(
            params.patientUniqueId,
            doctorUmId,
            true,
          )
        : null,
    null),
    safeCall("patient bills", () =>
      params.pamId || params.tcmId
        ? api.get(
            `/api/v1/billing/bill/listByPatient?doctorIds=${doctorId || ""}&sortBy=date&sortOrder=asc&page=1&limit=25&includeInRx=true&patientId=${params.patientUniqueId}${
              params.pamId ? `&appointmentId=${params.pamId}` : ""
            }${params.tcmId ? `&tcm_id=${params.tcmId}` : ""}`,
            { customBaseUrl: config.lab_params_api_url },
          )
        : null,
    null),
    safeCall("advance receipts", () =>
      params.pamId || params.tcmId
        ? api.get(
            `/api/v1/billing/advancedDeposit/listByPatient?doctorIds=${doctorId || ""}&sortBy=date&sortOrder=asc&status=Refund&status=Deposit&patientId=${params.patientUniqueId}&page=1&limit=25${
              params.pamId ? `&appointmentId=${params.pamId}` : ""
            }${params.tcmId ? `&tcm_id=${params.tcmId}` : ""}`,
            { customBaseUrl: config.lab_params_api_url },
          )
        : null,
    null),
    safeCall("patient wallet balance", () =>
      fetchPatientWalletBalance(params.patientUniqueId),
    null),
    safeCall("lab params", () =>
      api.get(`/api/v1/lab-parameters/results/${params.patientUniqueId}?today=true`, {
        customBaseUrl: config.lab_params_api_url,
      }),
    null),
    safeCall("custom modules", () =>
      doctorUmId ? ApiCustomModule.getModules(doctorUmId) : null,
    null),
    safeCall("care plan assignments", () => {
      const query = new URLSearchParams({
        tcm_id: params.tcmId,
        patient_unique_id: params.patientUniqueId,
      });
      if (params.carePlanId) query.set("care_plan_id", params.carePlanId);
      return api.get(`/api/v1/care-plans/assignments?${query.toString()}`, {
        customBaseUrl: config.lab_params_api_url,
      });
    }, null),
    safeCall("lab report", () =>
      labReportID
        ? api.post(
            "/api/v1/lab-reports/getByID",
            {
              labReportID,
              patient_unique_id: params.patientUniqueId,
              source: "zydus-ict",
            },
            { customBaseUrl: config.lab_params_api_url },
          )
        : null,
    null),
    safeCall("smart rx files", () =>
      smartPrescriptionFile
        ? api.get(
            `/api/v1/digitization/snap-rx/get-files?patient_unique_id=${params.patientUniqueId}&tcm_id=${params.tcmId}`,
            { customBaseUrl: digitizationBaseUrl },
          )
        : null,
    null),
    safeCall("rx digitize", () =>
      smartPrescriptionFile && isRxDigitizeBool
        ? api.get(`/api/v1/rxdigitize/rx/${params.tcmId}`, {
            customBaseUrl: config.rx_digitization,
          })
        : null,
    null),
    safeCall("voice digitize", () =>
      isVoiceRxDigitizeBool && voiceAmbientDigitizeUrl
        ? api.get(voiceAmbientDigitizeUrl, {
            customBaseUrl: digitizationBaseUrl,
          })
        : null,
    null),
    safeCall("ambient voice digitize", () =>
      isAmbientVoiceRxDigitizeBool && voiceAmbientDigitizeUrl
        ? api.get(voiceAmbientDigitizeUrl, {
            customBaseUrl: digitizationBaseUrl,
          })
        : null,
    null),
    safeCall("abha details", () =>
      api.get(
        `/api/v1/patients/fetch-abha-details?patientUniqueId=${params.patientUniqueId}`,
        { customBaseUrl: config.ipd_api_url?.replace(/\/api\/v1\/?$/, "") || config.abha_records_api_url },
      ),
    null),
    safeCall("growth chart", async () => {
      if (!shouldFetchGrowthChart(caseManagerData, isGrowthChartAccessableFromGB)) {
        return {};
      }
      let growthChartData = await api.get(
        `/growthChart/all?pm_id=${caseManagerData?.patient_data?.pm_id}&pm_pid=${caseManagerData?.patient_data?.patient_id}&source=GROWTH_CHART`,
        { customBaseUrl: config.growth_chart_api_url },
      );
      const todayGrowthChartData =
        Array.isArray(growthChartData) &&
        growthChartData.find(
          (p) =>
            Math.abs(
              (new Date(p?.tcbc_created_date).getTime() - new Date().getTime()) /
                86400000,
            ) < 1.5,
        );
      if (!todayGrowthChartData) {
        return { growthChartData: [], growthChartImageData: null };
      }
      const growthChartImageData = await getGrowthChartImages({
        pm_id: caseManagerData?.patient_data?.pm_id,
        pm_pid: caseManagerData?.patient_data?.patient_id,
      });
      return { growthChartData, growthChartImageData };
    }, {}),
  ]);

  const ophthalData = unwrapApiData(ophthalModuleData);
  const doctorData = unwrapApiData(doctorDataGet);
  const agentsData = unwrapApiData(agentsResponse);
  const givenVaccinesData = normalizeVaccinePayload(
    unwrapApiData(givenVaccines),
    "template",
  );
  const dueVaccinesData = normalizeVaccinePayload(
    unwrapApiData(dueVaccines),
    "detail",
  );
  const gynecHistoryData = unwrapApiData(gynecHistoryDetails);
  const obstetricHistoryData = unwrapApiData(obsHistoryData);
  const patientBillsData = unwrapApiData(patientBills);
  const advanceReceiptsData = unwrapApiData(advanceReceipts);
  const patientWalletBalanceData = unwrapApiData(patientWalletBalance);
  const labParamsData = unwrapApiData(labParamsDetails);
  const customModulesData = unwrapApiData(customModules);
  const carePlanAssignmentsData = unwrapApiData(carePlanAssignments);
  const labReportPayload = unwrapApiData(labReportData);
  const smartRxPayload = unwrapApiData(smartRxDataFetch);
  const rxDigitizePayload = unwrapApiData(rxDigitize);
  const voiceRxPayload = unwrapApiData(voiceRxResponse);
  const ambientVoiceRxPayload = unwrapApiData(ambientVoiceRxResponse);
  const abhaPayload = unwrapApiData(abhaDetails);
  const growthChartPayload = unwrapApiData(growthChartDetails);
  const labParamsResults =
    (Array.isArray(labParamsData) && labParamsData) ||
    labParamsData?.results ||
    labParamsData?.data?.results ||
    labParamsData?.data?.data?.results ||
    null;

  const appointmentLinkShared =
    Array.isArray(agentsData) && agentsData.length > 0
      ? agentsData[0]?.appointmentLinkShared || null
      : null;

  const assets = await buildPrintAssets(printSettings, doctorData, appointmentLinkShared);
  printSettings = assets.printSettings;

  const rxDigitizeData = rxDigitizePayload?.data ?? rxDigitizePayload ?? null;
  const voiceRxResponseData = voiceRxPayload?.data ?? voiceRxPayload ?? null;
  const ambientVoiceRxResponseData = ambientVoiceRxPayload?.data ?? ambientVoiceRxPayload ?? null;
  const smartDigitizeRxData = buildSmartDigitizePayload({
    smartRxDataFetch: smartRxPayload,
    rxDigitizeData,
    voiceRxResponseData,
    ambientVoiceRxResponseData,
    isRxDigitizeBool,
    isVoiceRxDigitizeBool,
    isAmbientVoiceRxDigitizeBool,
  });

  let mode = "NORMAL";
  if (params.type === "w" && printSettings?.letterhead_format === 2) {
    mode = "WHATSAPP";
  }
  const rx = params.rx === "1";
  const lg = params.lg ? safeAtob(params.lg) : 1;
  const { columns, initialRows } = buildVitalsTable(caseManagerData);

  return {
    mode,
    rx,
    lg,
    caseManagerData: {
      ...caseManagerData,
      ...(labParamsResults?.length > 0 ? { labParamsData: labParamsResults } : {}),
    },
    columns,
    initialRows,
    frequencyList,
    timingList,
    printSettings,
    fileHeader: assets.fileHeader,
    fileFooter: assets.fileFooter,
    fileLogo: assets.fileLogo,
    fileWatermark: assets.fileWatermark,
    fileSignature: assets.fileSignature,
    givenVaccines: givenVaccinesData,
    dueVaccines: dueVaccinesData,
    carePlanAssignments: carePlanAssignmentsData,
    smartDigitizeRxData,
    growthChartDetails: growthChartPayload,
    gynecHistoryData: gynecHistoryData || null,
    obsHistoryData: obstetricHistoryData,
    labParamsData: labParamsResults,
    ophthalModuleData: Array.isArray(ophthalData)
      ? ophthalData[0] || null
      : ophthalData,
    customModules: customModulesData,
    patientBills: patientBillsData?.bills ?? patientBillsData ?? [],
    advanceReceipts: advanceReceiptsData?.receipts ?? advanceReceiptsData ?? [],
    patientWalletBalance:
      patientWalletBalanceData?.advanceDepositBalance ?? patientWalletBalanceData ?? 0,
    labReportData: labReportPayload,
    abhaDetails: abhaPayload,
    isCvtExtHosAccessableFromGB,
    hospitalBusinessId,
  };
}
