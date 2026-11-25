import type { ReactNode } from "react";
import { PageShell } from "@/components/site/page-shell";

export function LegalDocument({
  eyebrow,
  title,
  updated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <PageShell>
      <div className="py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-leaf">
            {eyebrow}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[42px] sm:leading-[1.05]">
            {title}
          </h1>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-graphite-400">
            Last updated {updated}
          </p>
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-[12px] leading-6 text-amber-900">
            Launch draft. The operating company details, support address and data protection
            contact must be completed by the operator, and a qualified Tanzanian lawyer should
            review this document before public launch.
          </div>
          <p className="mt-6 text-[14px] leading-7 text-graphite-600">{intro}</p>
          <div className="legal-body mt-8 space-y-8">{children}</div>
        </div>
      </div>
    </PageShell>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-extrabold tracking-[-0.02em] text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-[13px] leading-7 text-graphite-500">{children}</div>
    </section>
  );
}
