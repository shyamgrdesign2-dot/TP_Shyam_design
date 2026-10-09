// ─── Section detection rules ─────────────────────────────────────

const SECTION_RULES = [
  {
    sectionId: "symptoms",
    title: "Symptoms",
    tpIconName: "thermometer",
    startKeywords: ["complaining of", "suffering from", "symptoms include", "presenting with", "chief complaint", "c/o"],
    itemKeywords: ["fever", "cough", "cold", "pain", "headache", "nausea", "vomiting", "diarrhea", "weakness", "fatigue", "redness", "swelling", "rash", "itching", "breathlessness", "chest pain", "abdominal pain", "sore throat", "body ache", "loss of appetite", "burning", "discharge", "sneezing", "runny nose", "congestion"],
  },
  {
    sectionId: "examination",
    title: "Examination",
    tpIconName: "medical service",
    startKeywords: ["on examination", "o/e", "examination findings", "examination reveals", "on exam", "physical examination"],
    itemKeywords: ["tenderness", "chest clear", "bilateral", "no lymphadenopathy", "heart sounds", "normal", "lungs clear", "abdomen soft", "throat congested", "tonsils", "pharyngeal", "conjunctival", "injection"],
  },
  {
    sectionId: "diagnosis",
    title: "Diagnosis",
    tpIconName: "Diagnosis",
    startKeywords: ["diagnosis", "diagnosed with", "impression", "assessment", "provisional diagnosis", "final diagnosis", "d/d"],
    itemKeywords: ["viral", "bacterial", "rhinitis", "pharyngitis", "conjunctivitis", "bronchitis", "gastritis", "UTI", "URTI", "LRTI", "allergic", "acute", "chronic"],
  },
  {
    sectionId: "medication",
    title: "Medication",
    tpIconName: "Tablets",
    startKeywords: ["prescribing", "prescribed", "medication", "medicines", "rx", "tab", "cap", "syrup", "drops"],
    itemKeywords: ["mg", "tablet", "capsule", "syrup", "drops", "ointment", "cream", "gel", "injection", "ml", "paracetamol", "amoxicillin", "azithromycin", "cetirizine", "pantoprazole", "ibuprofen", "dolo", "crocin", "augmentin", "metformin", "amlodipine"],
  },
  {
    sectionId: "advice",
    title: "Advice",
    tpIconName: "health care",
    startKeywords: ["advising", "advised", "advice", "counselled", "instructions"],
    itemKeywords: ["rest", "fluids", "warm water", "steam inhalation", "salt gargle", "avoid", "light diet", "stay home", "no spicy food", "hydration", "exercise", "walking", "deep breathing"],
  },
  {
    sectionId: "investigation",
    title: "Lab Investigation",
    tpIconName: "Test Tube",
    startKeywords: ["suggest test", "order test", "investigations", "labs ordered", "send for", "advise tests"],
    itemKeywords: ["CBC", "ESR", "CRP", "LFT", "RFT", "TFT", "HbA1c", "lipid profile", "urine routine", "blood sugar", "X-ray", "ECG", "ultrasound", "CT", "MRI"],
  },
  {
    sectionId: "followUp",
    title: "Follow-up",
    tpIconName: "Calendar",
    startKeywords: ["follow up", "follow-up", "come back", "review in", "next visit", "revisit"],
    itemKeywords: ["days", "week", "weeks", "month", "months", "if not better", "SOS", "as needed"],
  },
  {
    sectionId: "history",
    title: "Medical History",
    tpIconName: "pill",
    startKeywords: ["history of", "past history", "known case of", "h/o", "chronic"],
    itemKeywords: ["hypertension", "diabetes", "asthma", "thyroid", "PCOD", "surgery", "allergy"],
  },
]

// ─── Parsing logic ───────────────────────────────────────────────

function extractSections(text) {
  const sentences = text.split(/[.;]+/).map((s) => s.trim()).filter(Boolean)
  const result = []

  // Track which sentences are claimed by startKeyword matches (higher priority)
  const claimedSentences = new Set()

  // First pass: claim sentences that match startKeywords
  for (const rule of SECTION_RULES) {
    for (let si = 0; si < sentences.length; si++) {
      const sentenceLower = sentences[si].toLowerCase()
      if (rule.startKeywords.some((kw) => sentenceLower.includes(kw))) {
        claimedSentences.add(si)
      }
    }
  }

  // Second pass: extract items per section
  for (const rule of SECTION_RULES) {
    const rawItems = []

    for (let si = 0; si < sentences.length; si++) {
      const sentence = sentences[si]
      const sentenceLower = sentence.toLowerCase()

      const isStartKeyword = rule.startKeywords.some((kw) => sentenceLower.includes(kw))

      // Only use itemKeyword matching for unclaimed sentences
      const matchingItemKeywords = !claimedSentences.has(si)
        ? rule.itemKeywords.filter((kw) => sentenceLower.includes(kw.toLowerCase()))
        : []

      if (isStartKeyword || matchingItemKeywords.length > 0) {
        // Clean up the sentence — remove leading section keywords
        let cleaned = sentence
        for (const kw of rule.startKeywords) {
          const regex = new RegExp(`${kw}\\s*:?\\s*`, "i")
          cleaned = cleaned.replace(regex, "")
        }
        cleaned = cleaned.trim()

        if (cleaned.length > 0) {
          // Split multi-item sentences on commas or "and"
          if (rule.sectionId === "medication" || rule.sectionId === "symptoms") {
            const parts = cleaned.split(/,\s*|\s+and\s+/).map((p) => p.trim()).filter(Boolean)
            rawItems.push(...parts)
          } else {
            rawItems.push(cleaned)
          }
        }
      }
    }

    if (rawItems.length > 0) {
      const unique = [...new Set(rawItems)]
      // Convert plain strings to VoiceRxItem with name/detail split
      const items = unique.map((raw) => parseToVoiceRxItem(raw, rule.sectionId))
      result.push({
        sectionId: rule.sectionId,
        title: rule.title,
        tpIconName: rule.tpIconName,
        items,
      })
    }
  }

  return result
}

/** Convert a raw extracted string into a VoiceRxItem with name/detail separation */
function parseToVoiceRxItem(raw, sectionId) {
  // Medication: try to split "Paracetamol 650mg 1-0-1 for 5 days" → name + freq/duration
  if (sectionId === "medication") {
    const freqMatch = raw.match(/\b(\d+-\d+-\d+(?:-\d+)?\s*.*)$/)
    if (_optionalChain([freqMatch, 'optionalAccess', _ => _.index]) && freqMatch.index > 0) {
      return { name: raw.slice(0, freqMatch.index).trim(), detail: freqMatch[1].trim() }
    }
  }
  // Symptoms: try to split "fever since 3 days" or "fever (3 days)"
  if (sectionId === "symptoms") {
    const sinceMatch = raw.match(/\s+(?:since|for|from|×|x)\s+(.+)$/i)
    if (_optionalChain([sinceMatch, 'optionalAccess', _2 => _2.index]) && sinceMatch.index > 0) {
      return { name: raw.slice(0, sinceMatch.index).trim(), detail: sinceMatch[1].trim() }
    }
    const parenMatch = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    if (parenMatch) {
      return { name: parenMatch[1].trim(), detail: parenMatch[2].trim() }
    }
  }
  // Follow-up: try to split "Review in 5 days" → name + detail
  if (sectionId === "followUp") {
    const inMatch = raw.match(/\s+(?:in|after)\s+(.+)$/i)
    if (_optionalChain([inMatch, 'optionalAccess', _3 => _3.index]) && inMatch.index > 0) {
      return { name: raw.slice(0, inMatch.index).trim(), detail: inMatch[1].trim() }
    }
  }
  return { name: raw }
}

/** Format a VoiceRxItem back to a plain string */
function formatVoiceRxItem(item) {
  return item.detail ? `${item.name} (${item.detail})` : item.name
}

// ─── Build copy payload from sections ────────────────────────────

function buildCopyPayload(sections) {
  const payload = {
    sourceDateLabel: "Voice Input",
  }

  for (const section of sections) {
    const plainItems = section.items.map(formatVoiceRxItem)
    switch (section.sectionId) {
      case "symptoms":
        payload.symptoms = plainItems
        break
      case "examination":
        payload.examinations = plainItems
        break
      case "diagnosis":
        payload.diagnoses = plainItems
        break
      case "medication":
        payload.medications = plainItems.map(parseMedString)
        break
      case "advice":
        payload.advice = plainItems.join(". ")
        break
      case "investigation":
        payload.labInvestigations = plainItems
        break
      case "followUp":
        payload.followUp = plainItems.join(". ")
        break
    }
  }

  return payload
}

/** Parse a medication string into RxPadMedicationSeed */
function parseMedString(med) {
  // Try to extract dose pattern: "Paracetamol 650mg 1-0-1 after food for 5 days"
  const parts = med.trim()
  const frequencyMatch = parts.match(/\b(\d+-\d+-\d+(?:-\d+)?)\b/)
  const durationMatch = parts.match(/(?:for\s+)?(\d+\s+(?:days?|weeks?|months?))/i)
  const whenMatch = parts.match(/\b(before food|after food|before breakfast|after breakfast|before lunch|after lunch|before dinner|after dinner|with food|empty stomach|SOS)\b/i)

  // Extract medicine name — everything before frequency/duration/when
  let medicineName = parts
  if (_optionalChain([frequencyMatch, 'optionalAccess', _4 => _4.index])) {
    medicineName = parts.slice(0, frequencyMatch.index).trim()
  }

  return {
    medicine: medicineName || med,
    unitPerDose: "1 tablet",
    frequency: _nullishCoalesce(_optionalChain([frequencyMatch, 'optionalAccess', _5 => _5[1]]), () => ( "1-0-1")),
    when: _nullishCoalesce(_optionalChain([whenMatch, 'optionalAccess', _6 => _6[1]]), () => ( "After Food")),
    duration: _nullishCoalesce(_optionalChain([durationMatch, 'optionalAccess', _7 => _7[1]]), () => ( "5 days")),
    note: "From voice input",
  }
}

// ─── Public API ──────────────────────────────────────────────────

export function parseVoiceToStructuredRx(text) {
  const sections = extractSections(text)
  const copyAllPayload = buildCopyPayload(sections)

  return {
    voiceText: text,
    sections,
    copyAllPayload,
  }
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
