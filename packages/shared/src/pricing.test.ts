import { describe, expect, it } from "vitest";
import { estimateFare } from "./pricing";
import type { FareRule } from "./types";

const rule: FareRule = {
  id: "rule-1",
  serviceTypeId: "service-1",
  operatingAreaId: "area-1",
  currency: "TZS",
  baseFare: 1_000,
  perKm: 500,
  perMinute: 50,
  minimumFare: 2_000,
  cancellationFee: 1_000,
  waitingPerMinute: 100,
  commissionRate: 0.15,
  roundingIncrement: 50,
  version: 3,
};

describe("estimateFare", () => {
  it("calculates a transparent fare breakdown", () => {
    const result = estimateFare({
      rule,
      distanceKm: 4,
      durationMinutes: 10,
    });

    expect(result.baseFare).toBe(1_000);
    expect(result.distanceFare).toBe(2_000);
    expect(result.timeFare).toBe(500);
    expect(result.subtotal).toBe(3_500);
    expect(result.total).toBe(3_500);
    expect(result.commissionAmount).toBe(525);
    expect(result.driverEarnings).toBe(2_975);
    expect(result.ruleVersion).toBe(3);
  });

  it("applies the configured minimum fare", () => {
    const result = estimateFare({
      rule: { ...rule, baseFare: 100, perKm: 0, perMinute: 0 },
      distanceKm: 1,
      durationMinutes: 1,
    });

    expect(result.minimumApplied).toBe(true);
    expect(result.total).toBe(2_000);
  });

  it("applies discounts before the final rounding", () => {
    const result = estimateFare({
      rule,
      distanceKm: 10,
      durationMinutes: 20,
      discountPercent: 10,
    });

    expect(result.subtotal).toBe(7_000);
    expect(result.discount).toBe(700);
    expect(result.total).toBe(6_300);
  });

  it("rounds totals up to the configured increment", () => {
    const result = estimateFare({
      rule: { ...rule, baseFare: 1_010, perKm: 0, perMinute: 0, minimumFare: 0 },
      distanceKm: 1,
      durationMinutes: 1,
    });

    expect(result.total).toBe(1_050);
  });

  it("includes waiting charges", () => {
    const result = estimateFare({
      rule,
      distanceKm: 4,
      durationMinutes: 10,
      waitingMinutes: 5,
    });

    expect(result.waitingFare).toBe(500);
    expect(result.total).toBe(4_000);
  });

  it("rejects invalid input", () => {
    expect(() =>
      estimateFare({ rule, distanceKm: -1, durationMinutes: 10 }),
    ).toThrow(RangeError);
    expect(() =>
      estimateFare({ rule, distanceKm: 1, durationMinutes: 1, discountPercent: 101 }),
    ).toThrow(RangeError);
    expect(() =>
      estimateFare({
        rule: { ...rule, commissionRate: 1.2 },
        distanceKm: 1,
        durationMinutes: 1,
      }),
    ).toThrow(RangeError);
  });
});
