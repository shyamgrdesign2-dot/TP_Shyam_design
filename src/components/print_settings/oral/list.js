import React from "react";
import { Text, View } from "@react-pdf/renderer";
import moment from "moment";
import { ORAL_POSITION_LABEL } from "../../dental/examination/types";

function entryMeta(entry) {
  const since = (entry.since || "").trim();
  const note = (entry.note || "").trim();
  const region = (entry.surfaces || []).map((s) => ORAL_POSITION_LABEL[s] || s).join(", ");
  const bits = [];
  if (region) bits.push(region);
  if (since) bits.push(`since ${since}`);
  if (note) bits.push(note);
  return bits.join(", ");
}

export function OralListView({ PX_TO_PT, printSettings, oralChart, consultationDate, showDates = false }) {
  const entries = Array.isArray(oralChart?.oralEntries) ? oralChart.oralEntries : [];
  const notes = (oralChart?.oralNotes || "").trim();
  if (entries.length === 0 && !notes) return null;

  const dateStr = consultationDate
    ? moment(consultationDate).format("D MMM YYYY")
    : moment().format("D MMM YYYY");
  const baseFontSize = printSettings?.page_format?.font_size || 12;
  const fontFamily = printSettings?.page_format?.font_family || "Roboto";

  const groups = [
    { label: "Past Procedures", filter: (e) => e.kind === "past" },
    { label: "Findings", filter: (e) => e.kind !== "past" && e.kind !== "procedure" },
    { label: "Procedures", filter: (e) => e.kind === "procedure" },
  ];

  return (
    <View style={{ marginTop: PX_TO_PT * 12, marginBottom: PX_TO_PT * 10 }}>
      <Text
        style={{
          color: "#171725",
          fontFamily,
          fontSize: PX_TO_PT * (baseFontSize + 1),
          fontWeight: "700",
          marginBottom: PX_TO_PT * 8,
        }}
      >
        Oral Examination 
        {/* ({dateStr}) */}
      </Text>
      {groups.map((g) => {
        const list = entries.filter(g.filter);
        if (!list.length) return null;
        return (
          <View key={g.label} style={{ marginBottom: PX_TO_PT * 6 }}>
            <Text style={{ fontFamily, fontSize: PX_TO_PT * baseFontSize, fontWeight: "700", color: "#171725" }}>
              • {g.label}
            </Text>
            {list.map((item, i) => (
              <View key={i} style={{ flexDirection: "row", marginLeft: 14, marginTop: PX_TO_PT * 2 }}>
                <Text style={{ fontFamily, fontSize: PX_TO_PT * baseFontSize, color: "#94a3b8", marginRight: 6 }}>•</Text>
                <Text style={{ flex: 1, fontFamily, fontSize: PX_TO_PT * baseFontSize, color: "#475569" }}>
                  <Text style={{ fontWeight: "600", color: "#334155" }}>{item.name}</Text>
                  {entryMeta(item) ? ` (${entryMeta(item)})` : ""}
                  {showDates && item.updatedAt ? ` · ${moment(item.updatedAt).format("D MMM YYYY")}` : ""}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
      {notes ? (
        <View style={{ marginTop: PX_TO_PT * 4 }}>
          <Text style={{ fontFamily, fontSize: PX_TO_PT * baseFontSize, fontWeight: "700" }}>• Notes</Text>
          <Text style={{ fontFamily, fontSize: PX_TO_PT * baseFontSize, color: "#475569", marginLeft: 14 }}>
            {notes}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default OralListView;
