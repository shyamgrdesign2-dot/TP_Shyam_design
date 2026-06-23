import React from "react";
import { Text, View } from "@react-pdf/renderer";
import moment from "moment";
import { ORAL_POSITION_LABEL } from "../../dental/examination/types";

function formatEntryMeta(entry) {
  const since = (entry.since || "").trim();
  const note = (entry.note || "").trim();
  const region = (entry.surfaces || []).map((s) => ORAL_POSITION_LABEL[s] || s).join(", ");
  const bits = [];
  if (region) bits.push(region);
  if (since) bits.push(`since ${since}`);
  if (note) bits.push(note);
  return bits.length ? ` (${bits.join(", ")})` : "";
}

export function OralInlineView({
  PX_TO_PT,
  printSettings,
  oralChart,
  consultationDate,
  showDates = false,
}) {
  const entries = Array.isArray(oralChart?.oralEntries) ? oralChart.oralEntries : [];
  const notes = (oralChart?.oralNotes || "").trim();
  if (entries.length === 0 && !notes) return null;

  const dateStr = consultationDate
    ? moment(consultationDate).format("D MMM YYYY")
    : moment().format("D MMM YYYY");
  const baseFontSize = printSettings?.page_format?.font_size || 12;
  const fontFamily = printSettings?.page_format?.font_family || "Roboto";

  const groups = [
    { label: "Past Procedures", kind: "past" },
    { label: "Findings", kind: "finding" },
    { label: "Procedures", kind: "procedure" },
  ];

  const segs = groups
    .map((g) => ({
      ...g,
      list: entries.filter((e) =>
        g.kind === "past" ? e.kind === "past" : g.kind === "procedure" ? e.kind === "procedure" : e.kind !== "past" && e.kind !== "procedure"
      ),
    }))
    .filter((g) => g.list.length > 0);

  return (
    <View style={{ marginTop: PX_TO_PT * 12, marginBottom: PX_TO_PT * 10 }}>
      <Text
        style={{
          color: "#171725",
          fontFamily,
          fontSize: PX_TO_PT * (baseFontSize + 1),
          fontWeight: "700",
          marginBottom: PX_TO_PT * 8,
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: PX_TO_PT * 4,
        }}
      >
        Oral Examination 
        {/* ({dateStr}) */}
      </Text>
      {segs.map((seg) => (
        <Text
          key={seg.label}
          style={{
            fontFamily,
            fontSize: PX_TO_PT * baseFontSize,
            color: "#171725",
            lineHeight: 1.45,
            marginBottom: PX_TO_PT * 5,
          }}
        >
          <Text style={{ fontWeight: "700" }}>{seg.label}: </Text>
          {seg.list.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 ? ", " : ""}
              <Text style={{ fontWeight: "500" }}>{item.name}</Text>
              <Text style={{ color: "#6b7280" }}>{formatEntryMeta(item)}</Text>
              {showDates && item.updatedAt ? (
                <Text style={{ color: "#64748b", fontSize: PX_TO_PT * (baseFontSize - 1) }}>
                  {" "}
                  · {moment(item.updatedAt).format("D MMM YYYY")}
                </Text>
              ) : null}
            </React.Fragment>
          ))}
        </Text>
      ))}
      {notes ? (
        <Text style={{ fontFamily, fontSize: PX_TO_PT * baseFontSize, color: "#171725" }}>
          <Text style={{ fontWeight: "700" }}>Notes: </Text>
          {notes}
        </Text>
      ) : null}
    </View>
  );
}

export default OralInlineView;
