import { fetchPatientLabResults } from "./limsApi";
import {
  filterLabResultsByDoctor,
  getPatientLastVisitDoctorUmId,
  isLabResultsReceptionistSession,
} from "../../utils/labResultsUtils";
import { specimenForReport, formatDateLabel } from "./limsHelpers";

function groupByReport(inputs) {
  const map = new Map();
  (inputs || []).forEach((inp) => {
    if (!inp?.testName || inp.testName === "Remarks") return;
    const key = (inp.reportName || "General").trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(inp);
  });
  return map;
}

function arrowSymbol(dir) {
  if (dir === "UP") return " &#9650;";
  if (dir === "DOWN") return " &#9660;";
  return "";
}

function rangeText(inp) {
  const rr = inp.refRange;
  if (!rr || !Array.isArray(rr.ranges) || rr.ranges.length === 0) return "";
  const r = rr.ranges[0];
  if (r.min != null && r.max != null && r.min !== "" && r.max !== "")
    return `${r.min} - ${r.max}`;
  return "";
}

function buildHTML(patient, results, dateFilter) {
  const name = patient.pm_fullname || "Unknown";
  const age = patient.ageYears
    ? `${patient.ageYears}y`
    : patient.ageMonths
    ? `${patient.ageMonths}m`
    : patient.pm_age
    ? `${patient.pm_age}y`
    : "";
  const gender = patient.pm_gender || "";
  const pid = patient.pm_pid || patient.tpml_refrence_id || "";
  const contact = patient.pm_contact_no || "";

  let filtered = results || [];
  if (dateFilter) {
    filtered = filtered.filter((r) => r.date === dateFilter);
  }

  if (filtered.length === 0) {
    return `
      <html><head><title>Lab Results - ${name}</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:40px;color:#333;}
      h2{margin:0 0 4px;} .sub{color:#666;font-size:14px;margin-bottom:24px;}
      .empty{text-align:center;padding:60px 0;color:#999;font-size:16px;}
      </style></head><body>
      <h2>Lab Results: ${name}</h2>
      <div class="sub">${[gender, age].filter(Boolean).join(", ")}${pid ? ` | ID: ${pid}` : ""}${contact ? ` | ${contact}` : ""}</div>
      <div class="empty">No lab results recorded${dateFilter ? ` for ${formatDateLabel(dateFilter)}` : ""}.</div>
      </body></html>`;
  }

  let tables = "";
  filtered.forEach((entry) => {
    const dateLabel = formatDateLabel(entry.date) || entry.date || "Unknown date";
    const grouped = groupByReport(entry.inputs);

    grouped.forEach((tests, reportName) => {
      const specimen = specimenForReport(reportName);
      tables += `
        <div class="report-block">
          <div class="report-header">
            <span class="report-name">${reportName}</span>
            <span class="report-meta">${dateLabel} &middot; ${specimen}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:40%">Test</th>
                <th style="width:20%">Result</th>
                <th style="width:15%">Unit</th>
                <th style="width:25%">Reference Range</th>
              </tr>
            </thead>
            <tbody>`;

      tests.forEach((t) => {
        const val = t.value != null && String(t.value).trim() !== "" ? String(t.value) : "-";
        const arrow = arrowSymbol(t.arrowDirection);
        const isAbnormal = t.arrowDirection === "UP" || t.arrowDirection === "DOWN";
        tables += `
              <tr${isAbnormal ? ' class="abnormal"' : ""}>
                <td>${t.testName || ""}</td>
                <td class="val">${val}${arrow}</td>
                <td>${t.units || ""}</td>
                <td>${rangeText(t)}</td>
              </tr>`;
      });

      tables += `
            </tbody>
          </table>
        </div>`;
    });
  });

  return `
    <html>
    <head>
      <title>Lab Results - ${name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Inter, Arial, Helvetica, sans-serif;
          padding: 32px 40px;
          color: #171725;
          font-size: 13px;
          line-height: 1.5;
        }
        h2 { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
        .sub { color: #44444f; font-size: 13px; margin-bottom: 24px; }
        .report-block { margin-bottom: 24px; break-inside: avoid; }
        .report-header {
          display: flex; justify-content: space-between; align-items: baseline;
          border-bottom: 2px solid #171725; padding-bottom: 4px; margin-bottom: 0;
        }
        .report-name { font-weight: 700; font-size: 14px; }
        .report-meta { font-size: 12px; color: #696974; }
        table { width: 100%; border-collapse: collapse; }
        th {
          text-align: left; font-weight: 600; font-size: 11px;
          text-transform: uppercase; letter-spacing: 0.04em;
          color: #696974; padding: 6px 8px;
          border-bottom: 1px solid #e2e2ea;
        }
        td { padding: 5px 8px; border-bottom: 1px solid #f1f1f5; font-size: 13px; }
        .val { font-weight: 600; }
        .abnormal td { color: #c5292a; }
        .abnormal .val { font-weight: 700; }
        .footer {
          margin-top: 40px; padding-top: 12px;
          border-top: 1px solid #e2e2ea;
          font-size: 11px; color: #92929d; text-align: center;
        }
        @media print {
          body { padding: 16px 24px; }
          .report-block { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h2>Lab Results: ${name}</h2>
      <div class="sub">${[gender, age].filter(Boolean).join(", ")}${pid ? ` &nbsp;|&nbsp; ID: ${pid}` : ""}${contact ? ` &nbsp;|&nbsp; ${contact}` : ""}</div>
      ${tables}
      <div class="footer">Printed from TatvaPractice LIMS</div>
    </body>
    </html>`;
}

export async function printPatientResults(patient, dateFilter) {
  if (!patient?.patient_unique_id) return;
  let results = await fetchPatientLabResults(patient.patient_unique_id);
  if (isLabResultsReceptionistSession()) {
    results = filterLabResultsByDoctor(results, getPatientLastVisitDoctorUmId(patient));
  }
  const html = buildHTML(patient, results, dateFilter || null);

  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

export async function printPatientResultsToday(patient) {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const today = `${d.getFullYear()}-${m}-${day}`;
  return printPatientResults(patient, today);
}
