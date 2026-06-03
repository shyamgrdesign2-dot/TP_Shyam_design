import React from "react";
import { Text, View, Svg, Path } from "@react-pdf/renderer";
import moment from "moment";

// Vector graphic tooth icon for high premium feel in print PDF
const ToothIconPdf = ({ size = 12, color = "#171725" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.0799 8.09009C12.5599 9.37009 11.1799 9.04009 9.8999 8.09009"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21.0902 5.01989C19.6502 2.61989 16.7802 1.47989 14.0802 2.22989L12.4202 2.69989C12.1402 2.77989 11.8302 2.77989 11.5502 2.69989L9.89023 2.22989C7.19023 1.46989 4.32023 2.60989 2.88023 5.01989C2.30023 5.98989 1.99023 7.09989 1.99023 8.22989V8.34989C1.99023 12.2099 2.77023 16.0199 4.28023 19.5699L4.67023 20.4899C5.06023 21.4099 5.96023 21.9999 6.96023 21.9999C7.98023 21.9999 8.89024 21.3799 9.27024 20.4299L10.4602 17.4399C10.7102 16.8099 11.3102 16.3999 11.9802 16.3999C12.6502 16.3999 13.2602 16.8099 13.5002 17.4399L14.6902 20.4299C15.0702 21.3799 15.9802 21.9999 17.0002 21.9999C18.0002 21.9999 18.9002 21.3999 19.2902 20.4899L19.6802 19.5699C21.1902 16.0199 21.9702 12.1999 21.9702 8.34989V8.22989C21.9702 7.09989 21.6602 5.98989 21.0802 5.01989H21.0902Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TOOTH_NAMES = {
  1: "Central Incisor",
  2: "Lateral Incisor",
  3: "Canine",
  4: "First Premolar",
  5: "Second Premolar",
  6: "First Molar",
  7: "Second Molar",
  8: "Third Molar",
};

const getToothFullName = (toothCode) => {
  const codeStr = String(toothCode || "").trim();
  if (!codeStr) return "Unknown Tooth";

  const q = parseInt(codeStr[0], 10);
  const pos = parseInt(codeStr[1], 10);

  if (isNaN(q) || isNaN(pos) || pos < 1 || pos > 8) {
    return `Tooth ${codeStr}`;
  }

  const qMap = {
    1: { name: "Upper Right", arch: "maxillary" },
    2: { name: "Upper Left", arch: "maxillary" },
    3: { name: "Lower Left", arch: "mandibular" },
    4: { name: "Lower Right", arch: "mandibular" },
    5: { name: "Upper Right", arch: "maxillary" },
    6: { name: "Upper Left", arch: "maxillary" },
    7: { name: "Lower Left", arch: "mandibular" },
    8: { name: "Lower Right", arch: "mandibular" },
  };

  const quadrant = qMap[q];
  const toothName = TOOTH_NAMES[pos] || `Tooth ${pos}`;

  if (!quadrant) {
    return `${toothName} (T${codeStr})`;
  }

  return `${quadrant.name} ${toothName} (T${codeStr})`;
};

const mapSurfaceCode = (code, toothCode) => {
  const codeLower = String(code || "").toLowerCase();

  let pos = 1;
  let q = 2;
  if (toothCode) {
    const codeStr = String(toothCode);
    q = parseInt(codeStr[0], 10);
    pos = parseInt(codeStr[1], 10);
  }

  const isAnterior = pos <= 3;
  const isUpper = q === 1 || q === 2 || q === 5 || q === 6;

  switch (codeLower) {
    case "occlusal":
      return isAnterior ? "Incisal" : "Occlusal";
    case "buccal":
      return isAnterior ? "Labial" : "Buccal";
    case "lingual":
      return isUpper ? "Palatal" : "Lingual";
    case "mesial":
      return "Mesial";
    case "distal":
      return "Distal";
    case "cervical":
      return "Cervical";
    case "root":
      return "Root";
    case "whole":
      return "Whole Tooth";
    default:
      return codeLower.charAt(0).toUpperCase() + codeLower.slice(1);
  }
};

const formatItemData = (item, toothCode) => {
  const name = item.name || item.type || "";

  let surfacesStr = "";
  if (Array.isArray(item.surface_codes) && item.surface_codes.length > 0) {
    const cleanSurfaces = item.surface_codes
      .filter((s) => s && s.toLowerCase() !== "whole" && s.toLowerCase() !== "whole tooth")
      .map((s) => mapSurfaceCode(s, toothCode));
    if (cleanSurfaces.length > 0) {
      surfacesStr = cleanSurfaces.join(", ");
    }
  }

  const dateStr = item.since_date || item.since || item.procedure_date || item.plannedDate || "";
  const notesStr = (item.notes || item.note || "").trim();
  const cleanNotes = notesStr === "__dx__" ? "" : notesStr;
  const statusStr = (item.status || "").trim();

  const parts = [surfacesStr, dateStr, statusStr, cleanNotes].filter(Boolean);

  return {
    name,
    details: parts.length > 0 ? `(${parts.join(" | ")})` : "",
  };
};

export function DentalInlineView({ PX_TO_PT, printSettings, dentalExaminationData, consultationDate }) {
  const toothStates = Array.isArray(dentalExaminationData?.tooth_states) ? dentalExaminationData.tooth_states : [];

  const teethWithData = toothStates.filter((toothState) => {
    const hasHistory = (toothState.treatment_history || []).length > 0;
    const hasFindings = (toothState.findings || []).length > 0;
    const hasProcedures = (toothState.procedures || []).length > 0;
    const hasNotes = (toothState.overall_notes || "").trim().length > 0;
    return hasHistory || hasFindings || hasProcedures || hasNotes;
  });

  if (teethWithData.length === 0) {
    return null;
  }

  const dateStr = consultationDate
    ? moment(consultationDate).format("D MMM YYYY")
    : moment().format("D MMM YYYY");

  const baseFontSize = printSettings?.page_format?.font_size || 12;
  const fontFamily = printSettings?.page_format?.font_family || "Roboto";

  return (
    <View style={{ marginTop: PX_TO_PT * 12, marginBottom: PX_TO_PT * 10 }}>
      {/* Title Block */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: PX_TO_PT * 8,
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: PX_TO_PT * 4,
        }}
      >
        <View style={{ marginRight: 6 }}>
          <ToothIconPdf size={14} color="#171725" />
        </View>
        <Text
          style={{
            color: "#171725",
            fontFamily,
            fontSize: PX_TO_PT * (baseFontSize + 1),
            fontWeight: "700",
          }}
        >
          Dental Examination ({dateStr})
        </Text>
      </View>

      {/* Inline Content */}
      <View>
        {teethWithData.map((toothState) => {
          const toothCode = toothState.tooth_code;
          const fullName = getToothFullName(toothCode);

          const history = toothState.treatment_history || [];
          const findings = toothState.findings || [];
          const procedures = toothState.procedures || [];
          const notes = (toothState.overall_notes || "").trim();

          const categories = [];
          if (history.length > 0) {
            categories.push({
              label: "Past Procedures",
              items: history.map((item) => formatItemData(item, toothCode)),
            });
          }
          if (findings.length > 0) {
            categories.push({
              label: "Findings",
              items: findings.map((item) => formatItemData(item, toothCode)),
            });
          }
          if (procedures.length > 0) {
            categories.push({
              label: "Procedures",
              items: procedures.map((item) => formatItemData(item, toothCode)),
            });
          }
          if (notes.length > 0) {
            categories.push({
              label: "Notes",
              items: [{ name: notes, details: "" }],
            });
          }

          return (
            <Text
              key={toothCode}
              style={{
                fontFamily,
                fontSize: PX_TO_PT * baseFontSize,
                color: "#171725",
                lineHeight: 1.45,
                marginBottom: PX_TO_PT * 5,
              }}
            >
              <Text style={{ fontWeight: "700" }}>{fullName}: </Text>
              {categories.map((cat, catIdx) => (
                <React.Fragment key={cat.label}>
                  {catIdx > 0 && <Text style={{ color: "#3e3e4a" }}>; </Text>}
                  <Text style={{ fontWeight: "700" }}>{cat.label}: </Text>
                  {cat.items.map((item, itemIdx) => (
                    <React.Fragment key={itemIdx}>
                      {itemIdx > 0 && <Text style={{ color: "#3e3e4a" }}>, </Text>}
                      <Text style={{ fontWeight: "500" }}>{item.name}</Text>
                      {item.details && (
                        <Text style={{ color: "#6b7280", fontWeight: "400" }}> {item.details}</Text>
                      )}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

export default DentalInlineView;
