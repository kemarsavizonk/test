"use client";

import { ArrowLeft, ArrowRight, Award, BarChart3, CalendarDays, ChevronRight, Dumbbell, Layers3, Pencil, Plus, Repeat2 } from "lucide-react";
import Link from "next/link";
import { addDays, addMonths, addWeeks, addYears, endOfDay, endOfMonth, endOfWeek, endOfYear, format, isWithinInterval, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { TrainingCalendar } from "@/components/training-calendar";
import { WeightDisplay } from "@/components/weight-display";
import { useAchievements } from "@/components/achievement-provider";
import { aggregatePeriod, exerciseVolume, maximumWeight, normalizeExerciseName } from "@/lib/fitness";
import { exerciseHistoryUrl } from "@/lib/exercise-history";
import { formatNumber } from "@/lib/utils";
import { useWorkouts } from "@/hooks/use-workouts";
import { usePreferredName } from "@/hooks/use-preferred-name";

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

const getToday = () => format(new Date(), "yyyy-MM-dd");
function subscribeToDate(callback: () => void) {
  const timer = window.setInterval(callback, 60_000);
  window.addEventListener("focus", callback);
  return () => { window.clearInterval(timer); window.removeEventListener("focus", callback); };
}

export default function DashboardPage() {
  const name = usePreferredName();
  const { workouts, unit, loading, error } = useWorkouts();
  const { achievements, unreadCount } = useAchievements();
  const today = useSyncExternalStore(subscribeToDate, getToday, () => "");
  const [period, setPeriod] = useState<Period>("day");
  const [chosenDate, setChosenDate] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateTrigger = useRef<HTMLButtonElement>(null);
  const selectedDate = chosenDate || today || "2000-01-03";
  const anchor = new Date(`${selectedDate}T12:00:00`);
  const interval = getInterval(anchor, period);
  const selectedWorkouts = workouts.filter((workout) => isWithinInterval(new Date(workout.performedAt), interval))
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  const metrics = aggregatePeriod(selectedWorkouts);
  const periodLabel = period === "day" ? format(anchor, "EEEE, MMMM d, yyyy") : period === "month" ? format(anchor, "MMMM yyyy") : period === "year" ? format(anchor, "yyyy") : `${format(interval.start, "MMM d")} – ${format(interval.end, "MMM d, yyyy")}`;
  const dateLabel = period === "day" && (!chosenDate || selectedDate === today) ? "Today" : period === "day" ? format(anchor, "EEE, MMM d") : periodLabel;
  const trainingDates = new Set(workouts.filter((workout) => workout.status === "completed").map((workout) => format(new Date(workout.performedAt), "yyyy-MM-dd")));
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const entries = selectedWorkouts.flatMap((workout) => workout.exercises.map((exercise) => ({ workout, exercise })));
  const closeCalendar = useCallback(() => { setCalendarOpen(false); dateTrigger.current?.focus(); }, []);
  const selectDate = (date: string) => { setChosenDate(date === getToday() ? "" : date); closeCalendar(); };
  const navigate = (amount: number) => { setChosenDate(format(moveDate(anchor, period, amount), "yyyy-MM-dd")); setCalendarOpen(false); };
  useLayoutEffect(() => () => setCalendarOpen(false), []);

  return <div className="app-page dashboard-page">
    <header className="dashboard-page-header"><div><div className="eyebrow">{name ? `${name}’s fitness, at a glance` : "Your fitness, at a glance"}</div><h1>Your training dashboard</h1></div><Link href="/dashboard/workouts/new" aria-label="Log workout" className="btn btn-primary dashboard-log-button"><Plus size={20} /><span>Log workout</span></Link></header>
    {error && <div className="logger-error" role="alert">{error}</div>}
    <div className="dashboard-date-picker">
      <div className="dashboard-date-bar"><Button variant="ghost" aria-label={`Previous ${period}`} onClick={() => navigate(-1)}><ArrowLeft size={19} /></Button><button ref={dateTrigger} className="dashboard-date-trigger" aria-label="Choose training date" aria-expanded={calendarOpen} aria-haspopup="dialog" onClick={() => setCalendarOpen((open) => !open)}><CalendarDays size={20} /><span>{dateLabel}</span></button><Button variant="ghost" aria-label={`Next ${period}`} onClick={() => navigate(1)}><ArrowRight size={19} /></Button></div>
      {calendarOpen && <TrainingCalendar selectedDate={selectedDate} trainingDates={trainingDates} onSelect={selectDate} onClose={closeCalendar} />}
    </div>
    <div className="dashboard-period-tabs" role="group" aria-label="Dashboard time period">{(["day", "week", "month", "year"] as Period[]).map((item) => <button key={item} type="button" aria-pressed={period === item} onClick={() => { setPeriod(item); setCalendarOpen(false); }}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>

    <section className="dashboard-summary" aria-label="Training summary">
      <div className="dashboard-summary-heading"><div><span className="dashboard-summary-eyebrow">Completed training</span><h2>{period === "day" ? "Your day in strength" : `Your ${period} in strength`}</h2></div><span className="dashboard-summary-mark"><Dumbbell size={23} /></span></div>
      <div className="dashboard-summary-main">
        <div className="dashboard-summary-side"><div><Dumbbell size={18} /><strong>{loading ? "—" : metrics.workouts}</strong><span>Workouts</span></div><div><Layers3 size={18} /><strong>{loading ? "—" : formatNumber(metrics.sets)}</strong><span>Working sets</span></div></div>
        <div className="dashboard-volume-orbit"><span>Training volume</span><strong>{loading ? "—" : <WeightDisplay value={metrics.volume} unit={unit} />}</strong><small>Weight × reps</small></div>
        <div className="dashboard-summary-side"><div><Repeat2 size={18} /><strong>{loading ? "—" : formatNumber(metrics.repetitions)}</strong><span>Total reps</span></div><div><Layers3 size={18} /><strong>{loading ? "—" : metrics.exerciseCount}</strong><span>Exercises</span></div></div>
      </div>
      <div className="dashboard-summary-footer"><span><CalendarDays size={15} /> {metrics.daysTrained} day{metrics.daysTrained === 1 ? "" : "s"} trained</span><span>Warm-ups excluded</span></div>
    </section>



    <div className="dashboard-main-grid">
      <section className="dashboard-entries"><div className="dashboard-section-heading"><div><h2>{period === "day" ? "Your exercises" : `Exercises this ${period}`}</h2><p>{today ? periodLabel : "Loading your date…"}</p></div><Link href="/dashboard/workouts">History <ChevronRight size={16} /></Link></div>
        {loading ? <Card><p className="dashboard-loading muted">Loading your entries…</p></Card> : entries.length === 0 ? <Card><EmptyState icon={<Dumbbell />} title={`No workouts recorded for this ${period}`} description="Pick another date or record your first exercise for this period." action={<Link href="/dashboard/workouts/new" className="btn btn-primary"><Plus size={17} /> Add workout</Link>} /></Card> : <div className="dashboard-entry-cards">{entries.map(({ workout, exercise }) => {
          const topWeight = maximumWeight(exercise);
          return <Card key={`${workout.id}:${exercise.id}`} className="dashboard-exercise-card"><Link href={exerciseHistoryUrl(normalizeExerciseName(exercise.name))} className="dashboard-exercise-main"><span className="dashboard-exercise-icon"><Dumbbell size={20} /></span><div><h3>{exercise.name}</h3><p>{exercise.muscleGroup}{exercise.equipment ? ` · ${exercise.equipment}` : ""}</p></div><ChevronRight size={19} /></Link><div className="dashboard-exercise-metrics"><div><span>Top weight</span><strong>{topWeight == null ? "—" : <WeightDisplay value={topWeight} unit={unit} />}</strong></div><div><span>Working volume</span><strong><WeightDisplay value={exerciseVolume(exercise)} unit={unit} /></strong></div></div><div className="dashboard-exercise-footer"><div><Badge tone={workout.status === "completed" ? "green" : "gray"}>{workout.status}</Badge><span>{exercise.sets.length} sets · {format(new Date(workout.performedAt), period === "day" ? "h:mm a" : "MMM d")}</span></div><Link href={`/dashboard/workouts/${workout.id}/edit`} className="btn btn-ghost" aria-label={`Edit ${exercise.name}`}><Pencil size={17} /></Link></div></Card>;
        })}</div>}
      </section>
      <aside className="dashboard-highlights"><div className="dashboard-section-heading"><h2>Your progress</h2></div><div className="dashboard-progress-cards"><Link href="/dashboard/achievements" className="card dashboard-progress-card"><span className="dashboard-progress-icon gold"><Award size={25} /></span><div><strong>{achievements.length} achievement{achievements.length === 1 ? "" : "s"}</strong><p>{unreadCount ? `${unreadCount} new achievement${unreadCount === 1 ? "" : "s"} to celebrate` : "Every training improvement, in one place"}</p></div><ChevronRight size={18} /></Link><Link href="/dashboard/reports" className="card dashboard-progress-card"><span className="dashboard-progress-icon"><BarChart3 size={25} /></span><div><strong>Performance reports</strong><p>See how your lifts are changing</p></div><ChevronRight size={18} /></Link></div><Card className="dashboard-week"><div className="dashboard-section-heading"><h2>Training rhythm</h2><span>Week of {today ? format(weekStart, "MMM d") : "—"}</span></div><div className="dashboard-week-days">{week.map((date) => {
      const key = format(date, "yyyy-MM-dd");
      return <button key={key} type="button" aria-label={`View ${format(date, "EEEE, MMMM d, yyyy")}`} aria-pressed={selectedDate === key} onClick={() => { setPeriod("day"); setChosenDate(key === getToday() ? "" : key); }}><span>{format(date, "EEEEE")}</span><strong>{today ? format(date, "d") : "—"}</strong><i className={trainingDates.has(key) ? "trained" : ""} aria-label={trainingDates.has(key) ? "Workout logged" : "No completed workout"} /></button>;
    })}</div></Card></aside>
    </div>
  </div>;
}
