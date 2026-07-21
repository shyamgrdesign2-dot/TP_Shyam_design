import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGrowthBook } from "@growthbook/growthbook-react";
import { jwtDecode } from "jwt-decode";
import { GB_LIMS, PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";
import { getNormalizedPhoneNumber } from "../../utils/zydusAccountRouting";

const GB_INIT_TIMEOUT_MS = 3000;

function getTokenFromStorage() {
  const raw = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed.trim() : String(parsed || "").trim();
  } catch {
    return raw.trim().replace(/^["']+|["']+$/g, "");
  }
}

function applyGrowthBookAttributes(growthbook, token) {
  if (!growthbook || !token) return;
  try {
    const decoded = jwtDecode(token);
    const result = decoded?.result || {};
    const phoneNumber = result.mobile_no;
    const existing =
      typeof growthbook.getAttributes === "function"
        ? growthbook.getAttributes() || {}
        : {};

    growthbook.setAttributes({
      ...existing,
      doctorId: result.doctor_unique_id,
      id: `${result.user_id ?? ""}`,
      hos_business_id: `${result.hospital_business_id ?? ""}`,
      clinic_id: `${result.clinic_id ?? ""}`,
      doctor_phone: phoneNumber,
      doctor_phone_normalized: getNormalizedPhoneNumber(phoneNumber),
    });
  } catch (error) {
    console.warn("[LIMS] Failed to apply GrowthBook attributes from token", error);
  }
}

async function ensureGrowthBookReady(growthbook) {
  if (!growthbook || growthbook.ready) return;

  const initPromise =
    typeof growthbook.init === "function"
      ? growthbook.init({ streaming: true }).catch(() => {})
      : Promise.resolve();

  await Promise.race([
    initPromise,
    new Promise((resolve) => {
      setTimeout(resolve, GB_INIT_TIMEOUT_MS);
    }),
  ]);
}

export function useLimsAccess() {
  const [searchParams] = useSearchParams();
  const authToken = searchParams.get("authToken");
  const growthbook = useGrowthBook();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function evaluateAccess() {
      const token = (authToken || getTokenFromStorage()).trim();

      if (!growthbook) {
        if (!cancelled) {
          setHasAccess(false);
          setIsLoading(false);
        }
        return;
      }

      applyGrowthBookAttributes(growthbook, token);
      await ensureGrowthBookReady(growthbook);

      if (cancelled) return;

      setHasAccess(Boolean(growthbook.isOn(GB_LIMS)));
      setIsLoading(false);
    }

    evaluateAccess();

    return () => {
      cancelled = true;
    };
  }, [authToken, growthbook]);

  return { isLoading, hasAccess };
}
