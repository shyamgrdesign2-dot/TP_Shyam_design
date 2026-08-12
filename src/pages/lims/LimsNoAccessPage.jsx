import React from "react";
import FeatureIntroNoAccessPage from "../featureIntro/FeatureIntroNoAccessPage";

const LimsIcon = (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9.5 2v6.4L4.7 18.2A2 2 0 006.5 21h11a2 2 0 001.8-2.8L14.5 8.4V2"
      stroke="#4b4ad5"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 2h6M7.5 15h9"
      stroke="#4b4ad5"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
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
