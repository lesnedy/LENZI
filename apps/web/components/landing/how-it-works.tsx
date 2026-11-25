"use client";

import { useLanguage } from "@/providers/language-provider";
import { Eyebrow } from "./vehicles-section";

export function HowItWorksSection() {
  const { copy } = useLanguage();

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-y border-sage-200 bg-[#eef2ee] py-20 md:py-28"
    >
      <div className="container-lenzi">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>{copy.how.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-balance text-[clamp(2.5rem,4.6vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.055em]">
              {copy.how.title}
            </h2>
          </div>
          <p className="max-w-xs text-[13px] leading-6 text-graphite-500">
            {copy.chunya.body}
          </p>
        </div>

        <div className="mt-14 grid border-t border-ink/15 sm:grid-cols-2 lg:grid-cols-4">
          {copy.how.steps.map((step, index) => (
            <article
              key={step.step}
              className={`group relative border-ink/10 py-8 sm:px-6 lg:px-7 ${
                index !== 0 ? "lg:border-l" : ""
              } ${index === 1 || index === 3 ? "sm:border-l" : ""} ${
                index >= 2 ? "sm:border-t sm:border-ink/10 lg:border-t-0" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[56px] italic leading-none text-ink/15 transition-colors duration-300 group-hover:text-leaf/40">
                  {step.step}
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-full border border-ink/15 text-[9px] font-extrabold text-ink/35">
                  L
                </span>
              </div>
              <h3 className="mt-9 text-[17px] font-extrabold tracking-[-0.025em]">
                {step.title}
              </h3>
              <p className="mt-2.5 max-w-[15rem] text-[12px] leading-5 text-graphite-500">
                {step.body}
              </p>
              <span className="mt-8 block h-px w-full bg-ink/10">
                <span
                  className="block h-px bg-leaf transition-all duration-500 group-hover:w-full"
                  style={{ width: `${((index + 1) / 4) * 100}%` }}
                />
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
