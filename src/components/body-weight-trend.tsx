import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { WeightDisplay } from "@/components/weight-display";
import { fromCanonicalKg } from "@/lib/fitness";
import { formatNumber } from "@/lib/utils";
import type { BodyWeightLog } from "@/lib/body-weight";
import type { WeightUnit } from "@/lib/types";

export function BodyWeightTrend({ entry, unit }: { entry: BodyWeightLog; unit: WeightUnit }) {
  if (entry.direction === "first") return <span className="body-weight-change">First entry · your baseline</span>;
  if (entry.direction === "same") return <span className="body-weight-change"><Minus size={18} />Same as previous entry</span>;
  const Icon = entry.direction === "increase" ? ArrowUpRight : ArrowDownRight;
  return <span className="body-weight-change"><Icon size={18} /><span>{entry.direction === "increase" ? "Increased" : "Decreased"} <WeightDisplay value={fromCanonicalKg(entry.differenceKg!, unit)} unit={unit} signed compact /><small>{formatNumber(Math.abs(entry.percentage!), 1)}% from previous entry</small></span></span>;
}
