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

function TableSectionHeader({ title, PX_TO_PT, fontFamily, baseFontSize }) {
  return (
    <View
      style={{
        backgroundColor: "#f8fafc",
        paddingVertical: PX_TO_PT * 5,
        paddingHorizontal: PX_TO_PT * 10,
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <Text
        style={{
          fontFamily,
          fontWeight: "700",
          fontSize: PX_TO_PT * (baseFontSize - 1),
          color: "#475569",
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function TableCell({ flex, fontFamily, fontSize, fontWeight = "400", color = "#334155", children }) {
  return (
    <View style={{ flex, paddingRight: 4 }}>
      <Text
        style={{
          fontFamily,
          fontWeight,
          fontSize,
          color,
          lineHeight: 1.35,
        }}
      >
        {children ?? "—"}
      </Text>
    </View>
  );
}

function TableByTooth({
  teethWithData,
  PX_TO_PT,
  fontFamily,
  baseFontSize,
  renderTableSection,
}) {
  return teethWithData.map((tooth) => {
    const historyItems = tooth.categories.find((c) => c.label === "Past Procedures")?.items || [];
    const findingItems = tooth.categories.find((c) => c.label === "Findings")?.items || [];
    const procedureItems = tooth.categories.find((c) => c.label === "Procedures")?.items || [];
    const notesText = tooth.categories.find((c) => c.label === "Notes")?.items?.[0]?.name || "";

    return (
      <View
        key={tooth.toothCode}
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          marginBottom: PX_TO_PT * 10,
        }}
      >
        <View
          style={{
            backgroundColor: "#f1f5f9",
            paddingVertical: PX_TO_PT * 6,
            paddingHorizontal: PX_TO_PT * 10,
            borderBottom: "1px solid #e2e8f0",
          }}
          wrap={false}
        >
          <Text
            style={{
              fontFamily,
              fontWeight: "700",
              fontSize: PX_TO_PT * baseFontSize,
              color: "#171725",
            }}
          >
            {tooth.fullName}
          </Text>
        </View>

        {historyItems.length > 0
          ? renderTableSection("PAST PROCEDURES", historyItems, tooth.toothCode, false)
          : null}
        {findingItems.length > 0
          ? renderTableSection("FINDINGS", findingItems, tooth.toothCode, false)
          : null}
        {procedureItems.length > 0
          ? renderTableSection("PROCEDURES", procedureItems, tooth.toothCode, false)
          : null}

        {notesText ? (
          <View
            style={{
              paddingVertical: PX_TO_PT * 6,
              paddingHorizontal: PX_TO_PT * 10,
              backgroundColor: "#ffffff",
            }}
          >
            <Text
              style={{
                fontFamily,
                fontWeight: "600",
                fontSize: PX_TO_PT * (baseFontSize - 1),
                color: "#475569",
                marginBottom: PX_TO_PT * 2,
              }}
            >
              NOTES
            </Text>
            <Text
              style={{
                fontFamily,
                fontWeight: "400",
                fontSize: PX_TO_PT * (baseFontSize - 1),
                color: "#334155",
                lineHeight: 1.35,
              }}
            >
              {notesText}
            </Text>
          </View>
        ) : null}
      </View>
    );
  });
}

function TableByType({ typeGroups, PX_TO_PT, fontFamily, baseFontSize, renderTableSection }) {
  return (
    <View
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        marginBottom: PX_TO_PT * 10,
      }}
    >
      {typeGroups.map((group, groupIdx) => {
        const rows = group.entries.flatMap((entry) =>
          entry.items.map((item) => ({
            toothName: entry.fullName,
            item,
          }))
        );
        const isLast = groupIdx === typeGroups.length - 1;

        return (
          <View
            key={group.label}
            style={{ borderBottom: isLast ? "none" : "1px solid #e2e8f0" }}
          >
            <TableSectionHeader
              title={group.label.toUpperCase()}
              PX_TO_PT={PX_TO_PT}
              fontFamily={fontFamily}
              baseFontSize={baseFontSize}
            />
            {renderTableSection(group.label, rows, null, true)}
          </View>
        );
      })}
    </View>
  );
}

export function DentalTableView({
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

  const renderTableSection = (title, items, toothCode, includeToothColumn) => {
    if (!items || items.length === 0) return null;

    const normalizedRows = includeToothColumn
      ? items
      : items.map((item) => ({ toothName: null, item }));

    return (
      <View style={{ borderBottom: includeToothColumn ? "none" : "1px solid #e2e8f0" }}>
        {!includeToothColumn ? (
          <TableSectionHeader
            title={title}
            PX_TO_PT={PX_TO_PT}
            fontFamily={fontFamily}
            baseFontSize={baseFontSize}
          />
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            paddingVertical: PX_TO_PT * 4,
            paddingHorizontal: PX_TO_PT * 10,
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
          }}
          wrap={false}
        >
          {includeToothColumn ? (
            <TableCell
              flex={0.35}
              fontFamily={fontFamily}
              fontSize={PX_TO_PT * (baseFontSize - 2)}
              fontWeight="700"
              color="#94a3b8"
            >
              TOOTH
            </TableCell>
          ) : null}
          <TableCell
            flex={includeToothColumn ? 0.2 : 0.35}
            fontFamily={fontFamily}
            fontSize={PX_TO_PT * (baseFontSize - 2)}
            fontWeight="700"
            color="#94a3b8"
          >
            NAME
          </TableCell>
          <TableCell
            flex={includeToothColumn ? 0.15 : 0.25}
            fontFamily={fontFamily}
            fontSize={PX_TO_PT * (baseFontSize - 2)}
            fontWeight="700"
            color="#94a3b8"
          >
            SURFACES
          </TableCell>
          <TableCell
            flex={0.15}
            fontFamily={fontFamily}
            fontSize={PX_TO_PT * (baseFontSize - 2)}
            fontWeight="700"
            color="#94a3b8"
          >
            SINCE
          </TableCell>
          <TableCell
            flex={includeToothColumn ? 0.15 : 0.2}
            fontFamily={fontFamily}
            fontSize={PX_TO_PT * (baseFontSize - 2)}
            fontWeight="700"
            color="#94a3b8"
          >
            NOTES
          </TableCell>
        </View>

        {normalizedRows.map((row, idx) => {
          const item = row.item;
          const isLastRow = idx === normalizedRows.length - 1;
          return (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                paddingVertical: PX_TO_PT * 6,
                paddingHorizontal: PX_TO_PT * 10,
                borderBottom: isLastRow ? "none" : "1px solid #f1f5f9",
                backgroundColor: "#ffffff",
                minHeight: PX_TO_PT * 18,
              }}
            >
              {includeToothColumn ? (
                <TableCell
                  flex={0.35}
                  fontFamily={fontFamily}
                  fontSize={PX_TO_PT * (baseFontSize - 1)}
                  fontWeight="500"
                >
                  {row.toothName || "—"}
                </TableCell>
              ) : null}
              <TableCell
                flex={includeToothColumn ? 0.2 : 0.35}
                fontFamily={fontFamily}
                fontSize={PX_TO_PT * (baseFontSize - 1)}
                fontWeight="500"
              >
                {item.name || item.type || "—"}
              </TableCell>
              <TableCell
                flex={includeToothColumn ? 0.15 : 0.25}
                fontFamily={fontFamily}
                fontSize={PX_TO_PT * (baseFontSize - 1)}
              >
                {item.surfaces}
              </TableCell>
              <TableCell
                flex={0.15}
                fontFamily={fontFamily}
                fontSize={PX_TO_PT * (baseFontSize - 1)}
              >
                {item.since}
              </TableCell>
              <TableCell
                flex={includeToothColumn ? 0.15 : 0.2}
                fontFamily={fontFamily}
                fontSize={PX_TO_PT * (baseFontSize - 1)}
              >
                {item.notes}
              </TableCell>
            </View>
          );
        })}
      </View>
    );
  };

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
          <TableByTooth
            teethWithData={teethWithData}
            PX_TO_PT={PX_TO_PT}
            fontFamily={fontFamily}
            baseFontSize={baseFontSize}
            renderTableSection={renderTableSection}
          />
        ) : (
          <TableByType
            typeGroups={typeGroups}
            PX_TO_PT={PX_TO_PT}
            fontFamily={fontFamily}
            baseFontSize={baseFontSize}
            renderTableSection={renderTableSection}
          />
        )}
      </View>
    </View>
  );
}

export default DentalTableView;
