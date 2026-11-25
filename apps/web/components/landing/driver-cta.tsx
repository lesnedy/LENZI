"use client";

import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/providers/language-provider";

export function DriverCtaSection() {
  const { copy } = useLanguage();

  return (
    <section className="overflow-hidden bg-lime text-ink">
      <div className="container-lenzi relative grid gap-10 py-16 md:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
        <div className="absolute -right-20 top-1/2 -z-0 hidden -translate-y-1/2 select-none font-extrabold leading-none tracking-[-0.08em] text-ink/[0.035] xl:block xl:text-[300px]">
          L
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink/45">
            <span className="h-px w-7 bg-ink/30" />
            {copy.driver.eyebrow}
          </span>
          <h2 className="mt-5 max-w-2xl text-balance text-[clamp(2.6rem,5vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.06em]">
            {copy.driver.title}
          </h2>
          <p className="mt-6 max-w-xl text-[14px] leading-7 text-ink/60">
            {copy.driver.body}
          </p>

          <Link
            href="/driver"
            className="group mt-8 inline-flex h-[54px] items-center gap-3 rounded-full bg-ink pl-7 pr-2.5 text-[13px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            {copy.driver.cta}
            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime text-ink transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight size={17} />
            </span>
          </Link>
          <p className="mt-4 text-[10px] text-ink/45">{copy.driver.note}</p>
        </div>

        <div className="relative z-10 rounded-[28px] border border-ink/10 bg-[#d3f5a2]/60 p-6 backdrop-blur-sm sm:p-8">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-ink/40">
            Driver standards
          </p>
          <ul className="mt-5 divide-y divide-ink/10">
            {copy.driver.points.map((point) => (
              <li key={point} className="flex items-center gap-3 py-3.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-lime">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className="text-[12px] font-bold">{point}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-ink/[0.06] px-3.5 py-3 text-[9px] font-semibold leading-4 text-ink/55">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
            Approval requires valid identity, licence and vehicle documents.
          </div>
        </div>
      </div>
    </section>
  );
}
