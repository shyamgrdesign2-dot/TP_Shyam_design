export const DENTAL_RX_PAD_ROUTE = "/dental-rx-pad";
export const DENTAL_RX_PRINT_VIEW_ROUTE = "/dentalrx-print-view";
export const TAB_RX_PRESCRIPTION_ROUTE = "/tab-rx-prescription";

export const TAB_RX_PRINT_VIEW_ROUTES = [
  TAB_RX_PRESCRIPTION_ROUTE,
  DENTAL_RX_PRINT_VIEW_ROUTE,
];

export function isDentalRxPadPath(pathname) {
  return pathname === DENTAL_RX_PAD_ROUTE;
}

export function isDentalPrintViewPath(pathname) {
  return pathname === DENTAL_RX_PRINT_VIEW_ROUTE;
}

export function isTabRxPrintViewRoute(pathname) {
  return TAB_RX_PRINT_VIEW_ROUTES.includes(pathname);
}
