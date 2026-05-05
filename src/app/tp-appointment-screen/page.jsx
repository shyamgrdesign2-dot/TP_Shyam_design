import { Mulish } from "next/font/google";
import { DrAgentPage } from "./DrAgentPage";
import { AppointmentSnackbars } from "./AppointmentSnackbars";

const mulish = Mulish({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata = {
  title: "TP Appointment Screen — TatvaPractice",
  description: "TatvaPractice appointment queue with tabs, filters, and AI-assisted workflow."
};

export default function TPAppointmentPage() {
  return (
    <div className={mulish.variable}>
      <DrAgentPage />
      {/* Renders dark TPSnackbars triggered by URL flags — e.g. the
           "Save as Draft" flow from the RxPad sets
           ?snackbar=saved-draft&patientId=... and this surfaces it. */}
      <AppointmentSnackbars />
    </div>);

}