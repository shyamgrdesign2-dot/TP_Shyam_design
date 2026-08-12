import React from "react";
import FeatureIntroNoAccessPage from "../featureIntro/FeatureIntroNoAccessPage";

const PharmacyIcon = (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 9h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      stroke="#4b4ad5"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 9l2.5-5h13L21 9M12 13v5M9.5 15.5h5"
      stroke="#4b4ad5"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Placeholder — set `link` / `thumbnail` when video is ready. */
const PHARMACY_VIDEO = {
  link: "",
  thumbnail: "",
};

export default function PharmacyNoAccessPage() {
  return (
    <FeatureIntroNoAccessPage
      feature="pharmacy"
      headerTitle="Pharmacy"
      introTitle="Pharmacy"
      introDescription="Pharmacy module makes it easy to manage purchases, sales, stock, and master data in one place. Track invoices, returns, and analytics in real-time with complete visibility across the purchase-to-sale workflow."
      video={PHARMACY_VIDEO}
      icon={PharmacyIcon}
      trackEventName="TP_Pharmacy_RequestAccess"
    />
  );
}
