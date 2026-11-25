"use client";

import { Check, Navigation } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import { Eyebrow } from "./vehicles-section";

export function ChunyaSection() {
  const { copy } = useLanguage();

  return (
    <section id="chunya" className="scroll-mt-24 overflow-hidden bg-white py-20 md:py-28">
      <div className="container-lenzi grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Eyebrow>{copy.chunya.eyebrow}</Eyebrow>
          <h2 className="mt-5 max-w-xl text-balance text-[clamp(2.5rem,4.6vw,4rem)] font-extrabold leading-[1.01] tracking-[-0.055em]">
            {copy.chunya.title}
          </h2>
          <p className="mt-6 max-w-lg text-[15px] leading-7 text-graphite-500">
            {copy.chunya.body}
          </p>

          <ul className="mt-8 space-y-4">
            {copy.chunya.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf/10 text-deep">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="text-[13px] font-semibold leading-6 text-graphite-700">
                  {bullet}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-2xl border border-sage-200 bg-sage-50 p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-graphite-400">
              {copy.chunya.expansion}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-extrabold text-ink">
              {copy.chunya.places.map((place, index) => (
                <div key={place} className="flex items-center gap-2">
                  {index > 0 && <span className="h-px w-5 bg-sage-300" />}
                  <span
                    className={
                      index === 0
                        ? "inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-lime"
                        : "text-graphite-400"
                    }
                  >
                    {index === 0 && <span className="h-1 w-1 rounded-full bg-lime" />}
                    {place}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 -z-10 rounded-[50px] bg-[radial-gradient(circle_at_70%_30%,rgba(184,237,118,0.15),transparent_60%)]" />
          <div className="overflow-hidden rounded-[32px] border border-forest-800/30 bg-forest-950 shadow-[0_40px_100px_-45px_rgba(7,25,18,0.7)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
              <div>
                <p className="text-[12px] font-extrabold">{copy.chunya.mapTitle}</p>
                <p className="mt-0.5 text-[9px] text-white/35">
                  {copy.chunya.mapSubtitle}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-lime">
                <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-lime" />
                {copy.chunya.tag}
              </span>
            </div>

            <div className="relative h-[410px] sm:h-[460px]">
              <MapPanel />
              <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-forest-950/70 px-3 py-2 backdrop-blur-md">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">
                  Chunya · Mbeya
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-extrabold text-white">
                  <Navigation size={10} className="text-lime" />
                  03.32° S — 33.54° E
                </p>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-forest-950/75 px-4 py-3 backdrop-blur-md">
                <span className="inline-flex items-center gap-2 text-[9px] font-bold text-white/55">
                  <span className="h-2.5 w-2.5 rounded-full border border-lime bg-lime/20" />
                  {copy.chunya.legend}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-white/35">
                  <span className="h-px w-6 bg-white/25" />
                  LENZI map system
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MapPanel() {
  return (
    <svg
      viewBox="0 0 700 540"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="700" height="540" fill="#0B1F16" />
      <g stroke="#B8ED76" strokeOpacity="0.09" fill="none">
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M-30 ${70 + i * 54}C120 ${30 + i * 52} 220 ${125 + i * 42} 350 ${95 + i * 52}C500 ${60 + i * 55} 600 ${120 + i * 44} 740 ${80 + i * 56}`}
          />
        ))}
      </g>
      <g fill="#143326">
        <path d="M58 80h116v84H58z" />
        <path d="M205 55h90v112h-90z" />
        <path d="M340 82h130v72H340z" />
        <path d="M508 48h120v100H508z" />
        <path d="M38 208h88v96H38z" />
        <path d="M160 222h142v72H160z" />
        <path d="M354 200h78v86h-78z" />
        <path d="M472 192h176v88H472z" />
        <path d="M60 352h136v94H60z" />
        <path d="M232 346h100v84H232z" />
        <path d="M378 336h120v82H378z" />
        <path d="M534 330h128v94H534z" />
      </g>
      <g fill="#1C4A34" opacity="0.65">
        <path d="M30 340h20v110H30z" />
        <path d="M600 110h42v62h-42z" />
        <path d="M250 140h36v30h-36z" />
      </g>
      <g stroke="#1E4935" strokeWidth="18" strokeLinecap="round">
        <path d="M-20 183C110 210 200 190 318 166C440 142 510 168 730 205" />
        <path d="M176 -20C190 92 186 220 206 330C224 430 220 490 230 570" />
        <path d="M416 -20C396 110 420 200 446 290C470 380 458 470 478 570" />
        <path d="M-20 438C130 414 250 440 380 464C518 490 610 460 740 438" />
      </g>
      <g stroke="#2B5A42" strokeWidth="3">
        <path d="M-20 183C110 210 200 190 318 166C440 142 510 168 730 205" />
        <path d="M176 -20C190 92 186 220 206 330C224 430 220 490 230 570" />
        <path d="M416 -20C396 110 420 200 446 290C470 380 458 470 478 570" />
        <path d="M-20 438C130 414 250 440 380 464C518 490 610 460 740 438" />
      </g>

      <path
        d="M214 424C258 360 322 340 326 284C330 228 390 212 424 180C458 148 454 120 486 96C520 70 568 82 592 116C614 148 604 196 570 226C536 256 502 262 488 298C474 334 486 368 458 402C430 436 392 448 360 466C344 476 334 464 322 450C300 426 280 446 258 458Z"
        fill="#B8ED76"
        fillOpacity="0.1"
        stroke="#B8ED76"
        strokeWidth="2"
        strokeDasharray="7 7"
        strokeLinejoin="round"
      />

      <path
        d="M150 455C214 424 236 382 302 370C368 358 404 322 430 266C456 210 508 190 576 156"
        fill="none"
        stroke="#13A86B"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M150 455C214 424 236 382 302 370C368 358 404 322 430 266C456 210 508 190 576 156"
        fill="none"
        stroke="#B8ED76"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="1 8"
      />

      <g>
        <circle cx="150" cy="455" r="20" fill="#B8ED76" fillOpacity="0.12" />
        <circle cx="150" cy="455" r="9" fill="#0B1F16" stroke="#B8ED76" strokeWidth="2" />
        <circle cx="150" cy="455" r="3" fill="#B8ED76" />
        <text x="150" y="489" textAnchor="middle" fill="#B8ED76" fontSize="9" fontWeight="800" letterSpacing="1">
          CHUNYA MJINI
        </text>
      </g>
      <g>
        <circle cx="576" cy="156" r="8" fill="#B8ED76" />
        <circle cx="576" cy="156" r="15" fill="none" stroke="#B8ED76" strokeOpacity="0.35" />
        <text x="590" y="153" fill="#E3F2E9" fontSize="8" fontWeight="800">
          SOKO
        </text>
        <text x="590" y="166" fill="#8FA99A" fontSize="7">
          Pickup zone
        </text>
      </g>
      <g>
        <circle cx="430" cy="266" r="4" fill="#B8ED76" />
        <text x="442" y="270" fill="#D5E5DB" fontSize="8" fontWeight="700">
          Mbeya Road
        </text>
      </g>
      <g transform="translate(640 280)">
        <circle r="14" fill="#0B1F16" stroke="#2B5A42" />
        <path d="M0 -6l5 10H-5z" fill="#B8ED76" />
        <text x="-2" y="24" textAnchor="middle" fill="#8FA99A" fontSize="7" fontWeight="800">
          N
        </text>
      </g>
    </svg>
  );
}
