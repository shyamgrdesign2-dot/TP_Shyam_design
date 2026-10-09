import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { buildGenxMedicationOrderDrugLines } from "./genxMedicationUtils";

dayjs.extend(customParseFormat);

const isBlankValue = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "");

const GENX_CREATION_TIMESTAMP_FORMAT = "YYYY-MM-DD";
const GENX_ENCOUNTER_DATETIME_FORMATS = [
  "DD-MM-YYYY HH:mm",
  "DD-MM-YYYY HH:mm:ss",
  "DD-MM-YYYY",
  "YYYY-MM-DD HH:mm",
  "YYYY-MM-DD HH:mm:ss",
  GENX_CREATION_TIMESTAMP_FORMAT,
];

export const formatGenxCreationTimeStamp = (value) => {
  if (isBlankValue(value)) return "";

  const rawValue = String(value).trim();
  const parsedDate = dayjs(rawValue, GENX_ENCOUNTER_DATETIME_FORMATS, true);

  if (parsedDate.isValid()) {
    return parsedDate.format(GENX_CREATION_TIMESTAMP_FORMAT);
  }

  const fallbackDate = dayjs(rawValue);
  return fallbackDate.isValid()
    ? fallbackDate.format(GENX_CREATION_TIMESTAMP_FORMAT)
    : rawValue;
};

export const getGenxInvestigationServiceMasterId = (service = {}) =>
  service?.serviceMasterId ??
  "";

export const getGenxInvestigationServiceId = getGenxInvestigationServiceMasterId;

export const getGenxInvestigationOrderServiceId = (investigation = {}) =>
  getGenxInvestigationServiceMasterId(investigation) ||
  (investigation?.is_genx_investigation ? investigation?.serviceId : "") ||
  "";

export const buildGenxInvestigationOrderServices = (investigations = []) => {
  if (!Array.isArray(investigations)) return [];

  return investigations.reduce((services, investigation) => {
    const serviceId = getGenxInvestigationOrderServiceId(investigation);

    if (isBlankValue(serviceId)) return services;

    services.push({
      serviceId,
      remarks: investigation?.note ?? investigation?.remarks ?? "",
    });

    return services;
  }, []);
};

export const buildGenxOrderMedicineAndInvestigationPayload = ({
  tcmId,
  patientData = {},
  investigationData = [],
  medicationData = [],
  allowRehydratedZydusMedicationRows = false,
} = {}) => {
  const patientUniqueId = patientData?.patient_unique_id;
  const patientId = patientData?.raw?.patientId ?? patientData?.patientId ?? "";
  const creationTimeStamp =
    formatGenxCreationTimeStamp(
      patientData?.raw?.encounterDatetime ??
      patientData?.encounterDatetime ??
      patientData?.raw?.encounterDateTime ??
      patientData?.encounterDateTime ??
      ""
    );
  const services = buildGenxInvestigationOrderServices(investigationData);
  const drugLines = buildGenxMedicationOrderDrugLines(medicationData, {
    allowRehydratedZydusMedicationRows,
  });

  if (
    isBlankValue(tcmId) ||
    isBlankValue(patientUniqueId) ||
    isBlankValue(patientId) ||
    (services.length === 0 && drugLines.length === 0)
  ) {
    return null;
  }

  return {
    tcm_id: tcmId,
    patient_unique_id: patientUniqueId,
    patientId,
    creationTimeStamp,
    services,
    drugLines,
  };
};

export const convertGenxInvestigationService = (service = {}, uniqueId = "") => {
  const serviceMasterId = getGenxInvestigationServiceMasterId(service);
  const serviceName =
    service?.serviceName ||
    service?.investigation_name ||
    service?.name ||
    "";

  return {
    is_genx_investigation: true,
    serviceId: serviceMasterId,
    serviceMasterId,
    genx_service_master_id: serviceMasterId,
    genx_service_id: service?.serviceId || "",
    genx_service_code: service?.serviceCode || service?.service_code || "",
    genx_service_name: serviceName,
    genx_service_short_name: service?.serviceShortName || "",
    genx_service_type_code: service?.serviceType?.lookupCode || "",
    genx_service_type_name: service?.serviceType?.lookupName || "",
    genx_service_classification_code:
      service?.serviceClassification?.lookupCode || "",
    genx_service_classification_name:
      service?.serviceClassification?.lookupName || "",
    genx_service_raw: service || null,
    investigation_name: serviceName,
    service_code: service?.serviceCode || service?.service_code || "",
    note: "",
    unique_id: uniqueId,
  };
};

export const convertGenxInvestigationSearchResults = (
  services = [],
  createUniqueId
) => {
  if (!Array.isArray(services)) return [];

  return services
    .slice(0, 10)
    .map((service) =>
      convertGenxInvestigationService(
        service,
        typeof createUniqueId === "function" ? createUniqueId() : ""
      )
    );
};
