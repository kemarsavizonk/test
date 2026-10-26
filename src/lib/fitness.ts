import { KG_TO_LB } from "@/lib/constants";
import type { ExerciseComparison, PeriodMetrics, PersonalBestAchievement, WeightUnit, WorkoutExercise, WorkoutSession, WorkoutSet } from "@/lib/types";

export function normalizeExerciseName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit) {
  if (from === to) return value;
  return from === "kg" ? value * KG_TO_LB : value / KG_TO_LB;
}

export function toCanonicalKg(value: number, unit: WeightUnit) {
  return unit === "kg" ? value : value / KG_TO_LB;
}

export function fromCanonicalKg(value: number, unit: WeightUnit) {
  return unit === "kg" ? value : value * KG_TO_LB;
}

export function percentageChange(current: number, previous?: number | null) {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function estimateOneRepMax(weight: number, repetitions: number) {
  if (weight < 0 || repetitions <= 0 || repetitions > 30) return null;
  return weight * (1 + repetitions / 30);
}

export function setVolume(set: WorkoutSet) {
  if (!set.completed || set.type === "warmup" || set.weight <= 0) return 0;
  return set.weight * set.repetitions;
}

export function exerciseVolume(exercise: WorkoutExercise) {
  return exercise.sets.reduce((total, set) => total + setVolume(set), 0);
}

export function workoutVolume(workout: WorkoutSession) {
  return workout.exercises.reduce((total, exercise) => total + exerciseVolume(exercise), 0);
}

export function maximumWeight(exercise: WorkoutExercise) {
  const eligible = exercise.sets.filter((set) => set.completed && set.type !== "warmup");
  return eligible.length ? Math.max(...eligible.map((set) => set.weight)) : null;
}

export function bestEstimatedOneRepMax(exercise: WorkoutExercise) {
  const estimates = exercise.sets
    .filter((set) => set.completed && set.type !== "warmup")
    .map((set) => estimateOneRepMax(set.weight, set.repetitions))
    .filter((value): value is number => value !== null);
  return estimates.length ? Math.max(...estimates) : null;
}

export function aggregatePeriod(workouts: WorkoutSession[]): PeriodMetrics {
  const completed = workouts.filter((workout) => workout.status === "completed");
  const days = new Set(completed.map((workout) => workout.performedAt.slice(0, 10)));
  const completedSets = completed.flatMap((workout) =>
    workout.exercises.flatMap((exercise) =>
      exercise.sets.filter((set) => set.completed && set.type !== "warmup"),
    ),
  );
  const exercises = new Set(
    completed.flatMap((workout) => workout.exercises.map((exercise) => normalizeExerciseName(exercise.name))),
  );

  return {
    workouts: completed.length,
    daysTrained: days.size,
    sets: completedSets.length,
    repetitions: completedSets.reduce((total, set) => total + set.repetitions, 0),
    volume: completed.reduce((total, workout) => total + workoutVolume(workout), 0),
    exerciseCount: exercises.size,
  };
}

export function buildPerformanceSummary(current: PeriodMetrics, previous?: PeriodMetrics) {
  if (current.workouts === 0) {
    return "No completed workouts were recorded during this period. Log a workout to begin building a performance baseline.";
  }

  const base = `You completed ${current.workouts} workout${current.workouts === 1 ? "" : "s"} across ${current.daysTrained} training day${current.daysTrained === 1 ? "" : "s"}, totaling ${current.sets} working sets and ${current.repetitions} repetitions.`;
  if (!previous) return `${base} More history is needed for a period-over-period comparison.`;

  const workoutDelta = current.workouts - previous.workouts;
  const volumeDelta = percentageChange(current.volume, previous.volume);
  const workoutPhrase = workoutDelta === 0
    ? "Workout frequency was unchanged."
    : `That is ${Math.abs(workoutDelta)} ${workoutDelta > 0 ? "more" : "fewer"} workout${Math.abs(workoutDelta) === 1 ? "" : "s"} than the comparison period.`;
  const volumePhrase = volumeDelta == null
    ? "Comparable training-volume data is not yet available."
    : `Recorded weighted volume ${volumeDelta >= 0 ? "increased" : "decreased"} by ${Math.abs(volumeDelta).toFixed(1)}%.`;
  return `${base} ${workoutPhrase} ${volumePhrase}`;
}

export function buildLatestExerciseComparisons(workouts: WorkoutSession[]): ExerciseComparison[] {
  const occurrences = new Map<string, { name: string; weight: number; date: string }[]>();
  [...workouts]
    .filter((workout) => workout.status === "completed")
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
    .forEach((workout) => workout.exercises.forEach((exercise) => {
      const weight = maximumWeight(exercise);
      if (weight == null) return;
      const key = normalizeExerciseName(exercise.name);
      const history = occurrences.get(key) ?? [];
      if (history.length < 2) history.push({ name: exercise.name, weight, date: workout.performedAt });
      occurrences.set(key, history);
    }));

  return [...occurrences.values()]
    .filter((history) => history.length === 2)
    .map(([current, previous]) => {
      const difference = current.weight - previous.weight;
      return {
        exerciseName: current.name,
        currentWeight: current.weight,
        previousWeight: previous.weight,
        difference,
        percentage: percentageChange(current.weight, previous.weight),
        direction: difference > 0 ? "increase" as const : difference < 0 ? "decrease" as const : "no-change" as const,
        currentDate: current.date,
        previousDate: previous.date,
      };
    })
    .sort((a, b) => new Date(b.currentDate).getTime() - new Date(a.currentDate).getTime());
}

export function buildPersonalBestAchievements(workouts: WorkoutSession[]): PersonalBestAchievement[] {
  const bests = new Map<string, { weight: number; volume: number }>();
  const lastCounts = new Map<string, { reps: number; sets: number; volume: number }>();
  const achievements: PersonalBestAchievement[] = [];

  [...workouts]
    .filter((workout) => workout.status === "completed")
    .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id))
    .forEach((workout) => {
      // A repeated exercise row within one session is still a single log.
      const exercises = new Map<string, WorkoutExercise>();
      for (const exercise of workout.exercises) {
        const key = normalizeExerciseName(exercise.name);
        const existing = exercises.get(key);
        exercises.set(key, existing ? { ...existing, sets: [...existing.sets, ...exercise.sets] } : exercise);
      }
      exercises.forEach((exercise, key) => {
        const sets = exercise.sets.filter((set) => set.completed && set.type !== "warmup" && set.repetitions > 0);
        if (!sets.length) return;
        const counts = { reps: sets.reduce((total, set) => total + set.repetitions, 0), sets: sets.length };
        const currentVolume = sets.reduce((total, set) => total + setVolume(set), 0);
        const previousCounts = lastCounts.get(key);
        if (previousCounts) for (const kind of ["reps", "sets"] as const) {
          if (counts[kind] > previousCounts[kind]) achievements.push({
            id: `${workout.id}:${exercise.id}:${kind}`, kind,
            exerciseName: exercise.name, achievedAt: workout.performedAt,
            currentCount: counts[kind], previousCount: previousCounts[kind],
            improvement: counts[kind] - previousCounts[kind], percentage: percentageChange(counts[kind], previousCounts[kind]),
          });
        }
        // Compare total work independently of the heaviest set. Ignore conversion noise.
        if (previousCounts && currentVolume - previousCounts.volume > Math.max(1, currentVolume, previousCounts.volume) * 1e-9) achievements.push({
          id: `${workout.id}:${exercise.id}:volume`, kind: "volume",
          exerciseName: exercise.name, achievedAt: workout.performedAt,
          currentVolume, previousVolume: previousCounts.volume,
          improvement: currentVolume - previousCounts.volume,
          percentage: percentageChange(currentVolume, previousCounts.volume),
        });
        lastCounts.set(key, { ...counts, volume: currentVolume });
        const currentWeight = maximumWeight(exercise);
        if (currentWeight == null || currentWeight <= 0) return;

        const previous = bests.get(key);
        const repetitions = Math.max(0, ...exercise.sets
          .filter((set) => set.completed && set.type !== "warmup" && set.weight === currentWeight)
          .map((set) => set.repetitions));

        if (previous && currentWeight > previous.weight) {
          achievements.push({
            id: `${workout.id}:${exercise.id}:max-weight`,
            kind: "weight",
            exerciseName: exercise.name,
            achievedAt: workout.performedAt,
            currentWeight,
            previousWeight: previous.weight,
            improvement: currentWeight - previous.weight,
            percentage: percentageChange(currentWeight, previous.weight),
            repetitions,
            volumeImprovementPercentage: currentVolume > previous.volume
              ? percentageChange(currentVolume, previous.volume)
              : null,
          });
        }

        bests.set(key, {
          weight: Math.max(previous?.weight ?? 0, currentWeight),
          volume: Math.max(previous?.volume ?? 0, currentVolume),
        });
      });
    });

  return achievements.sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime());
}

export function formatWeight(value: number, unit: WeightUnit) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
}

export function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
