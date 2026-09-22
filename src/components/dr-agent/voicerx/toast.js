import { isPrescriptionToastRoute, showPrescriptionToast } from '../../../common/PrescriptionToasts';

let _handler = null;

export const toast = {
  warning: (msg, options = {}) => {
    if (isPrescriptionToastRoute()) return showPrescriptionToast({ content: msg, type: 'warning', duration: 2.5, ...options });
    if (_handler) {
      _handler({ type: "warning", msg, ...options });
    } else {
      console.warn("[toast]", msg);
    }
  },
  success: (msg, options = {}) => {
    if (isPrescriptionToastRoute()) return showPrescriptionToast({ content: msg, type: 'success', duration: 2.5, ...options });
    if (_handler) {
      _handler({ type: "success", msg, ...options });
    } else {
      console.log("[toast]", msg);
    }
  },
  error: (msg, options = {}) => {
    if (isPrescriptionToastRoute()) return showPrescriptionToast({ content: msg, type: 'error', duration: 2.5, ...options });
    if (_handler) {
      _handler({ type: "error", msg, ...options });
    } else {
      console.error("[toast]", msg);
    }
  },
  setHandler: (fn) => {
    _handler = fn;
  },
};
