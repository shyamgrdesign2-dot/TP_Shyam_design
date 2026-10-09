import api from "./axiosService";
import config from "../../config";
import { neoDebug, neoDebugError } from "../../utils/neoConsultationUtils";

const neoBackendConfig = {
  customBaseUrl: config.snap_rx_api_url,
  timeout: 20000,
};

export const registerPairedDevice = async ({
  userId,
  deviceAddress,
  deviceName,
  firmware,
}) => {
  if (!userId || !deviceAddress) {
    return null;
  }
  const payload = {
    user_id: String(userId),
    device_address: deviceAddress,
    device_name: deviceName || "Neo",
    firmware: firmware || null,
    paired_at: Date.now(),
  };
  neoDebug("[devices] POST /neo/devices", payload);
  try {
    const response = await api.post(
      "/api/v1/neo/devices",
      payload,
      neoBackendConfig
    );
    return response?.data ?? response;
  } catch (err) {
    neoDebugError("[devices] register failed", {
      message: err?.message,
      status: err?.response?.status,
    });
    return null;
  }
};
