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

const BulletItem = ({ text, details, PX_TO_PT, printSettings, level = 1 }) => {
  const baseFontSize = printSettings?.page_format?.font_size || 12;
  const fontSize = PX_TO_PT * (level === 1 ? baseFontSize : level === 2 ? baseFontSize - 1 : baseFontSize - 1.5);
  const indent = level === 1 ? 0 : level === 2 ? 14 : 28;
  const fontWeight = level === 1 ? "700" : level === 2 ? "600" : "500";
  const color = level === 1 ? "#171725" : level === 2 ? "#4b5563" : "#171725";

  return (
    <View style={{ flexDirection: "row", marginLeft: indent, marginBottom: PX_TO_PT * 5 }} wrap>
      <Text
        style={{
          fontFamily: printSettings?.page_format?.font_family || "Roboto",
          fontSize,
          color: level === 1 ? "#171725" : "#94a3b8",
          marginRight: 6,
          fontWeight,
        }}
      >
        •
      </Text>
      <Text
        style={{
          flex: 1,
          fontFamily: printSettings?.page_format?.font_family || "Roboto",
          fontSize,
          color,
          lineHeight: 1.5,
          fontWeight,
        }}
      >
        {text}
        {details ? (
          <Text style={{ color: "#6b7280", fontWeight: "400" }}> {details}</Text>
        ) : null}
      </Text>
    </View>
  );
};

function ListByTooth({ teethWithData, PX_TO_PT, printSettings }) {
  return teethWithData.map((tooth) => (
    <View key={tooth.toothCode} style={{ marginBottom: PX_TO_PT * 8 }}>
      <BulletItem text={tooth.fullName} PX_TO_PT={PX_TO_PT} printSettings={printSettings} level={1} />
      {tooth.categories.map((cat) => (
        <React.Fragment key={cat.label}>
          <BulletItem text={cat.label} PX_TO_PT={PX_TO_PT} printSettings={printSettings} level={2} />
          {cat.items.map((item, idx) => (
            <BulletItem
              key={`${cat.label}-${idx}`}
              text={item.name}
              details={item.details}
              PX_TO_PT={PX_TO_PT}
              printSettings={printSettings}
              level={3}
            />
          ))}
        </React.Fragment>
      ))}
    </View>
  ));
}

function ListByType({ typeGroups, PX_TO_PT, printSettings }) {
  return typeGroups.map((group) => (
    <View key={group.label} style={{ marginBottom: PX_TO_PT * 8 }}>
      <BulletItem text={group.label} PX_TO_PT={PX_TO_PT} printSettings={printSettings} level={1} />
      {group.entries.map((entry) => (
        <React.Fragment key={`${group.label}-${entry.toothCode}`}>
          <BulletItem text={entry.fullName} PX_TO_PT={PX_TO_PT} printSettings={printSettings} level={2} />
          {entry.items.map((item, idx) => (
            <BulletItem
              key={`${entry.toothCode}-${idx}`}
              text={item.name}
              details={item.details}
              PX_TO_PT={PX_TO_PT}
              printSettings={printSettings}
              level={3}
            />
          ))}
        </React.Fragment>
      ))}
    </View>
  ));
}

export function DentalListView({
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

  return (
    <View style={{ marginTop: PX_TO_PT * 12, marginBottom: PX_TO_PT * 10 }} wrap>
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
            fontFamily: printSettings?.page_format?.font_family || "Roboto",
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
          <ListByTooth teethWithData={teethWithData} PX_TO_PT={PX_TO_PT} printSettings={printSettings} />
        ) : (
          <ListByType typeGroups={typeGroups} PX_TO_PT={PX_TO_PT} printSettings={printSettings} />
        )}
      </View>
    </View>
  );
}

export default DentalListView;
