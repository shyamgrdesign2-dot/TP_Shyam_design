import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { message } from "antd";
import { MESSAGE_KEY } from "../../utils/constants";
import {
  clearGlobalCredentialAlerts,
  isNeoSapienRoute,
} from "../../utils/neoConsultationUtils";

export default function NeoGlobalCleanup() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isNeoSapienRoute(pathname)) return;

    message.destroy(MESSAGE_KEY);
    message.destroy("notification_key");
    message.destroy("message_key");
    clearGlobalCredentialAlerts();
  }, [pathname]);

  return null;
}
