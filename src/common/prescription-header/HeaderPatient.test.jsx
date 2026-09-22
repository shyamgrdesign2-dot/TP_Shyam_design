import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderPatient, resolveHeaderPatient } from './HeaderPatient';

const patient = {patient_unique_id: 'one', pm_fullname: 'Alex Example', pm_gender: 'Female', pm_blood_group: 'O+'};

test('uses the uploaded image from matching patient details and never another patient', () => {
  expect(resolveHeaderPatient(null, {pm_image_path:'/previous.jpg'})).toEqual({});
  expect(resolveHeaderPatient(patient, {patient_unique_id:'one', pm_image_path:'/uploaded.jpg'}).pm_image_path).toBe('/uploaded.jpg');
  expect(resolveHeaderPatient(patient, {patient_unique_id:'two', pm_image_path:'/someone-else.jpg'}).pm_image_path).toBeUndefined();
  expect(resolveHeaderPatient(patient, {pm_image_path:'/unidentified.jpg'}).pm_image_path).toBeUndefined();
});

test('shows an uploaded image, falls back on image failure, and retries a changed photo', () => {
  const {rerender} = render(<HeaderPatient patient={{...patient,pm_image_path:'/uploaded.jpg'}} age="42y" />);
  const image = screen.getByAltText('Alex Example profile photo');
  expect(image).toHaveAttribute('src','/uploaded.jpg');
  fireEvent.error(image);
  expect(screen.getByText('AE')).toBeInTheDocument();
  rerender(<HeaderPatient patient={{...patient,pm_image_path:'/updated.jpg'}} age="42y" />);
  expect(screen.getByAltText('Alex Example profile photo')).toHaveAttribute('src','/updated.jpg');
});

test('omits missing metadata and renders separators only between available values', () => {
  const {container,rerender} = render(<HeaderPatient patient={patient} age="42y" />);
  expect(container.querySelectorAll('.metaDivider')).toHaveLength(2);
  rerender(<HeaderPatient patient={{pm_fullname:'Alex Example'}} age="42y" />);
  expect(container.querySelectorAll('.metaDivider')).toHaveLength(0);
  expect(screen.getByText('42y')).toBeInTheDocument();
});
