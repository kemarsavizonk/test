import { convertWeight } from "@/lib/fitness";
import type { WeightUnit } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function WeightDisplay({ value, unit, signed = false, compact = false }: { value: number; unit: WeightUnit; signed?: boolean; compact?: boolean }) {
  const secondaryUnit: WeightUnit = unit === "lb" ? "kg" : "lb";
  const secondary = convertWeight(value, unit, secondaryUnit);
  const sign = signed && value > 0 ? "+" : "";
  const secondarySign = signed && secondary > 0 ? "+" : "";
  return <span className={compact ? "dual-weight compact" : "dual-weight"}>
    <span>{sign}{formatNumber(value, 1)} {unit}</span>
    <small>{secondarySign}{formatNumber(secondary, 1)} {secondaryUnit}</small>
  </span>;
}
