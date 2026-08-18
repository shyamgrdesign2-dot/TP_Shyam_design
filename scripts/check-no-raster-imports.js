#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "src");
const REPO_ROOT = path.resolve(__dirname, "..");
const exts = new Set([".js", ".jsx", ".ts", ".tsx", ".css", ".scss"]);

/**
 * Rule 1 — raster assets must not be bundled; use WebP/WebM from the assets blob.
 *
 * These three literals used to be written with doubled backslashes (`\\s`, `\\(`),
 * which made the file throw `Invalid regular expression: Unterminated group` on load —
 * so `npm run lint:assets` crashed instead of checking anything. Un-escaping them is
 * what makes rule 2 below able to run at all.
 *
 * `(?!https?:)` keeps remote background images out of scope: they are not bundled, so
 * they are not what this rule is about. The leading `\b` stops `url(` from matching the
 * tail of a longer identifier such as `publicAssetUrl(`.
 */
const rasterPatterns = [
  /import\s+[^;\n]*?\.(png|jpe?g)\b/gi,
  /\brequire\(\s*['"][^'"]+\.(png|jpe?g)\b/gi,
  /\burl\(\s*['"]?(?!https?:)[^'")]+\.(png|jpe?g)\b/gi,
];

/** Pre-existing rule 1 violations, surfaced when the regexes above started working. */
const RASTER_ALLOWLIST = [
  {
    file: "src/pages/lims/LimsNoAccessPage.jsx",
    match: "lims-intro-thumbnail.png",
    reason:
      "Pre-existing bundled PNG that predates this rule being runnable. Convert to WebP " +
      "on the assets blob in its own change.",
  },
  {
    file: "src/pages/pharmacy/PharmacyNoAccessPage.jsx",
    match: "pharmacy-intro-thumbnail.png",
    reason:
      "Pre-existing bundled PNG that predates this rule being runnable. Convert to WebP " +
      "on the assets blob in its own change.",
  },
];

const ASSET_EXT = "svg|png|jpe?g|gif|webp|woff2?|lottie";
const ASSET_PATH = `\\/(?:[A-Za-z0-9_.-]+\\/)*[A-Za-z0-9_.-]+\\.(?:${ASSET_EXT})`;

/**
 * Rule 2 — bare absolute asset paths, e.g. `src="/new-assets/icons/foo.svg"`.
 *
 * Files under `public/` ship with the build and are served from the per-environment CDN
 * that `PUBLIC_URL` points at, NOT from the app's own nginx origin. A bare "/..." path
 * is resolved by the browser against the app origin, which does not serve them, so it
 * 404s in every deployed environment. `src/utils/publicAssetUrl.js` is the fix.
 *
 * Pattern 1 catches quoted string literals (including `url("...")` written inside a JS
 * string); its optional `helper` group lets an already-correct `publicAssetUrl("/...")`
 * call through. Pattern 2 catches unquoted CSS `url(/...)`.
 */
const bareAssetPathPatterns = [
  new RegExp(
    `(?<helper>publicAssetUrl\\(\\s*)?(?<quote>['"])(?<path>${ASSET_PATH})\\k<quote>`,
    "gi"
  ),
  new RegExp(`\\burl\\(\\s*(?<path>${ASSET_PATH})`, "gi"),
];

/** Rule 2 references deliberately left bare. Each entry must carry a reason. */
const BARE_ASSET_PATH_ALLOWLIST = [
  {
    file: "src/components/dr-agent/rxpad/dr-agent/cards/summary/PatientReportedCard.jsx",
    path: "/new-assets/icons/medical/clipboard-activity--bulk.svg",
    reason:
      "Feeds a CSS `mask` in PatientReportedCard.module.scss. mask-image fetches are " +
      "CORS-checked, so pointing this at the PUBLIC_URL CDN hides the icon. Inline it as " +
      "a data URI (see sideNavbarMedicalIcons.js) or add CORS headers before migrating.",
  },
];

const toRelative = (file) => path.relative(REPO_ROOT, file).split(path.sep).join("/");

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** Commented-out code is not a violation. */
const isCommentedOut = (text, index) => {
  const lineStart = text.lastIndexOf("\n", index) + 1;
  const prefix = text.slice(lineStart, index).trimStart();
  return prefix.startsWith("//") || prefix.startsWith("*") || prefix.startsWith("/*");
};

const isRasterAllowlisted = (relFile, matchText) =>
  RASTER_ALLOWLIST.some(
    (entry) => entry.file === relFile && matchText.includes(entry.match)
  );

const isBarePathAllowlisted = (relFile, assetPath) =>
  BARE_ASSET_PATH_ALLOWLIST.some(
    (entry) => entry.file === relFile && entry.path === assetPath
  );

const hits = [];
const bareHits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!exts.has(path.extname(entry.name))) continue;
    const text = fs.readFileSync(full, "utf8");
    const rel = toRelative(full);

    for (const re of rasterPatterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (isCommentedOut(text, m.index)) continue;
        if (isRasterAllowlisted(rel, m[0])) continue;
        hits.push({ file: full, line: lineOf(text, m.index), match: m[0].slice(0, 200) });
      }
    }

    for (const re of bareAssetPathPatterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        // Already wrapped in publicAssetUrl(...) — that is the fix, not a violation.
        if (m.groups.helper) continue;
        if (isCommentedOut(text, m.index)) continue;
        const assetPath = m.groups.path;
        if (isBarePathAllowlisted(rel, assetPath)) continue;
        bareHits.push({ file: full, line: lineOf(text, m.index), match: assetPath });
      }
    }
  }
}

walk(ROOT);

let failed = false;

if (hits.length) {
  failed = true;
  console.error("PNG/JPG references found in imports/require/url():");
  for (const h of hits) {
    console.error(`- ${toRelative(h.file)}:${h.line}  ${h.match}`);
  }
}

if (bareHits.length) {
  failed = true;
  if (hits.length) console.error("");
  console.error("Bare absolute asset paths found in src/:");
  for (const h of bareHits) {
    console.error(`- ${toRelative(h.file)}:${h.line}  ${h.match}`);
  }
  console.error("");
  console.error(
    "These resolve against the app's own origin, which does not serve them, so they 404 once deployed."
  );
  console.error(
    'Files under public/ are served from PUBLIC_URL. Wrap the path in publicAssetUrl("/path/file.svg"):'
  );
  console.error('  import { publicAssetUrl } from "<relative>/utils/publicAssetUrl";');
  console.error(
    "If the URL feeds a CSS mask-image/background-image it cannot go cross-origin — inline it as a"
  );
  console.error(
    "data URI (see src/components/sideNavbar/sideNavbarMedicalIcons.js), or add an entry to"
  );
  console.error("BARE_ASSET_PATH_ALLOWLIST in this script with a reason.");
}

if (failed) process.exit(1);

console.log("OK: No PNG/JPG imports/require/url() found in src/");
console.log("OK: No bare absolute asset paths found in src/");
