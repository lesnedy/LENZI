import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Banknote, Clock, Users } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Administrator preview",
  description: "A clearly labelled preview of the LENZI administrator dashboard.",
  robots: { index: false, follow: false },
};

const SAMPLE_METRICS = [
  { label: "Active rides", value: "4", hint: "Sample data" },
  { label: "Drivers online", value: "12", hint: "Sample data" },
  { label: "Gross booking value", value: "TZS 486,000", hint: "Sample data" },
  { label: "Drivers pending", value: "3", hint: "Sample data" },
];

const SAMPLE_DRIVERS = [
  { name: "Sample driver A", vehicle: "Bajaji · T 000 AAA", status: "Pending review" },
  { name: "Sample driver B", vehicle: "Boda Boda · T 000 BBB", status: "Pending review" },
  { name: "Sample driver C", vehicle: "Car · T 000 CCC", status: "Approved" },
];

const SAMPLE_RIDES = [
  { route: "Chunya town → Market area", status: "Completed", fare: "TZS —" },
  { route: "Bus stand → Mbalizi junction", status: "In progress", fare: "TZS —" },
  { route: "Chunya town → School area", status: "Searching", fare: "TZS —" },
];

export default function AdminPreviewPage() {
  return (
    <PageShell>
      <div className="py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Demo preview · sample data only
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">
              Administrator dashboard preview
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-graphite-500">
              This page illustrates the operator experience. Every number below is a
              placeholder. It is not connected to production data and cannot perform actions.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-sage-300 bg-white px-5 text-[12px] font-bold text-ink hover:border-leaf"
          >
            <ArrowLeft size={14} />
            Real administrator console
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SAMPLE_METRICS.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-sage-200 bg-white p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-graphite-400">
                {metric.label}
              </p>
              <p className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink">
                {metric.value}
              </p>
              <p className="mt-0.5 text-[10px] text-amber-700">{metric.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
                <Users size={15} className="text-deep" />
                Driver applications
              </h2>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-800">
                Sample
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {SAMPLE_DRIVERS.map((driver) => (
                <li
                  key={driver.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-sage-200 px-3 py-2.5"
                >
                  <div>
                    <p className="text-[12px] font-bold text-ink">{driver.name}</p>
                    <p className="text-[10px] text-graphite-400">{driver.vehicle}</p>
                  </div>
                  <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[9px] font-bold uppercase text-graphite-500">
                    {driver.status}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-1.5 text-[10px] text-graphite-400">
              <BadgeCheck size={12} />
              Approval requires a vehicle plus three core documents.
            </p>
          </section>

          <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
                <Clock size={15} className="text-deep" />
                Recent rides
              </h2>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-800">
                Sample
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {SAMPLE_RIDES.map((ride) => (
                <li
                  key={ride.route}
                  className="flex items-center justify-between gap-3 rounded-xl border border-sage-200 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-ink">{ride.route}</p>
                    <p className="text-[10px] text-graphite-400">{ride.status}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-graphite-500">
                    {ride.fare}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-1.5 text-[10px] text-graphite-400">
              <Banknote size={12} />
              Fares are placeholders. The owner configures real Chunya prices.
            </p>
          </section>
        </div>

        <div className="mt-6 rounded-3xl border border-sage-200 bg-forest-950 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl leading-tight">Ready to configure the real platform?</h2>
              <p className="mt-1 text-[12px] leading-5 text-white/55">
                Sign in with the bootstrapped owner account. The console is owner-guarded by
                Postgres RLS and audited.
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-lime px-5 text-[12px] font-bold text-ink hover:bg-[#c9f78e]"
            >
              Open admin console
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
