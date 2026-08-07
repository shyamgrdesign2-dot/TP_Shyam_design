import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { PX_TO_PT, pdfStyles } from "./dentalPlanPdfConstants";

const PlanRxBody = ({ variant, rxPayload }) => {
  if (!rxPayload) return null;

  if (variant === "rx-visit") {
    const { treatmentLine, visit } = rxPayload;
    return (
      <View style={{ marginTop: PX_TO_PT * 10 }}>
        <Text style={pdfStyles.sectionHeading}>Treatment Details</Text>
        <Text style={pdfStyles.bodyTextBold}>{treatmentLine}</Text>

        <View style={{ marginTop: PX_TO_PT * 16 }}>
          <Text style={pdfStyles.sectionHeading}>Visit Details</Text>
          <Text style={pdfStyles.bodyText}>
            {visit.doctor}, {visit.dateTime}
          </Text>
        </View>

        <View style={{ marginTop: PX_TO_PT * 16 }}>
          <Text style={pdfStyles.sectionHeading}>Clinical Notes</Text>
          <Text style={pdfStyles.bodyText}>{visit.notes}</Text>
        </View>
      </View>
    );
  }

  const { treatmentLine, visits = [] } = rxPayload;
  return (
    <View style={{ marginTop: PX_TO_PT * 10 }}>
      <Text style={pdfStyles.sectionHeading}>Treatment Details</Text>
      <Text style={pdfStyles.bodyTextBold}>{treatmentLine}</Text>

      <View style={{ marginTop: PX_TO_PT * 16 }}>
        <Text style={pdfStyles.sectionHeading}>Visit History</Text>
        {visits.length === 0 ? (
          <Text style={pdfStyles.metaText}>No visits recorded yet.</Text>
        ) : (
          visits.map((visit) => (
            <View key={visit.label} style={pdfStyles.visitCard} wrap={false}>
              <Text style={pdfStyles.bodyTextBold}>{visit.label}</Text>
              <Text style={[pdfStyles.metaText, { marginTop: 4 }]}>
                {visit.doctor}, {visit.dateTime}
              </Text>
              <Text style={[pdfStyles.bodyText, { marginTop: 6 }]}>
                <Text style={{ fontWeight: 700 }}>Clinical Notes: </Text>
                {visit.notes}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

export default PlanRxBody;
