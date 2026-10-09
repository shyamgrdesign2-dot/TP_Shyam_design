// The login APIs answer with an SSO URL built for the deployed portal host
// (https://pm-uat-doctor-portal.tatvacare.in/?authToken=...). On a local dev
// server that bounces the doctor out to UAT, so the token handoff is kept on
// the origin the page was served from. A no-op on every deployed host.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const isLocalhostOrigin = (loc = window.location) =>
  LOCAL_HOSTNAMES.has(loc.hostname);

export const toSameOriginSsoUrl = (ssoUrl, loc = window.location) => {
  if (!ssoUrl || !isLocalhostOrigin(loc)) return ssoUrl;
  try {
    const url = new URL(ssoUrl, loc.origin);
    return `${loc.origin}${url.pathname}${url.search}${url.hash}`;
  } catch (_) {
    return ssoUrl;
  }
};
