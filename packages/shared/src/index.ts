export * from "./types";
export * from "./pricing";
export * from "./ride-state";
export * from "./format";

export const LENZI_BRAND = {
  name: "LENZI",
  tagline: {
    sw: "Safari yako. Njia yako.",
    en: "Your Ride. Your Way.",
  },
  colors: {
    primary: "#13A86B",
    deep: "#087A4B",
    charcoal: "#101B17",
    white: "#FFFFFF",
    background: "#F5F8F6",
    gray: "#68756F",
    lime: "#B8ED76",
  },
  phoneCountryCode: "+255",
  currency: "TZS",
  timezone: "Africa/Dar_es_Salaam",
  launchArea: {
    district: "Chunya",
    region: "Mbeya",
    country: "Tanzania",
  },
} as const;

export const DEVELOPER_FARE_RULE = {
  id: "00000000-0000-4000-8000-000000000001",
  serviceTypeId: "00000000-0000-4000-8000-000000000101",
  operatingAreaId: "00000000-0000-4000-8000-000000000201",
  currency: "TZS" as const,
  baseFare: 0,
  perKm: 0,
  perMinute: 0,
  minimumFare: 0,
  cancellationFee: 0,
  waitingPerMinute: 0,
  commissionRate: 0.15,
  roundingIncrement: 50,
  version: 1,
};
