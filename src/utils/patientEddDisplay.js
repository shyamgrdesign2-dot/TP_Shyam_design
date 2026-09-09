import moment from "moment";

/**
 * Resolves the "Estimated Date of Delivery" header field (patient data id 9).
 *
 * The print API does not return `patient_edd_date` on `patient_data`; the date
 * lives on `obsHistoryData.currentPregnancy`, where a corrected EDD (`ceed`)
 * supersedes the LMP-derived one (`edd`) — the same precedence the Obstetric
 * History section prints with.
 */
export const resolvePatientEddDisplay = (patientData, obsHistoryData) => {
  const direct = patientData?.patient_edd_date;
  if (direct) {
    return String(direct);
  }

  const currentPregnancy = obsHistoryData?.currentPregnancy;
  const raw = currentPregnancy?.ceed || currentPregnancy?.edd;
  if (!raw) {
    return "-";
  }

  const parsed = moment(raw);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : String(raw);
};
