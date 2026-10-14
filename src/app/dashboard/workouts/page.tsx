"use client";

import { ChevronRight, Dumbbell, Plus, Search } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { WeightDisplay } from "@/components/weight-display";
import { LiftTrend } from "@/components/lift-trend";
import { useWorkouts } from "@/hooks/use-workouts";
import { buildExerciseHistory, exerciseHistoryUrl, filterExerciseHistory } from "@/lib/exercise-history";

export default function WorkoutHistoryPage() {
  const { workouts, unit, loading, error } = useWorkouts();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [muscleGroup, setMuscleGroup] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const histories = useMemo(() => buildExerciseHistory(workouts), [workouts]);
  const muscleGroups = [...new Set(histories.flatMap((history) => history.logs.map((log) => log.exercise.muscleGroup)))].sort();
  const invalidDates = Boolean(fromDate && toDate && fromDate > toDate);
  const hasFilters = Boolean(query || status !== "all" || muscleGroup !== "all" || fromDate || toDate);
  const filtered = filterExerciseHistory(histories, { query, status, muscleGroup, fromDate, toDate });

  return <div className="app-page"><PageHeader eyebrow="Training history" title="Your exercise history" description="Tap an exercise to review every log, newest first. Repeat workouts stay together." action={<Link href="/dashboard/workouts/new" className="btn btn-primary"><Plus size={18} /> Log workout</Link>} />
    <Card className="history-search"><div className="history-filters"><label className="history-search-input"><Search size={18} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercise history" aria-label="Search workout history" /></label><select className="input" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status"><option value="all">All statuses</option><option value="completed">Completed</option><option value="draft">Drafts</option></select></div><div className="history-detail-filters"><Field label="Muscle group"><select className="input" value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}><option value="all">All muscle groups</option>{muscleGroups.map((group) => <option key={group}>{group}</option>)}</select></Field><Field label="From date"><input className="input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field><Field label="To date"><input className="input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field></div>{invalidDates && <p className="logger-error" role="alert">From date must be on or before To date.</p>}<div className="history-filter-summary"><span role="status">{filtered.length} matching exercise{filtered.length === 1 ? "" : "s"} · Dates include the whole selected day</span>{hasFilters && <Button variant="ghost" onClick={() => { setQuery(""); setStatus("all"); setMuscleGroup("all"); setFromDate(""); setToDate(""); }}>Clear filters</Button>}</div></Card>
    {error && <div className="logger-error" role="alert">{error}</div>}
    {loading ? <p className="muted">Loading exercise history…</p> : filtered.length === 0 ? <Card><EmptyState icon={histories.length ? <Search /> : <Dumbbell />} title={histories.length ? "No matching exercises" : "No workouts recorded yet"} description={histories.length ? "Try another exercise name, muscle group, date range, or status filter." : "Log your first exercise to start building its history."} action={!histories.length ? <Link href="/dashboard/workouts/new" className="btn btn-primary">Log first workout</Link> : undefined} /></Card> : <div className="exercise-history-grid">{filtered.map((history) => {
      const logs = history.logs;
      const latest = logs[0];
      return <Link key={history.key} href={exerciseHistoryUrl(history.key)} className="card exercise-history-card" aria-label={`View ${history.name} history`}>
        <div className="exercise-history-heading"><span className="exercise-history-icon"><Dumbbell size={20} /></span><div><h2>{history.name}</h2><p>{latest.exercise.muscleGroup}{latest.exercise.equipment ? ` · ${latest.exercise.equipment}` : ""}</p></div><ChevronRight size={22} /></div>
        <div className="exercise-history-date"><time dateTime={latest.workout.performedAt}>{format(new Date(latest.workout.performedAt), "MMM d, yyyy · h:mm a")}</time><Badge tone={latest.workout.status === "completed" ? "green" : "gray"}>{latest.workout.status}</Badge></div>
        <div className="exercise-history-metrics"><div><span className="muted">Latest top weight</span><strong>{latest.maximumWeight == null ? "—" : <WeightDisplay value={latest.maximumWeight} unit={unit} />}</strong></div><div><span className="muted">Working volume</span><strong><WeightDisplay value={latest.volume} unit={unit} /></strong></div></div>
        <LiftTrend log={latest} unit={unit} /><div className="exercise-history-footer"><span>{logs.length} {hasFilters ? "matching " : ""}log{logs.length === 1 ? "" : "s"} · {latest.exercise.sets.length} sets in latest log</span><strong>View history</strong></div>
      </Link>;
    })}</div>}
  </div>;
}
