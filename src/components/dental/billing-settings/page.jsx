import BillingSettingsClient from "./BillingSettingsClient";

export const metadata = {
  title: "Billing settings — TatvaPractice",
  description: "Practice billing and subscription preferences.",
};

export default function BillingSettingsRoute() {
  return <BillingSettingsClient />;
}
