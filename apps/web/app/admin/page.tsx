import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/admin-console";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Administrator",
  description: "LENZI platform administration for Chunya.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <PageShell wide>
      <AdminConsole />
    </PageShell>
  );
}
