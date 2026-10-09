import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../main-header-v1/MainHeaderV1";
import MainSidebarV1 from "../main-sidebar-v1/MainSidebarV1";
import { useDeviceType } from "../../utils/deviceDetection";
import { getDecodedToken } from "../../utils/localStorage";
import { isMissionAnalyticsOnlyUser } from "../data-analytics/data/analyticsAccess";

/**
 * Shared layout shell: Header + Sidebar + content outlet.
 *
 * Mounted once as a pathless layout route; every page inside it inherits the
 * shell without importing or rendering it. The sidebar stays mounted across
 * page switches, so scroll position is retained and hooks do not re-init.
 *
 * Mobile dashboards and receptionist views skip the shell entirely.
 */
export default function MainShellV1() {
  const location = useLocation();
  const { isMobile: isMobileDevice, isTablet } = useDeviceType();
  const shouldHideShell =
    (isMobileDevice && !isTablet) ||
    new URLSearchParams(location.search).has("receptionist");

  if (shouldHideShell) {
    return <Outlet />;
  }

  const analyticsOnlyHome = isMissionAnalyticsOnlyUser(
    getDecodedToken()?.result
  );
  const isMissionAnalytics =
    location.pathname === "/mission-analytics" ||
    (analyticsOnlyHome &&
      (location.pathname === "/" || location.pathname === ""));

  return (
    <>
      <Header locationPath={location.pathname} />
      <div
        className={`d-flex${isMissionAnalytics ? " ma-shell-row" : ""}`}
      >
        <MainSidebarV1 />
        <div
          className={`w-100 bg-body ${
            isMissionAnalytics ? "ma-shell-content" : "wrapper"
          }`}
        >
          <Outlet />
        </div>
      </div>
    </>
  );
}
