"use client";

import { ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useLanguage } from "@/providers/language-provider";
import { PhonePreview } from "./phone-preview";

export function Hero() {
  const { copy } = useLanguage();

  return (
    <section className="relative isolate overflow-hidden bg-forest-950 pb-16 pt-[76px] text-white lg:pb-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-[18%] top-[-20%] h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle,rgba(19,168,107,0.24)_0%,rgba(19,168,107,0.05)_42%,transparent_68%)]" />
        <div className="absolute bottom-[-30%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(184,237,118,0.08)_0%,transparent_65%)]" />
        <div className="hero-noise absolute inset-0 opacity-[0.045] mix-blend-soft-light" />
        <svg
          aria-hidden="true"
          className="absolute right-0 top-20 h-[780px] w-[820px] opacity-[0.12]"
          viewBox="0 0 820 780"
          fill="none"
        >
          {[
            "M-40 148C126 74 182 244 330 208C478 172 506 54 690 76C790 88 845 142 900 210",
            "M-20 228C134 160 214 306 354 276C494 246 536 132 700 156C796 170 850 218 910 286",
            "M0 302C144 246 250 364 382 344C514 324 574 218 716 242C800 256 852 300 910 360",
            "M20 380C166 330 260 430 412 410C564 390 610 306 750 324C818 333 872 376 918 424",
            "M40 462C196 420 288 498 440 478C592 458 638 382 774 402C830 410 878 442 922 478",
            "M70 544C220 506 322 572 470 548C618 524 672 466 798 486C850 494 890 520 930 548",
            "M100 626C250 596 352 650 500 626C648 602 706 552 824 570C866 576 900 596 934 618",
          ].map((path, index) => (
            <path
              key={path}
              d={path}
              stroke="#B8ED76"
              strokeOpacity={0.3 + index * 0.025}
              strokeWidth="1.2"
            />
          ))}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-forest-950 to-transparent" />
      </div>

      <div className="container-lenzi relative grid items-center gap-16 pb-6 pt-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8 lg:pb-10 lg:pt-20 xl:gap-16">
        <div className="relative z-10 max-w-2xl">
          <div className="animate-rise inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/65 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime" />
            </span>
            {copy.hero.eyebrow}
          </div>

          <h1
            className="animate-rise mt-8 text-balance text-[clamp(3.05rem,7.4vw,5.65rem)] font-extrabold leading-[0.92] tracking-[-0.06em]"
            style={{ animationDelay: "80ms" }}
          >
            {copy.hero.titleA}
            <br />
            <span className="text-white/92">{copy.hero.titleB.split(" ").slice(0, -1).join(" ")} </span>
            <span className="font-display font-normal italic tracking-[-0.035em] text-lime">
              {copy.hero.titleB.split(" ").at(-1)}
            </span>
          </h1>

          <p
            className="animate-rise mt-7 max-w-[35rem] text-pretty text-[17px] leading-8 text-white/55 sm:text-[18px]"
            style={{ animationDelay: "150ms" }}
          >
            {copy.hero.body}
          </p>

          <div
            className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "220ms" }}
          >
            <ButtonLink
              href="/ride"
              size="lg"
              variant="lime"
              className="group h-[54px] pl-7 pr-6 text-[14px] text-ink"
            >
              {copy.hero.primary}
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink/10 transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowUpRight size={17} strokeWidth={2.4} />
              </span>
            </ButtonLink>
            <ButtonLink
              href="/driver"
              size="lg"
              variant="ghost"
              className="h-[54px] border border-white/15 pl-7 pr-7 text-white/80 hover:bg-white/[0.06] hover:text-white"
            >
              {copy.hero.secondary}
            </ButtonLink>
          </div>

          <p
            className="animate-rise mt-6 flex items-center gap-2 text-[12px] text-white/38"
            style={{ animationDelay: "280ms" }}
          >
            <ShieldCheck size={14} className="text-lime/70" />
            {copy.hero.note}
          </p>

          <div
            className="animate-rise mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6"
            style={{ animationDelay: "330ms" }}
          >
            {copy.hero.trust.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 text-[12px] font-semibold text-white/45"
              >
                <span className="h-1 w-1 rounded-full bg-leaf" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex justify-center lg:justify-end">
          <div className="absolute left-1/2 top-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05] sm:h-[640px] sm:w-[640px]" />
          <div className="absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06] sm:h-[500px] sm:w-[500px]" />
          <PhonePreview />
        </div>
      </div>

      <div className="container-lenzi relative mt-4 hidden items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 lg:flex">
        <span className="inline-flex items-center gap-2">
          <MapPin size={12} /> Chunya · Mbeya · Tanzania
        </span>
        <span>03.32° S / 33.54° E</span>
      </div>
    </section>
  );
}
