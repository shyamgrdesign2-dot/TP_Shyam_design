import React, { useEffect, useMemo, useState } from "react";
import { Alert, Spin } from "antd";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { isAndroid } from "react-device-detect";
import config from "../config";
import { usePrintPayloadPdf } from "../hooks/usePrintPayloadPdf";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import { getStoredAuthToken } from "../utils/patientPrescriptionLink";

const TOKEN_QUERY_KEYS = ["token", "authToken"];

function safeDecodeBase64(value) {
  if (!value) return null;
  try {
    return atob(decodeURIComponent(value));
  } catch (error) {
    try {
      return atob(value);
    } catch (decodeError) {
      return null;
    }
  }
}

function parsePrintUrlParams(searchParams) {
  const nestedPrintUrl = searchParams.get("url");
  if (!nestedPrintUrl) {
    return new URLSearchParams(searchParams);
  }

  try {
    const sourceUrl = new URL(nestedPrintUrl, window.location.origin);
    return new URLSearchParams(sourceUrl.search);
  } catch (error) {
    return new URLSearchParams(searchParams);
  }
}

function getTokenFromParams(params) {
  for (const key of TOKEN_QUERY_KEYS) {
    const value = params.get(key);
    if (value) return value;
  }
  return null;
}

function isValidJwt(token) {
  if (!token) return false;
  try {
    jwtDecode(token);
    return true;
  } catch (error) {
    return false;
  }
}

function buildVisibleParams(params) {
  const visibleParams = new URLSearchParams();
  params.forEach((value, key) => {
    if (!TOKEN_QUERY_KEYS.includes(key) && key !== "output") {
      visibleParams.append(key, value);
    }
  });
  return visibleParams;
}

function buildPrintviewApiUrl(params, token) {
  if (!config.printview_api_url || !token) return null;

  const apiUrl = new URL(
    "/api/v1/printview/patient-prescription",
    config.printview_api_url,
  );

  params.forEach((value, key) => {
    if (!TOKEN_QUERY_KEYS.includes(key) && key !== "output" && key !== "url") {
      apiUrl.searchParams.append(key, value);
    }
  });
  apiUrl.searchParams.set("token", token);
  apiUrl.searchParams.set("output", "json");

  return apiUrl.toString();
}

function decodeLanguage(lg) {
  if (!lg) return undefined;
  const decoded = safeDecodeBase64(lg);
  const languageValue = Number(decoded || lg);
  return Number.isNaN(languageValue) ? undefined : languageValue;
}

function PatientPrescriptionView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [resolvedToken, setResolvedToken] = useState(null);
  const [hasInitializedToken, setHasInitializedToken] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const printParams = useMemo(
    () => parsePrintUrlParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    const tokenFromUrl = getTokenFromParams(printParams);
    const storedToken = getStoredAuthToken();
    let token = null;
    let shouldRemoveTokenFromUrl = false;

    setTokenError(null);

    if (tokenFromUrl) {
      if (isValidJwt(tokenFromUrl)) {
        token = tokenFromUrl;
        shouldRemoveTokenFromUrl = true;
        localStorage.setItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN, JSON.stringify(tokenFromUrl));
      } else {
        setTokenError("Authentication token in the prescription link is invalid.");
      }
    } else if (isValidJwt(storedToken)) {
      token = storedToken;
    }

    setResolvedToken(token);
    setHasInitializedToken(true);

    const visibleParams = buildVisibleParams(printParams);
    const nextSearch = visibleParams.toString();
    const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    const currentUrl = `${location.pathname}${location.search}`;

    if (shouldRemoveTokenFromUrl && nextUrl !== currentUrl) {
      navigate(nextUrl, { replace: true });
    }
  }, [location.pathname, location.search, navigate, printParams]);

  const printUrl = useMemo(
    () => buildPrintviewApiUrl(printParams, resolvedToken),
    [printParams, resolvedToken],
  );

  const selectedLang = useMemo(
    () => decodeLanguage(printParams.get("lg")),
    [printParams],
  );

  const decodedPatientUniqueId = useMemo(
    () => safeDecodeBase64(printParams.get("patient_unique_id")),
    [printParams],
  );
  const decodedTcmId = useMemo(
    () => safeDecodeBase64(printParams.get("tcm_id")),
    [printParams],
  );

  const {
    printBlob,
    printBlobSourceUrl,
    isGenerating,
    error,
  } = usePrintPayloadPdf({
    printUrl,
    selectedLang,
    isGynaecHistoryAccessable: false,
    payloadOverride: null,
    skipFetch: !printUrl,
    patientUniqueId: decodedPatientUniqueId,
    patientId: decodedPatientUniqueId,
    tcmId: decodedTcmId,
  });

  useEffect(() => {
    if (!(printBlob instanceof Blob) || printBlobSourceUrl !== printUrl) {
      setPdfUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(printBlob);
    if (isAndroid) {
      window.location.href = objectUrl;
      return undefined;
    }

    setPdfUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [printBlob, printBlobSourceUrl, printUrl]);

  const missingRequiredParams =
    !printParams.get("patient_unique_id") || !printParams.get("tcm_id");
  const missingToken = !resolvedToken;

  if (!hasInitializedToken) {
    return (
      <div className="patient-prescription-view-state">
        <Spin size="large" />
      </div>
    );
  }

  if (missingRequiredParams || missingToken || tokenError) {
    return (
      <div className="patient-prescription-view-state">
        <Alert
          type="error"
          message="Prescription link is incomplete."
          description={
            tokenError ||
            (missingToken
              ? "Authentication token is missing."
              : "Patient ID or consultation ID is missing.")
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="patient-prescription-view-state">
        <Alert
          type="error"
          message="Unable to load prescription."
          description="Please check the prescription link and try again."
        />
      </div>
    );
  }

  if (isGenerating || !pdfUrl) {
    return (
      <div className="patient-prescription-view-state">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <iframe
      className="patient-prescription-view-frame"
      title="Patient Prescription"
      src={pdfUrl}
    />
  );
}

export default PatientPrescriptionView;
