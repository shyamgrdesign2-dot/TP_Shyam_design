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
  const message = `Network issue: ${networkIssueType}`;
  const networkAttributes = {
    network_issue: true,
    network_issue_type: networkIssueType,
    http_method: method,
    online: window.navigator.onLine,
    ...(sanitizedUrl ? { http_url: sanitizedUrl } : {}),
    ...(status ? { http_status: status } : {}),
    ...(error?.code ? { error_code: error.code } : {}),
    ...(error?.message ? { error_message: error.message } : {}),
  };

  Sentry.addBreadcrumb({
    category: "network",
    message,
    level: "info",
    data: networkAttributes,
  });

  Sentry.logger.info(message, networkAttributes);
};

export const reportBrowserOfflineToSentry = () => {
  reportNetworkIssueToSentry(new Error("Browser reported offline"), {
    method: "browser",
    url: window.location.href,
  });
};
