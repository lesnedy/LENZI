import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How LENZI collects, uses and protects personal data for passengers and drivers in Chunya, Tanzania.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Privacy notice"
      updated="25 November 2026"
      intro="This notice explains what personal data LENZI collects, why we collect it, how long we keep it and the choices you have. It is written for the Tanzanian Personal Data Protection Act 2022 (PDPA) and the platform's actual behaviour."
    >
      <LegalSection title="1. Data we collect">
        <p>
          <strong className="text-ink">Account data:</strong> name, email address, phone number,
          preferred language, profile photo and account role.
        </p>
        <p>
          <strong className="text-ink">Ride data:</strong> pickup and drop-off coordinates and
          addresses, distance, duration, fare breakdown, payment method, ride status events,
          cancellation reason and ratings.
        </p>
        <p>
          <strong className="text-ink">Driver data:</strong> national ID last four characters,
          driving licence number and expiry, vehicle details, and uploaded identity, licence,
          registration, insurance and roadworthiness documents.
        </p>
        <p>
          <strong className="text-ink">Location data:</strong> a driver&apos;s current position
          while online or on an active ride, and the passenger&apos;s pickup point. Location
          sharing requires the driver&apos;s explicit consent and stops when they go offline.
        </p>
        <p>
          <strong className="text-ink">Technical data:</strong> device tokens for notifications,
          support messages and security audit records.
        </p>
      </LegalSection>

      <LegalSection title="2. Why we use it">
        <p>
          We use personal data to create and secure accounts, calculate and validate fares,
          match passengers with nearby approved drivers, show ride status, process payments and
          earnings, verify drivers, resolve disputes, prevent fraud and meet legal obligations.
        </p>
        <p>
          We do not sell personal data. We do not use driver documents for advertising. We do not
          show a driver&apos;s exact location to anyone other than the passenger on that active
          ride, the driver and authorized administrators.
        </p>
      </LegalSection>

      <LegalSection title="3. Legal basis">
        <p>
          We rely on performance of a contract for ride and account data, consent for driver
          location sharing and optional notifications, and legitimate interests for safety,
          fraud prevention and service improvement, balanced against your rights. Where the PDPA
          requires explicit consent, we ask for it separately.
        </p>
      </LegalSection>

      <LegalSection title="4. Sharing">
        <p>
          A passenger sees the assigned driver&apos;s name, rating, vehicle and phone number
          during an active ride. A driver sees the passenger&apos;s name and phone number during
          an active ride. Administrators can see ride and verification records when performing
          support, safety or compliance work.
        </p>
        <p>
          We use infrastructure providers for hosting, authentication, storage and messaging.
          Payment providers receive only what is needed to process a payment. We disclose data
          to authorities only where required by law.
        </p>
      </LegalSection>

      <LegalSection title="5. Retention">
        <p>
          Account data is kept while the account is active. Ride, payment and audit records are
          kept for as long as needed for dispute resolution, accounting and legal compliance.
          Driver documents are kept while the driver is active and for a reasonable period after
          deactivation to handle disputes and legal obligations. Location history is not retained
          beyond the current position needed to operate matching and active rides.
        </p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          Access is enforced in the database with row-level security, not only in the app.
          Service-role credentials are never shipped to clients. Driver documents are stored in a
          private bucket with owner and administrator access only. Sensitive administrator
          actions are written to an audit log.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          Subject to the PDPA, you may request access to your personal data, correction of
          inaccurate data, deletion where retention is no longer required, restriction of certain
          processing, and withdrawal of consent for location sharing or optional notifications.
          Withdrawing location consent prevents a driver from going online.
        </p>
        <p>
          To exercise a right, open a support ticket. The operator must publish a data protection
          contact before launch; the current support address is a placeholder.
        </p>
      </LegalSection>

      <LegalSection title="8. Children">
        <p>
          The platform is not intended for children. A passenger must be old enough to enter a
          binding contract. A parent or guardian may book for a child only where the service and
          vehicle allow it and the child is accompanied as required by law.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>
          We will announce material changes in the app before they take effect. The date at the
          top of this notice shows the current version.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
