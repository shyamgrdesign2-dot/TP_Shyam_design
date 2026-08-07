import React from "react";
import FullPageLoader from "../vaccination/components/Loader";
import LimsNoAccessPage from "./LimsNoAccessPage";
import { useLimsAccess } from "./useLimsAccess";

export default function LimsAccessBoundary({ children }) {
  const { isLoading, hasAccess } = useLimsAccess();

  if (isLoading) return <FullPageLoader />;
  if (!hasAccess) return <LimsNoAccessPage />;
  return children;
}
