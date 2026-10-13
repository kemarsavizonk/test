"use client";

import { ArrowLeft, ArrowRight, CalendarDays, Dumbbell, Layers3, Pencil, Plus, Scale } from "lucide-react";
import Link from "next/link";
import { addDays, addMonths, addWeeks, addYears, endOfDay, endOfMonth, endOfWeek, endOfYear, format, isWithinInterval, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { WeightDisplay } from "@/components/weight-display";
import { aggregatePeriod, workoutVolume } from "@/lib/fitness";
import { formatNumber } from "@/lib/utils";
import { useWorkouts } from "@/hooks/use-workouts";

type Period = "day" | "week" | "month" | "year";

function getInterval(date: Date, period: Period) {
  if (period === "week") return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
  if (period === "month") return { start: startOfMonth(date), end: endOfMonth(date) };
  if (period === "year") return { start: startOfYear(date), end: endOfYear(date) };
  return { start: startOfDay(date), end: endOfDay(date) };
}

function moveDate(date: Date, period: Period, amount: number) {
  if (period === "week") return addWeeks(date, amount);
  if (period === "month") return addMonths(date, amount);
  if (period === "year") return addYears(date, amount);
  return addDays(date, amount);
}

export default function DashboardPage() {
  const { workouts, unit, loading, error } = useWorkouts();
  const [period, setPeriod] = useState<Period>("day");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const anchor = new Date(`${selectedDate}T12:00:00`);
  const interval = getInterval(anchor, period);
  const selectedWorkouts = workouts.filter((workout) => isWithinInterval(new Date(workout.performedAt), interval));
  const metrics = aggregatePeriod(selectedWorkouts);
  const periodLabel = period === "day" ? format(anchor, "EEEE, MMMM d, yyyy") : `${format(interval.start, "MMM d, yyyy")} – ${format(interval.end, "MMM d, yyyy")}`;
  const navigate = (amount: number) => setSelectedDate(format(moveDate(anchor, period, amount), "yyyy-MM-dd"));

  return <div className="app-page"><PageHeader eyebrow="Overview" title="Your training dashboard" description="Review your entries by day, week, month, or year." action={<Link href="/dashboard/workouts/new" className="btn btn-primary"><Plus size={18} /> Log workout</Link>} />
    {error && <div role="alert" style={{ padding: 14, borderRadius: 11, background: "#fef2f2", color: "#b91c1c", marginBottom: 20 }}>{error}</div>}
    <Card style={{ padding: 16, marginBottom: 20 }}><div className="dashboard-date-controls">
      <div style={{ display: "flex", gap: 8 }}><Button variant="secondary" aria-label={`Previous ${period}`} onClick={() => navigate(-1)}><ArrowLeft size={17} /></Button><Button variant="secondary" onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}>Today</Button><Button variant="secondary" aria-label={`Next ${period}`} onClick={() => navigate(1)}><ArrowRight size={17} /></Button></div>
      <strong style={{ textAlign: "center" }}>{periodLabel}</strong>
      <div style={{ display: "flex", gap: 8 }}><input className="input" aria-label="Choose date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} style={{ width: 150 }} /><select className="input" aria-label="Choose dashboard period" value={period} onChange={(event) => setPeriod(event.target.value as Period)} style={{ width: 122 }}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></div>
    </div></Card>
    <div className="grid-auto" style={{ marginBottom: 22 }}><StatCard label={`Workouts this ${period}`} value={String(metrics.workouts)} detail="Completed sessions" icon={Dumbbell} /><StatCard label="Working sets" value={formatNumber(metrics.sets)} detail="Warm-ups excluded" icon={Layers3} /><StatCard label="Training volume" value={<WeightDisplay value={metrics.volume} unit={unit} />} detail="Weight × repetitions" icon={Scale} /><StatCard label="Days trained" value={String(metrics.daysTrained)} detail={`In this ${period}`} icon={CalendarDays} /></div>
    <Card><div style={{ padding: "21px 22px", borderBottom: "1px solid #e2e8f0" }}><h2 style={{ fontSize: 18, margin: 0 }}>{period === "day" ? "Entries for this day" : `Entries for this ${period}`}</h2><p className="muted" style={{ fontSize: 13, margin: "5px 0 0" }}>{periodLabel}</p></div>
      {loading ? <div style={{ padding: 35 }} className="muted">Loading your training history…</div> : selectedWorkouts.length === 0 ? <EmptyState icon={<Dumbbell />} title={`No workouts recorded for this ${period}`} description="Choose another date or add a workout for this period." action={<Link href="/dashboard/workouts/new" className="btn btn-primary">Add workout</Link>} /> : <div>{selectedWorkouts.map(workout => <article key={workout.id} className="dashboard-entry"><span style={{ width: 42, height: 42, display: "grid", placeItems: "center", background: "#eff4ff", color: "#1642bb", borderRadius: 12 }}><Dumbbell size={19} /></span><span><strong style={{ display: "block", marginBottom: 4 }}>{workout.title}</strong><span className="muted" style={{ fontSize: 12 }}>{format(new Date(workout.performedAt), "MMM d, yyyy · h:mm a")} · {workout.exercises.length} exercise{workout.exercises.length === 1 ? "" : "s"} · <WeightDisplay value={workoutVolume(workout)} unit={unit} compact /></span></span><span style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge tone={workout.status === "completed" ? "green" : "gray"}>{workout.status}</Badge><Link href={`/dashboard/workouts/${workout.id}/edit`} className="btn btn-ghost" aria-label={`Edit ${workout.title}`} style={{ minHeight: 36, padding: 8 }}><Pencil size={17} /></Link></span></article>)}</div>}
    </Card>
    <style jsx>{`.dashboard-date-controls{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px}.dashboard-date-controls>div:last-child{justify-self:end}.dashboard-entry{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;padding:17px 22px;border-bottom:1px solid #edf0f5}@media(max-width:760px){.dashboard-date-controls{grid-template-columns:1fr}.dashboard-date-controls>div,.dashboard-date-controls>div:last-child{justify-self:center}.dashboard-entry{grid-template-columns:42px minmax(0,1fr)}.dashboard-entry>span:last-child{grid-column:2;justify-self:start}}`}</style>
  </div>;
}
