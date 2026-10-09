/**
 * Dev-only proxy for the Chart Search archive.
 *
 * The archive's CORS allow-list has localhost:5173 and the deployed portal,
 * but not localhost:3007 — the portal's own dev port. A browser on 3007 is
 * therefore refused before the request is even made, which is why Copilot
 * silently fell back to its mock engines during development.
 *
 * Server-to-server has no CORS, so the dev server forwards instead: the
 * browser calls same-origin `/chart-search/*`, this hands it to the archive,
 * and the answer comes back. Nothing about the production build changes — it
 * talks to the archive directly and needs 3007 added to the allow-list only
 * if it is ever served from there.
 *
 * `REACT_APP_CHART_SEARCH_URL` still wins when set, so pointing at a local
 * archive keeps working.
 */

const { createProxyMiddleware } = require("http-proxy-middleware");

const ARCHIVE =
  process.env.REACT_APP_CHART_SEARCH_ORIGIN || "https://pm-turbopuffer-uat.tatvacare.in";

const COPILOT = process.env.REACT_APP_COPILOT_SEARCH_ORIGIN || "https://pm-copilot-preprod.tatvacare.in";

module.exports = function setupProxy(app) {
  /* The Copilot search service, same story: it refuses localhost origins, so
     the dev server forwards rather than the browser calling across. */
  app.use(
    "/copilot-search",
    createProxyMiddleware({
      target: COPILOT,
      changeOrigin: true,
      ws: false,
      pathRewrite: { "^/copilot-search": "" },
      onProxyReq(proxyReq) {
        proxyReq.setHeader("origin", COPILOT);
      },
      logLevel: "warn",
    })
  );

  app.use(
    "/chart-search",
    createProxyMiddleware({
      target: ARCHIVE,
      changeOrigin: true,
      ws: false,
      pathRewrite: { "^/chart-search": "" },
      /* The answer arrives as Server-Sent Events. Buffering it would hold the
         whole reply until the stream closed, which loses the retrieval stages
         the panel shows while it waits. */
      selfHandleResponse: false,
      onProxyReq(proxyReq) {
        proxyReq.setHeader("origin", ARCHIVE);
      },
      onProxyRes(proxyRes) {
        proxyRes.headers["cache-control"] = "no-cache, no-transform";
      },
      logLevel: "warn",
    })
  );
};
