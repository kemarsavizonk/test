"use client";

import { ChevronRight, Dumbbell, Plus, Search } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { WeightDisplay } from "@/components/weight-display";
import { LiftTrend } from "@/components/lift-trend";
import { useWorkouts } from "@/hooks/use-workouts";
import { buildExerciseHistory, exerciseHistoryUrl } from "@/lib/exercise-history";

export default function WorkoutHistoryPage() {
  const { workouts, unit, loading, error } = useWorkouts();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const histories = useMemo(() => buildExerciseHistory(workouts), [workouts]);
  const filtered = histories.filter((item) => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && item.logs.some((log) => status === "all" || log.workout.status === status));

  return <div className="app-page"><PageHeader eyebrow="Training history" title="Your exercise history" description="Tap an exercise to review every log, newest first. Repeat workouts stay together." action={<Link href="/dashboard/workouts/new" className="btn btn-primary"><Plus size={18} /> Log workout</Link>} />
    <Card className="history-search"><div className="history-filters"><label className="history-search-input"><Search size={18} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercise history" aria-label="Search workout history" /></label><select className="input" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status"><option value="all">All statuses</option><option value="completed">Completed</option><option value="draft">Drafts</option></select></div></Card>
    {error && <div className="logger-error" role="alert">{error}</div>}
    {loading ? <p className="muted">Loading exercise history…</p> : filtered.length === 0 ? <Card><EmptyState icon={histories.length ? <Search /> : <Dumbbell />} title={histories.length ? "No matching exercises" : "No workouts recorded yet"} description={histories.length ? "Try another exercise name or status filter." : "Log your first exercise to start building its history."} action={!histories.length ? <Link href="/dashboard/workouts/new" className="btn btn-primary">Log first workout</Link> : undefined} /></Card> : <div className="exercise-history-grid">{filtered.map((history) => {
      const logs = history.logs.filter((item) => status === "all" || item.workout.status === status);
      const latest = logs[0];
      return <Link key={history.key} href={exerciseHistoryUrl(history.key)} className="card exercise-history-card" aria-label={`View ${history.name} history`}>
        <div className="exercise-history-heading"><span className="exercise-history-icon"><Dumbbell size={20} /></span><div><h2>{history.name}</h2><p>{latest.exercise.muscleGroup}{latest.exercise.equipment ? ` · ${latest.exercise.equipment}` : ""}</p></div><ChevronRight size={22} /></div>
        <div className="exercise-history-date"><time dateTime={latest.workout.performedAt}>{format(new Date(latest.workout.performedAt), "MMM d, yyyy · h:mm a")}</time><Badge tone={latest.workout.status === "completed" ? "green" : "gray"}>{latest.workout.status}</Badge></div>
        <div className="exercise-history-metrics"><div><span className="muted">Latest top weight</span><strong>{latest.maximumWeight == null ? "—" : <WeightDisplay value={latest.maximumWeight} unit={unit} />}</strong></div><div><span className="muted">Working volume</span><strong><WeightDisplay value={latest.volume} unit={unit} /></strong></div></div>
        <LiftTrend log={latest} unit={unit} /><div className="exercise-history-footer"><span>{history.logs.length} log{history.logs.length === 1 ? "" : "s"} · {latest.exercise.sets.length} sets in latest log</span><strong>View history</strong></div>
      </Link>;
    })}</div>}
  </div>;
}
