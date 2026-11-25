"use client";

import { useLanguage } from "@/providers/language-provider";

export function PromiseStrip() {
  const { copy } = useLanguage();

  return (
    <section className="relative bg-lime text-ink">
      <div className="container-lenzi">
        <div className="grid grid-cols-2 divide-x divide-ink/10 py-1 lg:grid-cols-4">
          {copy.promise.items.map((item, index) => (
            <div
              key={item.label}
              className={`flex flex-col gap-1.5 px-4 py-6 sm:px-6 lg:py-7 ${
                index > 1 ? "border-t border-ink/10 lg:border-t-0" : ""
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-ink/40">
                0{index + 1}
              </span>
              <span className="text-[14px] font-extrabold tracking-tight">
                {item.label}
              </span>
              <span className="text-[11px] leading-5 text-ink/55">
                {item.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
