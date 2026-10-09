import { zydusProdEnv } from "../EnvironmentConfig";
import { GB_ZYDUS_ACCOUNT_USERS } from "./constants";

export const getZydusProdDoctorPortalUrl = () =>
  zydusProdEnv?.doctor_portal_url || "";

export const getNormalizedPhoneNumber = (phoneNumber) =>
  String(phoneNumber || "").replace(/\D/g, "").slice(-10);

export const getZydusProdLoginUrl = () => {
  const doctorPortalUrl = getZydusProdDoctorPortalUrl();
  if (!doctorPortalUrl) return "";

  const url = new URL(doctorPortalUrl);
  url.pathname = "/login";
  url.search = "";
  url.hash = "";
  return url.toString();
};

export const syncPhoneAndCheckZydusAccountUser = async (
  growthbook,
  phoneNumber
) => {
  const normalizedPhoneNumber = getNormalizedPhoneNumber(phoneNumber);
  if (!growthbook || normalizedPhoneNumber.length !== 10) return false;

  const existingAttributes =
    typeof growthbook.getAttributes === "function"
      ? growthbook.getAttributes() || {}
      : {};

  await growthbook.setAttributes({
    ...existingAttributes,
    doctor_phone: phoneNumber,
    doctor_phone_normalized: normalizedPhoneNumber,
    phone_number: normalizedPhoneNumber,
  });

  if (!growthbook.ready && typeof growthbook.init === "function") {
    await growthbook.init({ streaming: true });
  }

  return Boolean(growthbook.isOn(GB_ZYDUS_ACCOUNT_USERS));
};
