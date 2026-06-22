/**
 * Single source of truth for queue / RxPad / patient detail identities.
 * Keys match `patientId` in URLs (apt-* from appointments).
 */

export const APPOINTMENT_PATIENTS = {
  "apt-new": {
    name: "Ria Kapoor",
    genderLabel: "Female",
    genderShort: "F",
    age: 24,
    dob: "14 Jun 2002",
    mobile: "+91-9812000123",
    patientCode: "PAT-NEW-001",
    bloodGroup: "O+",
  },
  "apt-1": {
    name: "Shyam GR",
    genderLabel: "Male",
    genderShort: "M",
    age: 35,
    dob: "08 Mar 1991",
    mobile: "+91-9812734567",
    patientCode: "PAT0061",
    bloodGroup: "B+",
  },
  "apt-2": {
    name: "Sita Menon",
    genderLabel: "Female",
    genderShort: "F",
    age: 30,
    dob: "22 Jan 1996",
    mobile: "+91-9988776655",
    patientCode: "PAT0063",
    bloodGroup: "A+",
  },
  "apt-3": {
    name: "Vikram Singh",
    genderLabel: "Male",
    genderShort: "M",
    age: 42,
    dob: "03 Nov 1983",
    mobile: "+91-9001234567",
    patientCode: "PAT0064",
    bloodGroup: "AB+",
  },
  "apt-4": {
    name: "Nisha Rao",
    genderLabel: "Female",
    genderShort: "F",
    age: 26,
    dob: "19 May 2000",
    mobile: "+91-9876543210",
    patientCode: "PAT0065",
    bloodGroup: "A-",
  },
  "apt-5": {
    name: "Rahul Verma",
    genderLabel: "Male",
    genderShort: "M",
    age: 9,
    dob: "10 Aug 2016",
    mobile: "+91-9123456789",
    patientCode: "PAT0066",
    bloodGroup: "B+",
  },
  "apt-6": {
    name: "Anjali Patel",
    genderLabel: "Female",
    genderShort: "F",
    age: 28,
    dob: "02 Apr 1998",
    mobile: "+91-9988771122",
    patientCode: "PAT0067",
    bloodGroup: "A+",
  },
};

const FALLBACK = APPOINTMENT_PATIENTS["apt-1"];

export function getAppointmentPatient(patientId) {
  if (!patientId) return FALLBACK;
  return APPOINTMENT_PATIENTS[patientId] ?? FALLBACK;
}
