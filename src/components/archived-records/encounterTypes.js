/**
 * The kinds of encounter a hospital file can hold, named the way a hospital
 * names them. One list, used wherever encounters are counted or titled, so
 * the heading, the summary and the record never disagree.
 *
 * `code` is what the extraction service sends. Anything it sends that is not
 * listed here is shown as "Other" and still counted, never dropped.
 */
export const ENCOUNTER_TYPES = [
  { code: "IPD", label: "IPD", title: "IPD summary", stay: true },
  { code: "OPD", label: "OPD", title: "OPD visit" },
  { code: "ER", label: "Emergency", title: "Emergency visit" },
  { code: "DAYCARE", label: "Day care", title: "Day care summary", stay: true },
  { code: "TELE", label: "Teleconsult", title: "Teleconsultation" },
  { code: "OTHER", label: "Other", title: "Other record" },
];

const BY_CODE = Object.fromEntries(ENCOUNTER_TYPES.map((item) => [item.code, item]));
export const encounterType = (code) => BY_CODE[code] || BY_CODE.OTHER;

// "1 IPD · 2 OPD · 1 Emergency", in the fixed order above. Empty kinds are left out.
export function encounterMix(encounters = []) {
  return ENCOUNTER_TYPES.map((type) => {
    const count = encounters.filter((item) => encounterType(item.type).code === type.code).length;
    return count ? `${count} ${type.label}` : null;
  })
    .filter(Boolean)
    .join(" · ");
}
