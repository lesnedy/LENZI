import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SiteHeader } from "@/components/site/header";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to LENZI to book a ride or manage your driver account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <SiteHeader variant="light" />
      <main id="main" className="pt-[76px]">
        <AuthPanel />
      </main>
    </>
  );
}
