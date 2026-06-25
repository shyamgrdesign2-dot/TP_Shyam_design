import * as Sentry from "@sentry/react";

const getSanitizedUrl = (requestConfig = {}) => {
  const rawUrl = requestConfig?.url || requestConfig?.request?.responseURL || "";
  const baseURL = requestConfig?.baseURL || requestConfig?.customBaseUrl || window.location.origin;

  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl, baseURL);
    return `${url.origin}${url.pathname}`;
  } catch (_) {
    return String(rawUrl).split("?")[0];
  }
};

const getNetworkIssueType = (error) => {
  if (!window.navigator.onLine) return "offline";
  if (error?.code === "ECONNABORTED") return "timeout";
  if (!error?.response) return "network_failure";
  if (error.response.status >= 500) return "server_error";
  return "http_error";
};

export const reportNetworkIssueToSentry = (error, requestConfig = {}) => {
  if (error?.code === "ERR_CANCELED") return;

  const status = error?.response?.status;
  const networkIssueType = getNetworkIssueType(error);
  const method = (requestConfig?.method || error?.config?.method || "unknown").toUpperCase();
  const sanitizedUrl = getSanitizedUrl(requestConfig || error?.config);

  Sentry.withScope((scope) => {
    scope.setTag("network_issue", "true");
    scope.setTag("network_issue_type", networkIssueType);
    if (status) scope.setTag("http_status", String(status));
    if (method) scope.setTag("http_method", method);
    if (sanitizedUrl) scope.setTag("http_url", sanitizedUrl);

    scope.setContext("network", {
      issue_type: networkIssueType,
      method,
      url: sanitizedUrl,
      status,
      code: error?.code,
      message: error?.message,
      online: window.navigator.onLine,
    });

    Sentry.captureMessage(`Network issue: ${networkIssueType}`, {
      level: status >= 500 || networkIssueType === "timeout" ? "error" : "warning",
    });
  });
};

export const reportBrowserOfflineToSentry = () => {
  reportNetworkIssueToSentry(new Error("Browser reported offline"), {
    method: "browser",
    url: window.location.href,
  });
};
