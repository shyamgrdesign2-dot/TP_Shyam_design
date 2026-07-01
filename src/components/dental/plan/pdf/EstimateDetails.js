import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { PX_TO_PT, pdfStyles } from "./dentalPlanPdfConstants";
import { formatPdfINR } from "./dentalPlanPdfMappers";

function headerCellStyle(pageFormat, flex, align = "left") {
  return {
    flex,
    fontFamily: pageFormat?.fontFamily || "Roboto",
    fontSize: PX_TO_PT * (pageFormat?.fontSize || 12),
    fontWeight: 500,
    color: "#000",
    backgroundColor: "#F1F1F5",
    textAlign: align,
  };
}

function bodyCellStyle(pageFormat, flex, align = "left", color = "#171725") {
  return {
    flex,
    fontFamily: pageFormat?.fontFamily || "Roboto",
    fontSize: PX_TO_PT * (pageFormat?.fontSize || 12),
    fontWeight: 400,
    color,
    textAlign: align,
  };
}

function descriptionNameStyle(pageFormat) {
  return {
    fontFamily: pageFormat?.fontFamily || "Roboto",
    fontSize: PX_TO_PT * 12,
    fontWeight: 500,
    color: "#171725",
    lineHeight: 1.4,
  };
}

function descriptionMetaStyle(pageFormat) {
  return {
    fontFamily: pageFormat?.fontFamily || "Roboto",
    fontSize: PX_TO_PT * 11,
    fontWeight: 400,
    color: "#6A6A74",
    lineHeight: 1.4,
    marginTop: PX_TO_PT * 5,
  };
}

function SummaryLines({ section, showPlanSubtotalLabel = false }) {
  return (
    <>
      <View style={pdfStyles.summaryRow}>
        <Text style={pdfStyles.summaryLabel}>
          {showPlanSubtotalLabel ? `${section.planName} Subtotal` : "Subtotal"}
        </Text>
        <Text style={pdfStyles.summaryValue}>
          {formatPdfINR(section.subtotal)}
        </Text>
      </View>
      {section.serviceDiscountTotal > 0 && (
        <View style={pdfStyles.summaryRow}>
          <Text style={pdfStyles.summaryLabel}>Service Discount</Text>
          <Text style={pdfStyles.summaryValueDiscount}>
            -{formatPdfINR(section.serviceDiscountTotal)}
          </Text>
        </View>
      )}
      {section.additionalDiscount > 0 && (
        <View style={pdfStyles.summaryRow}>
          <Text style={pdfStyles.summaryLabel}>Additional Discount</Text>
          <Text style={pdfStyles.summaryValueDiscount}>
            -{formatPdfINR(section.additionalDiscount)}
          </Text>
        </View>
      )}
      <View style={pdfStyles.totalRow}>
        <Text style={pdfStyles.totalLabel}>
          {showPlanSubtotalLabel ? `${section.planName} Total` : "Total"}
        </Text>
        <Text style={pdfStyles.totalValue}>{formatPdfINR(section.total)}</Text>
      </View>
    </>
  );
}

function EstimateTable({ rows, pageFormat }) {
  return (
    <View style={pdfStyles.table}>
      <View style={pdfStyles.row}>
        <Text style={[pdfStyles.cell, headerCellStyle(pageFormat, 0.08, "center")]}>
          #
        </Text>
        <Text style={[pdfStyles.cell, headerCellStyle(pageFormat, 0.42)]}>
          Description
        </Text>
        <Text style={[pdfStyles.cell, headerCellStyle(pageFormat, 0.16, "right")]}>
          Rate
        </Text>
        <Text style={[pdfStyles.cell, headerCellStyle(pageFormat, 0.14, "right")]}>
          Disc.
        </Text>
        <Text style={[pdfStyles.cell, headerCellStyle(pageFormat, 0.2, "right")]}>
          Amount
        </Text>
      </View>
      {rows.map((row) => (
        <View
          style={[pdfStyles.row, { alignItems: "flex-start" }]}
          key={row.index}
        >
          <Text
            style={[
              pdfStyles.cell,
              bodyCellStyle(pageFormat, 0.08, "center"),
              { paddingTop: PX_TO_PT * 8 },
            ]}
          >
            {row.index}
          </Text>
          <View
            style={[
              pdfStyles.cell,
              {
                flex: 0.42,
                flexDirection: "column",
                paddingVertical: PX_TO_PT * 8,
              },
            ]}
          >
            <Text style={descriptionNameStyle(pageFormat)}>
              {row.description}
            </Text>
            {row.toothLine ? (
              <Text style={descriptionMetaStyle(pageFormat)}>
                {row.toothLine}
                {row.surfaceLine ? ` · ${row.surfaceLine}` : ""}
              </Text>
            ) : null}
          </View>
          <Text
            style={[
              pdfStyles.cell,
              bodyCellStyle(pageFormat, 0.16, "right"),
              { paddingTop: PX_TO_PT * 8 },
            ]}
          >
            {formatPdfINR(row.rate)}
          </Text>
          <Text
            style={[
              pdfStyles.cell,
              bodyCellStyle(
                pageFormat,
                0.14,
                "right",
                row.hasDiscount ? "#FC5A5A" : "#171725"
              ),
              { paddingTop: PX_TO_PT * 8 },
            ]}
          >
            {row.discountDisplay}
          </Text>
          <Text
            style={[
              pdfStyles.cell,
              bodyCellStyle(pageFormat, 0.2, "right"),
              { paddingTop: PX_TO_PT * 8 },
            ]}
          >
            {formatPdfINR(row.amount)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const EstimateDetails = ({ pageFormat, estimatePayload }) => {
  const { sections = [], grandTotal = 0, showGrandTotalLabel = false } =
    estimatePayload || {};

  return (
    <View style={{ marginTop: PX_TO_PT * 8 }}>
      {sections.map((section, sectionIdx) => (
        <View
          key={section.planId || sectionIdx}
          style={{ marginBottom: PX_TO_PT * 12 }}
        >
          {showGrandTotalLabel && section.planName ? (
            <View style={pdfStyles.planGroupHeader}>
              <Text style={pdfStyles.planGroupTitle}>{section.planName}</Text>
            </View>
          ) : null}
          <EstimateTable rows={section.rows} pageFormat={pageFormat} />
          <View style={{ marginTop: PX_TO_PT * 8 }}>
            <SummaryLines
              section={section}
              showPlanSubtotalLabel={showGrandTotalLabel}
            />
          </View>
        </View>
      ))}
      {showGrandTotalLabel && sections.length > 1 && (
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Grand Total</Text>
          <Text style={pdfStyles.totalValue}>{formatPdfINR(grandTotal)}</Text>
        </View>
      )}
    </View>
  );
};

export default EstimateDetails;
