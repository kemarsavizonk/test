import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { WeightDisplay } from "@/components/weight-display";
import type { ExerciseLog } from "@/lib/exercise-history";
import type { WeightUnit } from "@/lib/types";

export function LiftTrend({ log, unit }: { log: ExerciseLog; unit: WeightUnit }) {
  if (log.workout.status === "draft") return <span className="lift-trend muted">Draft · not compared</span>;
  if (log.maximumWeight == null) return <span className="lift-trend muted">No completed working set</span>;
  if (log.difference == null) return <span className="lift-trend muted">First logged lift</span>;
  const same = Math.abs(log.difference) < .0001;
  const Icon = same ? Minus : log.difference > 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`lift-trend ${same ? "equal" : log.difference > 0 ? "increase" : "decrease"}`}><Icon size={18} /><span>{same ? "Same as last lift" : <>{log.difference > 0 ? "More" : "Less"} than last lift <WeightDisplay value={log.difference} unit={unit} signed compact /></>}</span></span>;
}
