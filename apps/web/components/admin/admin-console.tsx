"use client";

import { formatTzs } from "@lenzi/shared";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Banknote,
  BarChart3,
  Check,
  CircleAlert,
  ClipboardList,
  Loader2,
  LogOut,
  MapPin,
  Percent,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Language = "sw" | "en";
type Tab = "overview" | "drivers" | "pricing" | "rides" | "finance" | "support";

interface Metrics {
  totalPassengers: number;
  totalDrivers: number;
  pendingDrivers: number;
  approvedDrivers: number;
  onlineDrivers: number;
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  grossBookingValue: number;
  platformRevenue: number;
  driverEarnings: number;
  pendingPayouts: number;
}

interface RevenueDay {
  day: string;
  completed_rides: number;
  gross: number;
  commission: number;
}

interface DriverRow {
  user_id: string;
  approval_status: string;
  availability: string;
  rating: number | null;
  total_trips: number;
  created_at: string;
  profile?: { full_name: string | null; phone: string | null; email: string | null };
}

interface RideRow {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_fare: number;
  final_fare: number | null;
  payment_method: string;
  requested_at: string;
  passenger_id: string;
  driver_id: string | null;
}

interface PayoutRow {
  id: string;
  driver_id: string;
  amount: number;
  status: string;
  method: string;
  requested_at: string;
}

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

interface AuditRow {
  id: number;
  action: string;
  entity_type: string;
  created_at: string;
}

interface ServiceRow {
  id: string;
  code: string;
  name_sw: string;
  name_en: string;
}

interface AreaRow {
  id: string;
  name: string;
}

const STATUS_TONE: Record<string, string> = {
  completed: "bg-leaf/15 text-deep",
  cancelled: "bg-red-50 text-red-600",
  in_progress: "bg-ink text-lime",
  searching: "bg-amber-50 text-amber-700",
  accepted: "bg-sage-100 text-graphite-600",
  driver_arriving: "bg-sage-100 text-graphite-600",
  driver_arrived: "bg-sage-100 text-graphite-600",
  no_driver_found: "bg-sage-100 text-graphite-500",
  disputed: "bg-red-50 text-red-600",
  approved: "bg-leaf/15 text-deep",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-600",
  suspended: "bg-red-50 text-red-600",
  draft: "bg-sage-100 text-graphite-500",
  requested: "bg-amber-50 text-amber-700",
  processing: "bg-sage-100 text-graphite-600",
  paid: "bg-leaf/15 text-deep",
  failed: "bg-red-50 text-red-600",
  open: "bg-amber-50 text-amber-700",
  in_review: "bg-sage-100 text-graphite-600",
};

export function AdminConsole() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [language, setLanguage] = useState<Language>("sw");
  const [state, setState] = useState<"loading" | "signed_out" | "forbidden" | "ready">("loading");
  const [tab, setTab] = useState<Tab>("overview");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [series, setSeries] = useState<RevenueDay[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [rides, setRides] = useState<RideRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const t = language === "sw" ? SW : EN;

  const loadAll = useCallback(async () => {
    if (!supabase) {
      setState("signed_out");
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setState("signed_out");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== "platform_owner" || profile.status !== "active") {
        setState("forbidden");
        return;
      }

      setState("ready");

      const [
        { data: metricsData },
        { data: seriesData },
        { data: driverData },
        { data: rideData },
        { data: payoutData },
        { data: ticketData },
        { data: auditData },
        { data: serviceData },
        { data: areaData },
      ] = await Promise.all([
        supabase.rpc("admin_dashboard_metrics"),
        supabase.rpc("admin_revenue_series", { p_days: 14 }),
        supabase
          .from("driver_profiles")
          .select("user_id, approval_status, availability, rating, total_trips, created_at")
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("rides")
          .select(
            "id, status, pickup_address, dropoff_address, estimated_fare, final_fare, payment_method, requested_at, passenger_id, driver_id",
          )
          .order("requested_at", { ascending: false })
          .limit(20),
        supabase
          .from("payouts")
          .select("id, driver_id, amount, status, method, requested_at")
          .order("requested_at", { ascending: false })
          .limit(15),
        supabase
          .from("support_tickets")
          .select("id, subject, status, priority, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("admin_audit_logs")
          .select("id, action, entity_type, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase.from("service_types").select("id, code, name_sw, name_en").order("sort_order"),
        supabase.from("operating_areas").select("id, name").eq("active", true).order("name"),
      ]);

      if (metricsData) setMetrics(metricsData as Metrics);
      setSeries((seriesData as RevenueDay[] | null) ?? []);
      setRides((rideData as RideRow[] | null) ?? []);
      setPayouts((payoutData as PayoutRow[] | null) ?? []);
      setTickets((ticketData as TicketRow[] | null) ?? []);
      setAudit((auditData as AuditRow[] | null) ?? []);
      setServices((serviceData as ServiceRow[] | null) ?? []);
      setAreas((areaData as AreaRow[] | null) ?? []);

      const rows = (driverData as DriverRow[] | null) ?? [];
      if (rows.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, phone, email")
          .in("id", rows.map((row) => row.user_id));
        const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
        setDrivers(
          rows.map((row) => {
            const profile = byId.get(row.user_id);
            return {
              ...row,
              profile: profile
                ? { full_name: profile.full_name, phone: profile.phone, email: profile.email }
                : undefined,
            };
          }),
        );
      } else {
        setDrivers([]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => void loadAll(), 0);
    return () => clearTimeout(timer);
  }, [loadAll]);

  async function reviewDriver(userId: string, action: string, reason: string) {
    if (!supabase) return;
    setBusy(`${userId}:${action}`);
    setError(null);
    setMessage(null);
    try {
      const { error: rpcError } = await supabase.rpc("admin_review_driver", {
        p_driver_id: userId,
        p_action: action,
        p_reason: reason || null,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      setMessage(`${t.driverUpdated}: ${action}`);
      await loadAll();
    } finally {
      setBusy(null);
    }
  }

  async function reviewPayout(id: string, action: string) {
    if (!supabase) return;
    setBusy(id);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("admin_review_payout", {
        p_payout_id: id,
        p_action: action,
        p_reference: null,
        p_notes: null,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      setMessage(`${t.payoutUpdated}: ${action}`);
      await loadAll();
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setState("signed_out");
  }

  if (state === "loading") {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="animate-spin text-leaf" />
      </div>
    );
  }

  if (state === "signed_out" || state === "forbidden") {
    return (
      <div className="container-lenzi flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-3xl border border-sage-200 bg-white p-8 text-center shadow-soft">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sage-100 text-graphite-500">
            <ShieldCheck size={26} />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.02em] text-ink">
            {state === "forbidden" ? t.forbiddenTitle : t.signInTitle}
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-graphite-500">
            {state === "forbidden" ? t.forbiddenBody : t.signInBody}
          </p>
          {state === "signed_out" ? (
            <Link
              href="/auth/login?next=/admin"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-ink text-sm font-bold text-white hover:bg-forest-800"
            >
              {t.signIn}
            </Link>
          ) : (
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/ride"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink text-sm font-bold text-white"
              >
                {t.backToRide}
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex h-12 items-center justify-center rounded-full border border-sage-300 text-sm font-bold text-graphite-600"
              >
                {t.signOut}
              </button>
            </div>
          )}
          <p className="mt-5 text-[11px] leading-5 text-graphite-400">{t.ownerNote}</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: t.tabOverview, icon: <BarChart3 size={14} /> },
    { id: "drivers", label: t.tabDrivers, icon: <Users size={14} /> },
    { id: "pricing", label: t.tabPricing, icon: <Percent size={14} /> },
    { id: "rides", label: t.tabRides, icon: <MapPin size={14} /> },
    { id: "finance", label: t.tabFinance, icon: <Wallet size={14} /> },
    { id: "support", label: t.tabSupport, icon: <ClipboardList size={14} /> },
  ];

  return (
    <div className="bg-mist pb-20 pt-8">
      <div className="container-lenzi">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-leaf">
              {t.ownerConsole}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">
              {t.title}
            </h1>
            <p className="mt-1 text-[12px] text-graphite-400">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-sage-300 bg-white p-0.5 text-[11px] font-extrabold uppercase">
              {(["sw", "en"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  aria-pressed={language === item}
                  className={cn(
                    "rounded-full px-3 py-2",
                    language === item ? "bg-ink text-white" : "text-graphite-500",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-sage-300 bg-white px-4 text-[12px] font-bold text-graphite-600 hover:border-leaf"
            >
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {t.refresh}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="grid h-10 w-10 place-items-center rounded-full border border-sage-300 bg-white text-graphite-500 hover:border-red-200 hover:text-red-600"
              aria-label={t.signOut}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-sage-200 bg-white p-1 no-scrollbar">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[12px] font-bold transition-colors",
                tab === item.id
                  ? "bg-ink text-white"
                  : "text-graphite-500 hover:bg-sage-50 hover:text-ink",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <Link
            href="/admin/preview"
            className="ml-auto hidden shrink-0 items-center gap-1 rounded-full px-4 py-2.5 text-[12px] font-bold text-graphite-400 hover:text-ink sm:inline-flex"
          >
            {t.preview}
          </Link>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700">
            <CircleAlert size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-[12px] leading-5 text-deep">
            <Check size={14} className="mt-0.5 shrink-0" />
            {message}
          </div>
        )}

        {tab === "overview" && (
          <Overview
            metrics={metrics}
            series={series}
            drivers={drivers}
            rides={rides}
            audit={audit}
            language={language}
          />
        )}

        {tab === "drivers" && (
          <DriversTab
            drivers={drivers}
            language={language}
            busy={busy}
            onReview={reviewDriver}
          />
        )}

        {tab === "pricing" && (
          <PricingTab
            services={services}
            areas={areas}
            language={language}
            onPublished={loadAll}
            setError={setError}
            setMessage={setMessage}
          />
        )}

        {tab === "rides" && <RidesTab rides={rides} language={language} />}

        {tab === "finance" && (
          <FinanceTab
            payouts={payouts}
            metrics={metrics}
            language={language}
            busy={busy}
            onReview={reviewPayout}
          />
        )}

        {tab === "support" && <SupportTab tickets={tickets} language={language} />}
      </div>
    </div>
  );
}

function Overview({
  metrics,
  series,
  drivers,
  rides,
  audit,
  language,
}: {
  metrics: Metrics | null;
  series: RevenueDay[];
  drivers: DriverRow[];
  rides: RideRow[];
  audit: AuditRow[];
  language: Language;
}) {
  const t = language === "sw" ? SW : EN;
  const max = Math.max(1, ...series.map((day) => Number(day.gross)));
  const pending = drivers.filter((driver) => driver.approval_status === "pending");

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Activity size={16} />}
          label={t.activeRides}
          value={String(metrics?.activeRides ?? 0)}
          hint={`${metrics?.completedRides ?? 0} ${t.completed}`}
        />
        <MetricCard
          icon={<Users size={16} />}
          label={t.onlineDrivers}
          value={String(metrics?.onlineDrivers ?? 0)}
          hint={`${metrics?.approvedDrivers ?? 0} ${t.approved}`}
        />
        <MetricCard
          icon={<Banknote size={16} />}
          label={t.grossBookingValue}
          value={formatTzs(metrics?.grossBookingValue ?? 0, language)}
          hint={`${formatTzs(metrics?.platformRevenue ?? 0, language)} ${t.commission}`}
        />
        <MetricCard
          icon={<AlertTriangle size={16} />}
          label={t.pendingDrivers}
          value={String(metrics?.pendingDrivers ?? 0)}
          hint={`${formatTzs(metrics?.pendingPayouts ?? 0, language)} ${t.payouts}`}
          tone={metrics?.pendingDrivers ? "amber" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-ink">{t.revenue14}</h2>
              <p className="mt-0.5 text-[11px] text-graphite-400">{t.revenueNote}</p>
            </div>
            <span className="rounded-full bg-sage-100 px-2.5 py-1 text-[10px] font-bold text-graphite-500">
              TZS
            </span>
          </div>
          <div className="mt-6 flex h-40 items-end gap-1.5">
            {series.map((day) => {
              const height = Math.max(4, (Number(day.gross) / max) * 100);
              return (
                <div key={day.day} className="group relative flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-leaf/70 transition-colors group-hover:bg-leaf"
                    style={{ height: `${height}%` }}
                    title={`${day.day}: ${formatTzs(Number(day.gross), language)}`}
                  />
                </div>
              );
            })}
            {series.length === 0 && (
              <p className="w-full text-center text-[12px] text-graphite-400">{t.noData}</p>
            )}
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-graphite-400">
            <span>{series[0]?.day ?? "—"}</span>
            <span>{series[series.length - 1]?.day ?? "—"}</span>
          </div>
        </section>

        <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-extrabold text-ink">{t.needsAttention}</h2>
          <div className="mt-4 space-y-2">
            {pending.slice(0, 4).map((driver) => (
              <div
                key={driver.user_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-ink">
                    {driver.profile?.full_name ?? t.unnamedDriver}
                  </p>
                  <p className="truncate text-[10px] text-graphite-400">
                    {driver.profile?.phone ?? driver.profile?.email ?? driver.user_id.slice(0, 8)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-800">
                  {t.review}
                </span>
              </div>
            ))}
            {pending.length === 0 && (
              <p className="rounded-xl border border-dashed border-sage-300 px-3 py-6 text-center text-[12px] text-graphite-400">
                {t.noPendingDrivers}
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-extrabold text-ink">{t.recentRides}</h2>
          <ul className="mt-4 space-y-2">
            {rides.slice(0, 6).map((ride) => (
              <li key={ride.id} className="flex items-center justify-between gap-3 border-b border-sage-100 pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-ink">
                    {ride.pickup_address} → {ride.dropoff_address}
                  </p>
                  <p className="text-[10px] text-graphite-400">
                    {new Date(ride.requested_at).toLocaleString(language === "sw" ? "sw-TZ" : "en-TZ")}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase",
                    STATUS_TONE[ride.status] ?? "bg-sage-100 text-graphite-500",
                  )}
                >
                  {ride.status}
                </span>
              </li>
            ))}
            {rides.length === 0 && (
              <li className="text-[12px] text-graphite-400">{t.noData}</li>
            )}
          </ul>
        </section>

        <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-extrabold text-ink">{t.auditTrail}</h2>
          <ul className="mt-4 space-y-2">
            {audit.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 border-b border-sage-100 pb-2 last:border-0">
                <span className="truncate text-[12px] font-semibold text-ink">{entry.action}</span>
                <span className="shrink-0 text-[10px] text-graphite-400">
                  {new Date(entry.created_at).toLocaleString(language === "sw" ? "sw-TZ" : "en-TZ")}
                </span>
              </li>
            ))}
            {audit.length === 0 && (
              <li className="text-[12px] text-graphite-400">{t.noData}</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function DriversTab({
  drivers,
  language,
  busy,
  onReview,
}: {
  drivers: DriverRow[];
  language: Language;
  busy: string | null;
  onReview: (userId: string, action: string, reason: string) => Promise<void>;
}) {
  const t = language === "sw" ? SW : EN;
  const [reasons, setReasons] = useState<Record<string, string>>({});

  return (
    <section className="mt-6 rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-ink">{t.driverQueue}</h2>
          <p className="mt-0.5 text-[11px] text-graphite-400">{t.driverQueueNote}</p>
        </div>
        <span className="rounded-full bg-sage-100 px-2.5 py-1 text-[10px] font-bold text-graphite-500">
          {drivers.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {drivers.map((driver) => {
          const pending = driver.approval_status === "pending";
          return (
            <div key={driver.user_id} className="rounded-2xl border border-sage-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-extrabold text-ink">
                      {driver.profile?.full_name ?? t.unnamedDriver}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em]",
                        STATUS_TONE[driver.approval_status] ?? "bg-sage-100 text-graphite-500",
                      )}
                    >
                      {driver.approval_status}
                    </span>
                    <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[9px] font-bold text-graphite-500">
                      {driver.availability}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-graphite-400">
                    {[driver.profile?.phone, driver.profile?.email].filter(Boolean).join(" · ") ||
                      driver.user_id}
                  </p>
                  <p className="mt-1 text-[10px] text-graphite-400">
                    {t.trips}: {driver.total_trips} · {t.rating}:{" "}
                    {driver.rating === null ? "—" : driver.rating.toFixed(1)} · {t.joined}{" "}
                    {new Date(driver.created_at).toLocaleDateString(language === "sw" ? "sw-TZ" : "en-TZ")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(pending || driver.approval_status === "draft" || driver.approval_status === "rejected") && (
                    <ActionButton
                      tone="primary"
                      busy={busy === `${driver.user_id}:approve`}
                      onClick={() => onReview(driver.user_id, "approve", "")}
                    >
                      <Check size={12} />
                      {t.approve}
                    </ActionButton>
                  )}
                  {pending && (
                    <ActionButton
                      tone="danger"
                      busy={busy === `${driver.user_id}:reject`}
                      onClick={() => onReview(driver.user_id, "reject", reasons[driver.user_id] ?? "")}
                    >
                      <X size={12} />
                      {t.reject}
                    </ActionButton>
                  )}
                  {driver.approval_status === "approved" && (
                    <ActionButton
                      tone="danger"
                      busy={busy === `${driver.user_id}:suspend`}
                      onClick={() => onReview(driver.user_id, "suspend", reasons[driver.user_id] ?? "")}
                    >
                      <X size={12} />
                      {t.suspend}
                    </ActionButton>
                  )}
                  {driver.approval_status === "suspended" && (
                    <ActionButton
                      tone="primary"
                      busy={busy === `${driver.user_id}:reinstate`}
                      onClick={() => onReview(driver.user_id, "reinstate", "")}
                    >
                      <BadgeCheck size={12} />
                      {t.reinstate}
                    </ActionButton>
                  )}
                </div>
              </div>

              {(pending || driver.approval_status === "approved") && (
                <input
                  value={reasons[driver.user_id] ?? ""}
                  onChange={(event) =>
                    setReasons((current) => ({ ...current, [driver.user_id]: event.target.value }))
                  }
                  placeholder={t.reasonPlaceholder}
                  className="mt-3 h-9 w-full rounded-lg border border-sage-200 bg-sage-50/60 px-3 text-[11px] text-ink outline-none focus:border-leaf"
                />
              )}
            </div>
          );
        })}
        {drivers.length === 0 && (
          <p className="rounded-xl border border-dashed border-sage-300 px-3 py-10 text-center text-[12px] text-graphite-400">
            {t.noDrivers}
          </p>
        )}
      </div>
    </section>
  );
}

function PricingTab({
  services,
  areas,
  language,
  onPublished,
  setError,
  setMessage,
}: {
  services: ServiceRow[];
  areas: AreaRow[];
  language: Language;
  onPublished: () => Promise<void>;
  setError: (message: string | null) => void;
  setMessage: (message: string | null) => void;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const t = language === "sw" ? SW : EN;
  const [serviceId, setServiceId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [values, setValues] = useState({
    base: "",
    perKm: "",
    perMinute: "",
    minimum: "",
    waiting: "",
    cancellation: "",
    commission: "15",
    rounding: "50",
  });
  const [saving, setSaving] = useState(false);

  const effectiveServiceId = serviceId || services[0]?.id || "";
  const effectiveAreaId = areaId || areas[0]?.id || "";

  function set(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !effectiveServiceId || !effectiveAreaId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.rpc("admin_publish_fare_rule", {
        p_service_type_id: effectiveServiceId,
        p_operating_area_id: effectiveAreaId,
        p_base_fare: Number(values.base || 0),
        p_per_km: Number(values.perKm || 0),
        p_per_minute: Number(values.perMinute || 0),
        p_minimum_fare: Number(values.minimum || 0),
        p_waiting_per_minute: Number(values.waiting || 0),
        p_cancellation_fee: Number(values.cancellation || 0),
        p_commission_rate: Number(values.commission || 0) / 100,
        p_rounding_increment: Number(values.rounding || 50),
      });
      if (error) {
        setError(error.message);
        return;
      }
      setMessage(t.farePublished);
      await onPublished();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-extrabold text-ink">{t.publishFare}</h2>
        <p className="mt-1 text-[11px] leading-5 text-graphite-400">{t.publishFareNote}</p>

        <form onSubmit={publish} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-graphite-400">
                {t.service}
              </span>
              <select
                value={effectiveServiceId}
                onChange={(event) => setServiceId(event.target.value)}
                className="h-10 w-full rounded-xl border border-sage-300 bg-white px-3 text-[12px] font-semibold text-ink"
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {language === "sw" ? service.name_sw : service.name_en}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-graphite-400">
                {t.area}
              </span>
              <select
                value={effectiveAreaId}
                onChange={(event) => setAreaId(event.target.value)}
                className="h-10 w-full rounded-xl border border-sage-300 bg-white px-3 text-[12px] font-semibold text-ink"
              >
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MoneyInput label={t.baseFare} value={values.base} onChange={(value) => set("base", value)} />
            <MoneyInput label={t.perKm} value={values.perKm} onChange={(value) => set("perKm", value)} />
            <MoneyInput
              label={t.perMinute}
              value={values.perMinute}
              onChange={(value) => set("perMinute", value)}
            />
            <MoneyInput
              label={t.minimumFare}
              value={values.minimum}
              onChange={(value) => set("minimum", value)}
            />
            <MoneyInput
              label={t.waiting}
              value={values.waiting}
              onChange={(value) => set("waiting", value)}
            />
            <MoneyInput
              label={t.cancellation}
              value={values.cancellation}
              onChange={(value) => set("cancellation", value)}
            />
            <MoneyInput
              label={t.commissionPercent}
              value={values.commission}
              onChange={(value) => set("commission", value)}
            />
            <MoneyInput
              label={t.rounding}
              value={values.rounding}
              onChange={(value) => set("rounding", value)}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-900">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {t.zeroWarning}
          </div>

          <button
            type="submit"
            disabled={saving || !serviceId || !areaId}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-[12px] font-bold text-white hover:bg-forest-800 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Percent size={14} />}
            {t.publish}
          </button>
        </form>
      </section>

      <section className="h-fit rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-extrabold text-ink">{t.pricingRules}</h2>
        <ul className="mt-4 space-y-3 text-[12px] leading-5 text-graphite-500">
          <li className="flex gap-2">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-leaf" />
            {t.rule1}
          </li>
          <li className="flex gap-2">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-leaf" />
            {t.rule2}
          </li>
          <li className="flex gap-2">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-leaf" />
            {t.rule3}
          </li>
          <li className="flex gap-2">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-leaf" />
            {t.rule4}
          </li>
        </ul>
      </section>
    </div>
  );
}

function RidesTab({ rides, language }: { rides: RideRow[]; language: Language }) {
  const t = language === "sw" ? SW : EN;
  return (
    <section className="mt-6 rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-extrabold text-ink">{t.recentRides}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-sage-200 text-[10px] uppercase tracking-[0.12em] text-graphite-400">
              <th className="pb-2 font-bold">{t.route}</th>
              <th className="pb-2 font-bold">{t.status}</th>
              <th className="pb-2 font-bold">{t.payment}</th>
              <th className="pb-2 text-right font-bold">{t.fare}</th>
              <th className="pb-2 text-right font-bold">{t.requested}</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((ride) => (
              <tr key={ride.id} className="border-b border-sage-100 text-[12px] last:border-0">
                <td className="max-w-[280px] truncate py-2.5 font-semibold text-ink">
                  {ride.pickup_address} → {ride.dropoff_address}
                </td>
                <td className="py-2.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase",
                      STATUS_TONE[ride.status] ?? "bg-sage-100 text-graphite-500",
                    )}
                  >
                    {ride.status}
                  </span>
                </td>
                <td className="py-2.5 capitalize text-graphite-500">
                  {ride.payment_method.replace("_", " ")}
                </td>
                <td className="py-2.5 text-right font-semibold text-ink">
                  {formatTzs(Number(ride.final_fare ?? ride.estimated_fare ?? 0), language)}
                </td>
                <td className="py-2.5 text-right text-graphite-400">
                  {new Date(ride.requested_at).toLocaleDateString(language === "sw" ? "sw-TZ" : "en-TZ")}
                </td>
              </tr>
            ))}
            {rides.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[12px] text-graphite-400">
                  {t.noData}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FinanceTab({
  payouts,
  metrics,
  language,
  busy,
  onReview,
}: {
  payouts: PayoutRow[];
  metrics: Metrics | null;
  language: Language;
  busy: string | null;
  onReview: (id: string, action: string) => Promise<void>;
}) {
  const t = language === "sw" ? SW : EN;
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={<Banknote size={16} />}
          label={t.platformRevenue}
          value={formatTzs(metrics?.platformRevenue ?? 0, language)}
        />
        <MetricCard
          icon={<Wallet size={16} />}
          label={t.driverEarnings}
          value={formatTzs(metrics?.driverEarnings ?? 0, language)}
        />
        <MetricCard
          icon={<AlertTriangle size={16} />}
          label={t.pendingPayouts}
          value={formatTzs(metrics?.pendingPayouts ?? 0, language)}
          tone={metrics?.pendingPayouts ? "amber" : undefined}
        />
      </div>

      <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-extrabold text-ink">{t.payoutQueue}</h2>
        <p className="mt-1 text-[11px] text-graphite-400">{t.payoutNote}</p>
        <div className="mt-4 space-y-2">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="flex flex-col gap-2 rounded-xl border border-sage-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-[12px] font-bold text-ink">
                  {formatTzs(Number(payout.amount), language)}
                </p>
                <p className="text-[10px] text-graphite-400">
                  {payout.driver_id.slice(0, 8)} · {payout.method.replace("_", " ")} ·{" "}
                  {new Date(payout.requested_at).toLocaleDateString(language === "sw" ? "sw-TZ" : "en-TZ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase",
                    STATUS_TONE[payout.status] ?? "bg-sage-100 text-graphite-500",
                  )}
                >
                  {payout.status}
                </span>
                {["requested", "processing"].includes(payout.status) && (
                  <>
                    <ActionButton
                      tone="primary"
                      busy={busy === payout.id}
                      onClick={() => onReview(payout.id, "paid")}
                    >
                      <Check size={12} />
                      {t.markPaid}
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      busy={busy === payout.id}
                      onClick={() => onReview(payout.id, "rejected")}
                    >
                      <X size={12} />
                      {t.reject}
                    </ActionButton>
                  </>
                )}
              </div>
            </div>
          ))}
          {payouts.length === 0 && (
            <p className="rounded-xl border border-dashed border-sage-300 px-3 py-10 text-center text-[12px] text-graphite-400">
              {t.noPayouts}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function SupportTab({ tickets, language }: { tickets: TicketRow[]; language: Language }) {
  const t = language === "sw" ? SW : EN;
  return (
    <section className="mt-6 rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-extrabold text-ink">{t.supportQueue}</h2>
      <div className="mt-4 space-y-2">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-sage-200 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink">{ticket.subject}</p>
              <p className="text-[10px] text-graphite-400">
                {new Date(ticket.created_at).toLocaleString(language === "sw" ? "sw-TZ" : "en-TZ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[9px] font-bold uppercase text-graphite-500">
                {ticket.priority}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase",
                  STATUS_TONE[ticket.status] ?? "bg-sage-100 text-graphite-500",
                )}
              >
                {ticket.status}
              </span>
            </div>
          </div>
        ))}
        {tickets.length === 0 && (
          <p className="rounded-xl border border-dashed border-sage-300 px-3 py-10 text-center text-[12px] text-graphite-400">
            {t.noTickets}
          </p>
        )}
      </div>
      <p className="mt-4 rounded-xl bg-sage-50 px-3 py-2.5 text-[10px] leading-4 text-graphite-400">
        {t.supportNote}
      </p>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "amber";
}) {
  return (
    <div className="rounded-2xl border border-sage-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-graphite-400">
          {label}
        </span>
        <span
          className={cn(
            "grid h-7 w-7 place-items-center rounded-lg",
            tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-sage-100 text-deep",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xl font-extrabold tracking-[-0.02em] text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-graphite-400">{hint}</p>}
    </div>
  );
}

function ActionButton({
  tone,
  busy,
  onClick,
  children,
}: {
  tone: "primary" | "danger";
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full px-3 text-[10px] font-extrabold transition-colors disabled:opacity-50",
        tone === "primary"
          ? "bg-ink text-white hover:bg-forest-800"
          : "border border-red-200 text-red-600 hover:bg-red-50",
      )}
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : children}
    </button>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-graphite-400">
        {label}
      </span>
      <input
        type="number"
        min={0}
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        className="h-10 w-full rounded-xl border border-sage-300 bg-white px-3 text-[12px] font-semibold text-ink outline-none focus:border-leaf"
      />
    </label>
  );
}

const SW = {
  ownerConsole: "Dashibodi ya msimamizi",
  title: "Udhibiti wa LENZI Chunya",
  subtitle: "Ufikiaji umelindwa. Kila hatua nyeti huandikwa kwenye kumbukumbu.",
  refresh: "Sasisha",
  signOut: "Toka",
  preview: "Onyesho la majaribio",
  forbiddenTitle: "Ufikiaji umezuiwa",
  forbiddenBody: "Akaunti hii haina ruhusa ya msimamizi wa jukwaa.",
  signInTitle: "Ingia kama msimamizi",
  signInBody: "Tumia akaunti ya msimamizi iliyoidhinishwa kupitia mchakato salama wa bootstrap.",
  signIn: "Ingia",
  backToRide: "Rudi kwenye safari",
  ownerNote:
    "Haki za msimamizi hutolewa tu kwa njia salama nje ya app. Metadata ya mtumiaji haiwezi kuunda msimamizi.",
  driverUpdated: "Dereva amesasishwa",
  payoutUpdated: "Malipo yamesasishwa",
  farePublished: "Kanuni mpya ya bei imechapishwa.",
  tabOverview: "Muhtasari",
  tabDrivers: "Madereva",
  tabPricing: "Bei",
  tabRides: "Safari",
  tabFinance: "Fedha",
  tabSupport: "Msaada",
  activeRides: "Safari hai",
  completed: "zimekamilika",
  onlineDrivers: "Madereva mtandaoni",
  approved: "wameidhinishwa",
  grossBookingValue: "Thamani ya jumla",
  commission: "kamishini",
  pendingDrivers: "Madereva wanasubiri",
  payouts: "malipo",
  revenue14: "Mapato · siku 14",
  revenueNote: "Safari zilizokamilika kwa siku, kwa saa za Afrika Mashariki.",
  noData: "Hakuna data bado.",
  needsAttention: "Vinahitaji uangalizi",
  unnamedDriver: "Dereva bila jina",
  review: "Kagua",
  noPendingDrivers: "Hakuna maombi yanayosubiri.",
  recentRides: "Safari za hivi karibuni",
  auditTrail: "Kumbukumbu za msimamizi",
  driverQueue: "Usajili wa madereva",
  driverQueueNote:
    "Idhinisha tu baada ya kuona chombo na nyaraka tatu za msingi. Sababu inahitajika kwa kukataa au kusimamisha.",
  trips: "Safari",
  rating: "Alama",
  joined: "Alijiunga",
  approve: "Idhinisha",
  reject: "Kataa",
  suspend: "Simamisha",
  reinstate: "Rejesha",
  reasonPlaceholder: "Sababu (inahitajika kwa kukataa au kusimamisha)",
  noDrivers: "Hakuna madereva bado.",
  publishFare: "Chapisha kanuni ya bei",
  publishFareNote:
    "Kanuni mpya huzima ya zamani kwa huduma na eneo hilo. Bei lazima zitokane na utafiti wa soko wa Chunya.",
  service: "Huduma",
  area: "Eneo",
  baseFare: "Bei ya kuanzia",
  perKm: "Kwa km",
  perMinute: "Kwa dakika",
  minimumFare: "Bei ya chini",
  waiting: "Kusubiri / dakika",
  cancellation: "Ada ya kughairi",
  commissionPercent: "Kamishini %",
  rounding: "Mzunguko (TZS)",
  zeroWarning:
    "Thamani sifuri ni chaguo-msingi la kiufundi, si bei halisi. Weka bei zilizothibitishwa kabla ya kuwasha huduma.",
  publish: "Chapisha",
  pricingRules: "Kanuni za bei",
  rule1: "Bei huhifadhiwa kwa toleo; historia haifutwi.",
  rule2: "Abiria huona makadirio tu; hesabu hufanywa na mfumo.",
  rule3: "Kamishini hukatwa kwenye jumla baada ya ofa.",
  rule4: "Bei za eneo lingine hazitumiki kama mbadala.",
  route: "Njia",
  status: "Hali",
  payment: "Malipo",
  fare: "Bei",
  requested: "Iliombwa",
  platformRevenue: "Mapato ya jukwaa",
  driverEarnings: "Mapato ya madereva",
  pendingPayouts: "Malipo yanayosubiri",
  payoutQueue: "Foleni ya malipo",
  payoutNote: "Malipo hufanywa nje ya mfumo. Hapa unarekodi tu hali na kumbukumbu.",
  markPaid: "Weka kulipwa",
  noPayouts: "Hakuna maombi ya malipo.",
  supportQueue: "Tiketi za msaada",
  noTickets: "Hakuna tiketi.",
  supportNote:
    "Majibu ya msaada na ufumbuzi hufanywa kupitia mfumo wa msaada. Ujumbe wa ndani hausionekani kwa mteja.",
};

const EN: typeof SW = {
  ownerConsole: "Administrator console",
  title: "LENZI Chunya control",
  subtitle: "Access is protected. Every sensitive action is written to the audit log.",
  refresh: "Refresh",
  signOut: "Sign out",
  preview: "Demo preview",
  forbiddenTitle: "Access denied",
  forbiddenBody: "This account does not have platform administrator permission.",
  signInTitle: "Sign in as administrator",
  signInBody: "Use the administrator account created through the secure bootstrap process.",
  signIn: "Sign in",
  backToRide: "Back to rides",
  ownerNote:
    "Administrator rights are granted only out-of-band. User metadata can never create an administrator.",
  driverUpdated: "Driver updated",
  payoutUpdated: "Payout updated",
  farePublished: "New fare rule published.",
  tabOverview: "Overview",
  tabDrivers: "Drivers",
  tabPricing: "Pricing",
  tabRides: "Rides",
  tabFinance: "Finance",
  tabSupport: "Support",
  activeRides: "Active rides",
  completed: "completed",
  onlineDrivers: "Drivers online",
  approved: "approved",
  grossBookingValue: "Gross booking value",
  commission: "commission",
  pendingDrivers: "Drivers pending",
  payouts: "payouts",
  revenue14: "Revenue · last 14 days",
  revenueNote: "Completed rides per day, in East Africa Time.",
  noData: "No data yet.",
  needsAttention: "Needs attention",
  unnamedDriver: "Unnamed driver",
  review: "Review",
  noPendingDrivers: "No pending applications.",
  recentRides: "Recent rides",
  auditTrail: "Administrator audit trail",
  driverQueue: "Driver applications",
  driverQueueNote:
    "Approve only after seeing a vehicle and the three core documents. A reason is required to reject or suspend.",
  trips: "Trips",
  rating: "Rating",
  joined: "Joined",
  approve: "Approve",
  reject: "Reject",
  suspend: "Suspend",
  reinstate: "Reinstate",
  reasonPlaceholder: "Reason (required to reject or suspend)",
  noDrivers: "No drivers yet.",
  publishFare: "Publish fare rule",
  publishFareNote:
    "A new rule deactivates the previous one for that service and area. Prices must come from Chunya market research.",
  service: "Service",
  area: "Area",
  baseFare: "Base fare",
  perKm: "Per km",
  perMinute: "Per minute",
  minimumFare: "Minimum fare",
  waiting: "Waiting / minute",
  cancellation: "Cancellation fee",
  commissionPercent: "Commission %",
  rounding: "Rounding (TZS)",
  zeroWarning:
    "Zero is a technical default, not a real price. Enter verified prices before enabling the service.",
  publish: "Publish",
  pricingRules: "Pricing rules",
  rule1: "Fares are versioned; history is never deleted.",
  rule2: "Passengers see an estimate only; the platform calculates the fare.",
  rule3: "Commission is deducted from the total after discounts.",
  rule4: "Another area's fare is never used as a fallback.",
  route: "Route",
  status: "Status",
  payment: "Payment",
  fare: "Fare",
  requested: "Requested",
  platformRevenue: "Platform revenue",
  driverEarnings: "Driver earnings",
  pendingPayouts: "Pending payouts",
  payoutQueue: "Payout queue",
  payoutNote: "Payouts happen outside the system. Record status and references here.",
  markPaid: "Mark paid",
  noPayouts: "No payout requests.",
  supportQueue: "Support tickets",
  noTickets: "No tickets.",
  supportNote:
    "Support replies and resolutions are handled in the support workflow. Internal notes are never shown to the customer.",
};
