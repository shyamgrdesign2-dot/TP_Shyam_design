// Checks one digitized patient folder: is every stored row traceable to its
// page, does its marked box sit on the page, and do its numbers come from the
// words as written?
//
//   node scripts/case-file/check_case_file.mjs <export.json> <scan folder>
//
//   export.json   the stored JSON (see docs/case-file/case-file-example.json)
//   scan folder   holds manifest.json (page -> scan image) and regions.json
//                 ({ page: { region: [x, y, w, h] } }, fractions of the image)
//
// Exit code 1 when a hard rule fails. Soft findings are printed for a person
// to look at.
import fs from "node:fs";

const [exportPath, scanDir] = process.argv.slice(2);
if (!exportPath || !scanDir) {
  console.error("usage: node check_case_file.mjs <export.json> <scan folder>");
  process.exit(2);
}
const out = JSON.parse(fs.readFileSync(exportPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(`${scanDir}/manifest.json`, "utf8"));
const regions = JSON.parse(fs.readFileSync(`${scanDir}/regions.json`, "utf8"));

const rows = Object.entries(out.digitization || {}).flatMap(([section, list]) => list.map((row) => ({ section, row })));
const hard = [];
const soft = [];

for (const { section, row } of rows) {
  const s = row._source || {};
  const at = `${section} ${s.factId}`;
  if (!s.factId || !s.page || !s.region) { hard.push(`${at}: no page or region`); continue; }
  if (!s.asWritten) hard.push(`${at}: no words as written`);
  if (!String(s.region).startsWith(`p${s.page}-`)) hard.push(`${at}: region ${s.region} is not on page ${s.page}`);
  if (!manifest.map[s.page]) hard.push(`${at}: page ${s.page} has no scan image`);
  if (!regions[s.page]?.[s.region]) soft.push(`${at}: no box for ${s.region}, the whole page is marked instead`);
  if (typeof s.confidence === "number" && s.confidence < 0.7 && s.status !== "verified") soft.push(`${at}: confidence ${s.confidence}, needs a reviewer`);
  // Every number in a stored value must be in the words it was read from.
  const words = String(s.asWritten || "").replace(/\s+/g, "");
  for (const key of ["value", "blood_pressure", "pulse", "spo2", "temperature", "respiratory_rate", "weight", "height"]) {
    for (const n of String(row[key] || "").match(/\d+(?:\.\d+)?/g) || []) {
      if (!words.includes(n)) soft.push(`${at}: ${key} ${n} is not in its words as written (a reading of a series cites the latest page)`);
    }
  }
}

for (const [page, boxes] of Object.entries(regions)) {
  for (const [rid, [x, y, w, h]] of Object.entries(boxes)) {
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1.001 || y + h > 1.001) hard.push(`box ${rid} on page ${page} is outside its page`);
  }
}

for (const stay of out.hospital_course || []) {
  if (!stay.text) hard.push(`hospital course ${stay.encounterId}: no text`);
  if (stay.textSource === "asWritten" && !stay._source?.page) hard.push(`hospital course ${stay.encounterId}: written text without its page`);
  if (stay.textSource === "fromEvents") soft.push(`hospital course ${stay.encounterId}: no course is written in the file, rows are used`);
}

const boxed = rows.filter(({ row }) => regions[row._source?.page]?.[row._source?.region]).length;
console.log(`rows ${rows.length}, with a marked box ${boxed}, stays ${(out.hospital_course || []).length}`);
console.log(`hard failures ${hard.length}`);
hard.forEach((line) => console.log(`  FAIL ${line}`));
console.log(`to look at ${soft.length}`);
soft.forEach((line) => console.log(`  LOOK ${line}`));
process.exit(hard.length ? 1 : 0);
