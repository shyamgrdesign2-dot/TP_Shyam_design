export const SCANNER_RESULT_MESSAGE_TYPE = "SCANNER_RESULT";

export const buildReturnUrl = (returnUrl, values) => {
  const url = new URL(returnUrl, window.location.origin);
  url.searchParams.set("value1", values.value1);
  url.searchParams.set("value2", values.value2);
  return url.toString();
};

export const redirectToParent = (returnUrl, values) => {
  window.location.href = buildReturnUrl(returnUrl, values);
};

export const postResultToOpener = (values, targetOrigin) => {
  if (!window.opener) return false;
  window.opener.postMessage(
    { type: SCANNER_RESULT_MESSAGE_TYPE, value1: values.value1, value2: values.value2 },
    targetOrigin || "*"
  );
  return true;
};
