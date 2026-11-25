import { describe, expect, it } from "vitest";
import {
  formatDistance,
  formatTzs,
  maskPhone,
  normalizeTzPhone,
  serviceTypeName,
} from "./format";

describe("Tanzanian phone normalization", () => {
  it("accepts all common local formats", () => {
    expect(normalizeTzPhone("0712 345 678")).toBe("+255712345678");
    expect(normalizeTzPhone("0687 654 321")).toBe("+255687654321");
    expect(normalizeTzPhone("255712345678")).toBe("+255712345678");
    expect(normalizeTzPhone("+255712345678")).toBe("+255712345678");
    expect(normalizeTzPhone("712345678")).toBe("+255712345678");
  });

  it("rejects malformed or non-Tanzanian numbers", () => {
    expect(normalizeTzPhone("0123456789")).toBeNull();
    expect(normalizeTzPhone("+254712345678")).toBeNull();
    expect(normalizeTzPhone("hello")).toBeNull();
  });

  it("masks numbers without exposing them", () => {
    expect(maskPhone("+255712345678")).toBe("+255712 ••• 78");
  });
});

describe("display formatting", () => {
  it("formats TZS without decimals", () => {
    expect(formatTzs(12345)).toContain("12,345");
    expect(formatTzs(Number.NaN)).toBe("TZS —");
  });

  it("formats short distances in metres", () => {
    expect(formatDistance(0.48, "sw")).toBe("480 m");
    expect(formatDistance(3.2, "en")).toBe("3.2 km");
  });

  it("localizes vehicle categories", () => {
    expect(serviceTypeName("bajaji", "sw")).toBe("Bajaji");
    expect(serviceTypeName("car", "en")).toBe("Cars");
  });
});
