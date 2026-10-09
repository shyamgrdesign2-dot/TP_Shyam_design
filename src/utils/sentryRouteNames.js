export const getSentryRouteName = (pathname = "/") =>
  pathname.replace(/\d+/g, ":id");

export const getSentryRouteNameFromUrl = (url) => {
  if (!url) return null;

  try {
    return getSentryRouteName(new URL(url).pathname || "/");
  } catch (_) {
    return null;
  }
};
