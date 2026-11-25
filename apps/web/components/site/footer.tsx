"use client";

import Link from "next/link";
import { ArrowUpRight, Globe2, Mail, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useLanguage } from "@/providers/language-provider";

export function SiteFooter() {
  const { copy } = useLanguage();

  const columns = [
    {
      title: copy.footer.product,
      links: [
        { label: copy.footer.links.ride, href: "/ride" },
        { label: copy.footer.links.drive, href: "/driver" },
        { label: copy.footer.links.admin, href: "/admin" },
      ],
    },
    {
      title: copy.footer.company,
      links: [
        { label: copy.footer.links.about, href: "/#chunya" },
        { label: copy.footer.links.safety, href: "/#safety" },
        { label: copy.footer.links.terms, href: "/legal/terms" },
      ],
    },
    {
      title: copy.footer.support,
      links: [
        { label: copy.footer.links.help, href: "/support" },
        { label: copy.footer.links.privacy, href: "/legal/privacy" },
        { label: copy.footer.links.drive, href: "/driver" },
      ],
    },
  ];

  return (
    <footer className="bg-forest-950 text-white">
      <div className="container-lenzi py-16 md:py-20">
        <div className="grid gap-14 border-b border-white/10 pb-14 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-w-md">
            <Logo tone="light" />
            <p className="mt-6 text-[15px] leading-7 text-white/50">
              {copy.footer.blurb}
            </p>
            <a
              href="mailto:support@lenzi.example"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-lime transition-opacity hover:opacity-75"
            >
              <Mail size={16} />
              support@lenzi.example
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/30">
                  {column.title}
                </h3>
                <ul className="mt-5 space-y-3.5">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.href}`}>
                      <Link
                        href={link.href}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/60 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 pt-8 text-[12px] text-white/35 md:flex-row md:items-center md:justify-between">
          <p>© 2026 LENZI. {copy.footer.rights}</p>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
              {copy.footer.built}
            </span>
            <Link
              href="/support"
              aria-label="LENZI support"
              className="text-white/40 transition-colors hover:text-lime"
            >
              <MessageCircle size={16} />
            </Link>
            <Link
              href="/"
              aria-label="LENZI website"
              className="text-white/40 transition-colors hover:text-lime"
            >
              <Globe2 size={16} />
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-white/40 transition-colors hover:text-lime"
            >
              Admin <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
