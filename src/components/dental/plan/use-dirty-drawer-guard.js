import { useCallback, useState } from "react";

/**
 * useDirtyDrawerGuard — small hook that intercepts a drawer close attempt
 * when the form inside has unsaved edits. Consumers:
 *   const guard = useDirtyDrawerGuard({ isDirty, onClose: () => closeDrawer() });
 *   <TPDrawer onOpenChange={(open) => !open && guard.attemptClose()} />
 *   {guard.confirmOpen && <TPConfirmDialog ... onPrimary={() => setConfirmOpen(false)} onSecondary={guard.confirmDiscard} />}
 *
 * Rendering the confirm dialog is the caller's responsibility — the hook
 * only owns the `confirmOpen` state + the intent helpers.
 */
export function useDirtyDrawerGuard({ isDirty, onClose }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const attemptClose = useCallback(() => {
    if (isDirty) {
      setConfirmOpen(true);
      return;
    }
    onClose?.();
  }, [isDirty, onClose]);
  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    onClose?.();
  }, [onClose]);
  const cancelDiscard = useCallback(() => {
    setConfirmOpen(false);
  }, []);
  return {
    confirmOpen,
    setConfirmOpen,
    attemptClose,
    confirmDiscard,
    cancelDiscard,
  };
}
