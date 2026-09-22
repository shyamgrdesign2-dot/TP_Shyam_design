import { notifyPrescriptionAction } from './PrescriptionActionToast';
import { isPrescriptionToastRoute, showPrescriptionToast } from './PrescriptionToasts';
jest.mock('./PrescriptionToasts', () => ({ isPrescriptionToastRoute: jest.fn(), showPrescriptionToast: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
test('completed actions produce success toasts on prescription routes', () => {
  isPrescriptionToastRoute.mockReturnValue(true);
  notifyPrescriptionAction('Template saved');
  expect(showPrescriptionToast).toHaveBeenCalledWith({ type: 'success', content: 'Template saved' });
});
test('empty previous-data results remain informational', () => {
  isPrescriptionToastRoute.mockReturnValue(true);
  notifyPrescriptionAction('No previous diagnosis found', 'info');
  expect(showPrescriptionToast).toHaveBeenCalledWith({ type: 'info', content: 'No previous diagnosis found' });
});
test('shared handlers do not introduce notifications outside prescription routes', () => {
  isPrescriptionToastRoute.mockReturnValue(false);
  notifyPrescriptionAction('Template saved');
  expect(showPrescriptionToast).not.toHaveBeenCalled();
});
