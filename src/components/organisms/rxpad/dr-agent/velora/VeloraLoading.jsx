"use client";
import { CopilotIcon } from './CopilotIcon';
import s from './VeloraLoading.module.scss';

export function VeloraLoading({ label }) {
  return <div className={s.loading} aria-busy="true">
    <div className={s.status} role="status" aria-live="polite">
      <CopilotIcon name="document-text" variant="linear" size={20} className={s.spark} aria-hidden="true" />
      <span className={s.carousel}><span key={label}>{label || 'Opening the patient’s chart'}</span></span>
      <span className={s.spinner} aria-hidden="true" />
    </div>
    <div className={s.skeleton} aria-hidden="true"><i /><i /><i /></div>
  </div>;
}
