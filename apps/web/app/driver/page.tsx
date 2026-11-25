import type { Metadata } from "next";
import { DriverConsole } from "@/components/driver/driver-console";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Drive with LENZI",
  description:
    "Register as a LENZI driver in Chunya. Submit your vehicle and documents, get approved and control when you are online.",
};

export default function DriverPage() {
  return (
    <PageShell wide>
      <DriverConsole />
    </PageShell>
  );
}
