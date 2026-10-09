/**
 * Reading the archive's consultation narrative.
 *
 * `evidence.text` on a Composition is the whole OPD consultation, written out:
 *
 *     OPD prescription.
 *     Presenting complaints / history:
 *     - Fever
 *     - Weakness
 *
 *     Examination:
 *     - PER RECTAL EXAMINATION
 *
 *     Medicines prescribed:
 *     - PARACETAMOL-650MG — 1 — for 5 Day(s)
 *
 *     Vitals: temp=111
 *
 * Which means the prescription a doctor sees when they follow a citation does
 * not have to be reconstructed - it is right there, in the record, and can be
 * laid out in the clinic's own print order. That is worth a parser: a real
 * prescription earns trust that a plausible one cannot.
 *
 * The parser is forgiving by design. An unrecognised heading becomes a section
 * with that name rather than an error, and free text under a heading is kept.
 * The archive's narrative format is not versioned, and a sheet that renders
 * one unfamiliar section badly beats one that renders nothing.
 */

/* Archive heading -> the label the clinic prints. Anything not listed keeps
   its own heading, minus the colon. */
const SECTION_ALIASES = {
  "presenting complaints / history": "Symptoms",
  "presenting complaints": "Symptoms",
  complaints: "Symptoms",
  symptoms: "Symptoms",
  examination: "Examination",
  diagnosis: "Diagnosis",
  "medicines prescribed": "Medication",
  medicines: "Medication",
  "investigations advised": "Investigations",
  investigations: "Investigations",
  advice: "Advice",
  "follow-up advice": "Advice",
  "follow up advice": "Advice",
  "follow-up": "Follow-up",
  "follow up": "Follow-up",
  vitals: "Vitals",
  "medical history": "Medical history",
}

/* The order a prescription is printed in, which is not the order the archive
   happens to emit. A doctor scans their own sheet by shape. */
const PRINT_ORDER = [
  "Vitals",
  "Symptoms",
  "Examination",
  "Diagnosis",
  "Medication",
  "Investigations",
  "Advice",
  "Follow-up",
  "Medical history",
]

function labelFor(heading) {
  const key = String(heading || "").trim().toLowerCase().replace(/:$/, "")
  return SECTION_ALIASES[key] || heading.replace(/:$/, "").trim()
}

/**
 * "PARACETAMOL-650MG — 1 — for 5 Day(s)" into columns.
 *
 * Em dash is the archive's separator. A missing part comes back as an empty
 * string rather than a guess: "null" is what the archive writes when it does
 * not know, and repeating that on a prescription would be worse than a blank.
 */
export function parseMedicationLine(line) {
  const parts = String(line || "")
    .split("—")
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "null")

  return {
    name: parts[0] || line,
    dose: parts[1] || "",
    duration: parts.slice(2).join(" ") || "",
  }
}

/**
 * Narrative in, printable sections out.
 *
 * Returns `{ title, sections: [{ label, items, text }] }` in print order.
 */
export function parseRxNarrative(narrative) {
  const lines = String(narrative || "").split("\n")
  if (!lines.length) return { title: "", sections: [] }

  let title = ""
  const found = new Map()
  let current = null

  const push = (label) => {
    if (!found.has(label)) found.set(label, { label, items: [], text: "" })
    current = found.get(label)
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    /* A single line carrying its own value: "Vitals: temp=111". */
    const inline = line.match(/^([A-Za-z][A-Za-z /-]{2,40}):\s*(.+)$/)
    if (inline) {
      push(labelFor(inline[1]))
      current.items.push(inline[2].trim())
      current = null
      continue
    }

    if (line.endsWith(":")) {
      push(labelFor(line))
      continue
    }

    if (line.startsWith("- ")) {
      if (!current) push("Notes")
      current.items.push(line.slice(2).trim())
      continue
    }

    /* The opening line, before any heading, names the document. */
    if (!current && !title) {
      title = line.replace(/\.$/, "")
      continue
    }

    if (current) current.text = current.text ? `${current.text}\n${line}` : line
  }

  const sections = [...found.values()].filter((s) => s.items.length || s.text)
  sections.sort((a, b) => {
    const ai = PRINT_ORDER.indexOf(a.label)
    const bi = PRINT_ORDER.indexOf(b.label)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return { title, sections }
}

/** Vitals arrive as "temp=111, bp=120/80"; split them into label/value pairs. */
export function parseVitalsLine(text) {
  return String(text || "")
    .split(/[,;]/)
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const at = pair.indexOf("=")
      if (at < 0) return { label: pair, value: "" }
      return { label: pair.slice(0, at).trim(), value: pair.slice(at + 1).trim() }
    })
}
