"use client";

import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WeightDisplay } from "@/components/weight-display";
import { fromCanonicalKg } from "@/lib/fitness";
import type { BodyWeightLog } from "@/lib/body-weight";
import type { WeightUnit } from "@/lib/types";

export function BodyWeightChart({ history, unit }: { history: BodyWeightLog[]; unit: WeightUnit }) {
  const points = [...history].reverse().map((entry) => ({ date: entry.measuredOn, timestamp: new Date(`${entry.measuredOn}T12:00:00`).getTime(), weight: fromCanonicalKg(entry.weightKg, unit) }));
  return <div className="body-weight-chart" role="img" aria-label={`Body-weight trend in ${unit}, ${points.length} dated measurements. Full values are listed in the history below.`}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 12, right: 14, bottom: 8, left: -15 }} accessibilityLayer>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis dataKey="timestamp" type="number" domain={points.length === 1 ? [points[0].timestamp - 86400000, points[0].timestamp + 86400000] : ["dataMin", "dataMax"]} tickFormatter={(value: number) => format(new Date(value), "MMM d")} tick={{ fontSize: 11 }} minTickGap={36} />
      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} tickFormatter={(value: number) => String(Math.round(value * 10) / 10)} />
      <Tooltip content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const point = payload[0].payload as typeof points[number];
        return <div className="body-chart-tooltip"><time>{format(new Date(`${point.date}T12:00:00`), "MMM d, yyyy")}</time><strong><WeightDisplay value={point.weight} unit={unit} /></strong></div>;
      }} />
      <Line type="linear" dataKey="weight" name={`Body weight (${unit})`} stroke="#1642bb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} isAnimationActive={false} />
    </LineChart></ResponsiveContainer>
  </div>;
}
