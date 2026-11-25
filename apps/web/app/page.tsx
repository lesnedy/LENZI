import type { Metadata } from "next";
import { ChunyaSection } from "@/components/landing/chunya-section";
import { DriverCtaSection } from "@/components/landing/driver-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { PromiseStrip } from "@/components/landing/promise-strip";
import { SafetySection } from "@/components/landing/safety-section";
import { VehiclesSection } from "@/components/landing/vehicles-section";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

export const metadata: Metadata = {
  title: "LENZI — Your Ride. Your Way.",
  description:
    "Boda, bajaji and cars in Chunya, Mbeya. See your fare before you confirm, ride with verified drivers and get support in Kiswahili or English.",
};

export default function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-lime focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-ink"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <PromiseStrip />
        <VehiclesSection />
        <ChunyaSection />
        <HowItWorksSection />
        <SafetySection />
        <DriverCtaSection />
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "LENZI",
            description:
              "Locally operated ride-hailing platform in Chunya, Mbeya, Tanzania.",
            areaServed: {
              "@type": "AdministrativeArea",
              name: "Chunya District, Mbeya Region, Tanzania",
            },
            knowsLanguage: ["sw", "en"],
            currenciesAccepted: "TZS",
          }),
        }}
      />
    </>
  );
}
