import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { CopilotProvider } from "./CopilotContext";
/* Loaded here, at app start, so the ?veloraMock switch is read before routing
   rewrites the address (see copilotMock). */
import "../chart-search/copilotMock";

const CopilotDock = React.lazy(() => import("./CopilotDock"));

/**
 * Mounts Dr. Copilot once for every authenticated route.
 *
 * It sits inside PrivateRoute rather than in the app shell because the pages
 * that most need Copilot - the consultation RxPad and patient details - render
 * outside the shell. Anything under here can open the panel through
 * useCopilot() without rendering its own copy, and the panel keeps its thread
 * as the doctor moves between pages.
 *
 * Lazy so the module stays out of the initial bundle.
 */
export default function CopilotBoundary() {
  return (
    <CopilotProvider>
      <Outlet />
      <Suspense fallback={null}>
        <CopilotDock />
      </Suspense>
    </CopilotProvider>
  );
}
