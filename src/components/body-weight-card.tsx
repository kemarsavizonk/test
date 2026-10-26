"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, Scale } from "lucide-react";
import { useBodyWeight } from "@/hooks/use-body-weight";
import { buildBodyWeightHistory } from "@/lib/body-weight";
import { fromCanonicalKg } from "@/lib/fitness";
import { WeightDisplay } from "@/components/weight-display";

export function BodyWeightCard() {
  const { entries, unit, loading, error } = useBodyWeight();
  const latest = buildBodyWeightHistory(entries)[0];
  return <section aria-label="Latest body weight" className="dashboard-body-weight"><Link href="/dashboard/body-weight" className="card body-weight-card"><span className="body-weight-icon"><Scale size={25} /></span><div><span className="eyebrow">Body weight</span><h2>{loading ? "Loading body weight…" : error ? "Body-weight tracker" : latest ? <WeightDisplay value={fromCanonicalKg(latest.weightKg, unit)} unit={unit} /> : "Log your first body weight"}</h2><p>{error ? "Open tracker for details" : latest ? `Last recorded ${format(new Date(`${latest.measuredOn}T12:00:00`), "MMM d, yyyy")}` : "Track your weight and see how it changes"}</p></div><span className="body-weight-card-action">{latest ? "View history" : "Add weight"}<ChevronRight size={19} /></span></Link></section>;
}
