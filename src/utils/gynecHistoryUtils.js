/**
 * Shared gynec history normalization for voice, ambient, snap, and smart flows.
 * Maps API shape (e.g. gyneacHistory typo, clotsDuringFlow, occurrenceOfPain)
 * to UI shape expected by MedicalHistoryBox and GynecHistoryRichTextEditor.
 * Pure function: no side effects, safe to use in React (useMemo, reducers, etc.).
 */
import moment from "moment";

const OCCURRENCE_OF_PAIN_MAP = {
  "during menses": "During menses",
  "before menses": "Before menses",
  "after menses": "After menses",
  "not related to menses": "Not related to menses",
};

function normalizeClotsValue(rawClots) {
  if (rawClots === true || rawClots === false) return rawClots;
  if (rawClots === null || rawClots === undefined) return rawClots;
  const s = String(rawClots).trim().toLowerCase();
  if (s === "clots" || s === "yes") return true;
  if (s === "no clots" || s === "no") return false;
  return rawClots;
}

function normalizeOccurrenceOfPain(rawOccurrence) {
  if (rawOccurrence === null || rawOccurrence === undefined) return rawOccurrence;
  const key = String(rawOccurrence).trim().toLowerCase();
  return OCCURRENCE_OF_PAIN_MAP[key] ?? rawOccurrence;
}

function hasMeaningfulGynecValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim();
  return Boolean(text) && text !== "0";
}

function parseLmpDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const parsedDate = moment(value);
    return parsedDate.isValid() ? parsedDate : null;
  }

  const str = String(value).trim();
  const fullDate = moment(
    str,
    [
      "DD-MM-YYYY",
      "YYYY-MM-DD",
      "DD/MM/YYYY",
      "DD MMM YYYY",
      "D MMM YYYY",
      "Do MMM YYYY",
      "DD MMMM YYYY",
      "D MMMM YYYY",
      "Do MMMM YYYY",
      moment.ISO_8601,
    ],
    true
  );

  if (fullDate.isValid()) return fullDate;

  const currentYear = moment().year();
  const partialDate = moment(
    `${str} ${currentYear}`,
    [
      "DD-MM YYYY",
      "D-M YYYY",
      "DD/MM YYYY",
      "D/M YYYY",
      "DD MM YYYY",
      "D M YYYY",
      "DD MMM YYYY",
      "D MMM YYYY",
      "Do MMM YYYY",
      "DD MMMM YYYY",
      "D MMMM YYYY",
      "Do MMMM YYYY",
    ],
    true
  );

  return partialDate.isValid() ? partialDate : null;
}

function normalizeLmpForApi(value) {
  const parsed = parseLmpDate(value);
  return parsed ? parsed.format("YYYY-MM-DD") : null;
}

/**
 * Normalizes raw gynec/gyneac history from API to UI shape.
 * @param {object} gynecRaw - Raw object from digitizeData.gynecHistory or digitizeData.gyneacHistory
 * @returns {object} Normalized gynec history object, or empty object if input invalid
 */
export function normalizeGynecHistoryFromApi(gynecRaw) {
  if (!gynecRaw || typeof gynecRaw !== "object") return {};
  const g = gynecRaw;
  const rawClots = g.clots ?? g.clotsDuringFlow;
  const clots = normalizeClotsValue(rawClots);
  const occurrenceOfPain = normalizeOccurrenceOfPain(g.occurrenceOfPain ?? g.occurrence_of_pain);
  return {
    ...g,
    lastMenstrualPeriod: g.lastMenstrualPeriod ?? g.lmp,
    lmp: g.lmp ?? g.lastMenstrualPeriod,
    ageAtMenarche: g.ageAtMenarche ?? g.age_at_menarche,
    menarcheNotes: g.menarcheNotes ?? g.menarche_notes,
    intervalOfCycle: g.intervalOfCycle ?? g.intervalCycle ?? g.interval_of_cycle,
    intervalCycle: g.intervalCycle ?? g.intervalOfCycle ?? g.interval_of_cycle,
    cycleNotes: g.cycleNotes ?? g.intervalNotes ?? g.cycle_notes,
    intervalNotes: g.intervalNotes ?? g.cycleNotes ?? g.cycle_notes,
    clots,
    clotsDuringFlow: g.clotsDuringFlow ?? g.clots,
    durationOfMenstrualFlow: g.durationOfMenstrualFlow ?? g.duration_of_menstrual_flow,
    numberOfPadsPerDay: g.numberOfPadsPerDay ?? g.number_of_pads_per_day,
    flowNotes: g.flowNotes ?? g.clotsNotes ?? g.flow_notes,
    clotsNotes: g.clotsNotes ?? g.flowNotes ?? g.flow_notes,
    occurrenceOfPain,
    painNotes: g.painNotes ?? g.pain_notes,
    reproductiveLifeStages: g.reproductiveLifeStages ?? g.lifecycleHarmonialChanges ?? g.reproductive_life_stages,
    lifecycleHarmonialChanges: g.lifecycleHarmonialChanges ?? g.reproductiveLifeStages ?? g.reproductive_life_stages,
    ageAtMenopause: g.ageAtMenopause ?? g.age_at_menopause,
    typeOfMenopause: g.typeOfMenopause ?? g.type_of_menopause,
    reproductiveNotes: g.reproductiveNotes ?? g.lifecycleHarmonialChangesNotes ?? g.reproductive_notes,
    lifecycleHarmonialChangesNotes: g.lifecycleHarmonialChangesNotes ?? g.reproductiveNotes ?? g.reproductive_notes,
  };
}

/**
 * Picks gynec history from payload (supports gynecHistory, gynec_history, gyneacHistory typo).
 * @param {object} data - Object that may contain gynecHistory, gynec_history, or gyneacHistory
 * @returns {object} Normalized gynec history (or {}) for use in Rx pad / drawer
 */
export function getNormalizedGynecHistory(data) {
  const source = data?.data && typeof data.data === "object" ? data.data : data;
  const raw = source?.gynaec_history ?? source?.gynecHistory ?? source?.gynec_history ?? source?.gyneacHistory;
  return normalizeGynecHistoryFromApi(raw);
}

function mapGynecHistoryToForm(data) {
  const source = data?.gynaec_history && typeof data.gynaec_history === "object"
    ? data.gynaec_history
    : data;
  if (!source || typeof source !== "object") return {};
  const lmpRaw = source.lmp ?? source.lastMenstrualPeriod ?? "";

  return {
    lmp: normalizeLmpForApi(lmpRaw) ?? lmpRaw,
    ageAtMenarche: source.ageAtMenarche ?? source.age_at_menarche ?? 0,
    menarcheNotes: source.menarcheNotes ?? source.menarche_notes ?? "",
    cycle: source.cycle ?? "",
    intervalOfCycle: source.intervalOfCycle ?? source.intervalCycle ?? source.interval_of_cycle ?? 0,
    cycleNotes: source.cycleNotes ?? source.intervalNotes ?? source.cycle_notes ?? "",
    flow: source.flow ?? "",
    durationOfMenstrualFlow: source.durationOfMenstrualFlow ?? source.duration_of_menstrual_flow ?? 0,
    clots: normalizeClotsValue(source.clots ?? source.clotsDuringFlow ?? ""),
    numberOfPadsPerDay: source.numberOfPadsPerDay ?? source.number_of_pads_per_day ?? 0,
    flowNotes: source.flowNotes ?? source.clotsNotes ?? source.flow_notes ?? "",
    pain: source.pain ?? "",
    occurrenceOfPain: normalizeOccurrenceOfPain(source.occurrenceOfPain ?? source.occurrence_of_pain ?? ""),
    painNotes: source.painNotes ?? source.pain_notes ?? "",
    reproductiveLifeStages: source.reproductiveLifeStages ?? source.lifecycleHarmonialChanges ?? source.reproductive_life_stages ?? "",
    ageAtMenopause: source.ageAtMenopause ?? source.age_at_menopause ?? 0,
    typeOfMenopause: source.typeOfMenopause ?? source.type_of_menopause ?? "",
    reproductiveNotes: source.reproductiveNotes ?? source.lifecycleHarmonialChangesNotes ?? source.reproductive_notes ?? "",
    notes: source.notes ?? "",
  };
}

export function normalizeGynaecHistoryFromDigitiseData(digitization) {
  return mapGynecHistoryToForm(digitization);
}

export function mergeGynecHistory(existingGynec, incomingGynec) {
  const existing = mapGynecHistoryToForm(existingGynec);
  const incoming = mapGynecHistoryToForm(incomingGynec);
  if (isGynecDataEmpty(incoming)) return existing;
  const merged = { ...existing };
  Object.entries(incoming).forEach(([key, value]) => {
    if (hasMeaningfulGynecValue(value)) {
      merged[key] = value;
    }
  });
  return merged;
}

const META_KEYS = ["createdAt", "createdBy", "updatedAt", "updatedBy"];

function toApiLmp(value) {
  if (!value) return value;
  return normalizeLmpForApi(value);
}


/**
 * True if gynec object has no meaningful data (only meta or empty).
 */
export function isGynecDataEmpty(gynec) {
  if (!gynec || typeof gynec !== "object") return true;
  return !Object.keys(gynec).some(
    (k) => {
      if (META_KEYS.includes(k)) return false;
      const v = gynec[k];
      if (v === undefined || v === null || v === "") return false;
      const s = String(v).trim();
      if (s === "" || s === "0") return false;
      if (typeof v === "number" && v === 0) return false;
      return true;
    }
  );
}

/**
 * Format normalized gynec history into display lines (read-only, e.g. patient summary).
 * Single source of truth for gynec display text; used by Cardiology and can be used elsewhere.
 */
export function formatGynecDisplayLines(gynec) {
  if (!gynec || typeof gynec !== "object" || isGynecDataEmpty(gynec)) return [];
  const formatVal = (v) => {
    if (v === undefined || v === null || v === "") return null;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "number" && v === 0) return null;
    const s = String(v).trim();
    if (s === "0") return null;
    return s;
  };
  const lines = [];
  const lmp = formatVal(gynec.lastMenstrualPeriod ?? gynec.lmp);
  if (lmp) lines.push(`Last menstrual period: ${lmp}`);
  const menarche = formatVal(gynec.ageAtMenarche);
  if (menarche) lines.push(`Menarche (Age at: ${menarche})`);
  const cycleType = formatVal(gynec.cycle);
  const interval = formatVal(gynec.intervalOfCycle ?? gynec.intervalCycle);
  const cycleNotes = formatVal(gynec.cycleNotes);
  if (cycleType || interval || cycleNotes) {
    const parts = [];
    if (cycleType) parts.push(`Type: ${cycleType}`);
    if (interval) parts.push(`Cycle Interval: ${interval}`);
    if (cycleNotes) parts.push(`Cycle Notes: ${cycleNotes}`);
    lines.push(`Cycle(${parts.join(", ")})`);
  }
  const flow = formatVal(gynec.flow);
  const duration = formatVal(gynec.durationOfMenstrualFlow);
  const clots = formatVal(gynec.clots);
  const pads = formatVal(gynec.numberOfPadsPerDay);
  if (flow || duration || clots !== null || pads) {
    const parts = [];
    if (flow) parts.push(`Volume: ${flow}`);
    if (duration) parts.push(`Duration of Menstrual Flow: ${duration}`);
    if (clots !== null) parts.push(`Clots During Flow: ${clots}`);
    if (pads) parts.push(`Number of Pads Per Day: ${pads}`);
    if (parts.length > 0) lines.push(`Flow(${parts.join(", ")})`);
  }
  const pain = formatVal(gynec.pain);
  const occurrence = formatVal(gynec.occurrenceOfPain);
  if (pain || occurrence) {
    const parts = [];
    if (pain) parts.push(`Level: ${pain}`);
    if (occurrence) parts.push(`Occurrence of pain: ${occurrence}`);
    lines.push(`Pain(${parts.join(", ")})`);
  }
  const lifecycle = formatVal(gynec.reproductiveLifeStages ?? gynec.lifecycleHarmonialChanges);
  if (lifecycle) {
    const ageAt = formatVal(gynec.ageAtMenopause);
    const typeOf = formatVal(gynec.typeOfMenopause);
    const parts = [`type: ${lifecycle}`];
    if (ageAt) parts.push(`Age at Menopause: ${ageAt}`);
    if (typeOf) parts.push(`Type of Menopause: ${typeOf}`);
    lines.push(`Lifecycle Hormonal Changes(${parts.join(", ")})`);
  }
  const notes = formatVal(gynec.notes);
  if (notes) lines.push(`Note(${notes})`);
  return lines;
}

function formatGynecValue(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && value === 0) return null;
  const text = String(value).trim();
  if (!text || text === "0") return null;
  return text;
}

function formatGynecLmp(value) {
  const formatted = formatGynecValue(value);
  if (!formatted) return null;
  const parsed = parseLmpDate(formatted);
  return parsed?.isValid() ? parsed.format("DD MMM YYYY") : formatted;
}

function gynecItem(name, parts, payload) {
  const detail = parts.filter(Boolean).join(" | ");
  return detail ? { name, detail, payload } : null;
}

export function getGynecClinicalNoteItems(gynecRaw) {
  const gynec = normalizeGynecHistoryFromApi(gynecRaw);
  if (isGynecDataEmpty(gynec)) return [];

  const items = [];
  const lmp = formatGynecLmp(gynec.lmp ?? gynec.lastMenstrualPeriod);
  if (lmp) {
    items.push({ name: "LMP", detail: lmp, payload: { lmp: gynec.lmp ?? gynec.lastMenstrualPeriod } });
  }

  const ageAtMenarche = formatGynecValue(gynec.ageAtMenarche);
  const menarcheNotes = formatGynecValue(gynec.menarcheNotes);
  const menarche = gynecItem(
    "Menarche",
    [
      ageAtMenarche ? `Age at: ${ageAtMenarche} years` : null,
      menarcheNotes ? `Notes: ${menarcheNotes}` : null,
    ],
    { age_at_menarche: gynec.ageAtMenarche, menarche_notes: gynec.menarcheNotes }
  );
  if (menarche) items.push(menarche);

  const cycle = formatGynecValue(gynec.cycle);
  const interval = formatGynecValue(gynec.intervalOfCycle ?? gynec.intervalCycle);
  const cycleNotes = formatGynecValue(gynec.cycleNotes);
  const cycleItem = gynecItem(
    "Cycle",
    [
      cycle ? `Type: ${cycle}` : null,
      interval ? `Interval: ${interval} days` : null,
      cycleNotes ? `Notes: ${cycleNotes}` : null,
    ],
    { cycle: gynec.cycle, interval_of_cycle: gynec.intervalOfCycle ?? gynec.intervalCycle, cycle_notes: gynec.cycleNotes }
  );
  if (cycleItem) items.push(cycleItem);

  const flow = formatGynecValue(gynec.flow);
  const duration = formatGynecValue(gynec.durationOfMenstrualFlow);
  const clots = formatGynecValue(gynec.clots);
  const pads = formatGynecValue(gynec.numberOfPadsPerDay);
  const flowNotes = formatGynecValue(gynec.flowNotes);
  const flowItem = gynecItem(
    "Flow",
    [
      flow ? `Volume: ${flow}` : null,
      duration ? `Duration: ${duration} days` : null,
      clots ? `Clots: ${clots}` : null,
      pads ? `Pads/day: ${pads}` : null,
      flowNotes ? `Notes: ${flowNotes}` : null,
    ],
    {
      flow: gynec.flow,
      duration_of_menstrual_flow: gynec.durationOfMenstrualFlow,
      clots: gynec.clots,
      number_of_pads_per_day: gynec.numberOfPadsPerDay,
      flow_notes: gynec.flowNotes,
    }
  );
  if (flowItem) items.push(flowItem);

  const pain = formatGynecValue(gynec.pain);
  const occurrence = formatGynecValue(gynec.occurrenceOfPain);
  const painNotes = formatGynecValue(gynec.painNotes);
  const painItem = gynecItem(
    "Pain",
    [
      pain ? `Severity: ${pain}` : null,
      occurrence ? `Occurrence: ${occurrence}` : null,
      painNotes ? `Notes: ${painNotes}` : null,
    ],
    { pain: gynec.pain, occurrence_of_pain: gynec.occurrenceOfPain, pain_notes: gynec.painNotes }
  );
  if (painItem) items.push(painItem);

  const stage = formatGynecValue(gynec.reproductiveLifeStages ?? gynec.lifecycleHarmonialChanges);
  const ageAtMenopause = formatGynecValue(gynec.ageAtMenopause);
  const typeOfMenopause = formatGynecValue(gynec.typeOfMenopause);
  const reproductiveNotes = formatGynecValue(gynec.reproductiveNotes);
  const lifecycleItem = gynecItem(
    "Lifecycle Hormonal Changes",
    [
      stage ? `Stage: ${stage}` : null,
      ageAtMenopause ? `Age at menopause: ${ageAtMenopause} years` : null,
      typeOfMenopause ? `Type: ${typeOfMenopause}` : null,
      reproductiveNotes ? `Notes: ${reproductiveNotes}` : null,
    ],
    {
      reproductive_life_stages: gynec.reproductiveLifeStages ?? gynec.lifecycleHarmonialChanges,
      age_at_menopause: gynec.ageAtMenopause,
      type_of_menopause: gynec.typeOfMenopause,
      reproductive_notes: gynec.reproductiveNotes,
    }
  );
  if (lifecycleItem) items.push(lifecycleItem);

  const notes = formatGynecValue(gynec.notes);
  if (notes) {
    items.push({ name: "Notes", detail: notes, payload: { notes: gynec.notes } });
  }

  return items;
}

/**
 * Maps digitise/backend gynec history into the exact legacy form/API shape
 * sent by the manual Gynec History modal.
 */
export function mapGynecHistoryBackendToUi(data) {
  return mapGynecHistoryToForm(data);
}

/**
 * Build payload for gynec POST (timeline item) or PATCH. Matches the manual
 * Gynec History modal PATCH body.
 */
export function buildGynecPayloadForApi(gynec, userId) {
  if (!gynec || typeof gynec !== "object") return null;
  const apiGynec = mapGynecHistoryBackendToUi(gynec);
  const lmpRaw = apiGynec.lmp;
  const lmp = toApiLmp(lmpRaw);
  const now = moment().toISOString();
  const payload = {
    ...apiGynec,
    lmp: lmp ?? apiGynec.lmp,
    createdAt: now,
    createdBy: userId,
  };
  if (lmpRaw && !lmp) delete payload.lmp;
  Object.keys(payload).forEach((k) => {
    const v = payload[k];
    if (v === undefined || v === "" || v === null) delete payload[k];
    // Don't send numeric fields when they are 0 (e.g. durationOfMenstrualFlow, numberOfPadsPerDay, ageAtMenarche, ageAtMenopause)
    else if (typeof v === "number" && v === 0) delete payload[k];
  });
  if (payload.createdAt === undefined) payload.createdAt = now;
  if (payload.createdBy === undefined) payload.createdBy = userId;
  return payload;
}


export function isGynecEqual(apiGynec, rxGynec) {
  if (!rxGynec || typeof rxGynec !== "object") return true;
  const apiUiGynec = mapGynecHistoryBackendToUi(apiGynec);
  const rxUiGynec = mapGynecHistoryBackendToUi(rxGynec);
  const keys = new Set([...Object.keys(rxUiGynec), ...Object.keys(apiUiGynec).filter((k) => !META_KEYS.includes(k))]);
  for (const k of keys) {
    if (META_KEYS.includes(k)) continue;
    const a = apiUiGynec?.[k];
    const r = rxUiGynec[k];
    if (a === r) continue;
    const aEmpty = a === null || a === undefined;
    const rEmpty = r === null || r === undefined;
    if (aEmpty && rEmpty) continue;
    if (aEmpty || rEmpty) return false;
    if (String(a).trim() !== String(r).trim()) return false;
  }
  return true;
}

/**
 * After End Visit (voice, ambient, snap, smart): sync gynec history.
 *
 * @param {string|number} patientId - patient_unique_id
 * @param {string|number} userId - doctor user_id
 * @param {object} rxGynec - Normalized gynec from Rx pad (use getNormalizedGynecHistory(prescriptionData))
 * @param {{ getGynecDetails: function, postGynecDetails: function, updateGynecDetails: function }} api - Gynec API functions
 */
export async function syncGynecHistoryAfterEndVisit(patientId, userId, rxGynec, api) {
  if (!patientId || userId === null || userId === undefined) return;
  if (isGynecDataEmpty(rxGynec)) return;
  const { getGynecDetails, postGynecDetails, updateGynecDetails } = api;
  const finalGynecHistory = mapGynecHistoryBackendToUi(rxGynec);
  const payload = buildGynecPayloadForApi(finalGynecHistory, userId);
  if (!payload) return;
  let existing = null;
  try {
    existing = await getGynecDetails(patientId, userId);
  } catch (e) {
    return;
  }
  const hasExisting = existing && typeof existing === "object" && !isGynecDataEmpty(existing);
  if (!hasExisting) {
    try {
      await postGynecDetails({
        patientId: Number(patientId),
        timeline: [payload],
        createdAt: payload.createdAt,
        createdBy: payload.createdBy,
      });
    } catch (e) {
      console.error("End Visit: gynec POST failed", e);
    }
    return;
  }
  if (!isGynecEqual(existing, finalGynecHistory)) {
    try {
      await updateGynecDetails(patientId, payload, userId);
    } catch (e) {
      console.error("End Visit: gynec PATCH failed", e);
    }
  }
}
