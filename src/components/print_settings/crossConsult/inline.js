import React from "react";
import { Text, View } from "@react-pdf/renderer";

function CrossConsultInlineView({ PX_TO_PT, printSettings, crossConsultData }) {
  if (!crossConsultData?.um_name) return null;

  const fontFamily = printSettings?.page_format?.font_family;
  const fontSize = PX_TO_PT * (printSettings?.page_format?.font_size || 12);

  const doctor = crossConsultData?.department_name
    ? `${crossConsultData.um_name} (${crossConsultData.department_name})`
    : crossConsultData.um_name;
  const notes = crossConsultData?.reason_for_cross_consult
    ? `, ${crossConsultData.reason_for_cross_consult}`
    : "";
  const line = `${doctor}, ${crossConsultData?.date_of_referral || "-"}${notes}`;

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
