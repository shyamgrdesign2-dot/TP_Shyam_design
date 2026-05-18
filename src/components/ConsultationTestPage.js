import React from "react";
import ConsultationLayout from "./ConsultationLayout";
import ConsultationMainContent from "./ConsultationMainContent";

const ConsultationTestPage = () => {
  // Dummy data to simulate a patient session
  const dummyPatientData = {
    patient_name: "Test Patient",
    patient_age: "30Y",
    patient_gender: "Male",
    patient_unique_id: "12345"
  };

  const dummyState = {
    patient_data: dummyPatientData,
    mode: "ADD"
  };

  return (
    <ConsultationLayout headerProps={{}}>
      <div style={{ padding: "20px" }}>
        <h2>Consultation Content Area</h2>
        <p>This is where the main consultation modules will be rendered.</p>
        <ConsultationMainContent 
          customizedPadRightList={[]}
          allAvailableModules={[]}
          customModuleContents={[]}
          showShimmer={false}
          showSCBanner={false}
          setShowSCBanner={() => {}}
          patientData={dummyPatientData}
        />
      </div>
    </ConsultationLayout>
  );
};

export default ConsultationTestPage;
