"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { TPSnackbar } from "@/src/components/molecules/Snackbar";
import { RX_CONTEXT_OPTIONS } from "@/src/components/organisms/rxpad/dr-agent/constants";

/**
 * Appointments-page snackbar notifier. Watches URL flags (e.g.
 * `?snackbar=saved-draft&patientId=...`) and surfaces a success snackbar
 * then strips the flag so a page refresh doesn't re-trigger.
 *
 * Specifically handles the "Save as Draft" flow: after the RxPad's
 * split-button dropdown invokes Save as Draft, we navigate here with
 * `?snackbar=saved-draft&patientId=<id>` and this component renders
 *   "<patient name>'s appointment saved as draft"
 * on the shared TPSnackbar (dark pill, green check, top-centered).
 */
function AppointmentSnackbarsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const snackbar = params?.get("snackbar");
  const patientId = params?.get("patientId");

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!snackbar) return;
    const patient = RX_CONTEXT_OPTIONS.find((p) => p.id === patientId);
    const name = patient?.label ?? "This appointment";
    let msg = null;
    if (snackbar === "saved-draft") msg = `${name}'s appointment saved as draft`;else
    if (snackbar === "visit-ended") msg = `${name}'s visit ended successfully`;else
    if (snackbar === "rx-saved") msg = `${name}'s Rx saved`;
    if (!msg) return;
    setMessage(msg);
    setOpen(true);
    // Strip the snackbar flag so a refresh doesn't replay the toast.
    const next = new URLSearchParams(params?.toString() ?? "");
    next.delete("snackbar");
    next.delete("patientId");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname ?? "/tp-appointment-screen");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snackbar, patientId]);

  return (
    <TPSnackbar
      open={open}
      message={message ?? ""}
      severity="success"
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      autoHideDuration={2600}
      onClose={(_, reason) => {
        if (reason === "clickaway") return;
        setOpen(false);
        setMessage(null);
      }} />);


}

export function AppointmentSnackbars() {
  return (
    <Suspense fallback={null}>
      <AppointmentSnackbarsInner />
    </Suspense>);

}