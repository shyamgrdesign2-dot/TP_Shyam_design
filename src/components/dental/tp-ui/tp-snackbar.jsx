import { forwardRef } from "react";
import MuiSnackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import styles from "./tp-snackbar.module.scss";

const SuccessSnackbarContent = forwardRef(function SuccessSnackbarContent(
  { message, onClose },
  ref
) {
  return (
    <div ref={ref} className={styles.successContent}>
      <div className={styles.inner}>
        <span className={styles.iconWrapper}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M15.9999 29.3334C23.3637 29.3334 29.3333 23.3639 29.3333 16.0001C29.3333 8.63628 23.3637 2.66675 15.9999 2.66675C8.63612 2.66675 2.66659 8.63628 2.66659 16.0001C2.66659 23.3639 8.63612 29.3334 15.9999 29.3334Z"
              stroke="#19BB7A"
              strokeWidth="2.4"
            />
            <path
              d="M11.3333 16.0001L14.5333 19.2001L20.6666 13.0667"
              stroke="#19BB7A"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className={styles.message}>{message}</p>
        {onClose ? (
          <button
            type="button"
            aria-label="Close notification"
            onClick={onClose}
            className={styles.closeBtn}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
});

export function TPSnackbar({ severity = "info", message, onClose, ...props }) {
  const handleAlertClose = (event) => {
    onClose?.(event, "escapeKeyDown");
  };

  const content =
    message == null ? undefined : severity === "success" ? (
      <SuccessSnackbarContent
        message={message}
        onClose={onClose ? handleAlertClose : undefined}
      />
    ) : typeof message === "string" ? (
      <MuiAlert
        severity={severity}
        variant="filled"
        onClose={onClose ? handleAlertClose : undefined}
      >
        {message}
      </MuiAlert>
    ) : (
      <div className={styles.customRoot}>{message}</div>
    );

  return (
    <MuiSnackbar {...props} onClose={onClose}>
      {content}
    </MuiSnackbar>
  );
}
