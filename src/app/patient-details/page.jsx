import { PatientDetailsPage } from "./PatientDetailsPage";

export const metadata = {
  title: "Patient Details — TatvaPractice",
  description: "Patient visit summary and medical context preview."
};





function pickSingle(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }) {
  const resolved = searchParams ? await searchParams : undefined;

  return (
    <PatientDetailsPage
      patientId={pickSingle(resolved?.patientId)}
      name={pickSingle(resolved?.name)}
      gender={pickSingle(resolved?.gender)}
      age={pickSingle(resolved?.age)}
      from={pickSingle(resolved?.from)} />);


}