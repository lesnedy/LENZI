"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import { VehicleArt } from "./vehicle-art";

const artTypes = ["boda", "bajaji", "car"] as const;
const backgrounds = [
  "bg-[#f0ece3]",
  "bg-[#e3ede6]",
  "bg-[#e7edf0]",
];

export function VehiclesSection() {
  const { copy } = useLanguage();

  return (
    <section id="vehicles" className="scroll-mt-24 bg-mist py-20 md:py-28">
      <div className="container-lenzi">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_0.55fr] lg:items-end">
          <div>
            <Eyebrow>{copy.vehicles.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-3xl text-balance text-[clamp(2.5rem,4.6vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.055em]">
              {copy.vehicles.title}
            </h2>
          </div>
          <div className="max-w-sm lg:justify-self-end">
            <p className="text-[14px] leading-7 text-graphite-500">
              {copy.vehicles.body}
            </p>
            <Link
              href="/ride"
              className="mt-5 inline-flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-deep transition-colors hover:text-ink"
            >
              {copy.vehicles.cta}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
          {copy.vehicles.items.map((vehicle, index) => (
            <article
              key={vehicle.name}
              className="group overflow-hidden rounded-[28px] border border-sage-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(11,42,29,0.4)]"
            >
              <div
                className={`relative flex h-[220px] items-center justify-center overflow-hidden ${backgrounds[index]}`}
              >
                <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(16,27,23,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,27,23,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
                <span className="absolute left-5 top-5 font-display text-[15px] italic text-ink/30">
                  {vehicle.number}
                </span>
                <span className="absolute right-4 top-4 rounded-full border border-ink/10 bg-white/65 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-graphite-500 backdrop-blur">
                  {vehicle.tag}
                </span>
                <div className="relative h-[155px] w-[270px] transition-transform duration-500 group-hover:scale-[1.04]">
                  <VehicleArt type={artTypes[index] ?? "car"} />
                </div>
              </div>
              <div className="flex items-end justify-between gap-4 p-6 pt-5">
                <div>
                  <h3 className="text-[22px] font-extrabold tracking-[-0.035em]">
                    {vehicle.name}
                  </h3>
                  <p className="mt-2 max-w-[16rem] text-[12px] leading-5 text-graphite-500">
                    {vehicle.detail}
                  </p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sage-200 text-deep transition-all duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-lime">
                  <ArrowUpRight size={17} />
                </span>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-5 flex items-center gap-2 text-[11px] text-graphite-400">
          <span className="h-1 w-1 rounded-full bg-leaf" />
          Vehicle availability, service standards and fares are configured by the
          platform administrator for each operating area.
        </p>
      </div>
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-deep">
      <span className="h-px w-7 bg-leaf" />
      {children}
    </span>
  );
}
