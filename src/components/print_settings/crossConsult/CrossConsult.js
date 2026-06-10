import React from "react";
import CrossConsultInlineView from "./inline";
import CrossConsultListView from "./list";
import CrossConsultTableView from "./table";

export const MOCK_CROSS_CONSULT_DATA = [
  {
    doctorName: "Dr. Anil Mehta",
    specialty: "Cardiology",
    referralDate: "4 Jun '26",
    notes: "Patient has a history of heart disease",
  },
];

const normalizeReferralItem = (item) => ({
  doctorName:
    item?.um_name ??
    item?.doctorName ??
    item?.doctor_name ??
    item?.name ??
    item?.title ??
    "",
  specialty:
    item?.department_name ?? item?.specialty ?? item?.speciality ?? "",
  referralDate:
    item?.date_of_referral ??
    item?.referralDate ??
    item?.referral_date ??
    item?.date ??
    "",
  notes:
    item?.reason_for_cross_consult ?? item?.notes ?? item?.note ?? "",
});

export const normalizeCrossConsultData = (data) => {
  if (!data) return [];
  const list = Array.isArray(data) ? data : data?.content ?? data?.referrals ?? [];
  if (!Array.isArray(list)) return [];
  return list.map(normalizeReferralItem).filter((item) => item.doctorName);
};

export const CrossConsult = ({
  option,
  crossConsultData,
  PX_TO_PT,
  styles,
  printSettings,
}) => {
  const normalized = normalizeCrossConsultData(crossConsultData);
  const data =
    normalized.length > 0 ? normalized : MOCK_CROSS_CONSULT_DATA;

  const props = {
    PX_TO_PT,
    styles,
    printSettings,
    crossConsultData: data,
  };

  if (option?.format === "inline") {
    return <CrossConsultInlineView {...props} />;
  }
  if (option?.format === "listview" || option?.format === "list") {
    return <CrossConsultListView {...props} />;
  }
  return <CrossConsultTableView {...props} />;
};
