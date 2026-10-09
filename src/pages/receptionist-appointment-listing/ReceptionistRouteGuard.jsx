import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isReceptionistSession } from "../../utils/receptionistSession";

/**
 * Gate: receptionist appointment listing is only reachable with a Kea session.
 */
export default function ReceptionistRouteGuard({ children }) {
  const location = useLocation();
  if (!isReceptionistSession(location.search)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
