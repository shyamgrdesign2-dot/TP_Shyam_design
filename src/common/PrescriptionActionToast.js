import { isPrescriptionToastRoute, showPrescriptionToast } from './PrescriptionToasts';

// Notify from completed action handlers, never when a confirmation is merely opened.
export function notifyPrescriptionAction(content, status = 'success') {
    if (isPrescriptionToastRoute()) return showPrescriptionToast({ type: status, content });
}
