import React from "react";
import { Text, View } from "@react-pdf/renderer";
import moment from "moment";
import { ORAL_POSITION_LABEL } from "../../dental/examination/types";

export function OralTableView({ PX_TO_PT, printSettings, oralChart, consultationDate, showDates = false }) {
  const entries = Array.isArray(oralChart?.oralEntries) ? oralChart.oralEntries : [];
  const notes = (oralChart?.oralNotes || "").trim();
  if (entries.length === 0 && !notes) return null;

  const dateStr = consultationDate
    ? moment(consultationDate).format("D MMM YYYY")
    : moment().format("D MMM YYYY");
  const baseFontSize = printSettings?.page_format?.font_size || 12;
  const fontFamily = printSettings?.page_format?.font_family || "Roboto";

  const kindLabel = (e) => {
    if (e.kind === "past") return "Past Procedures";
    if (e.kind === "procedure") return "Procedures";
    return "Findings";
  };

  const renderTable = (title, rows) => {
    if (!rows.length) return null;
    return (
      <View style={{ border: "1px solid #e2e8f0", borderRadius: 6, marginBottom: PX_TO_PT * 8, overflow: "hidden" }}>
        <View style={{ backgroundColor: "#f8fafc", padding: PX_TO_PT * 5, borderBottom: "1px solid #e2e8f0" }}>
          <Text style={{ fontFamily, fontWeight: "700", fontSize: PX_TO_PT * (baseFontSize - 1), color: "#475569" }}>
            {title}
          </Text>
        </View>
        <View style={{ flexDirection: "row", padding: PX_TO_PT * 4, backgroundColor: "#fff", borderBottom: "1px solid #f1f5f9" }}>
          {["Name", "Area", "Since", "Notes"].map((h) => (
            <Text key={h} style={{ flex: h === "Name" ? 0.32 : h === "Notes" ? 0.26 : 0.21, fontFamily, fontSize: PX_TO_PT * (baseFontSize - 2), fontWeight: "700", color: "#94a3b8" }}>
              {h.toUpperCase()}
            </Text>
          ))}
        </View>
        {rows.map((item, idx) => (
          <View key={idx} style={{ flexDirection: "row", padding: PX_TO_PT * 5, borderTop: "1px solid #f1f5f9" }}>
            <Text style={{ flex: 0.32, fontFamily, fontSize: PX_TO_PT * (baseFontSize - 1), color: "#334155", fontWeight: "500" }}>
              {item.name}
              {showDates && item.updatedAt ? ` · ${moment(item.updatedAt).format("D MMM YY")}` : ""}
            </Text>
            <Text style={{ flex: 0.21, fontFamily, fontSize: PX_TO_PT * (baseFontSize - 1), color: "#334155" }}>
              {(item.surfaces || []).map((s) => ORAL_POSITION_LABEL[s] || s).join(", ") || "—"}
            </Text>
            <Text style={{ flex: 0.21, fontFamily, fontSize: PX_TO_PT * (baseFontSize - 1), color: "#334155" }}>
              {item.since || "—"}
            </Text>
            <Text style={{ flex: 0.26, fontFamily, fontSize: PX_TO_PT * (baseFontSize - 1), color: "#334155" }}>
              {item.note || "—"}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={{ marginTop: PX_TO_PT * 12, marginBottom: PX_TO_PT * 10 }}>
      <Text style={{ fontFamily, fontSize: PX_TO_PT * (baseFontSize + 1), fontWeight: "700", color: "#171725", marginBottom: PX_TO_PT * 8 }}>
        Oral Examination 
        {/* ({dateStr}) */}
      </Text>
      {renderTable("PAST PROCEDURES", entries.filter((e) => e.kind === "past"))}
      {renderTable("FINDINGS", entries.filter((e) => e.kind !== "past" && e.kind !== "procedure"))}
      {renderTable("PROCEDURES", entries.filter((e) => e.kind === "procedure"))}
      {notes ? (
        <View style={{ padding: PX_TO_PT * 6 }}>
          <Text style={{ fontFamily, fontWeight: "600", fontSize: PX_TO_PT * (baseFontSize - 1), color: "#475569" }}>NOTES</Text>
          <Text style={{ fontFamily, fontSize: PX_TO_PT * (baseFontSize - 1), color: "#334155", marginTop: PX_TO_PT * 2 }}>{notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default OralTableView;
