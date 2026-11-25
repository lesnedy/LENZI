import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that govern use of the LENZI ride-hailing platform in Chunya, Tanzania.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Terms of service"
      updated="25 November 2026"
      intro="These terms govern the use of the LENZI platform, which connects passengers with independent drivers in Chunya District, Mbeya Region, Tanzania. By creating an account or requesting a ride you agree to these terms."
    >
      <LegalSection title="1. Who we are">
        <p>
          LENZI is a technology platform operated by the LENZI operating company (details to be
          completed by the operator). LENZI is not a transport operator and does not own the
          vehicles. Drivers are independent providers who must be approved by LENZI before
          receiving ride requests.
        </p>
        <p>
          The platform is initially available only within the operating areas configured by the
          operator. A request outside an approved area will be refused.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts">
        <p>
          You must provide accurate information, keep your credentials secure and be old enough
          to enter a binding contract. One person may not maintain duplicate driver accounts.
          LENZI may suspend an account for fraud, abuse, unsafe conduct or a legal requirement.
        </p>
        <p>
          Administrator access is granted only through an out-of-band process. No user can
          become an administrator by changing profile metadata.
        </p>
      </LegalSection>

      <LegalSection title="3. Fares and estimates">
        <p>
          Fares are calculated by the platform from fare rules configured by the operator for a
          service type and operating area. Estimates shown before confirmation are based on
          straight-line distance and a road factor until licensed routing is configured.
          Waiting time after the driver arrives may be added, subject to the configured free
          waiting period.
        </p>
        <p>
          Promotional discounts are applied only when the promotion is valid and the conditions
          are met. The final fare recorded on a completed ride is the authoritative amount.
        </p>
      </LegalSection>

      <LegalSection title="4. Payments">
        <p>
          Cash is supported in the pilot. Mobile money methods are displayed only when the
          operator has completed a verified provider integration. A displayed mobile money
          option does not by itself prove that a payment has succeeded; only the provider
          confirmation recorded by the platform does.
        </p>
      </LegalSection>

      <LegalSection title="5. Cancellations">
        <p>
          A passenger may cancel before the ride starts. A cancellation fee may apply after the
          driver has arrived, as configured by the operator. A driver may cancel before starting
          the ride; repeated cancellations may affect access to the platform. An in-progress ride
          can only be ended through support.
        </p>
      </LegalSection>

      <LegalSection title="6. Driver obligations">
        <p>
          Drivers must hold a valid driving licence, a registered and insured vehicle where
          required, and must keep their documents current. Drivers must follow traffic law, drive
          safely, treat passengers with respect and must not carry more passengers than the
          vehicle permits. Location sharing is used only while the driver is online or on a ride,
          and requires consent.
        </p>
      </LegalSection>

      <LegalSection title="7. Safety and emergencies">
        <p>
          LENZI records ride events for dispute resolution and review. LENZI support is not an
          emergency service. In an emergency, contact local emergency services first, then report
          the incident so the ride record can be reviewed.
        </p>
      </LegalSection>

      <LegalSection title="8. Liability">
        <p>
          To the extent permitted by Tanzanian law, LENZI is not liable for the acts or omissions
          of independent drivers, for delays caused by traffic or weather, or for losses that are
          not a foreseeable result of a breach of these terms. Nothing in these terms excludes
          liability that cannot lawfully be excluded.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes and governing law">
        <p>
          We may update these terms as the service develops. Material changes will be announced
          in the app before they take effect. These terms are governed by the laws of the United
          Republic of Tanzania, and disputes are subject to the jurisdiction of Tanzanian courts.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
