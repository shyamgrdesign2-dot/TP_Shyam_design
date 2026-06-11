import React from "react";
import { Text, View } from "@react-pdf/renderer";

function CrossConsultListView({ PX_TO_PT, printSettings, crossConsultData }) {
  if (!crossConsultData?.um_name) return null;

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
        }}
      >
        Referred to&nbsp;:
      </Text>
      <Text style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
        <Text style={{ fontFamily, fontSize, fontWeight: 700 }}>
          {crossConsultData.um_name}
        </Text>
        {crossConsultData?.department_name ? (
          <Text style={{ fontFamily, fontSize, fontWeight: 400 }}>
            &nbsp;({crossConsultData.department_name})
          </Text>
        ) : null}
        <Text style={{ fontFamily, fontSize, fontWeight: 400 }}>
          &nbsp;—&nbsp;{crossConsultData?.date_of_referral || "-"}
          {crossConsultData?.reason_for_cross_consult
            ? ` — ${crossConsultData.reason_for_cross_consult}`
            : ""}
        </Text>
      </Text>
    </View>
  );
}

export default CrossConsultListView;
