import React, { useCallback, useRef, useState } from "react";
import { Drawer, DrawerContent, Button, Toast, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";
import PatientForm from "./PatientForm";
import styles from "./AddPatientDrawer.module.css";

/**
 * Add New Patient as a Tesseract side drawer.
 *
 * The shell is the same DrawerContent every other sidebar in this app uses,
 * so the header is the compact one-line bar with a title and a single CTA
 * rather than the tall Ant/Header combination this screen used to carry.
 * All form state and the save call live in PatientForm; this file owns only
 * the shell, the CTA and the busy state.
 */
export default function AddPatientDrawer({ open, onClose, onSaved, initialName = "", initialContact = "" }) {
  const formRef = useRef(null);
  const [saving, setSaving] = useState(false);
  /* A red border says "something here", not "what". The toast carries the
     sentence while the fields carry the location. */
  const [error, setError] = useState(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await formRef.current?.save();
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DrawerContent
        side="right"
        /* Four-fifths of a wide screen, but the form needs a real minimum:
           three columns of fields plus the avatar start colliding below
           about 1020px, so on smaller viewports the drawer takes a larger
           share rather than squeezing the content. */
        width="min(96vw, max(80vw, 1020px))"
        title="Add New Patient"
        className={styles.drawer}
        action={
          <Button
            variant="solid"
            theme="primary"
            size="md"
            loading={saving}
            leftIcon={<TPLibraryIcon name="check-mark---tick" family="arrow2" size={18} />}
            onClick={handleSave}
          >
            Save Patient
          </Button>
        }
      >
        <div className={styles.body}>
          <PatientForm
            ref={formRef}
            onSaved={onSaved}
            onClose={onClose}
            onInvalid={setError}
            initialName={initialName}
            initialContact={initialContact}
          />
        </div>
        {error && (
          <div className="tpToastHost">
            <Toast
              status="error"
              title={error}
              dismissible
              duration={3000}
              onDismiss={() => setError(null)}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
