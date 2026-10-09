/**
 * Parser for the Dr. Copilot answer contract.
 *
 * See docs/dr-copilot/answer-markdown-contract.md. The archive emits a small,
 * fixed subset of Markdown; this turns it into blocks the card can draw.
 *
 * Two things it deliberately will not do:
 *
 *   It does not fail. Anything outside the subset falls through as a plain
 *   paragraph. An answer that renders undecorated is a cosmetic problem; an
 *   answer that renders as a stack trace is a clinical one.
 *
 *   It does not infer. The heading, the highlights and the citations are the
 *   model's decisions, carried through verbatim. Nothing here promotes a value
 *   to "primary", marks a phrase, or invents a caveat.
 */

/* ── Inline ──────────────────────────────────────────────────────────────── */

/* **primary**, ==matched phrase==, and a citation in either form - one pass,
   so a run can carry all of them without the order mattering.

   Two citation forms, because two services wrote them. `[^1]` is the footnote
   syntax the contract asked for; `[1](#evidence-1)` is what the Copilot
   service actually emits - an ordinary Markdown link to an anchor, which
   renders as a link anywhere that does not know about our footnotes. Both
   mean the same thing and both become a `cite` run. */
const INLINE = /(\*\*[^*]+\*\*|==[^=]+==|\[\^\d+\]|\[\d+\]\(#evidence-\d+\))/g

/* The service escapes Markdown punctuation in values it did not author -
   `3 unit\(s\)`, `5 Day\(s\)`. Correct Markdown, wrong on screen, since the
   portal renders the runs itself rather than handing them to a Markdown
   engine that would unescape them. */
function unescapeMarkdown(text) {
  /* Any backslash before ASCII punctuation is a Markdown escape - the service
     also escapes commas ("present\\, otherwise"), which the narrower list let
     through as a visible backslash. */
  return String(text).replace(/\\([!-/:-@[-`{-~])/g, "$1")
}

/**
 * Splits a line into typed runs: text, strong, mark, cite.
 *
 * The two emphasis marks nest, and in practice always do: the primary datum is
 * usually also the phrase that was matched, so the model writes
 * `**==METFORMIN 500 MG==**`. A single pass would hand back a strong run whose
 * text still had `==` in it, so strong and mark runs carry parsed children
 * rather than raw text.
 *
 * `mark` runs matter beyond styling - they are the phrases the evidence sheet
 * highlights inside the source prescription, which is what lets a doctor see
 * their own words lit up rather than take the answer on faith.
 */
export function parseInline(line) {
  const runs = []
  for (const part of String(line || "").split(INLINE)) {
    if (!part) continue
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push({ type: "strong", children: parseInline(part.slice(2, -2)) })
    } else if (part.startsWith("==") && part.endsWith("==")) {
      runs.push({ type: "mark", children: parseInline(part.slice(2, -2)) })
    } else if (part.startsWith("[^")) {
      runs.push({ type: "cite", number: Number(part.slice(2, -1)) })
    } else if (part.startsWith("[") && part.includes("](#evidence-")) {
      runs.push({ type: "cite", number: Number(part.slice(1, part.indexOf("]"))) })
    } else {
      runs.push({ type: "text", text: unescapeMarkdown(part) })
    }
  }
  return runs
}

/** Every ==phrase== in the answer, in order. The evidence sheet lights these up. */
export function markedPhrases(markdown) {
  const found = []
  const re = /==([^=]+)==/g
  let match
  while ((match = re.exec(String(markdown || "")))) {
    const phrase = match[1].trim()
    if (phrase && !found.includes(phrase)) found.push(phrase)
  }
  return found
}

/* ── Blocks ──────────────────────────────────────────────────────────────── */

const TABLE_DIVIDER = /^\|?[\s:|-]+\|[\s:|-]*$/

function splitRow(line) {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim())
}

/**
 * Markdown in, blocks out.
 *
 * Returns `{ title, lede, blocks }`. The title is the single `#` heading and
 * becomes the card's own title rather than a block, because the card already
 * has a place for it and two headings stacked reads as a mistake.
 */
export function parseAnswerMarkdown(markdown) {
  const lines = String(markdown || "").split("\n")
  const blocks = []
  let title = ""
  let lede = ""
  let i = 0

  const flushParagraph = (buffer) => {
    const text = buffer.join(" ").trim()
    if (text) blocks.push({ type: "paragraph", runs: parseInline(text) })
  }

  let paragraph = []

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()

    if (!line) {
      flushParagraph(paragraph)
      paragraph = []
      i += 1
      continue
    }

    /* Heading: the first `#` is the card title; a later one is demoted to a
       section, because the contract allows only one and a second is a mistake
       worth rendering rather than swallowing. */
    if (line.startsWith("# ")) {
      const text = line.slice(2).trim()
      if (!title) title = text
      else blocks.push({ type: "section", label: text })
      i += 1
      continue
    }

    /* Any deeper heading is a section. The live service writes `###` for
       "Latest Visit" and "Labs"; matching only `##` let those through as
       paragraphs with the hashes printed. */
    const sub = line.match(/^#{2,6}\s+(.*)$/)
    if (sub) {
      flushParagraph(paragraph)
      paragraph = []
      blocks.push({ type: "section", label: sub[1].trim() })
      i += 1
      continue
    }

    /* Caveat before lede: `!>` also starts with an angle bracket in spirit,
       and testing it first keeps the two from colliding. */
    if (line.startsWith("!>")) {
      flushParagraph(paragraph)
      paragraph = []
      blocks.push({ type: "caveat", runs: parseInline(line.slice(2).trim()) })
      i += 1
      continue
    }

    if (line.startsWith(">")) {
      const text = line.slice(1).trim()
      if (!lede && !blocks.length) lede = text
      else blocks.push({ type: "lede", runs: parseInline(text) })
      i += 1
      continue
    }

    if (line.startsWith("::: facts")) {
      flushParagraph(paragraph)
      paragraph = []
      const facts = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith(":::")) {
        const at = lines[i].indexOf(":")
        if (at > 0) {
          facts.push({
            label: lines[i].slice(0, at).trim(),
            runs: parseInline(lines[i].slice(at + 1).trim()),
          })
        }
        i += 1
      }
      i += 1 /* closing ::: */
      if (facts.length) blocks.push({ type: "facts", facts })
      continue
    }

    /* A table is a header row followed by a divider. Without the divider it is
       just a line with pipes in it, and is left as text. */
    if (line.startsWith("|") && TABLE_DIVIDER.test((lines[i + 1] || "").trim())) {
      flushParagraph(paragraph)
      paragraph = []
      const head = splitRow(line)
      const rows = []
      i += 2
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i].trim()).map(parseInline))
        i += 1
      }
      blocks.push({ type: "table", head, rows })
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph(paragraph)
      paragraph = []
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(parseInline(lines[i].trim().replace(/^[-*]\s+/, "")))
        i += 1
      }
      blocks.push({ type: "list", items })
      continue
    }

    paragraph.push(line)
    i += 1
  }

  flushParagraph(paragraph)

  return { title, lede, blocks }
}

/* ── Icon for the heading ────────────────────────────────────────────────── */

/**
 * Which icon the card wears.
 *
 * Driven by the model's declared `intent` first, and only guessed from the
 * heading's words when there isn't one - so a model that starts declaring
 * intents immediately gets the right icon without a portal change.
 *
 * Names are TPMedicalIcon tokens, which CardShell draws in the bulk variant.
 * The general icon library has no clinical vocabulary - no pill, no lab, no
 * stethoscope - so the medical set is the correct one here, and it is bulk
 * like everything else in the product.
 */
const INTENT_ICONS = {
  medications: "Tablets",
  vitals: "Heart Rate",
  labs: "Lab",
  diagnosis: "Diagnosis",
  history: "medical-record",
  advice: "medical book",
  allergy: "mask",
  procedure: "stethoscope",
  documents: "health-file-02",
  unknown: "clipboard-activity",
}

const HEADING_HINTS = [
  [/medicat|drug|prescri|tablet|dose/i, "medications"],
  [/pressure|vital|pulse|weight|temperature|spo2/i, "vitals"],
  [/lab|result|investigation|hba1c|blood test/i, "labs"],
  [/diagnos|condition/i, "diagnosis"],
  [/chang|since|history|timeline|visit/i, "history"],
  [/advice|counsel|follow.?up/i, "advice"],
  [/allerg|reaction|adverse/i, "allergy"],
  [/procedure|surger|operation/i, "procedure"],
  [/document|report|upload|file/i, "documents"],
]

export function resolveIntent(intent, heading) {
  if (intent && INTENT_ICONS[intent]) return intent
  const text = String(heading || "")
  const hit = HEADING_HINTS.find(([pattern]) => pattern.test(text))
  return hit ? hit[1] : "unknown"
}

export function iconForIntent(intent) {
  return INTENT_ICONS[intent] || INTENT_ICONS.unknown
}
