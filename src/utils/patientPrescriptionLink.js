import ApiShortLinks from "../api/services/ApiShortLinks";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "./constants";

export const PATIENT_PRESCRIPTION_ROUTE = "/api/v1/printview/patient-prescription";

export function getStoredAuthToken() {
  try {
    const rawToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    return rawToken ? JSON.parse(rawToken) : null;
  } catch (error) {
    return null;
  }
}

export function buildPatientPrescriptionUrlFromPrintUrl(printUrl, origin = window.location.origin) {
  if (!printUrl) return null;

  const sourceUrl = new URL(printUrl, origin);
  const targetUrl = new URL(PATIENT_PRESCRIPTION_ROUTE, origin);

  sourceUrl.searchParams.forEach((value, key) => {
    if (key !== "output") {
      targetUrl.searchParams.append(key, value);
    }
  });

  return targetUrl.toString();
}

export function buildPatientPrescriptionUrlFromParams(params, origin = window.location.origin) {
  const targetUrl = new URL(PATIENT_PRESCRIPTION_ROUTE, origin);
  const searchParams = params instanceof URLSearchParams ? params : new URLSearchParams(params);

  searchParams.forEach((value, key) => {
    if (key !== "output") {
      targetUrl.searchParams.append(key, value);
    }
  });

  return targetUrl.toString();
}

export async function createPatientPrescriptionShortLink(targetUrl) {
  if (!targetUrl) return null;

  const response = await ApiShortLinks.createShortLink(targetUrl);
  return response?.short_url || null;
}

export async function createPatientPrescriptionShortLinkFromPrintUrl(
  printUrl,
  origin = window.location.origin,
) {
  const patientPrescriptionUrl = buildPatientPrescriptionUrlFromPrintUrl(printUrl, origin);
  const shortUrl = await createPatientPrescriptionShortLink(patientPrescriptionUrl);

  return {
    patientPrescriptionUrl,
    shortUrl,
  };
}
