import React from 'react';
import { useSelector } from 'react-redux';
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import { isMobile } from 'react-device-detect';
import { GB_MANYA_DENTAL } from '../utils/constants';

// Lazy load both versions to keep the initial bundle light
const Prescription = React.lazy(() => import('./Prescription'));
const TabPrescription = React.lazy(() => import('./tab_design/TabPrescription'));
const DoctorWorksurface = React.lazy(() => import('./DoctorWorksurface'));

const PrescriptionRouter = ({ isMobile: isMobileProp }) => {
  const isDentalDoctor = useFeatureIsOn(GB_MANYA_DENTAL);

  // Fallback to legacy flow for mobile or non-dental doctors
  if (isMobileProp) {
    return <TabPrescription />;
  }

  if (isDentalDoctor) {
    return <DoctorWorksurface />;
  }

  return <Prescription />;
};

export default PrescriptionRouter;
