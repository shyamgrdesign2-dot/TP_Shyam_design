import React from "react";
import { Text, View, Svg, Path } from "@react-pdf/renderer";
import moment from "moment";
import {
  DENTAL_GROUP_BY_TOOTH,
  buildDentalGroupsByTooth,
  buildDentalGroupsByType,
  resolveDentalGroupBy,
} from "./dentalPrintHelpers";

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

function InlineByTooth({ teethWithData, PX_TO_PT, printSettings, baseFontSize, fontFamily }) {
  return teethWithData.map((tooth) => (
    <Text
      key={tooth.toothCode}
      style={{
        fontFamily,
        fontSize: PX_TO_PT * baseFontSize,
        color: "#171725",
        lineHeight: 1.45,
        marginBottom: PX_TO_PT * 5,
      }}
    >
      <Text style={{ fontWeight: "700" }}>{tooth.fullName}: </Text>
      {tooth.categories.map((cat, catIdx) => (
        <React.Fragment key={cat.label}>
          {catIdx > 0 && <Text style={{ color: "#3e3e4a" }}>; </Text>}
          <Text style={{ fontWeight: "700" }}>{cat.label}: </Text>
          {cat.items.map((item, itemIdx) => (
            <React.Fragment key={itemIdx}>
              {itemIdx > 0 && <Text style={{ color: "#3e3e4a" }}>, </Text>}
              <Text style={{ fontWeight: "500" }}>{item.name}</Text>
              {item.details ? (
                <Text style={{ color: "#6b7280", fontWeight: "400" }}> {item.details}</Text>
              ) : null}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </Text>
  ));
}

function InlineByType({ typeGroups, PX_TO_PT, printSettings, baseFontSize, fontFamily }) {
  return typeGroups.map((group) => (
    <Text
      key={group.label}
      style={{
        fontFamily,
        fontSize: PX_TO_PT * baseFontSize,
        color: "#171725",
        lineHeight: 1.45,
        marginBottom: PX_TO_PT * 5,
      }}
    >
      <Text style={{ fontWeight: "700" }}>{group.label}: </Text>
      {group.entries.map((entry, entryIdx) => (
        <React.Fragment key={`${group.label}-${entry.toothCode}`}>
          {entryIdx > 0 && <Text style={{ color: "#3e3e4a" }}>; </Text>}
          <Text style={{ fontWeight: "700" }}>{entry.fullName}: </Text>
          {entry.items.map((item, itemIdx) => (
            <React.Fragment key={itemIdx}>
              {itemIdx > 0 && <Text style={{ color: "#3e3e4a" }}>, </Text>}
              <Text style={{ fontWeight: "500" }}>{item.name}</Text>
              {item.details ? (
                <Text style={{ color: "#6b7280", fontWeight: "400" }}> {item.details}</Text>
              ) : null}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </Text>
  ));
}

export function DentalInlineView({
  PX_TO_PT,
  printSettings,
  dentalExaminationData,
  consultationDate,
  showPastHistory = true,
  groupBy = "type",
}) {
  const toothStates = Array.isArray(dentalExaminationData?.tooth_states)
    ? dentalExaminationData.tooth_states
    : [];
  const resolvedGroupBy = resolveDentalGroupBy(groupBy);

  const teethWithData =
    resolvedGroupBy === DENTAL_GROUP_BY_TOOTH
      ? buildDentalGroupsByTooth(toothStates)
      : [];
  const typeGroups =
    resolvedGroupBy !== DENTAL_GROUP_BY_TOOTH
      ? buildDentalGroupsByType(toothStates)
      : [];

  const hasContent =
    resolvedGroupBy === DENTAL_GROUP_BY_TOOTH
      ? teethWithData.length > 0
      : typeGroups.length > 0;

  if (!hasContent) {
    return null;
  }

  const dateStr = consultationDate
    ? moment(consultationDate).format("D MMM YYYY")
    : moment().format("D MMM YYYY");

  const baseFontSize = printSettings?.page_format?.font_size || 12;
  const fontFamily = printSettings?.page_format?.font_family || "Roboto";

  return (
    <View style={{ marginTop: PX_TO_PT * 12, marginBottom: PX_TO_PT * 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: PX_TO_PT * 8,
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: PX_TO_PT * 4,
        }}
      >
        <Text
          style={{
            color: "#171725",
            fontFamily,
            fontSize: PX_TO_PT * (baseFontSize + 1),
            fontWeight: "700",
          }}
        >
          Dental Examination 
          {/* ({dateStr}) */}
        </Text>
      </View>

      <View>
        {resolvedGroupBy === DENTAL_GROUP_BY_TOOTH ? (
          <InlineByTooth
            teethWithData={teethWithData}
            PX_TO_PT={PX_TO_PT}
            printSettings={printSettings}
            baseFontSize={baseFontSize}
            fontFamily={fontFamily}
          />
        ) : (
          <InlineByType
            typeGroups={typeGroups}
            PX_TO_PT={PX_TO_PT}
            printSettings={printSettings}
            baseFontSize={baseFontSize}
            fontFamily={fontFamily}
          />
        )}
      </View>
    </View>
  );
}

export default DentalInlineView;
