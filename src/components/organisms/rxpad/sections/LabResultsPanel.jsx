"use client";

import { FlaskConical, ArrowUp, ArrowDown } from "lucide-react";
import { CopyButton, CopySectionButton } from "./CopyButton";
import { PanelEmptyState } from "./ExpandedPanel";

import { LAB_RESULT_RULES } from "../sections-types";

/**
 * Lab Results Panel
 * ─────────────────
 * Displays lab test results grouped by report/category.
 *
 * Display rules:
 *   - Grouped by report date and category (Hematology, Biochemistry, etc.)
 *   - Most recent reports first
 *   - Each test shows: Name, Value, Unit, Reference Range, Status
 *   - Status coloring:
 *     Normal — default text, no highlight
 *     Abnormal — amber text, bold
 *     Critical — red text, bold, red left border
 *     Pending — muted italic
 *   - High/Low flags shown as ↑↓ arrows with color coding
 *   - Abnormal values get a subtle colored background
 *   - Report header shows lab name and ordering doctor
 */

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function FlagIcon({ flag }) {
  if (!flag) return null;
  const isHigh = flag.includes("High");
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isHigh ? "text-tp-error-500" : "text-tp-blue-500"}`}>
      {isHigh ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {flag.includes("Critical") ? "!!" : ""}
    </span>);

}

function TestRow({
  test,
  onCopy



}) {
  const rule = LAB_RESULT_RULES[test.status];

  return (
    <div className={`
      group/item flex items-center gap-2 border-b border-tp-slate-100 px-2 py-1.5 last:border-0
      ${test.status === "Critical" ? "bg-tp-error-50/50 border-l-2 border-l-tp-error-400" :
    test.status === "Abnormal" ? "bg-tp-warning-50/30" : ""}
    `}>
      <div className="flex-1 min-w-0">
        <span className={`text-xs ${rule.style}`}>{test.testName}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-xs font-semibold tabular-nums ${rule.style}`}>{test.value}</span>
        <FlagIcon flag={test.flag} />
        <span className="text-[10px] text-tp-slate-400">{test.unit}</span>
      </div>
      <span className="text-[10px] text-tp-slate-400 shrink-0 min-w-[60px] text-right">{test.referenceRange}</span>
      <CopyButton onCopy={onCopy} size={12} />
    </div>);

}

function LabReportCard({
  report,
  onCopyToRxPad



}) {
  const source = `Lab — ${formatDate(report.date)}`;
  const hasAbnormal = report.tests.some((t) => t.status === "Abnormal" || t.status === "Critical");

  return (
    <details open className="group/lab mb-3 last:mb-0">
      <summary className={`
        flex cursor-pointer items-center gap-2 rounded-lg
        border bg-white px-3 py-2.5
        hover:bg-tp-slate-50 transition-colors
        [&::-webkit-details-marker]:hidden list-none
        group-open/lab:rounded-b-none group-open/lab:border-b-0
        ${hasAbnormal ? "border-tp-warning-200" : "border-tp-slate-200"}
      `}>
        <FlaskConical size={14} className={hasAbnormal ? "text-tp-warning-500" : "text-tp-blue-500"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-tp-slate-900">{report.category}</span>
            {hasAbnormal &&
            <span className="rounded-full bg-tp-warning-50 px-1.5 py-0.5 text-[10px] font-semibold text-tp-warning-600">
                Abnormal
              </span>
            }
          </div>
          <p className="text-[12px] text-tp-slate-500">
            {formatDate(report.date)}
            {report.labName ? ` — ${report.labName}` : ""}
          </p>
        </div>
        <CopySectionButton
          label="Copy All"
          onCopy={() => onCopyToRxPad?.({
            target: "lab-investigations",
            items: report.tests.map((t) => `${t.testName}: ${t.value} ${t.unit} (Ref: ${t.referenceRange})`),
            source
          })} />
        
      </summary>

      <div className="rounded-b-lg border border-t-0 border-tp-slate-200 bg-white overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-2 bg-tp-slate-50 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-tp-slate-500">
          <span className="flex-1">Test</span>
          <span className="shrink-0">Result</span>
          <span className="shrink-0 min-w-[60px] text-right">Ref. Range</span>
          <span className="w-6" />
        </div>
        {report.tests.map((test) =>
        <TestRow
          key={test.id}
          test={test}
          onCopy={() => onCopyToRxPad?.({
            target: "lab-investigations",
            items: [`${test.testName}: ${test.value} ${test.unit}`],
            source
          })} />

        )}
      </div>
    </details>);

}

export function LabResultsPanel({
  reports,
  onCopyToRxPad



}) {
  if (!reports.length) {
    return (
      <PanelEmptyState
        icon={<FlaskConical size={32} />}
        message="No lab results"
        description="Laboratory test results will appear here" />);


  }

  return (
    <div>
      {reports.map((report) =>
      <LabReportCard key={report.id} report={report} onCopyToRxPad={onCopyToRxPad} />
      )}
    </div>);

}