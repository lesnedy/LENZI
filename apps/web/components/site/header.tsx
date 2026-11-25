"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/language-provider";

export function SiteHeader({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { copy, language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const light = variant === "light";
  const links = [
    { label: copy.nav.ride, href: "/ride" },
    { label: copy.nav.vehicles, href: "/#vehicles" },
    { label: copy.nav.how, href: "/#how-it-works" },
    { label: copy.nav.drivers, href: "/driver" },
    { label: copy.nav.safety, href: "/#safety" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          light
            ? "border-b border-sage-200/80 bg-mist/90 text-ink backdrop-blur-xl"
            : "text-white",
          scrolled
            ? light
              ? "bg-mist/95 shadow-[0_8px_30px_-24px_rgba(11,42,29,0.5)]"
              : "bg-forest-950/90 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <div className="container-lenzi flex h-[76px] items-center justify-between gap-6">
          <Logo tone={light ? "dark" : "light"} />

          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[13px] font-semibold transition-colors",
                  light
                    ? "text-graphite-500 hover:text-ink"
                    : "text-white/65 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageSwitch
              light={light}
              language={language}
              onChange={setLanguage}
            />
            <Link
              href="/auth/login"
              className={cn(
                "rounded-full px-3 py-2 text-[13px] font-bold transition-colors",
                light
                  ? "text-graphite-700 hover:bg-sage-100"
                  : "text-white/80 hover:text-white",
              )}
            >
              {copy.nav.signIn}
            </Link>
            <Link
              href="/ride"
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition-all active:scale-[0.98]",
                light
                  ? "bg-ink text-white hover:bg-forest-800"
                  : "bg-lime text-ink hover:bg-[#c9f78e]",
              )}
            >
              {copy.nav.book}
              <ArrowUpRight size={15} strokeWidth={2.4} />
            </Link>
          </div>

          <button
            type="button"
            aria-label={open ? copy.nav.close : copy.nav.menu}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full border md:hidden",
              light ? "border-sage-200 text-ink" : "border-white/15 text-white",
            )}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col bg-forest-950 px-5 pb-8 pt-24 text-white md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {links.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-white/10 py-5 text-2xl font-bold tracking-tight"
              >
                <span>{link.label}</span>
                <span className="font-display text-sm italic text-lime/70">
                  0{index + 1}
                </span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-4 pt-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                {copy.footer.language}
              </span>
              <LanguageSwitch
                light={false}
                language={language}
                onChange={setLanguage}
              />
            </div>
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="flex h-13 items-center justify-center rounded-full border border-white/15 text-sm font-bold"
            >
              {copy.nav.signIn}
            </Link>
            <Link
              href="/ride"
              onClick={() => setOpen(false)}
              className="flex h-13 items-center justify-center gap-2 rounded-full bg-lime text-sm font-bold text-ink"
            >
              {copy.nav.book}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function LanguageSwitch({
  language,
  onChange,
  light,
}: {
  language: "sw" | "en";
  onChange: (language: "sw" | "en") => void;
  light: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center rounded-full border p-0.5 text-[11px] font-extrabold tracking-wide",
        light ? "border-sage-300" : "border-white/15",
      )}
      role="group"
      aria-label="Language"
    >
      {(["sw", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={language === item}
          onClick={() => onChange(item)}
          className={cn(
            "rounded-full px-2.5 py-1.5 uppercase transition-all",
            language === item
              ? light
                ? "bg-ink text-white"
                : "bg-white text-ink"
              : light
                ? "text-graphite-500 hover:text-ink"
                : "text-white/50 hover:text-white",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
