/**
 * One-shot handoff: "the next Upload Medical Records drawer should open the
 * file picker itself".
 *
 * The correlation agent's upload affordance is a request to CHOOSE A FILE, not
 * a request to look at an upload screen. Left alone it opened the drawer and
 * made the doctor click "Upload new report" a second time to get the thing
 * they had already asked for.
 *
 * The drawer belongs to the host (PrescriptionNew / ConsultationLayout) and the
 * side nav only holds a setter for it, so there is no prop to thread the intent
 * down. This flag carries it instead. It is consumed once and cleared, so every
 * other entry point into that drawer behaves exactly as before.
 */

let pending = false;

/** Ask the next upload drawer to open the picker as soon as it mounts. */
export function requestAutoPick() {
  pending = true;
}

/** True once, for the drawer that was opened by the request above. */
export function consumeAutoPick() {
  const was = pending;
  pending = false;
  return was;
}

/* The correlation drawer stays open underneath, and it sits at z-index 20000
   because this app runs Ant Design modals at four figures. An Ant drawer
   defaults to 1000, so without this the upload screen opens BEHIND the thing
   that launched it. The attribute is scoped to the body for as long as that
   upload is on screen, and the stylesheet lifts .ant-drawer over the
   correlation drawer only while it is set. */
/* Is the correlation drawer itself on screen?
 *
 * The stylesheet needs this because the drawer is lifted to z-index 20000, and
 * anything portalled to <body> from inside it — Tesseract's date-picker
 * popover, its Select listbox, Radix's own layers — lands underneath unless it
 * is lifted too.
 *
 * It used to be expressed as `:global(body:has(.drawer))`. That never matched:
 * `.drawer` is a CSS-module class, and everything inside `:global(...)` is left
 * untransformed, so the selector looked for a literal `.drawer` while the DOM
 * carried the hashed name. Every rule written that way was silently inert,
 * which is why the date picker opened behind the drawer. An attribute cannot
 * be renamed by the build, so it cannot rot the same way.
 */
const OPEN_ATTR = "data-correlation-open";

export function markCorrelationOpen(on) {
  if (typeof document === "undefined") return;
  if (on) document.body.setAttribute(OPEN_ATTR, "true");
  else document.body.removeAttribute(OPEN_ATTR);
}

const OVER_ATTR = "data-correlation-upload";

export function markUploadOverCorrelation(on) {
  if (typeof document === "undefined") return;
  if (on) document.body.setAttribute(OVER_ATTR, "true");
  else document.body.removeAttribute(OVER_ATTR);
}
