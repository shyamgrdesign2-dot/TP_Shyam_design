/**
 * Molecules barrel export.
 *
 * Molecules compose atoms and/or Radix primitives. They never import
 * from organisms, templates, or pages.
 *
 * Grouped by function:
 *   Feedback — Alert, Banner, Snackbar
 *   Overlay  — Dialog, ConfirmDialog, Drawer, DropdownMenu
 *   Data     — Card, Accordion, Tabs, Breadcrumbs, Pagination
 *   Form     — Field, SearchInput, SegmentedControl
 *   Layout   — EmptyState
 */

/* ── Feedback ── */
export { Alert } from "./Alert";
export { Banner } from "./Banner";
export { Snackbar } from "./Snackbar";

/* ── Overlay ── */
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose } from


"./Dialog";
export { ConfirmDialog } from "./ConfirmDialog";
export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription } from


"./Drawer";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal } from

"./DropdownMenu";

/* ── Data display ── */
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter } from

"./Card";
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent } from




"./Accordion";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent } from


"./Tabs";
export { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";
export { Pagination } from "./Pagination";

/* ── Layout ── */
export { EmptyState } from "./EmptyState";

/* ── Data table ── */
export { Table, TableHead, TableBody, TableRow, TableCell } from "./Table";

/* ── Composite / feature ── */
export { DateRangePicker } from "./DateRangePicker";
export { Toaster } from "./Toaster";
/* ── Product molecules ── */
export { FlashSnackbar } from "./FlashSnackbar";
export { AppointmentBanner } from "./AppointmentBanner";

/* ── Extended molecules (from tp-ui absorption) ── */
export { Timeline } from "./Timeline";
export { ClinicalTable } from "./ClinicalTable";
