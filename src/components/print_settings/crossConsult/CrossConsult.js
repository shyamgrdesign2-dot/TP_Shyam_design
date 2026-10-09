import React from "react";
import moment from "moment";
import CrossConsultInlineView from "./inline";
import CrossConsultListView from "./list";
import CrossConsultTableView from "./table";

const formatReferralDate = (value) => {
  if (!value) return "";
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format("D MMM 'YY") : String(value);
};

export const CrossConsult = ({
  option,
  crossConsultData,
  PX_TO_PT,
  styles,
  printSettings,
}) => {
  if (!crossConsultData?.um_name) return null;

  const props = {
    PX_TO_PT,
    styles,
    printSettings,
    crossConsultData: {
      ...crossConsultData,
      date_of_referral: formatReferralDate(crossConsultData.date_of_referral),
    },
  };

  if (option?.format === "inline") {
    return <CrossConsultInlineView {...props} />;
  }
  if (option?.format === "listview" || option?.format === "list") {
    return <CrossConsultListView {...props} />;
  }
  return <CrossConsultTableView {...props} />;
};
