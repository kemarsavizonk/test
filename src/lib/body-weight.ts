import { format, isValid, parseISO } from "date-fns";

export interface BodyWeightEntry { id: string; measuredOn: string; weightKg: number; createdAt: string; updatedAt: string }
export interface BodyWeightLog extends BodyWeightEntry { previousKg: number | null; differenceKg: number | null; percentage: number | null; direction: "first" | "same" | "increase" | "decrease" }

export function validateBodyWeight(weightKg: number, measuredOn: string, today = format(new Date(), "yyyy-MM-dd")) {
  if (!Number.isFinite(weightKg) || weightKg < .0001 || weightKg >= 1_000_000) throw new Error("Enter a valid body weight greater than zero.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredOn) || !isValid(parseISO(measuredOn))) throw new Error("Choose a valid measurement date.");
  if (measuredOn > today) throw new Error("The measurement date cannot be in the future.");
}

export function buildBodyWeightHistory(entries: BodyWeightEntry[]): BodyWeightLog[] {
  const ordered = [...entries].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return ordered.map((entry, index) => {
    const previousKg = index ? ordered[index - 1].weightKg : null;
    const differenceKg = previousKg == null ? null : entry.weightKg - previousKg;
    const same = differenceKg != null && Math.abs(differenceKg) < .0001;
    return { ...entry, previousKg, differenceKg: same ? 0 : differenceKg, percentage: previousKg == null ? null : (same ? 0 : differenceKg!) / previousKg * 100, direction: previousKg == null ? "first" : same ? "same" : differenceKg! > 0 ? "increase" : "decrease" } satisfies BodyWeightLog;
  }).reverse();
}
