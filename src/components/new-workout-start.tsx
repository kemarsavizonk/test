"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useWorkouts } from "@/hooks/use-workouts";
import { WorkoutBuilder } from "@/components/workout-builder";
import { buildExerciseHistory } from "@/lib/exercise-history";
import { buildSuggestedWorkoutPlan } from "@/lib/workout-reuse";
import { normalizeExerciseName } from "@/lib/fitness";

export function NewWorkoutStart() {
  const params = useSearchParams();
  if (!params.get("exercise") && !params.get("plan")) return <WorkoutBuilder />;
  return <WorkoutFromSource key={params.toString()} query={params.toString()} />;
}

function WorkoutFromSource({ query }: { query: string }) {
  const params = new URLSearchParams(query);
  const { workouts, unit, loading, error } = useWorkouts();
  const exercise = params.get("exercise");
  const planDate = params.get("plan");
  if (loading) return <div className="app-page muted">Loading previous workout details…</div>;
  if (error) return <div className="app-page"><p role="alert">Could not load previous workout details. Please try again.</p><Link href="/dashboard/workouts/new" className="btn btn-secondary">Start a blank workout</Link></div>;
  if (planDate) {
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(planDate) && Number.isFinite(new Date(`${planDate}T12:00:00`).getTime());
    const plan = validDate ? buildSuggestedWorkoutPlan(workouts, new Date(`${planDate}T12:00:00`)) : null;
    if (!plan?.entries.length) return <div className="app-page"><h1>No suggested plan for this day yet</h1><p>Log completed workouts on this weekday to build your pattern.</p><Link href="/dashboard/workouts/new" className="btn btn-primary">Start a blank workout</Link></div>;
    return <WorkoutBuilder key={params.toString()} initialUnit={unit} reviewPlan={plan} />;
  }
  const history = buildExerciseHistory(workouts).find((item) => item.key === normalizeExerciseName(exercise!));
  const log = params.get("fromLog") ? history?.logs.find((item) => item.workout.id === params.get("fromLog")) : history?.logs.find((item) => item.workout.status === "completed") ?? history?.logs[0];
  if (!log) return <div className="app-page"><h1>Previous log not found</h1><p>It may have been deleted. Your saved history has not been changed.</p><Link href="/dashboard/workouts/new" className="btn btn-primary">Start a blank workout</Link></div>;
  return <WorkoutBuilder key={params.toString()} initialUnit={unit} startingExercises={[log.exercise]} />;
}
