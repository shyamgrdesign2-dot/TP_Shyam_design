// Dev-only proxy for the Pm-Core Reporting API.
//
// The reporting service is healthy but does not send a CORS
// `Access-Control-Allow-Origin` header for the local dev origin
// (http://localhost:3009), so the browser blocks every direct request
// ("Failed to fetch"). Routing the calls through the dev server makes them
// same-origin; the Authorization: Bearer header set by axiosService is
// forwarded unchanged to the target. Prod does not use this file — there the
// reporting service must allow the portal origin in its CORS config.
const { createProxyMiddleware } = require("http-proxy-middleware");

const REPORTING_TARGET =
  process.env.REACT_APP_REPORTING_PROXY_TARGET ||
  "https://pm-core-uat.tatvacare.in";

module.exports = function (app) {
  app.use(
    "/reporting-proxy",
    createProxyMiddleware({
      target: REPORTING_TARGET,
      changeOrigin: true,
      secure: true,
      pathRewrite: { "^/reporting-proxy": "" },
      logLevel: "warn",
    })
  );
};
