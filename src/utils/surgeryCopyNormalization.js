import { v4 as uuidv4 } from "uuid";

import ApiSurgical from "../api/services/ApiSurgical";

function text(value) {
  return String(value ?? "").trim();
}

function surgeryName(row) {
  return text(row?.name || row?.surgery_name || row?.procedure_name || row?.lineItem || row?.title);
}

function normalizeName(value) {
  return text(value).toLowerCase();
}

function mapSurgeryMasterRecord(record, fallbackName) {
  if (typeof record === "string" || typeof record === "number") {
    return { masterId: record, name: fallbackName };
  }
  if (!record || typeof record !== "object") return null;
  const { id, ...rest } = record;
  return {
    ...rest,
    masterId: record.masterId || id,
    name: record.name || fallbackName,
  };
}

async function findSurgeryMasterByName(name, surgicalApi) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return null;

  const result = await surgicalApi.searchExamination(name);
  const exactMatch = Array.isArray(result)
    ? result.find((item) => normalizeName(item?.name) === normalizedName)
    : null;
  return mapSurgeryMasterRecord(exactMatch, name);
}

async function createCustomSurgeryByName(name, surgicalApi) {
  const created = await surgicalApi.createSurgery({ name });
  return mapSurgeryMasterRecord(created, name) || {
    masterId: created?.id || created?.masterId,
    name,
  };
}

export async function enrichCopiedSurgeryRows(rows = [], surgicalApi = ApiSurgical) {
  if (!Array.isArray(rows)) return [];
  const enrichedRows = [];

  for (const row of rows) {
    const name = surgeryName(row);
    if (!name) continue;

    let masterRecord = null;
    try {
      masterRecord = await findSurgeryMasterByName(name, surgicalApi);
      if (!masterRecord?.masterId) {
        masterRecord = await createCustomSurgeryByName(name, surgicalApi);
      }
    } catch (error) {
      console.error("Copied surgery master enrichment failed:", error);
    }

    enrichedRows.push({
      ...row,
      ...(masterRecord || {}),
      masterId: masterRecord?.masterId || row?.masterId || uuidv4(),
      name: masterRecord?.name || name,
      notes: row?.notes ?? row?.note ?? "",
      change: row?.change ?? 1,
    });
  }

  return enrichedRows;
}
