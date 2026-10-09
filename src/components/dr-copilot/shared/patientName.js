/**
 * The name to call a patient by.
 *
 * Appointment rows carry a salutation in the label ("Mr Abhyuday Sultaia"),
 * so the first word is often a title rather than a name, and the panel was
 * greeting people as "Mr". Strip the title, then take the first word.
 *
 * The list carries the Indian forms as well as the English ones, because
 * front desks type what they say out loud: "Smt", "Shri", "Kumari", "Sh".
 * Each needs a space after it to count, so a name that merely starts with the
 * same letters ("Shreya", "Kumar") is left alone.
 */
const SALUTATIONS =
  /^(mr|mrs|ms|miss|mx|dr|doctor|master|mast|baby|b\/o|smt|shrimati|shri|shree|sri|sh|kumari|kum|prof)\.?\s+/i

export function withoutSalutation(full) {
  let name = String(full || "").trim()
  /* Twice, for "Dr Mrs" and the like. */
  for (let i = 0; i < 2; i += 1) name = name.replace(SALUTATIONS, "").trim()
  return name
}

/**
 * A name typed in capitals is read back in capitals: "Ask about AKHIL's
 * chart" shouts in the one sentence meant to be calm. Only a word that is
 * entirely upper case is softened, so "McKenzie" or "D'Souza" keep the
 * casing someone chose for them, and a one-letter initial stays an initial.
 */
function softenCapitals(word) {
  if (word.length < 2 || word !== word.toUpperCase() || word === word.toLowerCase()) return word
  return word.charAt(0) + word.slice(1).toLowerCase()
}

/* Labels the panel falls back to when it has no real name. Treated as no
   name at all, so a sentence reads "this patient's chart" rather than
   "Patient's chart". */
const GENERIC_LABELS = /^(patient|this patient|the patient|unknown|no patient selected)$/i

export function firstNameOf(full) {
  if (GENERIC_LABELS.test(String(full || "").trim())) return ""
  const name = withoutSalutation(full)
  const first = name.split(/\s+/)[0]
  /* A label that is only a title leaves nothing to shorten; the whole label
     is better than an empty greeting. */
  return softenCapitals(first || String(full || "").trim())
}

/**
 * "Akhil's", or the fallback the caller gives when there is no name.
 *
 * Always "'s", including after a final s ("Dhanush's"): it is how the name is
 * said aloud, and one rule is easier to trust than two.
 */
export function possessiveOf(full, fallback = "this patient's") {
  const first = firstNameOf(full)
  return first ? `${first}'s` : fallback
}

/**
 * What the patient scope is called in a sentence: "Akhil's chart".
 *
 * The welcome line and the composer both say whose record is being searched,
 * and they should say it the same way, so both read it from here.
 */
export function chartLabelOf(full) {
  return `${possessiveOf(full)} chart`
}
