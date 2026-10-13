import { exerciseVolume, maximumWeight, normalizeExerciseName, percentageChange } from "@/lib/fitness";
import type { WorkoutExercise, WorkoutSession } from "@/lib/types";

export interface ExerciseLog {
  workout: WorkoutSession;
  exercise: WorkoutExercise;
  exerciseIds: string[];
  maximumWeight: number | null;
  volume: number;
  previousWeight: number | null;
  difference: number | null;
  percentage: number | null;
}

export interface ExerciseHistory {
  key: string;
  name: string;
  logs: ExerciseLog[];
}

export function exerciseHistoryUrl(key: string) {
  return `/dashboard/workouts/exercise/${encodeURIComponent(key)}`;
}

export function buildExerciseHistory(workouts: WorkoutSession[]): ExerciseHistory[] {
  const groups = new Map<string, ExerciseHistory>();
  const previousWeights = new Map<string, number>();
  const ordered = [...workouts].sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id));
  for (const workout of ordered) {
    const sessionExercises = new Map<string, { exercise: WorkoutExercise; ids: string[] }>();
    for (const exercise of workout.exercises) {
      const key = normalizeExerciseName(exercise.name);
      const entry = sessionExercises.get(key);
      if (entry) {
        entry.exercise = { ...entry.exercise, sets: [...entry.exercise.sets, ...exercise.sets], notes: [entry.exercise.notes, exercise.notes].filter(Boolean).join("\n") || undefined };
        entry.ids.push(exercise.id);
      } else sessionExercises.set(key, { exercise: { ...exercise, sets: [...exercise.sets] }, ids: [exercise.id] });
    }
    for (const [key, { exercise, ids }] of sessionExercises) {
      const group = groups.get(key) ?? { key, name: exercise.name, logs: [] };
      const weight = maximumWeight(exercise);
      const previousWeight = previousWeights.get(key) ?? null;
      const comparable = workout.status === "completed" && weight != null && previousWeight != null;
      group.name = exercise.name;
      group.logs.unshift({ workout, exercise, exerciseIds: ids, maximumWeight: weight, volume: exerciseVolume(exercise), previousWeight: comparable ? previousWeight : null, difference: comparable ? weight - previousWeight : null, percentage: comparable ? percentageChange(weight, previousWeight) : null });
      if (workout.status === "completed" && weight != null) previousWeights.set(key, weight);
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => new Date(b.logs[0].workout.performedAt).getTime() - new Date(a.logs[0].workout.performedAt).getTime() || a.name.localeCompare(b.name));
}
