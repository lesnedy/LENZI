"use client";

import { ArrowUpRight, PhoneCall, ShieldCheck, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/providers/language-provider";

export function SafetySection() {
  const { copy } = useLanguage();

  return (
    <section
      id="safety"
      className="relative scroll-mt-24 overflow-hidden bg-forest-950 py-20 text-white md:py-28"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-[620px] w-[620px] translate-x-1/3 -translate-y-1/4 rounded-full bg-[radial-gradient(circle,rgba(19,168,107,0.18),transparent_65%)]" />
      <div className="container-lenzi relative grid gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20">
        <div>
          <span className="inline-flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-lime">
            <span className="h-px w-7 bg-lime" />
            {copy.safety.eyebrow}
          </span>
          <h2 className="mt-5 max-w-lg text-balance text-[clamp(2.7rem,4.8vw,4.2rem)] font-extrabold leading-[1] tracking-[-0.055em]">
            {copy.safety.title.split(" ").slice(0, -2).join(" ")}{" "}
            <span className="font-display font-normal italic text-lime">
              {copy.safety.title.split(" ").slice(-2).join(" ")}
            </span>
          </h2>
          <p className="mt-6 max-w-md text-[14px] leading-7 text-white/45">
            {copy.safety.body}
          </p>

          <div className="mt-10 max-w-sm rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-ink">
                <PhoneCall size={17} />
              </span>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-white/35">
                In-app
              </span>
            </div>
            <p className="mt-4 text-[14px] font-extrabold">Safety toolkit</p>
            <p className="mt-1.5 text-[11px] leading-5 text-white/40">
              Emergency contact · trip sharing · report a concern. Built into
              every active journey.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-lime">
              <UserRoundCheck size={13} />
              Passenger and driver protections
            </div>
          </div>

          <Link
            href="/legal/safety"
            className="mt-7 inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/50 transition-colors hover:text-lime"
          >
            {copy.safety.cta}
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid gap-px overflow-hidden rounded-[28px] border border-white/10 bg-white/10 sm:grid-cols-2">
          {copy.safety.cards.map((card, index) => (
            <article
              key={card.title}
              className="group bg-forest-950 p-6 transition-colors duration-300 hover:bg-forest-900 sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-lime transition-colors group-hover:border-lime/30">
                  {index === 0 ? (
                    <ShieldCheck size={16} />
                  ) : (
                    <span className="text-[10px] font-extrabold">0{index + 1}</span>
                  )}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/20">
                  LENZI Standard
                </span>
              </div>
              <h3 className="mt-8 text-[16px] font-extrabold tracking-[-0.02em]">
                {card.title}
              </h3>
              <p className="mt-2.5 text-[11px] leading-5 text-white/38">
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
