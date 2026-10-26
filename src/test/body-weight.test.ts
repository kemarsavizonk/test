import { describe, expect, it } from "vitest";
import { buildBodyWeightHistory, validateBodyWeight, type BodyWeightEntry } from "@/lib/body-weight";
import { fromCanonicalKg, toCanonicalKg } from "@/lib/fitness";

const entry = (date: string, weightKg: number): BodyWeightEntry => ({ id: date, measuredOn: date, weightKg, createdAt: "2026-10-25T12:00:00Z", updatedAt: "2026-10-25T12:00:00Z" });

describe("body-weight history", () => {
  it("sorts by measured date, compares adjacent measurements, and does not mutate entries", () => {
    const entries = [entry("2026-10-23", 82), entry("2026-10-20", 80), entry("2026-10-22", 80), entry("2026-10-24", 81)];
    const original = structuredClone(entries);
    const history = buildBodyWeightHistory(entries);
    expect(history.map((item) => item.direction)).toEqual(["decrease", "increase", "same", "first"]);
    expect(history[0]).toMatchObject({ previousKg: 82, differenceKg: -1 });
    expect(history[1].percentage).toBeCloseTo(2.5);
    expect(history[3]).toMatchObject({ previousKg: null, differenceKg: null, percentage: null });
    expect(entries).toEqual(original);
  });
  it("recalculates following trends when a measurement is backdated, edited, or deleted", () => {
    const a = entry("2026-10-20", 80), b = entry("2026-10-23", 82);
    expect(buildBodyWeightHistory([b, a, entry("2026-10-21", 81)])[0].differenceKg).toBe(1);
    expect(buildBodyWeightHistory([b, { ...a, weightKg: 83 }])[0].direction).toBe("decrease");
    expect(buildBodyWeightHistory([b])[0].direction).toBe("first");
    expect(buildBodyWeightHistory([])).toEqual([]);
  });
  it("ignores conversion/storage rounding noise for equal measurements", () => {
    const weightKg = toCanonicalKg(180, "lb");
    expect(buildBodyWeightHistory([entry("2026-10-20", weightKg), entry("2026-10-21", Number(weightKg.toFixed(4)))])[0].direction).toBe("same");
    expect(toCanonicalKg(fromCanonicalKg(weightKg, "lb"), "lb")).toBeCloseTo(weightKg, 9);
  });
  it("rejects invalid weights, dates, and future dates", () => {
    for (const weight of [0, -1, NaN, Infinity, .00001, 1_000_000]) expect(() => validateBodyWeight(weight, "2026-10-20", "2026-10-26")).toThrow("valid body weight");
    for (const date of ["", "2026-02-30", "2026-13-01", "10/20/2026"]) expect(() => validateBodyWeight(80, date, "2026-10-26")).toThrow("valid measurement date");
    expect(() => validateBodyWeight(80, "2026-10-27", "2026-10-26")).toThrow("future");
    expect(() => validateBodyWeight(80, "2024-02-29", "2026-10-26")).not.toThrow();
  });
});
