import ApiCaseManager from "../../../api/services/ApiCaseManager";
import { getGenRx } from "../../../api/services/ApiGenRx";
import { isValidMongoId } from "../../../utils/utils";

function getConsultationsFromResponse(response) {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.consultations)) return payload.consultations;
  if (Array.isArray(payload?.data?.consultations)) return payload.data.consultations;
  return [];
}

function hasVoiceConversation(conversation) {
  if (Array.isArray(conversation)) return conversation.length > 0;
  return typeof conversation === "string" && conversation.trim() !== "";
}

async function getVoiceRxPrintPayloadMeta(recordId) {
  const defaultMeta = {
    shouldUseVoiceRxPrintPayload: false,
    isAmbientVoiceRx: false,
  };
  if (!recordId) return defaultMeta;
  try {
    const response = await getGenRx(recordId);
    const payload = response?.data ?? response?.response;
    const history = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.history)
        ? payload.history
        : [];
    const version =
      typeof payload?.version === "string" ? payload.version.trim().toLowerCase() : "legacy";
    const isAmbientVoiceRx = Boolean(
      payload?.isAmbientVoiceRxDigitizeBool ||
        payload?.ambientVoiceRxDigitizeEditedData ||
        history.some((item) => hasVoiceConversation(item?.conversation))
    );
    return {
      shouldUseVoiceRxPrintPayload: version !== "v3",
      isAmbientVoiceRx,
    };
  } catch (error) {
    console.error("Failed to identify VoiceRx print payload type:", error);
    return defaultMeta;
  }
}

function getSmartPrescriptionFilename(caseManagerData) {
  const filename = caseManagerData?.smart_prescription_filename;
  return Array.isArray(filename) ? filename.find(Boolean) : filename;
}

/**
 * Full prescription print uses caseManager print_url (not medicines-only print_rx_url).
 * Matches AppointmentData.buildFinishedPrintUrl.
 */
export function buildFinishedPrintUrl({
  caseManagerData,
  latestConsultation,
  record,
  selectedLang,
  shouldUseVoiceRxPrintPayload = false,
  isAmbientVoiceRx = false,
}) {
  const basePrintUrl = caseManagerData?.print_url;
  if (!basePrintUrl) return null;

  const urlObj = new URL(basePrintUrl, window.location.origin);
  const resolvedPamId =
    caseManagerData?.pam_id ??
    latestConsultation?.pam_id ??
    record?.pam_id ??
    caseManagerData?.appointmentId ??
    latestConsultation?.appointmentId;
  if (resolvedPamId) {
    urlObj.searchParams.set("pam_id", resolvedPamId);
  }

  if (shouldUseVoiceRxPrintPayload) {
    if (isAmbientVoiceRx) {
      urlObj.searchParams.set("ambientVoiceRxDigitize", "true");
      urlObj.searchParams.set("voiceRxDigitize", "false");
    } else {
      urlObj.searchParams.delete("ambientVoiceRxDigitize");
      urlObj.searchParams.set("voiceRxDigitize", "true");
    }
    urlObj.searchParams.set("rxDigitize", "false");
  } else {
    urlObj.searchParams.delete("ambientVoiceRxDigitize");
  }

  urlObj.searchParams.set("lg", selectedLang || "");
  return urlObj.toString();
}

export function encodePrintLanguage(language) {
  return language && language !== "English" ? btoa(String(language)) : "";
}

/**
 * Resolve the latest finished visit print URL + case manager payload for
 * frontend PDF generation (usePrintPayloadPdf), same as AppointmentData.
 */
export async function resolveLatestFinishedPrintUrl(record, selectedLang) {
  const patientUniqueId = record?.patient_unique_id;
  if (!patientUniqueId) {
    throw new Error("Patient unique ID is missing.");
  }

  let tcmId = record?.tcm_id;
  let latestConsultation = null;

  if (!tcmId) {
    const consultationsResponse = await ApiCaseManager.listConsultations({
      patient_unique_id: patientUniqueId,
      limit: 10,
      page: 1,
    });
    const consultations = getConsultationsFromResponse(consultationsResponse);
    latestConsultation = consultations?.[0];
    tcmId = latestConsultation?.tcm_id;
  } else {
    latestConsultation = {
      tcm_id: tcmId,
      pam_id: record?.pam_id,
      appointmentId: record?.appointmentId,
    };
  }

  if (!tcmId) {
    throw new Error("Consultation not found.");
  }

  const caseManagerResponse = await ApiCaseManager.viewCaseManager({
    patient_unique_id: patientUniqueId,
    tcm_id: tcmId,
  });
  if (caseManagerResponse?.status === false) {
    throw new Error(caseManagerResponse?.error || "Failed to fetch prescription.");
  }
  const caseManagerData = caseManagerResponse?.data ?? caseManagerResponse;
  const smartPrescriptionFilename = getSmartPrescriptionFilename(caseManagerData);
  const voiceRxPrintPayloadMeta = isValidMongoId(smartPrescriptionFilename)
    ? await getVoiceRxPrintPayloadMeta(smartPrescriptionFilename)
    : {
        shouldUseVoiceRxPrintPayload: false,
        isAmbientVoiceRx: false,
      };
  const printUrl = buildFinishedPrintUrl({
    caseManagerData,
    latestConsultation,
    record,
    selectedLang,
    ...voiceRxPrintPayloadMeta,
  });
  if (!printUrl) {
    throw new Error("Print URL is missing.");
  }
  return { printUrl, caseManagerData, latestConsultation };
}
