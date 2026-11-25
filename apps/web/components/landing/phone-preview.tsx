"use client";

import {
  ArrowUpRight,
  Bike,
  CarFront,
  CarTaxiFront,
  ChevronDown,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/providers/language-provider";

export function PhonePreview() {
  const { copy, language } = useLanguage();

  return (
    <div className="relative mx-auto w-full max-w-[430px] pb-6 pt-4 lg:pb-0">
      <div className="absolute -left-7 top-9 z-20 hidden animate-rise items-center gap-3 rounded-2xl border border-white/80 bg-white px-4 py-3.5 text-ink shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf/10 text-deep">
          <ShieldCheck size={18} strokeWidth={2.2} />
        </span>
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-graphite-400">
            LENZI
          </span>
          <span className="block text-[12px] font-extrabold">
            {copy.hero.trust[0]}
          </span>
        </span>
      </div>

      <div
        className="relative mx-auto w-[315px] max-w-full origin-center sm:w-[340px] lg:rotate-[-2deg]"
        style={{ animationDelay: "180ms" }}
      >
        <div className="absolute -inset-3 -z-10 rounded-[56px] bg-gradient-to-b from-lime/25 via-leaf/10 to-transparent blur-2xl" />
        <div className="absolute -right-4 top-20 z-20 hidden animate-rise items-center gap-2 rounded-full border border-white/15 bg-forest-900/95 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/75 shadow-float backdrop-blur sm:flex" style={{ animationDelay: "480ms" }}>
          <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-lime" />
          {copy.hero.preview}
        </div>

        <div className="rounded-[48px] border border-white/15 bg-[#1a211d] p-[9px] shadow-[0_50px_100px_-35px_rgba(0,0,0,0.9)]">
          <div className="relative overflow-hidden rounded-[40px] bg-[#e7efe9]">
            <div className="relative h-[666px] overflow-hidden">
              <MapArtwork />

              <div className="absolute inset-x-0 top-0 z-10 px-5 pt-3.5 text-ink">
                <div className="flex items-center justify-between text-[9px] font-extrabold">
                  <span>9:41</span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-3 rounded-[2px] border border-ink/80">
                      <span className="block h-full w-2 rounded-[1px] bg-ink" />
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                    <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                    <span className="text-[8px]">100%</span>
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full bg-white/90 py-1.5 pl-2 pr-3.5 shadow-sm backdrop-blur">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-lime">
                      <MapPin size={12} fill="currentColor" />
                    </span>
                    <span>
                      <span className="block text-[8px] font-bold uppercase tracking-[0.12em] text-graphite-400">
                        {copy.hero.location}
                      </span>
                      <span className="block text-[10px] font-extrabold">
                        Chunya · Mbeya
                      </span>
                    </span>
                    <ChevronDown size={11} className="ml-1 text-graphite-500" />
                  </div>
                  <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-sage-200 text-[10px] font-extrabold text-deep shadow-sm">
                    N
                  </div>
                </div>

                <div className="mt-3 flex h-11 items-center gap-2.5 rounded-2xl border border-white/70 bg-white px-3.5 shadow-[0_12px_30px_-16px_rgba(16,27,23,0.4)]">
                  <Search size={15} className="text-graphite-400" />
                  <span className="text-[11px] font-semibold text-graphite-400">
                    {copy.hero.search}
                  </span>
                </div>
              </div>

              <div className="absolute left-4 top-[194px] z-10 rounded-lg bg-white/75 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.14em] text-graphite-500 backdrop-blur">
                {copy.hero.mapLabel}
              </div>

              <div className="absolute inset-x-0 bottom-0 z-20">
                <div className="rounded-t-[32px] border border-white/80 bg-white px-5 pb-5 pt-3 shadow-[0_-20px_50px_-30px_rgba(16,27,23,0.3)]">
                  <div className="mx-auto h-1 w-9 rounded-full bg-sage-300" />

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-graphite-400">
                        {copy.hero.route}
                      </p>
                      <p className="mt-0.5 text-[15px] font-extrabold tracking-tight text-ink">
                        {copy.hero.choose}
                      </p>
                    </div>
                    <span className="rounded-full bg-sage-100 px-2.5 py-1 text-[9px] font-extrabold text-deep">
                      {copy.hero.eta}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Category icon={<Bike size={17} />} label="Boda" />
                    <Category
                      icon={<CarTaxiFront size={17} />}
                      label="Bajaji"
                      active
                    />
                    <Category icon={<CarFront size={18} />} label="Gari" />
                  </div>

                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-sage-50 px-3 py-2.5">
                    <span className="mt-0.5 grid h-4 w-4 place-items-center rounded-full bg-leaf/15 text-deep">
                      <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                    </span>
                    <span>
                      <span className="block text-[9px] font-extrabold text-ink">
                        {copy.hero.category} · {copy.hero.eta}
                      </span>
                      <span className="block text-[8px] leading-4 text-graphite-500">
                        {copy.hero.estimate}
                      </span>
                    </span>
                    <span className="ml-auto self-center text-[11px] font-extrabold text-ink">
                      TZS
                    </span>
                  </div>

                  <button
                    type="button"
                    className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[11px] font-bold text-white"
                  >
                    {copy.hero.choose}
                    <ArrowUpRight size={14} className="text-lime" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 right-0 z-20 hidden animate-rise items-center gap-2 rounded-2xl border border-white/80 bg-white px-4 py-3 text-ink shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] sm:flex" style={{ animationDelay: "600ms" }}>
        <span className="flex -space-x-1.5">
          {["sw", "en"].map((tag) => (
            <span
              key={tag}
              className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-forest-900 text-[8px] font-extrabold uppercase text-lime"
            >
              {tag}
            </span>
          ))}
        </span>
        <span className="text-[11px] font-bold">
          {language === "sw" ? "Kiswahili & English" : "Kiswahili & English"}
        </span>
      </div>
    </div>
  );
}

function Category({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition ${
        active
          ? "border-ink bg-ink text-white"
          : "border-sage-200 bg-white text-graphite-500"
      }`}
    >
      <span className={active ? "text-lime" : "text-deep"}>{icon}</span>
      <span className="text-[8px] font-extrabold">{label}</span>
    </div>
  );
}

function MapArtwork() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 360 666"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="360" height="666" fill="#E5EEE8" />

      <g fill="#D4E3D9">
        <path d="M8 42h96v62H8z" />
        <path d="M126 30h72v86h-72z" />
        <path d="M222 22h118v72H222z" />
        <path d="M26 132h60v78H26z" />
        <path d="M104 142h88v52h-88z" />
        <path d="M218 122h58v66h-58z" />
        <path d="M296 116h54v98h-54z" />
        <path d="M8 238h88v70H8z" />
        <path d="M118 224h46v88h-46z" />
        <path d="M190 222h72v48h-72z" />
        <path d="M280 242h70v64h-70z" />
        <path d="M38 340h58v55H38z" />
        <path d="M112 346h64v70h-64z" />
        <path d="M208 324h56v48h-56z" />
        <path d="M288 342h62v68h-62z" />
        <path d="M12 448h72v84H12z" />
        <path d="M122 446h100v58H122z" />
        <path d="M254 446h92v60h-92z" />
        <path d="M42 570h72v60H42z" />
        <path d="M150 566h74v70h-74z" />
        <path d="M260 560h90v72h-90z" />
      </g>

      <g fill="#BFD5C5">
        <path d="M4 284h44v66H4z" />
        <path d="M210 170h34v34h-34z" />
        <path d="M296 198h28v26h-28z" />
        <path d="M238 378h36v46h-36z" />
        <path d="M4 398h26v100H4z" />
      </g>

      <g stroke="#F7FAF8" strokeLinecap="round">
        <path d="M-20 112C60 128 90 122 150 102C220 80 280 84 390 120" strokeWidth="22" />
        <path d="M100 -20C110 70 100 150 132 220C166 294 156 360 130 440C108 510 118 590 140 690" strokeWidth="18" />
        <path d="M-10 308C70 290 120 300 200 320C278 340 310 360 380 352" strokeWidth="16" />
        <path d="M240 -20C230 58 248 112 270 170C294 232 292 300 272 370C250 446 262 548 290 690" strokeWidth="14" />
        <path d="M-20 510C70 488 130 500 210 514C290 528 320 546 390 522" strokeWidth="13" />
        <path d="M0 604C80 586 140 602 220 614C300 626 330 620 380 610" strokeWidth="10" />
      </g>

      <g stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.2">
        <path d="M10 100C80 120 130 110 200 94" strokeDasharray="4 7" />
        <path d="M-5 296C70 280 150 292 230 318" strokeDasharray="4 7" />
      </g>

      <g fill="#8AA596" fontSize="6.2" fontWeight="700" letterSpacing="1.1">
        <text x="20" y="92">CHUNYA MJINI</text>
        <text x="146" y="212" transform="rotate(78 146 212)">NJIA YA SOKO</text>
        <text x="262" y="294" transform="rotate(-16 262 294)">MBEYA ROAD</text>
        <text x="26" y="480" transform="rotate(-8 26 480)">SOKO KUU</text>
        <text x="152" y="590" transform="rotate(80 152 590)">CHUNYA — LUPA</text>
      </g>

      <circle cx="54" cy="298" r="10" fill="#DDEBE1" />
      <circle cx="52" cy="296" r="3" fill="#8AA596" />
      <text x="41" y="316" fill="#7B9586" fontSize="6" fontWeight="700">
        Soko
      </text>

      <path
        d="M88 565C126 532 130 493 166 472C214 442 194 400 214 360C232 324 268 310 282 272C296 234 274 204 282 174"
        fill="none"
        stroke="#0A3523"
        strokeOpacity="0.12"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        className="route-line"
        d="M88 565C126 532 130 493 166 472C214 442 194 400 214 360C232 324 268 310 282 272C296 234 274 204 282 174"
        fill="none"
        stroke="#13A86B"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M88 565C126 532 130 493 166 472C214 442 194 400 214 360C232 324 268 310 282 272C296 234 274 204 282 174"
        fill="none"
        stroke="#B8ED76"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />

      <g>
        <circle cx="88" cy="565" r="13" fill="#FFFFFF" />
        <circle cx="88" cy="565" r="8" fill="#101B17" />
        <circle cx="88" cy="565" r="3" fill="#B8ED76" />
      </g>

      <g>
        <circle cx="282" cy="174" r="18" fill="#13A86B" fillOpacity="0.15" className="animate-soft-pulse" />
        <circle cx="282" cy="174" r="11" fill="#101B17" />
        <circle cx="282" cy="174" r="4" fill="#B8ED76" />
      </g>

      <g transform="translate(327 218)">
        <circle r="12" fill="#FFFFFF" fillOpacity="0.9" />
        <path d="M0 -6l4 8h-8z" fill="#101B17" />
        <text x="-2.5" y="18" fontSize="5" fontWeight="800" fill="#68756F">
          N
        </text>
      </g>
    </svg>
  );
}
