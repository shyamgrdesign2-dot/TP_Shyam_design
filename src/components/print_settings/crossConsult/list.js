import React from "react";
import { Text, View } from "@react-pdf/renderer";

function CrossConsultListView({ PX_TO_PT, printSettings, crossConsultData = [] }) {
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
        }}
      >
        Referred to&nbsp;:
      </Text>
      {referrals.map((item, i) => (
        <Text key={i} style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
          <Text style={{ fontFamily, fontSize, fontWeight: 500 }}>
            &nbsp;{i + 1}.&nbsp;
          </Text>
          <Text style={{ fontFamily, fontSize, fontWeight: 700 }}>
            {item?.doctorName || "-"}
          </Text>
          {item?.specialty ? (
            <Text style={{ fontFamily, fontSize, fontWeight: 400 }}>
              &nbsp;({item.specialty})
            </Text>
          ) : null}
          <Text style={{ fontFamily, fontSize, fontWeight: 400 }}>
            &nbsp;—&nbsp;{item?.referralDate || "-"}
            {item?.notes ? ` — ${item.notes}` : ""}
          </Text>
        </Text>
      ))}
    </View>
  );
}

export default CrossConsultListView;
