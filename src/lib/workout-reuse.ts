import { addDays, format, startOfDay } from "date-fns";
import { buildExerciseHistory, type ExerciseLog } from "@/lib/exercise-history";
import { convertWeight, createId, normalizeExerciseName } from "@/lib/fitness";
import type { WeightUnit, WorkoutExercise, WorkoutSession } from "@/lib/types";

export interface ReuseEntry { exercise: WorkoutExercise; performedAt: string }
export interface SuggestedWorkoutPlan { date: string; weekday: string; trainingDays: number; entries: ReuseEntry[] }

export function copyExercise(exercise: WorkoutExercise, options: { from?: WeightUnit; to?: WeightUnit; completed?: boolean } = {}): WorkoutExercise {
  return { ...exercise, id: createId(), sets: exercise.sets.map((set, index) => ({
    ...set, id: createId(), setNumber: index + 1,
    weight: options.from && options.to ? convertWeight(set.weight, options.from, options.to) : set.weight,
    completed: options.completed ?? set.completed,
  })) };
}

export function previousExerciseLogs(workouts: WorkoutSession[], name: string): ExerciseLog[] {
  return buildExerciseHistory(workouts).find((history) => history.key === normalizeExerciseName(name))?.logs
    .filter((log) => log.workout.status === "completed" && log.exercise.sets.some((set) => set.completed)) ?? [];
}

// Suggestions repeat observed habits, not invented exercises or prescribed loads.
export function buildSuggestedWorkoutPlan(workouts: WorkoutSession[], target: Date): SuggestedWorkoutPlan {
  const today = startOfDay(target);
  const since = addDays(today, -56);
  const past = workouts.filter((workout) => workout.status === "completed" && new Date(workout.performedAt) < today && new Date(workout.performedAt) >= since);
  const weekdayWorkouts = past.filter((workout) => new Date(workout.performedAt).getDay() === today.getDay());
  const hasTrainingSets = (exercise: WorkoutExercise) => exercise.sets.some((set) => set.completed && set.type !== "warmup" && set.repetitions > 0);
  const trainingDays = new Set(weekdayWorkouts.filter((workout) => workout.exercises.some(hasTrainingSets)).map((workout) => format(new Date(workout.performedAt), "yyyy-MM-dd"))).size;
  const occurrences = new Map<string, Set<string>>();
  for (const workout of weekdayWorkouts) for (const exercise of workout.exercises) {
    if (!hasTrainingSets(exercise)) continue;
    const key = normalizeExerciseName(exercise.name);
    const dates = occurrences.get(key) ?? new Set<string>();
    dates.add(format(new Date(workout.performedAt), "yyyy-MM-dd")); occurrences.set(key, dates);
  }
  const histories = buildExerciseHistory(past);
  const entries = [...occurrences].filter(([, dates]) => dates.size >= Math.ceil(trainingDays / 2))
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .flatMap(([key]) => {
      const latest = histories.find((history) => history.key === key)?.logs.find((log) => hasTrainingSets(log.exercise));
      return latest ? [{ exercise: { ...latest.exercise, sets: latest.exercise.sets.filter((set) => set.completed) }, performedAt: latest.workout.performedAt }] : [];
    });
  return { date: format(today, "yyyy-MM-dd"), weekday: format(today, "EEEE"), trainingDays, entries };
}

export function historyWorkoutStartUrl(name: string, workoutId?: string) {
  const params = new URLSearchParams({ exercise: normalizeExerciseName(name), intent: createId() });
  if (workoutId) params.set("fromLog", workoutId);
  return `/dashboard/workouts/new?${params}`;
}
