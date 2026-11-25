import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MessageCircle, ShieldAlert } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { SupportForm } from "@/components/support/support-form";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with a LENZI ride, payment or driver account in Chunya. Open a support ticket or read common questions.",
};

const FAQ = [
  {
    question: "How is my fare calculated?",
    answer:
      "The platform calculates the fare from the fare rule configured for your service type and approved operating area. You see the estimate before you confirm. Waiting time after the driver arrives may be added to the final fare.",
  },
  {
    question: "Which payment methods work today?",
    answer:
      "Cash is the supported method in the pilot. Mobile money options appear only after the operator has completed a verified payment provider integration. The app will never pretend a mobile money payment succeeded.",
  },
  {
    question: "Why do I see an illustrative map?",
    answer:
      "The pilot does not yet include a licensed routing and map tile provider. Coordinates are validated by the platform, but the map is a visual aid, not a navigation product. This is stated in the app.",
  },
  {
    question: "How are drivers verified?",
    answer:
      "A driver must submit a national ID, driving licence and vehicle registration. A LENZI administrator reviews the vehicle and documents before approval. Approval can be suspended if standards are not met.",
  },
  {
    question: "What should I do in an emergency?",
    answer:
      "Contact local emergency services first. LENZI support is not an emergency dispatch service. Then open a safety ticket so the ride record can be reviewed.",
  },
];

export default function SupportPage() {
  return (
    <PageShell>
      <div className="py-10 sm:py-14">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-sage-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-graphite-500">
            <MessageCircle size={12} className="text-leaf" />
            LENZI support
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[42px] sm:leading-[1.05]">
            A real person, when you need one.
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-graphite-500">
            Open a ticket for a ride, payment or driver account issue. Support replies appear
            in your notifications. For emergencies, contact local emergency services first.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-sage-200 bg-white p-4">
            <Mail size={18} className="text-deep" />
            <p className="mt-2 text-[12px] font-extrabold text-ink">Email</p>
            <p className="mt-0.5 text-[11px] leading-5 text-graphite-500">
              The operator must configure the support address before launch. The footer address
              is a placeholder.
            </p>
          </div>
          <div className="rounded-2xl border border-sage-200 bg-white p-4">
            <Clock size={18} className="text-deep" />
            <p className="mt-2 text-[12px] font-extrabold text-ink">Response times</p>
            <p className="mt-0.5 text-[11px] leading-5 text-graphite-500">
              Not yet published. Support hours are an operator decision and are not invented here.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ShieldAlert size={18} className="text-amber-700" />
            <p className="mt-2 text-[12px] font-extrabold text-amber-900">Emergency</p>
            <p className="mt-0.5 text-[11px] leading-5 text-amber-800">
              Call local emergency services. LENZI does not operate an emergency dispatch line.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-lg font-extrabold tracking-[-0.02em] text-ink">
              Common questions
            </h2>
            <div className="mt-4 space-y-2">
              {FAQ.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-sage-200 bg-white px-4 py-3"
                >
                  <summary className="cursor-pointer list-none text-[13px] font-bold text-ink marker:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {item.question}
                      <span className="text-graphite-400 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-2 text-[12px] leading-6 text-graphite-500">{item.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-5 text-[11px] leading-5 text-graphite-400">
              Read the{" "}
              <Link href="/legal/terms" className="font-semibold text-deep hover:underline">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="font-semibold text-deep hover:underline">
                privacy notice
              </Link>
              .
            </p>
          </div>

          <SupportForm />
        </div>
      </div>
    </PageShell>
  );
}
