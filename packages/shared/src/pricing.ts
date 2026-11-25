import type { FareBreakdown, FareEstimateInput } from "./types";

const MAX_SAFE_FARE = 100_000_000;

function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite non-negative number`);
  }
}

/**
 * Deterministic fare preview used by clients to render an estimate.
 *
 * The database function `quote_ride` / `request_ride` is the authoritative
 * implementation. Clients must never persist or trust this result. It exists
 * so the same rounding and display rules are used throughout the product.
 */
export function estimateFare(input: FareEstimateInput): FareBreakdown {
  const {
    rule,
    distanceKm,
    durationMinutes,
    waitingMinutes = 0,
    discountPercent = 0,
  } = input;

  assertFiniteNonNegative(distanceKm, "distanceKm");
  assertFiniteNonNegative(durationMinutes, "durationMinutes");
  assertFiniteNonNegative(waitingMinutes, "waitingMinutes");
  assertFiniteNonNegative(discountPercent, "discountPercent");

  if (discountPercent > 100) {
    throw new RangeError("discountPercent cannot exceed 100");
  }

  if (rule.currency !== "TZS") {
    throw new RangeError("Only TZS fare rules are supported");
  }

  if (rule.commissionRate < 0 || rule.commissionRate > 1) {
    throw new RangeError("commissionRate must be between 0 and 1");
  }

  const baseFare = Math.round(rule.baseFare);
  const distanceFare = Math.round(
    rule.perKm * Math.max(0, distanceKm),
  );
  const timeFare = Math.round(
    rule.perMinute * Math.max(0, durationMinutes),
  );
  const waitingFare = Math.round(
    rule.waitingPerMinute * Math.max(0, waitingMinutes),
  );
  const subtotal = baseFare + distanceFare + timeFare + waitingFare;
  const minimumApplied = subtotal < rule.minimumFare;
  const beforeDiscount = Math.max(subtotal, Math.round(rule.minimumFare));
  const discount = Math.round(
    beforeDiscount * (Math.min(100, Math.max(0, discountPercent)) / 100),
  );
  const increment =
    Number.isFinite(rule.roundingIncrement) && rule.roundingIncrement > 0
      ? Math.round(rule.roundingIncrement)
      : 1;
  const rounded = Math.ceil((beforeDiscount - discount) / increment) * increment;
  const total = Math.max(0, Math.min(MAX_SAFE_FARE, rounded));
  const commissionAmount = Math.round(total * rule.commissionRate);

  return {
    currency: "TZS",
    baseFare,
    distanceFare,
    timeFare,
    waitingFare,
    subtotal,
    discount,
    total,
    minimumApplied,
    commissionRate: rule.commissionRate,
    commissionAmount,
    driverEarnings: total - commissionAmount,
    ruleId: rule.id,
    ruleVersion: rule.version,
  };
}

export function estimateCommission(providerAmount: number, rate: number): number {
  assertFiniteNonNegative(providerAmount, "providerAmount");
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new RangeError("rate must be between 0 and 1");
  }
  return Math.round(providerAmount * rate);
}
