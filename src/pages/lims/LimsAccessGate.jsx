import React from "react";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_LIMS } from "../../utils/constants";
import LimsNoAccessPage from "./LimsNoAccessPage";

export default function LimsAccessGate({ children }) {
  const hasAccess = useFeatureIsOn(GB_LIMS);
  if (!hasAccess) return <LimsNoAccessPage />;
  return children;
}
