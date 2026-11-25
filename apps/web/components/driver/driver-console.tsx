"use client";

import type { RideStatus, VehicleCategory } from "@lenzi/shared";
import { formatTzs } from "@lenzi/shared";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Camera,
  Check,
  CircleAlert,
  Clock,
  FileText,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  Power,
  Star,
  Upload,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

type Language = "sw" | "en";

interface DriverRow {
  approval_status: "draft" | "pending" | "approved" | "rejected" | "suspended";
  availability: "offline" | "online" | "busy";
  rating: number | null;
  total_trips: number;
  location_consent_at: string | null;
  rejection_reason: string | null;
  suspended_reason: string | null;
  licence_number: string | null;
  licence_expiry: string | null;
  national_id_last4: string | null;
}

interface VehicleRow {
  id: string;
  category: VehicleCategory;
  make: string | null;
  model: string | null;
  model_year: number | null;
  color: string | null;
  plate_number: string;
  verification_status: string;
  active: boolean;
}

interface DocumentRow {
  id: string;
  document_type: string;
  status: string;
}

interface OfferRow {
  offer_id: string;
  ride_id: string;
  expires_at: string;
  service_code: VehicleCategory;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number;
  duration_min: number;
  estimated_fare: number;
  payment_method: string;
}

interface Summary {
  availability: string;
  approvalStatus: string;
  rating: number | null;
  totalTrips: number;
  acceptanceRate: number | null;
  todayEarnings: number;
  weekEarnings: number;
  availableBalance: number;
  pendingPayouts: number;
  completedTrips: number;
}

interface ActiveRide {
  id: string;
  status: RideStatus;
  pickup: { address: string };
  dropoff: { address: string };
  estimatedFare: number | null;
  finalFare: number | null;
  paymentMethod: string;
  paymentStatus: string | null;
  cancellationFee: number | null;
  counterpart: { fullName: string | null; phone: string | null } | null;
}

const DOC_TYPES = [
  { value: "national_id", sw: "Kitambulisho cha taifa", en: "National ID" },
  { value: "driving_licence", sw: "Leseni ya udereva", en: "Driving licence" },
  { value: "vehicle_registration", sw: "Kadi ya chombo", en: "Vehicle registration" },
  { value: "vehicle_insurance", sw: "Bima ya chombo", en: "Vehicle insurance" },
  { value: "roadworthiness", sw: "Ukaguzi wa barabara", en: "Roadworthiness" },
] as const;

const CATEGORY_LABEL: Record<VehicleCategory, { sw: string; en: string }> = {
  boda_boda: { sw: "Boda Boda", en: "Boda Boda" },
  bajaji: { sw: "Bajaji", en: "Bajaji" },
  car: { sw: "Gari", en: "Car" },
};

const STATUS_LABEL: Record<RideStatus, { sw: string; en: string }> = {
  requested: { sw: "Imeombwa", en: "Requested" },
  searching: { sw: "Inatafutwa", en: "Searching" },
  accepted: { sw: "Imekubaliwa", en: "Accepted" },
  driver_arriving: { sw: "Unakwenda kuchukua", en: "Heading to pickup" },
  driver_arrived: { sw: "Umefika", en: "At pickup" },
  in_progress: { sw: "Safari inaendelea", en: "In progress" },
  completed: { sw: "Imekamilika", en: "Completed" },
  cancelled: { sw: "Imeghairiwa", en: "Cancelled" },
  no_driver_found: { sw: "Hakuna dereva", en: "No driver" },
  disputed: { sw: "Inachunguzwa", en: "Disputed" },
};

export function DriverConsole() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [language, setLanguage] = useState<Language>("sw");
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  const t = language === "sw" ? SW : EN;

  const loadDriver = useCallback(async () => {
    if (!supabase || !userId) return;

    const { data: driverData, error } = await supabase
      .from("driver_profiles")
      .select(
        "approval_status, availability, rating, total_trips, location_consent_at, rejection_reason, suspended_reason, licence_number, licence_expiry, national_id_last4",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setActionError(error.message);
      return;
    }
    setDriver((driverData as DriverRow | null) ?? null);

    const [{ data: vehicleData }, { data: documentData }] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, category, make, model, model_year, color, plate_number, verification_status, active")
        .eq("driver_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("driver_documents")
        .select("id, document_type, status")
        .eq("driver_id", userId),
    ]);

    setVehicles((vehicleData as VehicleRow[] | null) ?? []);
    setDocuments((documentData as DocumentRow[] | null) ?? []);

    const { data: summaryData } = await supabase.rpc("get_driver_summary");
    if (summaryData) setSummary(summaryData as Summary);

    const { data: active } = await supabase
      .from("rides")
      .select("id")
      .eq("driver_id", userId)
      .in("status", ["accepted", "driver_arriving", "driver_arrived", "in_progress", "completed"])
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active?.id) {
      const { data: detail } = await supabase.rpc("get_ride_detail", {
        p_ride_id: active.id,
      });
      setActiveRide((detail as ActiveRide | null) ?? null);
    } else {
      setActiveRide(null);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => void loadDriver(), 0);
    return () => clearTimeout(timer);
  }, [userId, loadDriver]);

  const loadOffers = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.rpc("get_driver_offers");
    setOffers((data as OfferRow[] | null) ?? []);
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !driver || driver.approval_status !== "approved") return;
    const kick = setTimeout(() => void loadOffers(), 0);
    const timer = setInterval(() => {
      void loadOffers();
      if (activeRide && !["completed", "cancelled", "no_driver_found"].includes(activeRide.status)) {
        void supabase
          .rpc("get_ride_detail", { p_ride_id: activeRide.id })
          .then(({ data }) => {
            if (data) setActiveRide(data as ActiveRide);
          });
      }
    }, 8000);
    return () => {
      clearTimeout(kick);
      clearInterval(timer);
    };
  }, [supabase, driver, activeRide, loadOffers]);

  useEffect(() => {
    if (!supabase || !driver || driver.availability === "offline") {
      if (watchRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void supabase.rpc("update_driver_location", {
          p_lat: position.coords.latitude,
          p_lng: position.coords.longitude,
          p_heading: position.coords.heading,
          p_speed_mps: position.coords.speed,
          p_accuracy_m: position.coords.accuracy,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15000 },
    );

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [supabase, driver]);

  async function toggleAvailability() {
    if (!supabase || !driver) return;
    setBusy("availability");
    setActionError(null);
    setActionMessage(null);
    try {
      const goingOnline = driver.availability === "offline";

      if (goingOnline && !driver.location_consent_at) {
        const { error } = await supabase.rpc("set_location_consent", { p_consent: true });
        if (error) {
          setActionError(error.message);
          return;
        }
      }

      const { error } = await supabase.rpc("set_driver_availability", {
        p_availability: goingOnline ? "online" : "offline",
      });
      if (error) {
        setActionError(error.message);
        return;
      }

      setActionMessage(goingOnline ? t.nowOnline : t.nowOffline);
      await loadDriver();
    } finally {
      setBusy(null);
    }
  }

  async function respond(offer: OfferRow, accept: boolean) {
    if (!supabase) return;
    setBusy(offer.ride_id);
    setActionError(null);
    try {
      const { error } = accept
        ? await supabase.rpc("accept_ride_offer", { p_ride_id: offer.ride_id })
        : await supabase.rpc("decline_ride_offer", { p_ride_id: offer.ride_id });

      if (error) {
        setActionError(error.message);
        return;
      }
      setOffers((current) => current.filter((item) => item.ride_id !== offer.ride_id));
      await loadDriver();
    } finally {
      setBusy(null);
    }
  }

  async function rideAction(action: "arriving" | "arrived" | "start" | "complete" | "cash") {
    if (!supabase || !activeRide) return;
    setBusy(action);
    setActionError(null);
    try {
      const rpc =
        action === "arriving"
          ? "mark_driver_arriving"
          : action === "arrived"
            ? "mark_driver_arrived"
            : action === "start"
              ? "start_ride"
              : action === "complete"
                ? "complete_ride"
                : "confirm_cash_payment";

      const { error } = await supabase.rpc(rpc, { p_ride_id: activeRide.id });
      if (error) {
        setActionError(error.message);
        return;
      }
      await loadDriver();
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUserId(null);
    setDriver(null);
    setActiveRide(null);
  }

  if (!authReady) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="animate-spin text-leaf" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="bg-mist">
        <div className="container-lenzi py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-sage-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-graphite-500">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                {t.eyebrow}
              </span>
              <h1 className="mt-5 max-w-2xl text-4xl font-extrabold tracking-[-0.04em] text-ink sm:text-5xl sm:leading-[1.02]">
                {t.title}
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-graphite-500">{t.subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex h-13 items-center gap-2 rounded-full bg-leaf px-6 text-sm font-bold text-white hover:bg-deep"
                >
                  {t.cta}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/support"
                  className="inline-flex h-13 items-center rounded-full border border-sage-300 bg-white px-6 text-sm font-bold text-ink hover:border-leaf"
                >
                  {t.support}
                </Link>
              </div>
              <p className="mt-4 text-[11px] text-graphite-400">{t.noFee}</p>
            </div>

            <div className="rounded-3xl border border-sage-200 bg-white p-6 shadow-soft sm:p-8">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-leaf">
                {t.stepsTitle}
              </p>
              <ol className="mt-5 space-y-5">
                {t.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-display text-2xl italic leading-none text-sage-400">
                      0{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-ink">{step.title}</p>
                      <p className="mt-1 text-[12px] leading-5 text-graphite-500">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 rounded-2xl bg-sage-50 p-4 text-[11px] leading-5 text-graphite-500">
                {t.requirements}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const approved = driver?.approval_status === "approved";
  const vehicleReady = vehicles.some((vehicle) => vehicle.active);
  const requiredDocs = new Set(
    documents
      .filter((doc) => ["national_id", "driving_licence", "vehicle_registration"].includes(doc.document_type))
      .map((doc) => doc.document_type),
  );

  return (
    <div className="bg-mist pb-20 pt-10">
      <div className="container-lenzi">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-leaf">
              {t.dashboard}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">
              {t.welcome}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusChip status={driver?.approval_status ?? "draft"} language={language} />
              {approved && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]",
                    driver?.availability === "offline"
                      ? "bg-sage-100 text-graphite-500"
                      : "bg-leaf/15 text-deep",
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {driver?.availability}
                </span>
              )}
              {driver?.rating !== null && driver?.rating !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-ink">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {driver.rating.toFixed(1)}
                </span>
              )}
            </div>
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
              onClick={signOut}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-sage-300 bg-white px-4 text-[12px] font-bold text-graphite-500 hover:border-red-200 hover:text-red-600"
            >
              <LogOut size={13} />
              {t.signOut}
            </button>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-900">
            {t.notConfigured}
          </div>
        )}

        {actionError && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700">
            <CircleAlert size={14} className="mt-0.5 shrink-0" />
            {actionError}
          </div>
        )}
        {actionMessage && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-[12px] leading-5 text-deep">
            <Check size={14} className="mt-0.5 shrink-0" />
            {actionMessage}
          </div>
        )}

        {!approved ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-7">
                <SectionTitle index="01" title={t.vehicleTitle} done={vehicleReady} />
                <VehicleForm
                  userId={userId}
                  language={language}
                  onSaved={loadDriver}
                  setError={setActionError}
                  setMessage={setActionMessage}
                />
                {vehicles.length > 0 && (
                  <ul className="mt-5 space-y-2">
                    {vehicles.map((vehicle) => (
                      <li
                        key={vehicle.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-sage-200 px-3 py-2.5"
                      >
                        <div>
                          <p className="text-[12px] font-bold text-ink">
                            {CATEGORY_LABEL[vehicle.category][language]} · {vehicle.plate_number}
                          </p>
                          <p className="text-[10px] text-graphite-400">
                            {[vehicle.make, vehicle.model, vehicle.color]
                              .filter(Boolean)
                              .join(" ") || t.vehicleDetailsPending}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em]",
                            vehicle.verification_status === "approved"
                              ? "bg-leaf/15 text-deep"
                              : "bg-amber-50 text-amber-700",
                          )}
                        >
                          {vehicle.verification_status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-7">
                <SectionTitle
                  index="02"
                  title={t.documentsTitle}
                  done={requiredDocs.size >= 3}
                />
                <p className="mt-2 text-[12px] leading-5 text-graphite-500">{t.documentsBody}</p>
                <DocumentUploader
                  userId={userId}
                  language={language}
                  documents={documents}
                  onSaved={loadDriver}
                  setError={setActionError}
                  setMessage={setActionMessage}
                />
              </section>
            </div>

            <section className="h-fit rounded-3xl border border-sage-200 bg-white p-5 sm:p-7">
              <SectionTitle index="03" title={t.submitTitle} done={false} />
              <ul className="mt-4 space-y-3 text-[12px]">
                <Requirement label={t.reqVehicle} met={vehicleReady} />
                <Requirement label={t.reqId} met={requiredDocs.has("national_id")} />
                <Requirement label={t.reqLicence} met={requiredDocs.has("driving_licence")} />
                <Requirement label={t.reqRegistration} met={requiredDocs.has("vehicle_registration")} />
              </ul>

              {driver?.approval_status === "rejected" && driver.rejection_reason && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] leading-5 text-red-700">
                  <span className="font-bold">{t.rejectionReason}:</span> {driver.rejection_reason}
                </div>
              )}

              <button
                type="button"
                disabled={
                  busy === "submit" ||
                  !vehicleReady ||
                  requiredDocs.size < 3 ||
                  driver?.approval_status === "pending"
                }
                onClick={async () => {
                  if (!supabase) return;
                  setBusy("submit");
                  setActionError(null);
                  setActionMessage(null);
                  const { error } = await supabase.rpc("submit_driver_application");
                  setBusy(null);
                  if (error) {
                    setActionError(error.message);
                    return;
                  }
                  setActionMessage(t.submitted);
                  await loadDriver();
                }}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-leaf text-sm font-bold text-white hover:bg-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "submit" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <BadgeCheck size={15} />
                )}
                {driver?.approval_status === "pending" ? t.underReview : t.submit}
              </button>
              <p className="mt-3 text-[10px] leading-4 text-graphite-400">{t.reviewNote}</p>
            </section>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <section
                className={cn(
                  "rounded-3xl border p-5 sm:p-6",
                  driver?.availability === "offline"
                    ? "border-sage-200 bg-white"
                    : "border-forest-700 bg-forest-950 text-white",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={cn(
                        "text-[11px] font-extrabold uppercase tracking-[0.16em]",
                        driver?.availability === "offline" ? "text-graphite-400" : "text-lime",
                      )}
                    >
                      {t.availability}
                    </p>
                    <p className="mt-2 text-xl font-extrabold">
                      {driver?.availability === "offline" ? t.offline : t.online}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[12px] leading-5",
                        driver?.availability === "offline" ? "text-graphite-500" : "text-white/55",
                      )}
                    >
                      {driver?.availability === "offline" ? t.offlineNote : t.onlineNote}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAvailability}
                    disabled={busy === "availability" || driver?.availability === "busy"}
                    aria-label={t.availability}
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-50",
                      driver?.availability === "offline"
                        ? "bg-leaf text-white hover:bg-deep"
                        : "bg-lime text-ink hover:bg-[#c9f78e]",
                    )}
                  >
                    {busy === "availability" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Power size={18} />
                    )}
                  </button>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <MiniStat
                    light={driver?.availability !== "offline"}
                    label={t.today}
                    value={formatTzs(summary?.todayEarnings ?? 0, language)}
                  />
                  <MiniStat
                    light={driver?.availability !== "offline"}
                    label={t.week}
                    value={formatTzs(summary?.weekEarnings ?? 0, language)}
                  />
                  <MiniStat
                    light={driver?.availability !== "offline"}
                    label={t.trips}
                    value={String(summary?.completedTrips ?? 0)}
                  />
                </div>
              </section>

              {offers.length > 0 && (
                <section className="rounded-3xl border border-ink bg-ink p-5 text-white sm:p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold">{t.newRequests}</h2>
                    <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-extrabold text-ink">
                      {offers.length}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {offers.map((offer) => (
                      <div key={offer.offer_id} className="rounded-2xl bg-white/[0.06] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-lime">
                              {CATEGORY_LABEL[offer.service_code][language]} ·{" "}
                              {Number(offer.distance_km).toFixed(1)} km
                            </p>
                            <p className="mt-2 text-[12px] font-semibold leading-5">
                              {offer.pickup_address}
                            </p>
                            <p className="mt-1 flex items-start gap-1 text-[12px] text-white/55">
                              <MapPin size={12} className="mt-0.5 shrink-0" />
                              {offer.dropoff_address}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-extrabold text-lime">
                            {formatTzs(Number(offer.estimated_fare), language)}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => respond(offer, true)}
                            disabled={busy === offer.ride_id}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-lime text-[12px] font-extrabold text-ink hover:bg-[#c9f78e] disabled:opacity-60"
                          >
                            {busy === offer.ride_id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            {t.accept}
                          </button>
                          <button
                            type="button"
                            onClick={() => respond(offer, false)}
                            disabled={busy === offer.ride_id}
                            className="inline-flex h-9 items-center rounded-full border border-white/20 px-4 text-[12px] font-bold text-white/70 hover:border-white/40 disabled:opacity-60"
                          >
                            {t.decline}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-ink">{t.activeRide}</h2>
                  {activeRide && (
                    <span className="rounded-full bg-sage-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-graphite-600">
                      {STATUS_LABEL[activeRide.status][language]}
                    </span>
                  )}
                </div>

                {!activeRide ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-sage-300 bg-sage-50/60 px-4 py-10 text-center">
                    <Navigation size={22} className="mx-auto text-sage-400" />
                    <p className="mt-3 text-[12px] leading-5 text-graphite-500">
                      {driver?.availability === "offline" ? t.goOnlineForRides : t.waitingForRides}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-leaf ring-4 ring-leaf/15" />
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-graphite-400">
                            {t.pickup}
                          </p>
                          <p className="text-[13px] font-semibold text-ink">{activeRide.pickup.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-ink ring-4 ring-ink/10" />
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-graphite-400">
                            {t.dropoff}
                          </p>
                          <p className="text-[13px] font-semibold text-ink">{activeRide.dropoff.address}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-sage-200 px-3 py-2.5">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-graphite-400">
                          {t.fare}
                        </p>
                        <p className="mt-1 text-[13px] font-bold text-ink">
                          {formatTzs(
                            Number(activeRide.finalFare ?? activeRide.estimatedFare ?? 0),
                            language,
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl border border-sage-200 px-3 py-2.5">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-graphite-400">
                          {t.payment}
                        </p>
                        <p className="mt-1 text-[13px] font-bold capitalize text-ink">
                          {activeRide.paymentMethod.replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    {activeRide.counterpart && (
                      <div className="mt-4 rounded-xl bg-sage-50 px-4 py-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-graphite-400">
                          {t.passenger}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className="text-[13px] font-bold text-ink">
                            {activeRide.counterpart.fullName ?? t.passengerFallback}
                          </p>
                          {activeRide.counterpart.phone && (
                            <a
                              href={`tel:${activeRide.counterpart.phone}`}
                              className="rounded-full bg-ink px-3 py-1.5 text-[10px] font-bold text-white"
                            >
                              {t.call}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <RideActions
                      ride={activeRide}
                      language={language}
                      busy={busy}
                      onAction={rideAction}
                    />
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
                <h2 className="text-sm font-extrabold text-ink">{t.earnings}</h2>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-graphite-400">
                      {t.availableBalance}
                    </p>
                    <p className="mt-1 font-display text-3xl leading-none text-ink">
                      {formatTzs(summary?.availableBalance ?? 0, language)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-2.5 py-1 text-[10px] font-bold text-graphite-500">
                    <Wallet size={12} />
                    {t.payoutsViaSupport}
                  </span>
                </div>
                <dl className="mt-5 space-y-2 border-t border-sage-100 pt-4 text-[12px]">
                  <div className="flex justify-between text-graphite-500">
                    <dt>{t.acceptanceRate}</dt>
                    <dd className="font-semibold text-ink">
                      {summary?.acceptanceRate === null || summary?.acceptanceRate === undefined
                        ? "—"
                        : `${summary.acceptanceRate}%`}
                    </dd>
                  </div>
                  <div className="flex justify-between text-graphite-500">
                    <dt>{t.pendingPayouts}</dt>
                    <dd className="font-semibold text-ink">
                      {formatTzs(summary?.pendingPayouts ?? 0, language)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-graphite-500">
                    <dt>{t.totalTrips}</dt>
                    <dd className="font-semibold text-ink">{summary?.totalTrips ?? 0}</dd>
                  </div>
                </dl>
                <p className="mt-4 rounded-xl bg-sage-50 px-3 py-2.5 text-[10px] leading-4 text-graphite-400">
                  {t.earningsNote}
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RideActions({
  ride,
  language,
  busy,
  onAction,
}: {
  ride: ActiveRide;
  language: Language;
  busy: string | null;
  onAction: (action: "arriving" | "arrived" | "start" | "complete" | "cash") => void;
}) {
  const t = language === "sw" ? SW : EN;
  const config: Partial<Record<RideStatus, { action: "arriving" | "arrived" | "start" | "complete" | "cash"; label: string }>> = {
    accepted: { action: "arriving", label: t.startHeading },
    driver_arriving: { action: "arrived", label: t.markArrived },
    driver_arrived: { action: "start", label: t.startRide },
    in_progress: { action: "complete", label: t.completeRide },
  };
  const next = config[ride.status];

  if (ride.status === "completed") {
    const paid = ride.paymentStatus === "paid";
    return (
      <div className="mt-5">
        {ride.paymentMethod === "cash" && !paid ? (
          <button
            type="button"
            onClick={() => onAction("cash")}
            disabled={busy === "cash"}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-leaf text-[13px] font-bold text-white hover:bg-deep disabled:opacity-60"
          >
            {busy === "cash" ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
            {t.confirmCash}
          </button>
        ) : (
          <p className="flex items-center gap-2 rounded-xl bg-leaf/10 px-3 py-2.5 text-[12px] font-semibold text-deep">
            <Check size={14} />
            {t.rideSettled}
          </p>
        )}
      </div>
    );
  }

  if (!next) return null;

  return (
    <button
      type="button"
      onClick={() => onAction(next.action)}
      disabled={busy === next.action}
      className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-bold text-white hover:bg-forest-800 disabled:opacity-60"
    >
      {busy === next.action ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Navigation size={14} />
      )}
      {next.label}
    </button>
  );
}

function VehicleForm({
  userId,
  language,
  onSaved,
  setError,
  setMessage,
}: {
  userId: string;
  language: Language;
  onSaved: () => Promise<void>;
  setError: (message: string | null) => void;
  setMessage: (message: string | null) => void;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const t = language === "sw" ? SW : EN;
  const [category, setCategory] = useState<VehicleCategory>("bajaji");
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [seats, setSeats] = useState("3");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.from("vehicles").insert({
        driver_id: userId,
        category,
        plate_number: plate.trim().toUpperCase(),
        make: make.trim() || null,
        model: model.trim() || null,
        model_year: year ? Number(year) : null,
        color: color.trim() || null,
        seats: Number(seats),
      });
      if (error) {
        setError(error.message);
        return;
      }
      setMessage(t.vehicleSaved);
      setPlate("");
      setMake("");
      setModel("");
      setYear("");
      setColor("");
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(CATEGORY_LABEL) as VehicleCategory[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setCategory(item);
              setSeats(item === "boda_boda" ? "1" : item === "bajaji" ? "3" : "4");
            }}
            className={cn(
              "h-10 rounded-xl border text-[12px] font-bold transition-colors",
              category === item
                ? "border-ink bg-ink text-white"
                : "border-sage-300 bg-white text-graphite-600",
            )}
          >
            {CATEGORY_LABEL[item][language]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t.plate} value={plate} onChange={setPlate} required placeholder="T 123 ABC" />
        <Input label={t.seats} value={seats} onChange={setSeats} type="number" min={1} max={8} required />
        <Input label={t.make} value={make} onChange={setMake} placeholder="Toyota" />
        <Input label={t.model} value={model} onChange={setModel} placeholder="Probox" />
        <Input label={t.year} value={year} onChange={setYear} type="number" placeholder="2018" />
        <Input label={t.color} value={color} onChange={setColor} placeholder={t.colorPlaceholder} />
      </div>
      <button
        type="submit"
        disabled={saving || !plate.trim()}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[12px] font-bold text-white hover:bg-forest-800 disabled:opacity-50"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        {t.saveVehicle}
      </button>
    </form>
  );
}

function DocumentUploader({
  userId,
  language,
  documents,
  onSaved,
  setError,
  setMessage,
}: {
  userId: string;
  language: Language;
  documents: DocumentRow[];
  onSaved: () => Promise<void>;
  setError: (message: string | null) => void;
  setMessage: (message: string | null) => void;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const t = language === "sw" ? SW : EN;
  const [type, setType] = useState<string>("national_id");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !file) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${type}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { error: insertError } = await supabase.from("driver_documents").insert({
        driver_id: userId,
        document_type: type,
        storage_path: path,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setMessage(t.documentSaved);
      setFile(null);
      await onSaved();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {DOC_TYPES.map((doc) => {
          const saved = documents.find((item) => item.document_type === doc.value);
          return (
            <div
              key={doc.value}
              className="flex items-center justify-between gap-2 rounded-xl border border-sage-200 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold text-graphite-600">
                <FileText size={13} className="text-graphite-400" />
                {doc[language]}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em]",
                  !saved
                    ? "bg-sage-100 text-graphite-400"
                    : saved.status === "approved"
                      ? "bg-leaf/15 text-deep"
                      : "bg-amber-50 text-amber-700",
                )}
              >
                {saved ? saved.status : t.missing}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={upload} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-10 rounded-xl border border-sage-300 bg-white px-3 text-[12px] font-semibold text-ink"
        >
          {DOC_TYPES.map((doc) => (
            <option key={doc.value} value={doc.value}>
              {doc[language]}
            </option>
          ))}
        </select>
        <label className="flex h-10 flex-1 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-sage-300 bg-white px-3 text-[11px] text-graphite-500 hover:border-leaf">
          <Camera size={14} />
          <span className="truncate">{file ? file.name : t.chooseFile}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
        <button
          type="submit"
          disabled={!file || uploading}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-[12px] font-bold text-white hover:bg-forest-800 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {t.upload}
        </button>
      </form>
      <p className="mt-2 text-[10px] leading-4 text-graphite-400">{t.uploadNote}</p>
    </div>
  );
}

function StatusChip({
  status,
  language,
}: {
  status: DriverRow["approval_status"];
  language: Language;
}) {
  const map = {
    draft: { sw: "Rasimu", en: "Draft", className: "bg-sage-100 text-graphite-500" },
    pending: { sw: "Inakaguliwa", en: "In review", className: "bg-amber-50 text-amber-700" },
    approved: { sw: "Imeidhinishwa", en: "Approved", className: "bg-leaf/15 text-deep" },
    rejected: { sw: "Imekataliwa", en: "Rejected", className: "bg-red-50 text-red-600" },
    suspended: { sw: "Imesimamishwa", en: "Suspended", className: "bg-red-50 text-red-600" },
  } as const;
  const item = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]",
        item.className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {item[language]}
    </span>
  );
}

function SectionTitle({ index, title, done }: { index: string; title: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-lg italic text-leaf">{index}</span>
      <h2 className="text-sm font-extrabold text-ink">{title}</h2>
      {done && (
        <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-leaf/15 text-deep">
          <Check size={11} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

function Requirement({ label, met }: { label: string; met: boolean }) {
  return (
    <li className="flex items-center gap-2 text-graphite-600">
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full",
          met ? "bg-leaf/15 text-deep" : "bg-sage-100 text-graphite-400",
        )}
      >
        {met ? <Check size={11} strokeWidth={3} /> : <Clock size={11} />}
      </span>
      {label}
    </li>
  );
}

function MiniStat({ light, label, value }: { light: boolean; label: string; value: string }) {
  return (
    <div className={cn("rounded-xl px-2 py-2", light ? "bg-white/10" : "bg-sage-50")}>
      <p
        className={cn(
          "text-[9px] font-extrabold uppercase tracking-[0.1em]",
          light ? "text-white/45" : "text-graphite-400",
        )}
      >
        {label}
      </p>
      <p className={cn("mt-1 text-[11px] font-bold", light ? "text-white" : "text-ink")}>{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-graphite-400">
        {label}
      </span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-sage-300 bg-white px-3 text-[12px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-graphite-400 focus:border-leaf"
      />
    </label>
  );
}

const SW = {
  eyebrow: "Kwa madereva wa Chunya",
  title: "Gari yako. Ratiba yako. Mapato yako.",
  subtitle:
    "Jisajili, wasilisha nyaraka na pata idhini. Kisha chagua lini upo mtandaoni na lini unapumzika.",
  cta: "Anza usajili",
  support: "Wasiliana na msaada",
  noFee: "Hakuna ada ya usajili inayotozwa kwenye ukurasa huu.",
  stepsTitle: "Jinsi usajili unavyofanya kazi",
  steps: [
    { title: "Fungua akaunti ya dereva", body: "Tumia barua pepe na neno la siri." },
    { title: "Ongeza chombo", body: "Boda, bajaji au gari — pamoja na namba ya chombo." },
    { title: "Wasilisha nyaraka", body: "Kitambulisho, leseni na kadi ya chombo." },
    { title: "Subiri idhini", body: "Msimamizi wa LENZI hukagua kabla ya safari ya kwanza." },
  ],
  requirements:
    "Unahitaji kitambulisho cha taifa, leseni halali ya udereva na chombo kilichosajiliwa. Nyaraka huhifadhiwa kwa faragha na huonekana kwa msimamizi pekee.",
  dashboard: "Dashibodi ya dereva",
  welcome: "Karibu tena.",
  signOut: "Toka",
  notConfigured: "Supabase haijawekwa. Weka URL na publishable key kwenye apps/web/.env.local.",
  vehicleTitle: "Chombo chako",
  vehicleDetailsPending: "Maelezo zaidi bado",
  plate: "Namba ya chombo",
  seats: "Nafasi",
  make: "Chapa",
  model: "Modeli",
  year: "Mwaka",
  color: "Rangi",
  colorPlaceholder: "Nyeupe",
  saveVehicle: "Hifadhi chombo",
  vehicleSaved: "Chombo kimehifadhiwa. Kinasubiri ukaguzi.",
  documentsTitle: "Nyaraka",
  documentsBody: "Pakia picha au PDF iliyo wazi. Ukubwa wa juu ni 10MB kwa faili.",
  missing: "Haipo",
  chooseFile: "Chagua faili",
  upload: "Pakia",
  uploadNote: "Nyaraka huonekana kwa wewe na msimamizi wa LENZI pekee. Hazionyeshwi kwa abiria.",
  documentSaved: "Nyaraka imepakiwa.",
  submitTitle: "Wasilisha maombi",
  reqVehicle: "Chombo kilichosajiliwa",
  reqId: "Kitambulisho cha taifa",
  reqLicence: "Leseni ya udereva",
  reqRegistration: "Kadi ya chombo",
  rejectionReason: "Sababu",
  submit: "Wasilisha kwa ukaguzi",
  underReview: "Inakaguliwa",
  submitted: "Maombi yamewasilishwa. Msimamizi atakagua nyaraka zako.",
  reviewNote: "Utapata taarifa ndani ya app mara maombi yako yatakapokaguliwa.",
  availability: "Upatikanaji",
  online: "Upo mtandaoni",
  offline: "Upo nje ya mtandao",
  onlineNote: "Unaweza kupokea maombi ya safari karibu nawe.",
  offlineNote: "Weka mtandaoni ili kupokea maombi ya safari.",
  nowOnline: "Upo mtandaoni. Tafuta eneo lako ili kupokea maombi.",
  nowOffline: "Upo nje ya mtandao. Eneo lako haliandikwi.",
  today: "Leo",
  week: "Wiki",
  trips: "Safari",
  newRequests: "Maombi mapya",
  accept: "Kubali",
  decline: "Kataa",
  activeRide: "Safari inayoendelea",
  waitingForRides: "Subiri maombi ya safari. Yataonekana hapa.",
  goOnlineForRides: "Weka mtandaoni ili kupokea maombi.",
  pickup: "Kuchukua",
  dropoff: "Kushusha",
  fare: "Bei",
  payment: "Malipo",
  passenger: "Abiria",
  passengerFallback: "Abiria wa LENZI",
  call: "Piga simu",
  startHeading: "Ninaelekea kuchukua",
  markArrived: "Nimefika",
  startRide: "Anza safari",
  completeRide: "Kamilisha safari",
  confirmCash: "Thibitisha malipo ya taslimu",
  rideSettled: "Safari imelipwa.",
  earnings: "Mapato",
  availableBalance: "Salio linalopatikana",
  payoutsViaSupport: "Malipo kwa msaada",
  acceptanceRate: "Kiwango cha kukubali",
  pendingPayouts: "Malipo yanayosubiri",
  totalTrips: "Safari zote",
  earningsNote:
    "Malipo ya taslimu huthibitishwa na dereva. Malipo ya pesa za simu yanahitaji mtoa huduma aliyeidhinishwa.",
};

const EN: typeof SW = {
  eyebrow: "For Chunya drivers",
  title: "Your vehicle. Your schedule. Your earnings.",
  subtitle:
    "Register, submit your documents and get approved. Then choose when you are online and when you rest.",
  cta: "Start registration",
  support: "Contact support",
  noFee: "No registration fee is charged on this page.",
  stepsTitle: "How registration works",
  steps: [
    { title: "Create a driver account", body: "Use email and password." },
    { title: "Add your vehicle", body: "Boda, bajaji or car — with the plate number." },
    { title: "Submit documents", body: "ID, licence and vehicle registration." },
    { title: "Wait for approval", body: "A LENZI administrator reviews before your first ride." },
  ],
  requirements:
    "You need a national ID, a valid driving licence and a registered vehicle. Documents stay private and are visible only to the administrator.",
  dashboard: "Driver dashboard",
  welcome: "Welcome back.",
  signOut: "Sign out",
  notConfigured: "Supabase is not configured. Set the URL and publishable key in apps/web/.env.local.",
  vehicleTitle: "Your vehicle",
  vehicleDetailsPending: "More details pending",
  plate: "Plate number",
  seats: "Seats",
  make: "Make",
  model: "Model",
  year: "Year",
  color: "Colour",
  colorPlaceholder: "White",
  saveVehicle: "Save vehicle",
  vehicleSaved: "Vehicle saved. It is awaiting review.",
  documentsTitle: "Documents",
  documentsBody: "Upload a clear photo or PDF. Maximum 10MB per file.",
  missing: "Missing",
  chooseFile: "Choose a file",
  upload: "Upload",
  uploadNote: "Documents are visible only to you and the LENZI administrator. Passengers never see them.",
  documentSaved: "Document uploaded.",
  submitTitle: "Submit application",
  reqVehicle: "Registered vehicle",
  reqId: "National ID",
  reqLicence: "Driving licence",
  reqRegistration: "Vehicle registration",
  rejectionReason: "Reason",
  submit: "Submit for review",
  underReview: "Under review",
  submitted: "Application submitted. An administrator will review your documents.",
  reviewNote: "You will be notified in the app once your application has been reviewed.",
  availability: "Availability",
  online: "You are online",
  offline: "You are offline",
  onlineNote: "You can receive ride requests near you.",
  offlineNote: "Go online to receive ride requests.",
  nowOnline: "You are online. Share your location to receive nearby requests.",
  nowOffline: "You are offline. Your location is no longer recorded.",
  today: "Today",
  week: "Week",
  trips: "Trips",
  newRequests: "New requests",
  accept: "Accept",
  decline: "Decline",
  activeRide: "Active ride",
  waitingForRides: "Waiting for ride requests. They will appear here.",
  goOnlineForRides: "Go online to receive requests.",
  pickup: "Pickup",
  dropoff: "Drop-off",
  fare: "Fare",
  payment: "Payment",
  passenger: "Passenger",
  passengerFallback: "LENZI passenger",
  call: "Call",
  startHeading: "Heading to pickup",
  markArrived: "I have arrived",
  startRide: "Start ride",
  completeRide: "Complete ride",
  confirmCash: "Confirm cash payment",
  rideSettled: "Ride settled.",
  earnings: "Earnings",
  availableBalance: "Available balance",
  payoutsViaSupport: "Payouts via support",
  acceptanceRate: "Acceptance rate",
  pendingPayouts: "Pending payouts",
  totalTrips: "Total trips",
  earningsNote:
    "Cash payments are confirmed by the driver. Mobile money payouts require an approved provider integration.",
};
