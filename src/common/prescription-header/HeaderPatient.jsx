import React from 'react';
import { Avatar } from '@dhspl-tatvacare/tesseract-ui';
import { ReactComponent as PatientIcon } from './icons/user.svg';
import { ReactComponent as ExpandIcon } from './icons/arrow-short-down.svg';
import styles from './HeaderPrescription.module.scss';

// The records store can briefly contain the previous patient during navigation.
export function resolveHeaderPatient(patient = {}, details) {
    if (!patient) return {};
    const identityKey = ['patient_unique_id', 'pm_id', 'pm_pid'].find(
        key => patient[key] != null && details?.[key] != null
    );
    return identityKey && String(patient[identityKey]) === String(details[identityKey])
        ? { ...patient, ...details }
        : patient;
}

export const HeaderPatient = React.forwardRef(function HeaderPatient(
    { patient, age, open = false, ...props }, ref
) {
    const photo = typeof patient.pm_image_path === 'string' ? patient.pm_image_path.trim() : '';
    const metadata = [
        patient.pm_gender?.[0]?.toUpperCase(),
        age?.trim(),
        patient.pm_blood_group || patient.patient_blood_group,
    ].filter(Boolean);
    return (
        <button ref={ref} type="button" className={styles.patient}
            aria-expanded={open} aria-label={`Patient details for ${patient.pm_fullname || 'patient'}`} {...props}>
            <Avatar className={styles.patientAvatar} key={photo || 'default'} src={photo || undefined} name={patient.pm_fullname}
                alt={patient.pm_fullname ? `${patient.pm_fullname} profile photo` : 'Patient profile photo'}
                icon={photo ? undefined : <PatientIcon width={28} height={28} aria-hidden="true" />} size={40} />
            <span className={styles.patientText}>
                <span className={styles.patientName}>
                    <span title={patient.pm_fullname}>{patient.pm_fullname}</span>
                    <ExpandIcon className={styles.patientChevron} width={14} height={14} aria-hidden="true" />
                </span>
                <span className={styles.patientMeta}>
                    {metadata.map((part, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && <span className={styles.metaDivider} aria-hidden="true">|</span>}
                            <span>{part}</span>
                        </React.Fragment>
                    ))}
                </span>
            </span>
        </button>
    );
});
