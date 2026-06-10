import React from "react";
import { Text, View } from "@react-pdf/renderer";

const formatNotes = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "—";
  }
  return String(value);
};

function CrossConsultTableView({
  PX_TO_PT,
  styles,
  printSettings,
  crossConsultData = [],
}) {
  const referrals = Array.isArray(crossConsultData) ? crossConsultData : [];
  if (!referrals.length) return null;

  const fontFamily = printSettings?.page_format?.font_family;
  const fontSize = PX_TO_PT * (printSettings?.page_format?.font_size || 12);

  return (
    <View style={{ marginTop: PX_TO_PT * 15 }}>
      <Text
        style={{
          color: "#171725",
          fontFamily,
          fontSize,
          fontWeight: 700,
          marginBottom: PX_TO_PT * 6,
        }}
      >
        Referred to&nbsp;:
      </Text>
      <View style={styles.table}>
        <View style={styles.headerRow} fixed>
          {["Doctor", "Referral Date", "Notes"].map((header) => (
            <Text
              key={header}
              style={[
                styles.headerCell,
                {
                  fontFamily,
                  fontSize,
                  fontWeight: 500,
                  color: "#000",
                },
              ]}
            >
              {header}
            </Text>
          ))}
        </View>
        {referrals.map((item, i) => (
          <View style={styles.row} key={i} wrap={false}>
            <View style={[styles.cell, { flexDirection: "column" }]}>
              <Text
                style={{
                  fontFamily,
                  fontSize,
                  fontWeight: 700,
                  color: "#171725",
                }}
              >
                {item?.doctorName || "-"}
              </Text>
              {item?.specialty ? (
                <Text
                  style={{
                    fontFamily,
                    fontSize,
                    fontWeight: 400,
                    color: "#8B8B9A",
                    marginTop: 2,
                  }}
                >
                  {item.specialty}
                </Text>
              ) : null}
            </View>
            <Text
              style={[
                styles.cell,
                {
                  fontFamily,
                  fontSize,
                  fontWeight: 400,
                  color: "#171725",
                },
              ]}
            >
              {item?.referralDate || "-"}
            </Text>
            <Text
              style={[
                styles.cell,
                {
                  fontFamily,
                  fontSize,
                  fontWeight: 400,
                  color: "#171725",
                },
              ]}
            >
              {formatNotes(item?.notes)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default CrossConsultTableView;
