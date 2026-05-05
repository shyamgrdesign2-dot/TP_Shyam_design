"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { Snackbar as TPSnackbar } from "@/src/components/molecules/Snackbar";

/**
 * Centralised success-snackbar copy for URL-flag-based flash toasts.
 * Pages navigate to each other with `?flash=<key>` and this table
 * resolves the user-facing message. Keeping the map in one place so
 * the copy stays consistent across every trigger point.
 */
const FLASH_MESSAGES = {
  "rx-saved": "Your Rx has been saved",
  "rx-ended": "Your Rx has been successfully ended",
  "visit-ended": "Visit ended successfully",
  "saved-draft": "Appointment saved as draft"
};

function FlashSnackbarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const flash = params?.get("flash");

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!flash) return;
    const msg = FLASH_MESSAGES[flash];
    if (!msg) return;
    setMessage(msg);
    setOpen(true);
    // Strip ?flash so reload doesn't replay.
    const next = new URLSearchParams(params?.toString() ?? "");
    next.delete("flash");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname ?? "/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  return (
    <TPSnackbar
      open={open}
      message={message ?? ""}
      severity="success"
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      autoHideDuration={2400}
      onClose={(_, reason) => {
        if (reason === "clickaway") return;
        setOpen(false);
        setMessage(null);
      }} />);


}

/**
 * FlashSnackbar — drops anywhere in the tree. Reads the `?flash=<key>`
 * URL parameter, shows the matching brand TPSnackbar, then clears the
 * flag so refresh doesn't replay.
 *
 * Use from callers by navigating with `?flash=rx-saved` / `visit-started`
 * / `visit-ended` / `rx-ended`, etc.
 */
export function FlashSnackbar() {
  return (
    <Suspense fallback={null}>
      <FlashSnackbarInner />
    </Suspense>);

}