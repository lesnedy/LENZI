import type { Metadata } from "next";
import { RidePlanner } from "@/components/ride/ride-planner";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Book a ride",
  description:
    "Request a boda, bajaji or car in Chunya. See the platform fare before you confirm and ride with a verified driver.",
};

export default function RidePage() {
  return (
    <PageShell wide>
      <RidePlanner />
    </PageShell>
  );
}
