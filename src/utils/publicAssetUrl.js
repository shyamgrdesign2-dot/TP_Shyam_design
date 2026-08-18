/**
 * Resolves a file that ships in this repo's `public/` folder to a URL the browser
 * can actually fetch.
 *
 * Everything under `public/` is copied into `build/` and uploaded to the
 * per-environment CDN that `PUBLIC_URL` points at (prod: `https://assets.tatvacare.in`).
 * A bare absolute path such as `"/new-assets/icons/medical/gynec--line.svg"` is
 * resolved by the browser against the app's own nginx origin instead, which does not
 * serve these files — so it 404s in every deployed environment.
 *
 * CRA substitutes `process.env.PUBLIC_URL` at build time and strips its trailing
 * slash, so this yields a root-relative path locally and an absolute CDN URL in
 * deployed environments.
 *
 * NOTE: this is a different root from `TP_ASSETS_BASE` in `./constants`. Those files
 * are uploaded separately to blob storage and are catalogued in `src/assets.js`;
 * files added to `public/` must go through this helper, not through `TP_ASSETS_BASE`.
 *
 * Only use the result where cross-origin loading is safe — `<img src>`, `<link>`,
 * CORS-enabled fetch. CSS `mask-image` / `background-image` fetches are CORS-checked
 * and fail against the CDN, so those icons must stay inlined
 * (see `src/components/sideNavbar/sideNavbarMedicalIcons.js`).
 *
 * @param {string} filePath Root-relative path inside `public/`, e.g. `"/ZydusLogo.png"`.
 * @returns {string} URL for the file on the environment's asset host.
 */
export const publicAssetUrl = (filePath = "") => {
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${process.env.PUBLIC_URL}${normalized}`;
};
