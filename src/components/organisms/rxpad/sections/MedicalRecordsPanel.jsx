"use client";

import { FolderOpen, FileText, Image, File } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { PanelEmptyState } from "./ExpandedPanel";


/**
 * Medical Records Panel
 * ─────────────────────
 * Displays uploaded medical documents organized by type and date.
 *
 * Display rules:
 *   - Grouped by document type
 *   - Most recent documents first within each group
 *   - File type icons: PDF (red), Image (blue), Doc (violet)
 *   - Each document shows: title, date, uploader, file size
 *   - Tags displayed as small chips below the title
 *   - Click opens document preview (placeholder behavior)
 */

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const fileTypeIcons = {
  pdf: { icon: FileText, color: "text-tp-error-500", bg: "bg-tp-error-50" },
  image: { icon: Image, color: "text-tp-blue-500", bg: "bg-tp-blue-50" },
  doc: { icon: File, color: "text-tp-violet-500", bg: "bg-tp-violet-50" }
};

const docTypeBg = {
  "Prescription": "bg-tp-blue-50 text-tp-blue-600",
  "Lab Report": "bg-tp-success-50 text-tp-success-600",
  "Radiology": "bg-tp-violet-50 text-tp-violet-600",
  "Discharge Summary": "bg-tp-warning-50 text-tp-warning-600",
  "Referral Letter": "bg-tp-slate-100 text-tp-slate-600",
  "Insurance": "bg-tp-amber-50 text-tp-slate-600",
  "Consent Form": "bg-tp-slate-100 text-tp-slate-600",
  "Other": "bg-tp-slate-100 text-tp-slate-500"
};

function DocumentCard({ doc, onCopy }) {
  const ft = fileTypeIcons[doc.fileType];
  const Icon = ft.icon;

  return (
    <div className="group/item flex items-start gap-3 rounded-lg border border-tp-slate-200 bg-white px-3 py-2.5 mb-2 last:mb-0 hover:border-tp-blue-200 hover:shadow-sm transition-all cursor-pointer">
      <div className={`flex items-center justify-center rounded-lg w-9 h-9 shrink-0 ${ft.bg}`}>
        <Icon size={18} className={ft.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-tp-slate-800 truncate">{doc.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${docTypeBg[doc.type] || docTypeBg["Other"]}`}>
            {doc.type}
          </span>
          <span className="text-[10px] text-tp-slate-400">{formatDate(doc.date)}</span>
          {doc.fileSize &&
          <span className="text-[10px] text-tp-slate-400">{doc.fileSize}</span>
          }
        </div>
        {doc.tags && doc.tags.length > 0 &&
        <div className="flex flex-wrap gap-1 mt-1">
            {doc.tags.map((tag, i) =>
          <span key={i} className="rounded bg-tp-slate-100 px-1.5 py-0.5 text-[10px] text-tp-slate-500">{tag}</span>
          )}
          </div>
        }
        {doc.notes &&
        <p className="text-[10px] italic text-tp-slate-400 mt-1">{doc.notes}</p>
        }
      </div>
      <CopyButton onCopy={onCopy} size={12} />
    </div>);

}

export function MedicalRecordsPanel({
  documents,
  onCopyToRxPad



}) {
  if (!documents.length) {
    return (
      <PanelEmptyState
        icon={<FolderOpen size={32} />}
        message="No medical records"
        description="Uploaded documents will appear here" />);


  }

  const source = "Medical Records";

  return (
    <div>
      {documents.map((doc) =>
      <DocumentCard
        key={doc.id}
        doc={doc}
        onCopy={() => onCopyToRxPad?.({
          target: "notes",
          items: [`[${doc.type}] ${doc.title} (${formatDate(doc.date)})`],
          source
        })} />

      )}
    </div>);

}