import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientProfileDetails, { patientProfileFields } from './PatientProfileDetails';

const patient = { pm_pid: 'PAT123', pm_reference_id: 'MRN456', pm_contact_no: '1234567890', pm_dob: '2002-11-11', pm_blood_group: 'B+' };

test.each([
    [false, false, false], [false, false, true], [false, true, false], [false, true, true],
    [true, false, false], [true, false, true], [true, true, false], [true, true, true],
])('preserves account visibility: Zydus=%s external=%s paediatric=%s', (isZydus, isExternal, isPaediatric) => {
    render(<PatientProfileDetails patient={patient} isZydus={isZydus} isExternal={isExternal} isPaediatric={isPaediatric} />);
    expect(screen.getByText(isZydus || isExternal ? 'MRN456' : 'PAT123')).toBeInTheDocument();
    expect(Boolean(screen.queryByText('Date of Birth'))).toBe(isPaediatric);
    expect(Boolean(screen.queryByRole('button', { name: 'Edit Patient Details' }))).toBe(!isZydus && !isExternal);
    expect(Boolean(screen.queryByRole('button', { name: 'View Patient Details' }))).toBe(!isExternal);
    expect(Boolean(screen.queryByRole('button', { name: 'Edit blood group' }))).toBe(isZydus);
});

test('missing details never invent identifiers, dates, or a blood group', () => {
    const fields = patientProfileFields({ pm_dob: 'not-a-date' }, { isPaediatric: true });
    expect(fields.map(field => field.key)).toEqual(['id', 'mobile']);
    expect(fields.every(field => field.value === 'Not available')).toBe(true);
    const zydus = patientProfileFields({}, { isZydus: true });
    expect(zydus.map(field => field.key)).toEqual(['mobile', 'blood']);
    expect(zydus[1]).toMatchObject({ value: 'Not recorded', editable: true });
});

test('supports alternate reference, blood, and formatted date fields', () => {
    const fields = patientProfileFields({ tpml_refrence_id: 'REF', patient_blood_group: 'O+', DOB: '11th November 2002' }, { isExternal: true, isPaediatric: true });
    expect(fields.map(field => field.value)).toEqual(['REF', 'Not available', '11 Nov 2002', 'O+']);
});

test('routes each CTA independently and omits summary on the summary page', () => {
    const onEditProfile = jest.fn(); const onVisitSummary = jest.fn(); const onEditBloodGroup = jest.fn();
    const { rerender } = render(<PatientProfileDetails patient={patient} onEditProfile={onEditProfile} onVisitSummary={onVisitSummary} />);
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['View Patient Details', 'Edit Patient Details']);
    expect(screen.getByRole('button', { name: 'View Patient Details' })).toHaveAttribute('data-variant', 'outline');
    expect(screen.getByRole('button', { name: 'Edit Patient Details' })).toHaveAttribute('data-variant', 'link');
    expect(screen.getByRole('button', { name: 'View Patient Details' }).compareDocumentPosition(screen.getByRole('separator')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('separator').compareDocumentPosition(screen.getByRole('button', { name: 'Edit Patient Details' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Patient Details' }));
    expect(onEditProfile).toHaveBeenCalledTimes(1);
    expect(onVisitSummary).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'View Patient Details' }));
    expect(onVisitSummary).toHaveBeenCalledTimes(1);
    rerender(<PatientProfileDetails patient={{}} isZydus locationPath="/patient_details" onEditBloodGroup={onEditBloodGroup} />);
    expect(screen.queryByRole('button', { name: 'View Patient Details' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add blood group' }));
    expect(onEditBloodGroup).toHaveBeenCalledTimes(1);
});
