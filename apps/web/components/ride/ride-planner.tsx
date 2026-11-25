"use client";

import type { LatLng, RideStatus, VehicleCategory } from "@lenzi/shared";
import { formatDistance, formatTzs, relativeMinutes } from "@lenzi/shared";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Check,
  CircleAlert,
  Crosshair,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChunyaMap } from "@/components/ride/chunya-map";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

type Language = "sw" | "en";

interface ServiceTypeRow {
  id: string;
  code: VehicleCategory;
  name_sw: string;
  name_en: string;
  description_sw: string;
  description_en: string;
  seats: number;
}

interface QuoteBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  subtotal: number;
  discount: number;
  total: number;
  minimumApplied: boolean;
}

interface Quote {
  serviceTypeId: string;
  operatingAreaId: string;
  distanceKm: number;
  durationMinutes: number;
  estimateSource: string;
  total: number;
  fareBreakdown: QuoteBreakdown;
}

interface RideDetail {
  id: string;
  status: RideStatus;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  estimatedDistanceKm: number | null;
  estimatedDurationMinutes: number | null;
  fareBreakdown: (QuoteBreakdown & { commissionAmount?: number }) | null;
  estimatedFare: number | null;
  finalFare: number | null;
  paymentMethod: string;
  paymentStatus: string | null;
  cancellationFee: number | null;
  counterpart: {
    fullName: string | null;
    phone: string | null;
    rating: number | null;
    totalTrips: number | null;
    vehicle: {
      make: string | null;
      model: string | null;
      color: string | null;
      plateNumber: string | null;
    } | null;
  } | null;
  driverLocation: { lat: number; lng: number } | null;
  events: { eventType: string; toStatus: string | null; createdAt: string }[];
}

const FALLBACK_SERVICES: ServiceTypeRow[] = [
  {
    id: "boda",
    code: "boda_boda",
    name_sw: "Boda Boda",
    name_en: "Boda Boda",
    description_sw: "Haraka kwa safari fupi na barabara nyembamba.",
    description_en: "Fast for short trips and narrow streets.",
    seats: 1,
  },
  {
    id: "bajaji",
    code: "bajaji",
    name_sw: "Bajaji",
    name_en: "Bajaji",
    description_sw: "Nafasi ya kati kwa safari za mjini.",
    description_en: "The middle ground for town trips.",
    seats: 3,
  },
  {
    id: "car",
    code: "car",
    name_sw: "Magari",
    name_en: "Cars",
    description_sw: "Faraja zaidi kwa familia na mizigo.",
    description_en: "More comfort for families and luggage.",
    seats: 4,
  },
];

const STATUS_COPY: Record<RideStatus, { sw: string; en: string; note: { sw: string; en: string } }> = {
  requested: {
    sw: "Ombi limepokelewa",
    en: "Request received",
    note: { sw: "Tunatafuta dereva.", en: "We are finding a driver." },
  },
  searching: {
    sw: "Tunatafuta dereva",
    en: "Finding your driver",
    note: {
      sw: "Madereva waliokaribu wanapokea ombi lako.",
      en: "Nearby drivers are receiving your request.",
    },
  },
  accepted: {
    sw: "Dereva amepatikana",
    en: "Driver assigned",
    note: { sw: "Dereva wako anaandaa safari.", en: "Your driver is preparing the ride." },
  },
  driver_arriving: {
    sw: "Dereva anakuja",
    en: "Driver on the way",
    note: { sw: "Fuatilia dereva hadi mahali ulipo.", en: "Track your driver to the pickup point." },
  },
  driver_arrived: {
    sw: "Dereva amefika",
    en: "Driver has arrived",
    note: { sw: "Karibu. Thibitisha chombo kabla ya kuanza.", en: "Check the vehicle before you start." },
  },
  in_progress: {
    sw: "Safari inaendelea",
    en: "Ride in progress",
    note: { sw: "Fika salama.", en: "Travel safely." },
  },
  completed: {
    sw: "Safari imekamilika",
    en: "Ride completed",
    note: { sw: "Asante kwa kutumia LENZI.", en: "Thank you for riding with LENZI." },
  },
  cancelled: {
    sw: "Safari imeghairiwa",
    en: "Ride cancelled",
    note: { sw: "Safari hii imeghairiwa.", en: "This ride has been cancelled." },
  },
  no_driver_found: {
    sw: "Hakuna dereva",
    en: "No driver found",
    note: {
      sw: "Hakuna dereva aliyepatikana karibu. Jaribu tena.",
      en: "No nearby driver was available. Please try again.",
    },
  },
  disputed: {
    sw: "Inachunguzwa",
    en: "Under review",
    note: { sw: "Timu ya msaada inachunguza safari hii.", en: "Support is reviewing this ride." },
  },
};

export function RidePlanner() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [language, setLanguage] = useState<Language>("sw");
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [services, setServices] = useState<ServiceTypeRow[]>(supabase ? [] : FALLBACK_SERVICES);
  const [servicesState, setServicesState] = useState<"loading" | "ready" | "unavailable">(
    supabase ? "loading" : "unavailable",
  );
  const [serviceId, setServiceId] = useState<string>("");
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "error">("idle");
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [promo, setPromo] = useState("");
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = language === "sw" ? SW : EN;

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
    if (!supabase) return;
    let active = true;
    supabase
      .from("service_types")
      .select("id, code, name_sw, name_en, description_sw, description_en, seats")
      .eq("active", true)
      .order("sort_order")
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data || data.length === 0) {
          setServicesState("unavailable");
          setServices(FALLBACK_SERVICES);
          return;
        }
        setServices(data as ServiceTypeRow[]);
        setServiceId((current) => current || (data[0] as ServiceTypeRow).id);
        setServicesState("ready");
      });
    return () => {
      active = false;
    };
  }, [supabase]);

  const loadRide = useCallback(
    async (rideId: string) => {
      if (!supabase) return;
      const { data, error } = await supabase.rpc("get_ride_detail", {
        p_ride_id: rideId,
      });
      if (!error && data) {
        setRide(data as RideDetail);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    supabase
      .from("rides")
      .select("id")
      .eq("passenger_id", userId)
      .in("status", [
        "requested",
        "searching",
        "accepted",
        "driver_arriving",
        "driver_arrived",
        "in_progress",
      ])
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.id) {
          void loadRide(data.id);
        }
      });
    return () => {
      active = false;
    };
  }, [supabase, userId, loadRide]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!ride || ["completed", "cancelled", "no_driver_found"].includes(ride.status)) {
      return;
    }
    pollRef.current = setInterval(() => {
      void loadRide(ride.id);
    }, 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ride, loadRide]);

  useEffect(() => {
    if (!supabase || !pickup || !dropoff || !serviceId || servicesState !== "ready") return;

    let active = true;
    const timer = setTimeout(async () => {
      setQuoteState("loading");
      setQuoteError(null);
      const { data, error } = await supabase.rpc("quote_ride", {
        p_service_type_id: serviceId,
        p_pickup_lat: pickup.lat,
        p_pickup_lng: pickup.lng,
        p_dropoff_lat: dropoff.lat,
        p_dropoff_lng: dropoff.lng,
      });
      if (!active) return;
      if (error) {
        setQuote(null);
        setQuoteState("error");
        setQuoteError(error.message);
        return;
      }
      setQuote(data as Quote);
      setQuoteState("idle");
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [supabase, pickup, dropoff, serviceId, servicesState]);

  function useMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(t.geoUnsupported);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickup({
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        });
        setPickupAddress(t.gpsAddress);
        setLocating(false);
      },
      () => {
        setGeoError(t.geoDenied);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function pickDropoff(point: LatLng) {
    setDropoff(point);
    setDropoffAddress(`${t.pinnedAddress} (${point.lat}, ${point.lng})`);
  }

  async function requestRide() {
    if (!supabase || !quote || !pickup || !dropoff) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const { data, error } = await supabase.rpc("request_ride", {
        p_service_type_id: serviceId,
        p_pickup_lat: pickup.lat,
        p_pickup_lng: pickup.lng,
        p_pickup_address: pickupAddress,
        p_dropoff_lat: dropoff.lat,
        p_dropoff_lng: dropoff.lng,
        p_dropoff_address: dropoffAddress,
        p_payment_method: "cash",
        p_client_request_id: crypto.randomUUID(),
        p_promotion_code: promo.trim() || null,
      });
      if (error) {
        setActionError(error.message);
        return;
      }
      setRide(data as RideDetail);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRide() {
    if (!supabase || !ride) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const { data, error } = await supabase.rpc("cancel_ride", {
        p_ride_id: ride.id,
        p_reason: "Cancelled by passenger in web app",
      });
      if (error) {
        setActionError(error.message);
        return;
      }
      setRide(data as RideDetail);
    } finally {
      setSubmitting(false);
    }
  }

  function resetRide() {
    setRide(null);
    setQuote(null);
    setDropoff(null);
    setDropoffAddress("");
    setPromo("");
  }

  const selected = services.find((service) => service.id === serviceId) ?? services[0];

  return (
    <div className="bg-mist pb-20 pt-10 sm:pt-14">
      <div className="container-lenzi">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sage-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-graphite-500">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
              {t.eyebrow}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[42px] sm:leading-[1.05]">
              {t.title}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-graphite-500">{t.subtitle}</p>
          </div>
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
        </div>

        {!isSupabaseConfigured && (
          <Notice tone="amber" title={t.notConfiguredTitle}>
            {t.notConfiguredBody}
          </Notice>
        )}

        {servicesState === "unavailable" && isSupabaseConfigured && (
          <Notice tone="amber" title={t.catalogueUnavailableTitle}>
            {t.catalogueUnavailableBody}
          </Notice>
        )}

        {!authReady ? (
          <div className="mt-10 grid place-items-center rounded-3xl border border-sage-200 bg-white py-24">
            <Loader2 className="animate-spin text-leaf" />
          </div>
        ) : ride ? (
          <RideStatusPanel
            ride={ride}
            language={language}
            onRefresh={() => void loadRide(ride.id)}
            onCancel={cancelRide}
            onReset={resetRide}
            busy={submitting}
            error={actionError}
          />
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-7">
              <StepHeader index="01" title={t.routeTitle} />

              <div className="mt-5 space-y-4">
                <div className="relative rounded-2xl border border-sage-200 bg-sage-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-leaf/15 text-leaf">
                      <span className="h-2 w-2 rounded-full bg-leaf" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-graphite-400">
                        {t.pickupLabel}
                      </p>
                      <input
                        value={pickupAddress}
                        onChange={(event) => setPickupAddress(event.target.value)}
                        placeholder={t.pickupPlaceholder}
                        className="mt-1 w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-graphite-400"
                      />
                      <p className="mt-1 text-[11px] text-graphite-400">
                        {pickup
                          ? `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`
                          : t.noPickup}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={useMyLocation}
                      disabled={locating}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sage-300 bg-white px-3 py-2 text-[11px] font-bold text-deep hover:border-leaf"
                    >
                      {locating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Crosshair size={13} />
                      )}
                      {t.locate}
                    </button>
                  </div>
                  {geoError && (
                    <p className="mt-2 pl-10 text-[11px] leading-5 text-amber-700">{geoError}</p>
                  )}
                </div>

                <div className="relative rounded-2xl border border-sage-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-lime">
                      <MapPin size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-graphite-400">
                        {t.dropoffLabel}
                      </p>
                      <input
                        value={dropoffAddress}
                        onChange={(event) => setDropoffAddress(event.target.value)}
                        placeholder={t.dropoffPlaceholder}
                        className="mt-1 w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-graphite-400"
                      />
                      <p className="mt-1 text-[11px] text-graphite-400">
                        {dropoff
                          ? `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}`
                          : t.noDropoff}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <StepHeader index="02" title={t.chooseTitle} />
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {services.map((service) => {
                    const active = service.id === serviceId;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setServiceId(service.id)}
                        disabled={servicesState !== "ready"}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition-all",
                          active
                            ? "border-ink bg-ink text-white shadow-float"
                            : "border-sage-200 bg-white text-ink hover:border-sage-400",
                          servicesState !== "ready" && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[10px] font-extrabold uppercase tracking-[0.16em]",
                            active ? "text-lime" : "text-graphite-400",
                          )}
                        >
                          {service.seats} {language === "sw" ? "abiria" : "seats"}
                        </span>
                        <span className="mt-1 block text-sm font-extrabold">
                          {language === "sw" ? service.name_sw : service.name_en}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block text-[11px] leading-4",
                            active ? "text-white/55" : "text-graphite-500",
                          )}
                        >
                          {language === "sw" ? service.description_sw : service.description_en}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <StepHeader index="03" title={t.paymentTitle} />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink bg-white p-4">
                    <Banknote size={18} className="mt-0.5 text-leaf" />
                    <div>
                      <p className="text-sm font-bold text-ink">{t.cash}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-graphite-500">{t.cashNote}</p>
                    </div>
                    <Check size={16} className="ml-auto text-leaf" />
                  </div>
                  <div className="rounded-2xl border border-dashed border-sage-300 bg-sage-50/60 p-4 opacity-70">
                    <p className="text-sm font-bold text-graphite-500">{t.mobileMoney}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-graphite-400">{t.mobileNote}</p>
                  </div>
                </div>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-graphite-400">
                  {t.promo}
                </span>
                <input
                  value={promo}
                  onChange={(event) => setPromo(event.target.value.toUpperCase())}
                  placeholder={t.promoPlaceholder}
                  className="h-11 w-full rounded-xl border border-sage-300 bg-white px-3 text-sm font-semibold uppercase tracking-wide text-ink outline-none focus:border-leaf"
                />
              </label>
            </section>

            <section className="space-y-5">
              <ChunyaMap
                pickup={pickup}
                dropoff={dropoff}
                onPick={pickDropoff}
                className="h-[320px] sm:h-[360px]"
              />
              <p className="flex items-start gap-2 px-1 text-[11px] leading-5 text-graphite-400">
                <MapPin size={13} className="mt-0.5 shrink-0" />
                {t.mapHint}
              </p>

              <div className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-sm font-extrabold text-ink">{t.summaryTitle}</h2>
                  {quoteState === "loading" && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-graphite-400">
                      <Loader2 size={12} className="animate-spin" />
                      {t.calculating}
                    </span>
                  )}
                </div>

                {quote ? (
                  <>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="font-display text-4xl leading-none tracking-[-0.02em] text-ink">
                          {formatTzs(quote.total, language)}
                        </p>
                        <p className="mt-1.5 text-[11px] text-graphite-400">
                          {formatDistance(quote.distanceKm, language)} ·{" "}
                          {relativeMinutes(quote.durationMinutes, language)} · {t.estimate}
                        </p>
                      </div>
                      <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-deep">
                        {selected
                          ? language === "sw"
                            ? selected.name_sw
                            : selected.name_en
                          : ""}
                      </span>
                    </div>

                    <dl className="mt-4 space-y-2 border-t border-sage-100 pt-4 text-[12px]">
                      <Row label={t.base} value={formatTzs(quote.fareBreakdown.baseFare, language)} />
                      <Row
                        label={t.distance}
                        value={formatTzs(quote.fareBreakdown.distanceFare, language)}
                      />
                      <Row label={t.time} value={formatTzs(quote.fareBreakdown.timeFare, language)} />
                      {quote.fareBreakdown.minimumApplied && (
                        <p className="text-[11px] text-graphite-400">{t.minimumApplied}</p>
                      )}
                      <div className="flex items-center justify-between border-t border-sage-100 pt-2 text-sm font-extrabold text-ink">
                        <span>{t.total}</span>
                        <span>{formatTzs(quote.fareBreakdown.total, language)}</span>
                      </div>
                    </dl>
                    <p className="mt-3 text-[11px] leading-4 text-graphite-400">{t.fareNote}</p>
                  </>
                ) : quoteState === "error" ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-900">
                    {quoteError ?? t.quoteFailed}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-sage-300 bg-sage-50/60 px-4 py-6 text-center text-[12px] leading-5 text-graphite-500">
                    {pickup && dropoff ? t.quoteWaiting : t.quotePrompt}
                  </div>
                )}

                {actionError && (
                  <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700">
                    {actionError}
                  </p>
                )}

                {!userId ? (
                  <Link
                    href="/auth/login?next=/ride"
                    className="mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white hover:bg-forest-800"
                  >
                    {t.signInToBook}
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={requestRide}
                    disabled={
                      submitting ||
                      !quote ||
                      !pickup ||
                      !dropoff ||
                      !pickupAddress.trim() ||
                      !dropoffAddress.trim() ||
                      servicesState !== "ready"
                    }
                    className="mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-leaf text-sm font-bold text-white transition-all hover:bg-deep disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t.requesting}
                      </>
                    ) : (
                      <>
                        {t.confirm}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                )}
                <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-4 text-graphite-400">
                  <ShieldCheck size={12} className="mt-0.5 shrink-0" />
                  {t.confirmNote}
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function RideStatusPanel({
  ride,
  language,
  onRefresh,
  onCancel,
  onReset,
  busy,
  error,
}: {
  ride: RideDetail;
  language: Language;
  onRefresh: () => void;
  onCancel: () => void;
  onReset: () => void;
  busy: boolean;
  error: string | null;
}) {
  const t = language === "sw" ? SW : EN;
  const status = STATUS_COPY[ride.status];
  const terminal = ["completed", "cancelled", "no_driver_found"].includes(ride.status);
  const active = !terminal;
  const fare = ride.finalFare ?? ride.estimatedFare;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-3xl border border-sage-200 bg-white p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em]",
                ride.status === "completed"
                  ? "bg-leaf/10 text-deep"
                  : ride.status === "cancelled" || ride.status === "no_driver_found"
                    ? "bg-red-50 text-red-600"
                    : "bg-ink text-lime",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {language === "sw" ? status.sw : status.en}
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-ink">
              {language === "sw" ? status.note.sw : status.note.en}
            </h2>
            <p className="mt-2 text-[12px] text-graphite-400">
              {t.rideId}: {ride.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          {active && (
            <button
              type="button"
              onClick={onRefresh}
              aria-label={t.refresh}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sage-300 text-graphite-500 hover:border-leaf hover:text-deep"
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <Leg
            tone="leaf"
            label={t.pickupLabel}
            address={ride.pickup.address}
          />
          <Leg
            tone="ink"
            label={t.dropoffLabel}
            address={ride.dropoff.address}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat label={t.fareLabel} value={fare ? formatTzs(fare, language) : "—"} />
          <Stat
            label={t.paymentLabel}
            value={ride.paymentStatus ? `${t.cash} · ${ride.paymentStatus}` : t.cash}
          />
        </div>

        {ride.counterpart && (
          <div className="mt-6 rounded-2xl border border-sage-200 bg-sage-50/60 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-graphite-400">
              {t.yourDriver}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-ink">
                  {ride.counterpart.fullName ?? t.driverFallback}
                </p>
                <p className="mt-0.5 text-[11px] text-graphite-500">
                  {[
                    ride.counterpart.vehicle?.make,
                    ride.counterpart.vehicle?.model,
                    ride.counterpart.vehicle?.color,
                  ]
                    .filter(Boolean)
                    .join(" · ") || t.vehiclePending}
                </p>
                {ride.counterpart.vehicle?.plateNumber && (
                  <p className="mt-1 inline-flex rounded bg-ink px-2 py-0.5 text-[11px] font-bold tracking-wider text-lime">
                    {ride.counterpart.vehicle.plateNumber}
                  </p>
                )}
              </div>
              <div className="text-right">
                {ride.counterpart.rating !== null && (
                  <p className="inline-flex items-center gap-1 text-sm font-bold text-ink">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    {ride.counterpart.rating.toFixed(1)}
                  </p>
                )}
                {ride.counterpart.phone && (
                  <a
                    href={`tel:${ride.counterpart.phone}`}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-[11px] font-bold text-white"
                  >
                    <Phone size={12} />
                    {t.call}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {active && ["requested", "searching", "accepted", "driver_arriving", "driver_arrived"].includes(ride.status) && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-red-200 px-5 text-[13px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              {t.cancelRide}
            </button>
          )}
          {terminal && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-bold text-white hover:bg-forest-800"
            >
              {t.bookAnother}
              <ArrowRight size={14} />
            </button>
          )}
          {ride.status === "in_progress" && (
            <p className="rounded-xl bg-sage-50 px-4 py-3 text-[11px] leading-5 text-graphite-500">
              {t.inProgressNote}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-5">
        <ChunyaMap
          pickup={{ lat: ride.pickup.lat, lng: ride.pickup.lng }}
          dropoff={{ lat: ride.dropoff.lat, lng: ride.dropoff.lng }}
          className="h-[340px]"
        />
        {ride.driverLocation && (
          <div className="rounded-2xl border border-sage-200 bg-white px-4 py-3 text-[12px] text-graphite-500">
            <span className="font-bold text-ink">{t.driverPosition}:</span>{" "}
            {ride.driverLocation.lat.toFixed(4)}, {ride.driverLocation.lng.toFixed(4)}
            <p className="mt-1 text-[10px] text-graphite-400">{t.driverPositionNote}</p>
          </div>
        )}
        <div className="rounded-3xl border border-sage-200 bg-white p-5">
          <h3 className="text-sm font-extrabold text-ink">{t.timeline}</h3>
          <ol className="mt-4 space-y-3">
            {ride.events.map((event) => (
              <li key={`${event.eventType}-${event.createdAt}`} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />
                <div>
                  <p className="text-[12px] font-semibold text-ink">
                    {event.toStatus
                      ? (language === "sw"
                          ? STATUS_COPY[event.toStatus as RideStatus]?.sw
                          : STATUS_COPY[event.toStatus as RideStatus]?.en) ??
                        event.eventType
                      : event.eventType}
                  </p>
                  <p className="text-[10px] text-graphite-400">
                    {new Date(event.createdAt).toLocaleString(
                      language === "sw" ? "sw-TZ" : "en-TZ",
                    )}
                  </p>
                </div>
              </li>
            ))}
            {ride.events.length === 0 && (
              <li className="text-[12px] text-graphite-400">{t.noEvents}</li>
            )}
          </ol>
        </div>
      </section>
    </div>
  );
}

function StepHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-lg italic text-leaf">{index}</span>
      <h2 className="text-sm font-extrabold tracking-[-0.01em] text-ink">{title}</h2>
      <span className="h-px flex-1 bg-sage-100" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-graphite-500">
      <dt>{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sage-200 px-3 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-graphite-400">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-bold text-ink">{value}</p>
    </div>
  );
}

function Leg({ tone, label, address }: { tone: "leaf" | "ink"; label: string; address: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
          tone === "leaf" ? "bg-leaf ring-4 ring-leaf/15" : "bg-ink ring-4 ring-ink/10",
        )}
      />
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-graphite-400">
          {label}
        </p>
        <p className="mt-0.5 text-[13px] font-semibold leading-5 text-ink">{address || "—"}</p>
      </div>
    </div>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: "amber" | "red";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3.5",
        tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      <CircleAlert size={16} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-[13px] font-bold">{title}</p>
        <p className="mt-0.5 text-[12px] leading-5 opacity-80">{children}</p>
      </div>
    </div>
  );
}

const SW = {
  eyebrow: "Chunya · Safari ya moja kwa moja",
  title: "Sema unakwenda wapi. Bei inakuja kwanza.",
  subtitle:
    "Chagua mahali pa kuanzia na unakokwenda. Mfumo huhesabu na kuthibitisha bei kabla ya ombi kutumwa kwa dereva.",
  notConfiguredTitle: "Supabase haijawekwa",
  notConfiguredBody:
    "Weka NEXT_PUBLIC_SUPABASE_URL na NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY kwenye apps/web/.env.local ili kuwezesha maombi halisi.",
  catalogueUnavailableTitle: "Orodha ya huduma haijasomwa",
  catalogueUnavailableBody:
    "Hifadhidata haijawa tayari au muunganisho umeshindikana. Hakikisha migrations zimewekwa kwenye mradi wa Supabase.",
  routeTitle: "Safari yako",
  pickupLabel: "Mahali ulipo",
  dropoffLabel: "Unakwenda wapi",
  pickupPlaceholder: "Mfano: Chunya mjini",
  dropoffPlaceholder: "Chagua kwenye ramani au andika mahali",
  noPickup: "Bado hakuna mahali pa kuanzia",
  noDropoff: "Bado hakuna mahali pa mwisho",
  locate: "Nitumie eneo langu",
  gpsAddress: "Eneo langu la sasa (GPS)",
  pinnedAddress: "Mahali nilichagua kwenye ramani",
  geoUnsupported: "Kifaa hiki hakitumii huduma ya eneo.",
  geoDenied: "Ruhusa ya eneo imekataliwa. Weka mahali kwa mkono au chagua kwenye ramani.",
  chooseTitle: "Chagua aina ya safari",
  paymentTitle: "Njia ya malipo",
  cash: "Pesa taslimu",
  cashNote: "Unalipa dereva baada ya safari kukamilika.",
  mobileMoney: "Pesa za simu",
  mobileNote: "Inahitaji mtoa huduma wa malipo aliyeidhinishwa. Bado haijawashwa.",
  promo: "Nambari ya ofa (si lazima)",
  promoPlaceholder: "MFANO: LENZI10",
  summaryTitle: "Muhtasari wa bei",
  calculating: "Tunahesabu…",
  estimate: "makadirio ya mfumo",
  base: "Bei ya kuanzia",
  distance: "Umbali",
  time: "Muda",
  total: "Jumla",
  minimumApplied: "Bei ya chini zaidi ya safari imetumika.",
  fareNote: "Bei hii inatoka kwa kanuni za eneo lililoidhinishwa. Malipo ya kusubiri yanaweza kuongezwa.",
  quotePrompt: "Weka mahali pa kuanzia na mwisho ili kuona bei.",
  quoteWaiting: "Tunatafuta kanuni ya bei kwa eneo hili…",
  quoteFailed: "Bei haikuweza kuhesabiwa kwa eneo hili.",
  signInToBook: "Ingia ili kuomba safari",
  confirm: "Thibitisha safari",
  requesting: "Tunatuma ombi…",
  confirmNote: "Ombi litaenda kwa madereva waliothibitishwa waliokaribu. Hakuna malipo yanayotozwa sasa.",
  mapHint: "Gusa ramani kuweka mahali pa mwisho. Ramani hii ni ya mfano; mfumo huhakiki kuratibu.",
  rideId: "Namba ya safari",
  refresh: "Sasisha",
  fareLabel: "Bei",
  paymentLabel: "Malipo",
  yourDriver: "Dereva wako",
  driverFallback: "Dereva wa LENZI",
  vehiclePending: "Taarifa za chombo zitathibitishwa",
  call: "Piga simu",
  cancelRide: "Ghairi safari",
  bookAnother: "Omba safari nyingine",
  inProgressNote: "Safari inaendelea. Kwa usaidizi wa dharura, wasiliana na msaada wa LENZI.",
  driverPosition: "Eneo la dereva",
  driverPositionNote: "Eneo linasasishwa na dereva wakati wa safari.",
  timeline: "Matukio ya safari",
  noEvents: "Hakuna matukio bado.",
};

const EN: typeof SW = {
  eyebrow: "Chunya · Direct booking",
  title: "Say where you're going. See the price first.",
  subtitle:
    "Set your pickup and destination. The platform calculates and validates the fare before your request reaches a driver.",
  notConfiguredTitle: "Supabase is not configured",
  notConfiguredBody:
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/web/.env.local to enable live requests.",
  catalogueUnavailableTitle: "Service catalogue unavailable",
  catalogueUnavailableBody:
    "The database is not ready or the connection failed. Confirm the migrations have been applied to the Supabase project.",
  routeTitle: "Your ride",
  pickupLabel: "Pickup",
  dropoffLabel: "Destination",
  pickupPlaceholder: "e.g. Chunya town",
  dropoffPlaceholder: "Pick a point on the map or type a place",
  noPickup: "No pickup point yet",
  noDropoff: "No destination yet",
  locate: "Use my location",
  gpsAddress: "My current location (GPS)",
  pinnedAddress: "Pinned on map",
  geoUnsupported: "This device does not support location services.",
  geoDenied: "Location permission was denied. Enter a place manually or pick it on the map.",
  chooseTitle: "Choose your ride",
  paymentTitle: "Payment method",
  cash: "Cash",
  cashNote: "Pay the driver when the ride is complete.",
  mobileMoney: "Mobile money",
  mobileNote: "Requires an approved payment provider. Not enabled yet.",
  promo: "Promo code (optional)",
  promoPlaceholder: "E.G. LENZI10",
  summaryTitle: "Fare summary",
  calculating: "Calculating…",
  estimate: "platform estimate",
  base: "Base fare",
  distance: "Distance",
  time: "Time",
  total: "Total",
  minimumApplied: "The minimum fare for this service applies.",
  fareNote: "This fare comes from the approved area's fare rule. Waiting time may be added.",
  quotePrompt: "Set a pickup and destination to see the fare.",
  quoteWaiting: "Looking up the fare rule for this area…",
  quoteFailed: "A fare could not be calculated for this area.",
  signInToBook: "Sign in to request a ride",
  confirm: "Confirm ride",
  requesting: "Sending request…",
  confirmNote: "Your request goes to nearby verified drivers. No payment is taken now.",
  mapHint: "Tap the map to place the destination. This map is illustrative; the platform validates the coordinates.",
  rideId: "Ride number",
  refresh: "Refresh",
  fareLabel: "Fare",
  paymentLabel: "Payment",
  yourDriver: "Your driver",
  driverFallback: "LENZI driver",
  vehiclePending: "Vehicle details will be confirmed",
  call: "Call",
  cancelRide: "Cancel ride",
  bookAnother: "Book another ride",
  inProgressNote: "Ride in progress. For urgent help, contact LENZI support.",
  driverPosition: "Driver position",
  driverPositionNote: "The driver updates this position during the ride.",
  timeline: "Ride timeline",
  noEvents: "No events yet.",
};
