import React from "react";
import { Text, View } from "@react-pdf/renderer";

function CrossConsultInlineView({ PX_TO_PT, printSettings, crossConsultData = [] }) {
  const referrals = Array.isArray(crossConsultData) ? crossConsultData : [];
  if (!referrals.length) return null;

  const fontFamily = printSettings?.page_format?.font_family;
  const fontSize = PX_TO_PT * (printSettings?.page_format?.font_size || 12);

  const line = referrals
    .map((item) => {
      const doctor = item?.specialty
        ? `${item?.doctorName || "-"} (${item.specialty})`
        : item?.doctorName || "-";
      const notes = item?.notes ? `, ${item.notes}` : "";
      return `${doctor}, ${item?.referralDate || "-"}${notes}`;
    })
    .join("; ");

  return (
    <View style={{ marginTop: PX_TO_PT * 15, lineHeight: 1.4 }}>
      <Text>
        <Text
          style={{
            fontFamily,
            fontSize,
            fontWeight: 700,
            color: "#171725",
          }}
        >
          Referred to&nbsp;:&nbsp;
        </Text>
        <Text
          style={{
            fontFamily,
            fontSize,
            fontWeight: 400,
            color: "#171725",
          }}
        >
          {line}
        </Text>
      </Text>
    </View>
  );
}

export default CrossConsultInlineView;
