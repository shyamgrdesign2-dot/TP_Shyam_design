// Velora's record search, proxied the way src/setupProxy.js does locally:
// same-origin for the browser (the service sends no CORS headers), with the
// bearer token added here on the server so it never reaches the client.
const { Readable } = require("stream");
const TOKEN = require("./_copilot-token");
const ORIGIN = process.env.COPILOT_SEARCH_ORIGIN || "https://pm-copilot-preprod.tatvacare.in";

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://local");
    const path = url.searchParams.get("__path") || "";
    url.searchParams.delete("__path");
    const qs = url.searchParams.toString();
    const target = `${ORIGIN}/${path}${qs ? `?${qs}` : ""}`;

    const headers = {
      accept: req.headers.accept || "application/json",
      authorization: `Bearer ${TOKEN}`,
      origin: ORIGIN,
    };
    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      headers["content-type"] = req.headers["content-type"] || "application/json";
      body = typeof req.body === "string" ? req.body : req.body ? JSON.stringify(req.body) : undefined;
    }

    const upstream = await fetch(target, { method: req.method, headers, body });
    res.statusCode = upstream.status;
    const type = upstream.headers.get("content-type");
    if (type) res.setHeader("content-type", type);
    res.setHeader("cache-control", "no-cache, no-transform");
    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ detail: "Copilot proxy could not reach the record search." }));
  }
};
