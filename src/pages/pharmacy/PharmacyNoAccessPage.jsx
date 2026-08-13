import React from "react";
import { TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";
import FeatureIntroNoAccessPage from "../featureIntro/FeatureIntroNoAccessPage";

const PharmacyIcon = (
  <TPLibraryIcon
    name="capsule"
    variant="bulk"
    size={48}
    color="var(--tesseract-blue-500, #4b4ad5)"
  />
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
