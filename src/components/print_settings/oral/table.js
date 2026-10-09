import React from "react";
import { Text, View } from "@react-pdf/renderer";
import moment from "moment";
import { ORAL_POSITION_LABEL } from "../../dental/examination/types";

function OralTableCell({ flex, fontFamily, fontSize, fontWeight = "400", color = "#334155", children }) {
  return (
    <View style={{ flex, paddingRight: 4 }}>
      <Text style={{ fontFamily, fontWeight, fontSize, color, lineHeight: 1.35 }}>
        {children ?? "—"}
      </Text>
    </View>
  );
}

export function OralTableView({ PX_TO_PT, printSettings, oralChart, consultationDate, showDates = false }) {
  const entries = Array.isArray(oralChart?.oralEntries) ? oralChart.oralEntries : [];
  const notes = (oralChart?.oralNotes || "").trim();
  if (entries.length === 0 && !notes) return null;

  const dateStr = consultationDate
    ? moment(consultationDate).format("D MMM YYYY")
    : moment().format("D MMM YYYY");
  const baseFontSize = printSettings?.page_format?.font_size || 12;
  const fontFamily = printSettings?.page_format?.font_family || "Roboto";
  const cellFontSize = PX_TO_PT * (baseFontSize - 1);
  const headerFontSize = PX_TO_PT * (baseFontSize - 2);

  const renderTable = (title, rows) => {
    if (!rows.length) return null;
    return (
      <View style={{ border: "1px solid #e2e8f0", borderRadius: 6, marginBottom: PX_TO_PT * 8 }}>
        <View
          style={{
            backgroundColor: "#f8fafc",
            paddingVertical: PX_TO_PT * 5,
            paddingHorizontal: PX_TO_PT * 10,
            borderBottom: "1px solid #e2e8f0",
          }}
          wrap={false}
        >
          <Text style={{ fontFamily, fontWeight: "700", fontSize: PX_TO_PT * (baseFontSize - 1), color: "#475569" }}>
            {title}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            paddingVertical: PX_TO_PT * 4,
            paddingHorizontal: PX_TO_PT * 10,
            backgroundColor: "#fff",
            borderBottom: "1px solid #f1f5f9",
          }}
          wrap={false}
        >
          {[
            { label: "NAME", flex: 0.32 },
            { label: "AREA", flex: 0.21 },
            { label: "SINCE", flex: 0.21 },
            { label: "NOTES", flex: 0.26 },
          ].map(({ label, flex }) => (
            <OralTableCell
              key={label}
              flex={flex}
              fontFamily={fontFamily}
              fontSize={headerFontSize}
              fontWeight="700"
              color="#94a3b8"
            >
              {label}
            </OralTableCell>
          ))}
        </View>
        {rows.map((item, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              paddingVertical: PX_TO_PT * 5,
              paddingHorizontal: PX_TO_PT * 10,
              borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
              minHeight: PX_TO_PT * 18,
            }}
          >
            <OralTableCell flex={0.32} fontFamily={fontFamily} fontSize={cellFontSize} fontWeight="500">
              {item.name}
              {showDates && item.updatedAt ? ` · ${moment(item.updatedAt).format("D MMM YY")}` : ""}
            </OralTableCell>
            <OralTableCell flex={0.21} fontFamily={fontFamily} fontSize={cellFontSize}>
              {(item.surfaces || []).map((s) => ORAL_POSITION_LABEL[s] || s).join(", ") || "—"}
            </OralTableCell>
            <OralTableCell flex={0.21} fontFamily={fontFamily} fontSize={cellFontSize}>
              {item.since || "—"}
            </OralTableCell>
            <OralTableCell flex={0.26} fontFamily={fontFamily} fontSize={cellFontSize}>
              {item.note || "—"}
            </OralTableCell>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={{ marginTop: PX_TO_PT * 12, marginBottom: PX_TO_PT * 10 }}>
      <Text style={{ fontFamily, fontSize: PX_TO_PT * (baseFontSize + 1), fontWeight: "700", color: "#171725", marginBottom: PX_TO_PT * 8 }}>
        Oral Examination
      </Text>
      {renderTable("PAST PROCEDURES", entries.filter((e) => e.kind === "past"))}
      {renderTable("FINDINGS", entries.filter((e) => e.kind !== "past" && e.kind !== "procedure"))}
      {renderTable("PROCEDURES", entries.filter((e) => e.kind === "procedure"))}
      {notes ? (
        <View style={{ paddingVertical: PX_TO_PT * 6, paddingHorizontal: PX_TO_PT * 10 }}>
          <Text style={{ fontFamily, fontWeight: "600", fontSize: PX_TO_PT * (baseFontSize - 1), color: "#475569" }}>NOTES</Text>
          <Text
            style={{
              fontFamily,
              fontSize: PX_TO_PT * (baseFontSize - 1),
              color: "#334155",
              marginTop: PX_TO_PT * 2,
              lineHeight: 1.35,
            }}
          >
            {notes}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default OralTableView;
