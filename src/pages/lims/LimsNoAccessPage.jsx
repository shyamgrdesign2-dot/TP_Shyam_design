import React from "react";
import { TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";
import FeatureIntroNoAccessPage from "../featureIntro/FeatureIntroNoAccessPage";

const LimsIcon = (
  <TPLibraryIcon
    name="ai-flask"
    variant="bulk"
    size={48}
    color="var(--tesseract-blue-500, #4b4ad5)"
  />
);

/** Placeholder — set `link` / `thumbnail` when video is ready. */
const LIMS_VIDEO = {
  link: "",
  thumbnail: "",
};

export default function LimsNoAccessPage() {
  return (
    <FeatureIntroNoAccessPage
      feature="lims"
      headerTitle="LIMS"
      introTitle="LIMS"
      introDescription="LIMS helps you manage lab orders, results, and reports in one place. Track patient tests end-to-end, print professional reports, and keep your clinic audit-ready across the full lab workflow."
      video={LIMS_VIDEO}
      icon={LimsIcon}
      trackEventName="TP_LIMS_RequestAccess"
    />
  );
}
