export type WeightUnit = "lb" | "kg";
export type WorkoutStatus = "draft" | "completed";
export type SetType = "warmup" | "working" | "drop" | "failure";

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number;
  repetitions: number;
  completed: boolean;
  type: SetType;
  rpe?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseId?: string;
  name: string;
  muscleGroup: string;
  equipment?: string;
  notes?: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  title: string;
  performedAt: string;
  completedAt?: string;
  status: WorkoutStatus;
  notes?: string;
  durationMinutes?: number;
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  normalizedName: string;
  muscleGroup: string;
  equipment?: string;
  exerciseType: "weighted" | "bodyweight" | "assisted" | "cardio";
  weightConvention: "total" | "per_implement" | "added_resistance" | "none";
  favorite: boolean;
  archived: boolean;
  lastPerformedAt?: string;
}

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  email: string;
  preferredWeightUnit: WeightUnit;
  timezone: string;
  fitnessGoal?: string;
  weeklyWorkoutGoal?: number;
}

export interface PeriodMetrics {
  workouts: number;
  daysTrained: number;
  sets: number;
  repetitions: number;
  volume: number;
  exerciseCount: number;
}

export interface ExerciseComparison {
  exerciseName: string;
  currentWeight: number;
  previousWeight: number;
  difference: number;
  percentage: number | null;
  direction: "increase" | "decrease" | "no-change";
  currentDate: string;
  previousDate: string;
}

interface AchievementBase {
  id: string;
  exerciseName: string;
  achievedAt: string;
  improvement: number;
  percentage: number | null;
}

export interface WeightAchievement extends AchievementBase {
  kind: "weight";
  currentWeight: number;
  previousWeight: number;
  repetitions: number;
  volumeImprovementPercentage: number | null;
}

export interface CountAchievement extends AchievementBase {
  kind: "reps" | "sets";
  currentCount: number;
  previousCount: number;
}

export interface VolumeAchievement extends AchievementBase {
  kind: "volume";
  currentVolume: number;
  previousVolume: number;
}

export type PersonalBestAchievement = WeightAchievement | CountAchievement | VolumeAchievement;
