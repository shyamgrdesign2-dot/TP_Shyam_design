import React from 'react';
import moment from 'moment';
import { Button, TPLibraryIcon } from '@dhspl-tatvacare/tesseract-ui';
import './PatientProfileDetails.scss';

const icon = (name, variant = 'bulk') => <TPLibraryIcon name={name} corner="rounded" variant={variant} size={20} color="var(--tesseract-violet-500, #a461d8)" />;

export function patientProfileFields(patient = {}, { isZydus, isExternal, isPaediatric }) {
    const reference = patient.pm_reference_id || patient.tpml_refrence_id;
    const blood = patient.pm_blood_group || patient.patient_blood_group;
    const dob = patient.pm_dob ? moment(patient.pm_dob) : patient.DOB ? moment(patient.DOB, ['Do MMMM YYYY', 'YYYY-MM-DD'], true) : null;
    const fields = [];
    if (!isZydus || reference) fields.push({ key: 'id', label: isZydus ? 'MRN Number' : 'Patient ID', value: (isZydus || isExternal ? reference : patient.pm_pid) || 'Not available', icon: 'personalcard' });
    fields.push({ key: 'mobile', label: 'Mobile Number', value: patient.pm_contact_no || 'Not available', icon: 'call' });
    if (isPaediatric && dob?.isValid()) fields.push({ key: 'dob', label: 'Date of Birth', value: dob.format('DD MMM YYYY'), icon: 'calendar-2' });
    if (blood || isZydus) fields.push({ key: 'blood', label: 'Blood Group', value: blood || 'Not recorded', icon: 'blood', editable: isZydus });
    return fields;
}

export default function PatientProfileDetails({ patient, isZydus, isExternal, isPaediatric, onEditBloodGroup, onEditProfile, onVisitSummary, locationPath }) {
    const fields = patientProfileFields(patient, { isZydus, isExternal, isPaediatric });
    const showEdit = !isExternal && !isZydus;
    const showSummary = !isExternal && locationPath !== '/patient_details';
    return <div className="patient-profile-details">
        <dl className="patient-profile-fields">
            {fields.map(field => <div className="patient-profile-field" key={field.key}>
                <span className="patient-profile-field-icon" aria-hidden="true">{icon(field.icon)}</span>
                <div className="patient-profile-field-text">
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                </div>
                {field.editable && <Button variant="ghost" theme="primary" size="sm" aria-label={field.value === 'Not recorded' ? 'Add blood group' : 'Edit blood group'}
                    icon={<TPLibraryIcon name="edit" corner="rounded" variant="linear" size={16} />} onClick={onEditBloodGroup} />}
            </div>)}
        </dl>
        {(showEdit || showSummary) && <div className="patient-profile-actions">
            {showSummary && <Button variant="outline" theme="primary" size="md" leftIcon={<TPLibraryIcon name="clipboard-text" variant="linear" size={18} />} onClick={onVisitSummary}>View Patient Details</Button>}
            {showEdit && <hr className="patient-profile-action-divider" />}
            {showEdit && <Button variant="link" theme="primary" size="md" leftIcon={<TPLibraryIcon name="edit" corner="rounded" variant="linear" size={18} />} onClick={onEditProfile}>Edit Patient Details</Button>}
        </div>}
    </div>;
}
