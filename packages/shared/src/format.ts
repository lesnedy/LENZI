import type { Language, VehicleCategory } from "./types";

const TZ_PHONE = /^\+255[67]\d{8}$/;

/** Normalizes common Tanzanian phone formats to E.164 (+255...). */
export function normalizeTzPhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "").replace(/^00/, "+");
  let candidate = digits;

  if (candidate.startsWith("0") && candidate.length === 10) {
    candidate = `+255${candidate.slice(1)}`;
  } else if (candidate.startsWith("255") && candidate.length === 12) {
    candidate = `+${candidate}`;
  } else if (candidate.startsWith("+255")) {
    candidate = `+${candidate.slice(1)}`;
  } else if (/^[67]\d{8}$/.test(candidate)) {
    candidate = `+255${candidate}`;
  }

  return TZ_PHONE.test(candidate) ? candidate : null;
}

export function maskPhone(phone: string): string {
  const normalized = normalizeTzPhone(phone);
  if (!normalized) return "•••• ••• •••";
  return `${normalized.slice(0, 7)} ••• ${normalized.slice(-2)}`;
}

export function formatTzs(amount: number, locale: Language = "sw"): string {
  if (!Number.isFinite(amount)) return "TZS —";
  return `TZS ${new Intl.NumberFormat(locale === "sw" ? "sw-TZ" : "en-TZ", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount))}`;
}

export function serviceTypeName(
  category: VehicleCategory,
  language: Language,
): string {
  const names: Record<VehicleCategory, { sw: string; en: string }> = {
    boda_boda: { sw: "Boda Boda", en: "Boda Boda" },
    bajaji: { sw: "Bajaji", en: "Bajaji" },
    car: { sw: "Magari", en: "Cars" },
  };
  return names[category][language];
}

export function formatDistance(km: number, language: Language): string {
  if (!Number.isFinite(km) || km < 0) return "—";
  if (km < 1) {
    return `${Math.round(km * 1000)} ${language === "sw" ? "m" : "m"}`;
  }
  return `${km.toFixed(1)} ${language === "sw" ? "km" : "km"}`;
}

export function relativeMinutes(minutes: number, language: Language): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  const rounded = Math.max(1, Math.round(minutes));
  return language === "sw" ? `Dakika ${rounded}` : `${rounded} min`;
}
